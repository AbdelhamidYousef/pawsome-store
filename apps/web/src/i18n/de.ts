import { account } from './de/account';
import { auth } from './de/auth';
import { cart } from './de/cart';
import { catalog } from './de/catalog';
import { checkout } from './de/checkout';
import { content } from './de/content';
import { demo } from './de/demo';
import { loyalty } from './de/loyalty';
import { pdp } from './de/pdp';
import { pets } from './de/pets';
import { returns } from './de/returns';
import { reviews } from './de/reviews';
import { search } from './de/search';
import { shell } from './de/shell';
import type { en } from './en';
import type { Entry } from './types';

export const de: Record<keyof typeof en, Entry> = {
  ...shell,
  ...search,
  ...catalog,
  ...pdp,
  ...reviews,
  ...cart,
  ...checkout,
  ...account,
  ...auth,
  ...returns,
  ...loyalty,
  ...pets,
  ...content,
  ...demo,
};
