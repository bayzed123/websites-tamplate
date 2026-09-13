/**
 * The Sidra Clothing demo has to work with no server behind it.
 *
 * It was written against `json-server --watch src/data/db.json --port 8080`:
 * twenty call sites hit http://localhost:8080 directly. Published, there is no
 * such server, and every screen rendered empty — which is what the deploy's own
 * preview check caught. src/demo/ answers those requests inside the page.
 *
 * Two failures this pins that are easy to reintroduce:
 *  - the fixture server must install BEFORE App.jsx creates the router, or the
 *    landing loader fires a real request and only the home page breaks;
 *  - the router must be a hash router, or at a nested static path react-router
 *    renders its own 404 instead of the shop.
 *
 *   node tests/sidra-clothing.mjs [distDir]
 *
 * Set CHROMIUM_PATH if Playwright's bundled browser is not installed.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const distDir = resolve(process.argv[2] || 'sidra-clothing/dist');
if (!existsSync(join(distDir, 'index.html'))) {
  console.error(`No build at ${distDir} — run \`npm run build:sidra-clothing\` first.`);
  process.exit(1);
}
const PORT = 4195;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', distDir], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch { /* gone */ } });
await new Promise((r) => setTimeout(r, 900));
const launch = { args: ['--no-sandbox'] };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launch);
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [], escaped = [];
page.on('pageerror', (e) => errs.push(e.message));
page.on('request', (r) => { const u = r.url(); if (!u.startsWith(BASE) && !/asos-media|data:|blob:/.test(u)) escaped.push(u); });
// The ASOS CDN is blocked here; stand in so layout is measurable.
const PH = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#e8e4de"/></svg>');
await page.route('**/*', (r) => /asos-media/.test(r.request().url())
  ? r.fulfill({ status: 200, contentType: 'image/svg+xml', body: PH }) : r.continue());

let bad = 0;
const check = (n, c, d='') => { if (c) console.log(`  ok   ${n}`); else { bad++; console.log(`  FAIL ${n}${d?`\n       ${d}`:''}`); } };

await page.goto(`${BASE}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const home = await page.evaluate(() => ({
  text: document.body.innerText.replace(/\s+/g,' ').trim().length,
  products: document.querySelectorAll('a[href*="/product/"], .selected-products-grid > *').length,
  styled: getComputedStyle(document.body).backgroundColor,
  sheets: document.styleSheets.length,
  title: document.title,
}));
console.log('== the home page renders ==');
check(`${home.text} characters of text (was 0)`, home.text > 400, JSON.stringify(home));
check(`${home.products} products loaded from the in-page server`, home.products >= 8, JSON.stringify(home));
check(`${home.sheets} stylesheet(s) applied`, home.sheets > 0);
check(`title is Sidra, not Kuzma`, /Sidra/.test(home.title) && !/Kuzma/i.test(home.title), home.title);

console.log('\n== the shop and a product page work ==');
await page.goto(`${BASE}/index.html#/shop`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const shop = await page.evaluate(() => document.body.innerText.replace(/\s+/g,' ').trim().length);
check(`shop renders (${shop} chars)`, shop > 400);

const card = page.locator('a[href*="/product/"]').first();
if (await card.count()) {
  await card.click();
  await page.waitForTimeout(2500);
  const prod = await page.evaluate(() => ({ len: document.body.innerText.replace(/\s+/g,' ').trim().length, url: location.href }));
  check(`product page renders (${prod.len} chars)`, prod.len > 400, prod.url);
} else { check('a product link exists to click', false); }

console.log('\n== nothing reaches a server that does not exist ==');
check('no request escaped to localhost:8080 or elsewhere', escaped.length === 0, [...new Set(escaped)].slice(0,4).join('\n       '));
check('no uncaught JS error', errs.length === 0, errs.slice(0,2).join(' | '));
await browser.close();
try { server.kill(); } catch { /* gone */ }
console.log(bad ? `\n${bad} FAILED` : '\nall good');
process.exit(bad ? 1 : 0);
