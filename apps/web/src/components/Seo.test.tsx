import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { StoreLayout } from '../features/stores/StoreContext';
import { renderApp } from '../test/render';

import { Seo, slugAlternates } from './Seo';

describe('Seo', () => {
  it('sets title, description, canonical and robots, and removes them on unmount', () => {
    document.title = 'Before';
    const { unmount } = render(
      <Seo title="Dogs" description="Dog stuff" canonical="https://x.test/c/dogs" noindex />,
    );
    expect(document.title).toBe('Dogs | Pawsome');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Dog stuff',
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://x.test/c/dogs',
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex',
    );
    unmount();
    expect(document.title).toBe('Before');
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('does not add a robots tag unless asked', () => {
    render(<Seo title="Pawsome" />);
    expect(document.title).toBe('Pawsome');
    expect(document.head.querySelector('meta[name="robots"]')).toBeNull();
  });

  it('writes JSON-LD as one script, replaces it when the data changes and removes it on unmount', () => {
    const { rerender, unmount } = render(
      <Seo title="P" jsonLd={{ '@type': 'FAQPage', name: 'a</script><b>' }} />,
    );
    const script = () => document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(script()).toHaveLength(1);
    // The text is data: a closing script tag inside it is not parsed as markup.
    expect(JSON.parse(script()[0]?.textContent ?? '')).toEqual({
      '@type': 'FAQPage',
      name: 'a</script><b>',
    });
    rerender(<Seo title="P" jsonLd={{ '@type': 'FAQPage', name: 'b' }} />);
    expect(script()).toHaveLength(1);
    expect(script()[0]?.textContent).toContain('"b"');
    unmount();
    expect(script()).toHaveLength(0);
  });
});

describe('Seo alternates', () => {
  it('adds the store prefix to a root-relative canonical and hreflang links for every store', () => {
    const { unmount } = render(<Seo title="Dogs" canonical="/c/dogs?page=2" />);
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      '/c/dogs?page=2',
    );
    const alternates = [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')];
    expect(alternates.map((l) => l.getAttribute('hreflang'))).toEqual([
      'en-IE',
      'de-DE',
      'fr-FR',
      'en-GB',
      'x-default',
    ]);
    expect(
      alternates.map(
        (l) => new URL(l.getAttribute('href')!).pathname + new URL(l.getAttribute('href')!).search,
      ),
    ).toEqual([
      '/eu-en/c/dogs?page=2',
      '/de-de/c/dogs?page=2',
      '/fr-fr/c/dogs?page=2',
      '/uk-en/c/dogs?page=2',
      '/eu-en/c/dogs?page=2',
    ]);
    unmount();
    expect(document.head.querySelector('link[rel="alternate"][hreflang]')).toBeNull();
  });

  it('gives each store its own translated slug when the page passes paths per language', () => {
    const { unmount } = render(
      <Seo
        title="Dogs"
        canonical="/c/dogs?page=2"
        alternates={slugAlternates('c', { en: 'dogs', de: 'hunde', fr: 'chiens' }, '?page=2')}
      />,
    );
    const hrefs = [...document.head.querySelectorAll('link[rel="alternate"][hreflang]')].map(
      (l) => {
        const url = new URL(l.getAttribute('href')!);
        return `${l.getAttribute('hreflang')} ${url.pathname}${url.search}`;
      },
    );
    expect(hrefs).toEqual([
      'en-IE /eu-en/c/dogs?page=2',
      'de-DE /de-de/c/hunde?page=2',
      'fr-FR /fr-fr/c/chiens?page=2',
      'en-GB /uk-en/c/dogs?page=2',
      'x-default /eu-en/c/dogs?page=2',
    ]);
    unmount();
    expect(document.head.querySelector('link[rel="alternate"][hreflang]')).toBeNull();
  });

  it('falls back to the canonical path for every store without slugs (an older API)', () => {
    expect(slugAlternates('products', undefined)).toBe(true);
  });

  it('skips alternates for noindex pages, absolute canonicals and alternates={false}', () => {
    const { unmount } = render(
      <>
        <Seo title="A" canonical="/cart" noindex />
        <Seo title="B" canonical="https://x.test/c/dogs" />
        <Seo title="C" canonical="/only-here" alternates={false} />
      </>,
    );
    expect(document.head.querySelector('link[rel="alternate"][hreflang]')).toBeNull();
    unmount();
  });

  it('prefixes the canonical with the current store and uses the root for "/"', () => {
    renderApp('/de-de', [
      {
        element: <StoreLayout />,
        children: [{ path: '*', element: <Seo title="Home" canonical="/" /> }],
      },
    ]);
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute('href', '/de-de');
    const hrefs = [...document.head.querySelectorAll('link[rel="alternate"]')].map(
      (l) => new URL(l.getAttribute('href')!).pathname,
    );
    expect(hrefs).toEqual(['/eu-en', '/de-de', '/fr-fr', '/uk-en', '/eu-en']);
  });
});
