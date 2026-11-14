import { and, eq } from 'drizzle-orm';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

import { db } from '../../db/client.ts';
import { cartItems, carts, inventory, productVariants } from '../../db/schema/index.ts';
import { makeTestApp, TEST_ORIGIN } from '../../test/app.ts';
import { createCart, createProduct, createUser } from '../../test/factories.ts';
import { bodyOf, cookieValue, setCookieLine } from '../../test/http.ts';
import { hash } from '../auth/password.ts';

import { mergeGuestCart } from './service.ts';

const PASSWORD = 'correct horse battery staple';
const app = makeTestApp();

// One real argon2 hash for every user in this file: hashing per test would dominate the run time.
let passwordHash = '';
beforeAll(async () => {
  passwordHash = await hash(PASSWORD);
});

interface CartBody {
  data: { items: { variantId: string; quantity: number }[]; itemCount: number };
}
const qtyOf = (res: request.Response, variantId: string) =>
  bodyOf<CartBody>(res).data.items.find((i) => i.variantId === variantId)?.quantity;

// A guest browser that has put `lines` in its cart, returning the cookie it holds.
async function guestWith(lines: { variantId: string; quantity: number }[]) {
  // The first add creates the guest cart and hands out the cookie (a read no longer does).
  let cookie = '';
  for (const line of lines) {
    const req = request(app).post('/api/v1/cart/items').set('Origin', TEST_ORIGIN);
    const res = await (cookie ? req.set('Cookie', cookie) : req).send(line);
    expect(res.status).toBe(200);
    cookie ||= `cart_id=${cookieValue(res, 'cart_id') ?? ''}`;
  }
  return cookie;
}

async function userWith(lines: { variantId: string; quantity: number }[]) {
  const user = await createUser({ passwordHash });
  if (lines.length) await createCart({ userId: user.id, items: lines });
  return user;
}

const login = (email: string, cookie?: string, password = PASSWORD) => {
  const req = request(app)
    .post('/api/v1/auth/login')
    .set('Origin', TEST_ORIGIN)
    .send({ email, password });
  return cookie ? req.set('Cookie', cookie) : req;
};

// The cart as the freshly signed-in browser sees it (session cookie from the login response).
async function cartAfter(res: request.Response) {
  return request(app)
    .get('/api/v1/cart')
    .set('Cookie', `sid=${cookieValue(res, 'sid') ?? ''}`);
}

describe('merge on login', () => {
  it('sums quantities: guest 2 + account 1 = 3', async () => {
    const { variants } = await createProduct({ variants: [{ stock: 20 }] });
    const v = variants[0]!.id;
    const user = await userWith([{ variantId: v, quantity: 1 }]);
    const cookie = await guestWith([{ variantId: v, quantity: 2 }]);

    const res = await login(user.email, cookie);
    expect(res.status).toBe(200);
    expect(qtyOf(await cartAfter(res), v)).toBe(3);
  });

  it('limits the sum to available stock: stock 4, account 3 + guest 2 = 4', async () => {
    const { variants } = await createProduct({ variants: [{ stock: 4 }] });
    const v = variants[0]!.id;
    const user = await userWith([{ variantId: v, quantity: 3 }]);
    const cookie = await guestWith([{ variantId: v, quantity: 2 }]);

    const res = await login(user.email, cookie);
    const after = await cartAfter(res);
    expect(qtyOf(after, v)).toBe(4);
    expect(bodyOf<{ data: { warnings: unknown[] } }>(after).data.warnings).toEqual([]);
  });

  it('limits to 99 per line', async () => {
    const { variants } = await createProduct({ variants: [{ stock: 500 }] });
    const v = variants[0]!.id;
    const user = await userWith([{ variantId: v, quantity: 90 }]);
    const cookie = await guestWith([{ variantId: v, quantity: 50 }]);
    expect(qtyOf(await cartAfter(await login(user.email, cookie)), v)).toBe(99);
  });

  it('never lowers what the account already had, even if stock fell below it', async () => {
    const { variants } = await createProduct({ variants: [{ stock: 10 }] });
    const v = variants[0]!.id;
    const user = await userWith([{ variantId: v, quantity: 6 }]);
    const cookie = await guestWith([{ variantId: v, quantity: 1 }]);
    await db.update(inventory).set({ quantity: 3 }).where(eq(inventory.variantId, v));

    const res = await login(user.email, cookie);
    // The account's line, not the merged guest cart's (which keeps its rows).
    const [row] = await db
      .select({ quantity: cartItems.quantity })
      .from(cartItems)
      .innerJoin(carts, eq(carts.id, cartItems.cartId))
      .where(and(eq(cartItems.variantId, v), eq(carts.userId, user.id)));
    // The merge itself leaves 6 (rule 3)...
    expect(row?.quantity).toBe(6);
    // ...and the next read applies the ordinary stock clamp, with its warning.
    const after = await cartAfter(res);
    expect(qtyOf(after, v)).toBe(3);
    expect(bodyOf<{ data: { warnings: { code: string }[] } }>(after).data.warnings[0]?.code).toBe(
      'QTY_REDUCED',
    );
  });

  it('adds guest-only lines and leaves account-only lines alone', async () => {
    const a = await createProduct();
    const b = await createProduct();
    const user = await userWith([{ variantId: a.variants[0]!.id, quantity: 2 }]);
    const cookie = await guestWith([{ variantId: b.variants[0]!.id, quantity: 3 }]);

    const after = await cartAfter(await login(user.email, cookie));
    expect(qtyOf(after, a.variants[0]!.id)).toBe(2);
    expect(qtyOf(after, b.variants[0]!.id)).toBe(3);
  });

  it('drops guest lines that cannot be bought: sold out or archived', async () => {
    const soldOut = await createProduct({ variants: [{ stock: 5 }] });
    const archived = await createProduct();
    const fine = await createProduct();
    const user = await userWith([]);
    const cookie = await guestWith([
      { variantId: soldOut.variants[0]!.id, quantity: 1 },
      { variantId: archived.variants[0]!.id, quantity: 1 },
      { variantId: fine.variants[0]!.id, quantity: 1 },
    ]);
    await db
      .update(inventory)
      .set({ quantity: 0 })
      .where(eq(inventory.variantId, soldOut.variants[0]!.id));
    await db
      .update(productVariants)
      .set({ status: 'archived' })
      .where(eq(productVariants.id, archived.variants[0]!.id));

    const after = await cartAfter(await login(user.email, cookie));
    expect(bodyOf<CartBody>(after).data.items.map((i) => i.variantId)).toEqual([
      fine.variants[0]!.id,
    ]);
  });

  it('creates the account cart when the user had none', async () => {
    const { variants } = await createProduct();
    const user = await userWith([]);
    const cookie = await guestWith([{ variantId: variants[0]!.id, quantity: 2 }]);
    const after = await cartAfter(await login(user.email, cookie));
    expect(qtyOf(after, variants[0]!.id)).toBe(2);
    const mine = await db.select().from(carts).where(eq(carts.userId, user.id));
    expect(mine.filter((c) => c.status === 'active')).toHaveLength(1);
  });

  it('marks the guest cart merged and clears the cart_id cookie', async () => {
    const { variants } = await createProduct();
    const user = await userWith([]);
    const cookie = await guestWith([{ variantId: variants[0]!.id, quantity: 1 }]);

    const res = await login(user.email, cookie);
    expect(setCookieLine(res, 'cart_id')).toMatch(/^cart_id=;.*Expires=Thu, 01 Jan 1970/);
    const guestCarts = await db.select().from(carts).where(eq(carts.status, 'merged'));
    expect(guestCarts).toHaveLength(1);
    expect(guestCarts[0]?.userId).toBeNull();
  });

  it('cannot be replayed: the old guest cookie reaches nothing after the merge', async () => {
    const { variants } = await createProduct();
    const user = await userWith([]);
    const cookie = await guestWith([{ variantId: variants[0]!.id, quantity: 2 }]);
    await login(user.email, cookie);

    const replay = await request(app).get('/api/v1/cart').set('Cookie', cookie);
    expect(bodyOf<CartBody>(replay).data.itemCount).toBe(0);
    // And a second login with the stale cookie adds nothing.
    const again = await login(user.email, cookie);
    expect(qtyOf(await cartAfter(again), variants[0]!.id)).toBe(2);
  });

  it('merges on registration too', async () => {
    const { variants } = await createProduct();
    const cookie = await guestWith([{ variantId: variants[0]!.id, quantity: 2 }]);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie)
      .send({ email: 'new@pawsome.test', password: PASSWORD, firstName: 'N', lastName: 'U' });
    expect(res.status).toBe(201);
    expect(qtyOf(await cartAfter(res), variants[0]!.id)).toBe(2);
    expect(setCookieLine(res, 'cart_id')).toBeDefined();
  });

  it('does nothing, and keeps the cookie, when the login fails', async () => {
    const { variants } = await createProduct();
    const user = await userWith([]);
    const cookie = await guestWith([{ variantId: variants[0]!.id, quantity: 1 }]);

    const res = await login(user.email, cookie, 'wrong password');
    expect(res.status).toBe(401);
    expect(setCookieLine(res, 'cart_id')).toBeUndefined();
    expect(await db.select().from(carts).where(eq(carts.status, 'merged'))).toHaveLength(0);
  });

  it('logging in without a guest cookie leaves the account cart as it was', async () => {
    const { variants } = await createProduct();
    const user = await userWith([{ variantId: variants[0]!.id, quantity: 2 }]);
    const res = await login(user.email);
    expect(qtyOf(await cartAfter(res), variants[0]!.id)).toBe(2);
    expect(setCookieLine(res, 'cart_id')).toBeUndefined();
  });

  it("does not pull another user's cart in through a cookie that names it", async () => {
    const { variants } = await createProduct();
    const victim = await userWith([{ variantId: variants[0]!.id, quantity: 5 }]);
    const [victimCart] = await db.select().from(carts).where(eq(carts.userId, victim.id));
    const attacker = await userWith([]);
    // The attacker cannot sign a cookie; the service-level call is the strongest form of the test:
    // even handed the victim's cart id directly, the merge refuses a cart that has an owner.
    const result = await mergeGuestCart(victimCart!.id, attacker.id);
    expect(result).toEqual({ merged: 0, clamped: 0, dropped: 0 });
    expect(
      await db.select().from(cartItems).where(eq(cartItems.cartId, victimCart!.id)),
    ).toHaveLength(1);
    const [stillActive] = await db.select().from(carts).where(eq(carts.id, victimCart!.id));
    expect(stillActive?.status).toBe('active');
  });

  it('does not merge an expired guest cart', async () => {
    const { variants } = await createProduct();
    const user = await userWith([]);
    const { cart } = await createCart({ items: [{ variantId: variants[0]!.id, quantity: 1 }] });
    await db
      .update(carts)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(carts.id, cart.id));
    expect(await mergeGuestCart(cart.id, user.id)).toEqual({ merged: 0, clamped: 0, dropped: 0 });
  });

  it('counts a double login from two tabs once (guest lock, second sees merged)', async () => {
    const { variants } = await createProduct({ variants: [{ stock: 50 }] });
    const v = variants[0]!.id;
    const user = await userWith([{ variantId: v, quantity: 1 }]);
    const cookie = await guestWith([{ variantId: v, quantity: 2 }]);

    const [a, b] = await Promise.all([login(user.email, cookie), login(user.email, cookie)]);
    expect([a.status, b.status]).toEqual([200, 200]);
    const [row] = await db
      .select()
      .from(cartItems)
      .where(
        eq(
          cartItems.cartId,
          (await db.select().from(carts).where(eq(carts.userId, user.id)))[0]!.id,
        ),
      );
    expect(row?.quantity).toBe(3);
  });

  it('reports what it did: merged, clamped and dropped counts', async () => {
    const plenty = await createProduct({ variants: [{ stock: 50 }] });
    const tight = await createProduct({ variants: [{ stock: 2 }] });
    const gone = await createProduct({ variants: [{ stock: 0 }] });
    const user = await userWith([]);
    const { cart } = await createCart({
      items: [
        { variantId: plenty.variants[0]!.id, quantity: 1 },
        { variantId: tight.variants[0]!.id, quantity: 5 },
        { variantId: gone.variants[0]!.id, quantity: 1 },
      ],
    });
    expect(await mergeGuestCart(cart.id, user.id)).toEqual({ merged: 2, clamped: 1, dropped: 1 });
  });
});
