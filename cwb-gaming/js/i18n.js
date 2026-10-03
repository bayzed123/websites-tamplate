// Bangla / English. Static chrome strings live in STR; views mostly use tx(en, bn) inline so each sentence is
// written once, in both languages, right where it's shown.
const STR = {
  bn: {
    skipToContent: "মূল অংশে যান", search: "খুঁজুন", searchPlaceholder: "গেম, প্যাক বা সেলার খুঁজুন…", account: "অ্যাকাউন্ট", theme: "থিম পরিবর্তন",
    chatWhatsApp: "WhatsApp এ কথা বলুন", home: "হোম", games: "গেম", sellers: "সেলার", howItWorks: "কীভাবে কাজ করে", sell: "সেলার হোন", orders: "অর্ডার",
    somethingWrong: "কিছু একটা সমস্যা হয়েছে।", retry: "আবার চেষ্টা করুন", cancel: "বাতিল", close: "বন্ধ", loading: "লোড হচ্ছে…", notFound: "পেজটি পাওয়া যায়নি",
    copied: "কপি হয়েছে", copy: "কপি",
  },
  en: {
    skipToContent: "Skip to content", search: "Search", searchPlaceholder: "Search games, packs or sellers…", account: "Account", theme: "Switch theme",
    chatWhatsApp: "Chat on WhatsApp", home: "Home", games: "Games", sellers: "Sellers", howItWorks: "How it works", sell: "Sell on CWB", orders: "Orders",
    somethingWrong: "Something went wrong.", retry: "Try again", cancel: "Cancel", close: "Close", loading: "Loading…", notFound: "Page not found",
    copied: "Copied", copy: "Copy",
  },
};

const KEY = "cwb_lang";
export function lang() {
  try {
    const q = __shopDemo.virtual().searchParams.get("lang");
    if (q === "en" || q === "bn") return q;
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "bn") return v;
  } catch { /* storage blocked */ }
  return document.documentElement.getAttribute("data-default-lang") === "en" ? "en" : "bn";
}
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  document.cookie = `cwb_lang=${l}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = l;
}
export function t(key, vars = {}) {
  const s = STR[lang()][key] ?? STR.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
/** Inline bilingual text: tx("Pay now", "এখন পেমেন্ট করুন"). */
export const tx = (en, bn) => (lang() === "bn" ? bn : en);
/** Picks the bilingual field: L(game, "name") → game.name_bn / name_en. */
export const L = (obj, field) => (obj ? (lang() === "bn" ? obj[`${field}_bn`] || obj[`${field}_en`] : obj[`${field}_en`] || obj[`${field}_bn`]) ?? "" : "");
/** Picks from {en, bn}. */
export const tt = (o) => (o ? (lang() === "bn" ? o.bn || o.en : o.en || o.bn) : "");

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const digits = (s) => (lang() === "bn" ? String(s).replace(/\d/g, (d) => BN_DIGITS[d]) : String(s));
export const num = (n) => digits(Number(n ?? 0).toLocaleString("en-IN"));
export const money = (n) => `৳${num(n)}`;
export const date = (iso) => (iso ? new Date(iso).toLocaleDateString(lang() === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");
export const dateTime = (iso) => (iso ? new Date(iso).toLocaleString(lang() === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "");
/** "about 12 min" / "instant". */
export const eta = (minutes, instant) => (instant ? tx("Instant", "সাথে সাথে") : tx(`~${minutes} min`, `~${digits(minutes)} মিনিট`));

export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder)));
  root.querySelectorAll("[data-i18n-label]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nLabel)));
}
