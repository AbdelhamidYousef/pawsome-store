import type { HeroSlide } from '@store/shared';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Container } from '../../components/layout/Container';
import { useT } from '../../i18n';
import { cn } from '../../lib/cn';
import { image600 } from '../../lib/images';
import { petBySlug } from '../../lib/pets';

const ROTATE_MS = 6000;

// The box never changes size: its height is fixed per breakpoint (the skeleton uses the same
// classes), and the copy is clamped, so neither loading nor changing slides moves the page.
// Desktop: the first screen minus the header (~150 px), never under 560 or over 760 px.
// Phones: tall, but the trust strip still peeks above the fold.
export const HERO_BOX =
  'h-[clamp(34rem,calc(100svh-8rem),36rem)] md:h-[clamp(35rem,calc(100svh-9.5rem),47.5rem)]';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

// A slide that links to a pet category (`/c/dogs`) takes that pet's colours.
function slideAccent(href: string) {
  return petBySlug(/^\/c\/([^/?#]+)/.exec(href)?.[1])?.accent;
}

// Full-bleed split hero: copy on a pastel field on the left, the photo filling the right half edge
// to edge (on phones the photo sits on top). It rotates on its own, but never while the pointer is
// on it or focus is inside it, and never at all for people who asked their system for less motion.
// There is deliberately no pause button: hover and focus already stop it.
export function HeroCarousel({
  slides,
  trust,
}: {
  slides: readonly HeroSlide[];
  /** A small row of promises shown under the buttons on every slide. */
  trust?: ReactNode;
}) {
  const { t } = useT();
  const [index, setIndex] = useState(0);
  const [reduced] = useState(prefersReducedMotion);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const count = slides.length;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback((to: number) => setIndex(((to % count) + count) % count), [count]);

  const rotating = !reduced && !hovered && !focused && count > 1;
  useEffect(() => {
    if (!rotating) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [rotating, count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label={t('shell.home.featured')}
      data-testid="hero-carousel"
      data-playing={rotating}
      className={cn('relative overflow-hidden bg-primary-soft', HERO_BOX)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
      }}
      // A horizontal swipe of 40 px or more changes slide; a mostly vertical drag is a scroll.
      onTouchStart={(e) => {
        const touch = e.touches[0];
        touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      }}
      onTouchEnd={(e) => {
        const start = touchStart.current;
        const touch = e.changedTouches[0];
        touchStart.current = null;
        if (!start || !touch) return;
        const dx = touch.clientX - start.x;
        if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(touch.clientY - start.y)) return;
        go(index + (dx < 0 ? 1 : -1));
      }}
    >
      {/* Announce slide changes only when the user is driving; never while it rotates by itself. */}
      <div aria-live={rotating ? 'off' : 'polite'} className="h-full">
        {slides.map((slide, i) => (
          <div
            key={slide.title}
            role="group"
            aria-roledescription="slide"
            aria-label={t('shell.home.slideOf', { n: i + 1, count })}
            hidden={i !== index}
            data-testid="hero-slide"
            data-pet={slideAccent(slide.ctaHref)}
            className="absolute inset-0 flex flex-col bg-pet-soft md:block [&[hidden]]:hidden"
          >
            <div className="relative h-[40%] shrink-0 md:absolute md:inset-y-0 md:left-1/2 md:right-0 md:h-auto">
              {slide.imageUrl && (
                <img
                  src={slide.imageUrl}
                  srcSet={
                    slide.imageUrl.startsWith('/products/')
                      ? `${image600(slide.imageUrl)} 600w, ${slide.imageUrl} 1200w`
                      : undefined
                  }
                  sizes="(min-width: 768px) 50vw, 100vw"
                  alt=""
                  loading={i === 0 ? 'eager' : 'lazy'}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <Container className="relative flex min-h-0 flex-1 items-start pt-5 md:h-full md:items-center md:pt-0">
              <div className="flex min-w-0 flex-col items-start gap-3 md:w-1/2 md:gap-5 md:pb-10 md:pr-12 lg:pr-20">
                <p className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-pet-strong">
                  {t('shell.home.hero.eyebrow')}
                </p>
                <h2 className="line-clamp-2 font-display text-[2rem] font-bold leading-[1.1] text-ink sm:text-5xl lg:text-[3.5rem]">
                  {slide.title}
                </h2>
                <p className="line-clamp-2 max-w-xl text-base text-ink md:text-xl md:leading-relaxed">
                  {slide.text}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2 sm:gap-3">
                  {slide.ctaHref.startsWith('/') ? (
                    <Link to={slide.ctaHref} className={ctaClass}>
                      {slide.ctaLabel}
                    </Link>
                  ) : (
                    <a href={slide.ctaHref} className={ctaClass} rel="noopener">
                      {slide.ctaLabel}
                    </a>
                  )}
                  <Link to="/gift-finder" className={secondaryClass}>
                    {t('shell.home.hero.secondary')}
                  </Link>
                </div>
                {trust}
              </div>
            </Container>
          </div>
        ))}
      </div>

      {/* Dots only (no arrows): each is a real button, so Tab reaches them, and Left/Right move
          between slides once one has focus. Touch screens swipe. Phones: the dots sit on the
          photo's bottom edge, so long copy never runs under them; desktop: under the copy. */}
      {count > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-[calc(40%-2.75rem)] md:bottom-8 md:top-auto">
          <Container className="flex justify-center md:justify-start">
            <ul
              className="pointer-events-auto flex items-center rounded-full bg-surface px-2 shadow-card"
              data-testid="hero-dots"
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                e.preventDefault();
                const to = (((index + (e.key === 'ArrowRight' ? 1 : -1)) % count) + count) % count;
                go(to);
                e.currentTarget.querySelectorAll('button')[to]?.focus();
              }}
            >
              {slides.map((slide, i) => (
                <li key={slide.title}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-label={t('shell.home.goTo', { n: i + 1 })}
                    aria-current={i === index ? 'true' : undefined}
                    className="group inline-flex h-11 w-7 items-center justify-center"
                  >
                    <span
                      className={cn(
                        'block h-2.5 rounded-full transition-all',
                        i === index
                          ? 'w-6 bg-ink'
                          : 'w-2.5 bg-muted opacity-50 group-hover:opacity-90',
                      )}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </Container>
        </div>
      )}
    </section>
  );
}

const ctaClass =
  'inline-flex min-h-12 items-center rounded-full bg-primary px-5 font-display text-base font-semibold text-surface shadow-card transition-colors hover:bg-primary-hover md:min-h-14 md:px-9 md:text-lg';

const secondaryClass =
  'inline-flex min-h-12 items-center rounded-full border-2 border-ink bg-surface px-5 font-display text-base font-semibold text-ink transition-colors hover:bg-bg md:min-h-14 md:px-8 md:text-lg';
