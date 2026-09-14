/**
 * The admin dashboard a prospect clicks through must not contradict itself.
 *
 * Why this file exists: the dashboard reported 65 orders and 30 products while
 * the Orders and Products screens both rendered "0". Nothing caught it — the
 * hub's preview check only asks whether a page renders text, and these pages
 * rendered plenty of it: chrome, filters, and a tidy "No orders here yet".
 *
 * An empty state is indistinguishable from a working one unless you know what
 * the number should be. So this check reads the count off the dashboard first
 * and then insists the list screens can produce it. It also exercises each
 * filter, because the bug was a filter — a dropdown's "all" option being
 * compared as though it were a real status value.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] ?? 'smartgadget-demo/web/dist';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.txt': 'text/plain' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(ROOT, path === '/' ? '/index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
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
page.on('pageerror', (e) => errors.push(String(e)));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

/** Go to an admin route and hand back its text once React has settled. */
async function open(hash) {
  await page.goto(`${base}#${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
}

console.log('\n== the dashboard states totals the rest must be able to produce ==');
const dash = await open('/admin');
// The dashboard's ORDERS tile is a 30-day window; the Orders screen lists every
// order ever. Those two numbers are different on purpose, so only CATALOGUE —
// the same measure on both screens — is compared for equality.
const orders30d = Number((dash.match(/ORDERS ([\d,]+)/) ?? [])[1]?.replace(/,/g, ''));
const catalogue = Number((dash.match(/CATALOGUE ([\d,]+)/) ?? [])[1]?.replace(/,/g, ''));
check('dashboard reports orders in the last 30 days', Number.isFinite(orders30d) && orders30d > 0, String(orders30d));
check('dashboard reports a catalogue size', Number.isFinite(catalogue) && catalogue > 0, String(catalogue));

console.log('\n== and the list screens are not empty ==');
const orders = await open('/admin/orders');
const ordersAllTime = Number((orders.match(/([\d,]+) orders? ·/) ?? [])[1]?.replace(/,/g, ''));
check('Orders is not empty', !/No orders here yet/.test(orders), ordersAllTime === 0 ? 'rendered "0 orders"' : '');
check('Orders holds at least the 30-day count', ordersAllTime >= orders30d, `${ordersAllTime} all-time vs ${orders30d} in 30d`);

const products = await open('/admin/products');
const productsShown = Number((products.match(/([\d,]+) products? ·/) ?? [])[1]?.replace(/,/g, ''));
check('Products is not empty', !/No products match those filters/.test(products), productsShown === 0 ? 'rendered "0 products"' : '');
check('Products agrees with the dashboard', productsShown === catalogue, `list ${productsShown} vs dashboard ${catalogue}`);

console.log('\n== each status tab narrows, and none of them empties the screen ==');
// Driven by clicking, because that is what a prospect does, and because a tab
// that silently shows every row looks identical to one that filters correctly
// until you compare the counts.
await open('/admin/orders');
let summed = 0;
let pendingCount = 0;
// The visible labels, not the status values behind them: the tab for
// `confirmed` reads "Order confirmed" and `shipped` reads "On the way".
for (const label of ['Pending', 'Order confirmed', 'On the way', 'Delivered', 'Cancelled']) {
  await page.locator('button', { hasText: new RegExp(`^${label}$`) }).first().click();
  await page.waitForTimeout(700);
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const n = Number((text.match(/([\d,]+) orders? ·/) ?? [])[1]?.replace(/,/g, ''));
  summed += n;
  if (label === 'Pending') pendingCount = n;
  check(`"${label}" returns a real subset`, n > 0 && n < ordersAllTime, `${n} of ${ordersAllTime}`);
}
check('the tabs partition the list rather than repeat it', summed < ordersAllTime * 1.5, `${summed} across 5 tabs vs ${ordersAllTime} total`);

console.log('\n== the notification bell\'s deep link preselects its tab ==');
// Hash-routed: the query lives inside the fragment, so location.search is
// empty and reading it left this link landing on the unfiltered "All" tab.
//
// This must be a FRESH page. Changing only the hash on a live document does not
// remount the component, so its useState initialiser never re-runs and the
// screen keeps whichever tab was last clicked — which reads as a pass, at the
// previous tab's count, whether the link works or not. That is exactly how this
// check first fooled me.
const fresh = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await fresh.goto(`${base}#/admin/orders?status=pending`, { waitUntil: 'networkidle' });
await fresh.waitForTimeout(1100);
const deep = await fresh.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
const deepN = Number((deep.match(/([\d,]+) orders? ·/) ?? [])[1]?.replace(/,/g, ''));
check('?status=pending arrives on the Pending tab', deepN === pendingCount, `${deepN} shown vs ${pendingCount} pending`);
check('and Pending is the active tab', (await fresh.locator('button.active').allInnerTexts()).join() === 'Pending',
  (await fresh.locator('button.active').allInnerTexts()).join() || '(none active)');
await fresh.close();

console.log('\n== the shop catalogue survives a price filter ==');
// price_min is poisha in the URL. Converting it a second time server-side put
// the bound 100x too high and returned nothing.
const cheap = await open('/catalog?price_min=100000');
check('a price floor still returns products', !/No products/i.test(cheap) && cheap.length > 400, `${cheap.length} chars`);

check('no uncaught JS error anywhere above', errors.length === 0, errors[0] ?? '');

await browser.close();
server.close();
console.log(failures === 0 ? '\nthe admin agrees with itself\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
