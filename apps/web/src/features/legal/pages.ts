import about from '../../content/legal/about.md?raw';
import accessibility from '../../content/legal/accessibility.md?raw';
import cookies from '../../content/legal/cookies.md?raw';
import aboutDe from '../../content/legal/de/about.md?raw';
import accessibilityDe from '../../content/legal/de/accessibility.md?raw';
import cookiesDe from '../../content/legal/de/cookies.md?raw';
import privacyDe from '../../content/legal/de/privacy.md?raw';
import returnsDe from '../../content/legal/de/returns.md?raw';
import shippingDe from '../../content/legal/de/shipping.md?raw';
import termsDe from '../../content/legal/de/terms.md?raw';
import aboutFr from '../../content/legal/fr/about.md?raw';
import accessibilityFr from '../../content/legal/fr/accessibility.md?raw';
import cookiesFr from '../../content/legal/fr/cookies.md?raw';
import privacyFr from '../../content/legal/fr/privacy.md?raw';
import returnsFr from '../../content/legal/fr/returns.md?raw';
import shippingFr from '../../content/legal/fr/shipping.md?raw';
import termsFr from '../../content/legal/fr/terms.md?raw';
import privacy from '../../content/legal/privacy.md?raw';
import returns from '../../content/legal/returns.md?raw';
import shipping from '../../content/legal/shipping.md?raw';
import terms from '../../content/legal/terms.md?raw';
import type { StringKey } from '../../i18n';

export interface LegalPageDef {
  /** URL path segment: `/privacy`. */
  path: string;
  /** English title and description (the source); the dictionary keys carry the translations. */
  title: string;
  description: string;
  titleKey: StringKey;
  descriptionKey: StringKey;
  /** English text (the source and the fallback). */
  body: string;
  /** The same page in German and French; a language without a file shows `body`. */
  bodies: Partial<Record<'de' | 'fr', string>>;
}

// One entry per static page. `content/legal/de/` and `fr/` hold the translations of each file. The Markdown files are the copy (plain files, easy to replace); the
// router table in routes.tsx and the footer both read this list, so a page cannot exist without a
// route or a link by accident.
export const LEGAL_PAGES: readonly LegalPageDef[] = [
  {
    path: 'about',
    titleKey: 'content.legal.about.title',
    descriptionKey: 'content.legal.about.description',
    title: 'About Pawsome',
    description: 'The story behind Pawsome and the people who pick every product.',
    body: about,
    bodies: { de: aboutDe, fr: aboutFr },
  },
  {
    path: 'shipping',
    titleKey: 'content.legal.shipping.title',
    descriptionKey: 'content.legal.shipping.description',
    title: 'Shipping',
    description: 'Delivery options, prices and times.',
    body: shipping,
    bodies: { de: shippingDe, fr: shippingFr },
  },
  {
    path: 'returns',
    titleKey: 'content.legal.returns.title',
    descriptionKey: 'content.legal.returns.description',
    title: 'Returns and withdrawal',
    description: 'How returns and withdrawal work.',
    body: returns,
    bodies: { de: returnsDe, fr: returnsFr },
  },
  {
    path: 'privacy',
    titleKey: 'content.legal.privacy.title',
    descriptionKey: 'content.legal.privacy.description',
    title: 'Privacy notice',
    description: 'What data we collect and why.',
    body: privacy,
    bodies: { de: privacyDe, fr: privacyFr },
  },
  {
    path: 'terms',
    titleKey: 'content.legal.terms.title',
    descriptionKey: 'content.legal.terms.description',
    title: 'Terms and conditions',
    description: 'The terms that apply when you order from Pawsome.',
    body: terms,
    bodies: { de: termsDe, fr: termsFr },
  },
  {
    path: 'cookies',
    titleKey: 'content.legal.cookies.title',
    descriptionKey: 'content.legal.cookies.description',
    title: 'Cookies',
    description: 'The cookies we set, and the ones we do not.',
    body: cookies,
    bodies: { de: cookiesDe, fr: cookiesFr },
  },
  {
    path: 'accessibility',
    titleKey: 'content.legal.accessibility.title',
    descriptionKey: 'content.legal.accessibility.description',
    title: 'Accessibility statement',
    description: 'Our accessibility aims and known gaps.',
    body: accessibility,
    bodies: { de: accessibilityDe, fr: accessibilityFr },
  },
];

/** The page text in the store's language, English when that language has no file. */
export function legalBody(page: LegalPageDef, lang: string): string {
  return (lang === 'de' || lang === 'fr' ? page.bodies[lang] : undefined) ?? page.body;
}
