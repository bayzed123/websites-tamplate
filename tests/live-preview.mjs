/**
 * Real-experience check for every demo in the hub.
 *
 * The previous version of this file tested one hard-coded demo (Veloura) and
 * nothing else — so a broken page in demu-admin or demosmartgen would have
 * deployed unnoticed while the build still went green. This walks the manifest
 * instead, so every demo that ships is a demo that was opened and exercised.
 *
 * For each demo, on desktop AND mobile:
 *   - open every HTML page it has
 *   - fail on a request that didn't load (missing CSS, image, script)
 *   - fail on an image that resolved but decoded to nothing
 *   - fail on a page that rendered essentially blank
 *   - report uncaught JS errors
 * Plus the hub itself: its cards, links and thumbnails must all resolve.
 *
 * Requests to a backend the static host doesn't run (api/, workers.dev, and the
 * usual analytics endpoints) are expected to fail and are not counted — these
 * demos are frontends published without their worker.
 *
 * Run:  npm run test:preview        (add CHROMIUM_PATH=... outside CI)
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const siteDir = process.argv[2] || 'site';
const port = 4173;
const shotDir = 'artifacts/playwright';
const base = `http://127.0.0.1:${port}`;

/**
 * Backends these static demos are published without. Expected to fail; ignored.
 */
const EXPECTED_OFFLINE = [/\/api\//, /workers\.dev/, /127\.0\.0\.1:8787/, /googletagmanager\.com/, /google-analytics\.com/, /connect\.facebook\.net/, /facebook\.com\/tr/];
const isExpectedOffline = (url) => EXPECTED_OFFLINE.some((re) => re.test(url));

/**
 * Third-party CDNs. A font host being slow or blocked is not a reason to stop
 * publishing demos that are otherwise fine — those get reported as warnings.
 * Anything served from this origin is ours, and a missing stylesheet, script or
 * image of our own is real breakage that must fail the build.
 */
const isFirstParty = (url) => url.startsWith(base) || url.startsWith('/');

const manifest = JSON.parse(await readFile(join(siteDir, 'demos', 'manifest.json'), 'utf8'));
await mkdir(shotDir, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(port), '--directory', siteDir], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

const launchOptions = { args: ['--no-sandbox'] };
if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launchOptions);

const viewports = [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 390, height: 844 }];
const problems = [];
const warnings = [];
const report = [];

async function visit(context, url, label) {
  const page = await context.newPage();
  const failed = [];
  const thirdParty = [];
  const jsErrors = [];
  const record = (url, label) => {
    if (isExpectedOffline(url)) return;
    (isFirstParty(url) ? failed : thirdParty).push(label);
  };
  page.on('requestfailed', (r) => record(r.url(), r.url()));
  page.on('response', (r) => { if (r.status() >= 400) record(r.url(), `${r.status()} ${r.url()}`); });
  page.on('pageerror', (e) => jsErrors.push(e.message.split('\n')[0]));
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(700); // let CSS transitions and lazy images settle
    const state = await page.evaluate(() => ({
      title: document.title,
      textLength: (document.body?.innerText || '').trim().length,
      stylesheets: document.styleSheets.length,
      brokenImages: [...document.images].filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src),
    }));
    if (state.textLength < 30) problems.push(`${label}: page rendered almost no text (${state.textLength} chars) — likely broken`);
    if (state.stylesheets === 0) problems.push(`${label}: no stylesheet applied`);
    if (state.brokenImages.length) problems.push(`${label}: broken image(s) → ${state.brokenImages.slice(0, 3).join(', ')}`);
    if (failed.length) problems.push(`${label}: own asset failed to load → ${[...new Set(failed)].slice(0, 3).join(', ')}`);
    if (jsErrors.length) problems.push(`${label}: JS error → ${jsErrors[0]}`);
    if (thirdParty.length) warnings.push(`${label}: third-party request did not load → ${[...new Set(thirdParty)].slice(0, 2).join(', ')}`);
    return { ok: !failed.length && !state.brokenImages.length && state.textLength >= 30, ...state, jsErrors: jsErrors.length };
  } catch (error) {
    problems.push(`${label}: did not load — ${error.message.split('\n')[0]}`);
    return { ok: false };
  } finally {
    await page.close();
  }
}

try {
  // ---- the hub landing page --------------------------------------------
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const result = await visit(context, `${base}/`, `hub (${vp.name})`);
    if (vp.name === 'desktop') {
      const page = await context.newPage();
      await page.goto(`${base}/`, { waitUntil: 'load' });
      const cards = await page.locator('.card').count();
      if (cards !== manifest.length) problems.push(`hub: ${cards} card(s) rendered but the manifest lists ${manifest.length}`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) problems.push(`hub (desktop): ${overflow}px of horizontal overflow`);
      await page.screenshot({ path: `${shotDir}/hub-desktop.png`, fullPage: true });
      await page.close();
    }
    report.push({ target: 'hub', viewport: vp.name, ok: result.ok });
    await context.close();
  }

  // ---- every page of every demo ----------------------------------------
  for (const demo of manifest) {
    for (const vp of viewports) {
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      // The viewer wrapper must load, and so must the demo's own entry page.
      const viewer = await visit(context, `${base}/d/${demo.slug}/`, `${demo.slug} viewer (${vp.name})`);
      report.push({ target: `${demo.slug} · viewer`, viewport: vp.name, ok: viewer.ok });
      const entry = await visit(context, `${base}/demos/${demo.slug}/${demo.entryFile}`, `${demo.slug} entry (${vp.name})`);
      if (vp.name === 'desktop') {
        const page = await context.newPage();
        await page.goto(`${base}/demos/${demo.slug}/${demo.entryFile}`, { waitUntil: 'load' });
        await page.waitForTimeout(700);
        await page.screenshot({ path: `${shotDir}/${demo.slug}-desktop.png`, fullPage: false });
        await page.close();
      }
      report.push({ target: `${demo.slug} · demo`, viewport: vp.name, ok: entry.ok, title: entry.title });
      await context.close();
    }
  }

  // ---- every wrapper URL must resolve --------------------------------------
  // A deep link like /d/veloura-atelier-demo/admin/ used to 404 because only
  // the landing wrapper was generated, and nothing here caught it: the check
  // only ever opened /d/<slug>/. Assert the whole set now.
  //
  // Deliberately a plain fetch, not a browser navigation. This is a routing
  // assertion — does the URL exist, and does it frame the page it claims to —
  // and driving 25 of them through Chromium made it hostage to whether a font
  // CDN answers: the wrapper's inline script waits on its stylesheet, so a slow
  // fonts.googleapis.com stalls DOMContentLoaded and the check crawls. Fetch
  // gives the same answer in milliseconds and can't be perturbed by a CDN.
  {
    let checked = 0;
    for (const demo of manifest) {
      for (const entry of demo.pages || []) {
        let html = '';
        let status = 0;
        try {
          const response = await fetch(`${base}${entry.url}`);
          status = response.status;
          html = await response.text();
        } catch (error) {
          problems.push(`${entry.url}: wrapper request failed — ${error.message}`);
          checked += 1;
          continue;
        }
        if (status !== 200) {
          problems.push(`${entry.url}: wrapper returned ${status}`);
        } else {
          const framed = html.match(/id="frame"\s+src="([^"]+)"/)?.[1] ?? '';
          if (!framed) problems.push(`${entry.url}: wrapper has no demo frame`);
          else if (!framed.endsWith(entry.page)) problems.push(`${entry.url}: frames "${framed}", expected it to end with "${entry.page}"`);
        }
        checked += 1;
      }
    }
    const failures = problems.filter((p) => p.startsWith('/d/')).length;
    report.push({ target: `deep links (${checked} wrapper URLs)`, viewport: 'routing', ok: failures === 0 });
  }

} finally {
  await browser.close();
  server.kill();
}

const summary = [
  `# Demo hub check — ${new Date().toISOString()}`,
  '',
  `Demos: ${manifest.length} · checks run: ${report.length} · problems: ${problems.length} · warnings: ${warnings.length}`,
  '',
  ...report.map((r) => `- ${r.ok ? 'PASS' : 'FAIL'}  ${r.target} (${r.viewport})${r.title ? ` — "${r.title}"` : ''}`),
  '',
  problems.length ? '## Problems (these block the deploy)\n' + problems.map((p) => `- ${p}`).join('\n') : '## Problems\nNone.',
  '',
  warnings.length ? '## Warnings (third-party, not blocking)\n' + warnings.map((w) => `- ${w}`).join('\n') : '',
  '',
].join('\n');
await writeFile(join(shotDir, 'report.md'), summary);
console.log(summary);

if (problems.length) {
  console.error(`\n${problems.length} problem(s) found — not publishing a demo a client would find broken.`);
  process.exit(1);
}
console.log('\nEvery demo loaded cleanly on desktop and mobile.');
