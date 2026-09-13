/**
 * The demo hub must not measure anyone who has not said yes.
 *
 * This is the test that has teeth, because the failure it guards against is
 * invisible by inspection: consent code that *looks* right but runs after the
 * tags have already fired has collected the data and then asked permission.
 * So the checks watch the network — if a beacon reaches Google or Meta before
 * the banner is answered, the test fails no matter what the source says.
 *
 * It also pins the thing the hub exists to answer: whether a visitor arrived
 * from an ad or found the demos on their own. Organic and ads go through one
 * code path and are separated by `traffic_type`, and that value has to survive
 * the visitor clicking deeper into the site — otherwise every page after the
 * first is credited to nobody.
 *
 *   node tests/hub-tracking.mjs [siteDir]
 *
 * Set CHROMIUM_PATH if Playwright's bundled browser is not installed.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const siteDir = resolve(process.argv[2] || 'site');
const port = 4187;
const BASE = `http://127.0.0.1:${port}`;

if (!existsSync(join(siteDir, 'index.html'))) {
  console.error(`No built hub at ${siteDir} — run \`npm run build:demo-hub\` first.`);
  process.exit(1);
}

let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${String(detail).slice(0, 300)}` : ''}`); }
};

const server = spawn('python3', ['-m', 'http.server', String(port), '--directory', siteDir], { stdio: 'ignore' });
const stop = () => { try { server.kill(); } catch { /* already gone */ } };
process.on('exit', stop);
await new Promise((r) => setTimeout(r, 900));

const launch = { args: ['--no-sandbox'] };
if (process.env.CHROMIUM_PATH) launch.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launch);

/** A fresh context per case: consent lives in localStorage, and a leaked
 *  "yes" from an earlier case would make every later one pass for free. */
const fresh = () => browser.newContext({ viewport: { width: 1280, height: 900 } });

const VENDOR = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|facebook\.(com|net)/;
/** A loaded library is not a sent event. Only these URLs carry data out. */
const isBeacon = (url) => /\/collect|\/g\/collect|facebook\.com\/tr/.test(url);

function watchWire(page) {
  const hits = [];
  page.on('request', (r) => { if (VENDOR.test(r.url())) hits.push(r.url()); });
  return { all: hits, beacons: () => hits.filter(isBeacon) };
}

console.log('== nothing is measured before the banner is answered ==');
{
  const ctx = await fresh();
  const page = await ctx.newPage();
  const wire = watchWire(page);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  check('the banner appears', (await page.locator('#hub-consent').count()) === 1);
  check('no beacon reached Google or Meta', wire.beacons().length === 0, wire.beacons().slice(0, 3).join('\n       '));
  const state = await page.evaluate(() => ({
    consent: window.hubTrack.consent(),
    consentCalls: (window.dataLayer || []).filter((e) => e && e[0] === 'consent').map((e) => [e[1], e[2] && e[2].analytics_storage]),
  }));
  check('consent starts unanswered', state.consent === null, JSON.stringify(state.consent));
  check('Consent Mode defaults to denied', JSON.stringify(state.consentCalls).includes('["default","denied"]'), JSON.stringify(state.consentCalls));
  await ctx.close();
}

console.log('\n== declining is honoured, not worked around ==');
{
  const ctx = await fresh();
  const page = await ctx.newPage();
  const wire = watchWire(page);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1700);
  await page.click('#hub-consent [data-consent="no"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  check('the banner closes', (await page.locator('#hub-consent').count()) === 0);
  check('still no beacon after scrolling the whole page', wire.beacons().length === 0, wire.beacons().slice(0, 3).join('\n       '));
  check('the refusal is remembered', (await page.evaluate(() => window.hubTrack.consent())) === false);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  check('and the banner does not ask again', (await page.locator('#hub-consent').count()) === 0);
  await ctx.close();
}

console.log('\n== accepting releases what was held, with the right parameters ==');
{
  const ctx = await fresh();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1700);
  // Wrap gtag rather than reading the dataLayer: this is the call the tracker
  // makes, and wrapping it proves the event was sent, not merely queued.
  await page.evaluate(() => {
    window.__sent = [];
    const original = window.gtag;
    window.gtag = function () {
      if (arguments[0] === 'event') window.__sent.push([arguments[1], arguments[2]]);
      return original.apply(this, arguments);
    };
  });
  await page.click('#hub-consent [data-consent="yes"]');
  await page.waitForTimeout(700);
  const names = await page.evaluate(() => window.__sent.map((e) => e[0]));
  check('the page_view held during the ask is released', names.includes('page_view'), JSON.stringify(names));
  check('the grant itself is recorded', names.includes('consent_granted'), JSON.stringify(names));
  const pv = await page.evaluate(() => (window.__sent.find((e) => e[0] === 'page_view') || [])[1] || {});
  check('every event is stamped site_section=demo-hub', pv.site_section === 'demo-hub', JSON.stringify(pv));
  check('every event carries traffic_type', typeof pv.traffic_type === 'string' && pv.traffic_type.length > 0, JSON.stringify(pv));
  check('every event carries an event_id for deduplication', typeof pv.event_id === 'string' && pv.event_id.length > 5, JSON.stringify(pv));
  await ctx.close();
}

console.log('\n== organic and ads go through one path and stay apart ==');
for (const [label, url, expected] of [
  ['an ad click carrying fbclid', '/?fbclid=IwAR_test123', 'ads'],
  ['a utm_medium=cpc link', '/?utm_source=google&utm_medium=cpc&utm_campaign=demo', 'ads'],
  ['a plain visit with no referrer', '/', 'direct'],
  ['a referral from the portfolio', '/?utm_source=portfolio&utm_medium=referral', 'organic'],
]) {
  const ctx = await fresh();
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  const attr = await page.evaluate(() => window.hubTrack.attribution());
  check(`${label} → ${expected}`, attr.traffic_type === expected, JSON.stringify(attr));
  if (url.includes('fbclid')) {
    check("  fbc is built in Meta's fb.1.<ts>.<id> shape", /^fb\.1\.\d+\.IwAR_test123$/.test(attr.fbc), attr.fbc);
  }
  await page.goto(`${BASE}/d/smartgadget-demo/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => window.hubTrack.attribution());
  check(`  it survives a click deeper into the hub`, after.traffic_type === expected, JSON.stringify(after));
  await ctx.close();
}

console.log('\n== a viewer page knows which demo it is showing ==');
{
  const ctx = await fresh();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/d/smartgadget-demo/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1100);
  const info = await page.evaluate(() => window.hubTrack.page);
  check('page_type is demo_viewer', info.page_type === 'demo_viewer', JSON.stringify(info));
  check('demo_slug comes from the path', info.demo_slug === 'smartgadget-demo', JSON.stringify(info));
  await ctx.close();
}

console.log('\n== the hub no longer borrows the campaign page\'s script ==');
{
  const ctx = await fresh();
  const page = await ctx.newPage();
  const external = [];
  page.on('request', (r) => {
    const u = r.url();
    if (/ads-track\.js|sayadbayezid\.com\/ads\//.test(u)) external.push(u);
  });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  check('ads-track.js is not loaded here', external.length === 0, external.join(', '));
  await ctx.close();
}

await browser.close();
stop();
console.log(`\npassed: ${pass}   failed: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
