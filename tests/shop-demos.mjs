/**
 * The five shop demos built by scripts/shop-demos/build.mjs must work as one system with no server.
 *
 * For each shop: the storefront browses to a product, checks out with the on-screen SMS code
 * and places an order; the admin demo — open in another tab the whole time — stays signed in
 * and shows that order. Then the admin opens the invoice PDF of a delivered order.
 *
 * The two tabs matter. They share one cookie jar and one KV store in localStorage, and a tab
 * that writes back its own stale copy signs the other one out. That bug shipped in a first
 * version of the runtime and only showed up with both tabs open, so this keeps both open.
 *
 *   node tests/shop-demos.mjs site
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SITE = process.argv[2] ?? 'site';
const SHOPS = ['zamil-shop-bd', 'sidra-jewellery', 'sidra-glow-studio', 'prakriti-herbal', 'gadget-market'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.db': 'application/octet-stream' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const file = join(SITE, path.endsWith('/') ? `${path}index.html` : path);
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
const base = `http://127.0.0.1:${server.address().port}/demos`;

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fail++; console.log(`  FAIL ${n}${d ? `\n       ${String(d).slice(0, 400)}` : ''}`); }
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const slug of SHOPS) {
  console.log(`\n${slug}`);
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const errors = [];
  ctx.on('weberror', (e) => errors.push(e.error().message));
  try {
    const admin = await ctx.newPage();
    await admin.goto(`${base}/${slug}-admin/`);
    await admin.locator('h1').first().waitFor({ timeout: 30000 });
    check('admin opens signed in', (await admin.locator('#login').count()) === 0);

    const shop = await ctx.newPage();
    await shop.goto(`${base}/${slug}/?lang=en`);
    const product = shop.locator("a[href^='/product/']").first();
    await product.waitFor({ timeout: 30000 });
    await product.click();
    await shop.waitForFunction(() => location.hash.startsWith('#/product/'));
    await shop.locator('h1').first().waitFor();
    check('a product page opens in the hash', /#\/product\//.test(shop.url()));
    await shop.getByRole('button', { name: /Add to cart/i }).first().click();
    await shop.waitForTimeout(400);
    await shop.evaluate(() => { history.pushState({}, '', '/checkout'); dispatchEvent(new PopStateEvent('popstate')); });
    await shop.getByLabel(/Full name/).fill('Hub Visitor');
    await shop.getByLabel(/Mobile number/).fill(`017${String(Date.now()).slice(-8)}`);
    await shop.getByRole('button', { name: /Send code/i }).click();
    const toast = shop.locator('.toast', { hasText: 'Your code:' });
    await toast.waitFor({ timeout: 15000 });
    const code = (await toast.textContent()).match(/(\d{6})/)?.[1];
    check('the SMS code shows on screen', Boolean(code));
    await shop.getByPlaceholder(/6-digit/).fill(code);
    await shop.getByRole('button', { name: 'Verify', exact: true }).click();
    await shop.getByText(/Verified/).first().waitFor();
    await shop.getByLabel(/Division/).selectOption({ label: 'Dhaka' });
    await shop.getByLabel(/District/).selectOption({ label: 'Dhaka' });
    await shop.getByLabel(/Upazila/).selectOption({ label: 'Mirpur' });
    await shop.getByLabel(/House, road/).fill('House 12, Road 3');
    await shop.getByRole('button', { name: /Place order/i }).click();
    await shop.getByRole('heading', { name: /got your order/i }).waitFor({ timeout: 20000 });
    const orderNo = (await shop.locator('.order-no').textContent()).trim();
    check(`the order is placed (${orderNo})`, /^[A-Z]{3}-\d{6}-[A-Z0-9]{4}$/.test(orderNo));

    await admin.goto(`${base}/${slug}-admin/#/orders?q=${orderNo}`);
    const found = await admin.getByText(orderNo).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
    check('the admin, open all along, is still signed in', (await admin.locator('#login').count()) === 0);
    check('the shop order shows in the admin', found);

    await admin.goto(`${base}/${slug}-admin/#/orders?status=delivered`);
    await admin.locator('[data-open]').first().click();
    const inv = admin.getByRole('link', { name: /Invoice PDF/i }).first();
    await inv.waitFor({ timeout: 15000 });
    // Listen for the download before clicking: the PDF can be ready before the click resolves.
    const download = new Promise((res, rej) => {
      ctx.once('page', (p) => p.once('download', res));
      setTimeout(() => rej(new Error('no download within 20s')), 20000);
    });
    download.catch(() => {}); // unused when the PDF opens in the tab instead
    const [tab] = await Promise.all([ctx.waitForEvent('page'), inv.click()]);
    // A browser that shows PDFs opens it in the new tab; one that downloads PDFs (headless Chromium
    // in CI does) saves it instead. Either way the file must really be the invoice PDF.
    // Promise.any: when the PDF downloads, the tab's navigation aborts — that must not end the wait.
    const got = await Promise.any([
      tab.waitForURL(/^blob:/, { timeout: 20000 }).then(() => admin.evaluate(async (u) => {
        const b = await (await fetch(u)).blob();
        return { type: b.type, head: await b.slice(0, 5).text() };
      }, tab.url())),
      download.then(async (d) => {
        const { readFile } = await import('node:fs/promises');
        return { type: 'download', head: (await readFile(await d.path())).subarray(0, 5).toString() };
      }),
    ]).catch((e) => ({ type: (e.errors ?? [e]).map((x) => String(x).split('\n')[0]).join(' / '), head: '' }));
    check('a delivered order opens its invoice PDF', got.head === '%PDF-', `${got.type} ${got.head}`);
    await tab.close().catch(() => {});
  } catch (e) {
    check('the walk-through finished', false, e.message.split('\n')[0]);
  }
  check('no uncaught JS error', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
await browser.close();
server.close();
console.log(`\npassed: ${pass}   failed: ${fail}`);
process.exit(fail ? 1 : 0);
