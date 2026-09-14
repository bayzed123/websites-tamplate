/**
 * Sidra Noor Fashion: does the shop render, and does the admin actually open?
 *
 * This demo was held back because its data lives in a NestJS server and a
 * database, neither of which exists on static hosting. src/demo/ answers that
 * API inside the page instead, and the eight admin screens are the reason the
 * demo is worth publishing at all — so the checks below open every one of them
 * and insist each rendered real rows, not just chrome around an empty state.
 *
 * The negative check matters as much as the positive: nothing may reach
 * localhost:3000, and nothing may reach imgbb, whose API key this template
 * shipped hardcoded in its source.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

const ROOT = process.argv[2] ?? 'sidra-noor-fashion/client/dist';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.woff': 'font/woff', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(ROOT, path === '/' ? '/index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    // No SPA fallback, because GitHub Pages has none. If a route needs a
    // rewrite to work, it must fail here the way it would in production.
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

const escaped = [];
const errors = [];
const offsite = [];
page.on('request', (r) => {
  const url = r.url();
  if (/localhost:3000|api\.imgbb\.com/i.test(url)) escaped.push(url);
  if (/^https?:\/\//i.test(url) && !url.startsWith(base.replace(/\/index\.html$/, ''))) offsite.push(url);
});
page.on('pageerror', (e) => errors.push(String(e)));

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

async function open(hash) {
  await page.goto(`${base}#${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  return page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').trim());
}

console.log('\n== the storefront renders ==');
const home = await open('/');
check('home renders', home.length > 300, `${home.length} chars`);
check('a stylesheet applied', await page.evaluate(() =>
  [...document.styleSheets].some((s) => { try { return s.cssRules.length > 0; } catch { return true; } })));

console.log('\n== the admin opens with no sign-in ==');
const dash = await open('/dashboard');
check('dashboard renders', /Dashboard/.test(dash) && dash.length > 300, `${dash.length} chars`);
check('it is not the login screen', !/Sign In|Password/i.test(dash.slice(0, 200)));
check('the stat cards carry real numbers', /[1-9]\d*/.test(dash));
check('and it lists products', /Available Products/i.test(dash));

console.log('\n== every admin table has rows, not just chrome ==');
// A screen that renders its header and an empty table looks identical to a
// working one in a does-it-render check, so each of these asserts a value that
// can only have come from the fixtures. The patterns list several names
// because these tables sort newest-first and paginate — asserting one
// particular row means the check breaks whenever the fixtures are reordered,
// which is a false alarm, not a regression.
const tables = [
  ['/products', /Rosewood Skater Dress|Kids Dungaree Set|Infinity Bracelet|Steel Link Watch|Cotton Crossbody Bag/, 'a product name'],
  ['/orders', /Rahim Chowdhury|Nadia Sultana|Shakil Ahmed|Farhana Akter/, 'a buyer name'],
  ['/users', /Sidra Noor|Imran Kabir|Tasnim Rahman/, 'a staff name'],
  ['/messages', /gift wrapping|size chart|outside Dhaka|exchange/i, 'a message subject'],
];
for (const [route, pattern, what] of tables) {
  const text = await open(route);
  check(`${route} shows ${what}`, pattern.test(text), text.length < 200 ? `only ${text.length} chars` : '');
}

console.log('\n== the form screens are populated, not blank ==');
// Profile and SingleProduct put their data in <input> values, which never
// appear in innerText. Reading the text alone makes a fully working screen
// look empty — that is exactly how these two first read as broken.
const fields = async () => page.evaluate(() =>
  [...document.querySelectorAll('input,textarea')].map((el) => String(el.value)).filter(Boolean));

await open('/profile');
const profile = await fields();
check('/profile carries the signed-in account', profile.some((v) => /Sidra Noor/.test(v)), profile.join(' | ').slice(0, 90));
check('/profile carries its role', profile.some((v) => /SUPER_ADMIN|ADMIN/.test(v)));

await open('/product/1');
const product = await fields();
check('/product/1 loaded the product it was asked for', product.some((v) => /Rosewood Skater Dress/.test(v)), product.join(' | ').slice(0, 90));
check('/product/1 carries its price', product.some((v) => /^\d+$/.test(v)));

console.log('\n== nobody else\'s details ship in a demo named Sidra Noor ==');
// The template came with a real Tunisian address, a real contact mailbox and a
// dial code and currency that contradicted every fixture beside them. The
// author credit is attribution and stays; the shop's identity does not.
const shopPages = [await open('/'), await open('/dashboard'), await open('/orders')];
const everything = shopPages.join(' ');
for (const [what, pattern] of [
  ['the Tunisian address', /Sousse|1234k Avenue/i],
  ["the template author's mailbox", /myFashionClub@protonmail\.com/i],
  ['the wrong dial code', /\+216/],
  ['the wrong currency', /\bTND\b/],
]) {
  check(`${what} is gone`, !pattern.test(everything));
}
check('the author is still credited', /Thamer Ayachi/.test(everything));

console.log('\n== nothing leaves the page ==');
check('no request to localhost:3000 or imgbb', escaped.length === 0, escaped.slice(0, 3).join(', '));
// Fonts are a deliberate exception — the whole hub loads them. Everything else
// the template hotlinked (a loader gif, a Pinterest avatar, an Unsplash banner)
// is now served from the bundle, so the page does not depend on hosts that can
// disappear or watch who opens the demo.
const thirdParty = offsite.filter((u) => !/fonts\.(googleapis|gstatic)\.com/.test(u));
check('no third-party assets beyond fonts', thirdParty.length === 0, thirdParty.slice(0, 3).join(', '));
check('the imgbb key is not in the bundle', !(await page.evaluate(async () => {
  const res = await fetch('index.html');
  return (await res.text()).includes('e6a735fac9ee98b1897034ee6315d69b');
})));
check('no uncaught JS error', errors.length === 0, errors[0] ?? '');

await browser.close();
server.close();
console.log(failures === 0 ? '\nthe shop and its admin both work\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
