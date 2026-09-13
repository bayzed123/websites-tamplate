# Rebuilding a template for a client

When a client orders one of these designs, you rebuild it under their name. This
page is what each template actually needs to build, where its branding lives, and
the traps that cost time the first time round.

It deliberately does **not** pick a build system. That decision is still open —
see [the open question](#the-open-question-how-clients-get-generated) at the end.
Everything here is true whichever way that goes, because it is about the
templates themselves.

---

## Build each template

Every command below has been run in this repository. Where a template needs an
unusual flag, the reason is given — those flags are not superstition, and
dropping them breaks the build.

### Bootstrap Fashion — `bootstrap-fashion/`

Bootstrap 5 · Handlebars · webpack 4 · no JavaScript framework

```bash
cd bootstrap-fashion
npm install --legacy-peer-deps
NODE_OPTIONS=--openssl-legacy-provider npm run build   # writes dist/
```

- `--legacy-peer-deps` — the dependency tree predates npm 7's strict peer
  resolution.
- `NODE_OPTIONS=--openssl-legacy-provider` — webpack 4 uses a hash algorithm
  Node removed in v17.
- **`bootstrap` is pinned to `5.0.2` on purpose.** The original `^5.0.0-beta3`
  range resolves to 5.3.x, whose `_utilities.scss` needs a `$prefix` variable
  this template's SCSS predates, and the build dies on `Undefined variable`.
  Do not "update" it without also updating the theme SCSS.
- `dist/` is committed, and the hub publishes it. Rebuild and commit `dist/`
  whenever you change `src/`.

### Sidra Clothing — `sidra-clothing/`

Vite · React 18 · Redux Toolkit · Tailwind + daisyUI

```bash
cd sidra-clothing
npm ci
npm run build          # writes dist/
```

`dist/` is **not** committed — CI builds it. Nothing unusual is needed.

### Sidra Noor Fashion — `sidra-noor-fashion/client/`

Vue CLI 4.5 · Vue 3 · Vuex · Tailwind

```bash
cd sidra-noor-fashion/client
CYPRESS_INSTALL_BINARY=0 npm install --legacy-peer-deps
NODE_OPTIONS=--openssl-legacy-provider npm run build   # writes dist/
```

- `CYPRESS_INSTALL_BINARY=0` — Cypress's postinstall downloads a large binary
  this build never runs, and the download fails on a restricted network.
- The other two flags, same reasons as Bootstrap Fashion.
- Vue CLI 4.5 has no numeric-separator support in its Babel preset: write
  `86400000`, not `86_400_000`, anywhere under `src/`.
- `sidra-noor-fashion/server/` is a NestJS API. The demo does not run it — see
  "Fixture layers" below.

### SmartGadget — `smartgadget-demo/web/`

Vite · React 18 · TypeScript

```bash
cd smartgadget-demo/web
npm ci
npm run build          # writes dist/
```

`VITE_DEMO` controls demo mode. It defaults to on; `VITE_DEMO=false` with a
`VITE_API_BASE` points the app at a real backend.

---

## Where the branding lives

Rebranding is not a find-and-replace on one string. These are the places a
client's name, contact details and copy actually appear.

| Template | Files to change |
|---|---|
| Bootstrap Fashion | `src/data/config.json` (site title, template name), `src/partials/footer/footer.html` (credit, socials, admin link), `src/partials/logo/logo-icon.html`, `src/data/*.json` (catalogue, categories, reviews) |
| Sidra Clothing | `index.html` (title), `src/components/Header.jsx`, `src/components/Footer.jsx`, `src/data/db.json` (catalogue, the customer account, orders) |
| Sidra Noor Fashion | `public/index.html` (title), `src/router/index.js` (document title), `src/components/user/Header.vue` (wordmark), `src/components/{user,admin}/Footer.vue` (address, email, credit), `src/views/user/About.vue`, `src/demo/data.js` (catalogue) |
| SmartGadget | `src/lib/demo/dataset.ts` (the whole catalogue), `src/components/Logo.tsx`, `src/pages/admin/Settings.tsx` |

**Check the seed data, not just the UI.** Every template here shipped real
personal details buried in fixtures: a Serbian name and street address in
`sidra-clothing/src/data/db.json`, a Tunisian business address and contact
mailbox across Sidra Noor's footers, and a live third-party API key hardcoded in
`sidra-noor-fashion/client/src/store/users.js`. None of it was visible from the
home page. Grep the data files before you ship.

---

## Fixture layers: why three of these run with no backend

The hub is static hosting. Three of these templates were written against a
server, so each carries a small layer that answers its own API inside the page.

| Template | Expects | Answered by |
|---|---|---|
| Sidra Clothing | `json-server` on `:8080` | `src/demo/server.js`, from `src/data/db.json` |
| Sidra Noor | NestJS on `:3000/api/` | `src/demo/server.js`, from `src/demo/data.js` |
| SmartGadget | its own API | `src/lib/demo/server.ts` |

If you are deploying for a client **with** a real backend, remove the demo layer
and point the app at their API. If you are producing another demo, copy the
pattern — and read the next section first.

---

## Traps

Every one of these was hit for real in this repository.

**A history-mode router renders its own 404 at a nested path.** The demos live
at `/demos/<name>/`, and static hosting has no rewrite rules, so
`createBrowserRouter` / `createWebHistory` match nothing and the app renders
"404 Not Found" before a single screen appears. Use hash routing:
`createHashRouter` (React Router), `createWebHashHistory()` (Vue Router).

**Asset paths beginning with `/` resolve against the domain root**, which is not
where the demo lives. Set `base: './'` (Vite) or `publicPath: './'` (Vue CLI),
and let the bundler own the images — in Vue, `@/assets/...` with `require()` in
JS and `~@/assets/...` in CSS, not `public/`.

**A fixture installer must be an imported module, not a function call.** Every
`import` in a file is evaluated before that file's first statement runs, so
calling `installDemoServer()` at the top of `main.jsx` still happens *after* the
router module has been evaluated and its loaders have fired. Put the call in its
own module and import it first.

**Return deep copies from fixture reads.** Several Vue views prefix image paths
in place (`product.imgUrl = baseUrl + product.imgUrl`). Against a real API that
is harmless; against an in-memory fixture it writes the prefix back into your
data and double-prefixes on the next visit.

**A dropdown's "all" option is not a value any row holds.** Comparing it
literally — `row.status !== 'all'` — is true for every row, and the screen
empties while the dashboard, which takes no filter, still reports the full
count. That contradiction is the symptom.

**Handlebars parses inside HTML comments.** An example `{{#if}}` written in a
`<!-- -->` comment is compiled, and an unclosed one fails the build. Use
`{{!-- --}}`.

**Handlebars data is keyed by filename.** `src/data/admin.json` is reachable as
`admin.*`. Wrapping its contents in another `"admin"` key makes every path
`admin.admin.*` and every loop silently empty.

**Form values never appear in `innerText`.** A screen whose data sits in
`<input>` values reads as blank if you check it by scraping text. Read
`el.value`.

---

## Before you hand it over

Run the checks. Each template has one, and they assert the things that look fine
until a client clicks:

```bash
npm run test:bootstrap-fashion-admin
npm run test:sidra-clothing        && npm run test:sidra-clothing-admin
npm run test:sidra-noor
npm run test:smartgadget-admin
```

Then the whole hub, desktop and mobile:

```bash
npm run build:demo-hub && npm run test:preview
```

And check by eye:

- **Photography.** Several templates ship hotlinked or unlicensed imagery —
  visible brand logos in Bootstrap Fashion's marquee and product grid, retailer
  CDN links in Sidra Clothing. Replace it before a paying client sees it.
- **Alt text.** Fix it in the *source*, not the built output. Alt text added
  directly to `bootstrap-fashion/dist/` was silently reverted the next time the
  template was rebuilt.
- **Secrets.** Grep for keys and tokens. Removing one from source does not
  un-publish it — rotate it.

---

## The open question: how clients get generated

Everything above is manual: copy the folder, edit the branding files, rebuild.
That works, and it is what to do today.

The unresolved question is what replaces the manual edit. The options discussed
were a separate rebuild repository, a PyPI package, a `Smartbuild.py` script, or
an in-repo config generator.

**The recommendation is an in-repo `brand.json` per client plus a small Node
generator** — `npm run build:client -- <template> <client>` — reading the
branding files listed above from one config. Node is already required to build
every template here, so it adds no new runtime; a Python layer in front of static
HTML adds a version, an install and a PATH that can each fail, against the stated
goals of zero errors and speed.

That decision is the client's to make. Once it is made, this page gains a section
on running the generator; the build commands, branding map and traps above do not
change either way.
