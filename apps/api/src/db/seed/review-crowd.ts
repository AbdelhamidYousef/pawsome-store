import type { Pet } from '@store/shared';

// "Lots of reviews" for the storefront: 100 to 1000 approved reviews per product, written from
// template pools. Pure functions only (no database), so the shape can be unit-tested quickly; the
// writer is `seedCrowdReviews` in reviews.ts.
//
// Everything hangs off a PRNG seeded per product slug, so every run, machine and database gets the
// same rows, and adding a product does not reshuffle the others. Dates are relative to the start of
// the current UTC day: a re-seed on the same day changes nothing, while a re-seed on a later day
// moves every date forward and so rewrites every crowd row once.
//
// English only: the reviews table has no language column, so a German review would show on the
// English stores too (decisions log, 2026-11-14).

export type CrowdKind =
  | 'toy'
  | 'bed'
  | 'treat'
  | 'food'
  | 'feeding'
  | 'walk'
  | 'travel'
  | 'home'
  | 'heat'
  | 'decor'
  | 'aquarium'
  | 'kit'
  // Product-level kinds, for products whose category text would not fit (KIND_BY_SLUG).
  | 'water'
  | 'feeder'
  | 'tool'
  | 'care'
  | 'supplement'
  | 'scratcher'
  | 'cooling'
  | 'tank'
  | 'accessory';

export interface CrowdProduct {
  id: string;
  slug: string;
  pet: Pet;
  kind: CrowdKind;
  bestseller: boolean;
  // Option axes without the trial sizes, e.g. { key: 'size', labels: ['Small', 'Large'] }.
  axes: { key: string; labels: string[] }[];
}

export interface CrowdReview {
  productId: string;
  // Index into the reviewer pool; never repeats within one product (one review per customer).
  reviewer: number;
  rating: number;
  title: string;
  body: string;
  verifiedBuyer: boolean;
  petAgeMonths: number | null;
  petWeightG: number | null;
  sizePurchased: string | null;
  wouldRecommend: boolean;
  helpfulCount: number;
  createdAt: Date;
  moderatedAt: Date;
}

export const CROWD_POOL_SIZE = 1100;
export const CROWD_MIN = 100;
export const CROWD_MAX = 1000;
const HISTORY_DAYS = 548; // about 18 months
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// Category slug → the kind of text that fits it.
const KIND_BY_CATEGORY: Record<string, CrowdKind> = {
  'dog-toys': 'toy',
  'cat-toys': 'toy',
  'bird-toys': 'toy',
  'small-toys': 'toy',
  'dog-beds': 'bed',
  'cat-beds': 'bed',
  'dog-treats': 'treat',
  'cat-treats': 'treat',
  'bird-food': 'food',
  'fish-food': 'food',
  'small-food': 'food',
  'reptile-food': 'food',
  'dog-bowls': 'feeding',
  'cat-bowls': 'feeding',
  'small-bowls': 'feeding',
  'bird-feeders': 'feeding',
  'reptile-feeders': 'feeding',
  'dog-walk': 'walk',
  'cat-travel': 'travel',
  'bird-cages': 'home',
  'small-housing': 'home',
  'reptile-terrariums': 'home',
  'reptile-heat': 'heat',
  'reptile-decor': 'decor',
  'fish-tanks': 'aquarium',
};

// Products whose category's text would read wrong ("heavy enough not to slide" on feeding tongs,
// "the cover washes well" on a cooling mat). Every seeded product was checked against its kind.
export const KIND_BY_SLUG: Record<string, CrowdKind> = {
  'drip-water-cup': 'water',
  'gravity-water-dispenser': 'water',
  'whisper-drinking-fountain': 'water',
  'bottle-water-dispenser': 'water',
  'sipper-bottle-mini': 'water',
  'hanging-seed-feeder': 'feeder',
  'treat-skewer-holder': 'feeder',
  'hanging-hay-rack': 'feeder',
  'mealworm-dispenser': 'feeder',
  'gecko-gel-cup-set': 'feeder',
  'feeding-tongs': 'tool',
  'misting-bottle': 'tool',
  'digital-thermo-hygrometer': 'tool',
  'compostable-waste-bags': 'care',
  'portable-litter-tray': 'care',
  'nesting-fleece-liners': 'care',
  'seed-catcher-tray': 'care',
  'omega-coat-paste': 'supplement',
  'calcium-dust': 'supplement',
  'cardboard-scratch-lounger': 'scratcher',
  'cooling-gel-mat': 'cooling',
  'starter-tank-20l': 'tank',
  'soft-glow-led-bar': 'tank',
  'night-cage-cover': 'accessory',
  'travel-blanket-roll': 'accessory',
  'carrier-calming-blanket': 'accessory',
  'travel-carry-box': 'travel',
  'cat-harness-and-lead': 'walk',
  'corner-hideaway': 'decor',
  'cosy-hideaway-house': 'decor',
};

export function kindFor(categorySlug: string, productSlug: string): CrowdKind {
  const kind = KIND_BY_SLUG[productSlug] ?? KIND_BY_CATEGORY[categorySlug];
  if (!kind) throw new Error(`no review kind for category ${categorySlug}`);
  return kind;
}

// mulberry32, the same generator as the phase-17 reviews.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a: a stable number per slug.
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

type Rand = () => number;
const pick = <T>(rand: Rand, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
const int = (rand: Rand, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** How many reviews a product gets: most 120-400, a few 400-600, bestsellers 600-1000. */
export function crowdCount(rand: Rand, bestseller: boolean): number {
  if (bestseller) return int(rand, 600, CROWD_MAX);
  const u = rand();
  if (u < 0.06) return int(rand, CROWD_MIN, 119);
  if (u < 0.92) return 120 + Math.floor(280 * rand() ** 1.4);
  return int(rand, 401, 600);
}

// ---------------------------------------------------------------- pets

interface PetVoice {
  names: string[];
  // Breeds or species. Proper-noun breeds are capitalised ("Labrador", "Maine Coon"); common
  // nouns stay lower case ("beagle", "tabby"), as in ordinary English prose.
  kinds: string[];
  weightG?: [number, number];
  maxAgeMonths: number;
}

const PETS: Record<Pet, PetVoice> = {
  dog: {
    names: [
      'Biscuit',
      'Luna',
      'Max',
      'Bella',
      'Teddy',
      'Milo',
      'Daisy',
      'Bruno',
      'Poppy',
      'Rocky',
      'Nala',
      'Oscar',
      'Willow',
      'Pepper',
      'Charlie',
      'Maple',
      'Ziggy',
      'Hugo',
      'Rosie',
      'Bailey',
      'Juno',
      'Archie',
      'Lola',
      'Otis',
      'Frida',
      'Bo',
    ],
    kinds: [
      'beagle',
      'Labrador',
      'Cocker Spaniel',
      'Border Collie',
      'dachshund',
      'rescue greyhound',
      'Staffie',
      'Golden Retriever',
      'Jack Russell',
      'cockapoo',
      'whippet',
      'French Bulldog',
      'German Shepherd',
      'rescue mix',
      'Vizsla',
      'Shih Tzu',
    ],
    weightG: [3_000, 38_000],
    maxAgeMonths: 168,
  },
  cat: {
    names: [
      'Mochi',
      'Luna',
      'Simba',
      'Cleo',
      'Felix',
      'Nala',
      'Oliver',
      'Pumpkin',
      'Tigger',
      'Smokey',
      'Misty',
      'Loki',
      'Pixel',
      'Olive',
      'Bean',
      'Salem',
      'Ginger',
      'Minou',
      'Jasper',
      'Willow',
    ],
    kinds: [
      'tabby',
      'ragdoll',
      'British Shorthair',
      'Maine Coon',
      'black cat',
      'Siamese',
      'ginger tom',
      'Bengal',
      'rescue cat',
      'tortoiseshell',
      'senior moggy',
      'kitten',
    ],
    weightG: [2_500, 7_500],
    maxAgeMonths: 216,
  },
  bird: {
    names: [
      'Kiwi',
      'Mango',
      'Sunny',
      'Pip',
      'Peaches',
      'Rio',
      'Sky',
      'Echo',
      'Blue',
      'Pickle',
      'Tango',
    ],
    kinds: [
      'budgie',
      'cockatiel',
      'canary',
      'green-cheek conure',
      'African Grey',
      'parrotlet',
      'lovebird',
    ],
    weightG: [25, 500],
    maxAgeMonths: 240,
  },
  small: {
    names: [
      'Clover',
      'Peanut',
      'Hazel',
      'Nibbles',
      'Pudding',
      'Thumper',
      'Coco',
      'Oreo',
      'Fudge',
      'Waffles',
      'Bramble',
    ],
    kinds: ['rabbit', 'guinea pig', 'hamster', 'dwarf rabbit', 'chinchilla', 'rat', 'gerbil'],
    weightG: [60, 2_500],
    maxAgeMonths: 96,
  },
  reptile: {
    names: [
      'Spike',
      'Ziggy',
      'Noodle',
      'Rex',
      'Sheldon',
      'Pebble',
      'Gus',
      'Mango',
      'Yoshi',
      'Basil',
    ],
    kinds: [
      'leopard gecko',
      'bearded dragon',
      'corn snake',
      'crested gecko',
      'tortoise',
      'ball python',
    ],
    weightG: [40, 3_000],
    maxAgeMonths: 180,
  },
  fish: {
    names: ['Bubbles', 'Nemo', 'Finn', 'Neptune', 'Goldie', 'Sushi', 'Blue', 'Captain'],
    kinds: ['betta', 'goldfish', 'pleco', 'gourami'],
    maxAgeMonths: 60,
  },
};

const PET_WORD: Record<Pet, string> = {
  dog: 'dog',
  cat: 'cat',
  bird: 'bird',
  small: 'little one',
  reptile: 'reptile',
  fish: 'fish',
};

// {name} {kind} {pet} are filled in per review.
const OPENERS_GOOD = [
  '{Name} took to it straight away.',
  'Bought this for {name}, our {kind}, and it was a hit from day one.',
  'Our {kind} {name} gives it a full thumbs up.',
  '{Name} is a very fussy {kind}, so I was nervous, but there have been no complaints at all.',
  'Second time buying this. {Name} would not let us switch.',
  'Got this when we brought {name} home and it has been part of the routine ever since.',
  'My {kind} {name} approves, and that is not easy to earn.',
  'Picked this up for {name} after a friend recommended it.',
  'We have two pets and both of them like it, which never happens.',
  '{Name} noticed it the moment the box was opened.',
];
const OPENERS_MIXED = [
  '{Name} likes it well enough.',
  'Bought for our {kind}, {name}, who is a little lukewarm about it.',
  'Mixed feelings on this one.',
  'It is fine, but I had higher hopes.',
];
const OPENERS_BAD = [
  'Really wanted to like this.',
  'Bought this for our {kind}, {name}, and it did not work out.',
  '{Name} was not impressed, and neither was I.',
];

// ---------------------------------------------------------------- per kind

interface KindText {
  good: string[];
  mixed: string[];
  bad: string[];
  titles: string[];
}

const KINDS: Record<CrowdKind, KindText> = {
  toy: {
    good: [
      'It has survived weeks of rough play and still looks almost new.',
      'Well put together, and nothing has come loose.',
      'Keeps {name} busy for ages, which means a quieter evening for us.',
      'The colours are bright and have not faded.',
      'Light enough to carry around, sturdy enough to chew on.',
      'It is the first thing picked up every morning.',
      'Good size: big enough to be safe, small enough to carry.',
      'Holds up better than the cheaper toys we tried before.',
    ],
    mixed: [
      'Fun for the first few days, then the interest dropped a bit.',
      'Holding up okay, though one seam is starting to fray.',
      'Smaller than I pictured, but it still gets played with.',
    ],
    bad: [
      'It was torn open within two days.',
      'Lost interest immediately, and the colour ran in the wash.',
      'A seam split on the first day.',
    ],
    titles: ['Favourite toy', 'Built to last', 'Hours of fun', 'Tough and fun', 'Toy box winner'],
  },
  bed: {
    good: [
      'Thick, soft and it keeps its shape.',
      'The cover comes off easily and has survived the washing machine several times.',
      'The non-slip base actually works on our wooden floor.',
      'Sleeps in it every night now, curled up for hours.',
      'Looks smart in the living room, not like a pet bed at all.',
      'Warm enough for the cold months without overheating.',
      'Easy to clean, and the fabric does not hold on to hair.',
    ],
    mixed: [
      'Comfortable, but flatter after a month than I hoped.',
      'Nice bed, though the cover shrank slightly in the wash.',
      'It took a week before it was accepted, now it is fine.',
    ],
    bad: [
      'It went flat within a couple of weeks.',
      'The zip broke the first time I washed the cover.',
      'It smelled strongly of chemicals for days.',
    ],
    titles: [
      'So comfy',
      'Best seat in the house',
      'Nap approved',
      'Cosy and washable',
      'Sleeps like a dream',
    ],
  },
  treat: {
    good: [
      'Comes running the second the packet rustles.',
      'Small enough for training, so we can use plenty without overdoing it.',
      'The ingredient list is short, which matters with a sensitive tummy.',
      'No upset stomach, even on a sensitive day.',
      'The bag reseals properly, so they stay fresh.',
      'Perfect as a little reward between meals.',
      'One of the few treats that never gets left behind.',
    ],
    mixed: [
      'Liked them, but not as much as our usual ones.',
      'Good treats, but the bag is smaller than I expected for the price.',
      'A few were broken into crumbs in the bag.',
    ],
    bad: [
      'Sniffed one and walked away, never touched them again.',
      'Too hard to break, and they left crumbs everywhere.',
      'They gave a bit of an upset stomach, so we stopped.',
    ],
    titles: [
      'Treat heaven',
      'Training essential',
      'Gone in seconds',
      'Tasty and simple',
      'Best treats',
    ],
  },
  food: {
    good: [
      'Every portion gets eaten, and quickly.',
      'Switched over gradually and had no tummy trouble at all.',
      'A good mix, with very little left over or wasted.',
      'Looking healthier and more lively since we changed.',
      'The resealable bag keeps it fresh to the last scoop.',
      'A little goes a long way, so the bag lasts longer than expected.',
    ],
    mixed: [
      'Eats it, but picks out the favourite bits first.',
      'Good quality, but a bit dusty at the bottom of the bag.',
      'Fine, but the price has crept up.',
    ],
    bad: [
      'Refused to eat it after the first day.',
      'Lots of dust and broken bits in the bag.',
      'It did not agree with our pet at all.',
    ],
    titles: [
      'Clean bowl every time',
      'Our new staple',
      'Healthy and tasty',
      'Happy eater',
      'Good food',
    ],
  },
  feeding: {
    good: [
      'Heavy enough that it does not slide around.',
      'Goes in the dishwasher and still looks new.',
      'Easy to fill and easy to clean, which is all I wanted.',
      'No more spills at dinner time.',
      'Feels solid and well made, much better than our old one.',
      'Fits the space perfectly and looks tidy.',
    ],
    mixed: [
      'It works well, but it is a bit fiddly to clean the corners.',
      'Good design, though a little smaller than I expected.',
      'Does the job, but the finish chipped slightly.',
    ],
    bad: [
      'It leaks.',
      'Tipped over constantly, with more food on the floor than in it.',
      'It cracked within a month.',
    ],
    titles: [
      'Mess-free meals',
      'Simple and sturdy',
      'Easy to clean',
      'Does the job well',
      'Well made',
    ],
  },
  walk: {
    good: [
      'Fits well and does not rub, even on long walks.',
      'The reflective trim is great on dark winter evenings.',
      'The clips feel solid and are easy to use with cold fingers.',
      'Easy to adjust, it took two minutes to get a good fit.',
      'It survived mud and rain, and washed up fine.',
      'Comfortable enough that it goes on without any fuss.',
    ],
    mixed: [
      'Good quality, but sizing was tricky, so check the guide twice.',
      'Strong, but the buckle is stiff.',
      'Nice, though the colour faded after a few washes.',
    ],
    bad: [
      'It rubbed under the legs after the first walk.',
      'The clip came loose on a walk, which scared me.',
      'The sizing was way off and it had to go back.',
    ],
    titles: [
      'Walks are easier',
      'Great fit',
      'Solid and comfy',
      'Ready for any weather',
      'Walk essential',
    ],
  },
  travel: {
    good: [
      'Calmer in the car than ever before.',
      'Sturdy, easy to clean, and the zips are solid.',
      'Plenty of air and a good view out.',
      'Light enough to carry to the vet without aching arms.',
      'Folds away neatly when we do not need it.',
    ],
    mixed: [
      'It works, but it is a bit snug for a bigger pet.',
      'Good, but the strap could be more padded.',
    ],
    bad: ['The zip gave out on the second trip.', 'Far too small, despite checking the sizes.'],
    titles: ['Stress-free vet trips', 'Great for travel', 'Comfy carrier', 'Well designed'],
  },
  home: {
    good: [
      'Set-up took about twenty minutes and the instructions were clear.',
      'Solid build, nothing wobbles.',
      'Easy to clean thanks to the wide door.',
      'Plenty of space, and it looks great in the room.',
      'Good ventilation, and the doors close securely.',
    ],
    mixed: [
      'Nice once built, but the instructions could be clearer.',
      'Good overall, though one panel arrived slightly scratched.',
    ],
    bad: [
      'It arrived with a cracked panel.',
      'The parts did not line up and it took hours to build.',
    ],
    titles: ['Lovely new home', 'Roomy and solid', 'Easy to set up', 'Great enclosure'],
  },
  heat: {
    good: [
      'Temperatures have been rock steady since I set it up.',
      'Easy to set up, and the instructions include a temperature guide.',
      'The basking spot is exactly where it should be now.',
      'Feels well built and safe, and the cable is long enough.',
      'Basks under it every morning and is much more active.',
    ],
    mixed: [
      'It works, but runs a little hotter than stated, so use a thermostat.',
      'Good, but the cable is on the short side.',
    ],
    bad: [
      'It stopped working after three weeks.',
      'I could not get it to hold a steady temperature.',
    ],
    titles: [
      'Steady temperatures',
      'Does exactly what it says',
      'Reliable heat',
      'Great for basking',
    ],
  },
  decor: {
    good: [
      'Looks natural in the enclosure, not plasticky at all.',
      'Stable, it does not topple when climbed on.',
      'Easy to rinse and safe, with no sharp edges.',
      'Gets used as a hide and a lookout, often on the same day.',
      'Makes the whole enclosure look more natural.',
    ],
    mixed: [
      'Looks nice, but smaller than in the photos.',
      'Good, though the colour is a bit flat.',
    ],
    bad: ['It arrived chipped.', 'Much smaller than pictured.'],
    titles: ['Looks so natural', 'Great hide', 'Lovely addition', 'Nice decor'],
  },
  aquarium: {
    good: [
      'Looks lovely in the tank and the fish explore it every day.',
      'No sharp edges, so it is safe for long fins.',
      'The colours look natural in the water.',
      'Easy to rinse during water changes.',
      'The water has stayed crystal clear.',
    ],
    mixed: [
      'Looks good, but it was smaller than I expected.',
      'Nice, though it took a while to sink and settle.',
    ],
    bad: ['The colour started to fade in the water.', 'It arrived broken.'],
    titles: ['Beautiful tank', 'Happy fish', 'Looks great', 'Lovely addition'],
  },
  water: {
    good: [
      'Fresh water all day, and it is easy to see when it needs a refill.',
      'No drips, and the bedding stays dry.',
      'Easy to take apart and clean.',
      'Drinks more since we got it, which the vet was pleased about.',
      'Quiet, and it holds plenty.',
    ],
    mixed: [
      'It works, but the spout took some getting used to.',
      'Good, though it needs cleaning more often than I hoped.',
    ],
    bad: ['It leaks.', 'The spout clogged within a fortnight.'],
    titles: ['Fresh water, no fuss', 'No more spills', 'Drinks more now', 'Simple and clean'],
  },
  feeder: {
    good: [
      'Keeps food off the floor and clean.',
      'Easy to fill and it attaches securely.',
      'Much less waste than before.',
      'Simple to take down and wash.',
      'Turns feeding into a little foraging game.',
    ],
    mixed: [
      'Works well, but the clip is a bit fiddly.',
      'Good idea, though it is smaller than I expected.',
    ],
    bad: ['It fell off the bars twice in the first week.', 'Hard to clean properly.'],
    titles: ['Tidy feeding', 'Less waste', 'Clever design', 'Does the job well'],
  },
  tool: {
    good: [
      'Well made and does exactly what it should.',
      'Comfortable to use every day.',
      'Accurate and easy to read.',
      'Makes the daily routine quicker.',
      'Feels sturdy, not like a cheap gadget.',
    ],
    mixed: ['It works, but the finish could be better.', 'Good, though a little fiddly at first.'],
    bad: ['It stopped working properly within a month.', 'Feels flimsy for the price.'],
    titles: ['Handy tool', 'Use it every day', 'Does what it says', 'Small but essential'],
  },
  care: {
    good: [
      'Makes cleaning up quick and easy.',
      'Strong, and it does not leak or tear.',
      'Keeps everything much tidier.',
      'Washes well and dries quickly.',
      'Good to have something less wasteful.',
    ],
    mixed: ['Does the job, but I go through it faster than expected.', 'Fine, nothing special.'],
    bad: ['It tore the first time I used it.', 'Not as absorbent as I hoped.'],
    titles: ['Clean-up made easy', 'Tidy home', 'Practical', 'Good everyday buy'],
  },
  supplement: {
    good: [
      'Easy to add to food and it gets eaten without fuss.',
      'The coat looks glossier after a few weeks.',
      'A little goes a long way.',
      'Clear dosing instructions on the pack.',
      'Our vet was happy for us to use it.',
    ],
    mixed: ['Hard to say if it is making a difference yet.', 'Good, but the pack is small.'],
    bad: ['Refused anything it was mixed into.', 'No difference after two months.'],
    titles: ['Part of the routine', 'Easy to give', 'Healthy shine', 'Worth adding'],
  },
  scratcher: {
    good: [
      'Gets scratched every day, and the sofa has been spared.',
      'Doubles as a favourite napping spot.',
      'Sturdy, it does not slide around when scratched.',
      'Lasted much longer than I expected for cardboard.',
    ],
    mixed: ['Good, but it sheds bits of cardboard.', 'Used, but not as much as the doormat.'],
    bad: ['Ignored completely.', 'Fell apart within a few weeks.'],
    titles: ['Sofa saved', 'Scratch heaven', 'Great scratcher', 'Well used'],
  },
  cooling: {
    good: [
      'Stays cool on hot days without any electricity.',
      'Lies on it every afternoon in summer.',
      'Wipes clean in seconds.',
      'Light enough to take in the car.',
    ],
    mixed: [
      'Cools well, but it warms up after an hour or so.',
      'Good, though it creases a little.',
    ],
    bad: ['It punctured within a week.', 'Barely felt cool at all.'],
    titles: ['Summer saver', 'Cool and comfy', 'Hot day essential', 'Great in the heat'],
  },
  tank: {
    good: [
      'Easy to set up, and everything needed was in the box.',
      'The light shows off the colours without being harsh.',
      'Runs quietly, and the water has stayed clear.',
      'The fish settled in quickly.',
      'Looks smart on the shelf.',
    ],
    mixed: [
      'Good, though the instructions could be clearer.',
      'Nice, but a little smaller than I imagined.',
    ],
    bad: ['It arrived with a crack.', 'Stopped working after a few weeks.'],
    titles: ['Great starter setup', 'Beautiful tank', 'Happy fish', 'Easy to set up'],
  },
  accessory: {
    good: [
      'Well made and fits perfectly.',
      'Washes well and keeps its shape.',
      'Makes evenings and journeys much calmer.',
      'Good quality fabric, and it feels sturdy.',
    ],
    mixed: ['Does the job, but the fit is a little loose.', 'Fine, though thinner than expected.'],
    bad: ['Frayed after the first wash.', 'Did not fit as described.'],
    titles: ['Useful extra', 'Good quality', 'Does the job', 'Nicely made'],
  },
  kit: {
    good: [
      'Everything we needed in one box.',
      'Great value compared with buying each piece separately.',
      'It made a lovely gift for a friend with a new puppy.',
      'Every piece gets used, nothing went in the cupboard.',
    ],
    mixed: [
      'Good kit, though one piece was not quite our style.',
      'Nice set, but I would have liked a choice of colours.',
    ],
    bad: [
      'One piece was missing from the box.',
      'The parts were not as good as buying them separately.',
    ],
    titles: ['Great starter kit', 'Perfect bundle', 'Brilliant gift', 'Everything in one box'],
  },
};

// Lines that suit one pet whatever the product.
const PET_LINES: Record<Pet, string[]> = {
  dog: [
    'Tail going the whole time.',
    'Even the puppy next door wants one now.',
    'I have recommended it to friends at the park.',
  ],
  cat: ['The purring says it all.', 'Rare for a cat to approve of anything new this quickly.'],
  bird: [
    'Lots of happy chirping since it arrived.',
    'More singing in the mornings, I am sure of it.',
  ],
  small: [
    'Lots of happy zooming around since it arrived.',
    '{Name} comes straight to the front of the cage when I open the cupboard.',
  ],
  reptile: [
    'Looks relaxed and is eating well.',
    'Shed nicely last week, which is always a good sign.',
  ],
  fish: ['The fish look bright and active.', 'Water quality has been great.'],
};

const DELIVERY = {
  good: [
    'It arrived the next day, well packed.',
    'Fast delivery, and no plastic in the packaging.',
    'Ordered on Sunday, here on Tuesday.',
    'Quick delivery and the parcel was in perfect condition.',
    'Delivery was quick and the tracking was clear.',
  ],
  mixed: ['It took a few days longer than expected to arrive.'],
  bad: ['It arrived late and the box was crushed.'],
};
const VALUE = {
  good: [
    'Great value for the quality.',
    'Worth every cent.',
    'Cheaper than the pet shop in town and better made.',
    'The quality is excellent for the price.',
  ],
  mixed: ['A bit pricey, but it is well made.', 'Fair price, nothing special.'],
  bad: ['Not worth the money.'],
};
const CLOSERS = {
  good: [
    'Will definitely buy again.',
    'Already ordered a second one.',
    'I have recommended it to friends.',
    'Cannot fault it.',
    'Happy pet, happy owner.',
    'Highly recommend.',
  ],
  mixed: ['Would probably buy again on offer.', 'Okay, but I will try something else next time.'],
  bad: [
    'Will not be buying again.',
    'Customer service sorted a refund quickly, at least.',
    'Sadly, it is going back.',
  ],
};
const SHORT_GOOD = [
  'Perfect, no notes.',
  'Does exactly what it says.',
  '{Name} approves.',
  'Great quality, quick delivery.',
  'Love it, and so does {name}.',
  'Exactly as described.',
];

const TITLES = {
  good: [
    'Love it',
    'Great buy',
    'Exactly what we needed',
    'Worth every cent',
    'Highly recommend',
    'Brilliant',
    'Five stars',
    'Really pleased',
    'Spot on',
    'So happy with this',
  ],
  mixed: ['Good, not perfect', 'Does the job', 'Fine for the price', 'Okay', 'Some pros and cons'],
  bad: ['Not for us', 'Disappointing', 'Expected better', 'Did not last', 'Sent it back'],
};

// Axes a customer would name ("the large", "the red one"); a blend or wattage reads oddly.
const MENTIONED_AXES = new Set(['color', 'size', 'pack', 'flavour', 'length']);

function optionLine(rand: Rand, key: string, label: string, tone: 'good' | 'mixed'): string {
  // Words go lower case mid-sentence ("the large"), units keep their case ("the 3 L").
  const l = /^[A-Za-z ]+$/.test(label) ? label.toLowerCase() : label;
  if (tone === 'mixed') {
    if (key === 'size') return `The ${l} runs a little small, so size up if in doubt.`;
    if (key === 'color') return `The ${l} is a little darker than on screen.`;
    if (key === 'flavour') return `The ${l} was not a hit, so we will try another flavour.`;
    return `We went for ${l}, which was fine.`;
  }
  switch (key) {
    case 'color':
      return pick(rand, [
        `The ${l} one looks just like the photos.`,
        `We chose ${l} and it is a lovely shade in real life.`,
      ]);
    case 'size':
      return pick(rand, [
        `We got the ${l} and the size is spot on.`,
        `Ordered the ${l} after checking the size guide, and it fits perfectly.`,
      ]);
    case 'pack':
      return pick(rand, [
        `We buy the ${l} pack now, it lasts ages.`,
        `Started with the ${l} pack to try it, and we will go bigger next time.`,
      ]);
    case 'flavour':
      return `${cap(l)} is the clear favourite in our house.`;
    case 'length':
      return `The ${l} length is perfect for park walks.`;
    default:
      return `We went for ${l} and it was the right call.`;
  }
}

function fill(text: string, name: string, kind: string, pet: Pet): string {
  return text
    .replaceAll('{Name}', name)
    .replaceAll('{name}', name)
    .replaceAll('{kind}', kind)
    .replaceAll('{pet}', PET_WORD[pet]);
}

// The probability of each star (1..5) for a product of quality q in [-0.3, 1]: averages land
// between about 4.3 and 4.65.
function starWeights(q: number): number[] {
  const p1 = 0.03 - 0.02 * q;
  const p2 = 0.03 - 0.015 * q;
  const p3 = 0.08 - 0.05 * q;
  const p4 = 0.26 - 0.04 * q;
  return [p1, p2, p3, p4, 1 - p1 - p2 - p3 - p4];
}

function drawRating(rand: Rand, weights: number[]): number {
  let u = rand();
  for (let i = 0; i < weights.length; i++) {
    u -= weights[i]!;
    if (u < 0) return i + 1;
  }
  return 5;
}

// Strides that share no factor with the pool size (1100 = 2^2 * 5^2 * 11), so offset + k * stride
// visits every reviewer once before repeating.
const STRIDES = [3, 7, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83];

export function generateCrowdReviews(products: readonly CrowdProduct[], now: Date): CrowdReview[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: CrowdReview[] = [];
  for (const product of products) {
    const rand = rng(hash(product.slug));
    const count = crowdCount(rand, product.bestseller);
    const quality = product.bestseller ? 0.5 + rand() * 0.5 : -0.1 + rand() * 1.1;
    const weights = starWeights(quality);
    const offset = Math.floor(rand() * CROWD_POOL_SIZE);
    const stride = pick(rand, STRIDES);
    const voice = PETS[product.pet];
    const text = KINDS[product.kind];
    const axes = product.axes.filter((a) => MENTIONED_AXES.has(a.key));

    for (let k = 0; k < count; k++) {
      const rating = drawRating(rand, weights);
      const tone = rating >= 4 ? 'good' : rating === 3 ? 'mixed' : 'bad';
      const name = pick(rand, voice.names);
      const kind = pick(rand, voice.kinds);

      // The variant they bought, e.g. "Orange · Large" (only the axes people name).
      const chosen = axes.map((a) => ({ key: a.key, label: pick(rand, a.labels) }));
      const sizePurchased = chosen.length > 0 ? chosen.map((c) => c.label).join(' · ') : null;

      let title: string;
      let sentences: string[];
      if (tone === 'good' && rand() < 0.12) {
        title = pick(rand, rand() < 0.5 ? TITLES.good : text.titles);
        sentences = [pick(rand, SHORT_GOOD)];
      } else if (tone === 'good') {
        title = pick(rand, rand() < 0.5 ? TITLES.good : text.titles);
        const option = chosen.length > 0 && rand() < 0.35 ? pick(rand, chosen) : null;
        const aspects = [pick(rand, text.good)];
        if (rand() < 0.55) aspects.push(pick(rand, text.good));
        sentences = [
          ...(rand() < 0.6 ? [pick(rand, OPENERS_GOOD)] : []),
          ...aspects,
          ...(option ? [optionLine(rand, option.key, option.label, 'good')] : []),
          ...(rand() < 0.15 ? [pick(rand, PET_LINES[product.pet])] : []),
          ...(rand() < 0.3 ? [pick(rand, DELIVERY.good)] : []),
          ...(rand() < 0.25 ? [pick(rand, VALUE.good)] : []),
          ...(rand() < 0.4 ? [pick(rand, CLOSERS.good)] : []),
        ];
      } else if (tone === 'mixed') {
        title = pick(rand, TITLES.mixed);
        const option = chosen.length > 0 && rand() < 0.3 ? pick(rand, chosen) : null;
        sentences = [
          ...(rand() < 0.5 ? [pick(rand, OPENERS_MIXED)] : []),
          pick(rand, text.mixed),
          ...(rand() < 0.5 ? [pick(rand, text.good)] : []),
          ...(option ? [optionLine(rand, option.key, option.label, 'mixed')] : []),
          ...(rand() < 0.3 ? [pick(rand, rand() < 0.5 ? DELIVERY.mixed : VALUE.mixed)] : []),
          ...(rand() < 0.4 ? [pick(rand, CLOSERS.mixed)] : []),
        ];
      } else {
        title = pick(rand, TITLES.bad);
        sentences = [
          ...(rand() < 0.5 ? [pick(rand, OPENERS_BAD)] : []),
          pick(rand, text.bad),
          ...(rand() < 0.25 ? [pick(rand, rand() < 0.5 ? DELIVERY.bad : VALUE.bad)] : []),
          ...(rand() < 0.6 ? [pick(rand, CLOSERS.bad)] : []),
        ];
      }
      // A body sentence that only repeats the title ("Highly recommend" / "Highly recommend.") goes.
      const same = (a: string) =>
        a
          .replace(/[.!]+$/, '')
          .trim()
          .toLowerCase();
      const kept = sentences.filter((x) => same(x) !== same(title));
      const body = fill(
        [...new Set(kept.length > 0 ? kept : ['Really pleased with it.'])].join(' '),
        name,
        kind,
        product.pet,
      );

      // Newer reviews are more common than old ones (a growing shop): u^1.6 leans towards today.
      const daysAgo = 1 + Math.floor((HISTORY_DAYS - 1) * rand() ** 1.6);
      const createdAt = new Date(today - daysAgo * DAY_MS + Math.floor(rand() * DAY_MS));
      const moderatedAt = new Date(
        Math.min(createdAt.getTime() + int(rand, 2, 30) * HOUR_MS, today),
      );
      const withPet = voice.weightG !== undefined && rand() < 0.4;
      const [wMin, wMax] = voice.weightG ?? [1, 1];
      const h = rand();
      // Most reviews get a vote or two; long, older ones collect more.
      const helpful = Math.floor(
        h ** 3 * (sentences.length >= 4 ? 60 : 18) * (daysAgo > 120 ? 1.5 : 1),
      );

      out.push({
        productId: product.id,
        reviewer: (offset + k * stride) % CROWD_POOL_SIZE,
        rating,
        title,
        body,
        verifiedBuyer: rand() < 0.86,
        petAgeMonths: withPet ? int(rand, 3, voice.maxAgeMonths) : null,
        petWeightG: withPet ? int(rand, wMin, wMax) : null,
        sizePurchased,
        wouldRecommend: rating >= 4 ? true : rating === 3 ? rand() < 0.6 : rand() < 0.05,
        helpfulCount: helpful,
        createdAt,
        moderatedAt,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------- reviewer pool

const FIRST = [
  'Anna',
  'Ben',
  'Chloe',
  'Daniel',
  'Emma',
  'Finn',
  'Grace',
  'Henry',
  'Isla',
  'Jack',
  'Katie',
  'Leo',
  'Maya',
  'Nico',
  'Olivia',
  'Paul',
  'Quinn',
  'Ruby',
  'Sam',
  'Tara',
  'Umar',
  'Vera',
  'Will',
  'Yara',
  'Zoe',
  'Aisha',
  'Bram',
  'Clara',
  'David',
  'Elif',
  'Femke',
  'Gabriel',
  'Hannah',
  'Ivan',
  'Julia',
  'Kofi',
  'Lena',
  'Marco',
  'Nina',
  'Omar',
  'Pia',
  'Rosa',
  'Stefan',
  'Tom',
  'Ula',
  'Victor',
  'Wren',
  'Xavier',
  'Yusuf',
  'Zara',
  'Amelie',
  'Bastian',
  'Camille',
  'Dmitri',
  'Esme',
  'Frederik',
  'Giulia',
  'Hugo',
  'Ingrid',
  'Jonas',
  'Karin',
  'Lucas',
  'Marta',
  'Noor',
  'Oskar',
  'Priya',
  'Rafael',
  'Sofie',
  'Theo',
  'Valentina',
  'Wiebke',
  'Ada',
  'Emil',
  'Freya',
];
const LAST = [
  'Smith',
  'Jansen',
  'Müller',
  'Martin',
  'Rossi',
  'Novak',
  'Andersen',
  'Dubois',
  'Kowalski',
  'Brown',
  'de Vries',
  'Schmidt',
  'Bernard',
  'Ricci',
  'Horvat',
  'Nielsen',
  'Moreau',
  'Nowak',
  'Taylor',
  'Bakker',
  'Weber',
  'Laurent',
  'Bianchi',
  'Kovač',
  'Larsen',
  'Fontaine',
  'Wiśniewska',
  'Wilson',
  'Visser',
  'Fischer',
  'Garcia',
  'Lopez',
  'Berg',
  'Lindqvist',
  'Murphy',
  'Kelly',
  'Okafor',
  'Haddad',
  'Silva',
  'Costa',
  'Yilmaz',
  'Petrov',
  'Meyer',
  'Lambert',
  'Ward',
];

export { CROWD_EMAIL_PATTERN } from './reviewer-emails.ts';
export const crowdReviewerEmail = (i: number) =>
  `customer${String(i + 1).padStart(4, '0')}@pawsome.test`;

// Accounts dated before every review they wrote, and before any real sign-up: the admin customer
// list (newest first) shows real customers above the 1100 reviewer accounts. A fixed date, so a
// re-seed does not rewrite the rows.
export const CROWD_ACCOUNTS_FROM = Date.UTC(2025, 0, 6);

/** The reviewer pool: invented names on the reserved `.test` domain. */
export function crowdReviewers(): {
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}[] {
  return Array.from({ length: CROWD_POOL_SIZE }, (_, i) => ({
    email: crowdReviewerEmail(i),
    createdAt: new Date(CROWD_ACCOUNTS_FROM - i * 60 * 60 * 1000),
    firstName: FIRST[i % FIRST.length]!,
    lastName: LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length]!,
  }));
}
