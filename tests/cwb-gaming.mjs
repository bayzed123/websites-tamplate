/**
 * The three CWB Gaming demos built by scripts/shop-demos/cwb.mjs must work as one marketplace with no server.
 *
 * The admin and seller demos open signed in and stay open in their own tabs. In the marketplace a visitor
 * picks the cheapest offer for a pack, checks out with the on-screen SMS code and pays through the sandbox
 * gateway window. Before "Approve" no code shows anywhere; after it the code is on the order page. A direct
 * top-up paid the same way lands in the seller's queue, the seller marks it delivered, and the admin shows the
 * order.
 *
 *   node tests/cwb-gaming.mjs site
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SITE = process.argv[2] ?? 'site';
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

/** Through checkout to the sandbox gateway window. Returns the order number. */
async function checkout(shop) {
  await shop.waitForFunction(() => location.hash.startsWith('#/checkout'));
  const form = shop.locator('#co');
  await form.locator('input[name="name"]').fill('Hub Visitor');
  await form.locator('input[name="phone"]').fill(`017${String(Date.now()).slice(-8)}`);
  await shop.locator('#send-otp').click();
  const status = shop.locator('#otp-status');
  await status.filter({ hasText: 'Your code:' }).waitFor({ timeout: 15000 });
  const code = (await status.textContent()).match(/(\d{6})/)?.[1];
  check('the SMS code shows on screen', Boolean(code));
  await form.locator('input[name="code"]').fill(code);
  await shop.locator('#verify-otp').click();
  await shop.locator('#otp-box .player-ok').waitFor({ timeout: 10000 });
  await form.locator('input[name="method"][value="bkash"]').check({ force: true });
  await form.locator('input[name="confirmId"]').check({ force: true });
  await shop.locator('#place').click();
  await shop.getByTestId('sandbox-approve').waitFor({ timeout: 20000 });
  return (await shop.locator('[role="dialog"]').textContent()).match(/CWB-\d{6}-[A-Z0-9]{4}/)?.[0];
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
const errors = [];
ctx.on('weberror', (e) => errors.push(e.error().message));
try {
  const admin = await ctx.newPage();
  await admin.goto(`${base}/cwb-gaming-admin/`);
  await admin.locator('h1').first().waitFor({ timeout: 30000 });
  check('the admin opens signed in', (await admin.locator('#login').count()) === 0 && (await admin.locator('#tfa').count()) === 0);
  check('"Needs your attention today" is on the dashboard', await admin.getByText('Needs your attention today').first().isVisible());

  const seller = await ctx.newPage();
  await seller.goto(`${base}/cwb-gaming-seller/`);
  await seller.getByText('Dhaka Top-Up Hub').first().waitFor({ timeout: 30000 });
  check('the seller dashboard opens signed in', (await seller.locator('#lf').count()) === 0);
  await seller.locator('#view .kpi, #view .card').first().waitFor({ timeout: 20000 });
  check('the seller dashboard renders its home screen', (await seller.locator('#view').innerText()).trim().length > 40);

  // 1. A redeem code: nothing before the payment is approved, the code after.
  const shop = await ctx.newPage();
  await shop.goto(`${base}/cwb-gaming/?lang=en`);
  await shop.locator("a[href^='/game/']").first().waitFor({ timeout: 30000 });
  await shop.evaluate(() => { history.pushState({}, '', '/topup/steam-wallet-code/5-wallet-code'); dispatchEvent(new PopStateEvent('popstate')); });
  await shop.locator('[data-pick]').first().waitFor({ timeout: 20000 });
  check('the pack page lives in the hash', /#\/topup\/steam-wallet-code\/5-wallet-code/.test(shop.url()));
  check('several sellers are compared', (await shop.locator('.offer').count()) >= 2);
  await shop.locator('[data-pick]').first().click();
  await shop.locator('#go').click();
  const orderNo = await checkout(shop);
  check(`the sandbox payment window opens (${orderNo})`, Boolean(orderNo));
  const before = await shop.evaluate(async (no) => {
    const tok = JSON.parse(localStorage.getItem('cwb_orders') ?? '[]');
    const r = await fetch(`/api/orders/${no}?token=${(tok.find?.((x) => x.orderNo === no) ?? {}).token ?? ''}`, { headers: { 'x-requested-with': 'fetch' } });
    return r.ok ? (await r.json()).order : null;
  }, orderNo);
  if (before) check('before approval: payment pending, no code', before.status === 'payment_pending' && before.items[0].codes.length === 0);
  await shop.getByTestId('sandbox-approve').click();
  await shop.waitForFunction((no) => location.hash.includes(`/order/${no}`), orderNo, { timeout: 20000 });
  await shop.getByTestId('codes').waitFor({ timeout: 20000 });
  check('after approval the code is on the order page', /DEMO-STEAM5USD-/.test(await shop.getByTestId('codes').textContent()));

  // 2. A direct top-up from the demo seller: it waits in the seller's queue, the seller delivers it.
  await shop.evaluate(() => { history.pushState({}, '', '/topup/free-fire/115-diamonds'); dispatchEvent(new PopStateEvent('popstate')); });
  await shop.locator('[data-pick]').first().waitFor({ timeout: 20000 });
  const hub = shop.locator('.offer', { hasText: 'Dhaka Top-Up Hub' }).locator('[data-pick]');
  await hub.click();
  await shop.locator('[data-method="direct"]').click();
  await shop.locator('#pid').fill('5123456789');
  await shop.locator('#id-check', { hasText: '✓' }).waitFor({ timeout: 10000 });
  await shop.locator('#go').click();
  check('the player ID is repeated back before payment', /5123456789/.test(await shop.getByTestId('player-echo').textContent()));
  const topupNo = await checkout(shop);
  await shop.getByTestId('sandbox-approve').click();
  await shop.waitForFunction((no) => location.hash.includes(`/order/${no}`), topupNo, { timeout: 20000 });
  await shop.getByTestId('order-status').waitFor();

  await seller.goto(`${base}/cwb-gaming-seller/#/orders`);
  const row = seller.getByText(topupNo).first();
  const inQueue = await row.waitFor({ timeout: 20000 }).then(() => true, () => false);
  check('the paid top-up is in the seller\'s queue', inQueue);
  check('the seller tab, open all along, is still signed in', (await seller.locator('#lf').count()) === 0);
  const sellerText = await seller.locator('body').textContent();
  check('the seller never sees the buyer\'s phone', !sellerText.includes('Hub Visitor'));

  await admin.goto(`${base}/cwb-gaming-admin/#/orders?q=${topupNo}`);
  const found = await admin.getByText(topupNo).first().waitFor({ timeout: 20000 }).then(() => true, () => false);
  check('the order shows in the admin', found);
  check('the admin tab is still signed in', (await admin.locator('#login').count()) === 0);
} catch (e) {
  check('the walk-through finished', false, e.message.split('\n')[0]);
}
check('no uncaught JS error', errors.length === 0, errors.join(' | '));
await ctx.close();
await browser.close();
server.close();
console.log(`\npassed: ${pass}   failed: ${fail}`);
process.exit(fail ? 1 : 0);
