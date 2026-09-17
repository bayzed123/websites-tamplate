/**
 * Ratings and comments on the demos, driven in a real browser.
 *
 * WHAT THESE CHECKS ARE PROTECTING.
 * Three things, and none of them are "does the star turn gold".
 *
 *   1. A comment box on a sales page is a liability unless nothing appears
 *      without being read first. So the checks confirm a posted comment does
 *      NOT show up, and that the visitor is told why.
 *   2. A comment body is a string a stranger typed which then gets rendered
 *      under sayadbayezid.com's own domain. One check posts a script tag and
 *      confirms it stays text.
 *   3. The framed viewer (/d/<slug>/) and the raw demo (/demos/<slug>/) are
 *      one project. If they ever became two rating tallies the numbers on the
 *      cards would silently halve.
 *
 * And one that is easy to skip and matters commercially: a demo nobody has
 * rated shows NO rating, not "0.0". A zero reads as a bad demo.
 *
 *   # the API, from the bayezid-agency-worker checkout
 *   npx wrangler dev --local --port 8787 &
 *
 *   node scripts/build-demo-hub.mjs site
 *   cd site && python3 -m http.server 8904 &
 *
 *   CHROMIUM_PATH=... node tests/demo-feedback.mjs
 */
import { chromium } from 'playwright';
import { statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:8904';
const API_HOST = 'https://bayezid-agency-api.sayadmdbayezidhosan.workers.dev';
const LOCAL_API = process.env.LOCAL_API || 'http://127.0.0.1:8787';
const WORKER_DIR = process.env.WORKER_DIR || '../bayezid-agency-worker';
const SLUG = process.env.DEMO_SLUG || 'sidra-clothing';

let pass = 0, fail = 0;
const ok = (label, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? `\n       ${detail}` : ''}`); }
};

/* The hub is generated. Running these checks against a site/ older than the
   builder tests the previous build and passes while the change under test
   never executes — the same trap that cost a debugging detour on the
   portfolio's minified assets. */
try {
  if (statSync('scripts/build-demo-hub.mjs').mtimeMs > statSync('site/index.html').mtimeMs) {
    console.error('\nREFUSING TO RUN: site/ is older than scripts/build-demo-hub.mjs.');
    console.error('  node scripts/build-demo-hub.mjs site\n');
    process.exit(2);
  }
} catch {
  console.error('\nNo site/ build found. Run: node scripts/build-demo-hub.mjs site\n');
  process.exit(2);
}

/** Comments are rate-limited to five an hour per author, and ratings are
 *  unique per voter — so without a reset the suite passes five times and then
 *  reports the rate limiter as a bug. Local D1 only. */
function reset() {
  try {
    execFileSync('npx', ['wrangler', 'd1', 'execute', 'bayezid-agency', '--local',
      '--command', 'DELETE FROM content_comments; DELETE FROM content_ratings;'],
      { cwd: WORKER_DIR, stdio: 'ignore' });
  } catch {
    console.log('  note: could not reset the local tables (set WORKER_DIR).');
  }
}

/* --------------------------------------------------------------------------
   The half that needs no backend.

   CI builds the hub but does not run the Worker, so everything below the
   divider would have to be skipped there — and a suite that skips everything
   in CI protects nothing. These checks are about the published markup and CSS,
   which is where the worst bug so far actually lived: the panel was covering
   470px of every viewer and eating the clicks that landed on it, and no API
   was involved in that at all.
   -------------------------------------------------------------------------- */
{
  const { readFileSync } = await import('node:fs');
  const home = readFileSync('site/index.html', 'utf8');
  const viewer = readFileSync(`site/d/${SLUG}/index.html`, 'utf8');

  console.log('\n== the published pages carry the widget ==');
  ok('the home grid loads the script', home.includes('/assets/demo-feedback.js'));
  ok('and every card has a slot for its rating',
    (home.match(/data-demo-rating="/g) || []).length >= 5,
    `found ${(home.match(/data-demo-rating="/g) || []).length}`);
  ok('the viewer loads it too', viewer.includes('/assets/demo-feedback.js'));
  ok('and offers a way to rate', viewer.includes('data-demo-feedback='));

  // The regression that cost the most. Without this rule display:flex beats
  // the hidden attribute and the panel is open on every page load.
  ok('a hidden panel is actually hidden',
    /\.df-panel\[hidden\][^}]*display:\s*none\s*!important/.test(viewer),
    'the [hidden] override is missing from the viewer stylesheet');

  ok('the honeypot is off-screen, not display:none',
    /\.df-hp\{[^}]*left:-9999px/.test(viewer),
    'a bot that skips display:none fields walks past a honeypot it cannot see');
}

if (!(await fetch(`${LOCAL_API}/api/console/health`).then((r) => r.ok).catch(() => false))) {
  console.log('\n  skip the rating and comment checks need the Worker running:');
  console.log('       cd ../bayezid-agency-worker && npx wrangler dev --local --port 8787');
  console.log(`\n${pass} passed, ${fail} failed, backend checks skipped`);
  process.exit(fail ? 1 : 0);
}

// Only now, with the Worker confirmed up. Calling it earlier would run
// `npx wrangler` in CI, where wrangler is not installed and npx would try to
// fetch it — a test that reaches the network to set up a check it is about to
// skip.
reset();

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  // Playwright will not rewrite https -> http, so proxy in Node and fulfil.
  await ctx.route(`${API_HOST}/**`, async (route) => {
    const req = route.request();
    try {
      const upstream = await fetch(req.url().replace(API_HOST, LOCAL_API), {
        method: req.method(),
        headers: { ...req.headers(), host: '127.0.0.1:8787' },
        body: ['GET', 'HEAD'].includes(req.method()) ? undefined : req.postData(),
      });
      const headers = Object.fromEntries(upstream.headers.entries());
      headers['access-control-allow-origin'] = '*';
      headers['access-control-allow-headers'] = 'content-type';
      headers['access-control-allow-methods'] = 'GET,POST,OPTIONS';
      delete headers['content-encoding'];
      delete headers['content-length'];
      await route.fulfill({ status: upstream.status, headers, body: Buffer.from(await upstream.arrayBuffer()) });
    } catch { await route.abort(); }
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, page, errors };
}

console.log('\n== an unrated demo shows no rating, not a zero ==');
{
  const { ctx, page } = await newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const slot = page.locator(`[data-demo-rating="${SLUG}"]`);
  ok('the card has a place for one', await slot.count() === 1);
  ok('and it is empty while nobody has rated it', !(await slot.isVisible()));
  const grid = await page.locator('.card-top').first().innerText();
  ok('no card is showing 0.0', !/0\.0/.test(grid), grid);
  await ctx.close();
}

console.log('\n== rating a demo from the viewer ==');
const { ctx, page, errors } = await newPage();
await page.goto(`${BASE}/d/${SLUG}/`, { waitUntil: 'networkidle' });

ok('the viewer offers a way to rate', await page.locator('[data-demo-feedback]').count() === 1);
await page.click('[data-demo-feedback]');
await page.waitForTimeout(700);
ok('the panel opens', await page.locator('.df-panel').isVisible());
ok('it says nobody has rated yet',
  /first/i.test(await page.locator('.df-summary').innerText()),
  await page.locator('.df-summary').innerText());

await page.locator('.df-star').nth(3).click();   // four stars
await page.waitForTimeout(900);
const summary = await page.locator('.df-summary').innerText();
ok('the rating registers', /4\.0 out of 5/.test(summary), summary);
ok('and is acknowledged', /thanks/i.test(summary), summary);

console.log('\n== the framed and raw paths are one demo, not two ==');
{
  const engagement = await page.evaluate(async (host) => {
    const get = (t) => fetch(`${host}/api/engagement?target=${encodeURIComponent(t)}`).then((r) => r.json());
    return { framed: await get(`/d/${location.pathname.split('/')[2]}/`), raw: await get(location.pathname.replace('/d/', '/demos/')) };
  }, API_HOST);
  ok('the framed path reports the rating', engagement.framed.rating.count === 1,
    JSON.stringify(engagement.framed.rating));
  ok('and so does the raw path — same row', engagement.raw.rating.count === 1,
    JSON.stringify(engagement.raw.rating));
  ok('both normalize to the same target', engagement.framed.target === engagement.raw.target,
    `${engagement.framed.target} vs ${engagement.raw.target}`);
}

console.log('\n== a comment is held, and never rendered as markup ==');
const XSS = '<img src=x onerror="window.__pwned=1">';
await page.fill('.df-form input[name="name"]', 'Probe Visitor');
await page.fill('.df-form textarea[name="body"]', `Does this ship with the admin? ${XSS}`);
await page.click('.df-submit');
await page.waitForTimeout(1200);

const status = await page.locator('.df-status').innerText();
ok('the visitor is told it was received', /approved|thanks/i.test(status), status);
ok('and told it will not appear straight away', /approv/i.test(status), status);
ok('the comment is NOT on the page', !(await page.locator('.df-list').innerText()).includes('Does this ship'));
ok('nothing was executed', !(await page.evaluate(() => window.__pwned)));

// Approve it server-side, reload, and confirm it renders — as text.
try {
  execFileSync('npx', ['wrangler', 'd1', 'execute', 'bayezid-agency', '--local',
    '--command', "UPDATE content_comments SET approved = 1;"], { cwd: WORKER_DIR, stdio: 'ignore' });
} catch { /* reported below by the check failing */ }

await page.reload({ waitUntil: 'networkidle' });
await page.click('[data-demo-feedback]');
await page.waitForTimeout(900);
const listText = await page.locator('.df-list').innerText();
ok('once approved, it appears', listText.includes('Does this ship'), listText.slice(0, 200));
ok('with the tag shown as text, not run', listText.includes('<img src=x'), listText.slice(0, 200));
ok('and still nothing executed', !(await page.evaluate(() => window.__pwned)));
ok('no stray image element was created from it',
  (await page.locator('.df-comment img').count()) === 0);

console.log('\n== and now the card shows the rating ==');
{
  const { ctx: c2, page: p2 } = await newPage();
  await p2.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(1200);
  const slot = p2.locator(`[data-demo-rating="${SLUG}"]`);
  ok('the card picks it up', await slot.isVisible());
  const text = await slot.innerText();
  ok('showing the average and the count', /4\.0/.test(text) && /\(1\)/.test(text), text);
  await c2.close();
}

console.log('\n== nothing threw ==');
ok('no page errors', errors.length === 0, errors.join('\n       '));

await ctx.close();
await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
