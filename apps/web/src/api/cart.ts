import {
  AddCartItemSchema,
  type ApplyCodeInput,
  CartSchema,
  CartWarningSchema,
  OutOfStockDetailsSchema,
  StoreSwitchPreviewResponseSchema,
  UpdateCartItemSchema,
  type OutOfStockDetails,
  type StoreCode,
  type StoreSwitchPreview,
} from '@store/shared';
import { z } from 'zod';

import { ApiError, apiFetch } from './client';

// The web is deployed on its own schedule, so a newer API may send a warning code this build has
// never heard of. The shared schema's code is a closed enum, which would turn the whole cart into
// a BAD_RESPONSE; here the code is a plain string and the page falls back to the warning's text.
const WarningSchema = CartWarningSchema.extend({ code: z.string() });
export type CartWarning = z.infer<typeof WarningSchema>;

const WebCartSchema = CartSchema.extend({ warnings: z.array(WarningSchema) });
export type WebCart = z.infer<typeof WebCartSchema>;
export type WebCartItem = WebCart['items'][number];

export const CartResponse = z.object({ data: WebCartSchema });

export async function fetchCart(signal?: AbortSignal): Promise<WebCart> {
  return (await apiFetch('/cart', { schema: CartResponse, ...(signal && { signal }) })).data;
}

// Which lines a switch to `store` would drop (no price in its currency). Read-only.
export async function fetchSwitchPreview(store: StoreCode): Promise<StoreSwitchPreview> {
  return (
    await apiFetch(`/cart/switch-preview?store=${encodeURIComponent(store)}`, {
      schema: StoreSwitchPreviewResponseSchema,
    })
  ).data;
}

export async function addCartItem(input: z.input<typeof AddCartItemSchema>): Promise<WebCart> {
  return (await apiFetch('/cart/items', { method: 'POST', body: input, schema: CartResponse }))
    .data;
}

export async function updateCartItem(
  id: string,
  input: z.input<typeof UpdateCartItemSchema>,
): Promise<WebCart> {
  return (
    await apiFetch(`/cart/items/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: input,
      schema: CartResponse,
    })
  ).data;
}

export async function removeCartItem(id: string): Promise<WebCart> {
  return (
    await apiFetch(`/cart/items/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      schema: CartResponse,
    })
  ).data;
}

export async function applyCartCode(input: ApplyCodeInput): Promise<WebCart> {
  return (await apiFetch('/cart/code', { method: 'POST', body: input, schema: CartResponse })).data;
}

export async function removeCartCode(): Promise<WebCart> {
  return (await apiFetch('/cart/code', { method: 'DELETE', schema: CartResponse })).data;
}

// `details` of a 409 OUT_OF_STOCK, or null when the error is something else.
export function outOfStockDetails(error: unknown): OutOfStockDetails | null {
  if (!(error instanceof ApiError) || error.code !== 'OUT_OF_STOCK') return null;
  const parsed = OutOfStockDetailsSchema.safeParse(error.details);
  return parsed.success ? parsed.data : null;
}
