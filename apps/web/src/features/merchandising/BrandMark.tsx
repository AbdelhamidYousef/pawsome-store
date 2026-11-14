import { useState } from 'react';

import { cn } from '../../lib/cn';

// Picks ink or white for text drawn on a brand's accent colour (WCAG relative luminance).
export function textOn(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16);
  if (Number.isNaN(n)) return '#ffffff';
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // Contrast with white is 1.05 / (l + 0.05); with ink (#1f1b2e, l ~ 0.012) it is (l + 0.05) / 0.062.
  return 1.05 / (l + 0.05) >= (l + 0.05) / 0.062 ? '#ffffff' : '#1f1b2e';
}

// "Burrow & Biscuit" -> "BB", "Tidepool" -> "T": the fallback mark while artwork is missing.
export function brandInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w) && !/^(and|und|et)$/i.test(w))
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

interface BrandMarkProps {
  name: string;
  accentColor: string;
  logoUrl: string | null;
  className?: string;
  /** Text size of the fallback initials. */
  initialsClassName?: string;
  /** Above-the-fold marks load eagerly. */
  eager?: boolean;
}

// The brand's square badge artwork, or (no artwork yet, or it failed to load) the accent colour
// with the brand's initials. Decorative: the brand name is always written next to it.
export function BrandMark({
  name,
  accentColor,
  logoUrl,
  className,
  initialsClassName = 'text-5xl',
  eager = false,
}: BrandMarkProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = logoUrl !== null && logoUrl !== '' && failedUrl !== logoUrl;
  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ backgroundColor: accentColor }}
    >
      {showImage ? (
        <img
          src={logoUrl}
          alt=""
          width={800}
          height={800}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onError={() => setFailedUrl(logoUrl)}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      ) : (
        <span
          aria-hidden
          className={cn(
            'flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_25%,rgb(255_255_255/0.28),transparent_60%)] font-display font-semibold tracking-wide',
            initialsClassName,
          )}
          style={{ color: textOn(accentColor) }}
        >
          {brandInitials(name)}
        </span>
      )}
    </div>
  );
}
