import { ApplyCodeSchema, type BulkAddFailure, type Variant } from '@store/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  addCartItem,
  applyCartCode,
  removeCartCode,
  fetchCart,
  outOfStockDetails,
  removeCartItem,
  updateCartItem,
  type CartWarning,
  type WebCart,
  type WebCartItem,
} from '../../api/cart';
import { bulkAddCartItems, bulkFailures } from '../../api/recommendations';
import { useToast } from '../../components/ui/Toast';
import { useT, type TFunction } from '../../i18n';
import { keys } from '../../lib/query-client';
import { track } from '../../lib/track';
import { formErrorMessage } from '../auth/form-errors';

import { withLineQuantity } from './cart-math';

// ---------- notices ----------
// The API reports a warning once (reading the cart repairs it, so the next read is calm). If the
// page only looked at the latest response, the notice would vanish the moment anything refetched
// the cart, for instance the header badge. So every cart that arrives parks its warnings in this
// small cache entry, where they stay until the shopper dismisses them.
export const noticeKey = (w: Pick<CartWarning, 'code' | 'variantId'>) => `${w.code}:${w.variantId}`;

function rememberNotices(queryClient: QueryClient, warnings: CartWarning[]): void {
  if (warnings.length === 0) return;
  queryClient.setQueryData<CartWarning[]>(keys.cartNotices, (current = []) => {
    const incoming = new Set(warnings.map(noticeKey));
    return [...current.filter((w) => !incoming.has(noticeKey(w))), ...warnings];
  });
}

export function useCartNotices() {
  const queryClient = useQueryClient();
  // Never fetches (initialData + infinite staleTime): it only reads and subscribes to the cache.
  const { data } = useQuery<CartWarning[]>({
    queryKey: keys.cartNotices,
    queryFn: () => [],
    initialData: [],
    staleTime: Infinity,
  });
  const dismiss = (key: string) =>
    queryClient.setQueryData<CartWarning[]>(keys.cartNotices, (current = []) =>
      current.filter((w) => noticeKey(w) !== key),
    );
  return { notices: data, dismiss };
}

// ---------- reading ----------
// Every write lands here, so notices are parked no matter which request produced the cart.
function setCart(queryClient: QueryClient, cart: WebCart): void {
  rememberNotices(queryClient, cart.warnings);
  queryClient.setQueryData(keys.cart, cart);
}

export function useCart() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: keys.cart,
    // The abort signal is deliberately NOT passed on. Reading the cart can repair it on the
    // server (and the API reports each warning only once), so a read that is aborted mid-flight
    // (a remount, StrictMode in dev, a quick navigation) would lose its warnings for good. Left
    // running, the answer still passes through rememberNotices below even if the query ignores it.
    queryFn: async () => {
      const cart = await fetchCart();
      rememberNotices(queryClient, cart.warnings);
      return cart;
    },
    // Shorter than the catalog's minute: the cart is the one page where stale stock or prices
    // matter, and it is cheap to read.
    staleTime: 15_000,
  });
}

// ---------- writing ----------
export function cartErrorMessage(
  error: unknown,
  { t, tm }: { t: TFunction; tm: (message: string) => string },
): string {
  const stock = outOfStockDetails(error);
  if (stock) {
    if (stock.maxQty === 0) return t('cart.error.soldOut');
    if (stock.inCart >= stock.maxQty) return t('cart.error.haveAll', { max: stock.maxQty });
    return stock.inCart === 0
      ? t('cart.error.only', { max: stock.maxQty })
      : t('cart.error.onlyWithCart', { max: stock.maxQty, inCart: stock.inCart });
  }
  return formErrorMessage(error, t, tm);
}

// All cart writes share one scope id, so TanStack Query runs them one after another instead of in
// parallel. Without it, tapping "+" three times fires three requests whose answers can arrive out
// of order, and the older answer would overwrite the newer one in the cache.
const CART_SCOPE = { id: 'cart' } as const;

function useAddCartItem() {
  const queryClient = useQueryClient();
  return useMutation({
    scope: CART_SCOPE,
    mutationFn: addCartItem,
    onSuccess: (cart) => setCart(queryClient, cart),
  });
}

// Optimistic update (plan 7.5), in the three steps TanStack Query names:
//  onMutate: stop in-flight cart reads (they would overwrite our guess), remember the cache, and
//            write the expected cart so the UI answers instantly;
//  onError:  put the remembered cache back (rollback), and refetch because the server knows best;
//  onSuccess: the server returned the whole real cart, so replace the guess with it.
function useLineMutation<V>(
  request: (vars: V) => Promise<WebCart>,
  guess: (cart: WebCart, vars: V) => WebCart,
) {
  const queryClient = useQueryClient();
  return useMutation({
    scope: CART_SCOPE,
    mutationFn: request,
    onMutate: async (vars: V) => {
      await queryClient.cancelQueries({ queryKey: keys.cart });
      const previous = queryClient.getQueryData<WebCart>(keys.cart);
      if (previous) queryClient.setQueryData(keys.cart, guess(previous, vars));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(keys.cart, context.previous);
      void queryClient.invalidateQueries({ queryKey: keys.cart });
    },
    onSuccess: (cart) => setCart(queryClient, cart),
  });
}

export function useCartActions() {
  const toast = useToast();
  const i18n = useT();
  const update = useLineMutation(
    ({ id, quantity }: { id: string; quantity: number }) => updateCartItem(id, { quantity }),
    (cart, { id, quantity }) => withLineQuantity(cart, id, quantity),
  );
  const remove = useLineMutation(
    ({ id }: { id: string }) => removeCartItem(id),
    (cart, { id }) => withLineQuantity(cart, id, 0),
  );
  return {
    setQuantity: (item: WebCartItem, quantity: number) =>
      update.mutate(
        { id: item.id, quantity },
        { onError: (error) => toast.show(cartErrorMessage(error, i18n), 'error') },
      ),
    remove: (item: WebCartItem) =>
      remove.mutate(
        { id: item.id },
        {
          onSuccess: () => {
            track({
              name: 'remove_from_cart',
              item: {
                id: item.productId,
                name: item.productName,
                price: item.unitPriceCents,
                variant: item.sku,
              },
              quantity: item.quantity,
            });
            toast.show(i18n.t('cart.toast.removed', { name: item.productName }));
          },
          onError: (error) => toast.show(cartErrorMessage(error, i18n), 'error'),
        },
      ),
  };
}

// What the PDP button calls: add, then track, then a toast with a way to the cart. A refusal
// (409 OUT_OF_STOCK) becomes a plain-language toast that says how many can be had.
export function useAddToCartAction(product: { id: string; name: string }) {
  const add = useAddCartItem();
  const toast = useToast();
  const i18n = useT();
  const navigate = useNavigate();
  return {
    pending: add.isPending,
    // `onAdded` lets the caller react too (a card's "Added" tick, a quick-add sheet closing).
    add: (
      variant: Pick<Variant, 'id' | 'sku' | 'priceCents'>,
      quantity: number,
      options: { onAdded?: () => void } = {},
    ) =>
      add.mutate(
        { variantId: variant.id, quantity },
        {
          onSuccess: () => {
            options.onAdded?.();
            track({
              name: 'add_to_cart',
              item: {
                id: product.id,
                name: product.name,
                price: variant.priceCents,
                variant: variant.sku,
              },
              quantity,
            });
            toast.show(i18n.t('cart.toast.added', { quantity, name: product.name }), 'success', {
              label: i18n.t('cart.toast.viewCart'),
              onAction: () => void navigate('/cart'),
            });
          },
          onError: (error) => toast.show(cartErrorMessage(error, i18n), 'error'),
        },
      ),
  };
}

// ---------- several lines at once (frequently bought together) ----------
// One request, all or nothing. A refusal comes back line by line (`failures`), so the block can
// say which item is the problem instead of a vague "something went wrong".
export function useBulkAdd() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const i18n = useT();
  const navigate = useNavigate();
  const add = useMutation({
    scope: CART_SCOPE,
    mutationFn: bulkAddCartItems,
    onSuccess: (cart) => setCart(queryClient, cart),
  });
  return {
    pending: add.isPending,
    // Resolves with the failures (empty when everything was added).
    addAll: async (
      lines: {
        variantId: string;
        quantity: number;
        name: string;
        sku: string;
        priceCents: number;
      }[],
    ): Promise<BulkAddFailure[]> => {
      try {
        await add.mutateAsync({
          items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        });
        for (const l of lines) {
          track({
            name: 'add_to_cart',
            item: { id: l.variantId, name: l.name, price: l.priceCents, variant: l.sku },
            quantity: l.quantity,
          });
        }
        toast.show(i18n.tn('cart.toast.addedMany', lines.length), 'success', {
          label: i18n.t('cart.toast.viewCart'),
          onAction: () => void navigate('/cart'),
        });
        return [];
      } catch (error) {
        const failures = bulkFailures(error);
        if (failures.length === 0) toast.show(cartErrorMessage(error, i18n), 'error');
        return failures;
      }
    },
  };
}

// ---------- discount code ----------
// The code is a cart write like any other (same scope, so it queues behind quantity changes), but
// its refusal is not a toast: it belongs next to the input, so the hook hands the message back.
export function useCartCode() {
  const queryClient = useQueryClient();
  const i18n = useT();
  const apply = useMutation({
    scope: CART_SCOPE,
    mutationFn: applyCartCode,
    onSuccess: (cart) => setCart(queryClient, cart),
  });
  const remove = useMutation({
    scope: CART_SCOPE,
    mutationFn: removeCartCode,
    onSuccess: (cart) => setCart(queryClient, cart),
  });
  return {
    pending: apply.isPending,
    removing: remove.isPending,
    // Resolves with null when applied, or the sentence to show when refused. The same schema as
    // the API checks the shape first, so a typo costs no request.
    apply: async (raw: string): Promise<string | null> => {
      const parsed = ApplyCodeSchema.safeParse({ code: raw });
      if (!parsed.success) {
        track({ name: 'code_failed', code: raw.trim().slice(0, 40) });
        return i18n.tm(parsed.error.issues[0]?.message ?? i18n.t('cart.code.invalid'));
      }
      try {
        await apply.mutateAsync(parsed.data);
        track({ name: 'promo_applied', code: parsed.data.code });
        return null;
      } catch (error) {
        track({ name: 'code_failed', code: parsed.data.code });
        return cartErrorMessage(error, i18n);
      }
    },
    remove: () => remove.mutate(undefined),
  };
}
