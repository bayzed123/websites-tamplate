/**
 * The Lk's Attire backend, running in the browser.
 *
 * This bundles the real Cloudflare Worker (Hono routes, zod validation, pricing,
 * RBAC, audit log…) and gives it in-browser stand-ins for its bindings:
 *   DB → SQLite compiled to WebAssembly (sql.js) behind the D1 API
 *   KV → a small key/value store kept in localStorage
 * so every screen of the demo runs the same code as the live store, with no server.
 *
 * `app` is aliased to the Worker entry by build.mjs.
 */
import { Hono } from "hono";
import app from "lks-worker";

/* ---------------- D1 over sql.js ---------------- */
const norm = (params) =>
  params.map((v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v instanceof ArrayBuffer ? new Uint8Array(v) : v));

class Statement {
  constructor(d1, sql, params = []) {
    this.d1 = d1;
    this.sql = sql;
    this.params = params;
  }
  bind(...params) {
    return new Statement(this.d1, this.sql, params);
  }
  _run() {
    const db = this.d1.db;
    const st = db.prepare(this.sql);
    const rows = [];
    try {
      st.bind(norm(this.params));
      while (st.step()) rows.push(st.getAsObject());
    } finally {
      st.free();
    }
    const changes = db.getRowsModified();
    if (!/^\s*select/i.test(this.sql)) this.d1.dirty = true;
    return { rows, changes };
  }
  _result() {
    const { rows, changes } = this._run();
    const last = this.d1.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    return { results: rows, success: true, meta: { changes, last_row_id: last, rows_read: rows.length, rows_written: changes } };
  }
  async all() {
    return this._result();
  }
  async run() {
    return this._result();
  }
  async first(col) {
    const r = this._run().rows[0];
    if (!r) return null;
    return col ? (r[col] ?? null) : r;
  }
  async raw() {
    return this._run().rows.map((r) => Object.values(r));
  }
}

export class D1 {
  constructor(db) {
    this.db = db;
    this.dirty = false;
    db.exec("PRAGMA foreign_keys = ON");
  }
  prepare(sql) {
    return new Statement(this, sql);
  }
  /** Like D1: all statements succeed or none do. */
  async batch(stmts) {
    this.db.exec("SAVEPOINT batch");
    try {
      const out = stmts.map((s) => s._result());
      this.db.exec("RELEASE batch");
      this.dirty = true;
      return out;
    } catch (e) {
      this.db.exec("ROLLBACK TO batch; RELEASE batch");
      throw e;
    }
  }
  async exec(sql) {
    this.db.exec(sql);
    this.dirty = true;
    return { count: 1, duration: 0 };
  }
}

/* ---------------- KV ---------------- */
const b64 = {
  enc: (buf) => {
    let s = "";
    for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
    return btoa(s);
  },
  dec: (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0)).buffer,
};

/** `store` is { load(): object, save(object) } — localStorage in the browser, memory at build time. */
export class KV {
  constructor(store) {
    this.store = store;
    this.data = store.load() ?? {};
  }
  _live(key) {
    const e = this.data[key];
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) {
      delete this.data[key];
      return null;
    }
    return e;
  }
  _save() {
    this.store.save(this.data);
  }
  _decode(e, type) {
    const t = typeof type === "string" ? type : type?.type;
    if (e.bin) return t === "arrayBuffer" ? b64.dec(e.v) : new TextDecoder().decode(b64.dec(e.v));
    if (t === "json") return JSON.parse(e.v);
    if (t === "arrayBuffer") return new TextEncoder().encode(e.v).buffer;
    return e.v;
  }
  async get(key, type) {
    const e = this._live(key);
    return e ? this._decode(e, type) : null;
  }
  async getWithMetadata(key, type) {
    const e = this._live(key);
    return e ? { value: this._decode(e, type), metadata: e.meta ?? null } : { value: null, metadata: null };
  }
  async put(key, value, opts = {}) {
    const exp = opts.expiration ? opts.expiration * 1000 : opts.expirationTtl ? Date.now() + opts.expirationTtl * 1000 : 0;
    const bin = typeof value !== "string";
    this.data[key] = { v: bin ? b64.enc(value instanceof ArrayBuffer ? value : await new Response(value).arrayBuffer()) : value, bin, exp, meta: opts.metadata };
    this._save();
  }
  async delete(key) {
    delete this.data[key];
    this._save();
  }
  async list({ prefix = "", limit = 1000 } = {}) {
    const keys = Object.keys(this.data)
      .filter((k) => k.startsWith(prefix) && this._live(k))
      .slice(0, limit)
      .map((name) => ({ name, expiration: this.data[name].exp ? Math.floor(this.data[name].exp / 1000) : undefined, metadata: this.data[name].meta }));
    return { keys, list_complete: true, cursor: "" };
  }
}

/* ---------------- Cookie jar ---------------- */
function applySetCookies(jar, list) {
  for (const line of list) {
    const [pair, ...attrs] = line.split(";");
    const i = pair.indexOf("=");
    const name = pair.slice(0, i).trim();
    const value = pair.slice(i + 1).trim();
    const maxAge = attrs.map((a) => a.trim()).find((a) => /^max-age=/i.test(a));
    const expires = attrs.map((a) => a.trim()).find((a) => /^expires=/i.test(a));
    const gone = (maxAge && Number(maxAge.split("=")[1]) <= 0) || (expires && Date.parse(expires.slice(8)) < Date.now()) || value === "";
    if (gone) delete jar[name];
    else jar[name] = value;
  }
}

/**
 * Creates a backend instance.
 *   db      — a sql.js Database (already holding the store's data)
 *   kvStore — { load, save } for KV
 *   jar     — { load, save } for cookies
 */
export function createBackend({ db, kvStore, jar }) {
  const d1 = new D1(db);
  const env = {
    DB: d1,
    KV: new KV(kvStore),
    ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    ENVIRONMENT: "demo",
    PUBLIC_URL: "",
  };
  const cookies = jar.load() ?? {};

  // Browsers drop Set-Cookie from a Response made in JavaScript, so collect cookies where
  // the Worker sets them (hono/cookie → c.header("Set-Cookie", …)) instead of from the response.
  const outer = new Hono();
  outer.use("*", async (c, next) => {
    // …and browsers also strip a Cookie header from a Request made in JavaScript: answer it from the jar.
    const reqHeaders = c.req.raw.headers;
    const get = reqHeaders.get.bind(reqHeaders);
    reqHeaders.get = (name) => (String(name).toLowerCase() === "cookie" ? c.executionCtx.props.cookie || null : get(name));
    const header = c.header.bind(c);
    c.header = (name, value, opts) => {
      if (String(name).toLowerCase() === "set-cookie" && value) c.executionCtx.props.cookies.push(value);
      return header(name, value, opts);
    };
    await next();
  });
  outer.route("/", app);
  outer.notFound((c) => c.json({ code: "not_found", en: "Not found.", bn: "পাওয়া যায়নি।" }, 404));

  async function handle(request) {
    const headers = new Headers(request.headers);
    const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ");
    if (request.method !== "GET" && request.method !== "HEAD") headers.set("origin", new URL(request.url).origin);
    if (!headers.has("cf-connecting-ip")) headers.set("cf-connecting-ip", "127.0.0.1");
    const req = new Request(request, { headers });
    const ctx = { waitUntil: (p) => Promise.resolve(p).catch(() => {}), passThroughOnException() {}, props: { cookies: [], cookie } };
    const res = await outer.fetch(req, env, ctx);
    applySetCookies(cookies, ctx.props.cookies);
    jar.save(cookies);
    const out = new Headers(res.headers);
    out.delete("set-cookie");
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out });
  }
  return { handle, d1, env };
}
