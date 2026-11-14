import { z } from 'zod';

export const BrandSeedSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().min(2).max(60),
  tagline: z.string().min(5).max(120),
  story: z.string().min(40).max(600),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  // Square badge artwork in apps/web/public/brands; the UI falls back to the accent colour.
  logoUrl: z
    .string()
    .regex(/^\/brands\/[a-z0-9-]+\.(webp|png|jpg|jpeg|avif)$/)
    .optional(),
});
export type BrandSeed = z.infer<typeof BrandSeedSchema>;

// All names are invented. Each was checked against a web search for an existing pet brand on
// 2026-10-31 (see the decisions log); near misses were renamed rather than risked.
export const HOUSE_BRAND = 'pawsome';

export const brands: BrandSeed[] = [
  {
    slug: 'pawsome',
    name: 'Pawsome',
    tagline: 'Everyday essentials, done properly.',
    story:
      "Pawsome is our own label: the bowls, leads, toys and bottles we kept wishing someone made a little better. Every piece goes through a household test panel of dogs, cats and one very opinionated rabbit before it reaches the shop. We favour washable fabrics, sturdy stitching and colours that cheer up a hallway. If something doesn't last, tell us and we'll put it right.",
    accentColor: '#F59E0B',
    logoUrl: '/brands/pawsome.webp',
  },
  {
    slug: 'burrow-and-biscuit',
    name: 'Burrow & Biscuit',
    tagline: 'Cosy beds and small-batch bakes for dogs and small pets.',
    story:
      'Burrow & Biscuit began with one oven, one sofa and a beagle who refused to sleep anywhere else. Today the team makes deep, squashy beds with removable, machine-washable covers, and treats baked in small batches from a short list of ingredients you can read out loud. No mystery fillers, no artificial colours. Just the two things a good day ends with: a snack and somewhere soft to curl up.',
    accentColor: '#D97706',
    logoUrl: '/brands/burrow-and-biscuit.webp',
  },
  {
    slug: 'moonbeam-mews',
    name: 'Moonbeam Mews',
    tagline: 'Quiet toys and soft hideaways for curious cats.',
    story:
      'Moonbeam Mews designs for cats as they really are: sunbeam nappers at noon, fearless hunters at midnight. Toys are built around stalking, pouncing and batting, sized for real paws and stitched to survive the 3 a.m. zoomies. The hideaways are soft, warm and a little bit secret, because every cat deserves somewhere to watch the world unseen. Calm colours, gentle materials and nothing that rattles you awake.',
    accentColor: '#7C3AED',
    logoUrl: '/brands/moonbeam-mews.webp',
  },
  {
    slug: 'scaleby',
    name: 'Scaleby',
    tagline: 'Terrarium gear that gets the climate right.',
    story:
      'Scaleby is for keepers who check the thermometer before they say good morning. The range covers glass terrariums, basking lamps, heat mats and the small fittings that turn a tank into a proper habitat. Every heat product ships with clear set-up instructions and a recommended temperature gradient for common species. Sturdy, steady and safe, so your reptile can bask, hide and thrive.',
    accentColor: '#16A34A',
    logoUrl: '/brands/scaleby.webp',
  },
  {
    slug: 'pebble-and-pine',
    name: 'Pebble & Pine',
    tagline: 'Natural materials, made to last, lighter on the planet.',
    story:
      "Pebble & Pine makes pet gear from recycled fibres, untreated wood and plant-based dyes. The idea is simple: fewer things, made better, kept longer. Beds have covers you can wash for years, toys use offcuts instead of new plastic, and packaging is card you can recycle at home. It's the range for people who like their pet's corner to feel as calm and natural as the rest of the house.",
    accentColor: '#15803D',
    logoUrl: '/brands/pebble-and-pine.webp',
  },
  {
    slug: 'tidepool',
    name: 'Tidepool',
    tagline: 'Clear water, calm fish, simple care.',
    story:
      'Tidepool takes the guesswork out of fishkeeping. The starter tanks arrive with everything you need in one box, the foods are balanced for common community fish, and the lighting is soft enough to show off colour without stressing anyone out. Decor and silk plants give fish places to hide and explore. Every product comes with plain-English tips, because a happy aquarium is mostly a matter of good habits.',
    accentColor: '#0284C7',
    logoUrl: '/brands/tidepool.webp',
  },
];
