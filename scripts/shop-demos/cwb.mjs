#!/usr/bin/env node
/**
 * Builds the three CWB Gaming hub demos from the marketplace's real source (bayzed123/cwb-gaming-and-buy):
 *
 *   cwb-gaming/          the buyer marketplace
 *   cwb-gaming-admin/    the platform admin, opened signed in as demo / demo12345
 *   cwb-gaming-seller/   the seller dashboard, opened signed in as a demo seller
 *
 * CWB Gaming is a multi-vendor marketplace rather than a shop on the Zamil Shop BD platform, so it has its own
 * builder; it reuses the same in-browser engine (engine.mjs + browser-runtime.mjs). All three demos run the real
 * Worker in the browser and share one database, so an order paid in the marketplace shows up in the seller's queue
 * and in the admin.
 *
 * Patched for the demo build only:
 *  - Two-step sign-in stays on everywhere (it is part of what the demo shows), but any authenticator code
 *    "123456" is accepted — a public demo can't share an authenticator app.
 *  - Payments go through the marketplace's own sandbox gateway (SANDBOX_GATEWAY_SECRET): checkout opens an
 *    in-page "sandbox payment" window whose Approve button sends the signed confirmation webhook — the same
 *    server-side path that releases a code on the live site.
 *  - Seller KYC uploads are kept in the visitor's browser (an R2 stand-in over IndexedDB).
 *
 * Usage (from this repository's root, with the marketplace checked out next to it as ../cwb-gaming-and-buy):
 *   npm i --no-save esbuild sql.js
 *   node scripts/shop-demos/cwb.mjs [--src /path/to/cwb-gaming-and-buy]
 */
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash, createHmac, pbkdf2Sync, randomBytes } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../..");
const require = createRequire(join(process.cwd(), "package.json"));
const esbuild = require("esbuild");
const initSqlJs = require("sql.js");
const SQL_DIST = dirname(require.resolve("sql.js"));

const args = process.argv.slice(2);
const srcFlag = args.indexOf("--src");
const SRC = srcFlag >= 0 ? resolve(args[srcFlag + 1]) : resolve(REPO, "..", "cwb-gaming-and-buy");
const NAME = "CWB Gaming";
const DIRS = { shop: "cwb-gaming", admin: "cwb-gaming-admin", seller: "cwb-gaming-seller" };
const ADMIN = { user: "demo", pass: "demo12345" };
const SELLER = { user: "hub@demo.cwbgaming.local", pass: "demo12345" };
const SHOPPER = { phone: "01700000001", password: "demo12345" };
const TOTP = "123456";
// Not a secret: it signs the demo's own simulated gateway, which only exists inside the visitor's browser.
const SANDBOX_SECRET = "cwb-hub-demo-sandbox";

const log = (m) => console.log(`• [cwb-gaming] ${m}`);
const must = (text, find, replace, what) => {
  if (!text.includes(find)) throw new Error(`demo patch "${what}" no longer matches the marketplace source — update scripts/shop-demos/cwb.mjs`);
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

if (!existsSync(join(SRC, "worker/src/index.ts"))) throw new Error(`CWB Gaming source not found at ${SRC} (clone bayzed123/cwb-gaming-and-buy there or pass --src)`);

// ---------- 1. Build the marketplace (dist/ and dist-seed/) ----------
log(`building from ${SRC}`);
execFileSync("node", ["scripts/build.mjs"], { cwd: SRC, stdio: ["ignore", "inherit", "inherit"] });
const DIST = join(SRC, "dist");

// ---------- 2. Engine for Node, to generate the demo data with the real API ----------
const TMP = join(REPO, "artifacts/shop-demos/cwb-gaming");
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const demoPatches = {
  name: "demo-patches",
  setup(b) {
    b.onLoad({ filter: /worker[\\/]src[\\/]lib[\\/]crypto\.ts$/ }, (a) => {
      const src = readFileSync(a.path, "utf8");
      const head = "export async function verifyTotp(secret: string, code: string, now = Date.now()): Promise<boolean> {";
      return { contents: must(src, head, `${head}\n  if (String(code).replace(/\\s/g, "") === "${TOTP}") return true; // hub demo build only`, "authenticator code"), loader: "ts" };
    });
  },
};
const common = { bundle: true, format: "esm", alias: { "shop-worker": join(SRC, "worker/src/index.ts") }, nodePaths: [join(SRC, "node_modules")], plugins: [demoPatches], logLevel: "warning" };
await esbuild.build({ ...common, entryPoints: [join(HERE, "engine.mjs")], platform: "node", outfile: join(TMP, "engine.node.mjs") });
const { createBackend } = await import(pathToFileURL(join(TMP, "engine.node.mjs")).href);

// ---------- 3. Database ----------
log("creating the demo database");
const SQL = await initSqlJs();
const db = new SQL.Database();
for (const f of readdirSync(join(SRC, "worker/migrations")).filter((f) => f.endsWith(".sql")).sort()) db.exec(readFileSync(join(SRC, "worker/migrations", f), "utf8"));
db.exec(readFileSync(join(SRC, "dist-seed/seed.sql"), "utf8"));
db.exec(readFileSync(join(SRC, "dist-seed/seed-demo.sql"), "utf8"));
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
const one = (sql, p = []) => db.exec(sql, p)[0]?.values[0]?.[0];
const rows = (sql, p = []) => {
  const r = db.exec(sql, p)[0];
  return r ? r.values.map((v) => Object.fromEntries(r.columns.map((c, i) => [c, v[i]]))) : [];
};

const hash = (pw) => {
  const salt = randomBytes(16);
  return `pbkdf2$100000$${salt.toString("base64")}$${pbkdf2Sync(pw, salt, 100000, 32, "sha256").toString("base64")}`;
};
// Published sign-ins. 2FA is switched on for all of them (the demo accepts authenticator code 123456).
db.run("INSERT INTO admins (name, email, password_hash, role, totp_secret, totp_enabled) VALUES ('Demo Owner', ?, ?, 'super_admin', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', 1)", [ADMIN.user, hash(ADMIN.pass)]);
db.run("INSERT INTO admins (name, email, password_hash, role, totp_secret, totp_enabled) VALUES ('Rina (disputes)', 'rina', ?, 'reviewer', 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', 1)", [hash(randomBytes(12).toString("hex"))]);
db.run(`UPDATE sellers SET password_hash = ?, totp_secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP', totp_enabled = 1 WHERE code IN ('S001','S002','S003','S004')`, [hash(SELLER.pass)]);
db.run(`UPDATE sellers SET password_hash = ? WHERE code = 'S005'`, [hash(SELLER.pass)]);

const mem = () => { let v = null; return { load: () => v, save: (x) => { v = x; } }; };
const files = new Map();
const memMedia = { get: async (k) => files.get(k) ?? null, put: async (k, v) => void files.set(k, v), delete: async (k) => void files.delete(k), keys: async () => [...files.keys()] };
const be = createBackend({ db, kvStore: mem(), jar: mem(), vars: { ENVIRONMENT: "development", SANDBOX_GATEWAY_SECRET: SANDBOX_SECRET }, media: memMedia });
let ipN = 1;
/** Build-time only: the history is made in seconds, so the marketplace's per-hour rate limits are cleared between calls. */
const resetLimits = () => {
  const kv = be.env.KV;
  kv._fresh();
  for (const k of Object.keys(kv.data)) if (k.startsWith("rl:")) delete kv.data[k];
  kv._save();
};
async function api(method, path, body, { form = false, allow = [] } = {}) {
  resetLimits();
  const headers = { "x-requested-with": "fetch", "cf-connecting-ip": `10.9.${Math.floor(ipN / 250)}.${ipN++ % 250}` };
  let payload;
  if (form) { headers["content-type"] = "application/x-www-form-urlencoded"; payload = new URLSearchParams(body).toString(); }
  else if (body !== undefined) { headers["content-type"] = "application/json"; payload = typeof body === "string" ? body : JSON.stringify(body); }
  const res = await be.handle(new Request(`https://demo.local${path}`, { method, headers, body: payload }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok && !allow.includes(res.status)) throw new Error(`${method} ${path} → ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}
const signedWebhook = (payload) => {
  const raw = JSON.stringify(payload);
  const res = be.handle(new Request("https://demo.local/api/payments/sandbox/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", "x-sandbox-signature": createHmac("sha256", SANDBOX_SECRET).update(raw).digest("hex"), "cf-connecting-ip": "10.8.0.1" },
    body: raw,
  }));
  return res.then((r) => r.json());
};

await api("POST", "/api/admin/auth/login", { email: ADMIN.user, password: ADMIN.pass, totp: TOTP });
const { settings } = await api("GET", "/api/admin/settings");
const store = settings.store;
store.announcement_en = `Demo marketplace — try buying! Payments go through a sandbox, nothing is charged. · ${store.announcement_en ?? ""}`.replace(/ · $/, "");
store.announcement_bn = `ডেমো মার্কেটপ্লেস — কিনে দেখুন! পেমেন্ট স্যান্ডবক্সে হয়, কোনো টাকা কাটা হয় না। · ${store.announcement_bn ?? ""}`.replace(/ · $/, "");
await api("PUT", "/api/admin/settings/store", store);
const payments = settings.payments;
for (const [w, n] of [["bkash", "01700000000"], ["nagad", "01700000000"], ["rocket", "017000000001"]]) payments[w] = { ...payments[w], enabled: true, mode: "manual", manualNumber: n };
payments.card = { ...payments.card, enabled: true };
await api("PUT", "/api/admin/settings/payments", payments);
await api("PUT", "/api/admin/settings/notifications", { ...settings.notifications, ownerPhone: "" });
await api("PUT", "/api/admin/settings/onboarding", { dismissed: true });

// Deterministic randomness so rebuilding gives the same demo.
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const digits = (n) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");

// More codes for the Official Store, through the seller API, so visitors can buy codes for a long while.
log("stocking extra demo codes");
await api("POST", "/api/seller/auth/login", { email: "official@cwbgaming.com.bd", password: SELLER.pass, totp: TOTP });
for (const l of rows("SELECT l.id, l.sku FROM seller_listings l JOIN sellers s ON s.id = l.seller_id WHERE s.code IN ('S001','S003') AND l.delivery_method IN ('code','both')")) {
  if (!l.sku.endsWith("S001")) continue;
  const tag = l.sku.split("-").slice(1, 3).join("");
  const codes = Array.from({ length: 16 }, () => `DEMO-${tag}-${randomBytes(4).toString("hex").toUpperCase()}`).join("\n");
  await api("POST", `/api/seller/listings/${l.id}/codes`, { codes });
}

// ---------- 4. A realistic history, made through the real API ----------
const PEOPLE = [
  ["Rakib Hasan", "01711223344"], ["Tanvir Ahmed", "01819456721"], ["Sadia Islam", "01912345678"], ["Arif Hossain", "01556789012"],
  ["Mim Chowdhury", "01678901234"], ["Fahim Rahman", "01722334455"], ["Nayeem Islam", "01833445566"], ["Shakil Ahmed", "01944556677"],
  ["Ayesha Siddika", "01355667788"], ["Imran Kabir", "01766778899"], ["Sabbir Hossain", "01877889900"], ["Rifat Karim", "01988990011"],
  ["Sumaiya Karim", "01799001122"], ["Mahmud Hasan", "01611223355"], ["Zahid Hasan", "01512233466"], ["Nabil Ahmed", "01313344577"],
  ["Demo Buyer", SHOPPER.phone],
];
const listing = (sku) => {
  const id = one("SELECT id FROM seller_listings WHERE sku = ?", [sku]);
  if (!id) throw new Error(`listing ${sku} missing from the demo seed`);
  return id;
};
const playerFor = { PUBG: () => `51${digits(8)}`, FF: () => `${1 + Math.floor(rnd() * 8)}${digits(9)}`, MLBB: () => `${1 + Math.floor(rnd() * 8)}${digits(8)}`, CODM: () => `67${digits(13)}` };
// [sku, method] — weighted toward the cheap, popular packs real buyers top up most.
const BASKET = [
  ["GAME-PUBG-325UC-S001", "direct"], ["GAME-PUBG-660UC-S001", "code"], ["GAME-PUBG-60UC-S002", "direct"], ["GAME-PUBG-325UC-S002", "direct"],
  ["GAME-PUBG-660UC-S002", "direct"], ["GAME-FF-115DIA-S002", "direct"], ["GAME-FF-240DIA-S002", "direct"], ["GAME-FF-115DIA-S001", "direct"],
  ["GAME-FF-610DIA-S002", "direct"], ["GAME-MLBB-172DIA-S004", "direct"], ["GAME-MLBB-86DIA-S002", "direct"], ["GAME-MLBB-257DIA-S004", "direct"],
  ["GAME-CODM-420CP-S004", "direct"], ["GAME-GPLAY-5USD-S003", "code"], ["GAME-STEAM-5USD-S003", "code"], ["GAME-GPLAY-10USD-S001", "code"],
  ["GAME-STEAM-10USD-S001", "code"], ["GAME-PUBG-325UC-S003", "code"],
];
const gameOf = (sku) => sku.split("-")[1];

log("placing orders and paying them through the sandbox gateway");
const ORDERS = 38;
const placed = [];
for (let i = 0; i < ORDERS; i++) {
  // A first-time buyer's big order (held for a safety check after payment) near the end of the history.
  const bigFirst = i === ORDERS - 4;
  const [name, phone] = bigFirst ? ["Ashik Rahman", "01400112233"] : i === 3 || i === 20 || i === ORDERS - 2 ? PEOPLE[PEOPLE.length - 1] : PEOPLE[i % (PEOPLE.length - 1)];
  const [sku, deliveryMethod] = bigFirst ? ["GAME-PUBG-1800UC-S001", "code"] : i === ORDERS - 2 ? ["GAME-PUBG-660UC-S001", "code"] : pick(BASKET);
  const g = gameOf(sku);
  const item = { listingId: listing(sku), quantity: 1, deliveryMethod };
  if (deliveryMethod === "direct") {
    item.playerId = playerFor[g]();
    if (g === "MLBB") item.serverId = String(1000 + Math.floor(rnd() * 8999));
  }
  const otp = await api("POST", "/api/otp/send", { phone });
  await api("POST", "/api/otp/verify", { phone, code: otp.devCode });
  const r = rnd();
  const paymentMethod = r < 0.55 ? "bkash" : r < 0.8 ? "nagad" : r < 0.86 ? "rocket" : "card";
  const o = await api("POST", "/api/orders", {
    customer: { name, phone, email: "" }, items: [item], paymentMethod, playerIdConfirmed: true, deviceId: `demo-device-${phone}`,
    lang: rnd() < 0.7 ? "bn" : "en", utm: rnd() < 0.3 ? { source: pick(["facebook", "google", "youtube"]), medium: "cpc", campaign: "topup-oct" } : undefined,
  }, { allow: [403, 422, 429] });
  // The marketplace's own fraud limits (new-buyer daily cap, velocity) apply to the demo history too: skip those.
  if (!o.orderNo) { log(`order ${i} refused by the fraud checks: ${o.en ?? o.code}`); continue; }
  // Most orders are paid; a few are declined, a few never paid (they expire), the newest one is still waiting.
  const fate = i === ORDERS - 1 ? "pending" : i % 13 === 7 ? "declined" : i % 11 === 5 ? "unpaid" : "paid";
  if (fate === "paid") await signedWebhook({ event: "confirmed", orderNo: o.orderNo, amount: o.total, ref: `SBX-${o.orderNo}` });
  if (fate === "declined") await signedWebhook({ event: "failed", orderNo: o.orderNo, amount: o.total, ref: `SBX-F-${o.orderNo}` });
  placed.push({ ...o, fate, phone, i });
}

// The newest manual top-ups stay in the seller's queue for the visitor; the rest are delivered by their sellers.
log("sellers delivering their queued top-ups");
const queued = rows(`SELECT i.id, i.order_id, s.email FROM order_items i JOIN sellers s ON s.id = i.seller_id WHERE i.fulfillment_status = 'queued' ORDER BY i.order_id`);
const keepQueued = new Set(queued.filter((q) => q.email === SELLER.user).slice(-3).map((q) => q.id));
for (const email of [...new Set(queued.map((q) => q.email))]) {
  await api("POST", "/api/seller/auth/login", { email, password: SELLER.pass, totp: TOTP });
  for (const q of queued.filter((x) => x.email === email && !keepQueued.has(x.id))) {
    await api("POST", `/api/seller/orders/${q.id}/fulfil`, { deliveryRef: `${pick(["MIDASBUY", "GARENA", "CODASHOP", "SMILEONE"])}-${digits(8)}` });
  }
}

// Held orders (a first big order): release the older ones, keep the newest for "Needs your attention".
await api("POST", "/api/admin/auth/login", { email: ADMIN.user, password: ADMIN.pass, totp: TOTP });
const held = rows("SELECT id FROM orders WHERE status = 'held' ORDER BY id");
for (const h of held.slice(0, -1)) await api("POST", `/api/admin/orders/${h.id}/release`, { note: "Called the buyer — confirmed" });

log("reviews and disputes");
const REVIEWS = [
  [5, "UC এসেছে ৫ মিনিটের মধ্যে, খুব ভালো সার্ভিস।"], [5, "Code worked instantly. Will buy again."], [4, "ডায়মন্ড পেয়েছি, তবে ১৫ মিনিট লেগেছে।"],
  [5, "Paid with bKash and the top-up landed before I finished my match."], [5, "সেলার খুব দ্রুত ডেলিভারি দিয়েছে, ধন্যবাদ।"], [4, "Good price compared to other sellers."],
  [5, "Steam code redeemed without any problem."], [5, "প্রতিবার সময়মতো পাই, বিশ্বস্ত সেলার।"], [3, "Took a bit longer than the timer said, but it arrived."],
];
const deliveredItems = rows(`SELECT i.id, o.order_no, o.public_token FROM order_items i JOIN orders o ON o.id = i.order_id WHERE i.fulfillment_status = 'delivered' ORDER BY i.id`);
for (let k = 0; k < Math.min(REVIEWS.length, deliveredItems.length); k++) {
  const it = deliveredItems[k * 2 % deliveredItems.length];
  const [rating, text] = REVIEWS[k];
  await api("POST", `/api/orders/${it.order_no}/review`, { token: it.public_token, orderItemId: it.id, rating, body: text }, { allow: [400, 409] });
}
// Two disputes on manual top-ups: one waiting for the seller (shows in the seller demo), one waiting for the platform.
const manual = rows(`SELECT i.id, o.order_no, o.public_token, s.email FROM order_items i JOIN orders o ON o.id = i.order_id JOIN sellers s ON s.id = i.seller_id
  WHERE i.fulfillment_status = 'delivered' AND i.fulfillment_source = 'manual' ORDER BY i.id`);
const forSeller = manual.filter((m) => m.email === SELLER.user);
const d1 = forSeller.at(-2);
const d2 = manual.find((m) => m.email !== SELLER.user) ?? forSeller.at(-4);
if (d1) await api("POST", `/api/orders/${d1.order_no}/dispute`, { token: d1.public_token, orderItemId: d1.id, reason: "not_received", details: "দুই ঘণ্টা হয়ে গেছে, এখনো ডায়মন্ড পাইনি। Player ID ঠিক ছিল।" });
if (d2) {
  await api("POST", `/api/orders/${d2.order_no}/dispute`, { token: d2.public_token, orderItemId: d2.id, reason: "wrong_amount", details: "I ordered 257 diamonds but only got 172 on my account." });
  await api("POST", "/api/seller/auth/login", { email: d2.email, password: SELLER.pass, totp: TOTP });
  const { items } = await api("GET", "/api/seller/disputes");
  const mine = items.find((x) => x.status === "open");
  if (mine) await api("POST", `/api/seller/disputes/${mine.id}/respond`, { response: "Sent the full 257 diamonds — screenshot of the Moonton receipt attached.", evidenceUrl: "https://example.com/receipt-demo.png" });
}

// A shopper account so the account area can be tried: 01700000001 / demo12345 (its orders were placed above).
const otp = await api("POST", "/api/otp/send", { phone: SHOPPER.phone });
await api("POST", "/api/otp/verify", { phone: SHOPPER.phone, code: otp.devCode });
await api("POST", "/api/account/register", { name: "Demo Buyer", phone: SHOPPER.phone, password: SHOPPER.password });
await api("POST", "/api/account/logout", {});

// ---------- 5. Spread the history over the last ~6 weeks ----------
log("spreading the history over six weeks");
const now = Date.now();
const orderIds = rows("SELECT id FROM orders ORDER BY id").map((r) => r.id);
const shiftOrder = (oid, secs) => {
  const mod = `'-${secs} seconds'`;
  const sh = (table, where) => {
    const cols = (db.exec(`PRAGMA table_info("${table}")`)[0]?.values ?? []).map((r) => r[1]).filter((c) => /(_at|_until|_deadline)$/.test(c));
    for (const c of cols) db.exec(`UPDATE "${table}" SET "${c}" = strftime('%Y-%m-%dT%H:%M:%fZ', "${c}", ${mod}) WHERE "${c}" LIKE '____-__-__T%' AND ${where}`);
  };
  sh("orders", `id = ${oid}`);
  sh("order_items", `order_id = ${oid}`);
  sh("order_status_history", `order_id = ${oid}`);
  sh("payment_events", `order_id = ${oid}`);
  sh("disputes", `order_id = ${oid}`);
  sh("notifications", `order_id = ${oid}`);
  sh("redeem_codes", `order_item_id IN (SELECT id FROM order_items WHERE order_id = ${oid})`);
  sh("reviews", `order_item_id IN (SELECT id FROM order_items WHERE order_id = ${oid})`);
};
for (let k = 0; k < orderIds.length; k++) {
  const age = orderIds.length - 1 - k; // 0 = newest
  // Newest five within the last couple of hours (queued top-ups still inside their deadline), then about a day apart.
  const secs = age < 5 ? age * 1500 + 300 : Math.round((age - 4) * 26 * 3600 + rnd() * 8 * 3600);
  shiftOrder(orderIds[k], secs);
}
// The demo seller's queued top-ups are still inside their 30-minute deadline when a visitor arrives.
db.exec(`UPDATE order_items SET sla_due_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','+' || (8 + (id % 3) * 7) || ' minutes')
  WHERE fulfillment_status = 'queued' AND seller_id = (SELECT id FROM sellers WHERE email = '${SELLER.user}')`);
// Open disputes keep a fresh seller deadline.
db.exec(`UPDATE disputes SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-3 hours'), seller_deadline = strftime('%Y-%m-%dT%H:%M:%fZ','now','+21 hours') WHERE status = 'open'`);
db.exec(`UPDATE disputes SET created_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-30 hours'), seller_deadline = strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 hours') WHERE status = 'awaiting_platform'`);
db.exec("UPDATE customers SET created_at = (SELECT MIN(created_at) FROM orders o WHERE o.customer_phone = customers.phone) WHERE EXISTS (SELECT 1 FROM orders o WHERE o.customer_phone = customers.phone)");

// Unpaid orders older than their 30 minutes expired (what the 5-minute job does on the live site).
for (const o of rows(`SELECT id FROM orders WHERE paid_at IS NULL AND status IN ('payment_pending','payment_failed') AND expires_at < strftime('%Y-%m-%dT%H:%M:%fZ','now')`)) {
  db.run(`UPDATE redeem_codes SET status = 'available', order_item_id = NULL, reserved_until = NULL WHERE status = 'reserved' AND order_item_id IN (SELECT id FROM order_items WHERE order_id = ?)`, [o.id]);
  db.run(`UPDATE order_items SET fulfillment_status = 'cancelled' WHERE order_id = ?`, [o.id]);
  db.run(`UPDATE orders SET status = 'expired', payment_status = 'expired' WHERE id = ?`, [o.id]);
  db.run(`INSERT INTO order_status_history (order_id, status, note, actor, created_at) VALUES (?, 'expired', 'Payment didn''t arrive in time', 'system', (SELECT expires_at FROM orders WHERE id = ?))`, [o.id, o.id]);
}
// Earnings past the 72-hour hold become withdrawable (the live site's job), except lines with an open dispute.
db.exec(`UPDATE order_items SET payout_status = 'available' WHERE payout_status = 'pending' AND available_at <= strftime('%Y-%m-%dT%H:%M:%fZ','now')
  AND NOT EXISTS (SELECT 1 FROM disputes d WHERE d.order_item_id = order_items.id AND d.status != 'resolved')`);

// ---------- 6. Payouts: one paid last week, one waiting for approval ----------
log("payouts");
const sellerEmails = rows("SELECT s.email, SUM(i.seller_earning) AS amt FROM order_items i JOIN sellers s ON s.id = i.seller_id WHERE i.payout_status = 'available' AND s.is_official = 0 GROUP BY s.id ORDER BY amt DESC").map((r) => r.email);
const paidBy = sellerEmails.find((e) => e !== SELLER.user) ?? null; // the other one stays "requested" for the admin
// The demo seller keeps its balance, so a visitor can request a payout (authenticator code 123456).
for (const email of sellerEmails.filter((e) => e !== SELLER.user)) {
  await api("POST", "/api/seller/auth/login", { email, password: SELLER.pass, totp: TOTP });
  const r = await api("POST", "/api/seller/payouts/request", { totp: TOTP }, { allow: [400, 409] });
  if (!r.id) continue;
  await api("POST", "/api/admin/auth/login", { email: ADMIN.user, password: ADMIN.pass, totp: TOTP });
  if (email === paidBy) {
    await api("POST", `/api/admin/payouts/${r.id}/decide`, { decision: "approve" });
    await api("POST", `/api/admin/payouts/${r.id}/decide`, { decision: "paid", txnRef: `BKB2C${digits(8)}` });
    db.run(`UPDATE payouts SET requested_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-6 days'), decided_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days'), paid_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 days') WHERE id = ?`, [r.id]);
  } else db.run(`UPDATE payouts SET requested_at = strftime('%Y-%m-%dT%H:%M:%fZ','now','-5 hours') WHERE id = ?`, [r.id]);
}

for (const s of rows("SELECT id FROM sellers")) await api("POST", "/api/seller/auth/login", { email: one("SELECT email FROM sellers WHERE id = ?", [s.id]), password: SELLER.pass, totp: TOTP }, { allow: [401, 403] }).then(() => api("POST", "/api/seller/refresh-stats", {}, { allow: [401, 403] }));
db.exec("DELETE FROM audit_log WHERE action IN ('login', 'login_failed', 'login_pending_2fa')");
db.exec("DELETE FROM notifications");
rewriteImg();

const SEED_AT = new Date(now).toISOString();
const bytes = db.export();
const SEED_ID = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
log(`orders: ${rows("SELECT status, COUNT(*) AS n FROM orders GROUP BY status").map((r) => `${r.status} ${r.n}`).join(", ")}`);
log(`queued for ${SELLER.user}: ${one("SELECT COUNT(*) FROM order_items i JOIN sellers s ON s.id = i.seller_id WHERE s.email = ? AND i.fulfillment_status = 'queued'", [SELLER.user])}, disputes: ${rows("SELECT status, COUNT(*) AS n FROM disputes GROUP BY status").map((r) => `${r.status} ${r.n}`).join(", ")}, payouts: ${rows("SELECT status, COUNT(*) AS n FROM payouts GROUP BY status").map((r) => `${r.status} ${r.n}`).join(", ")}`);

// ---------- 7. Browser bundle ----------
log("bundling the browser runtime");
const demoCfg = {
  id: "cwbgaming", adminLangKey: "cwb_admin_lang", adminUser: ADMIN.user, adminPass: ADMIN.pass, adminTotp: TOTP,
  seller: { user: SELLER.user, pass: SELLER.pass, totp: TOTP }, vars: { SANDBOX_GATEWAY_SECRET: SANDBOX_SECRET }, media: true, shiftExact: true,
  shopDir: DIRS.shop, adminDir: DIRS.admin,
};
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
  external: ["fs", "path", "crypto"],
});

// ---------- 8. Assemble the three folders ----------
const DEMO_SMS = "Demo — no SMS is sent. Your code: ";
const smsText = (s) => s.split("`DEV code: ${").join("`" + DEMO_SMS + "${").split("`DEV: ${").join("`" + DEMO_SMS + "${");
const relImg = (s) => s.replace(/(["'`(])\/img\//g, "$1img/");
const keepMeta = (dir) => (existsSync(join(dir, "demo.json")) ? readFileSync(join(dir, "demo.json")) : null);

function writeDemoFiles(out, html) {
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
  html = html.replace(/<meta name="robots"[^>]*>\s*/g, "");
  html = must(html, "<head>", `<head>\n  <meta name="robots" content="noindex, follow">`, "noindex");
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  return must(html, `<meta charset="utf-8">`, `<meta charset="utf-8">\n  <script src="./demo/runtime.js"></script>`, "runtime");
}
function fresh(dir) {
  const meta = keepMeta(dir);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  if (meta) writeFileSync(join(dir, "demo.json"), meta);
}
const toSellerDemo = `../${DIRS.seller}/index.html`;
const toShop = `../${DIRS.shop}/#/`;

// --- Marketplace ---
log(`assembling ${DIRS.shop}/`);
const SHOP = join(REPO, DIRS.shop);
fresh(SHOP);
for (const n of ["css", "js", "img", "favicon.ico", "manifest.webmanifest"]) if (existsSync(join(DIST, n))) cpSync(join(DIST, n), join(SHOP, n), { recursive: true });
let shopHtml = readFileSync(join(DIST, "index.html"), "utf8");
shopHtml = demoHead(shopHtml, `${NAME} — demo marketplace`);
shopHtml = shopHtml.replace(/(href|src)="\/(css\/|js\/|img\/|manifest\.webmanifest|favicon\.ico)/g, '$1="./$2');
writeDemoFiles(SHOP, shopHtml);
for (const f of walk(SHOP).filter((f) => /\.(js|json|webmanifest|css)$/.test(f) && !f.includes(join(SHOP, "demo")))) {
  let s = readFileSync(f, "utf8");
  const before = s;
  if (f.endsWith(".css")) s = s.replace(/url\((["']?)\/img\//g, "url($1../img/");
  else {
    s = relImg(s);
    if (f.endsWith(".webmanifest")) s = s.replace(/"start_url":\s*"\/[^"]*"/, '"start_url": "./"').replace(/"scope":\s*"\/"/, '"scope": "./"');
    if (f.endsWith(".js")) {
      s = s.split("new URL(location.href).searchParams").join("__shopDemo.virtual().searchParams");
      s = s.replace(/\blocation\.pathname\b/g, "__shopDemo.virtual().pathname").replace(/\blocation\.search\b/g, "__shopDemo.virtual().search");
      s = smsText(s);
      // The seller dashboard is its own demo next door (target keeps the marketplace router from catching the click).
      s = s.split('href="/seller/#/register"').join(`href="${toSellerDemo}#/register" target="_self"`).split('href="/seller/"').join(`href="${toSellerDemo}" target="_self"`);
    }
    if (f.endsWith(join("views", "checkout.js"))) s = must(s, "location.href = pay.url;", "__shopDemo.go(pay.url);", "pay redirect (checkout)");
    if (f.endsWith(join("views", "order.js"))) s = must(s, "location.href = r.url;", "__shopDemo.go(r.url);", "pay redirect (order page)");
    if (f.endsWith(join("js", "app.js")) && !s.includes("__shopDemo.virtual().pathname.replace")) throw new Error('demo patch "router" no longer matches');
  }
  if (s !== before) writeFileSync(f, s);
}
if (existsSync(join(SHOP, "sw.js"))) rmSync(join(SHOP, "sw.js"));

// --- Admin ---
log(`assembling ${DIRS.admin}/`);
const ADM = join(REPO, DIRS.admin);
fresh(ADM);
mkdirSync(join(ADM, "admin"), { recursive: true });
for (const n of readdirSync(join(DIST, "admin")).filter((n) => n !== "index.html")) cpSync(join(DIST, "admin", n), join(ADM, "admin", n), { recursive: true });
cpSync(join(DIST, "img"), join(ADM, "img"), { recursive: true });
let adminHtml = readFileSync(join(DIST, "admin/index.html"), "utf8");
adminHtml = must(adminHtml, "<html ", '<html data-demo="admin" ', "admin marker");
adminHtml = demoHead(adminHtml, `${NAME} — platform admin (demo)`);
adminHtml = adminHtml.replace(/(href|src)="\/admin\//g, '$1="./admin/').replace(/(href|src)="\/img\//g, '$1="./img/');
writeDemoFiles(ADM, adminHtml);
for (const f of walk(ADM).filter((f) => /\.(js|json|css)$/.test(f) && !f.includes(join(ADM, "demo")))) {
  let s = readFileSync(f, "utf8");
  const before = s;
  if (f.endsWith(".css")) s = s.replace(/url\((["']?)\/img\//g, "url($1../../img/");
  else {
    s = relImg(s);
    s = s.replace(/href="\/(store|topup|game|policy)\//g, `href="${toShop}$1/`);
    s = smsText(s);
  }
  if (s !== before) writeFileSync(f, s);
}

// --- Seller dashboard ---
log(`assembling ${DIRS.seller}/`);
const SEL = join(REPO, DIRS.seller);
fresh(SEL);
mkdirSync(join(SEL, "seller"), { recursive: true });
mkdirSync(join(SEL, "admin"), { recursive: true });
for (const n of readdirSync(join(DIST, "seller")).filter((n) => n !== "index.html")) cpSync(join(DIST, "seller", n), join(SEL, "seller", n), { recursive: true });
for (const n of ["js", "css"]) cpSync(join(DIST, "admin", n), join(SEL, "admin", n), { recursive: true });
cpSync(join(DIST, "img"), join(SEL, "img"), { recursive: true });
let sellerHtml = readFileSync(join(DIST, "seller/index.html"), "utf8");
sellerHtml = must(sellerHtml, "<html ", '<html data-demo="seller" ', "seller marker");
sellerHtml = demoHead(sellerHtml, `${NAME} — seller dashboard (demo)`);
sellerHtml = sellerHtml.replace(/(href|src)="\/(admin|seller|img)\//g, '$1="./$2/');
writeDemoFiles(SEL, sellerHtml);
for (const f of walk(SEL).filter((f) => /\.(js|css)$/.test(f) && !f.includes(join(SEL, "demo")))) {
  let s = readFileSync(f, "utf8");
  const before = s;
  if (f.endsWith(".css")) s = s.replace(/url\((["']?)\/img\//g, "url($1../../img/");
  else {
    s = relImg(s);
    s = s.replace(/from "\/admin\/js\//g, 'from "../../admin/js/');
    s = s.replace(/href="\/(store|topup|game|policy)\//g, `href="${toShop}$1/`).split('href="/"').join(`href="../${DIRS.shop}/"`);
    s = smsText(s);
  }
  if (s !== before) writeFileSync(f, s);
}
if (/from "\/admin\//.test(walk(join(SEL, "seller")).map((f) => readFileSync(f, "utf8")).join("\n"))) throw new Error('demo patch "seller imports" no longer matches');

log(`done — marketplace ${(size(SHOP) / 1e6).toFixed(1)} MB, admin ${(size(ADM) / 1e6).toFixed(1)} MB, seller ${(size(SEL) / 1e6).toFixed(1)} MB, seed ${SEED_ID}`);
