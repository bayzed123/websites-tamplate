import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const reportRoot = resolve(process.argv[2] || join(root, 'doctor-report'));
const runs = (await readdir(reportRoot).catch(() => [])).filter((name) => /^run-\d+$/.test(name)).sort((a, b) => Number(b.slice(4)) - Number(a.slice(4)));
if (!runs.length) throw new Error('No Doctor report found. Run the manual Doctor workflow first.');
const latest = runs[0];
const auditPath = join(reportRoot, latest, 'audit.md');
const audit = await readFile(auditPath, 'utf8');
const fix = `# Medicine result — ${latest}\n\n## Doctor input\n\nRead: ${auditPath}\n\n## Applied medicine\n\nThe root build pipeline is the repair point for every demo. On the next build it will:\n\n1. Discover every root project folder containing an HTML entry point.\n2. Rewrite root-absolute local URLs to paths that work under the repository Pages subpath.\n3. Resolve the root, product, and admin guide aliases to real demo files where available.\n4. Inject a responsive **Demo pages** sidebar into every generated HTML page.\n5. Preserve all file types and exclude only local secret environment files.\n6. Rerun Playwright desktop/mobile checks before deployment.\n\n## Audit input summary\n\n${audit.includes('Broken internal links: 0') ? 'Doctor reported zero broken internal links.' : 'Doctor reported findings. The next build applies the universal route and navigation medicine; run Doctor again to confirm the result.'}\n`;
await mkdir(join(reportRoot, latest), { recursive: true });
await writeFile(join(reportRoot, latest, 'medicine-fixed.md'), fix);
console.log(`Medicine read ${latest}/audit.md and wrote ${latest}/medicine-fixed.md`);
