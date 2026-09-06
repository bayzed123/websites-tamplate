# Demu — Client Demo Hub

Live at **[demu.sayadbayezid.com](https://demu.sayadbayezid.com)**.

A folder-based hub for client-facing demos. Every top-level folder that contains
an `index.html` becomes a demo automatically — there is no list to maintain and
no workflow to edit when you add one.

## How a client experiences it

| Surface | What it is |
|---|---|
| `/` | The hub: one card per demo with a real screenshot, what it demonstrates, and any demo sign-in |
| `/d/<slug>/` | The **review** view — a slim bar (back, page switcher, desktop/mobile toggle, sign-in reminder) with the demo running in a frame beneath it |
| `/d/<slug>/<page>/` | The same review view opened on a specific screen — e.g. `/d/veloura-atelier-demo/admin/` |
| `/demos/<slug>/…` | The **raw** demo, byte-for-byte as built, with nothing of ours added |

**Every screen has its own URL.** A wrapper page is generated for each page a
demo contains, so `/d/veloura-atelier-demo/admin/` opens the review view on the
admin dashboard rather than 404ing. Switching pages in the dropdown rewrites the
address bar too, so the link a client copies opens on the screen they are
actually looking at. Add `?view=mobile` (or press Mobile, which adds it for you)
and the link opens phone-framed — useful for "look at this on a phone".

URL segments come from the page path: `web/admin/index.html` → `/admin/`,
`web/checkout.html` → `/checkout/`. Where a file and a directory collide —
Veloura has both `web/admin.html` (login) and `web/admin/index.html`
(dashboard) — the directory index wins the clean segment, because that is what
a person types, and the loser gets a slug from its label (`/admin-login/`).

Only each demo's landing wrapper is indexed. The per-page wrappers are
navigation, not two dozen thin pages competing with each other, so they carry
`noindex, follow` and canonical back to the demo's main wrapper.

The two views matter. `/d/<slug>/` is for a client working through the build —
they can jump between screens and flip to a phone-width preview without losing
their way back. "Open raw" hands over the genuine article for the moment they
want to judge it as a real product.

Chrome is never injected into demo HTML. An earlier version rewrote every demo
page to add floating widgets; they collided with demos that position their own
headers (Veloura alone has 26 fixed/sticky rules), and a client "reviewing the
real thing" was looking at a page we had modified. The wrapper solves both.

## Add a demo

1. Create a folder at the repository root with a URL-safe name.
2. Put the frontend entry at `index.html`, `web/index.html`, `dist/index.html`,
   `build/index.html`, or `admin/index.html`.
3. *(Optional but worth it)* add `demo.json` beside it.
4. Push to `main`.

Nothing else. The build discovers the folder, screenshots it, checks it loads on
desktop and mobile, and publishes it.

### `demo.json`

Every field is optional. Without the file, the card falls back to the demo's own
`<title>` and meta description, then to the folder name.

```json
{
  "title": "Veloura Atelier",
  "tagline": "A full beauty storefront with its own admin",
  "description": "One or two sentences a client reads before clicking.",
  "category": "E-commerce",
  "featured": true,
  "tags": ["Storefront", "Admin dashboard"],
  "highlights": ["Shown as a short bulleted list on the card"],
  "credentials": {
    "label": "Admin dashboard sign-in",
    "username": "admin",
    "password": "demo123",
    "note": "Explain that the data is fictional."
  }
}
```

`featured: true` gives the demo the full-width card at the top of the grid.
`category` populates the filter chips automatically.

A folder with no `index.html` is skipped and logged — a client never sees a
broken card. `demu-material-docs-tamplate` and `demu-skincare-e-commerce` are
currently empty placeholders and are skipped for that reason.

## What never reaches the public site

The hub is public and indexed, so everything published is world-readable. The
build strips, and CI then re-checks for, anything that is not part of the demo a
client is reviewing:

- `worker/`, `migrations/`, `*.sql` — backend source and database schema
- `tests/`, `node_modules/`, `package*.json`, lockfiles, `wrangler.toml`, `tsconfig.json`
- `*.md` internal notes (`todo.md`, verification notes, admin guides)
- `.env*` and every dotfile

That is 27 files that used to ship with the site. The build prints how many it
held back; the `Validate generated artifact` step fails the deploy if any of
them reach the artifact anyway, so this cannot regress quietly.

Demo credentials like `admin` / `demo123` are deliberate and safe — they are
published on the card on purpose so a client can sign in. Keep it that way:
never point a demo at a real backend or real customer data.

## Testing the real experience

```bash
npm ci
npx playwright install --with-deps chromium
npm run build:demo-hub        # discover, copy, generate the hub and wrappers
npm run thumbs                # screenshot each demo for its card
npm run test:preview          # open every demo on desktop and mobile
```

`npm run test:preview` walks the manifest, so **every** demo is exercised, not
just one. For each demo it opens the wrapper and the demo itself at 1440px and
390px and fails on: an own asset that did not load, an image that decoded to
nothing, a page that rendered almost no text, or an uncaught JS error.

Third-party requests are separated out. A Google Fonts blip is reported as a
warning and does not block the deploy; a missing stylesheet of your own does.
Requests to `/api/`, `*.workers.dev` and analytics endpoints are expected to
fail — these frontends are published without their backend — and are ignored.

It also asserts that **every** wrapper URL resolves and frames the page it
claims to — the check that was missing when `/d/<slug>/admin/` shipped as a 404.

A readable summary lands at `artifacts/playwright/report.md`, with screenshots
beside it. The same run happens in CI on every push, and a failure stops the
deploy, so a demo a client would find broken never reaches the hub.

Outside CI, point Playwright at a local browser: `CHROMIUM_PATH=/path/to/chrome npm run test:preview`.

## Local preview

```bash
npm run build:demo-hub && python3 -m http.server 8000 --directory site
```

Then open `http://localhost:8000`.

## Repository layout

```
<demo-folder>/        one per demo — index.html plus optional demo.json
scripts/
  build-demo-hub.mjs  discovery, copying, publish filtering, page generation
  capture-thumbnails.mjs  one screenshot per demo for the hub cards
tests/
  live-preview.mjs    the desktop + mobile check across every demo
site/                 build output (git-ignored, published to Pages)
```
