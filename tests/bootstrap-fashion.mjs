/**
 * The Bootstrap Fashion demo has to survive being clicked by a prospect.
 *
 * Three things it shipped with, each of which a visitor hits in the first
 * minute: every product on every page was one of nine Nike shoes (the vendor's
 * sample data, with Nike's own names); the checkout offered one country, so
 * nobody outside the United States could complete it; and no form anywhere
 * marked which fields were required.
 *
 * The image checks exist because a data-only check cannot see that a photo of
 * a nightclub has been captioned "Linen Overshirt" — that one was found by
 * looking at the rendered grid, and the assertions here are what keep the
 * corrected pairings from drifting back.
 *
 *   node tests/bootstrap-fashion.mjs [siteDir]
 *
 * Set CHROMIUM_PATH if Playwright's bundled browser is not installed.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const siteDir = resolve(process.argv[2] || 'site');
if (!existsSync(join(siteDir, 'demos', 'bootstrap-fashion', 'index.html'))) {
  console.error(`No built demo at ${siteDir} — run \`npm run build:demo-hub\` first.`);
  process.exit(1);
}
const PORT = 4190;
const BASE = `http://127.0.0.1:${PORT}`;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', siteDir], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch { /* gone */ } });
await new Promise((r) => setTimeout(r, 900));
const D = `${BASE}/demos/bootstrap-fashion`;
const PH = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600"><rect width="1200" height="1600" fill="#d9d4cd"/></svg>');
const launch = { args: ['--no-sandbox'] };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launch);
let bad = 0;
const check = (n, c, d='') => { if (c) console.log(`  ok   ${n}`); else { bad++; console.log(`  FAIL ${n}${d?`\n       ${d}`:''}`); } };

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route('**/*', (r) => {
  const u = r.request().url();
  if (/images\.unsplash\.com/.test(u)) return r.fulfill({ status: 200, contentType: 'image/svg+xml', body: PH });
  if (/fonts\.(gstatic|googleapis)|googletagmanager|facebook/.test(u)) return r.abort();
  return r.continue();
});

console.log('== the catalogue is no longer nine Nike shoes ==');
await page.goto(`${D}/category.html`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const cat = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.card-body a.link-cover')].map(a => a.textContent.trim());
  const imgs = [...document.querySelectorAll('.card-img img')].map(i => (i.getAttribute('src')||'').split('/').pop());
  const alts = [...document.querySelectorAll('.card-img img')].map(i => i.getAttribute('alt')||'');
  const broken = [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
  return { cards, distinctImgs: [...new Set(imgs)].length, imgs, emptyAlt: alts.filter(a=>!a).length, broken };
});
check(`${cat.cards.length} product(s) on the category page`, cat.cards.length === 9, JSON.stringify(cat.cards));
check('no product is named Nike', !cat.cards.some(t => /nike|jordan|vapormax|air force/i.test(t)), cat.cards.filter(t=>/nike/i.test(t)).join(', '));
check(`${cat.distinctImgs} distinct image(s), not one repeated`, cat.distinctImgs === 9, cat.imgs.join(', '));
check('not every image is a shoe photo', cat.imgs.filter(i=>i.startsWith('product-')).length < cat.imgs.length, cat.imgs.join(', '));
check('every product image has alt text', cat.emptyAlt === 0, `${cat.emptyAlt} empty`);
check('no broken image', cat.broken.length === 0, cat.broken.join(', '));

console.log('\n== forms are completable ==');
for (const [p, wantCountries] of [['checkout.html', true], ['checkout-payment.html', false], ['login.html', false], ['register.html', false], ['forgotten-password.html', false]]) {
  await page.goto(`${D}/${p}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  const f = await page.evaluate(() => {
    const req = [...document.querySelectorAll('input[required],select[required]')];
    const marks = document.querySelectorAll('label .text-danger').length;
    const labelled = req.filter(el => el.id && document.querySelector(`label[for="${el.id}"]`));
    const unmarked = labelled.filter(el => !document.querySelector(`label[for="${el.id}"] .text-danger`)).map(el => el.id);
    const countries = [...document.querySelectorAll('select#country option')].length;
    return { req: req.length, marks, unmarked, countries };
  });
  check(`${p}: ${f.req} required field(s), ${f.marks} marked, none missed`, f.unmarked.length === 0, f.unmarked.join(', '));
  if (wantCountries) check(`  and ${f.countries - 1} countries to pick from`, f.countries > 150, String(f.countries));
}

console.log('\n== the hub card sells it ==');
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
const card = await page.evaluate(() => {
  const a = [...document.querySelectorAll('article.card')].find(c => /Bootstrap Fashion/.test(c.textContent));
  if (!a) return null;
  return { price: a.querySelector('.price')?.textContent.trim(), highlights: [...a.querySelectorAll('.highlights li')].length };
});
check('the card shows a price', !!card && /\$100/.test(card.price), JSON.stringify(card));
check(`and ${card?.highlights} features a client can read`, (card?.highlights||0) >= 6, JSON.stringify(card));

await browser.close();
try { server.kill(); } catch { /* gone */ }
console.log(bad ? `\n${bad} FAILED` : '\nall good');
process.exit(bad ? 1 : 0);
