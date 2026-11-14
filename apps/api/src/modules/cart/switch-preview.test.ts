import type { Cart, StoreSwitchPreview } from '@store/shared';
import { describe, expect, it } from 'vitest';

import { db } from '../../db/client.ts';
import { carts } from '../../db/schema/index.ts';
import { makeTestApp } from '../../test/app.ts';
import { createProduct } from '../../test/factories.ts';
import { bodyOf } from '../../test/http.ts';
import { makeShopper } from '../../test/shopper.ts';

const app = makeTestApp();
const preview = (res: Parameters<typeof bodyOf>[0]) =>
  bodyOf<{ data: StoreSwitchPreview }>(res).data;

describe('GET /cart/switch-preview', () => {
  it('names the lines with no price in the target store currency, and changes nothing', async () => {
    const both = await createProduct({
      name: 'Rope Tug',
      variants: [{ priceCents: 1500, gbpCents: 1300 }],
    });
    const euOnly = await createProduct({ name: 'Euro Ball', variants: [{ priceCents: 900 }] });
    const shopper = makeShopper(app, undefined, 'eu-en');
    await shopper.addToCart(both.variants[0]!.id, 1);
    await shopper.addToCart(euOnly.variants[0]!.id, 2);

    const res = await shopper.call('get', '/cart/switch-preview?store=uk-en');
    expect(res.status).toBe(200);
    expect(preview(res).dropped).toEqual([
      expect.objectContaining({ variantId: euOnly.variants[0]!.id, productName: 'Euro Ball' }),
    ]);
    // Same currency: nothing drops.
    expect(preview(await shopper.call('get', '/cart/switch-preview?store=de-de')).dropped).toEqual(
      [],
    );
    // Asking did not switch or repair the cart.
    const cart = bodyOf<{ data: Cart }>(await shopper.call('get', '/cart')).data;
    expect(cart.currency).toBe('EUR');
    expect(cart.items).toHaveLength(2);
    expect((await db.select().from(carts))[0]?.currency).toBe('EUR');
  });

  it('answers an empty list without creating a cart, and refuses an unknown store', async () => {
    const shopper = makeShopper(app, undefined, 'eu-en');
    const res = await shopper.call('get', '/cart/switch-preview?store=uk-en');
    expect(preview(res).dropped).toEqual([]);
    expect(await db.select().from(carts)).toHaveLength(0);
    expect((await shopper.call('get', '/cart/switch-preview?store=xx-yy')).status).toBe(400);
  });
});
