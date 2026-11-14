# Plan 02 — API contract (every endpoint)

Base: `/api/v1`. JSON only. Responses: `{ data: ... }` on success, `{ error: { code, message,
details? } }` on failure. Pagination: `?page=1&limit=24` → `{ data: [...], meta: { page, limit,
total, totalPages } }`. All request/response shapes are Zod schemas in `packages/shared/src/schemas/`
and the API validates both input **and output** in dev/test (output validation catches drift).

Auth: cookie `sid` (httpOnly, Secure in prod, SameSite=Lax, path=/). Guest cart: cookie `cart_id`
(signed with `COOKIE_SECRET`). Mutating requests must send `Origin` matching `WEB_ORIGIN` (CSRF
check middleware) — simpler than tokens for a same-site SPA, and he can explain why it works
with SameSite=Lax.

Error codes (string enum in shared): `VALIDATION_ERROR` 400 · `UNAUTHENTICATED` 401 · `FORBIDDEN`
403 · `NOT_FOUND` 404 · `CONFLICT` 409 · `OUT_OF_STOCK` 409 · `CART_CHANGED` 409 · `TRIAL_LIMIT` 409 · `RATE_LIMITED`
429 · `INTERNAL` 500.

## Health
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| GET | `/health` | — | `{ status:'ok', db:'ok', version }`; DB ping with 1s timeout |

## Catalog (public, phase 3)
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/categories` | tree, active products count per category |
| GET | `/categories/:slug` | category + children |
| GET | `/products` | query: `category`, `q` (full-text), `sort` (`relevance`,`price_asc`,`price_desc`,`newest`,`name`), `minPrice`,`maxPrice` (cents), `attr.<key>=v1,v2` (jsonb filter, e.g. `attr.material=plush,rubber`), `inStock=true`, `page`,`limit`. Returns list cards: id, slug, name, primary image, price range (min/max of active variants), `inStock`, attributes subset. Also returns `facets` (attribute values + counts for the current category) so the PLP filter UI is data-driven. |
| GET | `/products/:slug` | full product: variants (with available stock as boolean + `lowStock`, never the raw number), images, attributes, optionKeys, category breadcrumb |

### Catalog notes (written in phase 3)
- **Search (`q`)** is Postgres full-text (`websearch_to_tsquery('english', q)`): it matches word forms
  through stemming (`ropes` finds `rope`) and understands `"quoted phrases"`, `-exclusion` and `or`.
  It does **not** correct typos (`rpoe` finds nothing). Input of 1-2 characters (or only stop words)
  falls back to a case-insensitive substring match on the name. `sort=relevance` is the default when
  `q` is present, `newest` otherwise.
- **Facets** come back beside `data` and `meta` as `facets: { attributes: { pet|material|brand|ageStage:
  [{value, count}] }, price: {min, max} | null }`, computed over category + `q` and ignoring the
  attribute, price and stock filters.
- **Caching:** catalog GETs send `Cache-Control: public, max-age=60, stale-while-revalidate=300` plus a
  weak `ETag` (`If-None-Match` gets a 304). An admin change can therefore take up to 60 s to show
  publicly. Errors are `no-store`.
- Unknown query parameters are ignored; an unknown `category` gives an empty list, not a 404.

## Auth & account (phase 6)
| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | — | `{email, password, firstName, lastName}`; 201 + sets `sid`; merges guest cart |
| POST | `/auth/login` | — | rate-limited 10/15min per IP+email; constant-time on unknown email (hash a dummy) |
| POST | `/auth/logout` | user | deletes session row, clears cookie |
| GET | `/auth/me` | user | `{ user }` or 401; web calls this on boot |
| PATCH | `/account` | user | names |
| POST | `/account/password` | user | `{currentPassword, newPassword}`; revokes other sessions |
| GET/POST | `/account/addresses` | user | |
| PATCH/DELETE | `/account/addresses/:id` | user | ownership check |
| GET | `/account/orders` | user | paginated, newest first |
| GET | `/account/orders/:number` | user | ownership check |

## Cart (phase 7) — works for guest and user
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/cart` | never creates a cart (a visitor with none gets an empty cart, no cookie); the first `POST /cart/items` creates the guest cart and sets `cart_id`; returns re-priced cart: items (variant, product name, image, unitPrice, qty, lineTotal, `available`, `maxQty`), subtotal, itemCount, `warnings[]` (price changed, out of stock, qty clamped) |
| POST | `/cart/items` | `{variantId, quantity}`; upsert (adds to existing qty); 409 `OUT_OF_STOCK` if exceeds available |
| PATCH | `/cart/items/:id` | `{quantity}`; 0 deletes |
| DELETE | `/cart/items/:id` | |
| DELETE | `/cart` | clear |
| POST | `/cart/merge` | internal, called by login/register; not exposed to web |

## Checkout & payment (phase 8)
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/checkout/shipping-methods` | query `country`; priced for current cart weight/subtotal |
| POST | `/checkout` | body `{ email, shippingAddress, billingAddress?, shippingMethodCode, notes? }` → validates cart (stock, prices), **creates order `pending_payment` + reserves stock + creates Stripe PaymentIntent (amount from server-side total, metadata.orderId)**, returns `{ orderNumber, clientSecret, totals }`. Idempotent per cart: re-calling with the same active cart updates the existing pending order/intent instead of creating another. |
| GET | `/checkout/orders/:number/status` | polled by the confirmation page until webhook flips status to `paid` (max 30 s, then shows "processing") |
| POST | `/webhooks/stripe` | raw body, signature verified with `STRIPE_WEBHOOK_SECRET`; handles `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `charge.refunded`; idempotent via `webhook_events.id` |

## Admin (phase 10) — role `admin`
| Method | Path | Notes |
| --- | --- | --- |
| GET | `/admin/stats` | orders today / revenue 30d / low stock count |
| GET | `/admin/products` | all statuses, paginated, `q` |
| POST | `/admin/products` | create product with variants + images in one transaction |
| GET/PATCH | `/admin/products/:id` | |
| POST | `/admin/products/:id/variants` · PATCH/DELETE `/admin/variants/:id` | |
| PATCH | `/admin/inventory/:variantId` | `{ quantity }` absolute set, with reason → logged |
| GET | `/admin/orders` | filter by status, `q` on number/email |
| GET | `/admin/orders/:number` | with payment + history |
| POST | `/admin/orders/:number/transition` | `{ to, note }`; validated by the state machine |
| GET | `/admin/customers` | list + order count |

## Non-functional
- Every response has `X-Request-Id`; logs are JSON lines with the same id.
- Rate limit: 300 req / 15 min per IP globally, stricter on auth.
- Helmet defaults; CORS allows only `WEB_ORIGIN` with credentials.
- Timeouts: DB query 5 s, Stripe 10 s, whole request 15 s.

## Expansion endpoints (phases 14–24)
Added by the expansion phases; shapes follow the same Zod-in-shared rule. New error code `TRIAL_LIMIT` 409 (14). Detail lives in each phase file. "Admin" = role `admin`, audit logged.

| Method | Path | Auth | Notes | Phase |
| --- | --- | --- | --- | --- |
| GET | `/brands`, `/brands/:slug`; `/collections`, `/collections/:slug`; `/tags` | — | collection outside its window = 404 | 14 |
| GET | `/products` | — | new filters `brand`, `tag`, `collection`, `badge`; sort `unit_price_asc`; items add `badges`, `unitPrice`, `swatches`; facets add price range and chips (15) | 14, 15 |
| CRUD | `/admin/brands`, `/admin/collections`; PUT `/admin/collections/:id/products`, `/admin/products/:id/tags` | admin | | 14 |
| GET/POST | `/account/pets`; PATCH/DELETE `/account/pets/:id`; POST `/account/pets/merge` | user | guest pets merged on login | 15 |
| GET | `/search/suggest?q=`, `/navigation` | — | suggest rate limited 60/min/IP | 15 |
| CRUD | `/admin/menu-promos` | admin | | 15 |
| GET | `/products/:slug` | — | extended: specs, constituents, faqs, feedingTable, sizeGuide, bundles, relations, `safetyNotices` (20) | 16, 20 |
| GET | `/products/by-ids`, `/products/:slug/recommendations` | — | | 16 |
| POST | `/cart/items/bulk` | guest/user | all-or-nothing | 16 |
| CRUD | `/admin/size-guides`, `/admin/bundles`; PUT `/admin/products/:id/content` | admin | | 16 |
| GET/POST | `/products/:slug/reviews`; POST `/reviews/:id/helpful`; GET `/gallery` | public / auth | multipart photos on POST | 17 |
| GET/POST/DELETE | `/admin/reviews` (+ `POST /:id/approve\|reject`), `/admin/gallery` | admin | | 17 |
| POST/DELETE | `/cart/code` | cart identity | apply or remove code; `GET /cart` now returns the `priceCart` output | 18 |
| GET | `/cart/switch-preview?store=` | cart identity (read, never creates a cart) | `{dropped:[{variantId,productName,variantName}]}`: lines with no price in that store's currency; read-only | polish |
| GET | `/promotions/banner`, `/promotions/rules` | — | banner includes `serverNow` | 18 |
| CRUD | `/admin/discount-codes`, `/admin/flash-sales`, `/admin/bulk-tiers`, `/admin/gift-rule` | admin | | 18 |
| POST | `/internal/jobs/run` | secret header | cron entry point | 19 |
| GET | `/me/points`, `/me/referral`, `/me/buy-again`; POST `/me/points/donate`, `/me/rewards/:id/redeem`, `/me/orders/:id/reorder` | user | | 19 |
| GET | `/rewards`, `/charity/total`, `/wishlist/shared/:token` | — | | 19 |
| POST | `/newsletter/subscribe\|confirm\|unsubscribe`, `/stock-alerts`; DELETE `/stock-alerts/:token` | — | double opt-in, token | 19 |
| GET/POST/DELETE | `/wishlist/items`; POST `/wishlist/share` | cart-style | | 19 |
| CRUD | `/admin/rewards`; POST `/admin/points/adjust` | admin | | 19 |
| GET | `/home`, `/guides`, `/guides/:slug`, `/guide-categories`, `/help`, `/testimonials`, `/safety-notices/active` | — | `/help?topic=&q=` is the contract for phase 24's tool | 20 |
| POST | `/orders/track`, `/withdrawals` | — | rate limited; identical 404 for wrong email and unknown order | 20 |
| CRUD | `/admin/guides`, `/admin/help-articles`, `/admin/testimonials`, `/admin/safety-notices` (+ `POST /:id/notify`), `/admin/withdrawals`; PUT `/admin/home-content/:key` | admin | | 20 |
| GET | `/store-views` | — | store view registry (languages/currencies); not physical stores | 21 |
| any | catalogue reads, `PATCH /cart`, `POST /checkout` | — | optional `X-Store-View` header, `Vary` on it | 21 |
| GET/PUT | `/admin/translations/:entity/:id[/:locale]`, `/admin/translations/missing`; PUT `/admin/variants/:id/prices` | admin | | 21 |
| POST/GET | `/orders/:id/returns` | owner | 30-day window | 22 |
| GET/POST | `/admin/returns`, `/admin/returns/:id/approve\|reject\|receive\|refund`, `/admin/vet-approvals` (+ `POST /:orderId/approve\|reject`) | admin | | 22 |
| POST | `/checkout` | — | accepts `vetDetails` when the cart needs it (22) and `pointsToRedeem`, `roundUp` (19) | 19, 22 |
| GET | `/admin/analytics`, `/admin/analytics/export.csv` | admin | integer cents, CSV injection escaped | 22 |
| GET | `/stores`, `/stores/:slug`, `/products/:slug/store-availability`, `/grooming/services`, `/grooming/availability` | — | physical stores; `/stores?near=` | 23 |
| POST/GET | `/grooming/bookings`; POST `/grooming/bookings/:id/cancel` | user | | 23 |
| CRUD | `/admin/stores` (+ hours, closures), `/admin/grooming-services`; PUT `/admin/stores/:id/stock`; GET/POST `/admin/grooming/bookings`; POST `/admin/orders/:id/pickup-ready\|collected` | admin | | 23 |

Phase 24 adds no endpoints (browser-side tools over the existing client).
