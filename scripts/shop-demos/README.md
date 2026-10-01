# Shop demos (Zamil Shop BD platform)

Eight hub demos come from four real shops built on the same platform. Each shop gets a storefront
demo and an admin demo that share their data:

| Shop | Source | Storefront | Admin |
|---|---|---|---|
| Zamil Shop BD — baby & kids | [bayzed123/babyshop](https://github.com/bayzed123/babyshop) | `zamil-shop-bd/` | `zamil-shop-bd-admin/` |
| Sidra Jewellery & Fashion | [bayzed123/jewellery-and-fashion-](https://github.com/bayzed123/jewellery-and-fashion-) | `sidra-jewellery/` | `sidra-jewellery-admin/` |
| Sidra Glow Studio — skincare & studio | [bayzed123/Skin-care-shop](https://github.com/bayzed123/Skin-care-shop) | `sidra-glow-studio/` | `sidra-glow-studio-admin/` |
| Prakriti Herbal — herbal & natural | [bayzed123/harbal-pakriti](https://github.com/bayzed123/harbal-pakriti) | `prakriti-herbal/` | `prakriti-herbal-admin/` |

What a visitor can try:
- **Shop:** browse, filter, product pages, cart, and checkout with a phone check (the SMS code
  shows on screen, nothing is sent).
- **Orders:** place an order, open its order page, sign in as a shopper (`01700000001` / `demo12345`).
- **Shop-specific screens:** the gift registry, the skin quiz and studio bookings, and the herbal
  kit builder.
- **Admin:** opens signed in as `demo` / `demo12345`. Staff phone sign-in works with `01899999999`,
  with the code shown on screen. Every screen works: orders through to the invoice PDF, products,
  stock and batches, coupons, reports, settings.

## How it works without a server

The same approach as the Lk's Attire demos (`scripts/lks-attire-demo/`).

**The real Worker runs in the browser.** Each shop is one Cloudflare Worker (Hono + D1 + KV). Its
real code is bundled into `demo/runtime.js` and answers every `/api/*` request inside the browser
(`engine.mjs` + `browser-runtime.mjs`):

- **D1 → sql.js** (SQLite in WebAssembly), opened on `demo/store.db`. That file holds the schema,
  the shop's own starter catalogue and a history of 42 orders. The orders are placed through the
  real storefront API and worked through the real admin pipeline:
  - a confirmation call logged for Cash on Delivery orders;
  - mobile-wallet payments marked as paid;
  - then packed → shipped → delivered, with a few cancelled, refused and returned.
  - It also holds verified reviews, two reviews waiting for approval, a shopper account and,
    for the studio, treatment bookings.
- **KV → localStorage**, and cookies → a small jar.
  - **Every call reads them fresh.** The shop and admin demos use them from different tabs, and a
    tab writing back its own stale copy would sign the other tab out.
- **One shared database.** It is saved to IndexedDB after each change. An order placed in the shop
  shows up in the admin, and admin edits show in the shop.

**Patched for the demo build only:**
- **Admin sign-in:**
  - The two-step-sign-in requirement for owners and managers is switched off (a public demo can't
    share an authenticator app).
  - The admin opens already signed in.
- **SMS codes:** the runtime sets `ENVIRONMENT=development`, so codes are shown on screen instead
  of sent. The on-screen text reads "Demo — no SMS is sent. Your code: …".
- **Links:**
  - Invoice PDFs and the WhatsApp button are answered by the in-browser Worker.
  - "View in shop" links in the admin open the shop demo next door.

**Housekeeping:**
- Dates are shifted on first load, so the order history always ends "today" and batch expiry
  dates keep their distance.
- `?demo-reset` on any demo URL starts again from the original data.
- Nothing leaves the browser, and uploaded photos stay in it as data URLs.
- Shop pages live in the hash (`…/prakriti-herbal/#/product/<slug>`), so every screen works from a
  sub-folder on a static host.

## Rebuilding after changes to a shop

```bash
# from this repository's root, with the shops checked out next to it
# (../babyshop, ../jewellery-and-fashion-, ../skin-care-shop, ../harbal-pakriti)
npm i --no-save esbuild sql.js
node scripts/shop-demos/build.mjs                         # all four
node scripts/shop-demos/build.mjs prakriti-herbal          # one
node scripts/shop-demos/build.mjs prakriti-herbal --src /path/to/harbal-pakriti
```

**What the script does:**
1. Runs each shop's own `scripts/build.mjs`.
2. Generates the demo data by calling the real API.
3. Bundles the runtime.
4. Rewrites both folders. `demo.json` in each folder is kept.

**Source patches:** the few it makes (two-step-sign-in requirement, router reads, image paths, the
admin marker) fail loudly if a shop's code no longer matches, rather than shipping a broken demo.

**Adding a shop:**
- The shop must be built on the same platform.
- Add it to `shops.mjs` with its storage prefix (the `xxx_` before `_admin_lang` in its
  `admin/js/i18n.js`).

**After rebuilding:** commit the regenerated folders, and the hub publishes them as they are.
`node tests/shop-demos.mjs site` (also run in CI) walks each pair end to end:
1. order in the shop with the admin open;
2. see the order in the admin;
3. open an invoice PDF.
