#!/usr/bin/env node
/**
 * Builds a shop demo and an admin demo for the hub from a shop's real source, for every shop
 * built on the Zamil Shop BD platform (scripts/shop-demos/shops.mjs):
 *
 *   <shopDir>/    the customer storefront
 *   <adminDir>/   the admin dashboard, opened signed in as demo / demo12345
 *
 * Both run the shop's real Worker code in the browser (engine.mjs + browser-runtime.mjs), so
 * every feature works without a server, and they share one in-browser database.
 *
 * Usage (from the repository root, with the shops checked out next to it):
 *   npm i --no-save esbuild sql.js
 *   node scripts/shop-demos/build.mjs                    # every shop
 *   node scripts/shop-demos/build.mjs prakriti-herbal     # one shop
 *   node scripts/shop-demos/build.mjs prakriti-herbal --src ../harbal-pakriti
 *
 * The output folders are committed; re-run this after changes to a shop.
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pbkdf2Sync, randomBytes, createHash } from "node:crypto";
import { SHOPS } from "./shops.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const require = createRequire(join(process.cwd(), "package.json"));
const esbuild = require("esbuild");
const initSqlJs = require("sql.js");
const SQL_DIST = dirname(require.resolve("sql.js"));

const ADMIN_USER = "demo";
const ADMIN_PASS = "demo12345";
const SHOPPER = { phone: "01700000001", password: "demo12345" };
const STAFF_PHONE = "01899999999";

const args = process.argv.slice(2);
const srcFlag = args.indexOf("--src");
const srcOverride = srcFlag >= 0 ? resolve(args[srcFlag + 1]) : null;
const ids = args.filter((a, i) => !a.startsWith("--") && (srcFlag < 0 || i !== srcFlag + 1));
const todo = ids.length ? ids : Object.keys(SHOPS);
for (const id of todo) if (!SHOPS[id]) throw new Error(`Unknown shop "${id}" — one of: ${Object.keys(SHOPS).join(", ")}`);
if (srcOverride && todo.length !== 1) throw new Error("--src needs exactly one shop id");

const must = (text, find, replace, what) => {
  if (!text.includes(find)) throw new Error(`demo patch "${what}" no longer matches the shop's source — update scripts/shop-demos/build.mjs`);
  return text.split(find).join(replace);
};
const walk = (dir, out = []) => {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
};
const size = (d) => walk(d).reduce((n, f) => n + statSync(f).size, 0);

for (const id of todo) await buildShop(id, SHOPS[id], srcOverride ?? resolve(REPO, "..", SHOPS[id].repo));

async function buildShop(id, cfg, SRC) {
  const log = (m) => console.log(`• [${id}] ${m}`);
  if (!existsSync(join(SRC, "worker/src/index.ts"))) throw new Error(`${cfg.name} source not found at ${SRC} (clone ${cfg.github} there or pass --src)`);

  // ---------- 1. Build the shop (dist/ and dist-seed/seed.sql) ----------
  log(`building ${cfg.name} from ${SRC}`);
  execFileSync("node", ["scripts/build.mjs"], { cwd: SRC, stdio: ["ignore", "inherit", "inherit"] });
  const DIST = join(SRC, "dist");

  // ---------- 2. Bundle the engine for Node, to generate the demo data with the real API ----------
  const TMP = join(REPO, "artifacts/shop-demos", id);
  rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
  const alias = { "shop-worker": join(SRC, "worker/src/index.ts") };
  const nodePaths = [join(SRC, "node_modules")];
  // Owners and managers must set up an authenticator app before they can sign in. A public demo
  // can't share a phone, so the demo build (and only the demo build) leaves that step out.
  const demoPatches = {
    name: "demo-patches",
    setup(b) {
      b.onLoad({ filter: /worker[\\/]src[\\/]lib[\\/]rbac\.ts$/ }, (a) => {
        const src = readFileSync(a.path, "utf8");
        return { contents: must(src, 'export const ROLES_REQUIRING_2FA: Role[] = ["super_admin", "manager"];', "export const ROLES_REQUIRING_2FA: Role[] = [];", "two-step sign-in"), loader: "ts" };
      });
    },
  };
  const common = { bundle: true, format: "esm", alias, nodePaths, plugins: [demoPatches], logLevel: "warning" };
  await esbuild.build({ ...common, entryPoints: [join(HERE, "engine.mjs")], platform: "node", outfile: join(TMP, "engine.node.mjs") });
  const { createBackend } = await import(pathToFileURL(join(TMP, "engine.node.mjs")).href + `?${id}`);

  // ---------- 3. Database: schema, the shop's seed, then a realistic history made through the API ----------
  log("creating the demo database");
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  for (const f of readdirSync(join(SRC, "worker/migrations")).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(SRC, "worker/migrations", f), "utf8"));
  db.exec(readFileSync(join(SRC, "dist-seed/seed.sql"), "utf8"));

  // Photos are stored with root paths (/img/…); the demos serve them from their own folder.
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'd1_%'")[0].values.flat();
  const rewriteImg = () => {
    for (const t of tables) {
      for (const [, c, type] of db.exec(`PRAGMA table_info("${t}")`)[0].values) {
        if (!/TEXT/i.test(type)) continue;
        db.exec(`UPDATE "${t}" SET "${c}" = replace("${c}", '"/img/', '"img/') WHERE "${c}" LIKE '%"/img/%'`);
        db.exec(`UPDATE "${t}" SET "${c}" = 'img/' || substr("${c}", 6) WHERE "${c}" LIKE '/img/%'`);
      }
    }
  };
  rewriteImg();

  // The published demo sign-ins: owner "demo" / "demo12345"; an order processor who signs in with
  // phone + SMS code (the code shows on screen in the demo).
  const hash = (pw) => {
    const salt = randomBytes(16);
    return `pbkdf2$100000$${salt.toString("base64")}$${pbkdf2Sync(pw, salt, 100000, 32, "sha256").toString("base64")}`;
  };
  db.run("INSERT INTO admins (name, email, password_hash, role) VALUES ('Demo Owner', ?, ?, 'super_admin')", [ADMIN_USER, hash(ADMIN_PASS)]);
  db.run("INSERT INTO admins (name, email, phone, password_hash, role) VALUES ('Rina (orders)', 'rina', ?, ?, 'order_processor')", [STAFF_PHONE, hash(randomBytes(12).toString("hex"))]);

  const mem = () => { let v = null; return { load: () => v, save: (x) => { v = x; } }; };
  // "demo" (not "development") at build time: no SMS step, so orders can be placed directly.
  const be = createBackend({ db, kvStore: mem(), jar: mem(), vars: { ENVIRONMENT: "demo" } });
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
  const one = (sql, p = []) => db.exec(sql, p)[0]?.values[0]?.[0];

  await api("POST", "/api/admin/auth/login", { email: ADMIN_USER, password: ADMIN_PASS });

  // Demo notice in the announcement bar, and every wallet switched on (both editable in Admin → Settings).
  const { settings } = await api("GET", "/api/admin/settings");
  const store = settings.store;
  store.announcement_en = `Demo store — try ordering! Nothing is charged or delivered. · ${store.announcement_en ?? ""}`.replace(/ · $/, "");
  store.announcement_bn = `ডেমো স্টোর — অর্ডার করে দেখুন! কোনো টাকা কাটা বা ডেলিভারি হবে না। · ${store.announcement_bn ?? ""}`.replace(/ · $/, "");
  await api("PUT", "/api/admin/settings/store", store);
  const payments = settings.payments;
  for (const [w, n] of [["bkash", "01700000000"], ["nagad", "01700000000"], ["rocket", "017000000001"]]) payments[w] = { ...payments[w], enabled: true, mode: "manual", manualNumber: n };
  await api("PUT", "/api/admin/settings/payments", payments);
  if (settings.notifications) await api("PUT", "/api/admin/settings/notifications", { ...settings.notifications, ownerPhone: "" });
  // The first-run checklist is for a new owner; a visitor lands on the working dashboard instead.
  await api("PUT", "/api/admin/settings/onboarding", { dismissed: true }).catch(() => {});

  // Deterministic randomness so rebuilding gives the same demo.
  let seed = 42;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pick = (a) => a[Math.floor(rnd() * a.length)];

  const geo = JSON.parse(readFileSync(join(SRC, "public/data/bd-geo.json"), "utf8"));
  const divisions = new Map(geo.divisions.map(([did, en]) => [did, en]));
  const placeIn = (district) => {
    const d = geo.districts.find((x) => x[2] === district);
    if (!d) throw new Error(`district ${district} not in bd-geo.json`);
    const up = pick(geo.upazilas.filter((x) => x[1] === d[0]));
    return { division_id: d[1], district_id: d[0], upazila_id: up[0], division: divisions.get(d[1]), district: d[2], upazila: up[2] };
  };
  const STREETS = ["College Road", "Bazar Road", "Station Road", "Main Road", "School Para", "Masjid Lane", "Hospital Road"];

  // Extra stock so the order history doesn't sell the shelves empty (a few stay low for the alerts).
  // Shops that track batches get the extra units on each size's latest-expiring batch, so stock and batches agree.
  if ((db.exec("PRAGMA table_info(inventory_batches)")[0]?.values ?? []).some((r) => r[1] === "qty_remaining")) {
    db.exec(`UPDATE inventory_batches SET qty_received = qty_received + 12, qty_remaining = qty_remaining + 12
      WHERE id IN (SELECT (SELECT b.id FROM inventory_batches b WHERE b.variant_id = v.id ORDER BY b.expiry_date DESC LIMIT 1) FROM product_variants v WHERE v.stock > 2)`);
  }
  db.exec("UPDATE product_variants SET stock = stock + 12 WHERE stock > 2");
  const { items: products } = await api("GET", "/api/products?limit=48&sort=popular");
  const catalogue = [];
  for (const p of products) {
    const d = await api("GET", `/api/products/${p.slug}`);
    const variants = (d.variants ?? d.product?.variants ?? []).filter((v) => v.stock > 3);
    if (variants.length) catalogue.push({ p, variants });
  }
  if (!catalogue.length) throw new Error("no products with stock");

  log("placing demo orders through the storefront API");
  const ORDERS = 42;
  for (let i = 0; i < ORDERS; i++) {
    const [name, phone] = cfg.people[i % cfg.people.length];
    const lines = [];
    const n = rnd() < 0.7 ? 1 : 2;
    for (let k = 0; k < n; k++) {
      const c = rnd() < 0.7 ? catalogue[Math.floor(rnd() * Math.min(8, catalogue.length))] : pick(catalogue);
      const v = pick(c.variants);
      if (!lines.some((l) => l.variantId === v.id)) lines.push({ variantId: v.id, quantity: rnd() < 0.85 ? 1 : 2 });
    }
    const pay = rnd();
    const paymentMethod = pay < 0.68 ? "COD" : pay < 0.88 ? "bKash" : pay < 0.96 ? "Nagad" : "Rocket";
    const body = {
      customer: { name, phone, email: "" },
      address: { ...placeIn(pick(cfg.districts)), area: `${pick(STREETS)}, House ${1 + Math.floor(rnd() * 90)}` },
      items: lines,
      paymentMethod,
      paymentRef: paymentMethod === "COD" ? undefined : `9${Math.floor(rnd() * 1e9).toString(36).toUpperCase().padStart(9, "X")}`,
      couponCode: rnd() < 0.15 ? cfg.coupon : undefined,
      giftWrap: rnd() < 0.12,
      note: rnd() < 0.2 ? pick(["Please call before delivery", "Deliver after 5pm", "Office address — weekdays only"]) : undefined,
      lang: rnd() < 0.7 ? "bn" : "en",
      sessionId: `demo-${id}-${String(i).padStart(4, "0")}-session`,
    };
    try {
      await api("POST", "/api/orders", body);
    } catch (e) {
      if (!/coupon|gift/i.test(String(e))) throw e;
      await api("POST", "/api/orders", { ...body, couponCode: undefined, giftWrap: false });
    }
  }

  log("working the orders through the admin pipeline");
  const orderRows = db.exec("SELECT id, payment_method FROM orders ORDER BY id")[0].values;
  const FLOW = ["confirmed", "packed", "shipped", "delivered"];
  const status = async (oid, s) => {
    const cur = one("SELECT status FROM orders WHERE id = ?", [oid]);
    if (cur === s) return;
    const extra = s === "shipped" ? { courier: pick(["Steadfast", "Steadfast", "Pathao", "RedX"]), trackingId: `SF${String(1_000_000 + oid * 7919).slice(-7)}`, createConsignment: false } : {};
    await api("POST", `/api/admin/orders/${oid}/status`, { status: s, notify: false, ...extra });
  };
  for (let i = 0; i < orderRows.length; i++) {
    const [oid, pm] = orderRows[i];
    const age = orderRows.length - i; // oldest first
    let plan;
    if (age <= 5) plan = rnd() < 0.6 ? [] : ["call"]; // newest: still waiting for the confirmation call
    else if (age <= 10) plan = ["call", ...FLOW.slice(0, 1 + Math.floor(rnd() * 3))];
    else {
      const r = rnd();
      plan = r < 0.08 ? ["cancelled"] : r < 0.13 ? ["call", ...FLOW.slice(0, 3), "refused"] : r < 0.18 ? ["call", ...FLOW, "returned"] : ["call", ...FLOW];
    }
    for (const step of plan) {
      if (step === "call") {
        // COD: the confirmation call. Mobile wallets: staff checked the TrxID (Mark as paid).
        if (pm === "COD") await api("POST", `/api/admin/orders/${oid}/attempts`, { outcome: "confirmed", method: pick(["call", "call", "whatsapp"]), note: "Customer confirmed on the phone" });
        else db.run("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [oid]);
        continue;
      }
      if (step === "delivered" && pm === "COD") db.run("UPDATE orders SET payment_status = 'paid' WHERE id = ?", [oid]);
      await status(oid, step);
    }
  }
  db.exec("UPDATE orders SET payment_status = 'paid' WHERE payment_method != 'COD' AND status NOT IN ('cancelled')");

  log("adding reviews, a shopper account and newsletter sign-ups");
  const delivered = db.exec("SELECT o.order_no, o.public_token, (SELECT product_id FROM order_items WHERE order_id = o.id LIMIT 1) FROM orders o WHERE o.status = 'delivered' ORDER BY o.id LIMIT 6")[0]?.values ?? [];
  const VERIFIED = [
    [5, "Exactly as shown in the photos and well packed. Will order again."],
    [5, "অর্ডার করার পর কল করে কনফার্ম করেছে, দুই দিনে পেয়ে গেছি। খুব ভালো লেগেছে।"],
    [4, "Good quality for the price. Delivery took one extra day."],
    [5, "Second time ordering — same quality as last time. Recommended."],
    [4, "প্যাকেজিং খুব সুন্দর ছিল। দাম একটু বেশি মনে হয়েছে।"],
    [5, "Cash on Delivery made it easy. The rider was polite and on time."],
  ];
  for (let i = 0; i < delivered.length; i++) {
    const [orderNo, token, productId] = delivered[i];
    const [rating, text] = VERIFIED[i];
    const nameOf = one("SELECT customer_name FROM orders WHERE order_no = ?", [orderNo]).split(" ")[0];
    await api("POST", "/api/reviews", { productId, name: nameOf, rating, body: text, orderNo, token }).catch((e) => log(`skipped a review: ${e.message.slice(0, 120)}`));
  }
  for (const [rid] of db.exec("SELECT id FROM reviews WHERE status = 'pending'")[0]?.values ?? []) await api("PUT", `/api/admin/reviews/${rid}`, { status: "approved" });
  for (const [pname, rating, text] of cfg.reviews) await api("POST", "/api/reviews", { productId: catalogue[Math.floor(rnd() * 3)].p.id, name: pname, rating, body: text });
  await api("POST", "/api/auth/register", { name: "Demo Shopper", phone: SHOPPER.phone, password: SHOPPER.password });
  for (const phone of ["01711998877", "01855443322", "01966112233"]) await api("POST", "/api/newsletter", { phone }).catch(() => {});

  if (cfg.bookings) {
    log("booking studio treatments");
    const { treatments } = await api("GET", "/api/treatments");
    const bdToday = new Date(Date.now() + 6 * 3600000);
    let made = 0;
    for (let d = 1; d <= 14 && made < cfg.bookings; d++) {
      const date = new Date(bdToday.getTime() + d * 86400000).toISOString().slice(0, 10);
      const t = treatments[made % treatments.length];
      const { slots } = await api("GET", `/api/treatments/${t.slug}/slots?date=${date}`);
      const free = (slots ?? []).map((s) => (typeof s === "string" ? s : s.time)).filter(Boolean);
      if (!free.length) continue;
      const [name, phone] = cfg.people[(made * 5 + 3) % cfg.people.length];
      const { booking } = await api("POST", "/api/bookings", { treatmentId: t.id, date, time: free[Math.floor(free.length / 3)], name, phone, lang: "bn" });
      if (made % 3 !== 2) await api("PUT", `/api/admin/bookings/${booking?.id ?? one("SELECT max(id) FROM bookings")}`, { status: "confirmed", notify: false }).catch((e) => log(`booking left as a request: ${e.message.slice(0, 120)}`));
      made++;
    }
  }

  // Spread the order history over the last ~9 weeks, newest orders today.
  const now = Date.now();
  const iso = (ms) => new Date(ms).toISOString();
  const hasCol = (t, c) => (db.exec(`PRAGMA table_info("${t}")`)[0]?.values ?? []).some((r) => r[1] === c);
  for (let i = 0; i < orderRows.length; i++) {
    const [oid] = orderRows[i];
    const daysAgo = Math.max(0, Math.round((orderRows.length - 1 - i) * 1.5 + (rnd() - 0.5) * 2));
    const t0 = now - daysAgo * 86400000 - Math.floor(rnd() * 10) * 3600000;
    db.run("UPDATE orders SET created_at = ?, updated_at = ? WHERE id = ?", [iso(t0), iso(t0 + 3600000), oid]);
    const hist = db.exec(`SELECT id FROM order_status_history WHERE order_id = ${oid} ORDER BY id`)[0]?.values.map((r) => r[0]) ?? [];
    hist.forEach((h, k) => db.run("UPDATE order_status_history SET created_at = ? WHERE id = ?", [iso(t0 + k * 26 * 3600000), h]));
    if (hasCol("order_confirmation_attempts", "created_at")) db.run("UPDATE order_confirmation_attempts SET created_at = ? WHERE order_id = ?", [iso(t0 + 2 * 3600000), oid]);
    for (const t of ["inventory_log", "notifications"]) if (hasCol(t, "order_id") && hasCol(t, "created_at")) db.run(`UPDATE "${t}" SET created_at = ? WHERE order_id = ?`, [iso(t0), oid]);
  }
  db.exec("UPDATE customers SET created_at = (SELECT MIN(created_at) FROM orders o WHERE o.customer_phone = customers.phone) WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_phone = customers.phone)");
  if (hasCol("reviews", "created_at")) db.exec("UPDATE reviews SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-' || (abs(random()) % 20) || ' days') WHERE status = 'approved'");

  db.exec("DELETE FROM audit_log WHERE action IN ('login', 'login_failed', 'login_pending_2fa')");
  rewriteImg();
  const SEED_AT = new Date(now).toISOString();
  const bytes = db.export();
  const SEED_ID = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
  const summary = db.exec("SELECT status, COUNT(*) FROM orders GROUP BY status")[0].values.map(([s, n]) => `${s} ${n}`).join(", ");
  log(`orders: ${summary}`);

  // ---------- 4. Browser bundle ----------
  log("bundling the browser runtime");
  const demoCfg = { id: id.replace(/[^a-z0-9]/gi, ""), adminLangKey: `${cfg.prefix}_admin_lang`, adminUser: ADMIN_USER, adminPass: ADMIN_PASS, shopDir: cfg.shopDir, adminDir: cfg.adminDir };
  await esbuild.build({
    ...common,
    entryPoints: [join(HERE, "browser-runtime.mjs")],
    format: "iife",
    platform: "browser",
    target: ["es2022"],
    minify: true,
    legalComments: "none",
    outfile: join(TMP, "runtime.js"),
    define: { __SEED_ID__: JSON.stringify(SEED_ID), __SEED_AT__: JSON.stringify(SEED_AT), __DEMO__: JSON.stringify(demoCfg) },
    // sql.js only touches these Node modules on Node; the browser build never loads them.
    external: ["fs", "path", "crypto"],
  });

  // ---------- 5. Assemble the two folders ----------
  const DEMO_SMS = "Demo — no SMS is sent. Your code: ";
  const smsText = (s) => s.split("DEV code: ").join(DEMO_SMS);
  /** Root-absolute image paths → relative, so the files work from any sub-folder. */
  const relImg = (s) => s.replace(/(["'`(])\/img\//g, "$1img/");

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
  function demoHead(html, title) {
    html = html.replace(/<link rel="canonical"[^>]*>\s*/g, "").replace(/<link rel="alternate" hreflang[^>]*>\s*/g, "").replace(/<meta property="og:url"[^>]*>\s*/g, "");
    html = must(html, "<head>", `<head>\n  <meta name="robots" content="noindex, follow">`, "noindex");
    html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
    // The runtime must run before the app so the app's first fetch is already answered in the browser.
    return must(html, `<meta charset="utf-8">`, `<meta charset="utf-8">\n  <script src="./demo/runtime.js"></script>`, "runtime");
  }
  const keepMeta = (dir) => (existsSync(join(dir, "demo.json")) ? readFileSync(join(dir, "demo.json")) : null);

  // --- Shop ---
  log(`assembling ${cfg.shopDir}/`);
  const SHOP = join(REPO, cfg.shopDir);
  const shopMeta = keepMeta(SHOP);
  rmSync(SHOP, { recursive: true, force: true });
  mkdirSync(SHOP, { recursive: true });
  for (const n of ["css", "js", "img", "data", "favicon.ico", "manifest.webmanifest"]) if (existsSync(join(DIST, n))) cpSync(join(DIST, n), join(SHOP, n), { recursive: true });
  if (shopMeta) writeFileSync(join(SHOP, "demo.json"), shopMeta);

  let shopHtml = readFileSync(join(DIST, "index.html"), "utf8");
  shopHtml = demoHead(shopHtml, `${cfg.name} — demo store`);
  shopHtml = shopHtml.replace(/(href|src)="\/(css\/|js\/|img\/|data\/|manifest\.webmanifest|favicon\.ico)/g, '$1="./$2');
  writeDemoFiles(SHOP, shopHtml);

  for (const f of walk(SHOP).filter((f) => /\.(js|json|webmanifest|css)$/.test(f) && !f.includes(`${join(SHOP, "demo")}`))) {
    let s = readFileSync(f, "utf8");
    const before = s;
    if (f.endsWith(".css")) {
      s = s.replace(/url\((["']?)\/img\//g, "url($1../img/");
    } else {
      s = relImg(s);
      if (f.endsWith(".webmanifest")) s = s.replace(/"start_url":\s*"\/[^"]*"/, '"start_url": "./"').replace(/"scope":\s*"\/"/, '"scope": "./"');
      if (f.endsWith(".js")) {
        // The page the shop renders lives in the hash: read it from there.
        s = s.split("new URL(location.href).searchParams").join("__shopDemo.virtual().searchParams");
        s = s.replace(/\blocation\.pathname\b/g, "__shopDemo.virtual().pathname").replace(/\blocation\.search\b/g, "__shopDemo.virtual().search");
        s = smsText(s);
      }
      if (f.endsWith(join("js", "app.js"))) {
        s = must(s, "if (!location.hash) window.scrollTo({ top: 0 });", "window.scrollTo({ top: 0 });", "scroll to top");
        if (!s.includes("__shopDemo.virtual().pathname.replace")) throw new Error("demo patch \"router\" no longer matches the shop's source");
      }
    }
    if (s !== before) writeFileSync(f, s);
  }

  // --- Admin ---
  log(`assembling ${cfg.adminDir}/`);
  const ADMIN = join(REPO, cfg.adminDir);
  const adminMeta = keepMeta(ADMIN);
  rmSync(ADMIN, { recursive: true, force: true });
  mkdirSync(join(ADMIN, "admin"), { recursive: true });
  for (const n of readdirSync(join(DIST, "admin")).filter((n) => n !== "index.html")) cpSync(join(DIST, "admin", n), join(ADMIN, "admin", n), { recursive: true });
  for (const n of ["img", "data"]) if (existsSync(join(DIST, n))) cpSync(join(DIST, n), join(ADMIN, n), { recursive: true });
  if (adminMeta) writeFileSync(join(ADMIN, "demo.json"), adminMeta);

  let adminHtml = readFileSync(join(DIST, "admin/index.html"), "utf8");
  adminHtml = adminHtml.replace(/<html /, '<html data-demo="admin" ');
  if (!adminHtml.includes('data-demo="admin"')) throw new Error('demo patch "admin marker" no longer matches');
  adminHtml = demoHead(adminHtml, `${cfg.name} — admin dashboard (demo)`);
  adminHtml = adminHtml.replace(/(href|src)="\/admin\//g, '$1="./admin/').replace(/(href|src)="\/img\//g, '$1="./img/');
  writeDemoFiles(ADMIN, adminHtml);

  const toShop = `../${cfg.shopDir}/#/`;
  for (const f of walk(ADMIN).filter((f) => /\.(js|json|css)$/.test(f) && !f.includes(`${join(ADMIN, "demo")}`))) {
    let s = readFileSync(f, "utf8");
    const before = s;
    if (f.endsWith(".css")) s = s.replace(/url\((["']?)\/img\//g, "url($1../../img/");
    else {
      s = relImg(s);
      // "View in shop" and the other shop links open the shop demo next door.
      s = s.replace(/href="\/(product|lp|registry|shop|journal|collections|treatments|routines|kit-builder)\//g, `href="${toShop}$1/`);
      s = smsText(s);
    }
    if (s !== before) writeFileSync(f, s);
  }

  log(`done — shop ${(size(SHOP) / 1e6).toFixed(1)} MB, admin ${(size(ADMIN) / 1e6).toFixed(1)} MB, seed ${SEED_ID}`);
}
