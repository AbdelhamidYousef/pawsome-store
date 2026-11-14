import type { en } from './en';
import { account } from './fr/account';
import { auth } from './fr/auth';
import { cart } from './fr/cart';
import { catalog } from './fr/catalog';
import { checkout } from './fr/checkout';
import { content } from './fr/content';
import { demo } from './fr/demo';
import { loyalty } from './fr/loyalty';
import { pdp } from './fr/pdp';
import { pets } from './fr/pets';
import { returns } from './fr/returns';
import { reviews } from './fr/reviews';
import { search } from './fr/search';
import { shell } from './fr/shell';
import type { Entry } from './types';

export const fr: Record<keyof typeof en, Entry> = {
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
