// Storefront entry: layout chrome, client-side router, language + theme switching, tracking, PWA.
import { t, tx, lang, setLang, applyStatic, L } from "./i18n.js";
import { $, $$, html, icon, config, captureUtm, deviceId } from "./core.js";
import { initTracking, pageView } from "./track.js";

const routes = [
  [/^\/$/, () => import("./views/home.js")],
  [/^\/games$/, () => import("./views/games.js")],
  [/^\/game\/(?<slug>[a-z0-9-]+)$/, () => import("./views/game.js")],
  [/^\/topup\/(?<game>[a-z0-9-]+)\/(?<product>[a-z0-9-]+)$/, () => import("./views/topup.js")],
  [/^\/checkout$/, () => import("./views/checkout.js")],
  [/^\/order\/(?<orderNo>[A-Za-z0-9-]+)$/, () => import("./views/order.js")],
  [/^\/orders$/, () => import("./views/order.js"), "lookup"],
  [/^\/account(?:\/(?<tab>[a-z-]+))?$/, () => import("./views/account.js")],
  [/^\/store\/(?<slug>[a-z0-9-]+)$/, () => import("./views/store.js")],
  [/^\/sellers$/, () => import("./views/store.js"), "list"],
  [/^\/search$/, () => import("./views/search.js")],
  [/^\/(?<page>about|contact|how-it-works|sell)$/, () => import("./views/pages.js")],
  [/^\/policy\/(?<policy>refund|privacy|terms|seller-terms)$/, () => import("./views/pages.js")],
];

const main = document.getElementById("main");
let navToken = 0;

export function navigate(url, { replace = false } = {}) {
  const u = new URL(url, location.origin);
  if (u.origin !== location.origin) return (location.href = u.href);
  replace ? history.replaceState({}, "", u) : history.pushState({}, "", u);
  render();
}

async function render() {
  const token = ++navToken;
  const path = __shopDemo.virtual().pathname.replace(/\/+$/, "") || "/";
  const q = __shopDemo.virtual().searchParams;
  let match = null, loader = null, variant;
  for (const [re, load, v] of routes) {
    const m = path.match(re);
    if (m) { match = m; loader = load; variant = v; break; }
  }
  $$("#main-nav a, #bottom-nav a").forEach((a) => {
    const href = a.getAttribute("href");
    href === path || (href !== "/" && path.startsWith(href)) ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current");
  });
  try {
    const mod = loader ? await loader() : await import("./views/pages.js");
    if (token !== navToken) return;
    main.classList.remove("page-enter");
    void main.offsetWidth;
    main.classList.add("page-enter");
    await mod.default(main, { params: match?.groups ?? {}, query: q, variant, notFound: !loader, navigate });
  } catch (e) {
    console.error(e);
    main.innerHTML = String(html`<div class="container section"><div class="state"><p class="error-box">${t("somethingWrong")}</p><button class="btn" type="button" data-reload>${t("retry")}</button></div></div>`);
  }
  if (!location.hash) window.scrollTo({ top: 0 });
  pageView();
}

function chrome(cfg) {
  const store = cfg?.store ?? {};
  $("#main-nav").innerHTML = String(html`<a href="/games">${t("games")}</a><a href="/sellers">${t("sellers")}</a><a href="/how-it-works">${t("howItWorks")}</a><a href="/sell">${t("sell")}</a>`);
  $("#bottom-nav").innerHTML = String(html`<a href="/">${icon("home")}<span>${t("home")}</span></a><a href="/games">${icon("gamepad")}<span>${t("games")}</span></a>
    <a href="/orders">${icon("receipt")}<span>${t("orders")}</span></a><a href="/account">${icon("user")}<span>${t("account")}</span></a>`);
  const ann = L(store, "announcement");
  $("#announce").hidden = !ann;
  $("#announce").textContent = ann;
  if (store.logo_url) $("#logo-img").src = store.logo_url;
  $("#brand-name").textContent = L(store, "name") || cfg?.brand?.name?.en || "CWB Gaming";
  $("#brand-tagline").textContent = cfg?.brand ? (lang() === "bn" ? cfg.brand.tagline.bn : cfg.brand.tagline.en) : "";
  const social = [["facebook", store.facebook_url], ["youtube", store.youtube_url], ["discord", store.discord_url]].filter(([, u]) => u);
  $("#footer").innerHTML = String(html`<div class="container foot-grid">
    <div><b style="font:800 1.4rem var(--head);text-transform:uppercase">${L(store, "name")}</b>
      <p class="small muted">${tx("Game top-ups and redeem codes from KYC-verified sellers. Payment is confirmed by the gateway before anything is delivered — there is no Cash on Delivery.", "KYC যাচাইকৃত সেলারদের কাছ থেকে গেম টপ-আপ ও রিডিম কোড। গেটওয়ে পেমেন্ট নিশ্চিত করার আগে কিছু ডেলিভারি হয় না — ক্যাশ অন ডেলিভারি নেই।")}</p>
      <div class="row">${social.map(([k, u]) => html`<a class="icon-btn" href="${u}" target="_blank" rel="noopener" aria-label="${k}">${icon(k)}</a>`)}</div></div>
    <div><h4>${tx("Marketplace", "মার্কেটপ্লেস")}</h4><a href="/games">${t("games")}</a><a href="/sellers">${t("sellers")}</a><a href="/how-it-works">${t("howItWorks")}</a><a href="/orders">${tx("Find my order", "আমার অর্ডার খুঁজুন")}</a></div>
    <div><h4>${tx("Sellers", "সেলার")}</h4><a href="/sell">${t("sell")}</a><a href="../cwb-gaming-seller/index.html" target="_self">${tx("Seller dashboard", "সেলার ড্যাশবোর্ড")}</a><a href="/policy/seller-terms">${tx("Seller terms", "সেলার শর্তাবলী")}</a></div>
    <div><h4>${tx("Help", "সহায়তা")}</h4><a href="/contact">${tx("Contact", "যোগাযোগ")}</a><a href="/policy/refund">${tx("Refunds & disputes", "রিফান্ড ও বিরোধ")}</a><a href="/policy/terms">${tx("Terms", "শর্তাবলী")}</a><a href="/policy/privacy">${tx("Privacy", "গোপনীয়তা")}</a>
      <p class="small muted" style="margin-top:8px">${store.phone ?? ""}<br>${store.email ?? ""}<br>${L(store, "hours")}</p></div>
  </div><div class="container small muted" style="margin-top:22px;border-top:1px solid var(--line);padding-top:14px">© ${new Date().getFullYear()} ${L(store, "name")} · ${tx("Game names and marks belong to their publishers; we're an independent marketplace.", "গেমের নাম ও চিহ্ন তাদের প্রকাশকদের; আমরা একটি স্বাধীন মার্কেটপ্লেস।")}</div>`);
  $$(".lang-toggle button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang())));
  applyStatic();
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("#theme-btn use")?.setAttribute("href", theme === "dark" ? "#i-moon" : "#i-sun");
}

async function boot() {
  setLang(lang());
  let theme = "dark";
  try { theme = localStorage.getItem("cwb_theme") || "dark"; } catch { /* ignore */ }
  applyTheme(theme);
  captureUtm();
  deviceId();
  chrome(null);
  config().then(chrome).catch(() => {});

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-reload]")) return location.reload();
    const a = e.target.closest("a[href]");
    if (!a || a.target || a.hasAttribute("download") || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || u.pathname.startsWith("/api/") || u.pathname.startsWith("/admin") || u.pathname.startsWith("/seller/") || u.pathname === "/wa" || u.pathname.startsWith("/media/")) return;
    if (u.pathname === __shopDemo.virtual().pathname && u.search === __shopDemo.virtual().search && u.hash) return;
    e.preventDefault();
    navigate(u.href);
  });
  window.addEventListener("popstate", render);
  $$(".lang-toggle button").forEach((b) => b.addEventListener("click", () => { setLang(b.dataset.lang); config().then(chrome).catch(() => chrome(null)); render(); }));
  $("#theme-btn").addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("cwb_theme", next); } catch { /* ignore */ }
  });
  $("#search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = $("#search-input").value.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  });
  await render();
  initTracking().catch(() => {});
  if ("serviceWorker" in navigator && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") navigator.serviceWorker.register("/sw.js").catch(() => {});
}

boot();
