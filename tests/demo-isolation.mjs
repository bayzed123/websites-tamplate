/**
 * Nothing from a client's live store may appear in a demo of it, and nothing
 * in the demo may reach a real backend.
 *
 * The SmartGadget demo is the Arif Gadgets build with the client stripped out.
 * That is a far more dangerous starting point than a mockup, because every
 * identifier it must not contain was in the file it was copied from. Three
 * things would be expensive if any of them survived the copy:
 *
 *   1. The client's GA4 property, GTM container and Meta Pixel. A public demo
 *      firing into those puts every prospect's click into the real store's
 *      conversion data and skews campaigns that are spending money today.
 *
 *   2. The client's name, domain, inbox, Worker and database. A demo is shown
 *      to other prospects; those are not ours to hand out.
 *
 *   3. A reachable API. The demo answers its own requests in the browser. If a
 *      real endpoint were still in the bundle, one edit would point a public,
 *      password-free admin dashboard at a live database.
 *
 * The forbidden values live HERE and not in the demo, because a file that
 * lists them as "do not use" is still a file that contains them.
 *
 *   node tests/demo-isolation.mjs
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

let pass = 0, fail = 0;
const check = (n, c, d = '') => {
  if (c) { pass++; console.log(`  ok   ${n}`); }
  else { fail++; console.log(`  FAIL ${n}${d ? `\n       ${String(d).slice(0, 500)}` : ''}`); }
};

const DEMO = 'smartgadget-demo';
const WEB = join(DEMO, 'web');

/** The live store's own identifiers. None may appear in the demo. */
const FORBIDDEN = [
  ['the live GA4 property', 'G-0NMRBW4SEG'],
  ['the live GTM container', 'GTM-MGQ6S4HX'],
  ['the live Meta Pixel', '2153514518908988'],
  ['the live store name', 'Arif Gadget'],
  ['the live store name, run together', 'arifgadget'],
  ['the live domain', 'arifgadget.store'],
  ['the live order-alert inbox', 'gadget02030@gmail.com'],
  ['the live API worker', 'arif-gadgets-api'],
  ['the live D1 database', 'arif-gadgets'],
];

/** The agency's own measurement stack, which the demo is meant to report to. */
const OURS = { ga4: 'G-HY9255GJYE', gtm: 'GTM-WN9DK67S', pixel: '1612338809888151' };

function everyFile(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) everyFile(path, found);
    else found.push(path);
  }
  return found;
}

check('the demo exists', existsSync(DEMO));
const files = everyFile(DEMO);
check('and has files to check', files.length > 5, `${files.length} files`);

const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const read = (...p) => text.get(join(...p)) ?? '';

console.log('== nothing from the live store crossed over ==');
for (const [what, needle] of FORBIDDEN) {
  const hits = files.filter((f) => text.get(f).toLowerCase().includes(needle.toLowerCase()));
  check(`no ${what}`, hits.length === 0, hits.join(', '));
}

console.log('== and the demo is branded as itself ==');
const homepage = read(WEB, 'index.html');
check('the storefront says SmartGadget', homepage.includes('SmartGadget'));
check('and is not indexable', /name="robots"[^>]*noindex/.test(homepage));
// The dashboard is a route of the same single-page app, so the tag above
// already covers it — but a crawler that never runs the app still needs to be
// told, and robots.txt is what it reads.
const robots = read(WEB, 'public', 'robots.txt');
check('robots.txt disallows everything', /User-agent:\s*\*/i.test(robots) && /Disallow:\s*\/\s*$/m.test(robots), robots.slice(0, 120));

console.log('== the dashboard has no sign-in, and no way to need one ==');
// A password in a demo is either a fake one people will try elsewhere, or a
// real one. Neither belongs in a repository that gets published.
const secretish = files.filter((f) =>
  /(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{4,}/i.test(text.get(f)));
check('no credential is assigned anywhere', secretish.length === 0, secretish.join(', '));
const meta = JSON.parse(read(DEMO, 'demo.json'));
check('demo.json offers no credentials', !('credentials' in meta), JSON.stringify(Object.keys(meta)));
check('and says why there are none',
  /no sign-?in/i.test(JSON.stringify(meta)), JSON.stringify(meta.access ?? {}));
// The session is open because /api/admin/me answers from the fixtures, not
// because a check was commented out somewhere.
const demoServer = read(WEB, 'src', 'lib', 'demo', 'server.ts');
check('the open session comes from the fixture layer', /'\/api\/admin\/me'/.test(demoServer));

console.log('== the demo answers its own requests ==');
const api = read(WEB, 'src', 'lib', 'api.ts');
check('api() short-circuits to the in-browser server', /if \(DEMO\) \{[\s\S]{0,200}handle\(method, path/.test(api));
check('demo mode is on unless explicitly turned off', /DEMO = import\.meta\.env\.VITE_DEMO !== 'false'/.test(api));
// No fallback host at all, demo or not — the check above ("nothing but the
// allowed hosts") would catch a literal, and this catches the shape that
// reintroduces one.
check('and there is no fallback API address to reintroduce',
  /API_BASE = \(import\.meta\.env\.VITE_API_BASE \?\? ''\)/.test(api));

console.log('== the demo cannot phone home ==');
/*
 * Every absolute URL in the shipped bundle, checked against an allowlist.
 * This is the check that would catch a real endpoint surviving the copy, so
 * the allowlist names each permitted host and why it is permitted — a URL
 * that is not on it fails, rather than being quietly pattern-matched away.
 */
const ALLOWED = [
  [/^https?:\/\/(www\.)?googletagmanager\.com/, 'GTM and GA4 loader'],
  [/^https:\/\/connect\.facebook\.net/, 'Meta Pixel loader'],
  [/^https:\/\/(www\.)?facebook\.com\/tr/, 'Pixel noscript beacon'],
  [/^https?:\/\/www\.w3\.org\//, 'XML namespace, not a request'],
  [/^https:\/\/sayadbayezid\.com/, "the agency's own site, linked in the footer credit"],
  [/^https:\/\/wa\.me\//, 'WhatsApp hand-off link, opened by the visitor'],
  [/^https:\/\/schema\.org/, 'JSON-LD vocabulary, not a request'],
  [/^https:\/\/docs\.google\.com\/spreadsheets\//, "link to the shop's own sheet, opened by staff"],
  [/^https:\/\/reactjs\.org\/docs\/error-decoder/, "React's own error message, in the vendor chunk"],
  // Reserved by RFC 2606 and guaranteed never to resolve, which is exactly
  // what a placeholder in a hint string should be.
  [/^https?:\/\/[^/]*\.example(\/|$)/, 'placeholder hostname in UI copy'],
  // An input's placeholder text, not an address.
  [/^https:\/\/\u2026/, 'ellipsis placeholder in a form field'],
];
const offenders = [];
for (const file of files) {
  if (!/\.(js|html|ts|tsx)$/.test(file)) continue;
  if (file.includes('package-lock.json')) continue;
  for (const [url] of text.get(file).matchAll(/https?:\/\/[^\s'"`)<>]+/g)) {
    if (ALLOWED.some(([re]) => re.test(url))) continue;
    offenders.push(`${file} → ${url}`);
  }
}
check('no call to anything but the allowed hosts', offenders.length === 0, offenders.join('\n       '));

console.log("== the tags are the agency's own, and marked as a demo ==");
const config = read(WEB, 'src', 'lib', 'tracking-config.ts');
check('tracking-config names the agency GA4', config.includes(OURS.ga4));
check('tracking-config names the agency GTM', config.includes(OURS.gtm));
check('tracking-config names the agency Pixel', config.includes(OURS.pixel));
// The bootstrap snippets cannot import the config — they run before the
// bundle — so the two copies have to be compared, not trusted.
check('index.html loads the same GA4', homepage.includes(OURS.ga4));
check('index.html loads the same GTM', homepage.includes(OURS.gtm));
check('index.html loads the same Pixel', homepage.includes(OURS.pixel));

const analytics = read(WEB, 'src', 'lib', 'analytics.ts');
check('every GA4 event carries the demo marker', /demo_site: DEMO_SITE_TAG/.test(analytics));
check('the dataLayer is marked before GTM boots',
  homepage.indexOf("demo_site: 'smartgadget-demo'") > -1 &&
  homepage.indexOf("demo_site: 'smartgadget-demo'") < homepage.indexOf('GTM-'), 'marker must precede the GTM snippet');
/*
 * The important one. An invented Purchase in the agency's own Pixel is not a
 * weak signal, it is a wrong one: Meta would optimise real ad delivery toward
 * people who behave like demo visitors. Every standard event has to collapse
 * to one custom event, with PageView the only exception.
 */
check('no standard Meta conversion event can fire from a demo build',
  /function demoSafeEvent/.test(analytics) &&
  /if \(!DEMO \|\| metaEvent === 'PageView'\) return \{ name: metaEvent, custom: false \}/.test(analytics) &&
  /return \{ name: 'DemoInteraction', custom: true \}/.test(analytics));
check('and the custom event carries no value or currency',
  /custom\s*\n?\s*\?[\s\S]{0,400}\{ demo_site: DEMO_SITE_TAG, demo_step: event \}/.test(analytics));
check('the Conversions API is never called from a demo build',
  /if \(!DEMO && event_id &&/.test(analytics));

console.log(`\npassed: ${pass}   failed: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
