/**
 * Can these pages be found in a search result.
 *
 * This is the failure that never announces itself. A demo renders, the build
 * is green, the preview check passes — and the page carries `noindex`, so it
 * is invisible to the only mechanism that brings a stranger to it. Nothing on
 * the page looks wrong. Nobody notices for a year.
 *
 * That is what had happened: 36 of the 54 pages here were noindex, including
 * every checkout, every admin dashboard and every order-tracking screen — the
 * screens a client is actually searching for. The entry page alone was
 * indexable.
 *
 * So these checks are about reachability by a crawler, in the four ways it can
 * be broken independently:
 *
 *   1. the page's own robots meta;
 *   2. its canonical — indexing a page whose canonical names a different page
 *      is the same as not indexing it, and the two drift apart easily;
 *   3. robots.txt, which can undo all of the above in one line;
 *   4. the sitemap, and whether anything links to the page at all.
 *
 * No browser: these are facts about the generated files, and reading them off
 * disk is both faster and harder to fool than asking a renderer.
 *
 *   node scripts/build-demo-hub.mjs site
 *   node tests/indexable.mjs site
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const SITE_DIR = resolve(process.argv[2] || 'site');
const ORIGIN = 'https://demu.sayadbayezid.com';

let pass = 0, fail = 0;
const ok = (c, m) => { c ? (pass++, console.log('  PASS', m)) : (fail++, console.log('  FAIL', m)); };

if (!existsSync(SITE_DIR)) {
  console.error(`No built hub at ${SITE_DIR}. Run: node scripts/build-demo-hub.mjs site`);
  process.exit(1);
}

/** Every index.html under site/d — one per demo screen. */
async function viewerPages(dir = join(SITE_DIR, 'd'), found = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) await viewerPages(full, found);
    else if (entry.name === 'index.html') found.push(full);
  }
  return found;
}

const pages = await viewerPages();
const read = async (f) => readFile(f, 'utf8');
const meta = (html, name) =>
  (html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i')) || [])[1] || '';
const canonicalOf = (html) =>
  (html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || '';

/** site/d/a/b/index.html -> /d/a/b/ */
const urlOf = (file) => file.replace(SITE_DIR, '').replace(/\\/g, '/').replace(/index\.html$/, '');
const isError = (url) => /\/(404|500|error|not-found)\/$/i.test(url);

console.log('\n1. Every demo screen may be indexed');
{
  ok(pages.length >= 50, `${pages.length} demo pages were built`);

  const blocked = [];
  for (const file of pages) {
    const url = urlOf(file);
    const robots = meta(await read(file), 'robots');
    if (isError(url)) continue;
    if (/noindex/i.test(robots)) blocked.push(url);
  }
  // Named, not counted: "3 pages are blocked" sends you hunting; the list is
  // the fix.
  ok(blocked.length === 0,
    `none of them say noindex${blocked.length ? ` — ${blocked.slice(0, 5).join(', ')}` : ''}`);
}

console.log('\n2. An error page is still kept out');
{
  const errors = pages.map(urlOf).filter(isError);
  for (const url of errors) {
    const file = join(SITE_DIR, url.replace(/^\//, ''), 'index.html');
    const robots = meta(await read(file), 'robots');
    // Opening indexing to "every screen" swept one of these along with it.
    ok(/noindex/i.test(robots), `${url} is noindex, because it is a 404`);
  }
  if (!errors.length) console.log('  note  no demo ships an error page');
}

console.log('\n3. Each page is its own canonical');
{
  // A page that is indexable but canonicalised to a different URL is dropped
  // by Google in favour of that other URL — the same outcome as noindex, but
  // invisible in the meta tag everyone checks.
  const wrong = [];
  for (const file of pages) {
    const url = urlOf(file);
    const canonical = canonicalOf(await read(file));
    if (canonical !== ORIGIN + url) wrong.push(`${url} -> ${canonical.replace(ORIGIN, '') || '(none)'}`);
  }
  ok(wrong.length === 0,
    `all ${pages.length} point at themselves${wrong.length ? ` — ${wrong.slice(0, 4).join('; ')}` : ''}`);
}

console.log('\n4. robots.txt blocks nothing');
{
  const robots = await read(join(SITE_DIR, 'robots.txt'));
  const disallows = [...robots.matchAll(/^\s*Disallow:\s*(\S+)/gim)].map((m) => m[1]);
  ok(disallows.length === 0, `no Disallow rules${disallows.length ? ` — ${disallows.join(', ')}` : ''}`);
  ok(/Sitemap:\s*\S*demu\.sayadbayezid\.com\/sitemap\.xml/i.test(robots), 'it points at this sitemap');
  ok(/Sitemap:\s*\S*sayadbayezid\.com\/sitemap\.xml/i.test(robots), 'and at the portfolio sitemap');
}

console.log('\n5. The sitemap lists every indexable page');
{
  const xml = await read(join(SITE_DIR, 'sitemap.xml'));
  const listed = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));

  const shouldBeListed = pages.map(urlOf).filter((u) => !isError(u));
  const missing = shouldBeListed.filter((u) => !listed.has(ORIGIN + u));
  ok(missing.length === 0,
    `all ${shouldBeListed.length} are in it${missing.length ? ` — missing ${missing.slice(0, 5).join(', ')}` : ''}`);

  const errorsListed = pages.map(urlOf).filter(isError).filter((u) => listed.has(ORIGIN + u));
  ok(errorsListed.length === 0, `and no error page is${errorsListed.length ? `: ${errorsListed.join(', ')}` : ''}`);

  ok(listed.has(`${ORIGIN}/`), 'the hub itself is listed');
  const images = (xml.match(/<image:loc>/g) || []).length;
  ok(images >= shouldBeListed.length - 1, `${images} image entries, so a result can show a picture`);
}

console.log('\n6. Something actually links to the inner screens');
{
  // A URL in a sitemap with no link pointing at it is the weakest thing you can
  // submit. The inner screens are reachable in the viewer only through a
  // <select>, which no crawler operates — so the HTML sitemap is the one link
  // path they have, and the hub has to link to that.
  const sitemapHtml = await read(join(SITE_DIR, 'sitemap.html'));
  const linked = new Set([...sitemapHtml.matchAll(/href="(\/d\/[^"]*)"/g)].map((m) => m[1]));
  const shouldBeLinked = pages.map(urlOf).filter((u) => !isError(u));
  const orphans = shouldBeLinked.filter((u) => !linked.has(u));
  ok(orphans.length === 0,
    `the HTML sitemap links all ${shouldBeLinked.length}${orphans.length ? ` — missing ${orphans.slice(0, 4).join(', ')}` : ''}`);

  const home = await read(join(SITE_DIR, 'index.html'));
  ok(/href="\/sitemap\.html"/.test(home), 'and the hub links to the HTML sitemap');
  ok(!/noindex/i.test(meta(sitemapHtml, 'robots')), 'which is itself indexable');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
