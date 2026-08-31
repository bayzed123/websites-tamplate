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

function pageLabel(page, entryFile) {
  const clean = page.replace(/^web\//, '');
  if (page === entryFile || clean === 'index.html') return 'Home';
  const labels = { '404.html': 'Page Not Found', 'account.html': 'Customer Account', 'admin.html': 'Admin Login', 'admin/index.html': 'Admin Dashboard', 'admin/guide/index.html': 'Admin Guide', 'blog.html': 'Journal', 'checkout.html': 'Checkout', 'invoice.html': 'Invoice', 'product.html': 'Product Details', 'sitemap.html': 'Site Map', 'track.html': 'Order Tracking' };
  return labels[clean] || titleize(clean.split('/').pop().replace(/\.html?$/i, ''));
}

function renderContactWidget(demo, current) {
  const contactImage = relative(dirname(join(demo.sourceDir, current)), join(outputDir, 'assets/developer.jpg')).replaceAll('\\', '/');
  const imageHref = contactImage.startsWith('.') ? contactImage : `./${contactImage}`;
  return `<button class="dev-contact-trigger" type="button" data-dev-contact-open aria-label="Open developer contact card"><img src="${imageHref}" alt="Developer profile"><span>Need a custom build?</span><b>Contact</b></button><div class="dev-contact-backdrop" data-dev-contact-close></div><aside class="dev-contact-card" role="dialog" aria-modal="true" aria-labelledby="dev-contact-title"><button class="dev-contact-close" type="button" data-dev-contact-close aria-label="Close contact card">×</button><img class="dev-contact-photo" src="${imageHref}" alt="Developer profile"><p class="dev-contact-kicker">BUILD WITH SAYAD BAYEZID</p><h2 id="dev-contact-title">Let’s make your next demo memorable.</h2><p class="dev-contact-copy">UI/UX, frontend, admin dashboards and full-stack demo experiences—planned and shipped with care.</p><div class="dev-contact-actions"><a class="dev-contact-primary" href="https://sayadbayezid.com/contact.html" target="_blank" rel="noopener">Open contact page ↗</a><a class="dev-contact-whatsapp" href="https://wa.me/message/TDYG575YENF6F1" target="_blank" rel="noopener">Chat on WhatsApp</a></div><div class="dev-contact-mails"><a href="mailto:Support@sayadbayezid.com">Support@sayadbayezid.com</a><a href="mailto:cwb.agency@outlook.com">cwb.agency@outlook.com</a></div></aside><script>(function(){const open=document.querySelector('[data-dev-contact-open]'),card=document.querySelector('.dev-contact-card'),back=document.querySelector('.dev-contact-backdrop');const close=()=>{card.classList.remove('is-open');back.classList.remove('is-open');};open?.addEventListener('click',()=>{card.classList.add('is-open');back.classList.add('is-open');});document.querySelectorAll('[data-dev-contact-close]').forEach((node)=>node.addEventListener('click',close));document.addEventListener('keydown',(e)=>{if(e.key==='Escape')close();});})();</script>`;
}

function renderDemoNav(demo, pages, current) {
  const links = pages.map((page) => {
    const target = relative(dirname(join(demo.sourceDir, current)), join(demo.sourceDir, page)).replaceAll('\\', '/');
    const href = target.startsWith('.') ? target : `./${target}`;
    return `<a href="${href}">${htmlEscape(pageLabel(page, demo.entryFile))}</a>`;
  }).join('');
  return `<button class="demo-nav-trigger" type="button" data-demo-nav-trigger aria-expanded="false" aria-controls="demo-page-links">☰ <span>Pages</span></button><nav class="demo-auto-nav" data-demo-auto-nav><div class="demo-nav-title">Demo pages</div><div id="demo-page-links" class="demo-page-links">${links}</div></nav><script>(function(){const b=document.querySelector('[data-demo-nav-trigger]'),n=document.querySelector('[data-demo-auto-nav]');b?.addEventListener('click',()=>{const open=n.classList.toggle('is-open');b.setAttribute('aria-expanded',String(open));});})();</script>`;
}

async function injectDemoNav(demo) {
  const pages = await collectHtmlPages(demo.sourceDir);
  for (const page of pages) {
    const filePath = join(demo.sourceDir, page);
    let content = await readFile(filePath, 'utf8');
    if (content.includes('data-demo-auto-nav')) continue;
    const style = '<style>.demo-nav-trigger{position:fixed;z-index:10000;left:12px;bottom:12px;border:1px solid rgba(40,30,40,.18);border-radius:999px;padding:9px 13px;background:#fffaf7;color:#523743;box-shadow:0 8px 30px rgba(40,20,30,.16);font:700 12px/1 system-ui,sans-serif;cursor:pointer}.demo-auto-nav{position:fixed;z-index:9999;left:12px;bottom:56px;display:none;width:min(220px,calc(100vw - 24px));padding:10px;border:1px solid rgba(40,30,40,.18);border-radius:16px;background:rgba(255,250,247,.97);box-shadow:0 8px 30px rgba(40,20,30,.16);font:600 12px/1.2 system-ui,sans-serif}.demo-auto-nav.is-open{display:block}.demo-nav-title{padding:4px 8px 8px;color:#76525c;font-size:10px;letter-spacing:.12em;text-transform:uppercase}.demo-page-links{display:grid;gap:3px;max-height:50vh;overflow:auto}.demo-auto-nav a{padding:8px 9px;border-radius:9px;color:#523743;background:#f5e7e4;text-decoration:none}.demo-auto-nav a:hover{background:#eab5bd}@media(max-width:600px){.demo-nav-trigger{left:10px;bottom:10px}.demo-auto-nav{left:10px;bottom:52px}}</style>';
    const nav = renderDemoNav(demo, pages, page);
    const contact = renderContactWidget(demo, page);
    const contactStyle = '<style>.dev-contact-trigger{position:fixed;z-index:10000;right:14px;bottom:14px;display:flex;align-items:center;gap:8px;padding:7px 11px 7px 7px;border:1px solid rgba(90,70,130,.2);border-radius:999px;background:rgba(255,255,255,.96);color:#202746;box-shadow:0 10px 30px rgba(20,25,60,.16);font:700 11px/1 system-ui,sans-serif;cursor:pointer}.dev-contact-trigger img{width:28px;height:28px;object-fit:cover;border-radius:50%}.dev-contact-trigger b{padding:6px 8px;border-radius:999px;background:#6d78ef;color:#fff}.dev-contact-backdrop{position:fixed;inset:0;z-index:10001;background:rgba(8,12,30,.32);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:.2s}.dev-contact-backdrop.is-open{opacity:1;pointer-events:auto}.dev-contact-card{position:fixed;z-index:10002;right:18px;bottom:18px;width:min(360px,calc(100vw - 36px));padding:24px;border:1px solid rgba(130,120,180,.22);border-radius:22px;background:linear-gradient(145deg,#fff,#f2f1ff);box-shadow:0 24px 80px rgba(10,15,50,.3);transform:translateY(20px) scale(.97);opacity:0;pointer-events:none;transition:.2s}.dev-contact-card.is-open{transform:none;opacity:1;pointer-events:auto}.dev-contact-close{position:absolute;right:12px;top:10px;border:0;background:transparent;color:#6d7692;font-size:24px;cursor:pointer}.dev-contact-photo{width:56px;height:56px;border-radius:16px;object-fit:cover;box-shadow:0 8px 20px rgba(70,60,140,.2)}.dev-contact-kicker{margin:17px 0 7px;color:#6d78ef;font:800 10px/1 system-ui,sans-serif;letter-spacing:.15em}.dev-contact-card h2{margin:0;color:#171d3b;font:800 26px/1.05 Georgia,serif;letter-spacing:-.04em}.dev-contact-copy{color:#707892;line-height:1.6;font-size:13px}.dev-contact-actions{display:grid;gap:8px;margin-top:18px}.dev-contact-actions a{display:block;padding:11px 13px;border-radius:10px;text-align:center;text-decoration:none;font:700 12px system-ui,sans-serif}.dev-contact-primary{background:#171d3b;color:#fff}.dev-contact-whatsapp{background:#dff8ec;color:#16865c}.dev-contact-mails{display:grid;gap:4px;margin-top:15px}.dev-contact-mails a{color:#5663c9;font-size:11px;text-decoration:none;word-break:break-all}@media(max-width:600px){.dev-contact-trigger{right:10px;bottom:10px}.dev-contact-trigger span{display:none}.dev-contact-card{right:10px;bottom:10px;width:calc(100vw - 20px)}}</style>';
    content = content.replace('</head>', `${style}${contactStyle}</head>`).replace('</body>', `${nav}${contact}</body>`);
    await writeFile(filePath, content);
  }
}

async function rewriteDemoUrls(demo) {
  const queue = [''];
  const absoluteUrl = /(["'])\/(?!\/)([A-Za-z0-9_./?=&%\-]*)/g;
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
      const fallbackAsset = relative(currentDir, join(demo.sourceDir, 'web/assets/asset-fallback.svg')).replaceAll('\\\\', '/');
      content = content.replace(/(["'])\/manus-storage\/[^"']+/g, (match, opener) => `${opener}${fallbackAsset.startsWith('.') ? fallbackAsset : `./${fallbackAsset}`}`);
      if (/\.(html?|css)$/i.test(entry.name)) content = content.replace(absoluteUrl, (match, opener, rawPath) => {
        const [pathname, query = ''] = rawPath.split('?');
        let localTarget = resolveLocalTarget(demo, pathname);
        if (!localTarget && pathname.startsWith('manus-storage/')) localTarget = join(demo.sourceDir, 'web/assets/asset-fallback.svg');
        if (!localTarget) return match;
        let replacement = relative(currentDir, localTarget).replaceAll('\\', '/');
        if (!replacement.startsWith('.')) replacement = `./${replacement}`;
        return `${opener}${replacement}${query ? `?${query}` : ''}`;
      });
      if (/\.html?$/i.test(entry.name)) content = content.replace(/(href|src)="((?:\.\.\/)+[^"#]+)"/g, (match, attribute, rawPath) => {
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
<style>:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#0b1020;color:#f7f7fb}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 85% 0%,#29326a 0,transparent 38%),#0b1020}main{width:min(1120px,calc(100% - 40px));margin:0 auto;padding:72px 0}.eyebrow{color:#a8b4ff;text-transform:uppercase;letter-spacing:.18em;font-size:.74rem;font-weight:700}h1{max-width:760px;font-size:clamp(2.5rem,6vw,5.5rem);line-height:.98;margin:16px 0 24px;letter-spacing:-.06em}.intro{max-width:680px;color:#b5bdd8;font-size:1.1rem;line-height:1.7}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-top:52px}.demo-card{border:1px solid #2e3863;border-radius:22px;padding:28px;background:rgba(19,27,55,.78);box-shadow:0 18px 50px rgba(0,0,0,.18)}.demo-card h2{margin:10px 0;font-size:1.45rem}.demo-card p{color:#b5bdd8;line-height:1.55}.demo-kicker{color:#a8b4ff!important;font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;font-weight:700}.demo-button{display:inline-flex;gap:10px;margin-top:18px;color:#0b1020;background:#c6d0ff;padding:12px 16px;border-radius:999px;font-weight:800;text-decoration:none}.demo-button:hover{background:#fff}.empty{color:#b5bdd8;padding:28px;border:1px dashed #53608f;border-radius:18px}.hub-contact{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:30px;padding:14px 16px;border:1px solid #394575;border-radius:18px;background:#151e3d}.hub-contact img{width:42px;height:42px;object-fit:cover;border-radius:50%}.hub-contact div{flex:1;min-width:190px}.hub-contact strong,.hub-contact span{display:block}.hub-contact span{color:#b5bdd8;font-size:12px;margin-top:3px}.hub-contact a{color:#0b1020;background:#c6d0ff;padding:9px 12px;border-radius:999px;font-weight:800;text-decoration:none;font-size:11px}.hub-contact a:nth-last-child(2){background:#b9f1d6}.hub-contact a:last-child{background:#fff}</style></head>
<body><main><p class="eyebrow">SmartGen client preview hub</p><h1>Choose a demo and start exploring.</h1><p class="intro">This catalog is generated from the folders in the repository. Add a project folder with any nested frontend <code>index.html</code>, push to <code>main</code>, and the workflow will discover it automatically.</p><section class="grid">${cards || '<p class="empty">No frontend demos were found yet. Add a folder containing an index.html file to get started.</p>'}</section><div class="hub-contact"><img src="./assets/developer.jpg" alt="Developer profile"><div><strong>Need a custom demo?</strong><span>Contact Sayad Bayezid for UI/UX and frontend work.</span></div><a href="https://sayadbayezid.com/contact.html" target="_blank" rel="noopener">Contact ↗</a><a href="https://wa.me/message/TDYG575YENF6F1" target="_blank" rel="noopener">WhatsApp</a><a href="mailto:Support@sayadbayezid.com">Email</a></div></main></body></html>
`;
}

const demos = await discoverDemos();
await rm(outputDir, { recursive: true, force: true });
await mkdir(join(outputDir, 'demos'), { recursive: true });
if (exists(join(root, 'assets'))) await cp(join(root, 'assets'), join(outputDir, 'assets'), { recursive: true });
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
