import { chromium } from 'playwright';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const root = resolve(new URL('..', import.meta.url).pathname);
const siteDir = resolve(process.argv[2] || join(root, 'site'));
const reportRoot = resolve(process.argv[3] || join(root, 'doctor-report'));
const runNumber = process.env.DOCTOR_RUN || String((await readdir(reportRoot).catch(() => [])).filter((name) => /^run-\d+$/.test(name)).length + 1);
const runDir = join(reportRoot, `run-${runNumber}`);
const server = spawn('python3', ['-m', 'http.server', '4173', '--directory', siteDir], { stdio: 'ignore' });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const failures = [];

async function htmlFiles(dir, prefix = '') {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) found.push(...await htmlFiles(join(dir, entry.name), path));
    else if (/\.html?$/i.test(entry.name)) found.push(path.replaceAll('\\', '/'));
  }
  return found;
}

function sourceLocation(siteRelative, href) {
  const sourceRelative = siteRelative.replace(/^demos\//, '').replace(/\/web\/.*/, '/web/');
  const source = join(root, sourceRelative);
  return `source mirror: ${source}:${href}`;
}

try {
  const pages = await htmlFiles(siteDir);
  for (const pagePath of pages) {
    const pageUrl = `http://127.0.0.1:4173/${pagePath}`;
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim().replace(/\s+/g, ' ') })).filter((link) => link.href && !link.href.startsWith('#')));
    for (const link of links) {
      if (/^(https?:|mailto:|tel:|javascript:)/i.test(link.href)) continue;
      const target = new URL(link.href, pageUrl);
      if (target.origin !== 'http://127.0.0.1:4173') continue;
      const response = await page.request.get(target.href);
      if (!response.ok()) failures.push({ page: pagePath, href: link.href, status: response.status(), text: link.text, location: sourceLocation(pagePath, link.href) });
    }
  }
  await mkdir(runDir, { recursive: true });
  const audit = [`# Doctor audit — run ${runNumber}`, '', `Generated: ${new Date().toISOString()}`, `Pages crawled: ${pages.length}`, `Broken internal links: ${failures.length}`, ''];
  if (!failures.length) audit.push('## Result', '', 'All same-site links resolved successfully. No internal navigation failures were found.');
  else {
    audit.push('## Findings', '', '| Page | Link | Status | Source location |', '|---|---|---:|---|');
    for (const item of failures) audit.push(`| \`${item.page}\` | \`${item.href}\` (${item.text || 'unlabelled'}) | ${item.status} | ${item.location} |`);
  }
  audit.push('', '## Scope', '', 'This audit checks every generated HTML page and every same-origin anchor. External services, API calls, mail links, phone links, and fragment-only links are intentionally excluded.');
  await writeFile(join(runDir, 'audit.md'), audit.join('\n') + '\n');
  await writeFile(join(runDir, 'medicine.md'), `# Medicine plan — run ${runNumber}\n\nRead by the manual Medicine workflow.\n\n${failures.length ? `Found ${failures.length} broken internal link(s). Apply the route-normalization and navigation generator, then rerun Doctor.` : 'Doctor found no broken internal links. Rebuild and rerun the page smoke tests as the final medicine check.'}\n`);
  console.log(`Doctor run ${runNumber}: ${pages.length} pages, ${failures.length} broken internal links.`);
  process.exitCode = failures.length ? 1 : 0;
} finally {
  await browser.close();
  server.kill();
}
