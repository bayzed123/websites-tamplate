/**
 * Loaded as the first script of both Lk's Attire demos (shop and admin).
 *
 * - Answers every /api/* request in the browser with the real Worker code (see engine.mjs).
 * - Keeps the store's data in IndexedDB, shared by the shop and admin demos on the same
 *   site: an order placed in the shop shows up in the admin, and admin edits show in the shop.
 * - Serves the app from a sub-folder: root-absolute fetches are re-pointed at this folder and
 *   the shop's page URLs live in the hash (…/lks-attire-shop/#/product/ruby-organza…).
 *
 * Add ?demo-reset to any demo URL to start again from the original data.
 */
import initSqlJs from "sql.js/dist/sql-wasm-browser.js";
import { createBackend } from "./engine.mjs";

const SEED_ID = __SEED_ID__;
const SEED_AT = __SEED_AT__;

const script = document.currentScript;
const DEMO_DIR = new URL(".", script.src); // …/<demo>/demo/
const ROOT = new URL("..", DEMO_DIR); // …/<demo>/
const BASE = ROOT.pathname.replace(/\/$/, "");
const realFetch = window.fetch.bind(window);
const IS_ADMIN = document.documentElement.dataset.demo === "admin";
// The admin demo opens in English for visitors who haven't chosen (the বাংলা toggle is one click away).
try { if (IS_ADMIN && !localStorage.getItem("lks_admin_lang")) localStorage.setItem("lks_admin_lang", "en"); } catch { /* ignore */ }
const SIGNED_OUT = "lksDemo.signedOut";
const LS = { kv: "lksDemo.kv", jar: "lksDemo.cookies", ver: "lksDemo.version" };

/* ---------------- storage ---------------- */
const lsStore = (key) => ({
  load: () => {
    try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
  },
  save: (v) => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* private mode: data lasts for this page only */ }
  },
});

function idb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("lks-attire-demo", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbGet(key) {
  try {
    const db = await idb();
    return await new Promise((res) => {
      const q = db.transaction("files").objectStore("files").get(key);
      q.onsuccess = () => res(q.result ?? null);
      q.onerror = () => res(null);
    });
  } catch { return null; }
}
async function idbPut(key, value) {
  try {
    const db = await idb();
    await new Promise((res) => {
      const tx = db.transaction("files", "readwrite");
      tx.objectStore("files").put(value, key);
      tx.oncomplete = tx.onerror = () => res();
    });
  } catch { /* storage blocked: keep working in memory */ }
}

const version = () => Number(localStorage.getItem(LS.ver) ?? 0);

/** Move every date forward so the demo's order history always ends "today". */
function shiftDates(db) {
  const days = Math.floor((Date.now() - Date.parse(SEED_AT)) / 86400000);
  if (days <= 0) return;
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'")[0]?.values.flat() ?? [];
  for (const t of tables) {
    const cols = db.exec(`PRAGMA table_info("${t}")`)[0]?.values.map((r) => r[1]).filter((c) => /_at$/.test(c)) ?? [];
    for (const c of cols) db.exec(`UPDATE "${t}" SET "${c}" = strftime('%Y-%m-%dT%H:%M:%fZ', "${c}", '+${days} days') WHERE "${c}" IS NOT NULL AND "${c}" LIKE '____-__-__%'`);
  }
}

if (new URLSearchParams(location.search).has("demo-reset")) {
  for (const k of Object.values(LS)) localStorage.removeItem(k);
  indexedDB.deleteDatabase("lks-attire-demo");
  const u = new URL(location.href);
  u.searchParams.delete("demo-reset");
  location.replace(u);
}

let SQL, backend, loadedVersion = 0;
const ready = (async () => {
  SQL = await initSqlJs({ locateFile: (f) => new URL(f, DEMO_DIR).href });
  const saved = await idbGet("db");
  let db;
  if (saved?.seed === SEED_ID) {
    db = new SQL.Database(saved.bytes);
  } else {
    const bytes = new Uint8Array(await (await realFetch(new URL("store.db", DEMO_DIR))).arrayBuffer());
    db = new SQL.Database(bytes);
    shiftDates(db);
    localStorage.removeItem(LS.kv);
    localStorage.removeItem(LS.jar);
    await idbPut("db", { seed: SEED_ID, bytes: db.export() });
    localStorage.setItem(LS.ver, String(version() + 1));
  }
  loadedVersion = version();
  backend = createBackend({ db, kvStore: lsStore(LS.kv), jar: lsStore(LS.jar) });
  // Admin demo opens signed in, so a visitor lands on the dashboard. After "Sign out" the
  // sign-in screen (pre-filled with demo / demo12345) shows for the rest of the visit.
  if (IS_ADMIN && !sessionStorage.getItem(SIGNED_OUT) && !(lsStore(LS.jar).load() ?? {}).lks_admin) {
    await backend.handle(new Request(`${location.origin}/api/admin/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-requested-with": "fetch" },
      body: JSON.stringify({ email: "demo", password: "demo12345" }),
    }));
    await persist();
  }
})();

/** Another tab (the shop or the admin) saved newer data: load it before answering. */
async function syncFromOtherTabs() {
  if (version() === loadedVersion) return;
  const saved = await idbGet("db");
  if (saved?.seed === SEED_ID) {
    backend.d1.db.close();
    backend.d1.db = new SQL.Database(saved.bytes);
    backend.d1.db.exec("PRAGMA foreign_keys = ON");
  }
  backend.env.KV.data = lsStore(LS.kv).load() ?? {};
  loadedVersion = version();
}

async function persist() {
  if (!backend.d1.dirty) return;
  backend.d1.dirty = false;
  const bytes = backend.d1.db.export();
  backend.d1.db.exec("PRAGMA foreign_keys = ON"); // export() reopens the connection
  await idbPut("db", { seed: SEED_ID, bytes });
  loadedVersion = version() + 1;
  localStorage.setItem(LS.ver, String(loadedVersion));
}

let queue = Promise.resolve();
function callApi(request) {
  // One request at a time, like a single Worker isolate handling a user's clicks.
  const run = queue.then(async () => {
    await ready;
    await syncFromOtherTabs();
    try { return await backend.handle(request); } finally { await persist(); }
  });
  queue = run.catch(() => {});
  return run;
}

/* Product photos uploaded in the admin stay in this browser as data URLs. */
async function upload(init) {
  const file = init?.body instanceof FormData ? init.body.get("file") : null;
  if (!(file instanceof Blob)) return Response.json({ code: "validation", en: "Choose an image to upload.", bn: "আপলোড করার জন্য একটি ছবি বেছে নিন।" }, { status: 400 });
  const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  return Response.json({ url, key: `demo/${Date.now()}` }, { status: 201 });
}

window.fetch = async (input, init) => {
  const isReq = input instanceof Request;
  const url = new URL(isReq ? input.url : String(input), location.href);
  if (url.origin !== location.origin) return realFetch(input, init);
  let path = url.pathname;
  const inside = path === BASE || path.startsWith(BASE + "/");
  if (inside) path = path.slice(BASE.length) || "/";
  if (path.startsWith("/api/")) {
    const method = (init?.method ?? (isReq ? input.method : "GET")).toUpperCase();
    if (path === "/api/admin/uploads" && method === "POST") return upload(init);
    if (path === "/api/admin/auth/logout") sessionStorage.setItem(SIGNED_OUT, "1");
    const target = location.origin + path + url.search;
    return callApi(isReq ? new Request(target, input) : new Request(target, init));
  }
  if (!inside) return realFetch(BASE + url.pathname + url.search, init);
  return realFetch(input, init);
};

/* No service worker: the demo must never cache itself into someone's browser. */
if (navigator.serviceWorker) {
  try { Object.defineProperty(navigator.serviceWorker, "register", { value: () => Promise.resolve(undefined) }); } catch { /* ignore */ }
}

/* ---------------- shop routing inside a folder ---------------- */
window.__lksDemo = {
  base: BASE,
  /** Real browser URL for an app path such as /product/ruby?x=1 → <folder>/#/product/ruby?x=1 */
  toUrl(u) {
    const url = new URL(u, location.origin);
    let p = url.pathname;
    if (p === BASE || p.startsWith(BASE + "/")) p = p.slice(BASE.length) || "/";
    if (/^\/index\.html?$/.test(p)) p = "/";
    return `${BASE}/#${p}${url.search}`;
  },
  /** The app URL the shop router should render. */
  virtual() {
    const h = location.hash.startsWith("#/") ? location.hash.slice(1) : "/";
    const u = new URL(h, location.origin);
    for (const [k, v] of new URLSearchParams(location.search)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    return u;
  },
};

/* In-page anchors (#reviews, #main) scroll instead of replacing the hash route. */
document.addEventListener(
  "click",
  (e) => {
    const a = e.target.closest?.('a[href^="#"]');
    if (!a || a.getAttribute("href").startsWith("#/")) return;
    e.preventDefault();
    document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({ behavior: "smooth" });
  },
  true,
);

/* Admin demo: the sign-in form arrives filled in with the published demo account. */
if (IS_ADMIN) {
  new MutationObserver(() => {
    const f = document.querySelector("#login");
    if (!f || f.dataset.filled) return;
    f.dataset.filled = "1";
    f.querySelector('[name="email"]').value = "demo";
    f.querySelector('[name="password"]').value = "demo12345";
  }).observe(document.documentElement, { childList: true, subtree: true });
}
