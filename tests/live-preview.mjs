import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const port = 4173;
const server = spawn('python3', ['-m', 'http.server', String(port), '--directory', 'site'], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
const screenshotDir = 'artifacts/playwright';
await mkdir(screenshotDir, { recursive: true });

try {
  const cases = [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ];
  for (const testCase of cases) {
    const page = await browser.newPage({ viewport: { width: testCase.width, height: testCase.height }, deviceScaleFactor: 1 });
    const failures = [];
    page.on('requestfailed', (request) => failures.push(`${request.method()} ${request.url()}`));
    await page.goto(`http://127.0.0.1:${port}/demos/veloura-atelier-demo/web/index.html`, { waitUntil: 'networkidle' });
    const result = await page.evaluate(() => ({
      title: document.title,
      stylesheetCount: document.styleSheets.length,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
      heroVisible: Boolean(document.querySelector('.hero, [class*="hero"]')),
    }));
    if (result.stylesheetCount < 2) throw new Error(`${testCase.name}: expected Google Fonts plus the local stylesheet`);
    if (result.brokenImages.length) throw new Error(`${testCase.name}: broken images: ${result.brokenImages.join(', ')}`);
    const unexpectedFailures = failures.filter((url) => !url.includes('127.0.0.1:8787/api/') && !url.includes('googletagmanager.com'));
    if (unexpectedFailures.length) throw new Error(`${testCase.name}: failed requests: ${unexpectedFailures.join(', ')}`);
    await page.screenshot({ path: `${screenshotDir}/${testCase.name}.png`, fullPage: true });
    const admin = await browser.newPage({ viewport: { width: testCase.width, height: testCase.height }, deviceScaleFactor: 1 });
    await admin.goto(`http://127.0.0.1:${port}/demos/veloura-atelier-demo/web/admin.html`, { waitUntil: 'networkidle' });
    await admin.fill('#login-username', 'Admin');
    await admin.fill('#login-password', 'demo123');
    await admin.click('#login-form button[type="submit"]');
    await admin.waitForURL('**/admin/index.html');
    if (!await admin.locator('#login-screen').isHidden()) throw new Error(`${testCase.name}: admin login did not reach dashboard`);
    await admin.screenshot({ path: `${screenshotDir}/${testCase.name}-admin.png`, fullPage: true });
    await admin.close();
    console.log(JSON.stringify({ ...testCase, ...result, adminLogin: 'passed', failedRequests: failures.length }));
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
