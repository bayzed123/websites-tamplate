// Customer account: sign in / register / reset (mobile number), orders with tracking, "my routine" (what they already
// use, by routine step, with one-tap reorder), studio bookings, wishlist, saved addresses, returns, refer-a-friend, profile.
import { t, L, lang, money, num, date } from "../i18n.js";
import { $, $$, api, html, icon, raw, errMsg, toast, me, wishlist, bindGeo, showFieldErrors, overlay, turnstile, config } from "../core.js";
import { productGrid, bindCards, emptyState, productCard, addToCart } from "../ui.js";

const TABS = ["orders", "routine", "bookings", "wishlist", "addresses", "returns", "referral", "profile"];
const TAB_LABEL = { orders: "myOrders", routine: "myRoutine", bookings: "myBookings" };

export default async function account(el, { params, query, navigate }) {
  const tab = TABS.includes(params.tab) ? params.tab : "orders";
  const who = await me(true);
  if (!who && tab !== "wishlist") return authForms(el, { query, navigate });
  el.innerHTML = String(html`<div class="container section">
    <div class="account-head"><h1>${who ? (lang() === "bn" ? `আসসালামু আলাইকুম, ${who.name.split(" ")[0]}` : `Hello, ${who.name.split(" ")[0]}`) : t("wishlist")}</h1>
      ${who ? html`<button class="btn ghost sm" type="button" id="logout">${t("signOut")}</button>` : ""}</div>
    ${who ? html`<nav class="tabs" aria-label="${t("account")}">${TABS.map((k) => html`<a href="/account/${k}" ${k === tab ? raw('aria-current="page"') : ""}>${t(TAB_LABEL[k] ?? k)}</a>`)}</nav>` : ""}
    <div id="tab" class="tab-body"><div class="skel line"></div></div></div>`);
  $("#logout", el)?.addEventListener("click", async () => { await api("/auth/logout", { method: "POST" }); await me(true); navigate("/"); });
  const body = $("#tab", el);
  try {
    await ({ orders, routine, bookings, wishlist: wishlistTab, addresses, returns, referral, profile })[tab](body, { who, query, navigate });
  } catch (e) {
    body.innerHTML = String(html`<p class="error-box">${errMsg(e)}</p>`);
  }
}

// ---------------------------------------------------------------- auth
async function authForms(el, { query, navigate }) {
  let mode = query.get("mode") ?? "login";
  const next = query.get("next") || "/account";
  const draw = async () => {
    el.innerHTML = String(html`<div class="container section narrow"><div class="card pad auth">
      <h1>${mode === "register" ? t("register") : mode === "reset" ? t("resetPassword") : t("signIn")}</h1>
      <form id="auth" class="stack" novalidate>
        ${mode === "register" ? html`<label class="field"><span>${t("fullName")}</span><input class="input" name="name" required autocomplete="name"></label>` : ""}
        <label class="field"><span>${t("mobile")}</span><input class="input" name="phone" required inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX"></label>
        ${mode === "reset" ? html`<div class="row"><button class="btn" type="button" id="send-code">${t("sendCode")}</button></div><label class="field"><span>${t("code")}</span><input class="input" name="code" inputmode="numeric" maxlength="6"></label>` : ""}
        <label class="field"><span>${mode === "reset" ? t("newPassword") : t("password")}</span><input class="input" name="password" type="password" required minlength="${mode === "login" ? 1 : 8}" autocomplete="${mode === "login" ? "current-password" : "new-password"}"></label>
        <div id="ts"></div>
        <button class="btn primary block" type="submit">${mode === "register" ? t("register") : mode === "reset" ? t("save") : t("signIn")}</button>
      </form>
      <p class="center small">${mode === "login" ? html`<a href="?mode=register" data-mode="register">${t("newHere")}</a> · <a href="?mode=reset" data-mode="reset">${t("forgotPassword")}</a>` : html`<a href="?mode=login" data-mode="login">${t("haveAccount")}</a>`}</p>
    </div></div>`);
    $$("[data-mode]", el).forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); mode = a.dataset.mode; draw(); }));
    const getToken = mode === "reset" ? async () => undefined : await turnstile($("#ts", el));
    const f = $("#auth", el);
    $("#send-code", el)?.addEventListener("click", async () => {
      try {
        const r = await api("/auth/reset/request", { method: "POST", body: { phone: f.phone.value, lang: lang() } });
        toast(r[lang()] ?? r.en);
        if (r.devCode) toast(`Demo — no SMS is sent. Your code: ${r.devCode}`, "info", 8000);
      } catch (e) { showFieldErrors(f, e); toast(errMsg(e), "error"); }
    });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        if (mode === "reset") {
          const r = await api("/auth/reset/confirm", { method: "POST", body: { phone: f.phone.value, code: f.code.value, password: f.password.value } });
          toast(r[lang()] ?? r.en);
          mode = "login";
          return draw();
        }
        await api(`/auth/${mode === "register" ? "register" : "login"}`, { method: "POST", body: { name: f.name?.value, phone: f.phone.value, password: f.password.value, turnstileToken: await getToken() } });
        await me(true);
        await wishlist.sync();
        navigate(next);
      } catch (err) { showFieldErrors(f, err); toast(errMsg(err), "error"); }
    });
  };
  draw();
}

// ---------------------------------------------------------------- tabs
async function orders(body) {
  const { orders } = await api("/me/orders");
  if (!orders.length) { body.innerHTML = String(emptyState(t("noOrders"), "", html`<a class="btn primary" href="/shop">${t("shop")}</a>`)); return; }
  body.innerHTML = String(html`<div class="order-list">${orders.map((o) => html`<a class="card pad order-row" href="/order/${o.order_no}?token=${o.public_token}">
    <img src="${o.image}" alt="" width="56" height="56"><div><b>${o.order_no}</b><div class="muted small">${date(o.created_at)} · ${num(o.item_count)} ${lang() === "bn" ? "টি পণ্য" : "items"}${o.invoice_no ? ` · ${o.invoice_no}` : ""}</div></div>
    <div class="right"><b>${money(o.total)}</b><span class="pill ${o.status}">${t(`status_${o.status}`)}</span>${o.return_status ? html`<span class="pill">${t("returns")}: ${o.return_status}</span>` : ""}</div></a>`)}</div>`);
}

async function wishlistTab(body) {
  const ids = [...wishlist.ids()];
  if (!ids.length) { body.innerHTML = String(emptyState(t("wishlist"), lang() === "bn" ? "পছন্দের পণ্যে ♡ চাপুন।" : "Tap ♡ on anything you love.")); return; }
  const r = await api(`/products?ids=${ids.join(",")}&limit=48`);
  body.innerHTML = String(productGrid(r.items));
  bindCards(body);
}

async function addresses(body) {
  const { addresses } = await api("/me/addresses");
  body.innerHTML = String(html`<div class="grid cards">${addresses.map((a) => html`<div class="card pad"><b>${a.label}</b>${a.is_default ? html` <span class="pill active">${t("defaultTag")}</span>` : ""}<p>${a.recipient_name} · ${a.phone}<br>${a.area}, ${a.upazila}, ${a.district}</p>
    <button class="btn sm" type="button" data-edit="${a.id}">${t("edit")}</button> <button class="btn sm ghost" type="button" data-del="${a.id}">${t("delete")}</button></div>`)}
    <button class="card pad add-card" type="button" id="add-addr">${icon("plus")} ${t("addNew")}</button></div>`);
  const edit = (a = {}) => {
    const { panel, close } = overlay("modal", {
      title: a.id ? t("edit") : t("addNew"),
      body: html`<form class="stack" id="addr">
        <div class="form-grid"><label class="field"><span>${t("label")}</span><input class="input" name="label" value="${a.label ?? "Home"}"></label>
        <label class="field"><span>${t("recipient")}</span><input class="input" name="recipient_name" required value="${a.recipient_name ?? ""}"></label>
        <label class="field span2"><span>${t("mobile")}</span><input class="input" name="phone" required inputmode="tel" value="${a.phone ?? ""}"></label></div>
        <div class="form-grid three"><label class="field"><span>${t("division")}</span><select class="input" name="division_id" required></select></label>
        <label class="field"><span>${t("district")}</span><select class="input" name="district_id" required></select></label>
        <label class="field"><span>${t("upazila")}</span><select class="input" name="upazila_id" required></select></label></div>
        <label class="field"><span>${t("area")}</span><textarea class="input" name="area" required rows="2">${a.area ?? ""}</textarea></label>
        <label class="check"><input type="checkbox" name="is_default" ${a.is_default ? raw("checked") : ""}> ${t("makeDefault")}</label>
        <button class="btn primary block" type="submit">${t("save")}</button></form>`,
    });
    const f = $("#addr", panel);
    let geoSel = null;
    bindGeo(f, a, (g) => (geoSel = g));
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        await api(a.id ? `/me/addresses/${a.id}` : "/me/addresses", { method: a.id ? "PUT" : "POST", body: { ...(geoSel ?? {}), label: f.label.value, recipient_name: f.recipient_name.value, phone: f.phone.value, area: f.area.value, is_default: f.is_default.checked } });
        toast(t("saved"));
        close();
        addresses(body);
      } catch (err) { showFieldErrors(f, err); toast(errMsg(err), "error"); }
    });
  };
  $("#add-addr", body).addEventListener("click", () => edit());
  $$("[data-edit]", body).forEach((b) => b.addEventListener("click", () => edit(addresses.find((x) => x.id === +b.dataset.edit))));
  $$("[data-del]", body).forEach((b) => b.addEventListener("click", async () => {
    if (!confirm(lang() === "bn" ? "ঠিকানাটি মুছবেন?" : "Delete this address?")) return;
    try { await api(`/me/addresses/${b.dataset.del}`, { method: "DELETE" }); addresses(body); } catch (e) { toast(errMsg(e), "error"); }
  }));
}

async function routine(body) {
  const { items } = await api("/me/routine");
  if (!items.length) { body.innerHTML = String(emptyState(t("myRoutine"), t("noRoutine"), html`<a class="btn primary" href="/skin-quiz">${t("findGift")}</a>`)); return; }
  body.innerHTML = String(html`<p class="muted">${t("myRoutineSub")}</p>
    <ol class="routine-steps">${items.map((p) => html`<li><span class="step-no">${t(`routineStep_${p.routine_step}`)}</span>${productCard(p)}
      <div class="routine-meta small muted">${t("lastOrdered", { d: date(p.last_ordered) })}${p.in_stock && p.variant_id ? html` · <button class="link-btn" type="button" data-reorder="${p.slug}" data-variant="${p.variant_id}">${icon("bag")} ${t("reorder")}</button>` : ""}</div></li>`)}</ol>
    <p class="patch-note small">${icon("sparkle")} <span>${lang() === "bn" ? "রুটিনে নতুন কিছু যোগ করতে চান?" : "Want to add a step?"} <a href="/skin-quiz">${t("findGift")}</a></span></p>`);
  bindCards(body);
  $$("[data-reorder]", body).forEach((b) => b.addEventListener("click", async () => {
    const d = await api(`/products/${b.dataset.reorder}`).catch(() => null);
    const v = d?.variants.find((x) => x.id === Number(b.dataset.variant) && x.stock > 0) ?? d?.variants.find((x) => x.stock > 0);
    if (v) addToCart(d.product, v, 1);
  }));
}

async function bookings(body) {
  const { bookings: list } = await api("/me/bookings");
  if (!list.length) { body.innerHTML = String(emptyState(t("noBookings"), "", html`<a class="btn primary" href="/treatments">${t("treatments")}</a>`)); return; }
  body.innerHTML = String(html`<div class="order-list">${list.map((b) => html`<a class="card pad order-row" href="/booking/${b.booking_no}?token=${b.public_token}">
    <img src="${b.image_url ?? "img/logo.svg"}" alt="" width="56" height="56"><div><b>${b.treatment_name}</b><div class="muted small">${b.booking_no} · ${date(b.booking_date)} · ${b.start_time}</div></div>
    <div class="right"><b>${money(b.price)}</b><span class="pill ${b.status}">${t(`booking_${b.status}`)}</span></div></a>`)}</div>
    <p><a class="btn" href="/treatments">${icon("calendar")} ${t("bookThis")}</a></p>`);
}

async function returns(body, { query }) {
  const [{ returns: list }, { orders }] = await Promise.all([api("/me/returns"), api("/me/orders")]);
  const eligible = orders.filter((o) => o.status === "delivered" && o.delivered_at && Date.now() - Date.parse(o.delivered_at) < 7 * 86400_000 && !o.return_status);
  const pre = query.get("order");
  body.innerHTML = String(html`
    ${eligible.length ? html`<form class="card pad stack" id="ret"><h2>${t("requestReturn")}</h2>
      <label class="field"><span>${t("orderNumber")}</span><select class="input" name="orderNo">${eligible.map((o) => html`<option value="${o.order_no}" ${o.order_no === pre ? raw("selected") : ""}>${o.order_no} · ${money(o.total)}</option>`)}</select></label>
      <label class="field"><span>${t("returnReason")}</span><select class="input" name="reason">${["damaged", "wrong_item", "expired", "not_as_described", "reaction", "changed_mind", "other"].map((r) => html`<option value="${r}">${t(`reason_${r}`)}</option>`)}</select></label>
      <label class="field"><span>${t("details")}</span><textarea class="input" name="details" rows="2"></textarea></label>
      <button class="btn primary" type="submit">${t("send")}</button></form>` : html`<p class="muted note-card">${lang() === "bn" ? "ডেলিভারির ৭ দিনের মধ্যে রিটার্নের অনুরোধ করা যায় — সিল না খোলা পণ্য, অথবা ক্ষতিগ্রস্ত/ভুল পণ্য।" : "Returns can be requested within 7 days of delivery — for unopened items, or anything damaged or wrong."}</p>`}
    ${list.length ? html`<h2>${t("returns")}</h2>${list.map((r) => html`<div class="card pad"><b>${r.order_no}</b> · ${t(`reason_${r.reason}`)} <span class="pill">${r.status}</span>${r.refund_amount ? html` · ${money(r.refund_amount)}` : ""}${r.admin_note ? html`<p class="small muted">${r.admin_note}</p>` : ""}</div>`)}` : ""}`);
  $("#ret", body)?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    try {
      const r = await api("/me/returns", { method: "POST", body: { orderNo: f.orderNo.value, reason: f.reason.value, details: f.details.value } });
      toast(r[lang()] ?? r.en);
      returns(body, { query });
    } catch (err) { toast(errMsg(err), "error"); }
  });
}

async function referral(body) {
  const r = await api("/me/referral");
  if (!r.enabled) { body.innerHTML = String(html`<p class="muted">—</p>`); return; }
  const code = r.referral.code;
  const { store, brand } = await config();
  const shop = lang() === "bn" ? store.name_bn || brand.name.bn : store.name_en || brand.name.en;
  const msg = lang() === "bn" ? `${shop} থেকে প্রথম অর্ডারে ৳${r.referral.friend_discount} ছাড় পেতে আমার কোড ${code} ব্যবহার করুন: ${location.origin}` : `Use my code ${code} for ৳${r.referral.friend_discount} off your first order at ${shop}: ${location.origin}`;
  body.innerHTML = String(html`<div class="card pad referral">
    <h2>${t("referralHeadline", { friend: num(r.referral.friend_discount), reward: num(r.referral.reward) })}</h2>
    <p class="muted">${t("referralSub", { min: num(r.minOrder) })}</p>
    <div class="code-box"><span class="muted small">${t("yourCode")}</span><b>${code}</b><button class="btn sm" type="button" id="copy">${icon("copy")} ${t("copy")}</button></div>
    <p><a class="btn primary" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">${icon("whatsapp")} ${t("share")}</a></p>
    <p class="small">${t("uses")}: <b>${num(r.referral.uses)}</b> · ${t("rewards")}: <b>${num(r.referral.rewards_earned)}</b></p>
    ${r.rewards.length ? html`<ul>${r.rewards.map((c) => html`<li><b>${c.code}</b> — ${money(c.value)} ${c.used_count ? "✓" : ""} <small class="muted">${c.expires_at ? date(c.expires_at) : ""}</small></li>`)}</ul>` : ""}
  </div>`);
  $("#copy", body).addEventListener("click", async () => { await navigator.clipboard?.writeText(code); toast(t("copied")); });
}


async function profile(body, { who }) {
  body.innerHTML = String(html`<form class="card pad stack narrow-form" id="prof">
    <label class="field"><span>${t("fullName")}</span><input class="input" name="name" required value="${who.name}"></label>
    <label class="field"><span>${t("mobile")}</span><input class="input" value="${who.phone}" disabled></label>
    <label class="field"><span>${t("email")}</span><input class="input" name="email" type="email" value="${who.email ?? ""}"></label>
    <details><summary>${t("newPassword")}</summary>
      <label class="field"><span>${t("password")}</span><input class="input" name="currentPassword" type="password" autocomplete="current-password"></label>
      <label class="field"><span>${t("newPassword")}</span><input class="input" name="newPassword" type="password" minlength="8" autocomplete="new-password"></label></details>
    <button class="btn primary" type="submit">${t("save")}</button></form>`);
  $("#prof", body).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    try {
      await api("/me", { method: "PUT", body: { name: f.name.value, email: f.email.value, currentPassword: f.currentPassword.value || undefined, newPassword: f.newPassword.value || undefined } });
      await me(true);
      toast(t("saved"));
    } catch (err) { showFieldErrors(f, err); toast(errMsg(err), "error"); }
  });
}
