# Lk's Attire demos

Two hub demos come from the real Lk's Attire store
([bayzed123/lks-attire](https://github.com/bayzed123/lks-attire)):

| Folder | What a visitor gets |
|---|---|
| `lks-attire-shop/` | The customer storefront: browse, filter, product pages, cart, checkout with postcode auto-fill, order tracking, accounts |
| `lks-attire-admin/` | The admin dashboard: opens signed in as `demo` / `demo12345` (English by default, বাংলা toggle) |

## How it works without a server

The store is one Cloudflare Worker (Hono + D1 + KV). For the demos, that same
Worker code is bundled into `demo/runtime.js` and answers every `/api/*` request
**inside the browser**:

- **D1 → sql.js**: SQLite compiled to WebAssembly (`demo/sql-wasm-browser.wasm`),
  opened on `demo/store.db`, which holds the schema, the store's catalogue and a
  generated history of 46 orders.
- **KV → localStorage**, cookies → a small jar (browsers refuse to let scripts set
  `Cookie` / read `Set-Cookie`, so the engine hands them to Hono directly).
- The database is saved to IndexedDB after each change. Both demos live on the
  same site, so they share it: an order placed in the shop appears in the admin,
  and product or banner edits in the admin show in the shop.
- Dates are shifted on first load so the order history always ends "today".
- `?demo-reset` on either URL starts again from the original data.
- Nothing leaves the browser: there is no backend to reach, and uploaded photos
  stay in the browser as data URLs.

The shop's pages live in the hash (`…/lks-attire-shop/#/product/<slug>`) so every
screen works from a sub-folder on a static host.

## Rebuilding after changes to the store

```bash
# from this repository's root, with the store checked out next to it
npm i --no-save esbuild sql.js
node scripts/lks-attire-demo/build.mjs ../lks-attire
```

The script rebuilds the store's brand, generates the demo data by calling the
real API (orders, the admin status pipeline, a shopper account, reviews waiting
for approval), bundles the runtime and rewrites both folders. `demo.json` in each
folder is kept. The few source patches it makes (router, asset paths) fail loudly
if the store's code no longer matches, rather than shipping a broken demo.

Commit the regenerated folders; the hub publishes them as they are.
