import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const outputDir = resolve(process.argv[2] || join(root, 'site'));
const excluded = new Set(['.git', '.github', '.gitignore', 'docs', 'scripts', 'site', 'node_modules']);
const ignoredFiles = new Set(['.env', '.env.local']);

const titleize = (value) => value
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (letter) => letter.toUpperCase());

const exists = (path) => existsSync(path);

async function findEntry(dir) {
  const preferred = ['index.html', 'web/index.html', 'dist/index.html', 'build/index.html', 'admin/index.html'];
  for (const candidate of preferred) {
    if (exists(join(dir, candidate))) return candidate;
  }

  const queue = [''];
  while (queue.length) {
    const current = queue.shift();
    const entries = await readdir(join(dir, current), { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const child = join(current, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === 'index.html') return child;
      if (entry.isDirectory()) queue.push(child);
    }
  }
  return null;
}

async function discoverDemos() {
  const entries = await readdir(root, { withFileTypes: true });
  const demos = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || excluded.has(entry.name) || entry.name.startsWith('.')) continue;
    const dir = join(root, entry.name);
    const entryFile = await findEntry(dir);
    if (!entryFile) continue;
    demos.push({
      slug: entry.name,
      title: titleize(entry.name),
      sourceDir: dir,
      entryFile,
      packageFile: exists(join(dir, 'package.json')) ? join(dir, 'package.json') : null,
    });
  }
  return demos.sort((a, b) => a.title.localeCompare(b.title));
}

function htmlEscape(value) {
  return value.replace(/[&<>\"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[character]));
}

function renderCatalog(demos) {
  const cards = demos.map((demo) => {
    const href = `./demos/${demo.slug}/${demo.entryFile}`;
    return `\n      <article class="demo-card">\n        <p class="demo-kicker">Interactive demo</p>\n        <h2>${htmlEscape(demo.title)}</h2>\n        <p>Open the frontend preview and explore the available screens, flows, and admin experience.</p>\n        <a class="demo-button" href="${href}">Open demo <span aria-hidden="true">→</span></a>\n      </article>`;
  }).join('');
  return `<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>Client Demo Hub</title>\n  <style>\n    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #0b1020; color: #f7f7fb; }\n    * { box-sizing: border-box; } body { margin: 0; background: radial-gradient(circle at 85% 0%, #29326a 0, transparent 38%), #0b1020; }\n    main { width: min(1120px, calc(100% - 40px)); margin: 0 auto; padding: 72px 0; }\n    .eyebrow { color: #a8b4ff; text-transform: uppercase; letter-spacing: .18em; font-size: .74rem; font-weight: 700; }\n    h1 { max-width: 760px; font-size: clamp(2.5rem, 6vw, 5.5rem); line-height: .98; margin: 16px 0 24px; letter-spacing: -.06em; }\n    .intro { max-width: 680px; color: #b5bdd8; font-size: 1.1rem; line-height: 1.7; }\n    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px; margin-top: 52px; }\n    .demo-card { border: 1px solid #2e3863; border-radius: 22px; padding: 28px; background: rgba(19, 27, 55, .78); box-shadow: 0 18px 50px rgba(0,0,0,.18); }\n    .demo-card h2 { margin: 10px 0; font-size: 1.45rem; } .demo-card p { color: #b5bdd8; line-height: 1.55; }\n    .demo-kicker { color: #a8b4ff !important; font-size: .74rem; letter-spacing: .1em; text-transform: uppercase; font-weight: 700; }\n    .demo-button { display: inline-flex; gap: 10px; margin-top: 18px; color: #0b1020; background: #c6d0ff; padding: 12px 16px; border-radius: 999px; font-weight: 800; text-decoration: none; }\n    .demo-button:hover { background: #fff; } .empty { color: #b5bdd8; padding: 28px; border: 1px dashed #53608f; border-radius: 18px; }\n  </style>\n</head>\n<body><main>\n  <p class="eyebrow">SmartGen client preview hub</p>\n  <h1>Choose a demo and start exploring.</h1>\n  <p class="intro">This catalog is generated from the folders in the repository. Add a project folder with any nested frontend <code>index.html</code>, push to <code>main</code>, and the workflow will discover it automatically.</p>\n  <section class="grid">${cards || '<p class="empty">No frontend demos were found yet. Add a folder containing an index.html file to get started.</p>'}\n  </section>\n</main></body></html>\n`;
}

const demos = await discoverDemos();
await rm(outputDir, { recursive: true, force: true });
await mkdir(join(outputDir, 'demos'), { recursive: true });
const catalog = renderCatalog(demos);
await writeFile(join(outputDir, 'index.html'), catalog);
await writeFile(join(outputDir, 'demos', 'index.html'), catalog);

for (const demo of demos) {
  const destination = join(outputDir, 'demos', demo.slug);
  await cp(demo.sourceDir, destination, {
    recursive: true,
    filter: (source) => {
      const name = source.split('/').pop();
      return !ignoredFiles.has(name) && !source.includes('/node_modules/');
    },
  });
}

const manifest = demos.map(({ slug, title, entryFile }) => ({ slug, title, entryFile }));
await writeFile(join(outputDir, 'demos', 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Discovered ${demos.length} demo project(s):`);
for (const demo of demos) console.log(`- ${demo.slug} -> demos/${demo.slug}/${demo.entryFile}`);
console.log(`Static demo hub written to ${relative(root, outputDir) || '.'}/`);
