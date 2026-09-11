/**
 * Nothing from a client's live store may appear in a demo of it.
 *
 * The SmartGadget demo is modelled on a shop that is running ads right now.
 * Two things would be expensive if they crossed over:
 *
 *   1. Its GA4 property, GTM container and Meta Pixel. A public demo firing
 *      into those puts every prospect's click into the real store's
 *      conversion data, and skews the optimisation of campaigns that are
 *      spending money. This is the check that stops a copy-paste doing that.
 *
 *   2. Its name, domain, inbox and API. A demo is shown to other prospects;
 *      a client's real contact details and endpoints are not ours to hand out.
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
  else { fail++; console.log(`  FAIL ${n}${d ? `\n       ${String(d).slice(0, 400)}` : ''}`); }
};

const DEMO = 'smartgadget-demo';

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

console.log('== nothing from the live store crossed over ==');
for (const [what, needle] of FORBIDDEN) {
  const hits = files.filter((f) => text.get(f).toLowerCase().includes(needle.toLowerCase()));
  check(`no ${what}`, hits.length === 0, hits.join(', '));
}

console.log('== and the demo is branded as itself ==');
const homepage = text.get(join(DEMO, 'web', 'index.html')) ?? '';
check('the storefront says SmartGadget', homepage.includes('SmartGadget'));
check('and is not indexable', /name="robots"[^>]*noindex/.test(homepage));
const adminPage = text.get(join(DEMO, 'web', 'admin', 'index.html')) ?? '';
check('so is the dashboard', /name="robots"[^>]*noindex/.test(adminPage));

console.log('== the dashboard has no sign-in, and no way to need one ==');
// A password in a demo is either a fake one people will try elsewhere, or a
// real one. Neither belongs in a repository that gets published.
const secretish = files.filter((f) =>
  /(password|passwd|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']{4,}/i.test(text.get(f)));
check('no credential is assigned anywhere', secretish.length === 0, secretish.join(', '));
const meta = JSON.parse(text.get(join(DEMO, 'demo.json')));
check('demo.json offers no credentials', !('credentials' in meta), JSON.stringify(Object.keys(meta)));
check('and says why there are none',
  /no sign-?in/i.test(JSON.stringify(meta)), JSON.stringify(meta.access ?? {}));

console.log('== the demo cannot phone home ==');
// A static demo that calls out is a static demo that could be pointed at a
// real backend by one edit. The only permitted outbound hosts are the tag
// vendors, and only through the config file that ships empty.
const VENDOR = /googletagmanager\.com|connect\.facebook\.net/;
const offenders = [];
for (const file of files) {
  if (!/\.(js|html)$/.test(file)) continue;
  // match[0], not match[1]: the pattern has no capture group, so [, url]
  // read `undefined` and every offender was reported as "undefined".
  for (const [url] of text.get(file).matchAll(/https?:\/\/[^\s'"`)]+/g)) {
    if (VENDOR.test(url)) continue;
    if (/^https:\/\/(www\.)?facebook\.com\/tr/.test(url)) continue;   // pixel noscript
    offenders.push(`${file} → ${url}`);
  }
}
check('no call to anything but the tag vendors', offenders.length === 0, offenders.join('\n       '));

console.log('== the tracking ids ship empty ==');
const config = text.get(join(DEMO, 'web', 'assets', 'tracking-config.js')) ?? '';
for (const key of ['ga4MeasurementId', 'gtmContainerId', 'metaPixelId', 'capiEndpoint']) {
  check(`${key} is empty`, new RegExp(`${key}:\\s*''`).test(config),
    (config.match(new RegExp(`${key}:.*`)) || [''])[0]);
}
// An empty id must mean "load nothing", not "load a tag with a broken id".
const analytics = text.get(join(DEMO, 'web', 'assets', 'analytics.js')) ?? '';
check('and an empty id loads no tag at all',
  /isGa4Configured\(\)/.test(analytics) && /isPixelConfigured\(\)/.test(analytics) && /isGtmConfigured\(\)/.test(analytics));

console.log(`\npassed: ${pass}   failed: ${fail}`);
process.exit(fail === 0 ? 0 : 1);
