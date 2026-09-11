# SmartGadget — demo storefront and admin

A separately branded demonstration of the wholesale-gadget build: the whole
customer journey, plus the dashboard the owner runs the shop from.

It exists so a prospect can click through the real thing instead of looking at
screenshots. **Everything in it is invented**, and it is built so that it
cannot become anything else by accident.

## The three rules this demo is built around

### 1. No database, so no sign-in is needed

The admin dashboard opens with **no password**. That is safe here for one
reason only: there is nothing behind it. Every product, order, customer and
chart comes from `web/assets/demo-data.js`, a file in this repository. There
is no API to call, no database to reach and no session token to steal — an
open dashboard shows a visitor exactly what reading the source would.

The production build protects those screens with PBKDF2 password hashing and
signed sessions, because real orders and real customers sit behind them. **If
this demo is ever pointed at a real API, the sign-in has to come back first.**
`tests/demo-isolation.mjs` fails if a network call to anything but this origin
appears anywhere in the demo.

### 2. Its own tracking container, never the live store's

The build ships with Meta Pixel, the Conversions API, Google Tag Manager and
GA4. The shop this demo is modelled on is **running ads right now**, and its
property is measuring money.

If a public demo fired into that property, every prospect clicking around the
showcase would land in the real store's conversion data and skew the
optimisation of campaigns that are spending budget. So the demo gets its own
container, and every id lives in one file:

```
web/assets/tracking-config.js
```

It ships **empty**, and empty means no tag is loaded and no event is sent.
That is deliberate: a demo measuring nothing is harmless; a demo measuring
into the wrong property is expensive. Paste a second container's ids in when
you want it live.

The Conversions API needs a server and this demo has none — that is exactly
what makes the passwordless dashboard safe — so `capiEndpoint` is empty and
the server copy is simply not sent. The browser already generates the shared
`eventID` on the events that support it, so Meta will deduplicate the pair
correctly the moment a server copy starts arriving.

`/#/tracking` on the storefront shows the live state of all four surfaces and
a log of every event the session has produced, so the model is visible before
a single id is filled in.

### 3. Nothing from the real store comes across

No real product, photograph, customer, order, phone number, email address,
domain, analytics id, API endpoint or key belongs in this repository.
`tests/demo-isolation.mjs` greps the whole demo for the live store's name, its
domain, its GA4 property, its GTM container, its Pixel and its alert inbox,
and fails if any of them appear.

## What is in it

**Storefront** — home, category browsing, product detail with the wholesale
tier table, cart with tier pricing applied as quantity rises, checkout, order
confirmation, order tracking, and a tracking-setup page.

**Admin** — overview with revenue and visitor charts and a low-stock warning,
orders, products with tier pricing, customers with lifetime value, analytics
with the integration state, and settings.

## Running it

Static files, no build step:

```bash
python3 -m http.server 5601 --directory web
```

Then open `http://127.0.0.1:5601/` for the shop and
`http://127.0.0.1:5601/admin/` for the dashboard.

## Checks

```bash
node tests/demo-isolation.mjs     # nothing from the live store leaked in
node tests/smartgadget-demo.mjs   # the demo actually works, in a browser
```
