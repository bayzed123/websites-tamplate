/**
 * Client Demo Hub — static site builder.
 *
 * Discovers every top-level folder that contains a frontend entry point and
 * publishes three things:
 *
 *   site/index.html          the hub landing page
 *   site/d/<slug>/index.html a review wrapper: slim chrome + the demo in a frame
 *   site/demos/<slug>/...    the demo itself, byte-for-byte, nothing injected
 *
 * WHY THE WRAPPER, INSTEAD OF INJECTING CHROME INTO EACH DEMO PAGE
 * An earlier version rewrote every demo's HTML to add a floating contact card
 * and a page menu. Two problems with that: the widgets collided with demos that
 * position their own headers (Veloura alone has 26 fixed/sticky rules), and a
 * client reviewing "the real thing" was actually looking at a page we had
 * modified. Now the chrome lives in a wrapper page that frames the demo, so the
 * demo files ship exactly as built and "Open raw" hands over the genuine
 * article with nothing of ours on top.
 *
 * ADDING A DEMO
 * Drop a folder containing an index.html (or web/, dist/, build/, admin/) and
 * push. Optionally add demo.json beside it for the card copy — see readMeta().
 */

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const outputDir = resolve(process.argv[2] || join(root, 'site'));

const SITE = {
  url: 'https://demu.sayadbayezid.com',
  name: 'Demu — Client Demo Hub',
  owner: 'Sayad Md Bayezid Hosan',
  portfolio: 'https://sayadbayezid.com',
  contact: 'https://sayadbayezid.com/contact.html',
  whatsapp: 'https://wa.me/message/TDYG575YENF6F1',
  email: 'Support@sayadbayezid.com',
  repo: 'https://github.com/bayzed123/websites-tamplate',
};

// Folders that are repository plumbing rather than demos.
const EXCLUDED_DIRS = new Set(['.git', '.github', 'assets', 'docs', 'scripts', 'site', 'tests', 'node_modules', 'doctor-report', 'artifacts']);

/**
 * Files and folders that must never reach the published site.
 *
 * The hub is a public, indexed site, so anything copied here is world-readable.
 * Build plumbing, backend source, database migrations and internal working
 * notes are not part of the demo a client is reviewing, cannot run on a static
 * host anyway, and describe how the real systems are put together — so they
 * stay in the repository and out of the artifact.
 */
const BLOCKED_NAMES = new Set([
  'node_modules', 'tests', 'worker', 'migrations', '.wrangler', '.github',
  'package.json', 'package-lock.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml',
  'yarn.lock', 'wrangler.toml', 'wrangler.jsonc', 'schema.sql', 'tsconfig.json',
  'demo.json', 'todo.md',
]);
const BLOCKED_PATTERNS = [/^\./, /\.md$/i, /\.sql$/i, /\.tsx?$/i, /\.ya?ml$/i, /^\.env/i];

function isPublishable(name) {
  if (BLOCKED_NAMES.has(name)) return false;
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(name));
}

const exists = (path) => existsSync(path);
const titleize = (value) => value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const htmlEscape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function findEntry(dir) {
  const preferred = ['index.html', 'web/index.html', 'dist/index.html', 'build/index.html', 'admin/index.html'];
  for (const candidate of preferred) if (exists(join(dir, candidate))) return candidate;
  const queue = [''];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of await readdir(join(dir, current), { withFileTypes: true })) {
      if (!isPublishable(entry.name)) continue;
      const child = join(current, entry.name);
      if (entry.isFile() && entry.name.toLowerCase() === 'index.html') return child.replaceAll('\\', '/');
      if (entry.isDirectory()) queue.push(child);
    }
  }
  return null;
}

/** Pull the demo's own <title> and meta description as a fallback for demo.json. */
async function scrapeEntry(dir, entryFile) {
  try {
    const html = await readFile(join(dir, entryFile), 'utf8');
    const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim();
    const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)/i)?.[1]?.trim();
    return { title, description };
  } catch {
    return {};
  }
}

async function readMeta(slug, dir, entryFile) {
  let meta = {};
  const metaPath = join(dir, 'demo.json');
  if (exists(metaPath)) {
    try {
      meta = JSON.parse(await readFile(metaPath, 'utf8'));
    } catch (error) {
      console.warn(`  ! ${slug}/demo.json is not valid JSON — falling back to the page's own tags (${error.message})`);
    }
  }
  const scraped = await scrapeEntry(dir, entryFile);
  return {
    slug,
    entryFile: meta.entry || entryFile,
    title: meta.title || scraped.title || titleize(slug),
    tagline: meta.tagline || '',
    description: meta.description || scraped.description || 'A live, working preview you can click through.',
    category: meta.category || 'Demo',
    tags: Array.isArray(meta.tags) ? meta.tags : [],
    highlights: Array.isArray(meta.highlights) ? meta.highlights : [],
    credentials: meta.credentials || null,
    featured: Boolean(meta.featured),
  };
}

async function discoverDemos() {
  const demos = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || EXCLUDED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;
    const sourceDir = join(root, entry.name);
    const entryFile = await findEntry(sourceDir);
    if (!entryFile) {
      console.log(`  – ${entry.name}: no index.html yet, skipping (a client never sees a broken card)`);
      continue;
    }
    demos.push({ ...(await readMeta(entry.name, sourceDir, entryFile)), sourceDir });
  }
  // Featured first, then alphabetical — the landing page leads with the deepest build.
  return demos.sort((a, b) => Number(b.featured) - Number(a.featured) || a.title.localeCompare(b.title));
}

/** Collect the demo's own pages so the wrapper can offer a page switcher. */
async function collectPages(dir) {
  const pages = [];
  const queue = [''];
  while (queue.length) {
    const current = queue.shift();
    for (const entry of await readdir(join(dir, current), { withFileTypes: true })) {
      if (!isPublishable(entry.name)) continue;
      const child = join(current, entry.name).replaceAll('\\', '/');
      if (entry.isDirectory()) queue.push(child);
      else if (/\.html?$/i.test(entry.name)) pages.push(child);
    }
  }
  return pages.sort();
}

const PAGE_LABELS = {
  '404.html': 'Not Found', 'account.html': 'Account', 'admin.html': 'Admin Login',
  'admin/index.html': 'Admin Dashboard', 'admin/guide/index.html': 'Admin Guide',
  'blog.html': 'Journal', 'checkout.html': 'Checkout', 'invoice.html': 'Invoice',
  'product.html': 'Product Detail', 'sitemap.html': 'Site Map', 'track.html': 'Order Tracking',
};

function pageLabel(page, entryFile) {
  if (page === entryFile) return 'Home';
  const clean = page.replace(/^(web|dist|build)\//, '');
  if (clean === 'index.html') return 'Home';
  return PAGE_LABELS[clean] || titleize(clean.split('/').pop().replace(/\.html?$/i, ''));
}

/** Repoint absolute and manus-storage URLs at the copied files. */
function resolveLocalTarget(demo, pathname) {
  const normalized = pathname.replace(/^\/+/, '');
  const aliases = new Map([['', demo.entryFile], ['products', 'web/product.html'], ['admin/guide', 'web/admin/guide/index.html']]);
  const alias = [...aliases.entries()].find(([prefix]) => normalized === prefix || normalized.startsWith(`${prefix}/`));
  const candidates = alias ? [join(demo.sourceDir, alias[1])] : [join(demo.sourceDir, normalized), join(demo.sourceDir, 'web', normalized)];
  return candidates.find((candidate) => exists(candidate));
}

async function rewriteDemoUrls(demo) {
  const absoluteUrl = /(["'])\/(?!\/)([A-Za-z0-9_./?=&%\-]*)/g;
  const queue = [''];
  while (queue.length) {
    const current = queue.shift();
    const currentDir = join(demo.sourceDir, current);
    for (const entry of await readdir(currentDir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const child = join(current, entry.name);
      if (entry.isDirectory()) { queue.push(child); continue; }
      if (!/\.(html?|css|js|mjs|json)$/i.test(entry.name)) continue;
      const filePath = join(demo.sourceDir, child);
      let content = await readFile(filePath, 'utf8');
      const fallbackAsset = relative(currentDir, join(demo.sourceDir, 'web/assets/asset-fallback.svg')).replaceAll('\\', '/');
      content = content.replace(/(["'])\/manus-storage\/[^"']+/g, (match, opener) => `${opener}${fallbackAsset.startsWith('.') ? fallbackAsset : `./${fallbackAsset}`}`);
      if (/\.(html?|css)$/i.test(entry.name)) {
        content = content.replace(absoluteUrl, (match, opener, rawPath) => {
          const [pathname, query = ''] = rawPath.split('?');
          let localTarget = resolveLocalTarget(demo, pathname);
          if (!localTarget && pathname.startsWith('manus-storage/')) localTarget = join(demo.sourceDir, 'web/assets/asset-fallback.svg');
          if (!localTarget) return match;
          let replacement = relative(currentDir, localTarget).replaceAll('\\', '/');
          if (!replacement.startsWith('.')) replacement = `./${replacement}`;
          return `${opener}${replacement}${query ? `?${query}` : ''}`;
        });
      }
      if (/\.html?$/i.test(entry.name)) {
        content = content.replace(/(href|src)="((?:\.\.\/)+[^"#]+)"/g, (match, attribute, rawPath) => {
          const direct = join(currentDir, rawPath);
          const fallback = join(demo.sourceDir, 'web', rawPath.replace(/^(\.\.\/)+/, ''));
          const localTarget = exists(direct) ? direct : exists(fallback) ? fallback : null;
          if (!localTarget) return match;
          let replacement = relative(currentDir, localTarget).replaceAll('\\', '/');
          if (!replacement.startsWith('.')) replacement = `./${replacement}`;
          return `${attribute}="${replacement}"`;
        });
      }
      await writeFile(filePath, content);
    }
  }
}

export { discoverDemos, isPublishable, collectPages, pageLabel };

/* ------------------------------------------------------------------ styles */
/* One shared stylesheet for the hub and the viewer chrome. The palette
   deliberately matches sayadbayezid.com so a client moving between the
   portfolio and the demo hub sees one brand, not two products. */
const STYLES = `
:root{
  --void:#0A0F0D; --surface:#101613; --raised:#161F1A;
  --line:rgba(237,239,236,.10); --emerald:#00D084; --emerald-deep:#00A868;
  --gold:#D4AF6A; --paper:#EDEFEC; --soft:#93A199; --dim:#5C6A62;
  --ease:cubic-bezier(.16,1,.3,1);
}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--void);color:var(--paper);font-family:Inter,ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}
h1,h2,h3{font-family:Fraunces,Georgia,serif;font-weight:600;letter-spacing:-.02em;margin:0}
p{margin:0;line-height:1.65;color:var(--soft)}
:focus-visible{outline:2px solid var(--emerald);outline-offset:3px}
.mono{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace}
.skip{position:absolute;left:-999px;top:0;background:var(--emerald);color:var(--void);padding:12px 20px;z-index:200;font-weight:600}
.skip:focus{left:0}
.wrap{width:min(1180px,calc(100% - 48px));margin:0 auto}

/* header */
.site-head{position:sticky;top:0;z-index:100;background:rgba(10,15,13,.82);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.head-in{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:14px 0}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-family:'JetBrains Mono',monospace;font-size:.95rem;font-weight:500}
.brand em{font-style:normal;color:var(--emerald)}
.dot{width:8px;height:8px;border-radius:50%;background:var(--emerald);position:relative;flex:0 0 auto}
.dot::after{content:"";position:absolute;inset:-5px;border-radius:50%;border:1.5px solid var(--emerald);animation:ring 2.4s ease-out infinite}
@keyframes ring{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.3);opacity:0}}
.head-nav{display:flex;align-items:center;gap:22px;font-size:.88rem}
.head-nav a{color:var(--soft);text-decoration:none;transition:color .2s}
.head-nav a:hover{color:var(--paper)}
.head-cta{border:1px solid var(--line);border-radius:100px;padding:8px 16px;color:var(--paper)!important}
.head-cta:hover{border-color:var(--emerald);color:var(--emerald)!important}

/* hero */
.hero{padding:76px 0 44px;position:relative;overflow:hidden}
.hero::before{content:"";position:absolute;inset:0;z-index:-1;opacity:.5;
  background-image:linear-gradient(var(--line) 1px,transparent 1px),linear-gradient(90deg,var(--line) 1px,transparent 1px);
  background-size:64px 64px;mask-image:radial-gradient(ellipse 70% 60% at 25% 10%,#000 10%,transparent 75%)}
.eyebrow{display:inline-flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:.74rem;
  color:var(--emerald);text-transform:uppercase;letter-spacing:.09em;margin-bottom:22px}
.hero h1{font-size:clamp(2.3rem,5.2vw,4rem);line-height:1.05;max-width:16ch;margin-bottom:22px}
.hero h1 em{font-style:italic;color:var(--emerald)}
.lede{font-size:1.05rem;max-width:60ch}
.hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:30px}
.btn{display:inline-flex;align-items:center;gap:8px;padding:13px 22px;border-radius:100px;font-weight:600;
  font-size:.9rem;text-decoration:none;transition:transform .25s var(--ease),background .25s,border-color .25s}
.btn-primary{background:var(--emerald);color:var(--void)}
.btn-primary:hover{background:var(--paper);transform:translateY(-2px)}
.btn-ghost{border:1px solid var(--line);color:var(--paper)}
.btn-ghost:hover{border-color:var(--emerald);color:var(--emerald);transform:translateY(-2px)}
.arrow{transition:transform .25s var(--ease)}
.btn:hover .arrow,.card-open:hover .arrow{transform:translateX(4px)}

.hero-grid{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(300px,.75fr);gap:56px;align-items:center}
.hero-panel{border:1px solid var(--line);border-radius:20px;padding:24px;
  background:linear-gradient(150deg,var(--raised),var(--surface))}
.panel-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-bottom:22px}
.panel-stats>div{background:var(--void);padding:16px 12px;text-align:center}
.panel-stats b{display:block;font-family:Fraunces,Georgia,serif;font-size:1.6rem;color:var(--emerald)}
.panel-stats span{display:block;color:var(--dim);font-size:.7rem;line-height:1.35;margin-top:4px}
.panel-head{font-family:'JetBrains Mono',monospace;font-size:.67rem;text-transform:uppercase;
  letter-spacing:.08em;color:var(--dim);margin-bottom:10px}
.panel-list{display:grid;gap:7px}
.panel-list a{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;
  border:1px solid var(--line);border-radius:11px;text-decoration:none;font-size:.85rem;transition:all .2s}
.panel-list a:hover{border-color:var(--emerald);background:rgba(0,208,132,.06);transform:translateX(3px)}
.panel-list b{font-family:'JetBrains Mono',monospace;font-size:.66rem;color:var(--dim);font-weight:500;white-space:nowrap}
@media (max-width:980px){.hero-grid{grid-template-columns:1fr;gap:34px}}

/* toolbar */
.toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:8px 0 30px}
.chip{padding:8px 16px;border-radius:100px;border:1px solid var(--line);background:var(--surface);color:var(--soft);
  font-family:'JetBrains Mono',monospace;font-size:.73rem;cursor:pointer;transition:all .2s}
.chip:hover{border-color:var(--emerald);color:var(--emerald);transform:translateY(-2px)}
.chip[aria-pressed="true"]{background:var(--emerald);border-color:var(--emerald);color:var(--void);font-weight:600}
.count{margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:.73rem;color:var(--dim)}

/* cards */
.grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:22px;padding-bottom:80px}
.card{grid-column:span 3;display:flex;flex-direction:column;min-width:0;position:relative;overflow:hidden;
  background:linear-gradient(160deg,var(--raised),var(--surface));border:1px solid var(--line);border-radius:20px;
  text-decoration:none;transition:transform .4s var(--ease),border-color .3s,box-shadow .4s var(--ease)}
.card::after{content:"";position:absolute;left:0;top:0;bottom:0;width:2px;background:linear-gradient(180deg,var(--emerald),transparent);
  transform:scaleY(0);transform-origin:top;transition:transform .45s var(--ease)}
.card:hover{transform:translateY(-7px);border-color:rgba(0,208,132,.45);box-shadow:0 26px 64px rgba(0,0,0,.45)}
.card:hover::after{transform:scaleY(1)}
.card.featured{grid-column:span 6}
.card.featured .card-body{padding:36px 34px}
.card.featured h2{font-size:clamp(1.6rem,2.6vw,2.2rem)}
.card.featured .highlights{grid-template-columns:1fr 1fr}
.shot{display:block;position:relative;aspect-ratio:16/10;background:#07110D;border-bottom:1px solid var(--line);overflow:hidden}
.card.featured .shot{aspect-ratio:21/9}
.shot img{width:100%;height:100%;object-fit:cover;object-position:top center;display:block;
  transition:transform .5s var(--ease);opacity:.92}
.card:hover .shot img{transform:scale(1.03);opacity:1}
.shot .fallback{position:absolute;inset:0;display:grid;place-items:center;color:var(--dim);
  font-family:'JetBrains Mono',monospace;font-size:.76rem;text-align:center;padding:16px}
.card-body{padding:26px 24px;display:flex;flex-direction:column;flex:1;gap:12px}
.card-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.pill{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:100px;border:1px solid rgba(0,208,132,.35);
  font-family:'JetBrains Mono',monospace;font-size:.66rem;letter-spacing:.06em;text-transform:uppercase;color:var(--emerald)}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--emerald);animation:live 2.4s ease-out infinite}
@keyframes live{0%{box-shadow:0 0 0 0 rgba(0,208,132,.5)}70%{box-shadow:0 0 0 7px rgba(0,208,132,0)}100%{box-shadow:0 0 0 0 rgba(0,208,132,0)}}
.cat{font-family:'JetBrains Mono',monospace;font-size:.68rem;color:var(--dim)}
.card h2{font-size:1.3rem;line-height:1.25}
.tagline{color:var(--emerald);font-size:.85rem;font-weight:500}
.card p.desc{font-size:.92rem}
.highlights{list-style:none;margin:6px 0 0;padding:0;display:grid;gap:8px}
.highlights li{position:relative;padding-left:20px;font-size:.85rem;color:var(--soft);line-height:1.5}
.highlights li::before{content:"→";position:absolute;left:0;color:var(--emerald-deep);font-size:.78rem}
.tags{display:flex;flex-wrap:wrap;gap:7px}
.tag{font-family:'JetBrains Mono',monospace;font-size:.65rem;color:var(--dim);border:1px solid var(--line);border-radius:100px;padding:4px 10px}
.creds{margin-top:4px;padding:12px 14px;border-radius:12px;background:rgba(212,175,106,.07);border:1px solid rgba(212,175,106,.25)}
.creds b{display:block;font-family:'JetBrains Mono',monospace;font-size:.64rem;text-transform:uppercase;letter-spacing:.07em;color:var(--gold);margin-bottom:6px}
.creds code{font-family:'JetBrains Mono',monospace;font-size:.78rem;color:var(--paper);background:rgba(0,0,0,.28);padding:2px 7px;border-radius:5px}
.creds span{display:block;margin-top:7px;font-size:.76rem;color:var(--dim);line-height:1.5}
.card-foot{margin-top:auto;padding-top:18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.card-open{color:var(--emerald);font-weight:600;font-size:.88rem;text-decoration:none;display:inline-flex;gap:6px;align-items:center}
.card-raw{color:var(--dim);font-size:.82rem;text-decoration:none}
.card-raw:hover{color:var(--paper)}
.empty{grid-column:1/-1;text-align:center;padding:70px 20px;color:var(--dim);font-family:'JetBrains Mono',monospace;font-size:.85rem}

/* footer */
.site-foot{border-top:1px solid var(--line);background:var(--surface)}
.foot-in{display:grid;grid-template-columns:1.4fr 1fr;gap:40px;padding:48px 0 26px}
.foot-in h3{font-size:1.4rem;margin-bottom:10px}
.foot-links{display:flex;flex-direction:column;gap:9px;font-size:.88rem}
.foot-links a{color:var(--soft);text-decoration:none}
.foot-links a:hover{color:var(--emerald)}
.foot-head{font-family:'JetBrains Mono',monospace;font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:var(--dim);margin-bottom:6px}
.legal{border-top:1px solid var(--line);padding:16px 0;font-size:.78rem;color:var(--dim);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}

@media (max-width:980px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.card,.card.featured{grid-column:span 2}
  .card.featured .highlights{grid-template-columns:1fr}.foot-in{grid-template-columns:1fr}}
@media (max-width:680px){.wrap{width:calc(100% - 32px)}.grid{grid-template-columns:1fr}.card,.card.featured{grid-column:span 1}
  .head-nav a:not(.head-cta){display:none}.hero{padding:52px 0 32px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
`;

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">`;

const FAVICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%230A0F0D'/%3E%3Ccircle cx='50' cy='50' r='17' fill='%2300D084'/%3E%3C/svg%3E">`;

function header(active) {
  return `<header class="site-head"><div class="wrap head-in">
  <a class="brand" href="${SITE.url}/"><span class="dot"></span>Demu<em>·</em>Hub</a>
  <nav class="head-nav">
    <a href="/#demos"${active === 'demos' ? ' aria-current="page"' : ''}>Demos</a>
    <a href="/#how">How it works</a>
    <a href="${SITE.portfolio}" target="_blank" rel="noopener">Portfolio</a>
    <a class="head-cta" href="${SITE.contact}" target="_blank" rel="noopener">Start a project</a>
  </nav></div></header>`;
}

function footer() {
  return `<footer class="site-foot"><div class="wrap">
  <div class="foot-in">
    <div>
      <h3>Want one of these built for your business?</h3>
      <p>Every demo here is a real, working build — not a template screenshot. Tell me what you need and you'll get an honest answer about fit.</p>
      <div class="hero-actions"><a class="btn btn-primary" href="${SITE.contact}" target="_blank" rel="noopener">Start a project<span class="arrow">→</span></a><a class="btn btn-ghost" href="${SITE.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></div>
    </div>
    <div class="foot-links">
      <span class="foot-head">Elsewhere</span>
      <a href="${SITE.portfolio}" target="_blank" rel="noopener">sayadbayezid.com</a>
      <a href="${SITE.portfolio}/projects.html" target="_blank" rel="noopener">All projects</a>
      <a href="${SITE.repo}" target="_blank" rel="noopener">This repository</a>
      <a href="mailto:${SITE.email}">${SITE.email}</a>
    </div>
  </div>
  <div class="legal"><span>© <span id="yr"></span> ${SITE.owner}</span><span class="mono">Demos are fictional data. Nothing here is a live production system.</span></div>
</div><script>document.getElementById('yr').textContent=new Date().getFullYear()</script></footer>`;
}

/* ------------------------------------------------------------------ pages */
function renderCard(demo) {
  const featured = demo.featured ? ' featured' : '';
  const viewer = `/d/${demo.slug}/`;
  const raw = `/demos/${demo.slug}/${demo.entryFile}`;
  const highlights = demo.highlights.length
    ? `<ul class="highlights">${demo.highlights.map((h) => `<li>${htmlEscape(h)}</li>`).join('')}</ul>` : '';
  const tags = demo.tags.length
    ? `<div class="tags">${demo.tags.map((t) => `<span class="tag">${htmlEscape(t)}</span>`).join('')}</div>` : '';
  const creds = demo.credentials
    ? `<div class="creds"><b>${htmlEscape(demo.credentials.label || 'Demo sign-in')}</b>
       <code>${htmlEscape(demo.credentials.username || '')}</code> / <code>${htmlEscape(demo.credentials.password || '')}</code>
       ${demo.credentials.note ? `<span>${htmlEscape(demo.credentials.note)}</span>` : ''}</div>` : '';
  const tagline = demo.tagline ? `<p class="tagline">${htmlEscape(demo.tagline)}</p>` : '';

  return `<article class="card${featured}" data-category="${htmlEscape(demo.category)}" data-search="${htmlEscape(`${demo.title} ${demo.category} ${demo.tags.join(' ')} ${demo.description}`.toLowerCase())}">
  <a class="shot" href="${viewer}" aria-label="Open the ${htmlEscape(demo.title)} demo">
    <span class="fallback">${htmlEscape(demo.title)}</span>
    <img src="/assets/thumbs/${demo.slug}.webp" alt="Screenshot of the ${htmlEscape(demo.title)} demo" loading="lazy" decoding="async"
         onerror="this.style.display='none'">
  </a>
  <div class="card-body">
    <div class="card-top"><span class="pill">Live</span><span class="cat">${htmlEscape(demo.category)}</span></div>
    <h2>${htmlEscape(demo.title)}</h2>
    ${tagline}
    <p class="desc">${htmlEscape(demo.description)}</p>
    ${highlights}
    ${tags}
    ${creds}
    <div class="card-foot">
      <a class="card-open" href="${viewer}">Open demo <span class="arrow">→</span></a>
      <a class="card-raw" href="${raw}" target="_blank" rel="noopener">Open raw ↗</a>
    </div>
  </div>
</article>`;
}

function renderHome(demos) {
  const categories = [...new Set(demos.map((d) => d.category))].sort();
  const totalPages = demos.reduce((sum, d) => sum + (d.pageCount || 0), 0);
  const categoryCount = categories.length;
  const jump = demos.map((d) =>
    `<a href="/d/${d.slug}/"><span>${htmlEscape(d.title)}</span><b>${d.pageCount || 0} screen${d.pageCount === 1 ? '' : 's'}</b></a>`).join('');
  const chips = ['All', ...categories]
    .map((c, i) => `<button class="chip" data-filter="${htmlEscape(c)}" aria-pressed="${i === 0}">${htmlEscape(c)}</button>`).join('');
  const cards = demos.length ? demos.map(renderCard).join('\n')
    : '<p class="empty">No demos discovered yet. Add a folder with an index.html and push — it appears here on the next build.</p>';

  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: SITE.name, url: `${SITE.url}/`,
    description: 'Live, working client demos — storefronts, admin dashboards and commerce tools you can click through.',
    author: { '@type': 'Person', name: SITE.owner, url: SITE.portfolio },
    hasPart: demos.map((d) => ({ '@type': 'WebApplication', name: d.title, applicationCategory: d.category, url: `${SITE.url}/d/${d.slug}/`, description: d.description })),
  };

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${htmlEscape(SITE.name)} — live client demos you can click through</title>
<meta name="description" content="Live, working demos by ${htmlEscape(SITE.owner)} — storefronts, admin dashboards and commerce tools. Every one is a real build you can open and use, not a screenshot.">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${SITE.url}/">
<meta property="og:type" content="website"><meta property="og:url" content="${SITE.url}/">
<meta property="og:title" content="${htmlEscape(SITE.name)}"><meta property="og:description" content="Live, working client demos you can open and click through.">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0A0F0D">
${FONTS}${FAVICON}
<style>${STYLES}</style>
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head><body>
<a class="skip" href="#demos">Skip to demos</a>
${header('demos')}
<main>
  <section class="hero"><div class="wrap hero-grid">
    <div>
      <p class="eyebrow"><span class="dot" style="width:6px;height:6px"></span>${demos.length} live demo${demos.length === 1 ? '' : 's'} · updated on every push</p>
      <h1>Client demos you can <em>actually use</em>.</h1>
      <p class="lede">Not screenshots and not a slide deck. Every demo below is a working build — click through the real screens, sign into the real dashboards, and see how the thing behaves before you commission one.</p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="#demos">Browse the demos<span class="arrow">→</span></a>
        <a class="btn btn-ghost" href="${SITE.contact}" target="_blank" rel="noopener">Commission a build</a>
      </div>
    </div>
    <aside class="hero-panel">
      <div class="panel-stats">
        <div><b>${demos.length}</b><span>live demo${demos.length === 1 ? '' : 's'}</span></div>
        <div><b>${totalPages}</b><span>screens to click</span></div>
        <div><b>${categoryCount}</b><span>categor${categoryCount === 1 ? 'y' : 'ies'}</span></div>
      </div>
      <p class="panel-head">Jump straight in</p>
      <div class="panel-list">${jump}</div>
    </aside>
  </div></section>

  <section id="demos"><div class="wrap">
    <div class="toolbar" id="toolbar">${chips}<span class="count" id="count" aria-live="polite"></span></div>
    <div class="grid" id="grid">${cards}</div>
  </div></section>

  <section id="how"><div class="wrap" style="padding-bottom:70px">
    <h2 style="font-size:1.7rem;margin-bottom:14px">How this hub stays current</h2>
    <p class="lede">Every folder in the repository that contains an <code class="mono">index.html</code> becomes a demo automatically. There is no list to maintain: add the folder, push, and the build discovers it, screenshots it, checks that it loads on desktop and mobile, and publishes it. A demo that fails its check never reaches this page.</p>
  </div></section>
</main>
${footer()}
<script>
/* Category filter + count. Cards are real HTML in the document — the filter
   only shows and hides what the crawler has already seen. */
(function(){
  var grid=document.getElementById('grid'),chips=[].slice.call(document.querySelectorAll('#toolbar .chip'));
  var cards=[].slice.call(grid.querySelectorAll('.card')),count=document.getElementById('count');
  function setCount(n){count.textContent=n+' demo'+(n===1?'':'s')+' shown';}
  function apply(f){var shown=0;cards.forEach(function(c){
    var ok=(f==='All'||c.dataset.category===f);c.style.display=ok?'':'none';if(ok)shown++;});setCount(shown);}
  chips.forEach(function(b){b.addEventListener('click',function(){
    chips.forEach(function(o){o.setAttribute('aria-pressed',String(o===b));});apply(b.dataset.filter);});});
  setCount(cards.length);
})();
</script>
</body></html>`;
}

/**
 * The review wrapper. Slim chrome on top, the demo itself in a frame below.
 * Nothing is injected into the demo's own HTML, so what loads in the frame is
 * byte-for-byte what "Open raw" serves.
 */
function renderViewer(demo, pages) {
  const options = pages.map((page) =>
    `<option value="/demos/${demo.slug}/${page}"${page === demo.entryFile ? ' selected' : ''}>${htmlEscape(pageLabel(page, demo.entryFile))}</option>`).join('');
  const src = `/demos/${demo.slug}/${demo.entryFile}`;
  const creds = demo.credentials
    ? `<span class="vb-creds mono" title="${htmlEscape(demo.credentials.note || '')}">${htmlEscape(demo.credentials.username || '')} / ${htmlEscape(demo.credentials.password || '')}</span>` : '';

  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${htmlEscape(demo.title)} — ${htmlEscape(SITE.name)}</title>
<meta name="description" content="${htmlEscape(demo.description)}">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${SITE.url}/d/${demo.slug}/">
<meta property="og:type" content="website"><meta property="og:url" content="${SITE.url}/d/${demo.slug}/">
<meta property="og:title" content="${htmlEscape(demo.title)}"><meta property="og:description" content="${htmlEscape(demo.description)}">
<meta name="theme-color" content="#0A0F0D">
${FONTS}${FAVICON}
<style>${STYLES}
html,body{height:100%;overflow:hidden}
.viewer{display:flex;flex-direction:column;height:100vh}
.vbar{flex:0 0 auto;display:flex;align-items:center;gap:14px;padding:0 16px;height:52px;
  background:rgba(10,15,13,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.vb-back{display:inline-flex;align-items:center;gap:7px;color:var(--soft);text-decoration:none;font-size:.85rem;white-space:nowrap}
.vb-back:hover{color:var(--emerald)}
.vb-name{font-family:Fraunces,Georgia,serif;font-size:.98rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vb-sep{width:1px;height:22px;background:var(--line);flex:0 0 auto}
.vbar select{background:var(--surface);color:var(--paper);border:1px solid var(--line);border-radius:8px;
  padding:6px 10px;font-family:'JetBrains Mono',monospace;font-size:.74rem;max-width:190px}
.vb-creds{font-size:.7rem;color:var(--gold);border:1px solid rgba(212,175,106,.3);border-radius:7px;padding:4px 9px;white-space:nowrap}
.vb-right{margin-left:auto;display:flex;align-items:center;gap:8px}
.vb-btn{border:1px solid var(--line);background:var(--surface);color:var(--soft);border-radius:8px;padding:6px 11px;
  font-size:.74rem;font-family:'JetBrains Mono',monospace;cursor:pointer;text-decoration:none;transition:all .2s}
.vb-btn:hover{border-color:var(--emerald);color:var(--emerald)}
.vb-btn[aria-pressed="true"]{background:var(--emerald);border-color:var(--emerald);color:var(--void)}
.stage{flex:1;min-height:0;background:#07110D;display:grid;place-items:stretch;padding:0;transition:padding .3s var(--ease)}
.stage.phone{padding:18px;place-items:center}
.stage iframe{width:100%;height:100%;border:0;background:#fff}
.stage.phone iframe{width:390px;max-width:100%;height:100%;max-height:844px;border-radius:26px;
  border:9px solid #1b241f;box-shadow:0 26px 70px rgba(0,0,0,.6)}
@media (max-width:760px){.vb-name,.vb-creds{display:none}.vbar{gap:9px;padding:0 10px}.vbar select{max-width:130px}}
</style></head><body>
<div class="viewer">
  <div class="vbar">
    <a class="vb-back" href="/">← <span>All demos</span></a>
    <span class="vb-sep"></span>
    <span class="vb-name">${htmlEscape(demo.title)}</span>
    <span class="vb-sep"></span>
    <select id="pageSel" aria-label="Jump to a page in this demo">${options}</select>
    ${creds}
    <span class="vb-right">
      <button class="vb-btn" id="deskBtn" aria-pressed="true">Desktop</button>
      <button class="vb-btn" id="mobBtn" aria-pressed="false">Mobile</button>
      <a class="vb-btn" id="rawLink" href="${src}" target="_blank" rel="noopener">Open raw ↗</a>
    </span>
  </div>
  <div class="stage" id="stage"><iframe id="frame" src="${src}" title="${htmtitle(demo)}" loading="eager"></iframe></div>
</div>
<script>
(function(){
  var frame=document.getElementById('frame'),sel=document.getElementById('pageSel'),
      stage=document.getElementById('stage'),raw=document.getElementById('rawLink'),
      desk=document.getElementById('deskBtn'),mob=document.getElementById('mobBtn');
  sel.addEventListener('change',function(){frame.src=sel.value;raw.href=sel.value;});
  function mode(phone){stage.classList.toggle('phone',phone);
    desk.setAttribute('aria-pressed',String(!phone));mob.setAttribute('aria-pressed',String(phone));}
  desk.addEventListener('click',function(){mode(false);});
  mob.addEventListener('click',function(){mode(true);});
})();
</script>
</body></html>`;
}

function htmtitle(demo) { return htmlEscape(`${demo.title} demo`); }

/* ------------------------------------------------------------------- build */
function renderSitemap(demos) {
  const today = new Date().toISOString().split('T')[0];
  const urls = [`${SITE.url}/`, ...demos.map((d) => `${SITE.url}/d/${d.slug}/`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((loc, i) => `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>${i === 0 ? '1.0' : '0.8'}</priority>\n  </url>`)
    .join('\n')}\n</urlset>\n`;
}

const demos = await discoverDemos();

await rm(outputDir, { recursive: true, force: true });
await mkdir(join(outputDir, 'demos'), { recursive: true });
if (exists(join(root, 'assets'))) await cp(join(root, 'assets'), join(outputDir, 'assets'), { recursive: true });
await mkdir(join(outputDir, 'assets', 'thumbs'), { recursive: true });

let blocked = 0;
for (const demo of demos) {
  const destination = join(outputDir, 'demos', demo.slug);
  await cp(demo.sourceDir, destination, {
    recursive: true,
    filter: (source) => {
      if (source === demo.sourceDir) return true;
      const name = source.split('/').pop();
      const ok = isPublishable(name);
      if (!ok) blocked += 1;
      return ok;
    },
  });
  const built = { ...demo, sourceDir: destination };
  await rewriteDemoUrls(built);

  const pages = await collectPages(destination);
  await mkdir(join(outputDir, 'd', demo.slug), { recursive: true });
  await writeFile(join(outputDir, 'd', demo.slug, 'index.html'), renderViewer(demo, pages));
  demo.pageCount = pages.length;
}

await writeFile(join(outputDir, 'index.html'), renderHome(demos));
await writeFile(join(outputDir, 'sitemap.xml'), renderSitemap(demos));
await writeFile(join(outputDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`);
await writeFile(join(outputDir, '.nojekyll'), '');
await writeFile(
  join(outputDir, 'demos', 'manifest.json'),
  JSON.stringify(demos.map(({ slug, title, entryFile, category, pageCount }) => ({ slug, title, entryFile, category, pageCount })), null, 2) + '\n',
);

console.log(`\nDiscovered ${demos.length} demo project(s):`);
for (const demo of demos) console.log(`- ${demo.slug} → /d/${demo.slug}/  (raw: demos/${demo.slug}/${demo.entryFile}, ${demo.pageCount} page(s))`);
console.log(`\nHeld back ${blocked} internal file(s)/folder(s) from the public artifact.`);
console.log(`Demo hub written to ${relative(root, outputDir) || '.'}/`);
