/**
 * SmartGadget demo storefront.
 *
 * A hash-routed single-page app, like the build it is modelled on, so the
 * analytics behave the same way: the router reports every screen itself and
 * GA4's automatic page_view is switched off. See analytics.js.
 *
 * There is no backend. Every product, price and order on this site comes from
 * demo-data.js, and the cart lives in this tab only.
 */
import { PRODUCTS, CATEGORIES, STORE, REVIEWS, money, tierPrice } from './demo-data.js';
import { installTags, track, trackingStatus, sentEvents } from './analytics.js';

const app = document.getElementById('app');
const cart = new Map();               // id -> qty

const esc = (value) => String(value).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const bySlug = (slug) => PRODUCTS.find((p) => p.slug === slug);
const cartLines = () => [...cart.entries()].map(([id, qty]) => {
  const product = PRODUCTS.find((p) => p.id === id);
  const unit = tierPrice(product, qty);
  return { product, qty, unit, line: unit * qty };
});
const cartTotal = () => cartLines().reduce((sum, l) => sum + l.line, 0);
const cartCount = () => [...cart.values()].reduce((a, b) => a + b, 0);

function gaItem(product, qty = 1) {
  return { item_id: product.id, item_name: product.name, item_category: product.category,
    price: tierPrice(product, qty) / 100, quantity: qty };
}

function paintCartCount() {
  const badge = document.querySelector('[data-cart-count]');
  if (badge) { badge.textContent = String(cartCount()); badge.hidden = cartCount() === 0; }
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function productCard(p) {
  return `<a class="p-card" href="#/product/${esc(p.slug)}">
    <div class="p-thumb">${p.category === 'phones' ? '📱' : p.category === 'audio' ? '🎧' : p.category === 'wearables' ? '⌚' : p.category === 'power' ? '🔋' : '🔌'}
      ${p.badge ? `<span class="p-badge">${esc(p.badge)}</span>` : ''}</div>
    <div class="p-body">
      <span class="p-name">${esc(p.name)}</span>
      <span class="p-price">${money(p.price)}<span class="p-mrp">${money(p.mrp)}</span></span>
      <span class="p-meta">${p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'} · ★ ${p.rating}</span>
    </div></a>`;
}

function home() {
  const featured = PRODUCTS.slice(0, 8);
  return `<section class="hero"><div class="wrap">
      <h1>${esc(STORE.tagline)}</h1>
      <p>${esc(STORE.blurb)}</p>
      <div class="cta">
        <a class="btn" href="#/catalog">Browse the catalogue</a>
        <a class="btn ghost" style="color:#fff;border-color:rgba(255,255,255,.3)" href="#/track">Track an order</a>
      </div>
      <div class="hero-stats">
        <div><b>${PRODUCTS.length}</b><span>SKUs in the demo</span></div>
        <div><b>48 h</b><span>Dispatch window</span></div>
        <div><b>3</b><span>Wholesale tiers</span></div>
        <div><b>64</b><span>Districts covered</span></div>
      </div></div></section>
    <section class="section"><div class="wrap">
      <h2>Shop by category</h2><p class="sub">Wholesale pricing shows on every product page.</p>
      <div class="cat-row">${CATEGORIES.map((c) =>
        `<a class="chip" href="#/catalog/${c.slug}">${c.icon} ${esc(c.name)}</a>`).join('')}</div>
      <h2>Moving this week</h2><p class="sub">Prices drop as quantity goes up — the tier table is on each product.</p>
      <div class="grid">${featured.map(productCard).join('')}</div>
    </div></section>`;
}

function catalog(slug) {
  const list = slug ? PRODUCTS.filter((p) => p.category === slug) : PRODUCTS;
  const label = slug ? (CATEGORIES.find((c) => c.slug === slug)?.name ?? slug) : 'Everything';
  return `<section class="section"><div class="wrap">
      <h2>${esc(label)}</h2><p class="sub">${list.length} product${list.length === 1 ? '' : 's'}</p>
      <div class="cat-row">
        <a class="chip" ${!slug ? 'aria-pressed="true"' : ''} href="#/catalog">All</a>
        ${CATEGORIES.map((c) => `<a class="chip" ${slug === c.slug ? 'aria-pressed="true"' : ''} href="#/catalog/${c.slug}">${c.icon} ${esc(c.name)}</a>`).join('')}
      </div>
      ${list.length ? `<div class="grid">${list.map(productCard).join('')}</div>`
        : '<p class="empty">Nothing in this category yet.</p>'}
    </div></section>`;
}

function product(slug) {
  const p = bySlug(slug);
  if (!p) return `<section class="section"><div class="wrap"><p class="empty">That product does not exist in this demo.</p></div></section>`;
  const reviews = REVIEWS.filter((r) => r.product === p.id);
  return `<section class="section"><div class="wrap">
    <p class="sub"><a href="#/catalog/${esc(p.category)}" style="color:var(--brand-ink)">← ${esc(CATEGORIES.find((c) => c.slug === p.category)?.name ?? p.category)}</a></p>
    <div class="grid" style="grid-template-columns:1fr;gap:20px">
      <div class="card" style="padding:0;overflow:hidden">
        <div class="p-thumb" style="aspect-ratio:16/10;font-size:4.4rem">${p.category === 'phones' ? '📱' : p.category === 'audio' ? '🎧' : p.category === 'wearables' ? '⌚' : p.category === 'power' ? '🔋' : '🔌'}</div>
      </div>
      <div>
        <h2 style="margin:0 0 6px;font-size:1.5rem">${esc(p.name)}</h2>
        <p class="sub" style="margin:0 0 12px">★ ${p.rating} · ${p.reviews} reviews · ${p.stock > 0 ? `<span class="pill good">${p.stock} in stock</span>` : '<span class="pill bad">Out of stock</span>'}</p>
        <p style="margin:0 0 14px">${esc(p.blurb)}</p>
        <p style="font-size:1.7rem;font-weight:800;margin:0 0 4px">${money(p.price)}<span class="p-mrp">${money(p.mrp)}</span></p>
        <p class="sub" style="margin:0 0 16px">Single-unit price. Wholesale tiers below.</p>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:18px">
          <label class="sr-only" for="qty">Quantity</label>
          <input id="qty" type="number" min="1" value="1" style="width:96px;padding:11px;border:1px solid var(--line-strong);border-radius:10px;font:inherit">
          <button class="btn" data-add="${esc(p.slug)}" ${p.stock ? '' : 'disabled'}>${p.stock ? 'Add to cart' : 'Out of stock'}</button>
        </div>
        <div class="table-wrap" style="margin-bottom:18px"><table><thead><tr><th>Buy at least</th><th>Unit price</th><th>You save</th></tr></thead><tbody>
          <tr><td>1</td><td>${money(p.price)}</td><td>—</td></tr>
          ${(p.tiers || []).map((t) => `<tr><td>${t.qty}</td><td>${money(t.price)}</td><td>${money(p.price - t.price)} each</td></tr>`).join('')}
        </tbody></table></div>
        <h3 style="font-size:1rem;margin:0 0 8px">Specification</h3>
        <div class="table-wrap"><table><tbody>
          ${Object.entries(p.specs).map(([k, v]) => `<tr><th style="width:38%">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
        </tbody></table></div>
        ${reviews.length ? `<h3 style="font-size:1rem;margin:20px 0 8px">What buyers said</h3>
          ${reviews.map((r) => `<div class="card" style="padding:12px 14px;margin-bottom:9px">
            <b>${esc(r.name)}</b> <span class="sub">${'★'.repeat(r.stars)} · ${esc(r.when)}</span>
            <p style="margin:5px 0 0">${esc(r.body)}</p></div>`).join('')}` : ''}
      </div>
    </div></div></section>`;
}

function cartScreen() {
  const lines = cartLines();
  if (!lines.length) return `<section class="section"><div class="wrap">
    <h2>Your cart</h2><p class="empty">Nothing in the cart yet. <a href="#/catalog" style="color:var(--brand-ink)">Browse the catalogue</a>.</p></div></section>`;
  return `<section class="section"><div class="wrap">
    <h2>Your cart</h2><p class="sub">Tier pricing is applied automatically as quantity rises.</p>
    <div class="table-wrap" style="margin-bottom:16px"><table><thead><tr><th>Product</th><th>Qty</th><th>Unit</th><th>Line</th><th></th></tr></thead><tbody>
      ${lines.map((l) => `<tr>
        <td>${esc(l.product.name)}</td><td>${l.qty}</td><td>${money(l.unit)}</td><td><b>${money(l.line)}</b></td>
        <td><button class="btn ghost sm" data-remove="${esc(l.product.id)}">Remove</button></td></tr>`).join('')}
      <tr><th colspan="3">Total</th><th colspan="2" style="font-size:1.05rem">${money(cartTotal())}</th></tr>
    </tbody></table></div>
    <a class="btn" href="#/checkout">Continue to checkout</a></div></section>`;
}

function checkout() {
  const lines = cartLines();
  if (!lines.length) return cartScreen();
  return `<section class="section"><div class="wrap" style="max-width:640px">
    <h2>Checkout</h2>
    <p class="notice" style="margin-bottom:16px"><b>Nothing is charged.</b> This demo has no payment account and no database — pressing “Place order” only shows you the confirmation screen the real shop produces.</p>
    <form id="checkout-form" class="card" style="padding:16px;display:grid;gap:12px">
      <label>Business name<input required name="name" style="width:100%;padding:11px;border:1px solid var(--line-strong);border-radius:10px;font:inherit" placeholder="Demo Traders"></label>
      <label>Phone<input required name="phone" style="width:100%;padding:11px;border:1px solid var(--line-strong);border-radius:10px;font:inherit" placeholder="+8801700000000"></label>
      <label>District<input required name="city" style="width:100%;padding:11px;border:1px solid var(--line-strong);border-radius:10px;font:inherit" placeholder="Tangail"></label>
      <label>Delivery address<textarea required name="address" rows="3" style="width:100%;padding:11px;border:1px solid var(--line-strong);border-radius:10px;font:inherit" placeholder="Demo address"></textarea></label>
      <div><b>${lines.length} line${lines.length === 1 ? '' : 's'} · ${money(cartTotal())}</b></div>
      <button class="btn" type="submit">Place order</button>
    </form></div></section>`;
}

function confirmed(reference) {
  return `<section class="section"><div class="wrap" style="max-width:640px">
    <div class="card" style="padding:24px;text-align:center">
      <p style="font-size:2.4rem;margin:0">✅</p>
      <h2 style="margin:6px 0">Order placed</h2>
      <p class="sub">Reference <b style="font-family:var(--mono)">${esc(reference)}</b></p>
      <p class="notice" style="text-align:left;margin:14px 0">No order was stored and no payment was taken — this is a demo. In the live build this screen also sends the alert email, books the courier and writes the row the admin dashboard reads.</p>
      <a class="btn" href="#/track">See order tracking</a>
    </div></div></section>`;
}

function track_() {
  return `<section class="section"><div class="wrap" style="max-width:640px">
    <h2>Track an order</h2><p class="sub">Try <b style="font-family:var(--mono)">SG-24818</b> — any reference shows the same fictional timeline.</p>
    <div class="card" style="padding:16px">
      <ol style="margin:0;padding-left:20px;display:grid;gap:10px">
        <li><b>Order received</b> <span class="sub">2 Sep, 11:04</span></li>
        <li><b>Packed and labelled</b> <span class="sub">2 Sep, 17:40</span></li>
        <li><b>Handed to courier</b> <span class="sub">3 Sep, 09:15 · Steadfast</span></li>
        <li><b>Out for delivery</b> <span class="sub">4 Sep, 08:02</span></li>
        <li><span class="pill good">Delivered</span> <span class="sub">4 Sep, 14:36</span></li>
      </ol></div></div></section>`;
}

function tracking() {
  const status = trackingStatus();
  const row = (label, ok, note) =>
    `<tr><td>${esc(label)}</td><td>${ok ? '<span class="pill good">configured</span>' : '<span class="pill warn">not set</span>'}</td><td class="sub">${esc(note)}</td></tr>`;
  return `<section class="section"><div class="wrap">
    <h2>Tracking in this demo</h2>
    <p class="sub">The same stack the live build ships with — Meta Pixel, the Conversions API, Google Tag Manager and GA4 — pointed at a <b>separate container</b>.</p>
    <p class="notice" style="margin-bottom:16px">Every id below is empty until you paste the demo container's own ids into <b>web/assets/tracking-config.js</b>. Empty means no tag loads and no event is sent. That is deliberate: a demo measuring nothing is harmless, a demo firing into the live store's property corrupts the data the real ads are optimising against.</p>
    <div class="table-wrap" style="margin-bottom:18px"><table><thead><tr><th>Surface</th><th>Status</th><th>What it needs</th></tr></thead><tbody>
      ${row('Google Analytics 4', status.ga4, 'A demo-only measurement id, G-XXXXXXXXXX')}
      ${row('Google Tag Manager', status.gtm, 'A demo-only container id, GTM-XXXXXXX')}
      ${row('Meta Pixel', status.pixel, 'A demo-only pixel id, 15–16 digits')}
      ${row('Conversions API', status.capi, 'An endpoint to post the server copy to — this demo has no server')}
    </tbody></table></div>
    <h3 style="font-size:1rem;margin:0 0 6px">Events this session</h3>
    <p class="sub">Recorded whether or not a tag is configured, so the model is visible before any id is filled in.</p>
    <div class="table-wrap"><table><thead><tr><th>Time</th><th>GA4 event</th><th>Event id (for CAPI dedup)</th></tr></thead><tbody id="event-log">
      ${sentEvents.length ? '' : '<tr><td colspan="3" class="sub">Nothing yet — browse a product or add to cart.</td></tr>'}
    </tbody></table></div></div></section>`;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function render() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [, head, tail] = hash.split('/');
  let html; let title = STORE.name;

  if (!head) { html = home(); track('page_view', { page_title: 'Home', page_location: location.href }); }
  else if (head === 'catalog') {
    html = catalog(tail); title = `Catalogue — ${STORE.name}`;
    track('view_item_list', { item_list_name: tail || 'all' });
  } else if (head === 'product') {
    const p = bySlug(tail); html = product(tail); title = `${p ? p.name : 'Not found'} — ${STORE.name}`;
    if (p) track('view_item', { currency: 'BDT', value: p.price / 100, items: [gaItem(p)] });
  } else if (head === 'cart') { html = cartScreen(); track('view_cart', { currency: 'BDT', value: cartTotal() / 100 }); }
  else if (head === 'checkout') { html = checkout(); track('begin_checkout', { currency: 'BDT', value: cartTotal() / 100, items: cartLines().map((l) => gaItem(l.product, l.qty)) }); }
  else if (head === 'confirmed') { html = confirmed(tail || 'SG-00000'); }
  else if (head === 'track') { html = track_(); }
  else if (head === 'tracking') { html = tracking(); }
  else { html = `<section class="section"><div class="wrap"><p class="empty">Page not found.</p></div></section>`; }

  app.innerHTML = html;
  document.title = title;
  paintCartCount();
  if (head === 'tracking') paintEventLog();
  window.scrollTo(0, 0);
}

function paintEventLog() {
  const body = document.getElementById('event-log');
  if (!body || !sentEvents.length) return;
  body.innerHTML = sentEvents.slice(-25).reverse().map((e) =>
    `<tr><td class="sub">${esc(e.at.slice(11, 19))}</td><td><b>${esc(e.event)}</b></td>
     <td style="font-family:var(--mono);font-size:.78rem">${e.eventId ? esc(e.eventId) : '<span class="sub">—</span>'}</td></tr>`).join('');
}

document.addEventListener('click', (event) => {
  const add = event.target.closest('[data-add]');
  if (add) {
    const p = bySlug(add.dataset.add);
    const qty = Math.max(1, Number(document.getElementById('qty')?.value || 1));
    cart.set(p.id, (cart.get(p.id) || 0) + qty);
    track('add_to_cart', { currency: 'BDT', value: (tierPrice(p, qty) * qty) / 100, items: [gaItem(p, qty)] });
    paintCartCount();
    add.textContent = 'Added ✓';
    setTimeout(() => { add.textContent = 'Add to cart'; }, 1400);
    return;
  }
  const remove = event.target.closest('[data-remove]');
  if (remove) {
    const p = PRODUCTS.find((x) => x.id === remove.dataset.remove);
    track('remove_from_cart', { currency: 'BDT', items: [gaItem(p, cart.get(p.id) || 1)] });
    cart.delete(remove.dataset.remove);
    render();
  }
});

document.addEventListener('submit', (event) => {
  if (event.target.id !== 'checkout-form') return;
  event.preventDefault();
  const reference = 'SG-' + Math.floor(24823 + Math.random() * 900);
  track('purchase', { transaction_id: reference, currency: 'BDT', value: cartTotal() / 100,
    items: cartLines().map((l) => gaItem(l.product, l.qty)) });
  cart.clear();
  location.hash = `#/confirmed/${reference}`;
});

window.addEventListener('hashchange', render);
installTags();
render();
