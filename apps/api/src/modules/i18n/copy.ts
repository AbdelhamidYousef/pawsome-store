import { FREE_DELIVERY_FROM_CENTS } from '@store/shared';

import { currentStore } from './context.ts';

// Shop copy that is stored in English in plain columns with no translation table: hero slides and
// the promo tile (`home_content`), mega-menu promos and testimonials. Keyed by the exact English
// seed text, so the shopper sees the store's version of the seeded copy, and anything an admin
// has typed since (no match) is shown as typed. A store-code table wins over the language table
// (the UK store shares English with eu-en but not the currency).
//
// Adding a line: copy the English text exactly as seeded, then give each language its version.

const gbp = (cents: number) => `£${cents / 100}`;
const UK_FREE = gbp(FREE_DELIVERY_FROM_CENTS.GBP);

const BY_STORE: Partial<Record<string, Record<string, string>>> = {
  'uk-en': {
    'Free delivery on orders over 49 euros, packed and dispatched the same day when you order before 15:00.': `Free delivery on orders over ${UK_FREE}, packed and dispatched the same day when you order before 15:00.`,
    'Free delivery over 49 euros': `Free delivery over ${UK_FREE}`,
    'Pepper ignores every toy except the feather wand. Best 8 euros I spent this year.':
      'Pepper ignores every toy except the feather wand. Best few pounds I spent this year.',
  },
};

const BY_LANG: Partial<Record<string, Record<string, string>>> = {
  de: {
    // Hero slides
    'Happy tails start here': 'Hier beginnt das Schwanzwedeln',
    'Tug ropes that survive the zoomies, beds to sink into and leads for every weather.':
      'Zerrseile, die jedes Toben überstehen, Betten zum Versinken und Leinen für jedes Wetter.',
    'Shop dogs': 'Alles für Hunde',
    'Purr-fect playtime': 'Spielzeit für Samtpfoten',
    'Feather wands, crinkly mice and cosy caves, made for the way cats hunt, nap and hide.':
      'Federangeln, Knistermäuse und Kuschelhöhlen für alles, was Katzen lieben: jagen, dösen, verstecken.',
    'Shop cats': 'Alles für Katzen',
    'Little pets, big love': 'Kleine Tiere, große Liebe',
    'Meadow hay, chew-safe tunnels and snug hideaways for rabbits, guinea pigs and hamsters.':
      'Wiesenheu, knabberfeste Tunnel und gemütliche Verstecke für Kaninchen, Meerschweinchen und Hamster.',
    'Shop small pets': 'Alles für Kleintiere',
    // Promo tile
    'Free delivery on orders over 49 euros, packed and dispatched the same day when you order before 15:00.':
      'Kostenloser Versand ab 49 € Bestellwert. Bis 15:00 Uhr bestellt, noch am selben Tag verschickt.',
    'See delivery details': 'Versanddetails ansehen',
    // Mega-menu promos
    'Walkies, sorted': 'Bereit für jede Gassirunde',
    'Leads, harnesses and tough toys for every adventure.':
      'Leinen, Geschirre und robustes Spielzeug für jedes Abenteuer.',
    'A braided rope tug toy': 'Ein geflochtenes Zerrseil',
    'Feather wands, crinkly mice and kicker toys.': 'Federangeln, Knistermäuse und Kickkissen.',
    'A feather wand teaser toy': 'Eine Federangel zum Spielen',
    'Feed the flock': 'Futter für die ganze Schar',
    'Seed blends and feeders for happy beaks.':
      'Körnermischungen und Futterspender für frohe Schnäbel.',
    'A hanging seed feeder': 'Ein hängender Körnerspender',
    'Aquarium makeover': 'Frischer Look fürs Aquarium',
    'Hideouts, plants and soft glow lighting.': 'Verstecke, Pflanzen und sanftes Licht.',
    'A coral cave hideout for an aquarium': 'Eine Korallenhöhle als Versteck im Aquarium',
    'Hay, hideaways and chews for small friends.':
      'Heu, Verstecke und Knabberspaß für kleine Freunde.',
    'A bundle of meadow hay': 'Ein Bündel Wiesenheu',
    'Warm and cosy habitats': 'Warme, gemütliche Terrarien',
    'Everything a scaly friend needs to thrive.':
      'Alles, was Schuppentiere zum Wohlfühlen brauchen.',
    'A friendly reptile illustration': 'Illustration eines freundlichen Reptils',
    'Free delivery over 49 euros': 'Kostenloser Versand ab 49 €',
    'Tails wag faster when the box arrives free.':
      'Mit kostenlosem Versand wedelt es sich gleich doppelt so schön.',
    // Testimonials
    'Biscuit the beagle': 'Biscuit, Beagle',
    'The tug rope survived a whole week of Biscuit. That is a record.':
      'Das Zerrseil hat eine ganze Woche mit Biscuit überlebt. Das ist Rekord.',
    'Pepper the cat': 'Pepper, Katze',
    'Pepper ignores every toy except the feather wand. Best 8 euros I spent this year.':
      'Pepper ignoriert jedes Spielzeug außer der Federangel. Die besten 8 Euro, die ich dieses Jahr ausgegeben habe.',
    'Kiwi the budgie': 'Kiwi, Wellensittich',
    'The swing went up in two minutes and Kiwi was on it before I finished.':
      'Die Schaukel hing in zwei Minuten, und Kiwi saß drauf, bevor ich fertig war.',
    'Waffles the guinea pig': 'Waffles, Meerschweinchen',
    'Fresh hay, quick delivery, a very happy Waffles.':
      'Frisches Heu, schnelle Lieferung, ein sehr glücklicher Waffles.',
    'Bubbles the goldfish': 'Bubbles, Goldfisch',
    'The starter tank was easy to set up and the plants look lovely.':
      'Das Einsteigerbecken war schnell eingerichtet, und die Pflanzen sehen wunderschön aus.',
    'Nova the husky': 'Nova, Husky',
    'Reflective leash is bright enough to see from the other end of the park.':
      'Die reflektierende Leine sieht man sogar vom anderen Ende des Parks.',
  },
  fr: {
    // Hero slides
    'Happy tails start here': 'Le bonheur de vos animaux commence ici',
    'Tug ropes that survive the zoomies, beds to sink into and leads for every weather.':
      'Des cordes qui résistent aux folies, des lits où s’enfoncer et des laisses pour tous les temps.',
    'Shop dogs': 'Univers chien',
    'Purr-fect playtime': 'L’heure du jeu, côté chat',
    'Feather wands, crinkly mice and cosy caves, made for the way cats hunt, nap and hide.':
      'Cannes à plumes, souris froissées et grottes douillettes : de quoi chasser, dormir et se cacher.',
    'Shop cats': 'Univers chat',
    'Little pets, big love': 'Petits animaux, grand amour',
    'Meadow hay, chew-safe tunnels and snug hideaways for rabbits, guinea pigs and hamsters.':
      'Foin des prés, tunnels à grignoter et cachettes douillettes pour lapins, cobayes et hamsters.',
    'Shop small pets': 'Univers petits animaux',
    // Promo tile
    'Free delivery on orders over 49 euros, packed and dispatched the same day when you order before 15:00.':
      'Livraison offerte dès 49 € d’achat. Commandé avant 15 h, expédié le jour même.',
    'See delivery details': 'Voir les détails de livraison',
    // Mega-menu promos
    'Walkies, sorted': 'Prêts pour la promenade',
    'Leads, harnesses and tough toys for every adventure.':
      'Laisses, harnais et jouets solides pour toutes les aventures.',
    'A braided rope tug toy': 'Une corde tressée à tirer',
    'Feather wands, crinkly mice and kicker toys.':
      'Cannes à plumes, souris froissées et coussins à griffer.',
    'A feather wand teaser toy': 'Une canne à plumes pour jouer',
    'Feed the flock': 'Bon appétit les oiseaux',
    'Seed blends and feeders for happy beaks.':
      'Mélanges de graines et mangeoires pour becs heureux.',
    'A hanging seed feeder': 'Une mangeoire à graines suspendue',
    'Aquarium makeover': 'Un aquarium tout neuf',
    'Hideouts, plants and soft glow lighting.': 'Cachettes, plantes et éclairage tout doux.',
    'A coral cave hideout for an aquarium': 'Une grotte de corail pour aquarium',
    'Hay, hideaways and chews for small friends.':
      'Foin, cachettes et friandises à ronger pour les petits compagnons.',
    'A bundle of meadow hay': 'Une botte de foin des prés',
    'Warm and cosy habitats': 'Des terrariums bien au chaud',
    'Everything a scaly friend needs to thrive.':
      'Tout ce qu’il faut à vos amis à écailles pour s’épanouir.',
    'A friendly reptile illustration': 'Illustration d’un reptile sympathique',
    'Free delivery over 49 euros': 'Livraison offerte dès 49 €',
    'Tails wag faster when the box arrives free.':
      'Les queues remuent plus vite quand la livraison est offerte.',
    // Testimonials
    'Biscuit the beagle': 'Biscuit, beagle',
    'The tug rope survived a whole week of Biscuit. That is a record.':
      'La corde a survécu à une semaine entière avec Biscuit. C’est un record.',
    'Pepper the cat': 'Pepper, chat',
    'Pepper ignores every toy except the feather wand. Best 8 euros I spent this year.':
      'Pepper ignore tous ses jouets sauf la canne à plumes. Les 8 euros les mieux dépensés de l’année.',
    'Kiwi the budgie': 'Kiwi, perruche',
    'The swing went up in two minutes and Kiwi was on it before I finished.':
      'La balançoire était installée en deux minutes, et Kiwi était déjà dessus avant que j’aie fini.',
    'Waffles the guinea pig': 'Waffles, cochon d’Inde',
    'Fresh hay, quick delivery, a very happy Waffles.':
      'Du foin frais, une livraison rapide et un Waffles ravi.',
    'Bubbles the goldfish': 'Bubbles, poisson rouge',
    'The starter tank was easy to set up and the plants look lovely.':
      'L’aquarium débutant s’installe facilement et les plantes sont superbes.',
    'Nova the husky': 'Nova, husky',
    'Reflective leash is bright enough to see from the other end of the park.':
      'La laisse réfléchissante se voit depuis l’autre bout du parc.',
  },
};

/** The current store's version of a seeded English string; anything else comes back as is. */
export function localizeCopy(text: string): string;
export function localizeCopy(text: string | null): string | null;
export function localizeCopy(text: string | null): string | null {
  if (text === null) return null;
  const store = currentStore();
  return BY_STORE[store.code]?.[text] ?? BY_LANG[store.lang]?.[text] ?? text;
}

/** For tests: every English key, so a seed edit that orphans a translation is caught. */
export const COPY_KEYS: ReadonlySet<string> = new Set(
  [...Object.values(BY_STORE), ...Object.values(BY_LANG)].flatMap((m) => Object.keys(m ?? {})),
);
