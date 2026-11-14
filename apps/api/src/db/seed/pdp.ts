import { findBandProblems, type FeedingRow, type SizeGuideTable } from '@store/shared';

import type { ProductSeed } from './expand.ts';

// Structured product-page content for the demo catalogue (phase 16). Everything is made up and
// generated from the product's category and slug, so the data stays small and re-seeding gives
// the same rows every time. All figures are fictional guidance, never veterinary advice.

export interface PdpSeed {
  specs: { label: string; value: string }[];
  faqs: { question: string; answer: string }[];
  feeding: FeedingRow[];
  /** Basis points per key (kcal is plain kcal per 100 g); same for every variant of the product. */
  constituents: Record<'protein' | 'fat' | 'fibre' | 'ash' | 'moisture' | 'kcal', number> | null;
  sizeGuideSlug: string | null;
  deliveryNote: string | null;
}

// FNV-1a, integer only: a stable pseudo-random number per slug, so values differ between products
// but never between seed runs.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
const between = (seed: number, min: number, max: number) => min + (seed % (max - min + 1));

const FED_CATEGORIES = new Set([
  'dog-treats',
  'cat-treats',
  'small-food',
  'bird-food',
  'fish-food',
  'reptile-food',
]);
// Pets whose treats and foods get a weight-based feeding table.
const FEEDING_CATEGORIES = new Set(['dog-treats', 'cat-treats', 'small-food']);

// Weight bands in grams of pet weight (half-open), and daily grams per band. Treat allowances are
// deliberately small: a treat is not a meal.
const BANDS: Record<string, { min: number; max: number; daily: number }[]> = {
  'dog-treats': [
    { min: 1000, max: 5000, daily: 15 },
    { min: 5000, max: 10000, daily: 30 },
    { min: 10000, max: 20000, daily: 50 },
    { min: 20000, max: 30000, daily: 70 },
    { min: 30000, max: 45000, daily: 90 },
  ],
  'cat-treats': [
    { min: 2000, max: 3500, daily: 8 },
    { min: 3500, max: 5000, daily: 12 },
    { min: 5000, max: 7000, daily: 16 },
    { min: 7000, max: 10000, daily: 20 },
  ],
  'small-food': [
    { min: 100, max: 500, daily: 12 },
    { min: 500, max: 1000, daily: 25 },
    { min: 1000, max: 2000, daily: 45 },
    { min: 2000, max: 4000, daily: 70 },
  ],
};

function feedingFor(p: ProductSeed): FeedingRow[] {
  if (!FEEDING_CATEGORIES.has(p.categorySlug)) return [];
  const bands = BANDS[p.categorySlug] ?? [];
  // Puppies and kittens eat more for their weight; a senior table is a little lower. Products for
  // all ages share one table (`any`).
  const stages =
    p.ageStage === 'puppy' || p.ageStage === 'kitten'
      ? ([['puppy', 130]] as const)
      : p.ageStage === 'senior'
        ? ([['senior', 90]] as const)
        : ([['any', 100]] as const);
  return stages.flatMap(([lifeStage, percent]) =>
    bands.map((b) => ({
      petWeightGMin: b.min,
      petWeightGMax: b.max,
      // Integer maths: round half up of daily * percent / 100.
      dailyG: Math.floor((b.daily * percent + 50) / 100),
      lifeStage,
    })),
  );
}

function constituentsFor(p: ProductSeed): PdpSeed['constituents'] {
  if (!FED_CATEGORIES.has(p.categorySlug)) return null;
  const h = hash(p.slug);
  return {
    protein: between(h >>> 3, 1800, 3400),
    fat: between(h >>> 7, 800, 2000),
    fibre: between(h >>> 11, 200, 500),
    ash: between(h >>> 13, 600, 900),
    moisture: between(h >>> 17, 800, 1200),
    kcal: between(h >>> 5, 280, 420),
  };
}

function sizeGuideFor(p: ProductSeed): string | null {
  if (!p.axes.some((a) => a.key === 'size')) return null;
  if (p.categorySlug === 'dog-walk' && /harness|collar/.test(p.slug)) return 'dog-harness-collar';
  if (p.categorySlug === 'cat-travel' && /harness/.test(p.slug)) return 'cat-harness';
  if (p.categorySlug === 'dog-beds' || p.categorySlug === 'cat-beds') return 'bed-sizes';
  return null;
}

const CARE: Record<string, string> = {
  'dog-toys': 'Wipe clean or hand wash. Supervise play and replace when worn.',
  'cat-toys': 'Wipe clean. Supervise play and replace when worn.',
  'dog-beds': 'Machine washable at 30 degrees, cover removable.',
  'cat-beds': 'Machine washable at 30 degrees, cover removable.',
  'dog-bowls': 'Dishwasher safe.',
  'cat-bowls': 'Dishwasher safe.',
  'dog-walk': 'Wipe clean with a damp cloth. Check for wear before every walk.',
};

const PET_LABEL: Record<string, string> = {
  dog: 'Dogs',
  cat: 'Cats',
  bird: 'Birds',
  fish: 'Fish',
  small: 'Small pets',
  reptile: 'Reptiles',
};
const AGE_LABEL: Record<string, string> = {
  all: 'All life stages',
  adult: 'Adults',
  puppy: 'Puppies',
  kitten: 'Kittens',
  senior: 'Seniors',
};

function specsFor(p: ProductSeed): PdpSeed['specs'] {
  const specs: PdpSeed['specs'] = [
    { label: 'Material', value: p.material },
    { label: 'Suitable for', value: PET_LABEL[p.pet] ?? p.pet },
    { label: 'Life stage', value: AGE_LABEL[p.ageStage] ?? p.ageStage },
  ];
  if (FED_CATEGORIES.has(p.categorySlug)) {
    specs.push({ label: 'Storage', value: 'Keep cool and dry, reseal after opening.' });
    specs.push({ label: 'Best before', value: 'Printed on the pack, at least 6 months' });
  } else if (CARE[p.categorySlug]) {
    specs.push({ label: 'Care', value: CARE[p.categorySlug] ?? '' });
  }
  specs.push({ label: 'Made in', value: 'European Union' });
  return specs;
}

function faqsFor(p: ProductSeed): PdpSeed['faqs'] {
  if (FED_CATEGORIES.has(p.categorySlug)) {
    return [
      {
        question: 'How should I store it after opening?',
        answer: 'Close the pack tightly and keep it somewhere cool and dry. Use within 8 weeks.',
      },
      {
        question: 'Can it replace a regular meal?',
        answer:
          'No. It is a complementary product: use the feeding guide for a daily amount and cut the main meal a little on days you give more.',
      },
      {
        question: 'What if my pet is not eating it?',
        answer:
          'Try a trial size first. If your pet still refuses it, contact us and we will help.',
      },
    ];
  }
  if (p.categorySlug.endsWith('-beds')) {
    return [
      {
        question: 'Can I wash it?',
        answer: 'Yes. Remove the cover and machine wash at 30 degrees, then air dry.',
      },
      {
        question: 'Which size should I pick?',
        answer: 'Open the size guide next to the size picker. When between sizes, size up.',
      },
    ];
  }
  return [
    {
      question: 'Is it safe to leave with my pet unsupervised?',
      answer: 'We recommend supervising play and checking the item for wear regularly.',
    },
    {
      question: 'What is the return policy?',
      answer: 'Unused items can be returned within 30 days. See the Delivery & returns tab.',
    },
  ];
}

function deliveryNoteFor(p: ProductSeed): string | null {
  if (p.categorySlug.endsWith('-beds')) {
    return 'Beds ship in their own box and can arrive separately from the rest of your order.';
  }
  if (p.categorySlug.endsWith('-bowls') && /ceramic/.test(p.slug)) {
    return 'Ceramic goods are packed with extra padding, so the box is a little larger.';
  }
  return null;
}

export function pdpFor(p: ProductSeed): PdpSeed {
  return {
    specs: specsFor(p),
    faqs: faqsFor(p),
    feeding: feedingFor(p),
    constituents: constituentsFor(p),
    sizeGuideSlug: sizeGuideFor(p),
    deliveryNote: deliveryNoteFor(p),
  };
}

// ---- size guides ----

export interface SizeGuideSeed {
  slug: string;
  title: string;
  table: SizeGuideTable;
  howtoMd: string;
  tip: string | null;
}

const SIZES = [
  { size: 'S', label: 'Small' },
  { size: 'M', label: 'Medium' },
  { size: 'L', label: 'Large' },
];

export const sizeGuides: SizeGuideSeed[] = [
  {
    slug: 'dog-harness-collar',
    title: 'Dog harness and collar sizes',
    table: {
      columns: ['Neck (cm)', 'Chest (cm)', 'Dog weight (kg)'],
      rows: [
        { ...SIZES[0]!, values: ['25 to 35', '40 to 55', 'up to 8'] },
        { ...SIZES[1]!, values: ['35 to 45', '55 to 70', '8 to 20'] },
        { ...SIZES[2]!, values: ['45 to 60', '70 to 95', '20 to 40'] },
      ],
    },
    howtoMd:
      '1. Use a soft tape measure and let your dog stand.\n2. Measure around the neck where a collar sits, then add two fingers of room.\n3. Measure the chest around the widest part, behind the front legs.\n4. Compare both with the table. If they fall in different sizes, pick the larger one.',
    tip: 'In between sizes? Size up.',
  },
  {
    slug: 'cat-harness',
    title: 'Cat harness sizes',
    table: {
      columns: ['Neck (cm)', 'Chest (cm)', 'Cat weight (kg)'],
      rows: [
        { ...SIZES[0]!, values: ['18 to 24', '28 to 36', 'up to 3'] },
        { ...SIZES[1]!, values: ['22 to 28', '34 to 44', '3 to 5'] },
        { ...SIZES[2]!, values: ['26 to 34', '42 to 54', '5 to 8'] },
      ],
    },
    howtoMd:
      '1. Let your cat settle, then measure the chest behind the front legs.\n2. Measure the neck loosely: you should fit two fingers under the strap.\n3. Choose the size that matches the chest measurement.',
    tip: 'In between sizes? Size up.',
  },
  {
    slug: 'bed-sizes',
    title: 'Bed sizes',
    table: {
      columns: ['Bed size (cm)', 'Suits pets up to (kg)'],
      rows: [
        { ...SIZES[0]!, values: ['50 x 40', '6'] },
        { ...SIZES[1]!, values: ['70 x 55', '15'] },
        { ...SIZES[2]!, values: ['95 x 70', '35'] },
      ],
    },
    howtoMd:
      '1. Measure your pet from nose to the base of the tail while they stretch out.\n2. Add about 15 cm for comfort.\n3. Pick the bed whose longer side is at least that long.',
    tip: 'In between sizes? Size up.',
  },
];

// Fails the seed (and its test) if any generated feeding table has a gap or an overlap.
export function assertFeedingTablesTile(products: readonly ProductSeed[]): void {
  for (const p of products) {
    const problems = findBandProblems(feedingFor(p));
    if (problems.length > 0) throw new Error(`feeding table of ${p.slug}: ${problems[0]?.message}`);
  }
}
