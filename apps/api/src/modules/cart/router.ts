import {
  AddCartItemSchema,
  ApplyCodeSchema,
  BulkAddCartItemsSchema,
  CartItemParamsSchema,
  CartResponseSchema,
  StoreSwitchPreviewQuerySchema,
  StoreSwitchPreviewResponseSchema,
  UpdateCartItemSchema,
} from '@store/shared';
import { Router as ExpressRouter, type Router } from 'express';

import { respond, valid, validate } from '../../lib/validate.ts';
import { cartIdOf, withCart, withExistingCart } from '../../middleware/cart.ts';

import * as service from './service.ts';

export const cartRouter: Router = ExpressRouter();

// Every route below works on the caller's own cart, found from their session or signed cookie.
// There is deliberately no cart id in any path or body: a client cannot name a cart, so it cannot
// name somebody else's. (`POST /cart/merge` from the contract is internal: login/register call
// the service directly and it is not exposed over HTTP.)
// Writes create the guest cart on first need (`withCart`); a read never does (`withExistingCart`),
// because the header asks for the cart on every first page load and bots would fill the table.
cartRouter.get('/cart', withExistingCart, async (req, res) => {
  respond(res, CartResponseSchema, {
    data: req.cartId ? await service.getCart(req.cartId) : service.emptyCart(),
  });
});
// Before the shopper switches store: which lines have no price in the new store's currency.
// A read like GET /cart, so it never creates a cart.
const switchPreview = { query: StoreSwitchPreviewQuerySchema };
cartRouter.get(
  '/cart/switch-preview',
  withExistingCart,
  validate(switchPreview),
  async (req, res) => {
    const { query } = valid(req, switchPreview);
    respond(res, StoreSwitchPreviewResponseSchema, {
      data: await service.previewStoreSwitch(req.cartId, query.store),
    });
  },
);
cartRouter.use('/cart', withCart);

const add = { body: AddCartItemSchema };
cartRouter.post('/cart/items', validate(add), async (req, res) => {
  const { body } = valid(req, add);
  respond(res, CartResponseSchema, {
    data: await service.addItem(cartIdOf(req), body.variantId, body.quantity),
  });
});

// Several lines at once (frequently bought together): all of them or none.
const bulk = { body: BulkAddCartItemsSchema };
cartRouter.post('/cart/items/bulk', validate(bulk), async (req, res) => {
  const { body } = valid(req, bulk);
  respond(res, CartResponseSchema, { data: await service.addItems(cartIdOf(req), body.items) });
});

const update = { params: CartItemParamsSchema, body: UpdateCartItemSchema };
cartRouter.patch('/cart/items/:id', validate(update), async (req, res) => {
  const { params, body } = valid(req, update);
  respond(res, CartResponseSchema, {
    data: await service.updateItem(cartIdOf(req), params.id, body.quantity),
  });
});

const byId = { params: CartItemParamsSchema };
cartRouter.delete('/cart/items/:id', validate(byId), async (req, res) => {
  const { params } = valid(req, byId);
  respond(res, CartResponseSchema, { data: await service.removeItem(cartIdOf(req), params.id) });
});

const applyCode = { body: ApplyCodeSchema };
cartRouter.post('/cart/code', validate(applyCode), async (req, res) => {
  const { body } = valid(req, applyCode);
  respond(res, CartResponseSchema, { data: await service.applyCode(cartIdOf(req), body.code) });
});

cartRouter.delete('/cart/code', async (req, res) => {
  respond(res, CartResponseSchema, { data: await service.removeCode(cartIdOf(req)) });
});

cartRouter.delete('/cart', async (req, res) => {
  respond(res, CartResponseSchema, { data: await service.clear(cartIdOf(req)) });
});
