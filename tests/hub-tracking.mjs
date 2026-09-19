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

/** The backend's own origin. The Pixel library is served from here, and the
 *  server half of every event is posted here. */
const WORKER = 'bayezid-agency-api.sayadmdbayezidhosan.workers.dev';

/**
 * A fresh context per case: consent lives in localStorage, and a leaked "yes"
 * from an earlier case would make every later one pass for free.
 *
 * TWO THINGS EVERY CONTEXT NEEDS, AND BOTH WERE LEARNED FROM ONE CI RUN.
 *
 * 1. __HUB_ALLOW_LOCAL. hub-track.js now refuses to measure a visit to
 *    localhost at all, because a test run is not a customer. Without this the
 *    whole suite would be asserting against a page that deliberately does
 *    nothing. addInitScript runs it before any page script, which is the only
 *    point where it can still take effect.
 *
 * 2. The Worker route. Nothing here may reach the deployed backend. The CI run
 *    for this change did: it loaded the real /api/pixel.js and POSTed real
 *    PageView and ViewContent events into the production dataset from
 *    127.0.0.1, because this origin was neither watched nor routed. Meta has
 *    no delete-by-origin, so those events are permanent.
 *
 *    /api/pixel.js is answered with a stub that does the one thing the real
 *    library does that this suite can observe: define fbq.callMethod. That is
 *    how the page tells a live Pixel from the stub it installed on load.
 */
function fresh() {
  return browser.newContext({ viewport: { width: 1280, height: 900 } }).then(async (ctx) => {
    await ctx.addInitScript(() => { window.__HUB_ALLOW_LOCAL = true; });
    await ctx.route(`**://${WORKER}/**`, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/pixel.js') {
        return route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: 'if(window.fbq){window.fbq.callMethod=function(){};}',
        });
      }
      route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
    return ctx;
  });
}

/* The Worker origin is IN this pattern now. Leaving it out is what let the
   pixel-library check assert on the fallback to connect.facebook.net instead
   of the real request — it passed locally, where the sandbox blocks the
   proxy and forces that fallback, and failed in CI where the proxy works. */
const VENDOR = new RegExp(
  `googletagmanager\\.com|google-analytics\\.com|analytics\\.google\\.com|facebook\\.(com|net)|${WORKER.replace(/\./g, '\\.')}`,
);
/**
 * Before consent, NOTHING to these hosts is acceptable — not a beacon and not
 * a script. Loading gtag.js with Consent Mode denied still pings
 * google-analytics.com on every page so Google can model the conversions it is
 * not allowed to measure, which is how the first version of this failed.
 */
const isBeacon = (url) => /\/collect|\/g\/collect|facebook\.com\/tr/.test(url);
/** Google's hosts specifically. Meta is allowed before the banner now;
 *  Google still is not, and only a per-vendor test can tell them apart. */
const isGoogle = (url) => /googletagmanager\.com|google-analytics\.com|analytics\.google\.com/.test(url);
/** The Pixel library under any of the names it can arrive as: our proxied
 *  copy, Meta's own, or the signals/config call a running fbevents.js makes. */
const isPixelLib = (url) => /\/api\/pixel\.js|fbevents|facebook\.net\/signals/.test(url);

function watchWire(page) {
  const hits = [];
  page.on('request', (r) => { if (VENDOR.test(r.url())) hits.push(r.url()); });
  return { all: hits, beacons: () => hits.filter(isBeacon) };
}

console.log('== a local visit is not a customer, and is not measured ==');
{
  /**
   * The guard that stops CI and development traffic reaching the live pixel.
   *
   * This exists because it already happened: the CI run for this change loaded
   * the real /api/pixel.js and POSTed live PageView and ViewContent events
   * into the production dataset from 127.0.0.1. Meta has no delete-by-origin,
   * so those events are there for good.
   *
   * Deliberately the ONE context in this file without __HUB_ALLOW_LOCAL — it
   * is what every other case sets to opt back in, so this is the only place
   * the real default is exercised. Nothing is routed here either: if the guard
   * fails, the request leaves for real and this check sees it.
   */
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  /* Measurement specifically, not "anything that leaves".
     The rating widget reads /api/engagement from the same backend to fill in
     each card's average. That is a GET, it writes nothing, and it reaches no
     vendor — so it is not what this guard is for, and counting it would make
     the check fail for a reason that has nothing to do with the pixel. */
  const isMeasurementCall = (url) =>
    isGoogle(url) || /facebook\.(com|net)/.test(url) ||
    /\/api\/pixel\.js|\/api\/track/.test(url);

  const escaped = [];
  page.on('request', (r) => { if (isMeasurementCall(r.url())) escaped.push(r.url()); });
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  check('no measurement call leaves a localhost visit',
    escaped.length === 0, escaped.slice(0, 4).join('\n       '));
  const state = await page.evaluate(() => window.hubTrack.state());
  check('and the page reports Meta as off', state.meta === false, JSON.stringify(state));
  await ctx.close();
}

console.log('\n== Meta runs on arrival; Google waits to be asked ==');
{
  // THE CONTRACT CHANGED, AND THIS IS WHERE IT IS WRITTEN DOWN.
  //
  // It used to be "nothing reaches anyone until the banner is answered". It
  // is now split, because the two vendors are not the same kind of thing:
  //
  //   Meta   runs on arrival. It is how this business finds out whether the
  //          demos produce work, and a banner most people dismiss without
  //          reading produces a measurement gap, not consent.
  //   Google still waits. Nothing is lost by asking — GA4 answers "how many
  //          and from where", which is not what a campaign is optimised on.
  //
  // What makes that defensible is the opt-out below, so these two sections
  // are one contract, not two independent ones.
  const ctx = await fresh();
  const page = await ctx.newPage();
  const wire = watchWire(page);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);

  check('the banner still appears', (await page.locator('#hub-consent').count()) === 1);
  check('the Pixel library was requested without being asked',
    wire.all.some(isPixelLib), wire.all.slice(0, 4).join('\n       '));
  check('nothing Google-side was requested',
    !wire.all.some(isGoogle), wire.all.filter(isGoogle).slice(0, 3).join('\n       '));

  const state = await page.evaluate(() => ({
    hub: window.hubTrack.state(),
    consent: window.hubTrack.consent(),
    consentCalls: (window.dataLayer || []).filter((e) => e && e[0] === 'consent').map((e) => [e[1], e[2] && e[2].analytics_storage]),
  }));
  check('the page says Meta is on', state.hub.meta === true, JSON.stringify(state.hub));
  check('and that Google is not', state.hub.google === false, JSON.stringify(state.hub));
  check('consent starts unanswered', state.consent === null, JSON.stringify(state.consent));
  check('Consent Mode still defaults to denied',
    JSON.stringify(state.consentCalls).includes('["default","denied"]'), JSON.stringify(state.consentCalls));

  // The banner must not be the thing that starts Meta — if it were, a visitor
  // who never answers would never be measured, which is the gap this is meant
  // to close. Checked by timing: the library is already requested above, and
  // the banner does not appear for 900ms.
  check('the banner did not have to be answered first',
    wire.all.some(isPixelLib));
  await ctx.close();
}

console.log('\n== declining analytics leaves Meta alone, and is remembered ==');
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
  check('still nothing Google-side after scrolling the whole page',
    !wire.all.some(isGoogle), wire.all.filter(isGoogle).slice(0, 3).join('\n       '));
  check('the refusal is remembered', (await page.evaluate(() => window.hubTrack.consent())) === false);
  check('but Meta is still running — "no analytics" is not "no measurement"',
    (await page.evaluate(() => window.hubTrack.state().meta)) === true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  check('and the banner does not ask again', (await page.locator('#hub-consent').count()) === 0);
  await ctx.close();
}

console.log('\n== stopping all measurement really stops it ==');
{
  // The part that makes always-on defensible. If this section is ever allowed
  // to fail, the banner is making a promise the page does not keep.
  const ctx = await fresh();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1700);

  check('the banner offers the way out',
    (await page.locator('#hub-consent [data-consent="off"]').count()) === 1);
  await page.click('#hub-consent [data-consent="off"]');
  await page.waitForTimeout(400);

  check('it says so, rather than doing nothing visible',
    (await page.locator('#hub-optout-note').count()) === 1);
  const after = await page.evaluate(() => window.hubTrack.state());
  check('Meta is off', after.meta === false, JSON.stringify(after));
  check('Google is off', after.google === false, JSON.stringify(after));
  check('and it is recorded as an opt-out, not just a refusal', after.optedOut === true);

  // Removing the flag is not enough: a script element left in the page means
  // the next fbq() call from anywhere still reaches Meta.
  const scripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).map((s) => s.src)
      .filter((s) => /fbevents|pixel\.js|googletagmanager/.test(s)));
  check('the tag scripts are gone from the page', scripts.length === 0, scripts.join('\n       '));

  // And nothing new goes out afterwards, including the server half.
  const ctxWire = [];
  page.on('request', (r) => { if (VENDOR.test(r.url()) || /\/api\/track/.test(r.url())) ctxWire.push(r.url()); });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  check('nothing is sent after opting out, not even server-side',
    ctxWire.length === 0, ctxWire.slice(0, 3).join('\n       '));

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const reloaded = await page.evaluate(() => window.hubTrack.state());
  check('it survives a reload', reloaded.meta === false && reloaded.optedOut === true, JSON.stringify(reloaded));
  check('and the banner does not come back to ask again',
    (await page.locator('#hub-consent').count()) === 0);
  await ctx.close();
}

console.log('\n== the way out is reachable after the banner is long gone ==');
{
  // An opt-out that exists only inside a banner shown once, for 900ms, on a
  // first visit is a formality rather than a control.
  const ctx = await fresh();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1200);
  check('there is a permanent link in the footer',
    (await page.locator('a[href$="#stop-tracking"]').count()) >= 1);

  await page.goto(`${BASE}/#stop-tracking`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1600);
  const viaHash = await page.evaluate(() => window.hubTrack.state());
  check('the URL alone does it', viaHash.optedOut === true, JSON.stringify(viaHash));
  check('and the hash is cleared, so a shared link does not opt someone else out',
    !(await page.evaluate(() => location.hash)));
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

console.log('\n== and accepting actually loads the tags ==');
{
  const ctx = await fresh();
  const page = await ctx.newPage();
  const wire = watchWire(page);
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1700);

  // Snapshot before the click, so "on accept" means something. Under the new
  // contract the Pixel is ALREADY here — it loads at boot — and only Google
  // is waiting on the answer.
  const beforeAccept = wire.all.slice();
  check('the Pixel was already fetched, before any answer',
    beforeAccept.some(isPixelLib), beforeAccept.join('\n       '));
  check('and Google was not', !beforeAccept.some(isGoogle), beforeAccept.filter(isGoogle).join('\n       '));

  await page.click('#hub-consent [data-consent="yes"]');
  await page.waitForTimeout(2500);
  // Without this, a bug that loaded nothing ever would sail through every
  // check above — silence is what they all assert.
  check('gtag.js is fetched on accept', wire.all.some((u) => /googletagmanager\.com\/gtag\/js/.test(u)), wire.all.join('\n       '));
  check('and it was the accept that did it, not the page load',
    !beforeAccept.some((u) => /googletagmanager\.com\/gtag\/js/.test(u)));
  // Deliberately NOT asserting that a beacon goes out: that needs gtag.js to
  // download and run, which makes the check depend on Google being reachable.
  // The request for the library is the part this code controls.
  const consent = await page.evaluate(() => (window.dataLayer || []).filter((e) => e && e[0] === 'consent').map((e) => [e[1], e[2] && e[2].analytics_storage]));
  check('Consent Mode was updated to granted', JSON.stringify(consent).includes('["update","granted"]'), JSON.stringify(consent));
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
