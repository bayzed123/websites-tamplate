/**
 * The Sidra Clothing admin must agree with the shop it manages.
 *
 * Both read the same in-page server in src/demo/, so the totals on the
 * dashboard are computed from the same rows the other screens list. This check
 * recomputes them independently from src/data/db.json and insists the rendered
 * figures match — which is the assertion that would have caught the SmartGadget
 * admin reporting 65 orders beside an empty table.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] ?? 'sidra-clothing/dist';
const SEED = 'sidra-clothing/src/data/db.json';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };

const db = JSON.parse(await readFile(SEED, 'utf8'));
const settled = db.orders.filter((o) => o.orderStatus !== 'cancelled');
const revenue = settled.reduce((s, o) => s + Number(o.subtotal ?? 0), 0);
const expect = {
  products: db.products.length,
  orders: db.orders.length,
  customers: db.user.length,
  outOfStock: db.products.filter((p) => !p.isInStock).length,
  revenue: `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
};

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(ROOT, path === '/' ? '/index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
const escaped = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('request', (r) => {
  // The storefront's product photos are hotlinked; only a request that would
  // reach a backend that does not exist is a failure here.
  if (/localhost:8080|localhost:3000/.test(r.url())) escaped.push(r.url());
});
// Hotlinked product photos are unreachable from CI; the fallback must cover them.
await page.route('**://images.asos-media.com/**', (r) => r.abort());

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const open = async (hash) => {
  await page.goto(`${base}#${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
};

console.log('\n== the dashboard opens with no sign-in ==');
const dash = await open('/admin');
check('it renders', dash.length > 400, `${dash.length} chars`);
check('no sign-in wall', !/password|sign in/i.test(dash.replace(/no password/gi, '')));
check('it says the data is invented', /invented/i.test(dash));

console.log('\n== and its totals are the shop\'s own numbers ==');
check(`revenue is ${expect.revenue}`, dash.includes(expect.revenue));
check(`orders is ${expect.orders}`, new RegExp(`ORDERS ${expect.orders}\\b`, 'i').test(dash));
check(`catalogue is ${expect.products}`, new RegExp(`CATALOGUE ${expect.products}\\b`, 'i').test(dash));
check(`${expect.outOfStock} shown out of stock`, dash.includes(`${expect.outOfStock} out of stock`));

console.log('\n== every screen lists rows, not an empty state ==');
const products = await open('/admin/products');
check(`products lists all ${expect.products}`, products.includes(`${expect.products} of ${expect.products} products`));
check('and names a real product', db.products.slice(0, 12).some((p) => products.includes(p.name)));

const orders = await open('/admin/orders');
check(`orders lists all ${expect.orders}`, orders.includes(`${expect.orders} of ${expect.orders} orders`));

const customers = await open('/admin/customers');
check(`customers lists all ${expect.customers}`,
  new RegExp(`${expect.customers} registered`, 'i').test(customers));
check('and names the account', db.user.some((u) => customers.includes(`${u.name} ${u.lastname}`)));

console.log('\n== the status tabs narrow rather than repeat ==');
// Clicking, because that is what a visitor does — and because a tab that
// silently shows every row looks identical to one that filters until you
// compare the counts.
await open('/admin/orders');
for (const status of ['in progress', 'delivered', 'cancelled']) {
  const want = db.orders.filter((o) => o.orderStatus === status).length;
  await page.getByRole('tab', { name: status, exact: true }).click();
  await page.waitForTimeout(400);
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  check(`"${status}" shows ${want} of ${expect.orders}`, text.includes(`${want} of ${expect.orders} orders`));
}

console.log('\n== the shop links to the admin ==');
await page.goto(`${base}#/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const links = await page.evaluate(() =>
  [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
check('a visitor can find it', links.some((h) => /#\/admin$/.test(h ?? '')), links.slice(-6).join(', '));

console.log('\n== nothing reaches a server that does not exist ==');
check('no request to localhost:8080', escaped.length === 0, escaped.slice(0, 2).join(', '));
check('no uncaught JS error', errors.length === 0, errors[0] ?? '');

await browser.close();
server.close();
console.log(failures === 0 ? '\nthe admin and the shop agree\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
