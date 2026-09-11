/**
 * The SmartGadget demo, in a real browser.
 *
 * A demo that does not work is worse than no demo: it is shown to a prospect
 * as evidence that the build works. So this drives the actual screens — shop
 * a product, watch tier pricing apply, check out, and open the dashboard that
 * has no sign-in.
 *
 * The check that matters most is the last one: with no ids configured, the
 * page must load NO tag and reach NO tracking vendor. That is what keeps a
 * public demo out of the live store's ad data.
 *
 * Serve the demo and run:
 *   python3 -m http.server 5602 --directory smartgadget-demo/web &
 *   node tests/smartgadget-demo.mjs
 */
import { chromium } from 'playwright';

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fail++; console.log(`  FAIL ${n}${d ? `\n       ${String(d).slice(0, 300)}` : ''}`); }
};

const SITE = process.env.DEMO_URL || 'http://127.0.0.1:5602';
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 400, height: 844 } }); // a phone

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
// Everything the page tries to reach that is not this server.
const outbound = [];
page.on('request', (r) => { if (!r.url().startsWith(SITE)) outbound.push(r.url()); });

console.log('== the shop opens ==');
await page.goto(`${SITE}/`, { waitUntil: 'networkidle' });
check('the storefront renders', (await page.locator('.p-card').count()) > 0);
check('it is branded SmartGadget', (await page.title()).includes('SmartGadget'));
check('and says it is a demo', await page.locator('.demo-ribbon').isVisible());
check('the page does not scroll sideways', await page.evaluate(() =>
  document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));

console.log('== wholesale pricing is the point, so it has to be right ==');
await page.goto(`${SITE}/#/product/aurora-buds-pro`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('#qty');
const tiers = await page.locator('table tbody tr').first().textContent();
check('the tier table is shown', /৳/.test(tiers || ''), tiers);
// 1 → ৳1,890, 10 → ৳1,720, 50 → ৳1,610, 200 → ৳1,520
const rows = await page.locator('table').first().locator('tbody tr').allTextContents();
check('four price steps', rows.length === 4, JSON.stringify(rows));
check('and the price falls as quantity rises', await page.evaluate(() => {
  // The FIRST table only. A bare `table tbody tr` also sweeps in the
  // specification table below it, so the row count never matched and the
  // check failed for a reason that had nothing to do with pricing.
  const nums = [...document.querySelector('table').querySelectorAll('tbody tr')]
    .map((tr) => Number((tr.children[1]?.textContent || '').replace(/[^\d]/g, '')));
  return nums.length === 4 && nums.every((n, i) => i === 0 || n < nums[i - 1]);
}));

console.log('== a customer can get through checkout ==');
await page.fill('#qty', '50');
await page.click('[data-add]');
check('the cart badge counts it', (await page.locator('[data-cart-count]').textContent()) === '50');
await page.goto(`${SITE}/#/cart`, { waitUntil: 'domcontentloaded' });
const cartText = await page.locator('main').textContent();
// 50 units crosses the second tier, so the unit price must be the tier price
// and not the single-unit one. Charging list price on a wholesale order is
// the bug this demo exists to show is handled.
check('the cart applies the 50-unit tier', cartText.includes('৳1,610'), cartText.slice(0, 200));
check('and totals it', cartText.includes('৳80,500'), cartText.slice(0, 200));

await page.goto(`${SITE}/#/checkout`, { waitUntil: 'domcontentloaded' });
await page.fill('[name=name]', 'Demo Traders');
await page.fill('[name=phone]', '+8801700000000');
await page.fill('[name=city]', 'Tangail');
await page.fill('[name=address]', 'Demo address');
await page.click('#checkout-form button[type=submit]');
await page.waitForSelector('text=Order placed', { timeout: 5000 });
check('the order confirms', (await page.locator('main').textContent()).includes('Order placed'));
check('and says nothing was charged', (await page.locator('main').textContent()).includes('No order was stored'));

console.log('== the dashboard opens with no sign-in ==');
await page.goto(`${SITE}/admin/`, { waitUntil: 'networkidle' });
const admin = await page.locator('main').textContent();
check('it goes straight to the dashboard', admin.includes('Overview'), admin.slice(0, 160));
check('no password field anywhere', (await page.locator('input[type=password]').count()) === 0);
check('no sign-in form either', (await page.locator('form[action*=login], #login-form').count()) === 0);
check('and it explains why that is safe', admin.includes('no database') || admin.includes('fictional'));

console.log('== every dashboard screen renders ==');
for (const screen of ['overview', 'orders', 'products', 'customers', 'analytics', 'settings']) {
  await page.goto(`${SITE}/admin/#/${screen}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(120);
  const body = await page.locator('#admin-app').textContent();
  check(`${screen} has content`, (body || '').trim().length > 120, (body || '').slice(0, 90));
}

console.log('== with no ids set, nothing is tracked and nothing is called ==');
// The whole reason the demo gets its own container. If this check ever fails,
// a live ad account is being fed by a public showcase page.
const vendorCalls = outbound.filter((u) =>
  /googletagmanager\.com|connect\.facebook\.net|facebook\.com\/tr|google-analytics\.com/.test(u));
check('no tracking vendor was contacted', vendorCalls.length === 0, vendorCalls.join('\n       '));
check('nothing else was contacted either', outbound.length === 0, outbound.join('\n       '));
check('and no tag object was created', await page.evaluate(() =>
  typeof window.fbq === 'undefined' && typeof window.gtag === 'undefined'));

console.log('== the tracking page is honest about that ==');
await page.goto(`${SITE}/#/tracking`, { waitUntil: 'domcontentloaded' });
const tracking = await page.locator('main').textContent();
check('all four surfaces are listed', ['Google Analytics 4', 'Google Tag Manager', 'Meta Pixel', 'Conversions API']
  .every((s) => tracking.includes(s)), tracking.slice(0, 160));
check('and each reports not set', (await page.locator('.pill.warn').count()) >= 4);

console.log('== nothing threw ==');
check('no page errors', errors.length === 0, errors.join('\n       '));

await browser.close();
console.log(`\npassed: ${pass}   failed: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
