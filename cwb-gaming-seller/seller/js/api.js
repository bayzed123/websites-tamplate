// Seller API client and session (shared by app.js and pages.js).
import { tx, lang } from "../../admin/js/i18n.js";

export const session = { seller: null, profile: null };

export class SellerErr extends Error {
  constructor(status, data) { super(data?.[lang()] || data?.en || `HTTP ${status}`); this.status = status; this.data = data; }
}
export async function sapi(path, { method = "GET", body, raw } = {}) {
  const res = await fetch(`/api/seller${path}`, {
    method,
    credentials: "same-origin",
    headers: { "x-requested-with": "fetch", ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : raw,
  });
  const ct = res.headers.get("content-type") ?? "";
  const data = ct.includes("json") ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith("/auth/")) { location.hash = "#/login"; location.reload(); }
    throw new SellerErr(res.status, typeof data === "object" ? data : { en: String(data) });
  }
  return data;
}
export const smsg = (d) => (d && typeof d === "object" ? d[lang()] ?? d.en : "");
export const serr = (e) => (e instanceof SellerErr ? e.message : tx("Couldn't load. Check your connection.", "লোড হয়নি। ইন্টারনেট সংযোগ দেখুন।"));

