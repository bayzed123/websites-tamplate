#!/usr/bin/env node
/**
 * Builds the two Lk's Attire demos for the hub from the real store's source:
 *
 *   lks-attire-shop/    the customer storefront
 *   lks-attire-admin/   the admin dashboard
 *
 * Both run the store's real Worker code in the browser (engine.mjs + browser-runtime.mjs),
 * so every feature works without a server, and they share one in-browser database.
 *
 * Usage (from the repository root):
 *   npm i --no-save esbuild sql.js
 *   node scripts/lks-attire-demo/build.mjs ../lks-attire
 *
 * The output folders are committed; re-run this after changes to the store.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pbkdf2Sync, randomBytes, createHash } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const SRC = resolve(process.argv[2] ?? "../lks-attire");
const require = createRequire(join(process.cwd(), "package.json"));
const esbuild = require("esbuild");
const initSqlJs = require("sql.js");
const SQL_DIST = dirname(require.resolve("sql.js"));

if (!existsSync(join(SRC, "worker/src/index.ts"))) throw new Error(`Lk's Attire source not found at ${SRC}`);
const log = (m) => console.log(`• ${m}`);

// ---------- 1. Build the brand (dist/, dist-seed/seed.sql, brand.generated.ts) ----------
log("building the Lk's Attire brand");
execFileSync("node", ["scripts/build-brand.mjs"], { cwd: SRC, stdio: "inherit", env: { ...process.env, BRAND: "lks-attire" } });
const DIST = join(SRC, "dist");

// ---------- 2. Bundle the engine for Node, to generate the demo data with the real API ----------
const TMP = join(REPO, "artifacts/lks-attire-demo");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const alias = { "lks-worker": join(SRC, "worker/src/index.ts") };
const nodePaths = [join(SRC, "node_modules")];
await esbuild.build({ entryPoints: [join(HERE, "engine.mjs")], bundle: true, format: "esm", platform: "node", outfile: join(TMP, "engine.node.mjs"), alias, nodePaths, logLevel: "warning" });
const { createBackend } = await import(pathToFileURL(join(TMP, "engine.node.mjs")).href);

// ---------- 3. Database: schema, the store's seed, then a realistic history made through the API ----------
log("creating the demo database");
const SQL = await initSqlJs();
const db = new SQL.Database();
for (const f of readdirSync(join(SRC, "worker/migrations")).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(SRC, "worker/migrations", f), "utf8"));
db.exec(readFileSync(join(SRC, "dist-seed/seed.sql"), "utf8"));

// Demo notice in the announcement bar (editable in Admin → Settings like the real one).
const store = JSON.parse(db.exec("SELECT value FROM settings WHERE key = 'store'")[0].values[0][0]);
store.announcement_en = "Demo store — try ordering! Nothing is charged or delivered. · Cash on Delivery all over Bangladesh";
store.announcement_bn = "ডেমো স্টোর — অর্ডার করে দেখুন! কোনো টাকা কাটা বা ডেলিভারি হবে না। · সারা বাংলাদেশে ক্যাশ অন ডেলিভারি";
db.run("UPDATE settings SET value = ? WHERE key = 'store'", [JSON.stringify(store)]);
// Show every wallet in the demo (the real store switches each on in Admin → Settings → Payments).
const payments = JSON.parse(db.exec("SELECT value FROM settings WHERE key = 'payments'")[0].values[0][0]);
payments.rocket = { ...payments.rocket, enabled: true, manualNumber: "01700000000" };
db.run("UPDATE settings SET value = ? WHERE key = 'payments'", [JSON.stringify(payments)]);

// Product photos are stored with root paths (/assets/…); the demo serves them from its own folder.
const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%'")[0].values.flat();
for (const t of tables) {
  for (const [, c, type] of db.exec(`PRAGMA table_info(${t})`)[0].values) {
    if (!/TEXT/i.test(type)) continue;
    db.exec(`UPDATE ${t} SET ${c} = replace(${c}, '"/assets/', '"assets/') WHERE ${c} LIKE '%"/assets/%'`);
    db.exec(`UPDATE ${t} SET ${c} = 'assets/' || substr(${c}, 9) WHERE ${c} LIKE '/assets/%'`);
  }
}

// The published demo sign-in: username "demo", password "demo12345".
const salt = randomBytes(16);
const hash = `pbkdf2$100000$${salt.toString("base64")}$${pbkdf2Sync("demo12345", salt, 100000, 32, "sha256").toString("base64")}`;
db.run("INSERT INTO admins (name, email, password_hash, role) VALUES ('Demo Owner', 'demo', ?, 'super_admin')", [hash]);
const staffSalt = randomBytes(16);
db.run("INSERT INTO admins (name, email, password_hash, role) VALUES ('Rina (orders)', 'rina', ?, 'order_processor')", [`pbkdf2$100000$${staffSalt.toString("base64")}$${pbkdf2Sync("rina-demo-123", staffSalt, 100000, 32, "sha256").toString("base64")}`]);

const mem = () => { let v = null; return { load: () => v, save: (x) => { v = x; } }; };
const be = createBackend({ db, kvStore: mem(), jar: mem() });
let ipN = 1;
async function api(method, path, body) {
  const res = await be.handle(new Request(`https://demo.local${path}`, {
    method,
    headers: { "content-type": "application/json", "x-requested-with": "fetch", "cf-connecting-ip": `10.0.${Math.floor(ipN / 250)}.${ipN++ % 250}` },
    body: body ? JSON.stringify(body) : undefined,
  }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

// Deterministic randomness so rebuilding gives the same demo.
let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];

const geo = JSON.parse(readFileSync(join(SRC, "public/data/bd-geo.json"), "utf8"));
const divisions = new Map(geo.divisions.map(([id, en]) => [id, en]));
const districtsBy = (name) => geo.districts.find((d) => d[2] === name);
const placeIn = (district) => {
  const d = districtsBy(district);
  const u = geo.upazilas.filter((x) => x[1] === d[0]);
  const up = pick(u);
  return { division_id: d[1], district_id: d[0], upazila_id: up[0], division: divisions.get(d[1]), district: d[2], upazila: up[2] };
};
const PEOPLE = [
  ["Nusrat Jahan", "01711223344"], ["Farzana Akter", "01819456721"], ["Sadia Islam", "01912345678"], ["Tanjila Rahman", "01556789012"],
  ["Mim Chowdhury", "01678901234"], ["Sharmin Sultana", "01722334455"], ["Rumana Haque", "01833445566"], ["Jannatul Ferdous", "01944556677"],
  ["Ayesha Siddika", "01355667788"], ["Tasnim Ahmed", "01766778899"], ["Lamia Hossain", "01877889900"], ["Moushumi Das", "01988990011"],
  ["Sumaiya Karim", "01799001122"], ["Rehana Parvin", "01611223355"], ["Afsana Mimi", "01512233466"], ["Nabila Tabassum", "01313344577"],
];
// Districts weighted toward the shop's own area; street text stays neutral so it always fits the upazila.
const DISTRICTS = ["Tangail", "Tangail", "Tangail", "Dhaka", "Dhaka", "Gazipur", "Chattogram", "Sylhet", "Rajshahi", "Mymensingh"];
const STREETS = ["College Road", "Bazar Road", "Station Road", "Main Road", "School Para", "Masjid Lane", "Hospital Road"];

// Extra stock so the order history below doesn't sell the shelves empty (a few stay low for the alerts).
db.exec("UPDATE product_variants SET stock = stock + 12 WHERE stock > 2");
const { items: products } = await api("GET", "/api/products?limit=48&sort=popular");
const variantsOf = async (slug) => (await api("GET", `/api/products/${slug}`)).variants.filter((v) => v.stock > 3);
const catalogue = [];
for (const p of products) catalogue.push({ p, variants: await variantsOf(p.slug) });
const realFirst = catalogue.filter((c) => c.variants.length).sort((a, b) => (b.p.images?.[0]?.endsWith(".webp") ? 1 : 0) - (a.p.images?.[0]?.endsWith(".webp") ? 1 : 0));

log("placing demo orders through the storefront API");
const placed = [];
for (let i = 0; i < 46; i++) {
  const [name, phone] = PEOPLE[i % PEOPLE.length];
  const district = pick(DISTRICTS);
  const area = pick(STREETS);
  const lines = [];
  const n = rnd() < 0.7 ? 1 : 2;
  for (let k = 0; k < n; k++) {
    const c = rnd() < 0.7 ? realFirst[Math.floor(rnd() * Math.min(6, realFirst.length))] : pick(realFirst);
    const v = pick(c.variants);
    if (!lines.some((l) => l.variantId === v.id)) lines.push({ variantId: v.id, quantity: rnd() < 0.85 ? 1 : 2 });
  }
  const pay = rnd();
  const paymentMethod = pay < 0.68 ? "COD" : pay < 0.88 ? "bKash" : pay < 0.96 ? "Nagad" : "Rocket";
  const body = {
    customer: { name, phone, email: "" },
    address: { ...placeIn(district), area: `${area}, House ${1 + Math.floor(rnd() * 90)}` },
    items: lines,
    paymentMethod,
    paymentRef: paymentMethod === "COD" ? undefined : `9${Math.floor(rnd() * 1e9).toString(36).toUpperCase().padStart(9, "X")}`,
    couponCode: rnd() < 0.15 ? "LK10" : undefined,
    note: rnd() < 0.2 ? pick(["Please call before delivery", "Gift wrap please", "Deliver after 5pm"]) : undefined,
    lang: rnd() < 0.7 ? "bn" : "en",
  };
  try {
    const r = await api("POST", "/api/orders", body);
    placed.push(r);
  } catch (e) {
    if (!/coupon/.test(String(e))) throw e;
    placed.push(await api("POST", "/api/orders", { ...body, couponCode: undefined }));
  }
}

log("working the orders through the admin pipeline");
await api("POST", "/api/admin/auth/login", { email: "demo", password: "demo12345" });
const ids = db.exec("SELECT id, order_no FROM orders ORDER BY id")[0].values;
const FLOW = ["confirmed", "packed", "shipped", "delivered"];
const plan = (i) => {
  const age = ids.length - i; // oldest first
  if (age <= 6) return rnd() < 0.5 ? [] : ["confirmed"]; // newest: still pending/confirmed
  if (age <= 10) return FLOW.slice(0, 2 + Math.floor(rnd() * 2));
  const r = rnd();
  if (r < 0.1) return ["cancelled"];
  if (r < 0.15) return [...FLOW, "returned"];
  return FLOW;
};
for (let i = 0; i < ids.length; i++) {
  const [id] = ids[i];
  for (const status of plan(i)) {
    const extra = status === "shipped" ? { courier: pick(["Steadfast", "Steadfast", "Pathao", "RedX"]), trackingId: `SF${String(1_000_000 + id * 7919).slice(-7)}` } : {};
    await api("POST", `/api/admin/orders/${id}/status`, { status, notify: false, ...extra });
  }
  db.run("UPDATE orders SET payment_status = 'paid' WHERE id = ? AND status = 'delivered'", [id]);
}
db.exec("UPDATE orders SET payment_status = 'paid' WHERE payment_method != 'COD' AND status NOT IN ('cancelled')");

// Spread the history over the last ~10 weeks, newest orders today.
const now = Date.now();
for (let i = 0; i < ids.length; i++) {
  const [id] = ids[i];
  const daysAgo = Math.max(0, Math.round((ids.length - 1 - i) * 1.55 + (rnd() - 0.5) * 2));
  const t0 = now - daysAgo * 86400000 - Math.floor(rnd() * 10) * 3600000;
  const iso = (ms) => new Date(ms).toISOString();
  db.run("UPDATE orders SET created_at = ?, updated_at = ? WHERE id = ?", [iso(t0), iso(t0 + 3600000), id]);
  const hist = db.exec(`SELECT id FROM order_status_history WHERE order_id = ${id} ORDER BY id`)[0]?.values.map((r) => r[0]) ?? [];
  hist.forEach((h, k) => db.run("UPDATE order_status_history SET created_at = ? WHERE id = ?", [iso(t0 + k * 26 * 3600000), h]));
  db.run("UPDATE inventory_log SET created_at = ? WHERE note = (SELECT order_no FROM orders WHERE id = ?)", [iso(t0), id]);
  db.run("UPDATE notifications SET created_at = ? WHERE order_id = ?", [iso(t0), id]);
}
db.exec(`UPDATE customers SET created_at = (SELECT MIN(created_at) FROM orders o WHERE o.customer_phone = customers.phone) WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_phone = customers.phone)`);

log("adding a shopper account, reviews waiting for approval and newsletter sign-ups");
await api("POST", "/api/auth/register", { name: "Demo Shopper", phone: "01700000001", password: "demo12345" });
for (const [pname, rating, text] of [
  ["Sharmin", 5, "The organza is so soft and the colour is exactly like the photo. Got it in 2 days in Dhaka!"],
  ["Rumana", 4, "খুব সুন্দর কাজ, প্যাকেজিংও ভালো ছিল। ওড়নাটা একটু বড় হলে ভালো হতো।"],
]) {
  await api("POST", "/api/reviews", { productId: realFirst[Math.floor(rnd() * 3)].p.id, name: pname, rating, body: text });
}
for (const phone of ["01711998877", "01855443322", "01966112233"]) await api("POST", "/api/subscribe", { phone }).catch(() => {});

db.exec("DELETE FROM audit_log WHERE action IN ('login','login_failed')");
const SEED_AT = new Date(now).toISOString();
const bytes = db.export();
const SEED_ID = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
const summary = db.exec("SELECT status, COUNT(*) FROM orders GROUP BY status")[0].values.map(([s, n]) => `${s} ${n}`).join(", ");
log(`orders: ${summary}`);

// ---------- 4. Browser bundle ----------
log("bundling the browser runtime");
await esbuild.build({
  entryPoints: [join(HERE, "browser-runtime.mjs")],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  minify: true,
  legalComments: "none",
  outfile: join(TMP, "runtime.js"),
  alias,
  nodePaths,
  define: { __SEED_ID__: JSON.stringify(SEED_ID), __SEED_AT__: JSON.stringify(SEED_AT) },
  // sql.js only touches these Node modules on Node; the browser build never loads them.
  external: ["fs", "path", "crypto"],
  logLevel: "warning",
});

// ---------- 5. Assemble the two folders ----------
const must = (text, find, replace, what) => {
  if (!text.includes(find)) throw new Error(`demo patch "${what}" no longer matches the Lk's Attire source — update build.mjs`);
  return text.split(find).join(replace);
};
const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
/** Root-absolute asset paths → relative, so the files work from any sub-folder. */
const relAssets = (s) => s.replace(/(["'(])\/assets\//g, "$1assets/");

function writeDemoFiles(out, html) {
  // The hub's URL rewriter reads the "/> of a self-closing tag as a link to "/"; a space keeps it off.
  html = html.replace(/(["'])\/>/g, "$1 />");
  const dir = join(out, "demo");
  mkdirSync(dir, { recursive: true });
  cpSync(join(TMP, "runtime.js"), join(dir, "runtime.js"));
  cpSync(join(SQL_DIST, "sql-wasm-browser.wasm"), join(dir, "sql-wasm-browser.wasm"));
  writeFileSync(join(dir, "store.db"), bytes);
  writeFileSync(join(out, "index.html"), html);
}

function demoHead(html, { title }) {
  html = html.replace(/<link rel="canonical"[^>]*>\s*/g, "").replace(/<link rel="alternate" hreflang[^>]*>\s*/g, "").replace(/<meta property="og:url"[^>]*>\s*/g, "");
  html = must(html, "<head>", `<head>\n  <meta name="robots" content="noindex, follow">`, "noindex");
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  // The runtime must run before the app so the app's first fetch is already answered in the browser.
  return must(html, "<meta charset=\"utf-8\">", `<meta charset="utf-8">\n  <script src="./demo/runtime.js"></script>`, "runtime");
}

// --- Shop ---
log("assembling lks-attire-shop/");
const SHOP = join(REPO, "lks-attire-shop");
const shopMeta = existsSync(join(SHOP, "demo.json")) ? readFileSync(join(SHOP, "demo.json")) : null;
rmSync(SHOP, { recursive: true, force: true });
mkdirSync(SHOP, { recursive: true });
for (const n of ["assets", "css", "js", "data", "brand.css", "brand.json", "manifest.webmanifest"]) cpSync(join(DIST, n), join(SHOP, n), { recursive: true });
if (shopMeta) writeFileSync(join(SHOP, "demo.json"), shopMeta);

let shopHtml = readFileSync(join(DIST, "index.html"), "utf8");
shopHtml = demoHead(shopHtml, { title: "Lk's Attire — Style With A Signature (demo store)" });
shopHtml = shopHtml.replace(/(href|src)="\/(brand\.css|css\/|js\/|assets\/|manifest\.webmanifest)/g, '$1="./$2');
writeDemoFiles(SHOP, shopHtml);

for (const f of walk(SHOP).filter((f) => /\.(js|json|webmanifest)$/.test(f) && !f.includes("/demo/"))) {
  let s = readFileSync(f, "utf8");
  const before = s;
  s = relAssets(s);
  if (f.endsWith("js/app.js")) {
    s = must(s, `replace ? history.replaceState({}, "", u) : history.pushState({}, "", u);`, `replace ? history.replaceState({}, "", __lksDemo.toUrl(u)) : history.pushState({}, "", __lksDemo.toUrl(u));`, "router push");
    s = must(s, `const path = location.pathname.replace(/\\/+$/, "") || "/";\n  const q = new URL(location.href).searchParams;`, `const vu = __lksDemo.virtual();\n  const path = vu.pathname.replace(/\\/+$/, "") || "/";\n  const q = vu.searchParams;`, "router read");
    s = must(s, `if (!location.hash) window.scrollTo({ top: 0 });`, `window.scrollTo({ top: 0 });`, "scroll");
  }
  if (f.endsWith("views/shop.js")) {
    s = must(s, `location.pathname === "/search"`, `__lksDemo.virtual().pathname === "/search"`, "search page");
    s = must(s, 'history.replaceState({}, "", `${path}${q.toString() ? "?" + q : ""}`);', 'history.replaceState({}, "", __lksDemo.toUrl(`${path}${q.toString() ? "?" + q : ""}`));', "shop filters in the URL");
  }
  if (f.endsWith("views/product.js")) s = must(s, `const url = location.origin + location.pathname;`, `const url = location.href;`, "share link");
  if (s !== before) writeFileSync(f, s);
}

// --- Admin ---
log("assembling lks-attire-admin/");
const ADMIN = join(REPO, "lks-attire-admin");
const adminMeta = existsSync(join(ADMIN, "demo.json")) ? readFileSync(join(ADMIN, "demo.json")) : null;
rmSync(ADMIN, { recursive: true, force: true });
mkdirSync(join(ADMIN, "admin"), { recursive: true });
for (const n of ["css", "js", "brand.css", "icon.svg"]) cpSync(join(DIST, "admin", n), join(ADMIN, "admin", n), { recursive: true });
for (const n of ["assets", "data", "brand.json"]) cpSync(join(DIST, n), join(ADMIN, n), { recursive: true });
if (adminMeta) writeFileSync(join(ADMIN, "demo.json"), adminMeta);

let adminHtml = readFileSync(join(DIST, "admin/index.html"), "utf8");
adminHtml = must(adminHtml, "<html ", `<html data-demo="admin" `, "admin marker");
adminHtml = demoHead(adminHtml, { title: "Lk's Attire — Admin dashboard (demo)" });
adminHtml = adminHtml.replace(/(href|src)="\/admin\//g, '$1="./admin/').replace(/(href|src)="\/assets\//g, '$1="./assets/');
writeDemoFiles(ADMIN, adminHtml);

for (const f of walk(ADMIN).filter((f) => /\.(js|json)$/.test(f) && !f.includes("/demo/"))) {
  let s = readFileSync(f, "utf8");
  const before = s;
  s = relAssets(s);
  // "View in shop" opens the shop demo next door.
  s = s.replace(/href="\/product\//g, 'href="../lks-attire-shop/#/product/');
  if (s !== before) writeFileSync(f, s);
}

const size = (d) => walk(d).reduce((n, f) => n + statSync(f).size, 0);
log(`done — shop ${(size(SHOP) / 1e6).toFixed(1)} MB, admin ${(size(ADMIN) / 1e6).toFixed(1)} MB, seed ${SEED_ID}`);
