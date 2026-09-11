/**
 * SmartGadget demo admin dashboard.
 *
 * No sign-in, no tokens, no network. Everything rendered here is read from
 * ../assets/demo-data.js — see the comment at the top of index.html for why
 * that is what makes a passwordless dashboard safe to publish.
 *
 * The screens mirror the production build so a prospect can see what running
 * the shop actually looks like: what the owner sees each morning, where
 * orders are worked, how stock and pricing are edited, and which integrations
 * are wired up.
 */
import { PRODUCTS, ORDERS, CUSTOMERS, DAILY, STORE, money, tierPrice } from '../assets/demo-data.js';
import { trackingStatus } from '../assets/analytics.js';

const root = document.getElementById('admin-app');
const esc = (v) => String(v).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const sum = (list, pick) => list.reduce((a, x) => a + pick(x), 0);
const statusPill = (status) => {
  const kind = { Delivered: 'good', 'In transit': 'info', Packed: 'info', Pending: 'warn', Returned: 'bad' }[status] || 'info';
  return `<span class="pill ${kind}">${esc(status)}</span>`;
};

function overview() {
  const revenue = sum(DAILY, (d) => d.revenue);
  const orders = sum(DAILY, (d) => d.orders);
  const visitors = sum(DAILY, (d) => d.visitors);
  const peak = Math.max(...DAILY.map((d) => d.revenue));
  const lowStock = PRODUCTS.filter((p) => p.stock > 0 && p.stock < 100);
  const out = PRODUCTS.filter((p) => p.stock === 0);

  return `<h1 style="font-size:1.3rem;margin:0 0 3px">Overview</h1>
    <p class="sub" style="margin:0 0 16px">Last 14 days · fictional data</p>
    <div class="kpis">
      <div class="kpi"><b>${money(revenue)}</b><span>Revenue</span></div>
      <div class="kpi"><b>${orders}</b><span>Orders</span></div>
      <div class="kpi"><b>${visitors.toLocaleString()}</b><span>Visitors</span></div>
      <div class="kpi"><b>${money(Math.round(revenue / orders))}</b><span>Average order</span></div>
    </div>
    <div class="card" style="padding:14px 16px;margin-bottom:16px">
      <b style="font-size:.95rem">Revenue by day</b>
      <div class="bars">${DAILY.map((d) =>
        `<div style="height:${Math.round((d.revenue / peak) * 100)}%" title="${esc(d.day)} — ${money(d.revenue)}"></div>`).join('')}</div>
      <p class="sub" style="margin:0;display:flex;justify-content:space-between"><span>${esc(DAILY[0].day)}</span><span>${esc(DAILY[DAILY.length - 1].day)}</span></p>
    </div>
    ${(lowStock.length || out.length) ? `<div class="card" style="padding:14px 16px;margin-bottom:16px">
      <b style="font-size:.95rem">Needs attention</b>
      <ul style="margin:8px 0 0;padding-left:18px;font-size:.88rem">
        ${out.map((p) => `<li><b>${esc(p.name)}</b> — out of stock</li>`).join('')}
        ${lowStock.map((p) => `<li>${esc(p.name)} — only ${p.stock} left</li>`).join('')}
      </ul></div>` : ''}
    <b style="font-size:.95rem">Latest orders</b>
    <div class="table-wrap" style="margin-top:8px"><table><thead><tr><th>Order</th><th>Customer</th><th>District</th><th>Total</th><th>Status</th></tr></thead><tbody>
      ${ORDERS.slice(0, 5).map((o) => `<tr><td style="font-family:var(--mono)">${esc(o.id)}</td><td>${esc(o.customer)}</td><td>${esc(o.city)}</td><td><b>${money(o.total)}</b></td><td>${statusPill(o.status)}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function orders() {
  return `<h1 style="font-size:1.3rem;margin:0 0 3px">Orders</h1>
    <p class="sub" style="margin:0 0 16px">${ORDERS.length} orders · every one fictional</p>
    <div class="table-wrap"><table><thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Phone</th><th>Qty</th><th>Total</th><th>Payment</th><th>Courier</th><th>Status</th></tr></thead><tbody>
      ${ORDERS.map((o) => `<tr>
        <td style="font-family:var(--mono)">${esc(o.id)}</td><td>${esc(o.placed)}</td><td>${esc(o.customer)}</td>
        <td style="font-family:var(--mono);font-size:.8rem">${esc(o.phone)}</td><td>${o.qty}</td>
        <td><b>${money(o.total)}</b></td><td>${esc(o.paid)}</td><td>${esc(o.courier)}</td><td>${statusPill(o.status)}</td></tr>`).join('')}
    </tbody></table></div>
    <p class="notice" style="margin-top:14px">In the live build these rows are actions: print an invoice, book the courier, mark paid, issue a refund. Here they are read-only — there is no order to change.</p>`;
}

function products() {
  return `<h1 style="font-size:1.3rem;margin:0 0 3px">Products</h1>
    <p class="sub" style="margin:0 0 16px">${PRODUCTS.length} SKUs · wholesale tiers shown at 10 and 50 units</p>
    <div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Stock</th><th>Single</th><th>@10</th><th>@50</th><th>Rating</th></tr></thead><tbody>
      ${PRODUCTS.map((p) => `<tr>
        <td><b>${esc(p.name)}</b></td><td>${esc(p.category)}</td>
        <td>${p.stock === 0 ? '<span class="pill bad">0</span>' : p.stock < 100 ? `<span class="pill warn">${p.stock}</span>` : p.stock}</td>
        <td>${money(p.price)}</td><td>${money(tierPrice(p, 10))}</td><td>${money(tierPrice(p, 50))}</td>
        <td>★ ${p.rating}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function customers() {
  return `<h1 style="font-size:1.3rem;margin:0 0 3px">Customers</h1>
    <p class="sub" style="margin:0 0 16px">${CUSTOMERS.length} accounts · fictional businesses and numbers</p>
    <div class="table-wrap"><table><thead><tr><th>Business</th><th>Phone</th><th>District</th><th>Tier</th><th>Orders</th><th>Lifetime value</th><th>Since</th></tr></thead><tbody>
      ${CUSTOMERS.map((c) => `<tr>
        <td><b>${esc(c.name)}</b></td><td style="font-family:var(--mono);font-size:.8rem">${esc(c.phone)}</td>
        <td>${esc(c.city)}</td><td><span class="pill info">${esc(c.tier)}</span></td><td>${c.orders}</td>
        <td><b>${money(c.spent)}</b></td><td>${esc(c.since)}</td></tr>`).join('')}
    </tbody></table></div>`;
}

function analytics() {
  const status = trackingStatus();
  const peak = Math.max(...DAILY.map((d) => d.visitors));
  const row = (label, ok, note) =>
    `<tr><td>${esc(label)}</td><td>${ok ? '<span class="pill good">configured</span>' : '<span class="pill warn">not set</span>'}</td><td class="sub">${esc(note)}</td></tr>`;
  return `<h1 style="font-size:1.3rem;margin:0 0 3px">Analytics</h1>
    <p class="sub" style="margin:0 0 16px">The measurement stack that ships with the build</p>
    <div class="card" style="padding:14px 16px;margin-bottom:16px">
      <b style="font-size:.95rem">Visitors by day</b>
      <div class="bars">${DAILY.map((d) => `<div style="height:${Math.round((d.visitors / peak) * 100)}%" title="${esc(d.day)} — ${d.visitors}"></div>`).join('')}</div>
    </div>
    <div class="table-wrap" style="margin-bottom:14px"><table><thead><tr><th>Surface</th><th>Status</th><th>Needs</th></tr></thead><tbody>
      ${row('Google Analytics 4', status.ga4, 'A demo-only measurement id')}
      ${row('Google Tag Manager', status.gtm, 'A demo-only container id')}
      ${row('Meta Pixel', status.pixel, 'A demo-only pixel id')}
      ${row('Conversions API', status.capi, 'A server endpoint — this demo has none')}
    </tbody></table></div>
    <p class="notice"><b>Separate container, deliberately.</b> The live store these screens are modelled on is running ads right now. If this demo fired into that property, every prospect clicking around the showcase would land in the real store's conversion data and skew the optimisation of campaigns that are spending money. So the ids live in <b>web/assets/tracking-config.js</b>, they start empty, and no tag loads until a second container's ids are pasted in.</p>`;
}

function settings() {
  return `<h1 style="font-size:1.3rem;margin:0 0 3px">Settings</h1>
    <p class="sub" style="margin:0 0 16px">What the live build configures here</p>
    <div class="table-wrap" style="margin-bottom:14px"><table><tbody>
      <tr><th style="width:34%">Store name</th><td>${esc(STORE.name)}</td></tr>
      <tr><th>Contact</th><td>${esc(STORE.email)} · ${esc(STORE.phone)}</td></tr>
      <tr><th>Address</th><td>${esc(STORE.address)}</td></tr>
      <tr><th>Currency</th><td>${esc(STORE.currency)} — stored in poisha, displayed in taka</td></tr>
      <tr><th>Admin sign-in</th><td><span class="pill warn">disabled in this demo</span></td></tr>
      <tr><th>Database</th><td><span class="pill warn">none — this demo reads a fixture file</span></td></tr>
      <tr><th>Payment account</th><td><span class="pill warn">not connected</span></td></tr>
      <tr><th>Courier account</th><td><span class="pill warn">not connected</span></td></tr>
      <tr><th>Order alert email</th><td><span class="pill warn">not connected</span></td></tr>
    </tbody></table></div>
    <p class="notice"><b>Why the sign-in is off.</b> The production build protects these screens with hashed passwords and signed sessions, because real orders and real customers sit behind them. This demo has nothing behind it: every number on every screen comes from a file in the repository, so an open dashboard shows a visitor exactly what reading the source would. If it is ever pointed at a real API, the sign-in has to come back first.</p>`;
}

const SCREENS = { overview, orders, products, customers, analytics, settings };

function render() {
  const name = (location.hash.replace(/^#\//, '') || 'overview').split('/')[0];
  const screen = SCREENS[name] || overview;
  root.innerHTML = screen();
  document.querySelectorAll('#admin-nav a').forEach((link) => {
    if (link.getAttribute('href') === `#/${name}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
if (!location.hash) location.hash = '#/overview';
render();
