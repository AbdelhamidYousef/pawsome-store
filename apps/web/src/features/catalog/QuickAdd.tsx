import type { ProductCard, ProductDetail, Variant } from '@store/shared';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button, buttonClasses } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { MemberPrice, memberBeatsSale } from '../../components/ui/MemberPrice';
import { Price } from '../../components/ui/Price';
import { SalePrice } from '../../components/ui/SalePrice';
import { Spinner } from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useT } from '../../i18n';
import { cn } from '../../lib/cn';
import { useAddToCartAction } from '../cart/queries';
import { StockAlertForm } from '../stock-alerts/StockAlertForm';

import { useProductLoader } from './queries';
import { defaultVariant } from './resolve-variant';
import { VariantPicker } from './VariantPicker';

// How long the card's button says "Added" before it goes back to "Add to cart".
const ADDED_MS = 2200;

const CheckGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusGlyph = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/** True when the product has exactly one thing to buy, so a card can add it without asking. */
export function singleVariant(product: ProductDetail): Variant | undefined {
  const [only] = product.variants;
  return product.variants.length === 1 && only?.available ? only : undefined;
}

// The "Add to cart" at the foot of every product card. It sits outside the card's link (a button
// inside a link is invalid HTML and unreachable by keyboard). A product with one variant goes
// straight into the cart; one with options opens a compact sheet to choose them; a sold-out one
// offers the back-in-stock email instead. The variants are read on click (prefetched on hover).
export function CardQuickAdd({ product }: { product: ProductCard }) {
  const { t } = useT();
  const toast = useToast();
  const loader = useProductLoader();
  const cart = useAddToCartAction(product);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [sheet, setSheet] = useState<ProductDetail | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!added) return;
    const timer = window.setTimeout(() => setAdded(false), ADDED_MS);
    return () => window.clearTimeout(timer);
  }, [added]);

  const soldOut = !product.inStock;

  const open = async () => {
    setLoading(true);
    try {
      const detail = await loader.load(product.slug);
      const only = soldOut ? undefined : singleVariant(detail);
      if (only) cart.add(only, 1, { onAdded: () => setAdded(true) });
      else setSheet(detail);
    } catch {
      toast.show(t('catalog.quickAdd.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || cart.pending;

  // A plain button rather than <Button loading>: that one becomes `disabled` while busy, and a
  // disabled button drops keyboard focus to <body>. This one stays focusable and ignores clicks.
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-testid="card-add"
        aria-busy={busy || undefined}
        // "Notify me" names its product in the label; "Add to cart" does it with a hidden suffix
        // below, so the spoken name always starts with the words on the button (label in name).
        aria-label={soldOut ? t('catalog.quickAdd.notifyLabel', { name: product.name }) : undefined}
        aria-haspopup={soldOut ? 'dialog' : undefined}
        onPointerEnter={() => loader.prefetch(product.slug)}
        onFocus={() => loader.prefetch(product.slug)}
        onClick={() => {
          if (!busy) void open();
        }}
        className={cn(
          buttonClasses(soldOut ? 'ghost' : 'secondary', 'md'),
          'w-full gap-1.5 px-3 text-sm sm:text-[0.9375rem]',
          busy && 'cursor-progress',
          soldOut && 'border-2 border-line text-muted hover:bg-bg',
          added && 'border-success bg-success-soft text-success hover:bg-success-soft',
        )}
      >
        {busy ? (
          <Spinner label={null} className="h-4 w-4" />
        ) : added ? (
          <CheckGlyph className="h-4 w-4 shrink-0" />
        ) : (
          !soldOut && <PlusGlyph className="h-4 w-4 shrink-0" />
        )}
        {soldOut ? (
          t('catalog.quickAdd.notify')
        ) : added ? (
          t('catalog.quickAdd.added')
        ) : (
          <>
            {/* Grid cards are 150-220px wide below xl: "In den Warenkorb" would wrap there. */}
            <span className="xl:hidden">{t('catalog.quickAdd.addShort')}</span>
            <span className="hidden xl:inline">{t('catalog.quickAdd.add')}</span>
          </>
        )}
        {!soldOut && (
          <span className="sr-only">
            {t('catalog.quickAdd.forProduct', { name: product.name })}
          </span>
        )}
      </button>
      {sheet && (
        <QuickAddSheet
          product={sheet}
          onClose={() => {
            setSheet(null);
            buttonRef.current?.focus();
          }}
        />
      )}
    </>
  );
}

function VariantPrice({ variant }: { variant: Variant }) {
  const className = 'text-2xl text-pet-strong';
  if (variant.member && memberBeatsSale(variant.member, variant.sale)) {
    return (
      <MemberPrice
        member={variant.member}
        regularCents={variant.priceCents}
        currency={variant.currency}
        className={className}
      />
    );
  }
  if (variant.sale) {
    return <SalePrice sale={variant.sale} currency={variant.currency} className={className} />;
  }
  return (
    <Price
      cents={variant.priceCents}
      compareAtCents={variant.compareAtPriceCents}
      currency={variant.currency}
      className={className}
    />
  );
}

// The quick-add sheet: a centred dialog on desktop, a bottom sheet on phones. Same picker as the
// product page, so the options read and behave the same; the first in-stock variant is preselected.
export function QuickAddSheet({
  product,
  onClose,
}: {
  product: ProductDetail;
  onClose: () => void;
}) {
  const { t } = useT();
  const cart = useAddToCartAction(product);
  // Closed through the dialog (not by unmounting it), so the browser hands focus back to the card.
  const [open, setOpen] = useState(true);
  const [variant, setVariant] = useState<Variant | undefined>(
    () =>
      product.variants.find((v) => v.isDefault && v.available) ??
      product.variants.find((v) => v.available) ??
      defaultVariant(product.variants),
  );
  const image =
    product.images.find((i) => i.variantId === variant?.id) ?? product.images[0] ?? null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={product.name}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none"
    >
      <div data-testid="quick-add" className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {image && (
            <img
              src={image.url}
              alt=""
              width={image.width}
              height={image.height}
              className="size-24 shrink-0 rounded-control bg-pet-soft object-cover"
            />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            {variant && <VariantPrice variant={variant} />}
            {variant?.available && variant.lowStock && (
              <p className="w-fit rounded-full bg-danger-soft px-3 py-0.5 text-sm font-semibold text-danger">
                {t('catalog.addToCart.lowStock')}
              </p>
            )}
            <Link
              to={`/products/${product.slug}${variant ? `?variant=${encodeURIComponent(variant.sku)}` : ''}`}
              className="w-fit text-sm font-semibold text-primary-strong underline underline-offset-2"
            >
              {t('catalog.quickAdd.details')}
            </Link>
          </div>
        </div>
        {variant && product.optionKeys.length > 0 && (
          <VariantPicker
            optionKeys={product.optionKeys}
            variants={product.variants}
            selected={variant}
            onSelect={setVariant}
          />
        )}
        {variant && !variant.available ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">{t('catalog.quickAdd.soldOutNote')}</p>
            <StockAlertForm variantId={variant.id} />
          </div>
        ) : (
          variant && (
            <Button
              size="lg"
              data-testid="quick-add-submit"
              loading={cart.pending}
              onClick={() => cart.add(variant, 1, { onAdded: () => setOpen(false) })}
              className="w-full"
            >
              {t('catalog.addToCart.add')}
            </Button>
          )
        )}
      </div>
    </Dialog>
  );
}
