// Shared storefront helpers: safe HTML templating, API client, buyer session, overlays, toasts, checkout draft,
// device id, attribution (UTM / ad refs) and Turnstile.
import { t, lang, tx } from "./i18n.js";

// ---------- Safe templating (auto-escapes every interpolated value) ----------
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s));
export function html(strings, ...values) {
  let out = strings[0];
  values.forEach((v, i) => {
    out += Array.isArray(v) ? v.map((x) => (x instanceof Raw ? x.s : esc(x))).join("") : v instanceof Raw ? v.s : v === false || v == null ? "" : esc(v);
    out += strings[i + 1];
  });
  return new Raw(out);
}
export const icon = (name, cls = "icon") => raw(`<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`);
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// ---------- API ----------
export class ApiErr extends Error {
  constructor(status, data) {
    super(data?.[lang()] || data?.en || `HTTP ${status}`);
    this.status = status;
    this.data = data;
  }
}
export async function api(path, { method = "GET", body, signal } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    credentials: "same-origin",
    headers: { "x-requested-with": "fetch", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiErr(res.status, data);
  return data;
}
export const errMsg = (e) => (e instanceof ApiErr ? e.message : t("somethingWrong"));

let configPromise;
export const config = () => (configPromise ??= api("/config"));

// ---------- Buyer session ----------
let mePromise;
export const me = (refresh = false) => {
  if (refresh || !mePromise) mePromise = api("/account/me").then((r) => r.customer).catch(() => null);
  return mePromise;
};

// ---------- Local storage (wrapped: private windows can block it) ----------
const read = (k, d, store = localStorage) => { try { return JSON.parse(store.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v, store = localStorage) => { try { store.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

/** The pack the buyer is about to pay for (one line per checkout — top-ups are bought one at a time). */
export const draft = {
  get: () => read("cwb_draft", null, sessionStorage),
  set: (d) => write("cwb_draft", d, sessionStorage),
  clear: () => { try { sessionStorage.removeItem("cwb_draft"); } catch { /* ignore */ } },
};

/** Guests find their recent orders again from this device (the private link token stays on the device). */
export const recentOrders = {
  list: () => read("cwb_orders", []),
  add(orderNo, token) { write("cwb_orders", [{ orderNo, token, at: Date.now() }, ...recentOrders.list().filter((o) => o.orderNo !== orderNo)].slice(0, 20)); },
};

/** First-party device id (fraud checks: velocity per device, shared devices). */
export function deviceId() {
  let id = read("cwb_did", "");
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    write("cwb_did", id);
  }
  document.cookie = `cwb_did=${id}; path=/; max-age=31536000; samesite=lax`;
  return id;
}

export function sessionId() {
  let id = read("cwb_sid", "", sessionStorage);
  if (!id) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
    write("cwb_sid", id, sessionStorage);
  }
  return id;
}

// ---------- Attribution ----------
export function captureUtm() {
  const q = __shopDemo.virtual().searchParams;
  const source = q.get("utm_source"), medium = q.get("utm_medium"), campaign = q.get("utm_campaign");
  const fbclid = q.get("fbclid"), gclid = q.get("gclid"), ref = q.get("ref");
  if (source || campaign || fbclid || gclid) {
    write("cwb_utm", { source: source ?? (fbclid ? "facebook" : gclid ? "google" : undefined), medium: medium ?? (fbclid || gclid ? "cpc" : undefined), campaign: campaign ?? undefined, at: Date.now() });
  }
  if (ref) write("cwb_adref", ref);
  if (fbclid) document.cookie = `_fbc=fb.1.${Date.now()}.${fbclid}; path=/; max-age=7776000; samesite=lax`;
}
export function utm() {
  const u = read("cwb_utm", null);
  if (!u || Date.now() - (u.at ?? 0) > 30 * 86400_000) return {};
  const { at: _at, ...rest } = u;
  return rest;
}
export const adRef = () => read("cwb_adref", "") || undefined;
export const cookie = (name) => document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.split("=").slice(1).join("=");

// ---------- Toasts & overlays ----------
export function toast(message, type = "success", ms = 3400) {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  $("#toasts").append(el);
  setTimeout(() => el.remove(), ms);
}

export function overlay(kind, { title, body, footer, onClose } = {}) {
  const root = $("#overlay-root");
  const scrim = document.createElement("div");
  scrim.className = "scrim";
  const panel = document.createElement(kind === "drawer" ? "aside" : "div");
  panel.className = kind;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", title);
  panel.innerHTML = String(html`<header><h3>${title}</h3><button class="icon-btn" type="button" data-close aria-label="${t("close")}">${icon("close")}</button></header><div class="content">${body ?? ""}</div>${footer ? html`<footer>${footer}</footer>` : ""}`);
  const prev = document.activeElement;
  const onKey = (e) => {
    if (e.key === "Escape") close();
    if (e.key === "Tab") {
      const f = $$("a[href], button:not([disabled]), input, select, textarea", panel).filter((x) => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  };
  function close() {
    scrim.classList.remove("show");
    panel.classList.remove("show");
    document.removeEventListener("keydown", onKey);
    setTimeout(() => { scrim.remove(); panel.remove(); }, 220);
    document.body.style.overflow = "";
    prev?.focus?.();
    onClose?.();
  }
  scrim.addEventListener("click", close);
  panel.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) close(); });
  document.addEventListener("keydown", onKey);
  root.append(scrim, panel);
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => { scrim.classList.add("show"); panel.classList.add("show"); (panel.querySelector("input,textarea,select") ?? panel.querySelector("[data-close]"))?.focus(); });
  return { panel, close };
}

/** Shows server-side field errors next to inputs. */
export function showFieldErrors(form, e) {
  $$(".field-error", form).forEach((x) => x.remove());
  $$(".invalid", form).forEach((x) => x.classList.remove("invalid"));
  for (const f of e?.data?.fields ?? []) {
    const name = f.field.split(".").at(-1);
    const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
    if (!input) continue;
    input.classList.add("invalid");
    input.setAttribute("aria-invalid", "true");
    const s = document.createElement("span");
    s.className = "field-error";
    s.textContent = f[lang()] || f.en;
    (input.closest(".field") ?? input.parentElement).append(s);
  }
  form.querySelector(".invalid")?.focus();
}

export function debounce(fn, ms = 300) {
  let h;
  return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); };
}

export const normalizePhone = (v) => {
  const d = String(v).replace(/[^\d]/g, "").replace(/^(?:00)?880/, "0");
  return /^01[3-9]\d{8}$/.test(d) ? d : null;
};

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast(t("copied"), "info", 1600); } catch { /* old browser */ }
}

/** Loads Cloudflare Turnstile only if a site key is configured. Returns a function that yields a token. */
export async function turnstile(container) {
  const cfg = await config();
  if (!cfg.turnstileSiteKey) return async () => undefined;
  if (!window.turnstile) {
    await new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.onload = res; s.onerror = rej;
      document.head.append(s);
    });
  }
  const id = window.turnstile.render(container, { sitekey: cfg.turnstileSiteKey, language: lang(), theme: document.documentElement.dataset.theme });
  return async () => window.turnstile.getResponse(id);
}

export const loadingBlock = (n = 3) => raw(Array.from({ length: n }, () => '<div class="skel"></div>').join(""));
export const errorBlock = (e) => html`<div class="state"><p class="error-box">${errMsg(e)}</p><button class="btn" type="button" data-reload>${t("retry")}</button></div>`;
export const emptyBlock = (en, bn) => html`<div class="state">${tx(en, bn)}</div>`;
