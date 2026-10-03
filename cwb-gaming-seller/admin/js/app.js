// Platform admin shell: sign-in (password + 2FA; optional phone + SMS code for reviewer/viewer when the owner enables it), mandatory 2FA setup
// for Super Admin / Operations Manager, three-pane layout (menu · work area · "Needs attention" rail), hash router.
import { t, tx, lang, setLang, num } from "./i18n.js";
import { html, icon, api, $, $$, session, can, toast, errMsg, msg, showErrors, closeOverlays } from "./core.js";

const NAV = [
  { group: null, items: [
    ["dashboard", "dashboard", "dashboard.view"],
    ["orders", "orders", "orders.read"],
    ["applications", "staff", "sellers.read"],
    ["sellers", "customers", "sellers.read"],
    ["games", "categories", "catalog.read"],
    ["products", "products", "catalog.read"],
  ] },
  { group: "g_money", items: [
    ["payouts", "money", "payouts.read"],
    ["commission", "coupons", "commission.read"],
    ["reports", "reports", "reports.view"],
  ] },
  { group: "g_trust", items: [
    ["disputes", "alert", "disputes.read"],
    ["fraud", "staff", "fraud.read"],
    ["customers", "user", "customers.read"],
    ["reviews", "reviews", "reviews.read"],
    ["abandoned", "orders", "abandoned.read"],
  ] },
  { group: "g_system", items: [
    ["staff", "staff", "staff.read"],
    ["settings", "settings", "settings.read"],
    ["audit", "audit", "audit.view"],
    ["help", "help", null],
  ] },
];

const VIEWS = {
  dashboard: () => import("./views/dashboard.js"),
  orders: () => import("./views/orders.js"),
  applications: () => import("./views/sellers.js"),
  sellers: () => import("./views/sellers.js"),
  disputes: () => import("./views/disputes.js"),
  payouts: () => import("./views/payouts.js"),
  fraud: () => import("./views/fraud.js"),
  abandoned: () => import("./views/abandoned.js"),
  reports: () => import("./views/reports.js"),
  settings: () => import("./views/settings.js"),
  help: () => import("./views/help.js"),
  profile: () => import("./views/profile.js"),
  audit: () => import("./views/audit.js"),
  games: () => import("./views/resource.js"),
  products: () => import("./views/resource.js"),
  commission: () => import("./views/resource.js"),
  customers: () => import("./views/resource.js"),
  reviews: () => import("./views/resource.js"),
  staff: () => import("./views/resource.js"),
};

let brand = { name: { en: "CWB Gaming", bn: "সিডব্লিউবি গেমিং" }, logo: "img/logo.svg" };
let started = false;

async function boot() {
  setLang(lang());
  try {
    const cfg = await fetch("/api/config").then((r) => r.json());
    brand = { name: { en: cfg.store.name_en || cfg.brand.name.en, bn: cfg.store.name_bn || cfg.brand.name.bn }, logo: cfg.store.logo_url || "img/logo.svg" };
  } catch { /* keep defaults */ }
  session.brand = brand;
  try {
    const me = await api("/auth/me");
    session.admin = me.admin;
    session.perms = new Set(me.permissions);
    if (me.needs2fa) return twoFaSetup();
  } catch {
    return loginScreen();
  }
  start();
}

function start() {
  shell();
  if (!started) {
    started = true;
    window.addEventListener("hashchange", route);
    setInterval(loadRail, 60_000);
  }
  if (location.hash === "#/login" || !location.hash) location.hash = "#/dashboard";
  route();
}

const brandMark = () => html`<span class="brand-mark"><img src="${brand.logo}" alt=""></span>`;

async function loginScreen(error, mode = "password") {
  const phoneLogin = await api("/auth/options").then((r) => r.phoneLogin).catch(() => false);
  if (!phoneLogin) mode = "password";
  document.title = `${t("signInTitle")} — ${brand.name.en}`;
  $("#root").innerHTML = String(html`<div class="login-wrap"><form class="card login-card" id="login" novalidate>
    <div class="brand" style="padding:0 0 18px">${brandMark()}<span><b>${brand.name[lang()] ?? brand.name.en}</b><small class="muted">${t("signInTitle")}</small></span></div>
    ${mode === "password" ? html`
      <label class="field"><span>${t("loginId")}</span><input class="input" name="email" type="text" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" required></label>
      <label class="field"><span>${t("password")}</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
      <label class="field" id="totp-field" hidden><span>${t("code")}</span><input class="input otp-code" name="totp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>`
    : html`
      <label class="field"><span>${t("phone")}</span><input class="input" name="phone" inputmode="tel" placeholder="01XXXXXXXXX" required></label>
      <p><button class="btn sm" type="button" id="send-code">${t("sendCode")}</button></p>
      <label class="field"><span>${t("code")}</span><input class="input otp-code" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>`}
    ${error ? html`<p class="error-box">${error}</p>` : ""}
    <button class="btn primary" style="width:100%">${t("signIn")}</button>
    <p style="text-align:center;margin-top:14px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
      ${phoneLogin ? html`<button type="button" class="btn ghost sm" id="switch">${mode === "password" ? t("phoneLogin") : t("passwordLogin")}</button>` : ""}
      <button type="button" class="btn ghost sm" id="lang">${lang() === "bn" ? "English" : "বাংলা"}</button></p></form></div>`);
  $("#lang").onclick = () => { setLang(lang() === "bn" ? "en" : "bn"); loginScreen(null, mode); };
  if ($("#switch")) $("#switch").onclick = () => loginScreen(null, mode === "password" ? "phone" : "password");
  $("#send-code")?.addEventListener("click", async () => {
    try {
      const r = await api("/auth/otp/request", { method: "POST", body: { phone: $("#login").phone.value } });
      toast(msg(r) || t("otpSent"));
      if (r.devCode) toast(`Demo — no SMS is sent. Your code: ${r.devCode}`);
    } catch (e) { toast(errMsg(e), "err"); }
  });
  $("#login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = f.querySelector("button.primary");
    btn.disabled = true;
    btn.textContent = t("signingIn");
    try {
      const r = mode === "password"
        ? await api("/auth/login", { method: "POST", body: { email: f.email.value, password: f.password.value, totp: f.totp.value || undefined } })
        : await api("/auth/otp/verify", { method: "POST", body: { phone: f.phone.value, code: f.code.value } });
      session.admin = r.admin;
      session.perms = new Set(r.permissions);
      if (r.needs2fa) return twoFaSetup();
      start();
    } catch (err) {
      btn.disabled = false;
      btn.textContent = t("signIn");
      if (err.data?.code === "totp_required") {
        $("#totp-field").hidden = false;
        f.totp.focus();
        toast(err.message);
        return;
      }
      showErrors(f, err);
      toast(errMsg(err), "err");
    }
  });
}

/** First sign-in for Super Admin / Manager: nothing else works until two-step sign-in is set up. */
async function twoFaSetup() {
  let setup;
  try {
    setup = await api("/auth/2fa/setup", { method: "POST" });
  } catch (e) {
    return loginScreen(errMsg(e));
  }
  $("#root").innerHTML = String(html`<div class="login-wrap"><form class="card login-card" id="tfa">
    <div class="brand" style="padding:0 0 12px">${brandMark()}<span><b>${t("twoFaTitle")}</b><small class="muted">${session.admin.name}</small></span></div>
    <p>${t("twoFaSetup")}</p>
    <div class="qr" id="qr"></div>
    <p class="small muted">${t("twoFaKey")}: <b style="word-break:break-all">${setup.secret}</b><br><a href="${setup.otpauth}">otpauth://</a></p>
    <label class="field"><span>${t("code")}</span><input class="input otp-code" name="code" inputmode="numeric" maxlength="6" required autocomplete="one-time-code"></label>
    <button class="btn primary" style="width:100%">${t("confirm")}</button>
    <p style="text-align:center"><button class="btn ghost sm" type="button" id="out">${t("signOut")}</button></p></form></div>`);
  // Wire the form first: on a slow network the code may be typed before the QR library arrives.
  $("#out").onclick = async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); location.reload(); };
  $("#tfa").addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const r = await api("/auth/2fa/enable", { method: "POST", body: { code: e.target.code.value } });
      session.perms = new Set(r.permissions);
      toast(msg(r));
      start();
    } catch (err) { showErrors(e.target, err); toast(errMsg(err), "err"); }
  });
  // QR code (small MIT library from jsDelivr), loaded in the background; the typed key works without it.
  new Promise((res, rej) => { const s = document.createElement("script"); s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"; s.onload = res; s.onerror = rej; document.head.append(s); })
    .then(() => {
      const qr = window.qrcode(0, "M");
      qr.addData(setup.otpauth);
      qr.make();
      if ($("#qr")) $("#qr").innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 });
    })
    .catch(() => { if ($("#qr")) $("#qr").hidden = true; });
}

function shell() {
  const collapsed = localStorage.getItem("cwb_admin_collapsed") === "1";
  $("#root").innerHTML = String(html`<div class="shell ${collapsed ? "collapsed" : ""}" id="shell">
    <aside class="side" id="side" aria-label="Menu">
      <div class="brand">${brandMark()}<span class="brand-text"><b>${brand.name[lang()] ?? brand.name.en}</b><small>${tx("Platform admin", "প্ল্যাটফর্ম অ্যাডমিন")}</small></span></div>
      <nav class="nav" id="nav">${NAV.map((g) => html`${g.group ? html`<div class="nav-group">${t(g.group)}</div>` : ""}${g.items.filter(([, , p]) => !p || can(p)).map(([key, ico]) => html`<a href="#/${key}" data-key="${key}" title="${t(key)}">${icon(ico)}<span class="label">${t(key)}</span><span class="count" id="count-${key}" hidden></span></a>`)}`)}</nav>
      <div class="side-foot"><a class="btn sm ghost" href="../cwb-gaming/" target="_blank" style="width:100%;margin-bottom:8px">${icon("external")}<span class="label">${t("viewShop")}</span></a><button class="collapse-btn" id="collapse" type="button">${icon("chevrons")}<span class="label">${t("collapse")}</span></button></div>
    </aside>
    <main class="work" id="work">
      <div class="topbar"><button class="icon-btn menu-btn" id="menu" aria-label="Menu">${icon("menu")}</button><span class="title" id="page-title"></span>
        <button class="icon-btn only-narrow" id="rail-btn" aria-label="${t("notifications")}">${icon("bell")}<span class="dot" id="bell-dot-2" hidden></span></button></div>
      <div id="view"></div>
    </main>
    <aside class="rail" id="rail" aria-label="${t("notifications")}"></aside>
  </div>`);
  $("#collapse").onclick = () => {
    const s = $("#shell");
    s.classList.toggle("collapsed");
    localStorage.setItem("cwb_admin_collapsed", s.classList.contains("collapsed") ? "1" : "0");
  };
  const side = $("#side");
  const closeSide = () => { side.classList.remove("open"); $(".scrim")?.remove(); };
  $("#menu").onclick = () => { side.classList.add("open"); const s = document.createElement("div"); s.className = "scrim"; s.onclick = closeSide; document.body.append(s); };
  $("#nav").addEventListener("click", () => closeSide());
  $("#rail-btn").onclick = () => {
    const rail = $("#rail");
    rail.classList.toggle("drawer");
    if (rail.classList.contains("drawer")) { const s = document.createElement("div"); s.className = "scrim"; s.onclick = () => { rail.classList.remove("drawer"); s.remove(); }; document.body.append(s); }
    else $(".scrim")?.remove();
  };
  loadRail();
}

/** Right rail: who's signed in, and the "Needs your attention today" summary with links to each queue. */
async function loadRail() {
  const rail = $("#rail");
  if (!rail) return;
  const a = session.admin;
  const initials = a.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  let att = null;
  if (can("dashboard.view")) att = await api("/attention").catch(() => null);
  const links = { held: "#/orders?status=held", payments: "#/orders?awaiting_confirmation=1", overdue: "#/orders?overdue=1", applications: "#/applications", disputes: "#/disputes?status=awaiting_platform", payouts: "#/payouts?status=requested", fraud: "#/fraud", sellers_review: "#/sellers?standing=review" };
  rail.innerHTML = String(html`
    <div class="card" style="padding:14px">
      <div class="profile"><span class="avatar">${initials}</span><div style="min-width:0;flex:1"><b style="display:block;overflow:hidden;text-overflow:ellipsis">${a.name}</b><span class="muted small">${a.role.replace("_", " ")}</span></div>
        <div class="menu"><button class="icon-btn" id="pm" aria-haspopup="true" aria-expanded="false" aria-label="${t("profile")}">${icon("user")}</button>
          <div class="menu-list" id="pm-list" hidden><a href="#/profile">${icon("settings")} ${t("profile")}</a><button type="button" id="lang-sw">🌐 ${lang() === "bn" ? "English" : "বাংলা"}</button><button type="button" id="logout">${icon("logout")} ${t("signOut")}</button></div></div>
      </div></div>
    ${att ? html`<div class="card" style="padding:14px"><div class="card-title"><h3 style="margin:0">${t("notifications")}</h3><span class="pill ${att.total ? "pending" : "ok"}">${num(att.total)}</span></div>
      <div class="notif">${att.groups.filter((g) => g.items.length).map((g) => html`<a href="${links[g.key]}"><span class="ico" style="background:var(--k${g.key === "fraud" || g.key === "overdue" ? 5 : g.key === "payments" || g.key === "held" ? 3 : 1})">${icon("alert")}</span><span><b>${num(g.items.length)}</b> · ${lang() === "bn" ? g.bn : g.en}</span></a>`)}
      ${att.total ? "" : html`<span class="muted small">${tx("All clear. Nothing needs you right now.", "সব ঠিক আছে। এখন কিছু করার নেই।")}</span>`}</div></div>` : ""}`);
  ["#bell-dot-2"].forEach((id) => { const d = $(id); if (d) d.hidden = !att?.total; });
  const counts = { orders: att?.groups.filter((g) => ["held", "payments", "overdue"].includes(g.key)).reduce((s, g) => s + g.items.length, 0), applications: att?.groups.find((g) => g.key === "applications")?.items.length, disputes: att?.groups.find((g) => g.key === "disputes")?.items.length, payouts: att?.groups.find((g) => g.key === "payouts")?.items.length, fraud: att?.groups.find((g) => g.key === "fraud")?.items.length };
  for (const [k, n] of Object.entries(counts)) { const c = $(`#count-${k}`); if (c) { c.hidden = !n; c.textContent = num(n ?? 0); } }
  $("#pm").onclick = () => { const l = $("#pm-list"); l.hidden = !l.hidden; $("#pm").setAttribute("aria-expanded", String(!l.hidden)); };
  $("#logout").onclick = async () => { await api("/auth/logout", { method: "POST" }).catch(() => {}); location.hash = ""; location.reload(); };
  $("#lang-sw").onclick = () => { setLang(lang() === "bn" ? "en" : "bn"); shell(); route(); };
}
document.addEventListener("click", (e) => { if (!e.target.closest(".menu")) $("#pm-list")?.setAttribute("hidden", ""); });

async function route() {
  if (!session.admin || !$("#view")) return;
  closeOverlays();
  const [path, qs] = location.hash.replace(/^#\/?/, "").split("?");
  const [key = "dashboard", id] = (path || "dashboard").split("/");
  if (key === "login") { location.hash = "#/dashboard"; return; }
  const loader = VIEWS[key];
  $$("#nav a").forEach((a) => (a.dataset.key === key ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  const view = document.createElement("div");
  view.id = "view";
  $("#view").replaceWith(view);
  const title = t(key);
  $("#page-title").textContent = title;
  document.title = `${title} — ${brand.name.en} Admin`;
  if (!loader) { view.innerHTML = String(html`<div class="card state">404</div>`); return; }
  view.innerHTML = String(html`<div class="skel"></div><div class="skel"></div>`);
  try {
    const mod = await loader();
    await mod.default(view, { key, id, query: new URLSearchParams(qs ?? ""), refreshRail: loadRail });
  } catch (e) {
    console.error(e);
    view.innerHTML = String(html`<div class="card"><p class="error-box">${errMsg(e)}</p></div>`);
  }
  if (!view.isConnected) return;
  $("#work")?.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
}

export { toast, msg };
boot();
