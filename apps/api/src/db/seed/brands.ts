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
    tagline: 'Everyday essentials for every kind of pet.',
    story:
      'Our own label: the sensible, colourful basics we reach for ourselves, from tug ropes to water bottles, tested by a very fussy panel of pets.',
    accentColor: '#F59E0B',
  },
  {
    slug: 'burrow-and-biscuit',
    name: 'Burrow & Biscuit',
    tagline: 'Cosy beds and honest bakes for dogs and small pets.',
    story:
      'Started with one oven and one very patient beagle. Burrow & Biscuit makes soft places to sleep and simple treats baked in small batches, with short ingredient lists you can read out loud.',
    accentColor: '#D97706',
  },
  {
    slug: 'moonbeam-mews',
    name: 'Moonbeam Mews',
    tagline: 'Playful, gentle goods for curious cats.',
    story:
      'Moonbeam Mews is for cats who nap in sunbeams and hunt at midnight. Quiet toys, soft hideaways and gentle food, designed around how cats actually behave.',
    accentColor: '#7C3AED',
  },
  {
    slug: 'scaleby',
    name: 'Scaleby',
    tagline: 'Habitat gear that gets the climate right.',
    story:
      'Scaleby builds terrariums and heat gear for keepers who care about getting temperature and humidity right. Clear instructions, sturdy glass and safe, steady warmth.',
    accentColor: '#16A34A',
  },
  {
    slug: 'pebble-and-pine',
    name: 'Pebble & Pine',
    tagline: 'Natural materials, lighter on the planet.',
    story:
      'Pebble & Pine uses recycled fibres, untreated wood and plant-based dyes. Fewer plastics, more products that are made to be washed, refilled and kept for years.',
    accentColor: '#15803D',
  },
  {
    slug: 'tidepool',
    name: 'Tidepool',
    tagline: 'Clear water, calm fish, simple care.',
    story:
      'Tidepool keeps aquariums easy: balanced foods, soft lighting and decor that gives fish somewhere to hide. Everything is made to be gentle on the water as well as the eye.',
    accentColor: '#0284C7',
  },
];
