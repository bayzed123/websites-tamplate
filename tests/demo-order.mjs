/**
 * Ordering from inside a demo.
 *
 * The failure this is written against is not "the button does not open". It is
 * the quieter one: the panel opens, the form submits, the visitor is thanked —
 * and what reached the other end does not say WHICH demo or WHAT they asked
 * for, so the order is worth no more than "someone is interested". Every
 * assertion below reads the request body the page actually sent, or the
 * WhatsApp href it actually built, because that payload is the entire value of
 * this feature.
 *
 * The second thing checked is the popup's rationing. An interruption that
 * fires twice, or fires on arrival, costs more goodwill than the order it
 * might win — so "it appears" and "it does not appear again" are both tests.
 *
 *   node scripts/build-demo-hub.mjs site
 *   CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
 *     node tests/demo-order.mjs site
 *
 * Optional: LOCAL_API=http://127.0.0.1:8787 runs the submit against a real
 * Worker instead of a stub, which is how the end-to-end run is done.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const SITE_DIR = resolve(process.argv[2] || 'site');
const PORT = Number(process.env.PORT || 8914);
const BASE = `http://127.0.0.1:${PORT}`;
const API = 'https://bayezid-agency-api.sayadmdbayezidhosan.workers.dev';
const LOCAL_API = process.env.LOCAL_API || '';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS', m)) : (fail++, console.log('  FAIL', m)); };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.webp': 'image/webp', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(req.url.split('?')[0]);
    if (path.includes('..')) { res.writeHead(400).end(); return; }
    let file = join(SITE_DIR, path);
    if (path.endsWith('/')) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); }
});
await new Promise((r) => server.listen(PORT, '127.0.0.1', r));

/**
 * The site/ directory is a BUILD, and assets/ is the source.
 *
 * Three fixes to assets/demo-order.js were tested against the copy from before
 * them, because the build had not been re-run — the suite reported the old
 * behaviour as a failure of the new code, which is an hour nobody gets back.
 * So: refuse to run against a stale build rather than lie about it.
 */
{
  const source = await readFile('assets/demo-order.js', 'utf8').catch(() => null);
  const built = await readFile(join(SITE_DIR, 'assets/demo-order.js'), 'utf8').catch(() => null);
  if (source !== null && source !== built) {
    console.error('\nassets/demo-order.js has changed since the hub was built.');
    console.error('This suite serves the BUILD, so it would be testing the old file.\n');
    console.error('  node scripts/build-demo-hub.mjs site\n');
    server.close();
    process.exit(1);
  }
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });

/**
 * A page with the order API intercepted.
 *
 * Every POST is recorded in `page.orders` whether it is answered by the stub or
 * forwarded to a real Worker, so the body assertions are identical either way
 * and the end-to-end run checks the same things as the fast one.
 */
async function open(path, { viewport = { width: 1280, height: 860 } } = {}) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.orders = [];
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(String(e)));

  await context.route(`${API}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') {
      page.orders.push(JSON.parse(request.postData() || '{}'));
    }
    if (LOCAL_API) {
      try {
        const upstream = await fetch(request.url().replace(API, LOCAL_API), {
          method: request.method(),
          headers: { 'content-type': 'application/json' },
          body: ['GET', 'HEAD'].includes(request.method()) ? undefined : request.postData(),
        });
        // content-length is dropped deliberately: forwarding a length that no
        // longer matches the body truncates it silently.
        return route.fulfill({
          status: upstream.status,
          headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
          body: await upstream.text(),
        });
      } catch { /* fall through to the stub */ }
    }
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, id: 'stub-order' }),
    });
  });

  await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(350);
  return page;
}

/** What a visitor does within a second of landing. The consent banner owns the
 *  bottom of the screen at z-index 9999, so until it is answered it sits on
 *  top of the order popup — see whenNothingElseIsAsking() in demo-order.js. */
async function answerConsent(page) {
  // The banner is injected by a deferred script a second or so after load, so
  // this waits for it rather than checking once and finding nothing: a silent
  // no-op here leaves the banner up, and the popup correctly refuses to appear
  // underneath it for the rest of the test.
  await page.waitForSelector('#hub-consent [data-consent="no"]', { timeout: 8000 }).catch(() => {});
  const no = page.locator('#hub-consent [data-consent="no"]');
  if (await no.count()) { await no.click(); await page.waitForTimeout(250); }
}

/** Exit intent: the pointer leaves the document towards the browser chrome. */
const leave = (page) => page.evaluate(() => document.dispatchEvent(
  new MouseEvent('mouseout', { clientY: 2, relatedTarget: null, bubbles: true })));

/* Every field selector below is scoped to `.do-scrim`. demo-feedback.js puts
   its own hidden form — with its own name="name" — on the same page, and an
   unscoped selector silently drives that one instead. */
const SLUG = 'lks-attire-shop';

console.log('\n1. The order button opens a panel offering both doors');
{
  const p = await open(`/d/${SLUG}/`);
  ok(await p.locator('.do-scrim').count() === 0, 'nothing is built until it is asked for');
  await p.click('[data-order-open]');
  await p.waitForSelector('.do-scrim.open', { timeout: 5000 });
  ok(await p.locator('.do-wa').count() === 1, 'there is a WhatsApp door');
  ok(await p.locator('.do-scrim [data-door="form"]').count() === 1, 'and a send-the-details door');
  ok(p.errors.length === 0, `no script errors${p.errors.length ? ': ' + p.errors[0] : ''}`);
  await p.context().close();
}

console.log('\n2. The WhatsApp message is written, and names this demo');
{
  const p = await open(`/d/${SLUG}/`);
  await p.click('[data-order-open]');
  await p.waitForSelector('.do-scrim.open');
  const href = await p.getAttribute('.do-wa', 'href');

  ok(href.startsWith('https://wa.me/8801519601517?text='),
    'click-to-chat with the number, which is the only form that carries text');
  const text = decodeURIComponent(href.split('?text=')[1] || '');
  ok(/Lk's Attire/.test(text), `the message names the demo (${text.slice(0, 48)}…)`);
  ok(text.includes(`/d/${SLUG}/`), 'and carries the demo URL, so the reply has context');
  await p.context().close();
}

console.log('\n3. Ticking a feature rewrites the WhatsApp message too');
{
  const p = await open(`/d/${SLUG}/`);
  await p.click('[data-order-open]');
  await p.waitForSelector('.do-scrim.open');
  const before = await p.getAttribute('.do-wa', 'href');

  // The point of the checklist is that it travels with the person DOWN EITHER
  // DOOR. Ticking three boxes and then choosing WhatsApp used to send a bare
  // "hi" — the brief was collected and thrown away.
  await p.locator('.do-scrim .do-feat').first().click();
  await p.locator('.do-scrim .do-feat').nth(1).click();
  const after = decodeURIComponent((await p.getAttribute('.do-wa', 'href')).split('?text=')[1]);

  ok(before !== after, 'the message changed');
  ok(/I want: .+,/.test(after), `it lists what was ticked (${(after.match(/I want: .*/) || [''])[0].slice(0, 60)})`);
  ok(await p.locator('.do-scrim .do-feat.on').count() === 2, 'and the chips show as selected');
  await p.context().close();
}

console.log('\n4. Submitting sends the demo, the features and the source');
{
  const p = await open(`/d/${SLUG}/`);
  await p.click('[data-order-open]');
  await p.waitForSelector('.do-scrim.open');
  await p.click('.do-scrim [data-door="form"]');
  await p.locator('.do-scrim .do-feat').first().click();
  await p.fill('.do-scrim [name="name"]', 'Rahim Uddin');
  await p.fill('.do-scrim [name="contact"]', '01712345678');
  await p.selectOption('.do-scrim [name="budget"]', { index: 2 });
  await p.fill('.do-scrim [name="note"]', 'Bangla first please.');
  await p.click('.do-scrim .do-submit');
  await p.waitForTimeout(900);

  const sent = p.orders[p.orders.length - 1];
  ok(sent, 'an order was posted');
  ok(sent?.demoSlug === SLUG, `it says which demo (${sent?.demoSlug})`);
  ok(sent?.demoTitle && /Lk's Attire/.test(sent.demoTitle), 'and names it readably');
  ok(Array.isArray(sent?.features) && sent.features.length === 1,
    `the ticked feature travelled (${JSON.stringify(sent?.features)})`);
  ok(sent?.name === 'Rahim Uddin' && sent?.contact === '01712345678', 'with the contact details');
  ok(sent?.budget, `and the budget (${sent?.budget})`);
  ok(sent?.source === 'viewer-bar', `tagged with where it came from (${sent?.source})`);
  ok(sent?.pageUrl?.includes(`/d/${SLUG}/`), 'and the page it was placed on');

  await p.waitForSelector('.do-done', { timeout: 5000 });
  const thanksHref = await p.getAttribute('.do-done .do-wa', 'href');
  ok(decodeURIComponent(thanksHref).includes('I want:'),
    'the thank-you still offers WhatsApp, carrying the same brief');
  await p.context().close();
}

console.log('\n5. A failing API does not strand the visitor');
{
  const p = await open(`/d/${SLUG}/`);
  // Everything about the order can break except the way out: if the form
  // cannot reach the Worker, the person must still be able to reach a human.
  await p.context().route(`${API}/api/demo-order`, (r) =>
    r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"D1 is down."}' }));
  await p.click('[data-order-open]');
  await p.waitForSelector('.do-scrim.open');
  await p.click('.do-scrim [data-door="form"]');
  await p.fill('.do-scrim [name="name"]', 'Karim');
  await p.fill('.do-scrim [name="contact"]', 'karim@example.com');
  await p.click('.do-scrim .do-submit');
  await p.waitForTimeout(700);

  const banner = await p.textContent('.do-msg');
  ok(/D1 is down/.test(banner), `it says what went wrong (${banner.trim().slice(0, 40)}…)`);
  ok(/WhatsApp/.test(banner), 'and points at WhatsApp instead of a dead end');
  ok(await p.locator('.do-wa').isVisible(), 'the WhatsApp door is still there');
  ok(await p.locator('.do-scrim .do-submit').isEnabled(), 'and the form can be retried');
  await p.context().close();
}

console.log('\n6. The popup is rationed');
{
  const p = await open(`/d/${SLUG}/`);
  ok(await p.locator('.do-pop').count() === 0, 'it does not fire on arrival');

  // While the consent banner is up the popup would be unclickable — the banner
  // is full-width at the bottom and sits above it. The banner is injected by a
  // deferred script, so wait for it to actually be on screen before asserting
  // that the popup defers to it; asserting earlier only proves that a popup
  // whose exit-intent trigger has not armed yet has not fired.
  await p.waitForSelector('#hub-consent', { timeout: 6000 });
  await p.waitForTimeout(8200);  // past the dwell floor, so exit intent is live
  await leave(p);
  await p.waitForTimeout(900);
  ok(await p.locator('.do-pop').count() === 0, 'nor while the consent banner is still asking');

  await answerConsent(p);
  await leave(p);
  await p.waitForSelector('.do-pop.open', { timeout: 6000 });
  ok(true, 'it fires when the pointer leaves the page');
  ok(/want this one/i.test(await p.textContent('.do-pop h3')), 'and asks for the order');
  ok(await p.locator('.do-pop [data-pop="chat"]').count() === 1, 'offering the developer too');

  const chat = await p.getAttribute('.do-pop [data-pop="chat"]', 'href');
  ok(decodeURIComponent(chat).includes("Lk's Attire"), 'whose message also names the demo');

  await p.click('.do-pop .do-close');
  await p.waitForTimeout(400);
  ok(await p.locator('.do-pop').count() === 0, 'closing removes it');

  // The whole point: a reload must not ask again.
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(400);
  await answerConsent(p);
  await p.waitForTimeout(8200);
  await leave(p);
  await p.waitForTimeout(900);
  ok(await p.locator('.do-pop').count() === 0, 'and it does not come back on the next visit');
  await p.context().close();
}

console.log('\n7. The popup opens the full panel, tagged as the popup');
{
  const p = await open(`/d/zamil-shop-bd/`);
  await answerConsent(p);
  await p.waitForTimeout(8200);
  await leave(p);
  await p.waitForSelector('.do-pop.open', { timeout: 6000 });
  await p.click('[data-pop="order"]');
  await p.waitForSelector('.do-scrim.open', { timeout: 4000 });
  // The popup fades rather than vanishing, so this waits for it to actually go
  // instead of racing its own transition.
  await p.waitForSelector('.do-pop', { state: 'detached', timeout: 3000 });
  ok(await p.locator('.do-pop').count() === 0, 'the popup gets out of the way');

  await p.click('.do-scrim [data-door="form"]');
  await p.fill('.do-scrim [name="name"]', 'Shanta');
  await p.fill('.do-scrim [name="contact"]', '01811111111');
  await p.click('.do-scrim .do-submit');
  await p.waitForTimeout(800);
  // Without this the popup can never be judged: it would be impossible to tell
  // whether it earns the interruption or merely survives it.
  ok(p.orders.at(-1)?.source === 'popup', `the order records that the popup produced it (${p.orders.at(-1)?.source})`);
  await p.context().close();
}

console.log('\n8. A card on the hub lands inside the demo with the panel open');
{
  const p = await open('/');
  const href = await p.getAttribute(`.card[data-search*="lk's attire"] .card-order, .card-order`, 'href');
  ok(/\/d\/[a-z0-9-]+\/\?order=1$/.test(href), `the card orders via the demo, not around it (${href})`);

  const q = await open(`/d/${SLUG}/?order=1`);
  await q.waitForSelector('.do-scrim.open', { timeout: 5000 });
  ok(true, 'arriving with ?order=1 opens the panel');
  await q.click('.do-scrim [data-door="form"]');
  await q.fill('.do-scrim [name="name"]', 'Nila');
  await q.fill('.do-scrim [name="contact"]', 'nila@example.com');
  await q.click('.do-scrim .do-submit');
  await q.waitForTimeout(800);
  ok(q.orders.at(-1)?.source === 'hub-card', `and the order is tagged hub-card (${q.orders.at(-1)?.source})`);
  await p.context().close();
  await q.context().close();
}

console.log('\n9. Every demo carries the order path, with its own features');
{
  const p = await open('/');
  const slugs = await p.$$eval('.card-order', (nodes) =>
    nodes.map((n) => (n.getAttribute('href') || '').replace(/^\/d\/|\/\?order=1$/g, '')));
  ok(slugs.length >= 18, `every demo card has an order button (${slugs.length})`);
  await p.context().close();

  // Three at random rather than all eighteen: enough to catch a demo whose
  // config did not render, without an eighteen-page test run.
  for (const slug of [slugs[0], slugs[Math.floor(slugs.length / 2)], slugs.at(-1)]) {
    const d = await open(`/d/${slug}/`);
    const cfg = await d.evaluate(() => window.DEMU_ORDER);
    ok(cfg?.slug === slug && cfg?.title, `${slug}: the panel knows what it is selling`);
    ok(Array.isArray(cfg?.features) && cfg.features.length > 0, `${slug}: with features to tick (${cfg?.features?.length})`);
    ok(cfg?.whatsapp === '8801519601517', `${slug}: and a number that accepts a message`);
    await d.context().close();
  }
}

console.log('\n10. Search finds a demo by what it does');
{
  const p = await open('/');
  const total = await p.locator('.card:visible').count();
  await p.fill('#q', 'booking');
  await p.waitForTimeout(250);
  const found = await p.locator('.card:visible').count();
  ok(found > 0 && found < total, `"booking" narrows ${total} demos to ${found}`);

  await p.fill('#q', 'zzzzqqq');
  await p.waitForTimeout(250);
  ok(await p.locator('.card:visible').count() === 0, 'a miss shows nothing');
  ok(await p.locator('#empty').isVisible(), 'and says so rather than leaving a blank page');

  // Search and category must combine; a filter that silently resets the other
  // reads as broken.
  await p.fill('#q', 'admin');
  await p.waitForTimeout(200);
  const searched = await p.locator('.card:visible').count();
  const chip = p.locator('#toolbar .chip', { hasText: 'E-commerce' });
  if (await chip.count()) {
    await chip.first().click();
    await p.waitForTimeout(200);
    ok(await p.locator('.card:visible').count() <= searched, 'adding a category narrows further, it does not reset');
  }

  await p.click('#qClear');
  await p.waitForTimeout(200);
  ok(await p.inputValue('#q') === '', 'clearing empties the box');
  await p.context().close();
}

await browser.close();
server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
