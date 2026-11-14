import about from '../../content/legal/about.md?raw';
import accessibility from '../../content/legal/accessibility.md?raw';
import cookies from '../../content/legal/cookies.md?raw';
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
  body: string;
}

// One entry per static page. The Markdown files are the copy (plain files, easy to replace); the
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
  },
  {
    path: 'shipping',
    titleKey: 'content.legal.shipping.title',
    descriptionKey: 'content.legal.shipping.description',
    title: 'Shipping',
    description: 'Delivery options, prices and times.',
    body: shipping,
  },
  {
    path: 'returns',
    titleKey: 'content.legal.returns.title',
    descriptionKey: 'content.legal.returns.description',
    title: 'Returns and withdrawal',
    description: 'How returns and withdrawal work.',
    body: returns,
  },
  {
    path: 'privacy',
    titleKey: 'content.legal.privacy.title',
    descriptionKey: 'content.legal.privacy.description',
    title: 'Privacy notice',
    description: 'What data we collect and why.',
    body: privacy,
  },
  {
    path: 'terms',
    titleKey: 'content.legal.terms.title',
    descriptionKey: 'content.legal.terms.description',
    title: 'Terms and conditions',
    description: 'The terms that apply when you order from Pawsome.',
    body: terms,
  },
  {
    path: 'cookies',
    titleKey: 'content.legal.cookies.title',
    descriptionKey: 'content.legal.cookies.description',
    title: 'Cookies',
    description: 'The cookies we set, and the ones we do not.',
    body: cookies,
  },
  {
    path: 'accessibility',
    titleKey: 'content.legal.accessibility.title',
    descriptionKey: 'content.legal.accessibility.description',
    title: 'Accessibility statement',
    description: 'Our accessibility aims and known gaps.',
    body: accessibility,
  },
];
