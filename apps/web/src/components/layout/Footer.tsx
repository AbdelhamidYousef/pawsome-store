import { Link } from 'react-router-dom';

import { petName } from '../../features/navigation/pet-names';
import { StoreSwitcher } from '../../features/stores/StoreSwitcher';
import { useT, type StringKey, type TFunction } from '../../i18n';
import { PETS } from '../../lib/pets';
import { track } from '../../lib/track';
import { PawIcon } from '../icons';

import { Container } from './Container';

const linkClass =
  'inline-flex min-h-11 items-center rounded-control font-semibold underline-offset-2 hover:underline';

interface FooterLink {
  label: string;
  to: string;
}
interface FooterGroup {
  /** Stable English id: the analytics event keeps it whatever the language. */
  id: string;
  title: string;
  links: FooterLink[];
}

// Guide topics are listed by name: they come from the seeded Markdown, and a topic with no guides
// simply shows the guides page's empty state instead of breaking. `slug` is the URL, the label
// is translated at render.
const GUIDE_TOPICS = [
  { slug: 'dogs', key: 'shell.footer.topicDogs' },
  { slug: 'cats', key: 'shell.footer.topicCats' },
  { slug: 'birds', key: 'shell.footer.topicBirds' },
  { slug: 'fish', key: 'shell.footer.topicFish' },
  { slug: 'small-pets', key: 'shell.footer.topicSmallPets' },
] as const;

const LEGAL_KEYS: Record<string, StringKey> = {
  shipping: 'shell.footer.legalShipping',
  returns: 'shell.footer.legalReturns',
  about: 'shell.footer.legalAbout',
  accessibility: 'shell.footer.legalAccessibility',
  privacy: 'shell.footer.legalPrivacy',
  terms: 'shell.footer.legalTerms',
  cookies: 'shell.footer.legalCookies',
};

function buildGroups(t: TFunction): FooterGroup[] {
  const legal = (path: string): FooterLink => ({ label: t(LEGAL_KEYS[path]!), to: `/${path}` });
  return [
    {
      id: 'Shop',
      title: t('shell.footer.shop'),
      links: [
        ...PETS.map((pet) => ({ label: petName(t, pet), to: `/c/${pet.slug}` })),
        { label: t('shell.footer.brands'), to: '/brands' },
        { label: t('shell.footer.giftFinder'), to: '/gift-finder' },
      ],
    },
    {
      id: 'Guides',
      title: t('shell.footer.guides'),
      links: [
        { label: t('shell.footer.allGuides'), to: '/guides' },
        ...GUIDE_TOPICS.map((topic) => ({
          label: t(topic.key),
          to: `/guides?category=${topic.slug}`,
        })),
      ],
    },
    {
      id: 'Help',
      title: t('shell.footer.help'),
      links: [
        { label: t('shell.footer.helpCentre'), to: '/help' },
        { label: t('shell.footer.trackOrder'), to: '/track-order' },
        { label: t('shell.footer.contact'), to: '/contact' },
        { label: t('shell.footer.newsletter'), to: '/newsletter' },
        legal('shipping'),
        legal('returns'),
      ],
    },
    {
      id: 'Company',
      title: t('shell.footer.company'),
      links: [
        legal('about'),
        legal('accessibility'),
        { label: t('shell.footer.charity'), to: '/charity' },
        { label: t('shell.footer.developers'), to: '/developers' },
        { label: t('shell.account.myAccount'), to: '/account' },
      ],
    },
    {
      id: 'Legal',
      title: t('shell.footer.legal'),
      links: [
        legal('privacy'),
        legal('terms'),
        legal('cookies'),
        { label: t('shell.footer.withdraw'), to: '/withdraw' },
      ],
    },
  ];
}

export function Footer() {
  const { t } = useT();
  const groups = buildGroups(t);
  return (
    <footer className="mt-16 bg-ink text-surface" data-testid="footer">
      <Container className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <div className="flex flex-col gap-3 sm:col-span-2 lg:col-span-1">
          <p className="flex items-center gap-2 font-display text-2xl font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-bright text-ink">
              <PawIcon width={22} height={22} />
            </span>
            Pawsome
          </p>
          <p className="max-w-xs text-surface">{t('shell.footer.tagline')}</p>
          <StoreSwitcher testId="store-switcher-footer" className="max-w-xs" />
        </div>

        {/* One click handler per group (events bubble), so a later analytics project sees which
            column people use without a handler on every link. */}
        {groups.map((group) => (
          <nav
            key={group.title}
            aria-label={group.title}
            className="flex flex-col"
            onClick={(e) => {
              const link = (e.target as HTMLElement).closest('a');
              if (link) track({ name: 'footer_link', group: group.id, label: link.textContent });
            }}
          >
            <h2 className="mb-1 text-lg font-bold">{group.title}</h2>
            {group.links.map((link) => (
              <Link key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </Link>
            ))}
          </nav>
        ))}
      </Container>
      <div className="border-t border-muted">
        <Container className="flex flex-col gap-2 py-4 text-sm text-surface sm:flex-row sm:justify-between">
          <p data-testid="payment-note">{t('shell.footer.paymentNote')}</p>
          <p>{t('shell.footer.copyright', { year: new Date().getFullYear() })}</p>
        </Container>
      </div>
    </footer>
  );
}
