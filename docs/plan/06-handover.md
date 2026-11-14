# Plan 06 — Handover after the unattended build (2026-10-31)

Written by the build sessions for the owner and for the next session.

## Final state (2026-11-14) — start here

- **Everything in the plan is built, merged on `main`, pushed and live**: phases 0–13 and the
  expansion phases 14–22 and 24 (23 was cut). Live demo <https://pawsome-store-tau.vercel.app>
  (stores `/eu-en/`, `/uk-en/` in GBP, `/de-de/`, `/fr-fr/`), repo
  <https://github.com/AbdelhamidYousef/pawsome-store>. CI green on `main` (typecheck/lint/format,
  unit + integration, e2e, gitleaks, audit). No worktree or lane is open; `feat/*` branches are merged.
- Counts on the final tree: shared 338, web 969, API 1,462 + 2 skipped (live Stripe), e2e 79 + 1
  skipped (real card).
- Deploy: one Vercel project (web static + Express as a function on the same origin), Neon
  Frankfurt, Stripe sandbox (test mode), hourly jobs via GitHub Actions. See `docs/DEPLOYMENT.md`.
  A schema change must be migrated on Neon (direct URL, from a shell) **before** the push that needs
  it; the seed is an upsert and safe to re-run on Neon.
- Leftovers and known issues (none blocks the demo):
  1. ~~Checkout race across tabs while a payment is confirming~~ fixed 2026-11-14 (`fix/leftovers`): Stripe is asked before re-pricing.
  2. ~~Admin edits EUR promotion/shipping amounts only~~ fixed: code/tier/gift forms edit GBP too. There is still no admin screen for shipping-method rates (EUR or GBP).
  3. ~~No confirm dialog when switching store with a full cart~~ fixed: the switcher names the lines
     that would drop (`GET /cart/switch-preview`); no e2e step for the dialog yet.
  4. ~~hreflang alternates carry the English slug~~ fixed: detail endpoints return `slugs`, `<Seo>` takes per-language paths (guides still set no canonical, so no hreflang).
  5. ~~Product names inside emails are English snapshots~~ fixed for order and return mails (translated at send time); stock-alert and review mails still English.
  6. ~~A free gift without a GBP price is still given in the UK store~~ fixed: no gift in a currency the gift has no price in.
  7. German/French text was written by the build agent: a native read is worth it (a French block
     had leaked into the German seed and was fixed on 2026-11-14; a test now guards that case).
  8. Emails are skipped on the demo until a Resend key is added; review photo upload is off there.
  9. README statement-coverage figures are from phase 11.
  10. Checkout race, residual window: between Stripe's status answer in the pre-check and phase 1's
      commit there are a few milliseconds in which another tab could confirm; phase 2's re-check and
      the webhook's amount check cover it, but it is not closed.

## Where things stand

- `main` holds one local commit per plan step (phases 0–11, 12.1, 13.1–13.4), conventional commits.
- Gates on `main`: typecheck, lint, format all clean; unit + integration 1,062 passed, 2 skipped
  (live Stripe); e2e 33 passed, 1 skipped (real card 4242). Lighthouse accessibility 100 on home, PLP,
  PDP, cart, checkout. `gitleaks` over the full history: no leaks.
- Product images: 63 AI-generated with Gemini (personal Google accounts), prompts in
  `apps/web/public/products/CREDITS.md`.

## Read in this order

1. `README.md` — the case study as a stranger will see it.
2. `docs/plan/05-build-journal.md` — per step: what was built, why, and the "Learn / explain"
   answers; a 3-question quiz per phase (no answers: that's your check).
3. `docs/plan/04-decisions-log.md` — every line tagged `REVIEW` is a decision the build sessions made
   on your behalf. Change any you disagree with.
4. `docs/DEPLOYMENT.md` — the click-through for going live.

## Waiting on you

1. ~~Stripe, GitHub, deploy~~ **Done 2026-11-14.** Live at <https://pawsome-store-tau.vercel.app>
   (web + API on Vercel, Neon Frankfurt, Stripe sandbox in test mode, hourly jobs from GitHub
   Actions). A real test-card payment went through and its webhook marked the order paid. Repo:
   <https://github.com/AbdelhamidYousef/pawsome-store>. Optional: a Resend key for real emails;
   branch protection on `main`; triage the Dependabot PRs.
4. **13.5 decision** → publish admin demo credentials with a nightly data reset? (plan default: yes).
5. **13.6** → interview notes, written by you with a session's help; then prune `docs/plan/`
   (the README links into it — update those links when pruning).
6. **13.7** → tag `v1.0.0` on your go.
7. **Licence holder** in `LICENSE` is your GitHub handle; change it if you want your name.
8. **Screen reader** pass (NVDA/VoiceOver) on PDP and checkout — couldn't be done here.

## Polish pass QA follow-ups (2026-11-14)

The polish lanes and the QA fix round are on `polish/integration` (not pushed). Still open:

1. **Product photos: 85 of 125 seeded products have none** (image generation waits on you). They
   show the per-pet brand tile (`apps/web/public/products/placeholders/<pet>.svg`, redrawn in this
   pass so it reads as deliberate). Generate `apps/web/public/products/<category>/<slug>-1.webp`
   (and `-2` for a detail shot), then re-run the seed: it swaps the rows over by itself. By pet:
   - **dog** (15): pumpkin-squeak-ball, chew-knot-bone, memory-foam-mat, cooling-gel-mat, travel-blanket-roll, puppy-snuggle-nest, dental-chew-sticks, light-lean-bites, sensitive-lamb-biscuits, collapsible-travel-bowl, raised-double-diner, ceramic-paw-bowl, comfort-harness, hands-free-leash, compostable-waste-bags
   - **cat** (15): crinkle-play-tunnel, spooky-bat-teaser, cuddle-cup-bed, cardboard-scratch-lounger, sunny-shelf-hammock, dental-crunch-bites, calm-chews, omega-coat-paste, slanted-raised-bowl, whisper-drinking-fountain, snuffle-feeding-mat, bubble-window-backpack, cat-harness-and-lead, portable-litter-tray, carrier-calming-blanket
   - **bird** (13): shredding-palm-toy, ladder-and-bell-set, foraging-wheel, fruit-and-nut-mix, daily-pellets, sprouting-seed-mix, starter-flight-cage, night-cage-cover, travel-perch-stand, seed-catcher-tray, drip-water-cup, treat-skewer-holder, twin-ceramic-dish
   - **fish** (3): freeze-dried-bloodworms, algae-wafers, betta-micro-pellets
   - **small** (14): willow-tunnel, seagrass-ball-trio, chew-stick-hanger, activity-cube, guinea-pig-pellets, rabbit-herb-treats, hamster-seed-mix, starter-wooden-hutch, nesting-fleece-liners, corner-hideaway, travel-carry-box, hanging-hay-rack, weighted-ceramic-feeder, sipper-bottle-mini
   - **reptile** (25): glass-terrarium-60, pop-up-mesh-cage, nano-glass-box, tortoise-table, vertical-tree-terrarium, ceramic-heat-lamp, uvb-tube-light, under-tank-heat-mat, digital-thermo-hygrometer, basking-lamp-dome, shallow-water-dish, feeding-tongs, mealworm-dispenser, gecko-gel-cup-set, misting-bottle, half-log-hide, cork-bark-tube, vine-climbing-set, faux-succulent-pack, slate-basking-rock, gecko-meal-pellets, tortoise-greens-mix, calcium-dust, dried-mealworm-treat, dragon-salad-crumble
2. **Brand logos and guide covers** are not generated either (`/brands/<slug>.webp`,
   `/guides/<slug>.webp`); the coloured fallbacks are used.
3. **de/fr content with no translation path** (English on those stores): help answers, the legal and
   about pages (Markdown), PDP specs and FAQs, gallery captions, the charity description. Hero
   slides, the promo tile, mega-menu promos and testimonials now have one (`modules/i18n/copy.ts`,
   keyed by the seeded English text, plus a uk-en table for £ amounts): text an admin types later
   stays as typed, in every store. A real fix is per-language columns or translation tables for
   `home_content`, help and legal.
4. **Live data**: `home_content` and testimonials are insert-or-nothing in the seed, so the live
   store keeps its old (longer) hero text until those rows are deleted on Neon and re-seeded, or
   edited in the admin. The translations only match the current seed text.
5. Admin analytics counts days in `Europe/Riga` (`STORE_TIME_ZONE` in shared) while the shop's
   dispatch zone is `Europe/Amsterdam`; align them (tests pin the Riga boundary).
6. Low findings left from `work/polish/qa-findings.md`: page headers mix centred (help) and left
   (guides, brands, account) (7); PDP text column leaves the right half empty (10); no sticky
   add-to-cart on mobile PDP (11); footer link rhythm and no payment/social icons (19); "Low stock"
   badge can touch the wishlist heart on 390 px cards (20); mobile menu lacks account/guides/store
   links (21); mega-menu 8 px misalignment and no scrim (22); account sidebar buttons look heavy (23).
7. Stock-alert and review emails still carry English product names (from fix 5).

## Known limits (also in the README)

- Real Stripe Payment Element and real webhooks never exercised (no keys).
- Home page still shifts layout (~0.22 CLS) while its first request loads — left for the CWV project.
- Gemini output is 1024 px, upscaled to the 1200 px size the seed declares.
- A leftover `tsx watch` dev API from a builder may still hold port 3000; the build session was not
  allowed to kill it. Stop it before `pnpm dev` if the port is busy (a reboot also clears it).

## Expansion build status (phases 14–24, as of 2026-11-07)

Merged into `main` (all gates green on 2026-11-07: shared 180, web 607, API 951 + 2 skipped, e2e 49 + 1 skipped):

| Phase | State |
|---|---|
| 14 Catalogue depth | done, merged |
| 20 Content & trust | done, merged (20.7 homepage: home CLS ~0.22 → ~0.03; 20.9 e2e) |
| 18 Promotions | done, merged (engine, codes, tiers, gift, flash sales + Omnibus, member prices, admin, cart UI, sale banner, e2e) |
| 23 grooming services | cut (decisions log, 2026-11-07) |
| 15 Discovery | done, merged 2026-11-08 (pet profiles, price slider + chips, search autocomplete, mega-menu, gift finder; e2e 56 + 1 skipped). Menu promo tiles use catalogue photos until there is art |
| 19 Loyalty | done, merged 2026-11-14 (job runner + cron entry, points earn/redeem/reversal, rewards, charity round-up, referrals, newsletter double opt-in, back-in-stock alerts, pet birthday + life-stage mails, wishlist + share link, buy again; review fixes; API 1,254 + 2 skipped, e2e 66 + 1 skipped). `.github/workflows/jobs.yml` needs repo variable `API_URL` + secret `JOBS_SECRET` (owner) |
| 16 PDP depth | done, merged 2026-11-14 (structured content, tabs, feeding calculator, size guide, recommendations, delivery estimate, kits with component snapshot on orders; review fixes for kit stock; API 1,063+ pass, e2e 60 + 1 skipped). Kits reuse a component photo until there is art |
| 17 Reviews | done, merged 2026-11-14 (reviews with verified buyer, photo upload to local disk via multer + sharp, helpful votes, ratings on cards/PDP, moderation, shoppable gallery; security-review fixes; API 1,140+ pass, e2e 62 + 1 skipped). Set `UPLOADS_ENABLED=false` on the free-tier demo (ephemeral disk). `sweepOrphanUploads` waits for the phase 19 job runner |
| 22 Post-purchase | done, merged 2026-11-14 (partial refunds, returns with refund + restock incl. kit snapshot, vet approval hold incl. kits, analytics dashboard + CSV; integrated with loyalty: proportional points reversal keyed on refundId, round-up kept on returns; shared 329, web 932, API 1,405 + 2 skipped, e2e 71 + 1 skipped). Demo login `casey@pawsome.test` has sample returns |
| 24 Agent-ready | done, merged 2026-11-14 (tool registry: search, product, cart read/update, policies/FAQ; WebMCP adapter feature-detected on `document.modelContext`, falls back to `navigator.modelContext`; 30 calls/min client limit; /developers page; web 895, API 1,254 + 2 skipped, e2e 68 + 1 skipped). Manual check in Chrome 146+ with `chrome://flags/#enable-webmcp-testing` left to the owner |
| 21 Stores & languages | done, merged and live 2026-11-14 (review fix: store-switch intent key; German seed fix): 21.1 registry, 21.2 URL prefix, 21.3 switcher + hreflang, 21.4 string extraction, 21.5 de/fr, 21.6 catalogue translations, 21.7 seed + admin, 21.8 per-currency prices (migration 0035), 21.9 cart/orders/promotions/shipping in currency (0036), 21.10 emails in the order locale (0037), 21.11 e2e + quiz; plus seed refund fix and agent-spec console filter. Final counts, one uninterrupted run each: shared 338, web 969, API 1,459 + 2 skipped (117 files), e2e 79 + 1 skipped. Merge notes below |
| 17 Reviews | building 2026-11-14 on `feat/phase-17` (`../ecommerce-p17`, DB `ecommerce_p17`, API 3117, e2e 3217/5217) |
| 21, 22, 24 | queued 2026-11-14: 22 ‖ 24 after 17/19, then 21 alone (touches every screen) |
| 19 Loyalty | done, merged 2026-11-14 (job runner + cron entry, points earn/redeem/reversal, rewards, charity round-up, referrals, newsletter double opt-in, back-in-stock alerts, pet birthday + life-stage mails, wishlist + share link, buy again; review fixes; API 1,254 + 2 skipped, e2e 66 + 1 skipped). `.github/workflows/jobs.yml` needs repo variable `API_URL` + secret `JOBS_SECRET` (owner) |
| 16 PDP depth | in progress: lane `feat/phase-16` (`../ecommerce-p16`, DB `ecommerce_p16`, API 3116, e2e 3216/5216) |
| 17 Reviews | queued: after 16 in lane B |
| 21, 22, 24 | not started |

Phase 21 resume notes (21.1 to 21.3 done on `feat/phase-21`; continue at 21.4 after phase 22 is merged into `main` and this branch is rebased on it):
- Design: the store prefix is the router `basename` (see decisions log 21.2), not a route wrapper or a `StoreLink`. Nothing in features/pages knows about prefixes; `<Link>`, `<Navigate>`, `navigate()` are prefixed by the router. Phase 22's new screens and routes need no change: add them to the unprefixed table in `routes.tsx` (inside the `StoreLayout` > `AppLayout` > error-boundary children) and they work under `/eu-en/...`.
- Only hand-built absolute URLs need `useStorePath()` (`features/stores/StoreContext.tsx`): after the rebase check phase 22 for `window.location.origin + path` (return/share links, e.g. refund or return-label links). Known unprefixed ones still working through the legacy redirect: `usePay` Stripe `return_url`, wishlist share link, referral link, gift-finder share link; switch them to `useStorePath()` when touching them. `useStore()` gives `{code, locale, lang, currency, shipCountries, taxDisplay}`, `useStoreBase()` the prefix.
- Entry rules live in `lib/store-entry.ts` (`resolveEntry`): legacy and root URLs are rewritten with `replaceState` before the router starts (cookie `pawsome_store`, then `navigator.languages`, then `eu-en`); `/admin` stays un-prefixed; `xx-yy` that is not a store is a 404. Tests render un-prefixed paths without a basename (`test/render.tsx`), a path starting with a store code gets one.
- Switching store is a full page load (basename is fixed per load). That suits 21.4 onwards: the dictionary, the `X-Store-View` header (21.6, read from `useStore()` or the URL in the api client) and currency (21.8) are all read at load.
- `<Seo>` derives hreflang from `canonical` (root-relative, no prefix). Slice 3 (per-locale slugs) must add an `alternates` override carrying the per-store path. Phase 22 pages with a canonical get hreflang automatically; pass `alternates={false}` for a page that exists in one view only.
- Traps for the next builder: any test that does `getByRole('option')` or `getByRole('combobox')` in a full-layout render now also sees the two store switchers (header + footer): scope to a listbox or the search box (two such tests were fixed). e2e helper `signOut` expects `/eu-en`; new e2e that assert URLs after clicking links should expect `/eu-en/...` (old direct `page.goto('/x')` still works via the redirect).
- 21.4 to 21.7 are DONE (commits `refactor(web): extract UI strings...`, `feat(web): add German and French UI strings`, `feat(api): add catalogue translation tables...`, `feat(admin): edit catalogue translations per locale`), plus `test(e2e): restock seeded products...` and `fix(web): prefix hand-built absolute URLs...`. Resume at **21.8** (currency). What the next builder needs:
  - Web strings: `useT()` (`t`, `tn`, `tm`) and `useFormat()` (`date`, `number`, `money`) in `apps/web/src/i18n/`; one dictionary file per area in `i18n/{en,de,fr}/<ns>.ts`, typed from English (a key missing in de/fr fails `typecheck`; `dictionaries.test.ts` checks shape and placeholders; `no-literals.test.ts` fails on English JSX text or text props outside the admin). New UI text = add the key to `en/<ns>.ts` AND `de/` and `fr/`. Admin, legal markdown, API data, agent tool text stay English (decisions log 21.4). `uk-en` uses the English dictionary (already British); `en-gb.ts` is an empty overlay.
  - `useFormat().money(cents, currency?)` defaults to the STORE's currency; `Price` and the card/cart price components use it. Some callers still pass `'EUR'` explicitly (e.g. `ReferralPanel` money helper, loyalty/cart code that formats points or fixed EUR amounts): 21.8/21.9 must audit every `fmt.money(x, 'EUR')` and `formatMoney(` call for the order/store currency.
  - API: `X-Store-View` (sent by `apiFetch` from the URL prefix) fills an AsyncLocalStorage (`modules/i18n/context.ts`: `currentStore()`, `currentLang()`); `Vary: X-Store-View` is on every response. Use `currentStore().currency` for the price lookups in 21.8. Catalogue overlay lives in `modules/i18n/translations.ts` (`overlay`, `loadTranslations`, `resolveSlug`, `pick`). Cart/order line names are English snapshots (not translated).
  - Migration `0034_catalogue_translations` is the newest; next is `0035`. Drizzle-kit rewrote nothing else; do NOT run prettier on `src/db/migrations/meta` (it reflows old snapshots).
  - Seed: `db/seed/translations/{de,fr}.json` (all seeded products, categories, brands, collections, guides), upserted by `seedTranslations` at the end of the content seed; `pnpm --filter @store/api translations:export <de|fr>` prints what is missing. Admin: `/admin/translations`.
  - Not translated yet and worth a look in 21.10: email templates; the cart/order/checkout API error messages are English and shown through `tm()` only where a `msg.*` key exists.
  - API suite takes about 70 minutes under load on this machine (disk-bound truncates); run single files while iterating. `seed.test.ts` "sales ... idempotent" failed once under load and passed alone (not related to this phase).
  - KNOWN GAP (hreflang): `<Seo>` alternates still derive every store's URL from one canonical, but categories/products/brands/collections/guides now have per-language slugs, so the `/de-de/...` alternate of an English page carries the English slug (it works: the API resolves any language's slug and the page redirects to the right one). Proper fix: have the detail endpoints return `slugs: {de, fr}` and pass them as the `alternates` override.
  - e2e: `loyalty.spec` and `checkout.spec` restock what they buy (`restock()` in `e2e/helpers.ts`); a new spec that buys a seeded product should do the same.

Phase 19 merge notes (19.7 to 19.12, written at the end of the phase):
- Migrations added in this lane: `0025_newsletter`, `0026_stock_alerts` (hand-written trigger on `inventory` at the end: re-append when regenerating), `0027_pet_messages`, `0028_wishlists` (hand-written `updated_at` trigger at the end). Renumber after phase 17's at merge.
- Jobs registered in `jobs/runner.ts`: `send-stock-alerts` (hourly), `pet-messages` (daily). `pnpm --filter @store/api job run <name> --force` forgets the period's claim first (manual re-run; the e2e uses it).
- Mail kinds added to the outbox: `newsletter_confirm`, `newsletter_welcome`, `stock_alert`, `pet_birthday`, `pet_life_stage`. Marketing mail (welcome, pet mail) ends with the one-click unsubscribe link; the stock alert is transactional with a cancel link.
- Review fixes for 19.2 to 19.6 (lead's list) are separate `fix(...)` commits: 50-cent card minimum in the engine, give-back before claw-back, voiding codes held by unpaid orders, referrer row lock, secret before validation, conditional job claims plus `runExclusiveSweep`.
- Not done: kits get no back-in-stock alerts (derived stock has no row to trigger on); no "your friend ordered" mail for referrals; wishlist hearts are product-level (no variant picked); guest wishlists are never cleaned up (add an expiry job later).

Earlier resume notes (written after 19.6, kept for reference):
- Order events are the extension point: `onOrderPaid` / `onOrderCancelled` / `onOrderRefunded` (`modules/orders/events.ts`). Loyalty subscribes in `loyalty/service.ts` (points), `charity-service.ts` and `referrals-service.ts`; each exports a `register...Subscribers()` called from `modules/index.ts`. Handlers run inside the order's transaction, so keep them database-only (no email send; queue through the outbox).
- Jobs: `jobs/runner.ts` has `registerJob({name, every, run})`; the new jobs (`send-stock-alerts` hourly, `pet-messages` daily) register there, and the CLI (`pnpm --filter @store/api job run <name>`), `JOBS_IN_PROCESS` and `POST /api/v1/internal/jobs/run` pick them up with no other change. The GitHub workflow `.github/workflows/jobs.yml` only runs once the repository variable `API_URL` and secret `JOBS_SECRET` exist (needs the owner's OK).
- Personal single-use codes: `loyalty/codes.ts` `mintPersonalCode` (owner-only through `promotions.price`, `max_uses` 1, expiry). The newsletter welcome code (`WELCOME-XXXX`, 10% percent, first order only) needs a `percent` kind: extend `PersonalCodeSpec` (it supports `fixed` and `free_shipping` today) and keep the `WELCOME` prefix; it is not owner-bound (a subscriber may not have an account yet), so pass no owner or add an email-bound variant.
- Money in a code is integer cents; points are integers (1 point = 1 cent); the round-up donation is a separate order field (`orders.donation_cents`) and is part of `totalCents`.
- Migrations: 0018 job_runs, 0019 points_ledger, 0020 rewards, 0021 charity_donations, 0022 referrals. Hand-written SQL (the `updated_at` triggers) is at the end of 0020 and 0021 under a "HAND-WRITTEN" comment, so it can be re-appended when the lead regenerates the migrations after phase 16 merges. Always run prettier from the repo root (`pnpm format`): from a package folder it ignores `.prettierignore` and rewrites the migration snapshots.
- API test suite is slow on a shared machine (every test truncates ~60 tables; 30 to 40 minutes under load). Run single files with `npx vitest run <path>` from `apps/api` while iterating and the whole suite once per commit.
- Not done in 19.1 to 19.6: e2e (19.12 owns `loyalty.spec.ts`; the checkout round-up checkbox and "Use loyalty points" box need a step there), phase 22's `refundId` on `emitOrderRefunded`, an email when a referral qualifies, a real "free product" for the free-toy reward (it mints a EUR 6.99 code), admin visibility of referrals.

Lanes for wave 2 are listed in the table; everything else is on `main`. Tax stays out of scope ("Demo store: no tax is charged"), logged as a decision.

Paused on 2026-11-08 at the owner's request. To resume:
- Both builders were stopped mid-step; their unfinished work is uncommitted in the worktrees (`git -C ../ecommerce-p16 status`, `git -C ../ecommerce-p15 status`). Finish and commit that step first (gates below), then continue with the next step in the phase doc.
- Phase 16 16.7 (in progress): shared `delivery.ts` + tests, a checkout/shipping API change, and `DeliveryEstimate` on the PDP. Its journal and decisions lines are staged in that worktree.
- Phase 19 19.1 (in progress): only the `job_runs` table and its generated migration `0020_job_runs` exist. Phase 16's migrations will also need numbers: whichever of 16 and 19 merges second regenerates its migrations on top of `main` (drizzle-kit generate, re-append hand-written triggers, drop stale `_journal.json` entries).
- Merge order stays 16, 17, 19. Review each phase's diff before it merges; update this table and the README test counts at each merge.
- Gates before every commit: delete stale `*.tsbuildinfo` outside node_modules, `pnpm typecheck && pnpm lint && pnpm format:check`, then the unit suites one package at a time; before `pnpm e2e`, check the lane's e2e ports with `ss -ltnp`.

Known follow-ups:
- Checkout race: a second checkout (other tab or store) while the first tab's payment is confirming, before the webhook, can re-total the pending order; the late payment then fails the amount/currency check and needs a manual refund. Fix idea: ask Stripe for the stored intent's status before re-pricing.
- e2e specs create and buy products in the shared dev database, so local "Bestsellers" can show E2E test products. A deployed demo starts from the seed and is unaffected.
- Playwright reuses any server already on the e2e ports (`reuseExistingServer: true`). Check `ss -ltnp` before `pnpm e2e`: a leftover dev API there makes many tests fail for no code reason.
- `pnpm typecheck` can pass on a stale `*.tsbuildinfo`; delete those first when in doubt.
- Hero slides still use catalogue photos; generated hero art is a later image task.
- Phase 17 (reviews): seed review photos and the gallery reuse catalogue pictures; live photo upload writes to `UPLOAD_DIR` (ephemeral on Render), so the public demo should set `UPLOADS_ENABLED=false`. Migration `0020_reviews_ugc` (the lead renumbers if phase 19 also took 0019).
- Phase 22 (post-purchase): migrations `0030_returns`, `0031_return_refund_intent`, `0032_vet_approval`, `0033_order_refunded_cents` (hand-written triggers/backfill marked at the end of each file; re-append after regenerating). `OrderRefundedEvent` is `{orderId, refundId, amountCents, full, lines, shippingCents, donationCents}`, one per refund; loyalty reverses by merchandise share keyed on `refundId`, the round-up is reversed only by a refund that hands it back. Dev without Stripe: set `RETURNS_SIMULATED=true` to see refunds. Demo logins gain `casey@pawsome.test` (sample returns). Follow-ups: no admin switch for the vet flag.

Remote viewing: the screenshot tour of the current `main` (phases 0–13) is a private page at
https://claude.ai/artifact/GPjeWpRVGZNQeZVcmnvdz1. For the live dev site on your tailnet, run
`tailscale serve --bg 5173` yourself (the session was not allowed to run it); if Vite blocks the
`.ts.net` host, add it to `server.allowedHosts` in `apps/web/vite.config.ts`.

Phase 21 merge notes (written at the end of the phase):
- Migrations added in this lane: `0035_variant_prices` (hand-written EUR mirror trigger, re-append if regenerated), `0036_store_currency`, `0037_email_store_view`. Renumber after any migration merged before it. The journal `when` of a migration must stay later than the previous one's.
- Money rules to keep: amounts are minor units and never summed across currencies; a missing price/threshold/rate in a currency means "not offered", never a conversion; EUR stays in the old columns, other currencies in `variant_prices` and the `*_by_currency` jsonb maps. Loyalty is 1 point = 1 minor unit of the currency being earned/spent (simplification, see decisions log 21.9).
- Follow-ups: admin screens edit EUR promotion/shipping amounts only (GBP are seeded); store-switch confirm dialog with a full cart; hreflang `slugs` from detail endpoints (21.7 gap); catalogue names inside emails are English snapshots; Stripe real-card test still skipped.
