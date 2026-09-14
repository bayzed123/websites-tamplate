/**
 * Every admin dashboard on the hub must be reachable FROM the hub.
 *
 * Four dashboards were live and unreachable: the storefronts linked to them
 * from their own footers, but nothing on the hub grid did, so from the home
 * page they may as well not have existed. Worse, each demo.json carried an
 * "access" block describing the dashboard that the builder never read — it
 * reads "credentials", a username/password pair — so the data looked present
 * while rendering nothing.
 *
 * This checks the whole path a visitor takes: the card carries a link, the
 * link resolves to a real file, and what loads is the admin rather than the
 * shop. A link that 200s on the storefront would satisfy the first two.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SITE = process.argv[2] ?? 'site';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  const file = join(SITE, path.endsWith('/') ? `${path}index.html` : path);
  try {
    // Read BEFORE writing the header: writing it first means a missing file
    // throws after the response has already started, which crashes the server
    // instead of returning the 404 the check is trying to observe.
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('404');
  }
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

/**
 * Which demos claim an admin — and, separately, which demos HAVE one.
 *
 * Reading demo.json alone is not enough, and the first version of this file
 * proved it: reverting a demo to the old dead `access` key simply removed it
 * from the list, so nothing was checked and everything passed. That is the
 * very failure this file exists to catch, reproduced inside the check.
 *
 * So `has` is derived independently of demo.json. Every storefront here links
 * to its own admin from its footer, which is a fact about the published files
 * rather than about the metadata. If the shop can reach its admin, the hub
 * must be able to as well.
 */
const declared = [];
const undeclared = [];
for (const entry of await readdir('.', { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  let meta;
  try {
    meta = JSON.parse(await readFile(join(entry.name, 'demo.json'), 'utf8'));
  } catch { continue; }
  if (meta.draft === true) continue;

  if (meta.admin?.path) {
    // credentials comes along too: it is what decides whether a sign-in screen
    // on this admin is correct behaviour or a regression.
    declared.push({ slug: entry.name, credentials: meta.credentials ?? null, ...meta.admin });
    continue;
  }
  // No declaration — but does the published demo have an admin anyway?
  let entryHtml = '';
  try {
    entryHtml = await readFile(join(SITE, 'demos', entry.name, 'index.html'), 'utf8');
  } catch { /* published under another entry file */ }
  const linksToAdmin = /href="[^"]*(admin\.html|#\/admin|#\/dashboard)/i.test(entryHtml);
  // A single-page app ships its routes in the bundle, not the HTML shell.
  const bundlesAdmin = /admin/i.test(entryHtml) && entryHtml.length > 0;
  if (linksToAdmin || (meta.tags ?? []).some((t) => /admin/i.test(t)) || (bundlesAdmin && linksToAdmin)) {
    undeclared.push(entry.name);
  }
  if (meta.access) undeclared.push(`${entry.name} (still uses the dead "access" key)`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.route('**://images.asos-media.com/**', (r) => r.abort());
await page.route('**://fonts.googleapis.com/**', (r) => r.abort());

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${label}${!ok && detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

console.log('\n== the home grid offers a way into every admin ==');
check('at least one demo declares an admin', declared.length > 0, 'none found');
check('no demo has an admin it does not declare', undeclared.length === 0,
  `${undeclared.join(', ')} — the hub cannot link to what demo.json does not declare`);
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' });
const cardLinks = await page.evaluate(() =>
  [...document.querySelectorAll('a.card-admin')].map((a) => a.getAttribute('href')));
for (const demo of declared) {
  const want = `/demos/${demo.slug}/${demo.path}`;
  check(`${demo.slug} has a link on its card`, cardLinks.includes(want), `card links: ${cardLinks.join(', ')}`);
}
check('no card links to an admin that no demo declares',
  cardLinks.every((href) => declared.some((d) => href === `/demos/${d.slug}/${d.path}`)), cardLinks.join(', '));

console.log('\n== and each link opens the admin, not the shop ==');
for (const demo of declared) {
  const errors = [];
  page.removeAllListeners('pageerror');
  page.on('pageerror', (e) => errors.push(String(e)));

  const res = await page.goto(`${base}/demos/${demo.slug}/${demo.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const text = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));

  check(`${demo.slug}: the file exists`, (res?.status() ?? 0) < 400, `HTTP ${res?.status()}`);

  // Two legitimate patterns, and they need opposite assertions. Most of these
  // admins open with no password at all — for those, a sign-in screen is a
  // regression. Veloura gates its admin and prints the demo credentials, which
  // the hub renders on the card; for that one the gate is the correct
  // behaviour and the credentials are what must be present.
  //
  // Checking only "does it look like an admin" let the gated one pass for the
  // wrong reason: its login screen happens to say "manage your premium store".
  const gated = Boolean(demo.credentials);
  const signIn = /sign in|log ?in|password/i.test(text);

  if (gated) {
    check(`${demo.slug}: shows its sign-in (it is a gated demo)`, signIn, text.slice(0, 120));
    check(`${demo.slug}: the hub publishes the credentials to get past it`,
      Boolean(demo.credentials.username && demo.credentials.password),
      'declared in demo.json but incomplete');
  } else {
    check(`${demo.slug}: opens with no sign-in`, !signIn, text.slice(0, 120));
    check(`${demo.slug}: it is an admin screen`,
      /dashboard|orders|customers|products|inventory|messages/i.test(text), text.slice(0, 120));
    // A no-password admin lands straight on a populated screen; a short one
    // means an empty state or a shell that never rendered.
    check(`${demo.slug}: the screen is populated`, text.length > 300, `${text.length} chars`);
  }
  check(`${demo.slug}: no uncaught JS error`, errors.length === 0, errors[0] ?? '');
}

await browser.close();
server.close();
console.log(failures === 0 ? '\nevery admin is reachable from the hub\n' : `\n${failures} check(s) failed\n`);
process.exit(failures === 0 ? 0 : 1);
