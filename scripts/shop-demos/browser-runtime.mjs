/**
 * Loaded as the first script of every shop and admin demo built by build.mjs.
 *
 * - Answers every /api/* request in the browser with the shop's real Worker code (engine.mjs).
 * - Keeps the shop's data in IndexedDB, shared by its shop and admin demos on the same site:
 *   an order placed in the shop shows up in the admin, and admin edits show in the shop.
 * - Serves the app from a sub-folder: root-absolute fetches are re-pointed at this folder and
 *   the shop's page URLs live in the hash (…/prakriti-herbal/#/product/ashwagandha-root-capsules).
 * - Links the Worker answers itself (invoice PDFs, the WhatsApp button) are answered here too.
 *
 * Optional, for shops that need them (CWB Gaming): a seller dashboard surface (data-demo="seller")
 * that opens signed in, extra Worker variables (the sandbox payment gateway), an R2 stand-in kept
 * in IndexedDB (seller KYC uploads), and an in-page sandbox payment window.
 *
 * Add ?demo-reset to any demo URL to start again from the original data.
 */
import initSqlJs from "sql.js/dist/sql-wasm-browser.js";
import { createBackend } from "./engine.mjs";

const CFG = __DEMO__; // { id, adminLangKey, adminUser, adminPass, shopDir, adminDir, adminTotp?, seller?: { user, pass, totp }, vars?, media? }
const SEED_ID = __SEED_ID__;
const SEED_AT = __SEED_AT__;

const script = document.currentScript;
const DEMO_DIR = new URL(".", script.src); // …/<demo>/demo/
const ROOT = new URL("..", DEMO_DIR); // …/<demo>/
const BASE = ROOT.pathname.replace(/\/$/, "");
const realFetch = window.fetch.bind(window);
const IS_ADMIN = document.documentElement.dataset.demo === "admin";
const IS_SELLER = document.documentElement.dataset.demo === "seller";
const NS = `${CFG.id}Demo`;
const LS = { kv: `${NS}.kv`, jar: `${NS}.cookies`, ver: `${NS}.version` };
const SIGNED_OUT = `${NS}.signedOut`;
const IDB = `${CFG.id}-demo`;
// The admin demo opens in English for visitors who haven't chosen (the বাংলা toggle is one click away).
try { if (IS_ADMIN && !localStorage.getItem(CFG.adminLangKey)) localStorage.setItem(CFG.adminLangKey, "en"); } catch { /* ignore */ }

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
    const r = indexedDB.open(IDB, 1);
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

/** R2 stand-in: files uploaded in the demo (seller KYC documents) stay in this browser's IndexedDB. */
const mediaStore = {
  get: (key) => idbGet(`r2:${key}`),
  put: (key, value) => idbPut(`r2:${key}`, value),
  async delete(key) {
    try {
      const db = await idb();
      await new Promise((res) => { const tx = db.transaction("files", "readwrite"); tx.objectStore("files").delete(`r2:${key}`); tx.oncomplete = tx.onerror = () => res(); });
    } catch { /* ignore */ }
  },
  async keys() {
    try {
      const db = await idb();
      const all = await new Promise((res) => { const q = db.transaction("files").objectStore("files").getAllKeys(); q.onsuccess = () => res(q.result ?? []); q.onerror = () => res([]); });
      return all.filter((k) => typeof k === "string" && k.startsWith("r2:")).map((k) => k.slice(3));
    } catch { return []; }
  },
};

const version = () => Number(localStorage.getItem(LS.ver) ?? 0);

/** Move every date forward so the demo's history always ends "today" (timestamps and plain dates such as expiry). */
function shiftDates(db) {
  // Whole days keep plain dates (expiry) on the same weekday; shops with live timers (CWB's delivery deadlines)
  // shift by the exact time instead, so "paid 10 minutes ago" is still 10 minutes ago when the visitor arrives.
  const secs = Math.floor((Date.now() - Date.parse(SEED_AT)) / 1000);
  if (CFG.shiftExact) {
    if (secs > 60) shiftBy(db, `+${secs} seconds`, `+${Math.floor(secs / 86400)} days`);
    return;
  }
  const days = Math.floor(secs / 86400);
  if (days <= 0) return;
  shiftBy(db, `+${days} days`, `+${days} days`);
}
function shiftBy(db, stamp, day) {
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'd1_%'")[0]?.values.flat() ?? [];
  for (const t of tables) {
    const cols = db.exec(`PRAGMA table_info("${t}")`)[0]?.values.map((r) => r[1]).filter((c) => /(_at|_date|_until|_from|_deadline)$/.test(c)) ?? [];
    for (const c of cols) {
      db.exec(`UPDATE "${t}" SET "${c}" = strftime('%Y-%m-%dT%H:%M:%fZ', "${c}", '${stamp}') WHERE "${c}" LIKE '____-__-__T%'`);
      db.exec(`UPDATE "${t}" SET "${c}" = date("${c}", '${day}') WHERE "${c}" LIKE '____-__-__' `);
    }
  }
}

if (new URLSearchParams(location.search).has("demo-reset")) {
  for (const k of Object.values(LS)) localStorage.removeItem(k);
  sessionStorage.removeItem(SIGNED_OUT);
  indexedDB.deleteDatabase(IDB);
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
  // "development" makes the shop show SMS codes on screen instead of sending them, so a visitor
  // can try the phone check at checkout and the staff phone sign-in.
  backend = createBackend({ db, kvStore: lsStore(LS.kv), jar: lsStore(LS.jar), vars: { ENVIRONMENT: "development", ...(CFG.vars ?? {}) }, media: CFG.media ? mediaStore : null });
  // The admin demo opens signed in, so a visitor lands on the dashboard. After "Sign out" the
  // sign-in screen (pre-filled with the demo account) shows for the rest of the visit.
  if (IS_ADMIN && !sessionStorage.getItem(SIGNED_OUT)) {
    const me = await backend.handle(new Request(`${location.origin}/api/admin/auth/me`, { headers: { "x-requested-with": "fetch" } }));
    if (!me.ok) {
      await backend.handle(new Request(`${location.origin}/api/admin/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-requested-with": "fetch" },
        body: JSON.stringify({ email: CFG.adminUser, password: CFG.adminPass, ...(CFG.adminTotp ? { totp: CFG.adminTotp } : {}) }),
      }));
    }
    await persist();
  }
  // The seller dashboard demo opens signed in as a demo seller, the same way.
  if (IS_SELLER && CFG.seller && !sessionStorage.getItem(SIGNED_OUT)) {
    const me = await backend.handle(new Request(`${location.origin}/api/seller/auth/me`, { headers: { "x-requested-with": "fetch" } }));
    if (!me.ok) {
      await backend.handle(new Request(`${location.origin}/api/seller/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-requested-with": "fetch" },
        body: JSON.stringify({ email: CFG.seller.user, password: CFG.seller.pass, totp: CFG.seller.totp }),
      }));
    }
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

/* Photos and certificates uploaded in the admin stay in this browser as data URLs. */
async function upload(init) {
  const file = init?.body instanceof FormData ? init.body.get("file") : null;
  if (!(file instanceof Blob)) return Response.json({ code: "validation", en: "Choose a file to upload.", bn: "আপলোড করার জন্য একটি ফাইল বেছে নিন।" }, { status: 400 });
  const url = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  return Response.json({ url, key: `demo/${Date.now()}` }, { status: 201 });
}

/** App path for a URL on this site: /<folder>/x → /x (anything outside the folder stays as is). */
function appPath(url) {
  let p = url.pathname;
  if (p === BASE || p.startsWith(BASE + "/")) p = p.slice(BASE.length) || "/";
  return p;
}

window.fetch = async (input, init) => {
  const isReq = input instanceof Request;
  const url = new URL(isReq ? input.url : String(input), location.href);
  // blob: and data: URLs report this page's origin too, but they are files in the browser, not on the site.
  if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return realFetch(input, init);
  const inside = url.pathname === BASE || url.pathname.startsWith(BASE + "/");
  const path = appPath(url);
  if (path.startsWith("/api/")) {
    const method = (init?.method ?? (isReq ? input.method : "GET")).toUpperCase();
    if ((path === "/api/admin/uploads" || path === "/api/admin/media") && method === "POST") return upload(init);
    if (path === "/api/admin/auth/logout" || path === "/api/seller/auth/logout") sessionStorage.setItem(SIGNED_OUT, "1");
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

/* ---------------- links the Worker itself answers ---------------- */
document.addEventListener(
  "click",
  async (e) => {
    const a = e.target.closest?.("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0) return;
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript|data|blob):/i.test(href)) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    const path = appPath(url);
    if (!/^\/(api\/|wa\b|media\/|feeds\/)/.test(path)) return;
    e.preventDefault();
    e.stopPropagation();
    // Open the tab now (inside the click) so the browser doesn't block it; fill it when the answer is ready.
    const win = window.open("about:blank", "_blank");
    try {
      const res = await callApi(new Request(location.origin + path + url.search, { headers: { "x-requested-with": "fetch" }, redirect: "manual" }));
      const to = res.headers.get("location");
      if (to) {
        if (win) win.location.href = to;
        else location.href = to;
        return;
      }
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      if (win) win.location.href = obj;
      else location.href = obj;
    } catch {
      win?.close();
    }
  },
  true,
);

if (!IS_ADMIN && !IS_SELLER) {
  /* ---------------- shop routing inside a folder ---------------- */
  const isHashUrl = (u) => typeof u === "string" && /#\//.test(u);
  window.__shopDemo = {
    base: BASE,
    /** Real browser URL for an app path such as /product/x?y=1 → <folder>/#/product/x?y=1 */
    toUrl(u) {
      if (u == null || isHashUrl(u)) return u;
      const url = new URL(String(u), location.origin);
      let p = appPath(url);
      if (/^\/index\.html?$/.test(p)) p = "/";
      return `${BASE}/#${p}${url.search}`;
    },
    /** The app URL the shop renders. */
    virtual() {
      const h = location.hash.startsWith("#/") ? location.hash.slice(1) : "/";
      const u = new URL(h, location.origin);
      for (const [k, v] of new URLSearchParams(location.search)) if (!u.searchParams.has(k)) u.searchParams.set(k, v);
      return u;
    },
    /** Where the shop sends the buyer to pay. The sandbox gateway page opens in a window on this page. */
    go(u) {
      const url = new URL(String(u), location.origin);
      if (appPath(url) === "/api/payments/sandbox/page") return sandboxWindow(url.searchParams.get("order"), url.searchParams.get("token"));
      location.href = window.__shopDemo.toUrl(u);
    },
  };

  /**
   * The simulated payment gateway. On the live shop this is bKash / SSLCommerz's own page; here it is a window
   * whose buttons post to the Worker's sandbox endpoint, which sends the signed confirmation webhook — exactly
   * the server-side path that releases a code. Nothing is charged.
   */
  async function sandboxWindow(orderNo, token) {
    let order = null;
    try {
      const r = await callApi(new Request(`${location.origin}/api/orders/${encodeURIComponent(orderNo)}?token=${encodeURIComponent(token)}`, { headers: { "x-requested-with": "fetch" } }));
      order = (await r.json()).order;
    } catch { /* show the window anyway */ }
    const wrap = document.createElement("div");
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-label", "Sandbox payment");
    wrap.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:rgba(5,6,9,.78);display:grid;place-items:center;padding:16px;font:16px/1.5 system-ui,sans-serif";
    const method = order?.payment_method ?? "bkash";
    wrap.innerHTML = `<div style="max-width:420px;width:100%;background:#161821;color:#eceef6;border:1px solid #2a2d3a;padding:26px">
      <span style="display:inline-block;background:#ff2e93;color:#fff;font-size:12px;font-weight:700;padding:2px 8px;letter-spacing:.06em">DEMO SANDBOX — NOT A REAL PAYMENT</span>
      <h2 style="font-size:20px;margin:10px 0 4px">Simulated ${method} payment</h2>
      <p style="color:#9aa0b4;margin:0 0 6px">Order ${orderNo}. On the live marketplace this is the real bKash / Nagad / card page.</p>
      <div style="font-size:34px;font-weight:800;color:#22e5ff;margin:8px 0 6px">৳${order?.total ?? ""}</div>
      <p style="color:#9aa0b4;font-size:14px;margin:0 0 14px">"Approve" sends the gateway's signed confirmation to the server — only then is the code or top-up released.</p>
      <button type="button" data-act="approve" data-testid="sandbox-approve" style="width:100%;padding:14px;border:0;font:700 16px system-ui;cursor:pointer;background:#22e5ff;color:#0d0e12">Approve payment</button>
      <button type="button" data-act="decline" data-testid="sandbox-decline" style="width:100%;padding:14px;margin-top:10px;font:700 16px system-ui;cursor:pointer;background:transparent;color:#ff2e93;border:1px solid #ff2e93">Decline</button>
    </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", async (e) => {
      const act = e.target.closest?.("[data-act]")?.dataset.act;
      if (!act) return;
      for (const b of wrap.querySelectorAll("button")) b.disabled = true;
      const res = await callApi(new Request(`${location.origin}/api/payments/sandbox/pay`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "x-requested-with": "fetch" },
        body: new URLSearchParams({ order: orderNo, token, action: act }).toString(),
      }));
      wrap.remove();
      const to = res.headers.get("location") ?? `/order/${encodeURIComponent(orderNo)}?token=${encodeURIComponent(token)}`;
      history.pushState({}, "", to);
      dispatchEvent(new PopStateEvent("popstate"));
    });
  }
  // The shop's router calls pushState / replaceState with app paths (/product/x): keep them in the hash.
  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m].bind(history);
    history[m] = (state, title, u) => orig(state, title, u === undefined ? u : window.__shopDemo.toUrl(u));
  }
  /* In-page anchors (#reviews, #main) scroll instead of replacing the hash route. */
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest?.('a[href^="#"]');
      if (!a || a.getAttribute("href").startsWith("#/") || a.getAttribute("href") === "#") return;
      e.preventDefault();
      document.getElementById(a.getAttribute("href").slice(1))?.scrollIntoView({ behavior: "smooth" });
    },
    true,
  );
} else if (IS_SELLER) {
  /* Seller demo: the sign-in form arrives filled in with the published demo seller. */
  new MutationObserver(() => {
    const f = document.querySelector("#lf");
    if (!f || f.dataset.filled || !CFG.seller) return;
    f.dataset.filled = "1";
    const user = f.querySelector('[name="email"]');
    const pass = f.querySelector('[name="password"]');
    if (user) user.value = CFG.seller.user;
    if (pass) pass.value = CFG.seller.pass;
  }).observe(document.documentElement, { childList: true, subtree: true });
} else {
  /* Admin demo: the sign-in form arrives filled in with the published demo account. */
  new MutationObserver(() => {
    const f = document.querySelector("#login");
    if (!f || f.dataset.filled) return;
    f.dataset.filled = "1";
    const user = f.querySelector('[name="email"]');
    const pass = f.querySelector('[name="password"]');
    if (user) user.value = CFG.adminUser;
    if (pass) pass.value = CFG.adminPass;
  }).observe(document.documentElement, { childList: true, subtree: true });
}
