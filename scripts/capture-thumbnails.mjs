/**
 * Screenshot every discovered demo for the hub's cards.
 *
 * Real screenshots rather than live <iframe> previews: three demos framed on
 * one page meant the landing page loaded three complete sites before it was
 * usable. A 900px WebP per card is a few dozen kilobytes and always current,
 * because this regenerates on every build.
 *
 * Failure here is deliberately not fatal. A demo that will not screenshot is
 * still a demo worth listing — the card falls back to a titled placeholder
 * (see the .fallback rule and the img onerror in the card markup).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const siteDir = process.argv[2] || 'site';
const port = 4319;
const manifest = JSON.parse(await readFile(join(siteDir, 'demos', 'manifest.json'), 'utf8'));
if (!manifest.length) { console.log('No demos to capture.'); process.exit(0); }

await mkdir(join(siteDir, 'assets', 'thumbs'), { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(port), '--directory', siteDir], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));

// CHROMIUM_PATH lets this run against a preinstalled browser (some sandboxes
// ship one that doesn't match the npm package's expected build). CI installs
// its own via `npx playwright install`, where the variable is simply unset.
const launchOptions = { args: ['--no-sandbox'] };
if (process.env.CHROMIUM_PATH) launchOptions.executablePath = process.env.CHROMIUM_PATH;
const browser = await chromium.launch(launchOptions);
let captured = 0;
try {
  for (const demo of manifest) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
    try {
      await page.goto(`http://127.0.0.1:${port}/demos/${demo.slug}/${demo.entryFile}`, { waitUntil: 'networkidle', timeout: 25000 });
      // Let entry animations settle so the card doesn't show a half-faded hero.
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(siteDir, 'assets', 'thumbs', `${demo.slug}.webp`), quality: 82, type: 'webp' });
      captured += 1;
      console.log(`  ✓ ${demo.slug}`);
    } catch (error) {
      console.warn(`  ! ${demo.slug}: no thumbnail (${error.message.split('\n')[0]}) — card falls back to a placeholder`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.kill();
}
console.log(`Captured ${captured}/${manifest.length} thumbnail(s).`);
