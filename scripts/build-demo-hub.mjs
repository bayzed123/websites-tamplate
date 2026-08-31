import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const outputDir = resolve(process.argv[2] || join(root, 'site'));
const excluded = new Set(['.git', '.github', '.gitignore', 'docs', 'scripts', 'site', 'node_modules']);
const ignoredFiles = new Set(['.env', '.env.local']);
const exists = (path) => existsSync(path);
const titleize = (value) => value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

async function findEntry(dir) {
  const preferred = ['index.html', 'web/index.html', 'dist/index.html', 'build/index.html', 'admin/index.html'];
  for (const candidate of preferred) if (exists(join(dir, candidate))) return candidate;
  const queue = [''];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of await readdir(join(dir, current), { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const child = join(current, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === 'index.html') return child;
      if (entry.isDirectory()) queue.push(child);
    }
  }
  return null;
}

async function discoverDemos() {
  const demos = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || excluded.has(entry.name) || entry.name.startsWith('.')) continue;
    const sourceDir = join(root, entry.name);
    const entryFile = await findEntry(sourceDir);
    if (entryFile) demos.push({ slug: entry.name, title: titleize(entry.name), sourceDir, entryFile });
  }
  return demos.sort((a, b) => a.title.localeCompare(b.title));
}

async function collectHtmlPages(rootDir) {
  const pages = [];
  const queue = [''];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of await readdir(join(rootDir, current), { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const child = join(current, entry.name);
      if (entry.isDirectory()) queue.push(child);
      else if (/\.html?$/i.test(entry.name)) pages.push(child.replaceAll('\\', '/'));
    }
  }
  return pages.sort();
}

function resolveLocalTarget(demo, pathname) {
  const normalized = pathname.replace(/^\/+/, '');
  const aliases = new Map([
    ['', demo.entryFile],
    ['products', 'web/product.html'],
    ['admin/guide', 'web/admin/guide/index.html'],
  ]);
  const alias = [...aliases.entries()].find(([prefix]) => normalized === prefix || normalized.startsWith(`${prefix}/`));
  const candidates = alias ? [join(demo.sourceDir, alias[1])] : [join(demo.sourceDir, normalized), join(demo.sourceDir, 'web', normalized)];
  return candidates.find((candidate) => exists(candidate));
}

function renderDemoNav(demo, pages, current) {
  const links = pages.map((page) => {
    const target = relative(dirname(join(demo.sourceDir, current)), join(demo.sourceDir, page)).replaceAll('\\', '/');
    const href = target.startsWith('.') ? target : `./${target}`;
    const label = page === demo.entryFile ? 'Home' : titleize(page.replace(/\\/g, '/').replace(/\.html?$/i, '').split('/').join(' · '));
    return `<a href="${href}">${htmlEscape(label)}</a>`;
  }).join('');
  return `<nav class="demo-auto-nav" data-demo-auto-nav><strong>Demo pages</strong>${links}</nav>`;
}

async function injectDemoNav(demo) {
  const pages = await collectHtmlPages(demo.sourceDir);
  for (const page of pages) {
    const filePath = join(demo.sourceDir, page);
    let content = await readFile(filePath, 'utf8');
    if (content.includes('data-demo-auto-nav')) continue;
    const style = '<style>.demo-auto-nav{position:fixed;z-index:9999;left:12px;bottom:12px;display:flex;flex-wrap:wrap;gap:6px;max-width:calc(100vw - 24px);padding:8px 10px;border:1px solid rgba(40,30,40,.18);border-radius:999px;background:rgba(255,250,247,.94);box-shadow:0 8px 30px rgba(40,20,30,.16);font:600 11px/1.2 system-ui,sans-serif}.demo-auto-nav strong{padding:6px 8px;color:#76525c}.demo-auto-nav a{padding:6px 8px;border-radius:999px;color:#523743;background:#f5e7e4;text-decoration:none}.demo-auto-nav a:hover{background:#eab5bd}@media(max-width:600px){.demo-auto-nav{border-radius:16px;bottom:8px;font-size:10px}.demo-auto-nav strong{display:none}}</style>';
    const nav = renderDemoNav(demo, pages, page);
    content = content.replace('</head>', `${style}</head>`).replace('</body>', `${nav}</body>`);
    await writeFile(filePath, content);
  }
}

async function rewriteDemoUrls(demo) {
  const queue = [''];
  const absoluteUrl = /(["'(])\/(?!\/)([^"')\s#]*)/g;
  while (queue.length) {
    const current = queue.shift();
    const currentDir = join(demo.sourceDir, current);
    for (const entry of await readdir(currentDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const child = join(current, entry.name);
      if (entry.isDirectory()) { queue.push(child); continue; }
      if (!/\.(html?|css|js|mjs|ts|json)$/i.test(entry.name)) continue;
      const filePath = join(demo.sourceDir, child);
      let content = await readFile(filePath, 'utf8');
      content = content.replace(absoluteUrl, (match, opener, rawPath) => {
        const [pathname, query = ''] = rawPath.split('?');
        let localTarget = resolveLocalTarget(demo, pathname);
        if (!localTarget && pathname.startsWith('manus-storage/')) localTarget = join(demo.sourceDir, 'web/assets/asset-fallback.svg');
        if (!localTarget) return match;
        let replacement = relative(currentDir, localTarget).replaceAll('\\', '/');
        if (!replacement.startsWith('.')) replacement = `./${replacement}`;
        return `${opener}${replacement}${query ? `?${query}` : ''}`;
      });
      content = content.replace(/(href|src)="((?:\.\.\/)+[^"#]+)"/g, (match, attribute, rawPath) => {
        const direct = join(currentDir, rawPath);
        const fallback = join(demo.sourceDir, 'web', rawPath.replace(/^(\.\.\/)+/, ''));
        const localTarget = exists(direct) ? direct : exists(fallback) ? fallback : null;
        if (!localTarget) return match;
        let replacement = relative(currentDir, localTarget).replaceAll('\\\\', '/');
        if (!replacement.startsWith('.')) replacement = `./${replacement}`;
        return `${attribute}="${replacement}"`;
      });
      await writeFile(filePath, content);
    }
  }
}

function htmlEscape(value) {
  return value.replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[character]));
}

function renderCatalog(demos) {
  const cards = demos.map((demo) => `
      <article class="demo-card">
        <p class="demo-kicker">Interactive demo</p>
        <h2>${htmlEscape(demo.title)}</h2>
        <p>Open the frontend preview and explore the available screens, flows, and admin experience.</p>
        <a class="demo-button" href="./demos/${demo.slug}/${demo.entryFile}">Open demo <span aria-hidden="true">→</span></a>
      </article>`).join('');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Client Demo Hub</title>
<style>:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#0b1020;color:#f7f7fb}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0%,#29326a 0,transparent 38%),#0b1020}main{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:72px 0}.eyebrow{color:#a8b4ff;text-transform:uppercase;letter-spacing:.18em;font-size:.74rem;font-weight:700}h1{max-width:760px;font-size:clamp(2.5rem,6vw,5.5rem);line-height:.98;margin:16px 0 24px;letter-spacing:-.06em}.intro{max-width:680px;color:#b5bdd8;font-size:1.1rem;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:52px}.demo-card{border:1px solid #2e3863;border-radius:22px;padding:28px;background:rgba(19,27,55,.78);box-shadow:0 18px 50px rgba(0,0,0,.18)}.demo-card h2{margin:10px 0;font-size:1.45rem}.demo-card p{color:#b5bdd8;line-height:1.55}.demo-kicker{color:#a8b4ff!important;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;font-weight:700}.demo-button{display:inline-flex;gap:10px;margin-top:18px;color:#0b1020;background:#c6d0ff;padding:12px 16px;border-radius:999px;font-weight:800;text-decoration:none}.demo-button:hover{background:#fff}.empty{color:#b5bdd8;padding:28px;border:1px dashed #53608f;border-radius:18px}</style></head>
<body><main><p class="eyebrow">SmartGen client preview hub</p><h1>Choose a demo and start exploring.</h1><p class="intro">This catalog is generated from the folders in the repository. Add a project folder with any nested frontend <code>index.html</code>, push to <code>main</code>, and the workflow will discover it automatically.</p><section class="grid">${cards || '<p class="empty">No frontend demos were found yet. Add a folder containing an index.html file to get started.</p>'}</section></main></body></html>
`;
}

const demos = await discoverDemos();
await rm(outputDir, { recursive: true, force: true });
await mkdir(join(outputDir, 'demos'), { recursive: true });
const catalog = renderCatalog(demos);
await writeFile(join(outputDir, 'index.html'), catalog);
await writeFile(join(outputDir, 'demos', 'index.html'), catalog.replaceAll('./demos/', './'));
for (const demo of demos) {
  const destination = join(outputDir, 'demos', demo.slug);
  await cp(demo.sourceDir, destination, { recursive: true, filter: (source) => {
    const name = source.split('/').pop();
    return !ignoredFiles.has(name) && !source.includes('/node_modules/');
  }});
  const builtDemo = { ...demo, sourceDir: destination };
  await rewriteDemoUrls(builtDemo);
  await injectDemoNav(builtDemo);
}
await writeFile(join(outputDir, 'demos', 'manifest.json'), JSON.stringify(demos.map(({ slug, title, entryFile }) => ({ slug, title, entryFile })), null, 2) + '\n');
console.log(`Discovered ${demos.length} demo project(s):`);
for (const demo of demos) console.log(`- ${demo.slug} -> demos/${demo.slug}/${demo.entryFile}`);
console.log(`Static demo hub written to ${relative(root, outputDir) || '.'}/`);
