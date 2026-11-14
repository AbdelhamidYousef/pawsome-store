import type { CategoryAttributes } from '../schema/categories.ts';

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  attributes?: CategoryAttributes;
  children: { slug: string; name: string; description: string }[];
};

// Each pet has its own accent colour; the UI themes the whole shop section with it.
export const categories: CategorySeed[] = [
  {
    slug: 'dogs',
    name: 'Dogs',
    description:
      "Toys that survive the zoomies, beds worth coming home to and walking gear for every weather. Whatever the size, we've got your dog covered.",
    attributes: { accentColor: '#F59E0B', icon: 'dog' },
    children: [
      {
        slug: 'dog-toys',
        name: 'Toys',
        description:
          'Tug ropes, fetch balls and squeaky plush, chosen for tough jaws and long games.',
      },
      {
        slug: 'dog-beds',
        name: 'Beds & Housing',
        description:
          'Deep, squashy beds and cosy blankets with covers that go straight in the wash.',
      },
      {
        slug: 'dog-treats',
        name: 'Food & Treats',
        description:
          'Soft training bites, crunchy biscuits and long-lasting chews with short, readable ingredient lists.',
      },
      {
        slug: 'dog-bowls',
        name: 'Bowls & Feeders',
        description: 'Sturdy bowls, slow feeders for speedy eaters and travel bowls for days out.',
      },
      {
        slug: 'dog-walk',
        name: 'Walk & Travel',
        description:
          'Collars, harnesses and reflective leads that make every walk safer and comfier.',
      },
    ],
  },
  {
    slug: 'cats',
    name: 'Cats',
    description:
      'Quiet toys for midnight hunters, soft hideaways for sunbeam nappers and snacks worth waking up for. Everything here is designed around how cats really behave.',
    attributes: { accentColor: '#8B5CF6', icon: 'cat' },
    children: [
      {
        slug: 'cat-toys',
        name: 'Toys',
        description:
          'Feather teasers, catnip kickers and crinkly mice for stalking, pouncing and batting.',
      },
      {
        slug: 'cat-beds',
        name: 'Beds & Housing',
        description: 'Caves, window perches and cushions for every kind of cat nap.',
      },
      {
        slug: 'cat-treats',
        name: 'Food & Treats',
        description: 'Crunchy treats and lickable pouches for training, rewards and quiet bribery.',
      },
      {
        slug: 'cat-bowls',
        name: 'Bowls & Feeders',
        description:
          'Shallow, whisker-friendly bowls and water fountains that encourage cats to drink more.',
      },
      {
        slug: 'cat-travel',
        name: 'Walk & Travel',
        description:
          'Secure, comfy carriers that make vet trips and holidays a little less dramatic.',
      },
    ],
  },
  {
    slug: 'birds',
    name: 'Birds',
    description:
      'Perches, swings and fresh seed blends for budgies, canaries and finches. Everything a feathered friend needs for a busy, happy day.',
    attributes: { accentColor: '#14B8A6', icon: 'bird' },
    children: [
      {
        slug: 'bird-toys',
        name: 'Toys',
        description: 'Swings, bells and mirrors to keep curious beaks busy between meals.',
      },
      {
        slug: 'bird-food',
        name: 'Food & Treats',
        description:
          'Balanced seed blends and millet sprays for everyday meals and special treats.',
      },
      {
        slug: 'bird-cages',
        name: 'Cages & Stands',
        description: 'Travel cages and play stands with safe bar spacing and easy-clean trays.',
      },
      {
        slug: 'bird-feeders',
        name: 'Bowls & Feeders',
        description: 'Hanging and tabletop feeders that keep seed clean and mess to a minimum.',
      },
    ],
  },
  {
    slug: 'fish',
    name: 'Fish',
    description:
      'Starter tanks, balanced foods and calming decor for clear water and happy fish. Our kits make a first aquarium refreshingly simple.',
    attributes: { accentColor: '#0EA5E9', icon: 'fish' },
    children: [
      {
        slug: 'fish-food',
        name: 'Food & Treats',
        description:
          'Flakes and pellets balanced for common community fish, in sizes that stay fresh.',
      },
      {
        slug: 'fish-tanks',
        name: 'Tanks & Decor',
        description:
          'Complete tanks, soft LED lighting, silk plants and hideouts for a calm, natural look.',
      },
    ],
  },
  {
    slug: 'small-pets',
    name: 'Small Pets',
    description:
      'Sweet meadow hay, chew-safe tunnels and snug hideaways for rabbits, guinea pigs, hamsters and friends. Small pets, properly spoiled.',
    attributes: { accentColor: '#84CC16', icon: 'rabbit' },
    children: [
      {
        slug: 'small-toys',
        name: 'Toys',
        description: 'Tunnels, chews and boredom-busters that keep teeth trim and curiosity fed.',
      },
      {
        slug: 'small-food',
        name: 'Food & Treats',
        description: 'Fresh hay and crunchy chews, the backbone of a healthy small-pet diet.',
      },
      {
        slug: 'small-housing',
        name: 'Beds & Housing',
        description:
          'Hideaway houses in natural materials, so every small pet has a safe place to retreat.',
      },
      {
        slug: 'small-bowls',
        name: 'Bowls & Feeders',
        description: 'Tip-proof bowls and leak-free water bottles sized for little paws.',
      },
    ],
  },
  {
    slug: 'reptiles',
    name: 'Reptiles',
    description:
      'Terrariums, heat and lighting, food and decor for lizards, snakes and tortoises. Get the climate right and everything else follows.',
    attributes: { accentColor: '#16A34A', icon: 'turtle' },
    children: [
      {
        slug: 'reptile-terrariums',
        name: 'Terrariums',
        description: 'Glass and mesh terrariums in every size, with secure lids and good airflow.',
      },
      {
        slug: 'reptile-heat',
        name: 'Heat & Lighting',
        description:
          'Basking lamps, heat mats and thermometers for a steady, safe temperature gradient.',
      },
      {
        slug: 'reptile-feeders',
        name: 'Feeders & Bowls',
        description: 'Water dishes, feeding tongs and dispensers that make mealtimes tidy.',
      },
      {
        slug: 'reptile-decor',
        name: 'Decor & Hides',
        description:
          'Caves, branches and plants that give your reptile places to hide, climb and explore.',
      },
      {
        slug: 'reptile-food',
        name: 'Food',
        description: 'Pellets, supplements and treats for balanced, species-appropriate meals.',
      },
    ],
  },
];
