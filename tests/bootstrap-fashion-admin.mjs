/**
 * The Bootstrap Fashion admin must describe the shop it sits on top of.
 *
 * The failure this guards against is the one SmartGadget shipped: a dashboard
 * quoting confident totals beside a table that renders nothing, or — worse for
 * a sales demo — an admin listing products the storefront does not sell. Both
 * pass a does-it-render check, because chrome and headers render fine.
 *
 * So the assertions here are relational. The product table is compared against
 * src/data/category-products.json, the same file the storefront's category page
 * loops over, and the dashboard's restock count is compared against the rows
 * actually flagged. If the two ever drift apart, this goes red.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] ?? 'bootstrap-fashion/dist';
const DATA = 'bootstrap-fashion/src/data';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

const catalogue = JSON.parse(await readFile(join(DATA, 'category-products.json'), 'utf8')).entries;
const admin = JSON.parse(await readFile(join(DATA, 'admin.json'), 'utf8'));

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
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

let failures = 0;
const check = (label, ok, detail = '') => {
  // Only show the detail on a failure: it is written to explain what went
  // wrong, so printing it beside "ok" reads as a contradiction.
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};
const open = async (file) => {
  await page.goto(`${base}/${file}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(250);
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
};

console.log('\n== the data itself is consistent ==');
check('a stock row for every product in the shop',
  admin.stock.length === catalogue.length, `${admin.stock.length} stock vs ${catalogue.length} products`);

console.log('\n== the dashboard opens, with no sign-in ==');
const dash = await open('admin.html');
check('it renders', dash.length > 400, `${dash.length} chars`);
check('no sign-in wall', !/password/i.test(dash));
check('it says plainly that the data is invented', /invented/i.test(dash));
for (const stat of admin.stats) {
  check(`the "${stat.label}" tile shows ${stat.value}`, dash.includes(stat.value));
}

console.log('\n== the restock panel names real products, and only the flagged ones ==');
const flagged = admin.stock
  .map((s, i) => ({ ...s, title: catalogue[i].title }))
  .filter((s) => s.low);
for (const row of flagged) {
  check(`"${row.title}" is listed as ${row.state.toLowerCase()}`, dash.includes(row.title));
}
const healthy = admin.stock
  .map((s, i) => ({ ...s, title: catalogue[i].title }))
  .filter((s) => !s.low);
check('well-stocked products are not in the restock panel',
  healthy.every((row) => !dash.slice(dash.indexOf('Needs restocking')).includes(row.title)),
  healthy.map((r) => r.title).find((t) => dash.slice(dash.indexOf('Needs restocking')).includes(t)) ?? '');

console.log('\n== the product table is the shop\'s catalogue, not a second copy ==');
const products = await open('admin-products.html');
for (const item of catalogue) {
  check(`lists "${item.title}"`, products.includes(item.title));
}
check('and prices it the way the shop does',
  catalogue.every((p) => products.includes(`${p.currency}${p['sale-price'] ?? p.price}`)));
check('no product appears that the shop does not sell',
  !/Placeholder|Sample Product|Lorem/i.test(products));

console.log('\n== orders and customers have rows ==');
const orders = await open('admin-orders.html');
check('every order is listed', admin.orders.every((o) => orders.includes(o.ref)));
check('the footer count matches the rows', orders.includes(`all ${admin.orders.length} orders`));

const customers = await open('admin-customers.html');
check('every customer is listed', admin.customers.every((c) => customers.includes(c.name)));
check('the footer count matches the rows', customers.includes(`all ${admin.customers.length} customers`));

console.log('\n== every admin page can be reached from every other ==');
for (const file of ['admin.html', 'admin-products.html', 'admin-orders.html', 'admin-customers.html']) {
  await page.goto(`${base}/${file}`, { waitUntil: 'domcontentloaded' });
  const links = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
  const missing = ['./admin.html', './admin-products.html', './admin-orders.html', './admin-customers.html', './index.html']
    .filter((href) => !links.includes(href));
  check(`${file} links to the rest of the admin and the shop`, missing.length === 0, missing.join(', '));
}

console.log('\n== and the shop links to the admin ==');
const home = await open('index.html');
const homeLinks = await page.evaluate(() =>
  [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')));
check('the storefront offers a way in', homeLinks.some((h) => /admin\.html$/.test(h ?? '')),
  'no link to admin.html on the home page');

check('no uncaught JS error', errors.length === 0, errors[0] ?? '');

await browser.close();
server.close();
console.log(failures === 0 ? '\nthe admin and the shop agree\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
