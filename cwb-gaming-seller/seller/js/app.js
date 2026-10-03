// Seller dashboard shell: sign-up / sign-in with mandatory two-factor, the KYC application (the only screen until a
// platform reviewer approves the seller), then Dashboard · Orders · Listings · Payouts · Reviews · Disputes · Settings.
// Reuses the admin toolkit (templating, toasts, slide-overs, tables) from /admin/js/.
import { tx, lang, setLang, num, dt } from "../../admin/js/i18n.js";
import { html, icon, $, $$, toast, showErrors, closeOverlays, pill } from "../../admin/js/core.js";

import { session, sapi, smsg, serr } from "./api.js";

const NAV = [
  ["dashboard", "dashboard", "Dashboard", "ড্যাশবোর্ড"],
  ["orders", "orders", "My orders", "আমার অর্ডার"],
  ["listings", "products", "My listings", "আমার লিস্টিং"],
  ["payouts", "money", "Payouts", "পেআউট"],
  ["reviews", "reviews", "Reviews", "রিভিউ"],
  ["disputes", "alert", "Disputes", "বিরোধ"],
  ["settings", "settings", "Settings", "সেটিংস"],
];

const brandMark = () => html`<span class="brand-mark"><img src="img/logo.svg" alt=""></span>`;
let started = false;

async function boot() {
  setLang(lang());
  try {
    const me = await sapi("/auth/me");
    session.seller = me.seller;
    if (me.needs2fa) return twoFa();
  } catch {
    return location.hash === "#/register" ? register() : login();
  }
  start();
}

async function start() {
  // The router needs the shell (and the seller's profile) in place first.
  await shell();
  if (!started) { started = true; window.addEventListener("hashchange", route); }
  route();
}

// ---------------------------------------------------------------- sign-in / sign-up / 2FA
function authCard(inner) {
  $("#root").innerHTML = String(html`<div class="login-wrap"><div class="card login-card">${inner}
    <p style="text-align:center;margin-top:12px"><button type="button" class="btn ghost sm" id="lang">${lang() === "bn" ? "English" : "বাংলা"}</button> <a class="btn ghost sm" href="../cwb-gaming/">${tx("Marketplace", "মার্কেটপ্লেস")}</a></p></div></div>`);
  $("#lang").onclick = () => { setLang(lang() === "bn" ? "en" : "bn"); boot(); };
}

function login() {
  authCard(html`<form id="lf" novalidate><div class="brand" style="padding:0 0 16px">${brandMark()}<span><b>${tx("Seller sign in", "সেলার সাইন ইন")}</b><small class="muted">CWB Gaming</small></span></div>
    <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="username" required></label>
    <label class="field"><span>${tx("Password", "পাসওয়ার্ড")}</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
    <label class="field" id="tf" hidden><span>${tx("6-digit code from your authenticator", "অথেন্টিকেটরের ৬ সংখ্যার কোড")}</span><input class="input otp-code" name="totp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>
    <button class="btn primary" style="width:100%">${tx("Sign in", "সাইন ইন")}</button>
    <p class="small" style="text-align:center;margin-top:12px">${tx("New seller?", "নতুন সেলার?")} <a href="#/register" id="to-reg">${tx("Apply to sell", "বিক্রির আবেদন করুন")}</a></p></form>`);
  $("#to-reg").onclick = (e) => { e.preventDefault(); location.hash = "#/register"; register(); };
  $("#lf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      const r = await sapi("/auth/login", { method: "POST", body: { email: f.email.value.trim(), password: f.password.value, totp: f.totp.value || undefined } });
      session.seller = r.seller;
      if (r.needs2fa) return twoFa();
      location.hash = "#/dashboard";
      start();
    } catch (err) {
      if (err.data?.code === "totp_required") { $("#tf").hidden = false; f.totp.focus(); return toast(err.message); }
      showErrors(f, err);
      toast(serr(err), "err");
    }
  });
}

function register() {
  authCard(html`<form id="rf" novalidate><div class="brand" style="padding:0 0 16px">${brandMark()}<span><b>${tx("Apply to sell", "বিক্রির আবেদন")}</b><small class="muted">${tx("Step 1 of 3: your account", "ধাপ ১/৩: আপনার অ্যাকাউন্ট")}</small></span></div>
    <label class="field"><span>${tx("Store name (shown to buyers)", "স্টোরের নাম (ক্রেতারা দেখবেন)")}</span><input class="input" name="store_name" required maxlength="60"></label>
    <label class="field"><span>${tx("Your full name (as on your ID)", "আপনার পূর্ণ নাম (পরিচয়পত্রের মতো)")}</span><input class="input" name="owner_name" required></label>
    <label class="field"><span>Email</span><input class="input" name="email" type="email" autocomplete="email" required></label>
    <label class="field"><span>${tx("Mobile number", "মোবাইল নম্বর")}</span><input class="input" name="phone" inputmode="tel" placeholder="01XXXXXXXXX" required></label>
    <label class="field"><span>${tx("Password (10+ characters)", "পাসওয়ার্ড (১০+ অক্ষর)")}</span><input class="input" name="password" type="password" autocomplete="new-password" minlength="10" required></label>
    <label class="check"><input type="checkbox" name="acceptTerms" required> <span>${tx("I accept the", "আমি গ্রহণ করছি")} <a href="../cwb-gaming/#/policy/seller-terms" target="_blank">${tx("seller terms", "সেলার শর্তাবলী")}</a>.</span></label>
    <button class="btn primary" style="width:100%;margin-top:12px">${tx("Create seller account", "সেলার অ্যাকাউন্ট খুলুন")}</button>
    <p class="small" style="text-align:center;margin-top:12px"><a href="#/login" id="to-login">${tx("I already have an account", "আমার অ্যাকাউন্ট আছে")}</a></p></form>`);
  $("#to-login").onclick = (e) => { e.preventDefault(); location.hash = "#/login"; login(); };
  $("#rf").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      const r = await sapi("/auth/register", { method: "POST", body: { store_name: f.store_name.value.trim(), owner_name: f.owner_name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(), password: f.password.value, acceptTerms: f.acceptTerms.checked } });
      session.seller = r.seller;
      twoFa();
    } catch (err) { showErrors(f, err); toast(serr(err), "err"); }
  });
}

/** Two-factor is mandatory for sellers: nothing else works until it's on. */
async function twoFa() {
  let s;
  try { s = await sapi("/auth/2fa/setup", { method: "POST" }); } catch (e) { return login(); }
  authCard(html`<form id="tfa"><div class="brand" style="padding:0 0 12px">${brandMark()}<span><b>${tx("Turn on two-step sign-in", "দুই-ধাপের সাইন-ইন চালু করুন")}</b><small class="muted">${tx("Required for every seller", "প্রতিটি সেলারের জন্য বাধ্যতামূলক")}</small></span></div>
    <p class="small">${tx("Scan the QR code with Google Authenticator, Microsoft Authenticator or Authy, then type the 6-digit code.", "Google Authenticator, Microsoft Authenticator বা Authy দিয়ে QR কোড স্ক্যান করে ৬ সংখ্যার কোড লিখুন।")}</p>
    <div class="qr" id="qr"></div><p class="small muted">${tx("Key", "কী")}: <b style="word-break:break-all">${s.secret}</b></p>
    <label class="field"><span>${tx("6-digit code", "৬ সংখ্যার কোড")}</span><input class="input otp-code" name="code" inputmode="numeric" maxlength="6" required autocomplete="one-time-code"></label>
    <button class="btn primary" style="width:100%">${tx("Confirm", "নিশ্চিত করুন")}</button>
    <p style="text-align:center"><button class="btn ghost sm" type="button" id="out">${tx("Sign out", "সাইন আউট")}</button></p></form>`);
  $("#out").onclick = async () => { await sapi("/auth/logout", { method: "POST" }).catch(() => {}); location.reload(); };
  $("#tfa").addEventListener("submit", async (e) => {
    e.preventDefault();
    try { toast(smsg(await sapi("/auth/2fa/enable", { method: "POST", body: { code: e.target.code.value } }))); location.hash = "#/dashboard"; boot(); }
    catch (err) { showErrors(e.target, err); toast(serr(err), "err"); }
  });
  new Promise((res, rej) => { const sc = document.createElement("script"); sc.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"; sc.onload = res; sc.onerror = rej; document.head.append(sc); })
    .then(() => { const qr = window.qrcode(0, "M"); qr.addData(s.otpauth); qr.make(); if ($("#qr")) $("#qr").innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2 }); })
    .catch(() => { if ($("#qr")) $("#qr").hidden = true; });
}

// ---------------------------------------------------------------- shell & router
async function shell() {
  const me = await sapi("/auth/me");
  session.profile = me.seller;
  const p = me.seller;
  const approved = p.status === "approved";
  $("#root").innerHTML = String(html`<div class="shell" id="shell">
    <aside class="side" id="side" aria-label="Menu">
      <div class="brand">${brandMark()}<span class="brand-text"><b>${p.store_name}</b><small>${p.code} · ${tx("Seller", "সেলার")}</small></span></div>
      <nav class="nav" id="nav">${approved
        ? NAV.map(([k, ico, en, bn]) => html`<a href="#/${k}" data-key="${k}">${icon(ico)}<span class="label">${tx(en, bn)}</span><span class="count" id="count-${k}" hidden></span></a>`)
        : html`<a href="#/application" data-key="application">${icon("staff")}<span class="label">${tx("Application", "আবেদন")}</span></a><a href="#/settings" data-key="settings">${icon("settings")}<span class="label">${tx("Settings", "সেটিংস")}</span></a>`}</nav>
      <div class="side-foot"><a class="btn sm ghost" href="../cwb-gaming/#/store/${p.slug}" target="_blank" style="width:100%;margin-bottom:8px">${icon("external")}<span class="label">${tx("My public store", "আমার পাবলিক স্টোর")}</span></a>
        <button class="btn sm ghost" id="lang-sw" style="width:100%;margin-bottom:8px">🌐 ${lang() === "bn" ? "English" : "বাংলা"}</button>
        <button class="btn sm ghost" id="logout" style="width:100%">${icon("logout")}<span class="label">${tx("Sign out", "সাইন আউট")}</span></button></div>
    </aside>
    <main class="work" id="work"><div class="topbar"><button class="icon-btn menu-btn" id="menu" aria-label="Menu">${icon("menu")}</button><span class="title" id="page-title"></span>
      ${approved ? html`<span>${pill(p.standing, `${p.standing_badge.icon} ${tx(p.standing_badge.en, p.standing_badge.bn)}`)}${p.is_verified ? html` ${pill("ok", tx("Verified Seller", "ভেরিফায়েড সেলার"))}` : ""}</span>` : pill(p.status)}</div><div id="view"></div></main>
  </div>`);
  $("#logout").onclick = async () => { await sapi("/auth/logout", { method: "POST" }).catch(() => {}); location.hash = ""; location.reload(); };
  $("#lang-sw").onclick = () => { setLang(lang() === "bn" ? "en" : "bn"); start(); };
  const side = $("#side");
  $("#menu").onclick = () => { side.classList.add("open"); const s = document.createElement("div"); s.className = "scrim"; s.onclick = () => { side.classList.remove("open"); s.remove(); }; document.body.append(s); };
  $("#nav").addEventListener("click", () => { side.classList.remove("open"); $(".scrim")?.remove(); });
}

async function route() {
  if (!session.profile || !$("#view")) return;
  closeOverlays();
  const [path, qs] = location.hash.replace(/^#\/?/, "").split("?");
  const approved = session.profile.status === "approved";
  let key = (path || "").split("/")[0] || (approved ? "dashboard" : "application");
  if (!approved && key !== "settings") key = "application";
  if (approved && key === "application") key = "dashboard";
  $$("#nav a").forEach((a) => (a.dataset.key === key ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current")));
  const view = document.createElement("div");
  view.id = "view";
  $("#view").replaceWith(view);
  const title = NAV.find((n) => n[0] === key);
  $("#page-title").textContent = title ? tx(title[2], title[3]) : tx("Application", "আবেদন");
  document.title = `${$("#page-title").textContent} — CWB Gaming Seller`;
  view.innerHTML = String(html`<div class="skel"></div><div class="skel"></div>`);
  try {
    if (key === "application") await application(view);
    else {
      const mod = await import("./pages.js");
      await mod[key](view, new URLSearchParams(qs ?? ""));
    }
  } catch (e) {
    console.error(e);
    if (e?.data?.code === "kyc_pending" || e?.data?.code === "seller_suspended") { await shell(); location.hash = "#/application"; return; }
    view.innerHTML = String(html`<div class="card"><p class="error-box">${serr(e)}</p></div>`);
  }
}

// ---------------------------------------------------------------- application (KYC) — the gate before selling
const DOCS = [["id_front", "ID — front", "পরিচয়পত্র — সামনে"], ["id_back", "ID — back", "পরিচয়পত্র — পেছনে"], ["selfie", "Selfie holding your ID", "পরিচয়পত্র হাতে সেলফি"], ["trade_licence", "Trade licence (if any)", "ট্রেড লাইসেন্স (যদি থাকে)"]];

async function application(view) {
  const [a, me] = await Promise.all([sapi("/application"), sapi("/auth/me")]);
  const p = me.seller;
  const banner = {
    draft: ["Complete the checklist and submit your application.", "চেকলিস্ট পূরণ করে আবেদন জমা দিন।", "pending"],
    submitted: ["Application pending — our team is reviewing your documents. You'll get an SMS and email with the decision. Selling opens once you're approved.", "আবেদন অপেক্ষমাণ — আমাদের টিম আপনার ডকুমেন্ট যাচাই করছে। সিদ্ধান্ত SMS ও ইমেইলে জানানো হবে। অনুমোদনের পর বিক্রি শুরু করতে পারবেন।", "submitted"],
    info_requested: ["We need a bit more information — see the note below, update your details and submit again.", "আরও কিছু তথ্য দরকার — নিচের নোট দেখে তথ্য আপডেট করে আবার জমা দিন।", "pending"],
    rejected: ["Your application wasn't approved.", "আপনার আবেদন অনুমোদিত হয়নি।", "rejected"],
    suspended: ["Your seller account is suspended. Listings are offline. Contact the platform team.", "আপনার সেলার অ্যাকাউন্ট স্থগিত। লিস্টিং বন্ধ। প্ল্যাটফর্ম টিমের সাথে যোগাযোগ করুন।", "rejected"],
  }[a.status] ?? ["", "", "pending"];
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("Seller application", "সেলার আবেদন")}</h1>${pill(banner[2], a.status.replace("_", " "))}</div>
    <div class="card" style="margin-bottom:16px;border-color:var(--warn)" data-testid="application-status"><b>${tx(banner[0], banner[1])}</b>${a.review_note ? html`<p style="margin:8px 0 0">${tx("Note from our team", "আমাদের টিমের নোট")}: <b>${a.review_note}</b></p>` : ""}</div>
    <div class="split">
      <section class="card onboard"><h2>${tx("Checklist", "চেকলিস্ট")}</h2><ol>${a.checklist.map((c, i) => html`<li class="${c.done ? "done" : ""}"><span class="tick">${c.done ? "✓" : num(i + 1)}</span><span>${tx(c.en, c.bn)}</span></li>`)}</ol>
        ${a.editable ? html`<button class="btn primary" id="submit" style="margin-top:14px;width:100%">${tx("Submit for review", "যাচাইয়ের জন্য জমা দিন")}</button>` : ""}</section>
      <section class="card"><h2>${tx("Phone verification", "ফোন যাচাই")}</h2>
        ${p.phone_verified_at ? html`<p>✓ ${p.phone}</p>` : html`<p class="small">${p.phone}</p><div class="toolbar"><button class="btn sm" id="send-otp">${tx("Send code", "কোড পাঠান")}</button><input class="input otp-code" id="otp" inputmode="numeric" maxlength="6" placeholder="000000" style="max-width:140px"><button class="btn sm primary" id="verify-otp">${tx("Verify", "যাচাই")}</button></div>`}
        <h2 style="margin-top:18px">${tx("Documents", "ডকুমেন্ট")}</h2><p class="small muted">${tx("JPG, PNG, WebP or PDF up to 5 MB. Stored privately — only our review team can open them.", "JPG, PNG, WebP বা PDF, সর্বোচ্চ ৫ MB। গোপনে রাখা হয় — শুধু আমাদের রিভিউ টিম খুলতে পারে।")}</p>
        ${DOCS.map(([k, en, bn]) => {
          const doc = a.documents.filter((d) => d.kind === k);
          return html`<div class="att-row"><span class="att-main">${tx(en, bn)} ${doc.length ? html`<span class="pill ok">✓ ${dt(doc.at(-1).uploaded_at)}</span>` : ""}</span>
            ${doc.length && a.editable ? html`<button class="btn sm ghost" data-deldoc="${doc.at(-1).id}">${icon("trash")}</button>` : ""}
            ${a.editable ? html`<label class="btn sm">${icon("upload")} ${tx("Upload", "আপলোড")}<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" data-kind="${k}" hidden></label>` : ""}</div>`;
        })}</section>
    </div>
    <form class="card" id="kyc" style="margin-top:16px"><h2>${tx("Business, ID and payout details", "ব্যবসা, পরিচয়পত্র ও পেআউটের তথ্য")}</h2>
      <fieldset ${a.editable ? "" : "disabled"} style="border:0;padding:0;margin:0"><div class="grid2">
        <label class="field"><span>${tx("Business name (optional)", "ব্যবসার নাম (ঐচ্ছিক)")}</span><input class="input" name="business_name" value="${p.business_name ?? ""}"></label>
        <label class="field"><span>${tx("Address", "ঠিকানা")}</span><input class="input" name="business_address" value="${p.business_address ?? ""}" required></label>
        <label class="field"><span>${tx("ID type", "পরিচয়পত্রের ধরন")}</span><select class="input" name="id_doc_type">${[["nid", "NID", "জাতীয় পরিচয়পত্র"], ["passport", "Passport", "পাসপোর্ট"], ["driving_licence", "Driving licence", "ড্রাইভিং লাইসেন্স"]].map(([v, en, bn]) => html`<option value="${v}" ${p.id_doc_type === v ? "selected" : ""}>${tx(en, bn)}</option>`)}</select></label>
        <label class="field"><span>${tx("ID number (we keep only the last 4)", "পরিচয়পত্র নম্বর (শুধু শেষ ৪টি রাখা হয়)")}</span><input class="input" name="id_doc_number" placeholder="${p.id_doc_number_last4 ? `…${p.id_doc_number_last4}` : ""}" ${p.id_doc_number_last4 ? "" : "required"}></label>
        <label class="field"><span>${tx("Payout method", "পেআউট পদ্ধতি")}</span><select class="input" name="payout_method">${["bkash", "nagad", "rocket", "bank"].map((m) => html`<option ${p.payout_method === m ? "selected" : ""}>${m}</option>`)}</select></label>
        <label class="field"><span>${tx("Account holder name", "অ্যাকাউন্টধারীর নাম")}</span><input class="input" name="payout_account_name" value="${p.payout_account_name ?? ""}" required></label>
        <label class="field"><span>${tx("Account / wallet number", "অ্যাকাউন্ট / ওয়ালেট নম্বর")}</span><input class="input" name="payout_account_number" required></label>
        <label class="field"><span>${tx("Bank & branch (for bank)", "ব্যাংক ও শাখা (ব্যাংকের জন্য)")}</span><input class="input" name="payout_bank_name" value="${p.payout_bank_name ?? ""}"></label>
      </div>${a.editable ? html`<button class="btn primary">${tx("Save details", "তথ্য সংরক্ষণ")}</button>` : ""}</fieldset></form>
    ${a.events.length ? html`<section class="card" style="margin-top:16px"><h2>${tx("Timeline", "সময়রেখা")}</h2>${a.events.map((e) => html`<div class="small">${dt(e.created_at, true)} · <b>${e.event}</b> ${e.note ?? ""}</div>`)}</section>` : ""}`);

  const refresh = () => application(view).catch((e) => toast(serr(e), "err"));
  $("#kyc", view).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      toast(smsg(await sapi("/application", { method: "PUT", body: { business_name: f.business_name.value.trim() || null, business_address: f.business_address.value.trim(), id_doc_type: f.id_doc_type.value, id_doc_number: f.id_doc_number.value.trim() || `XXXXXX${p.id_doc_number_last4 ?? ""}`, payout_method: f.payout_method.value, payout_account_name: f.payout_account_name.value.trim(), payout_account_number: f.payout_account_number.value.trim(), payout_bank_name: f.payout_bank_name.value.trim() || null, payout_branch: null } })));
      refresh();
    } catch (err) { showErrors(f, err); toast(serr(err), "err"); }
  });
  view.addEventListener("change", async (e) => {
    const inp = e.target.closest("[data-kind]");
    if (!inp?.files?.[0]) return;
    const fd = new FormData();
    fd.append("kind", inp.dataset.kind);
    fd.append("file", inp.files[0]);
    try { toast(tx("Uploading…", "আপলোড হচ্ছে…")); toast(smsg(await sapi("/application/documents", { method: "POST", raw: fd }))); refresh(); } catch (err) { toast(serr(err), "err"); }
  });
  view.addEventListener("click", async (e) => {
    const del = e.target.closest("[data-deldoc]");
    try {
      if (del) { await sapi(`/application/documents/${del.dataset.deldoc}`, { method: "DELETE" }); refresh(); }
      if (e.target.closest("#send-otp")) { const r = await sapi("/application/phone/send", { method: "POST" }); toast(r.devCode ? `Demo — no SMS is sent. Your code: ${r.devCode}` : tx("Code sent.", "কোড পাঠানো হয়েছে।")); }
      if (e.target.closest("#verify-otp")) { await sapi("/application/phone/verify", { method: "POST", body: { code: $("#otp", view).value.trim() } }); refresh(); }
      if (e.target.closest("#submit")) { toast(smsg(await sapi("/application/submit", { method: "POST" }))); refresh(); }
    } catch (err) {
      if (err.data?.fields?.length) toast(err.data.fields.map((f) => f[lang()] ?? f.en).join(" · "), "err");
      else toast(serr(err), "err");
    }
  });
}

boot();
