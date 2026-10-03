// Buyer account: sign in / register (phone verified by SMS), orders, saved player IDs per game, wishlist, points &
// referral code, reports (disputes), profile.
import { tx, L, money, num, date, tt } from "../i18n.js";
import { html, api, $, me, toast, errMsg, showFieldErrors, turnstile, loadingBlock, emptyBlock, copyText, icon, normalizePhone } from "../core.js";

const TABS = [["orders", "Orders", "অর্ডার"], ["ids", "Player IDs", "প্লেয়ার আইডি"], ["wishlist", "Wishlist", "পছন্দের তালিকা"], ["points", "Points & referral", "পয়েন্ট ও রেফারেল"], ["reports", "Reports", "রিপোর্ট"], ["profile", "Profile", "প্রোফাইল"]];

export default async function account(el, { params, navigate }) {
  document.title = tx("My account — CWB Gaming", "আমার অ্যাকাউন্ট — সিডব্লিউবি গেমিং");
  const customer = await me(true);
  if (!customer) return authScreen(el, navigate);
  const tab = TABS.some(([k]) => k === params.tab) ? params.tab : "orders";
  el.innerHTML = String(html`<div class="container section">
    <div class="spread"><div><h1 style="margin:0">${tx("Hi", "হাই")}, ${customer.name.split(" ")[0]}</h1><span class="small muted">${customer.phone} · ${customer.badge?.icon ?? ""} ${tt(customer.badge)}</span></div>
      <button class="btn sm ghost" type="button" id="logout">${tx("Sign out", "সাইন আউট")}</button></div>
    <nav class="tabs" style="margin-top:18px">${TABS.map(([k, en, bn]) => html`<a href="/account/${k}" ${k === tab ? 'aria-current="page"' : ""}>${tx(en, bn)}</a>`)}</nav>
    <div id="tab">${loadingBlock(2)}</div></div>`);
  $("#logout", el).onclick = async () => { await api("/account/logout", { method: "POST" }).catch(() => {}); await me(true); navigate("/"); };
  const box = $("#tab", el);
  try {
    if (tab === "orders") {
      const r = await api("/account/me/orders");
      box.innerHTML = r.items.length
        ? String(html`${r.items.map((o) => html`<a class="list-row" href="/order/${o.order_no}?token=${o.public_token}"><div><b class="mono">${o.order_no}</b><div class="small muted">${o.summary ?? ""} · ${date(o.created_at)}</div></div><div style="text-align:right"><b>${money(o.total)}</b><div class="small">${tt(o.status_label)}</div></div></a>`)}`)
        : String(html`${emptyBlock("No orders yet.", "এখনো কোনো অর্ডার নেই।")}<p style="text-align:center"><a class="btn primary" href="/games">${tx("Top up now", "এখনই টপ-আপ করুন")}</a></p>`);
    }
    if (tab === "ids") {
      const [ids, games] = await Promise.all([api("/account/me/player-ids"), api("/games")]);
      const gamesWithId = games.items.filter((g) => g.requires_player_id);
      box.innerHTML = String(html`<p class="muted">${tx("Saved IDs appear as one-tap buttons when you top up.", "সংরক্ষিত আইডি টপ-আপের সময় এক ট্যাপের বাটন হিসেবে দেখাবে।")}</p>
        ${ids.items.map((x) => html`<div class="list-row"><div><b>${L(x, "game_name")}</b> · <span class="mono">${x.player_id}${x.server_id ? ` (${x.server_id})` : ""}</span>${x.label ? html` · <span class="muted">${x.label}</span>` : ""}</div><button class="btn sm ghost" type="button" data-del-id="${x.id}">${tx("Remove", "সরান")}</button></div>`)}
        <form class="card" id="add-id" style="margin-top:16px;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));align-items:end">
          <label class="field" style="margin:0"><span>${tx("Game", "গেম")}</span><select class="input" name="game_id">${gamesWithId.map((g) => html`<option value="${g.id}">${L(g, "name")}</option>`)}</select></label>
          <label class="field" style="margin:0"><span>${tx("Player ID", "প্লেয়ার আইডি")}</span><input class="input" name="player_id" required></label>
          <label class="field" style="margin:0"><span>${tx("Server / zone (if any)", "সার্ভার / জোন (যদি থাকে)")}</span><input class="input" name="server_id"></label>
          <label class="field" style="margin:0"><span>${tx("Label", "লেবেল")}</span><input class="input" name="label" placeholder="${tx("My main", "আমার মেইন")}"></label>
          <button class="btn primary">${tx("Save ID", "আইডি রাখুন")}</button></form>`);
      $("#add-id", box).addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        try { await api("/account/me/player-ids", { method: "POST", body: { game_id: Number(f.game_id.value), player_id: f.player_id.value.trim(), server_id: f.server_id.value.trim(), label: f.label.value.trim() || null } }); navigate("/account/ids", { replace: true }); }
        catch (err) { showFieldErrors(f, err); toast(errMsg(err), "error"); }
      });
      box.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-del-id]");
        if (!b) return;
        await api(`/account/me/player-ids/${b.dataset.delId}`, { method: "DELETE" }).catch(() => {});
        navigate("/account/ids", { replace: true });
      });
    }
    if (tab === "wishlist") {
      const r = await api("/account/me/wishlist");
      box.innerHTML = r.items.length
        ? String(html`<div class="packs">${r.items.map((p) => html`<a class="pack" href="/topup/${p.game_slug}/${p.slug}"><span class="small muted">${L(p, "game_name")}</span><span class="amount">${L(p, "name")}</span><span class="price">${p.min_price != null ? money(p.min_price) : "—"}</span></a>`)}</div>`)
        : String(emptyBlock("Your wishlist is empty.", "পছন্দের তালিকা খালি।"));
    }
    if (tab === "points") {
      const [r, cfg] = await Promise.all([api("/account/me/points"), api("/config")]);
      const link = `${location.origin}/account?ref=${customer.referral_code}`;
      box.innerHTML = String(html`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">
        <div class="card"><span class="small muted">${tx("Points balance", "পয়েন্ট ব্যালেন্স")}</span><div style="font:800 2.4rem var(--head)" class="glow-text">${num(customer.loyalty_points)}</div>
          <p class="small muted" style="margin:0">${tx(`1 point = ৳1 off. You earn ${cfg.loyalty.cashbackPercent}% back on delivered orders and can use points for up to ${cfg.loyalty.maxRedeemPercent}% of an order.`, `১ পয়েন্ট = ৳১ ছাড়। ডেলিভারি হওয়া অর্ডারে ${num(cfg.loyalty.cashbackPercent)}% ফেরত পাবেন, আর অর্ডারের সর্বোচ্চ ${num(cfg.loyalty.maxRedeemPercent)}% পয়েন্টে দিতে পারবেন।`)}</p></div>
        ${cfg.referral.enabled ? html`<div class="card"><span class="small muted">${tx("Your referral code", "আপনার রেফারেল কোড")}</span><div class="code-box"><code>${customer.referral_code}</code><button class="btn sm" type="button" data-copy="${link}">${icon("copy")}</button></div>
          <p class="small muted" style="margin:0">${tx(`When a friend signs up with your code and their first order (৳${cfg.referral.minOrder}+) is delivered, they get ${cfg.referral.friendPoints} points and you get ${cfg.referral.referrerPoints}.`, `বন্ধু আপনার কোডে সাইন আপ করে প্রথম অর্ডার (৳${num(cfg.referral.minOrder)}+) ডেলিভারি পেলে সে ${num(cfg.referral.friendPoints)} আর আপনি ${num(cfg.referral.referrerPoints)} পয়েন্ট পাবেন।`)}</p></div>` : ""}</div>
        <h3 style="margin-top:22px">${tx("History", "ইতিহাস")}</h3>
        ${r.items.length ? r.items.map((x) => html`<div class="list-row"><span>${x.reason} ${x.note ? html`<span class="muted small">· ${x.note}</span>` : ""}</span><b style="color:${x.change > 0 ? "var(--ok)" : "var(--warn)"}">${x.change > 0 ? "+" : ""}${num(x.change)}</b></div>`) : emptyBlock("No points yet.", "এখনো কোনো পয়েন্ট নেই।")}`);
      box.addEventListener("click", (e) => { const c = e.target.closest("[data-copy]"); if (c) copyText(c.dataset.copy); });
    }
    if (tab === "reports") {
      const r = await api("/account/me/disputes");
      box.innerHTML = r.items.length
        ? String(html`${r.items.map((d) => html`<a class="list-row" href="/order/${d.order_no}?token=${d.public_token}"><div><b class="mono">${d.dispute_no}</b> · ${d.game_name} ${L(d, "product_name")}<div class="small muted">${d.reason.replace("_", " ")} · ${date(d.created_at)}</div></div><span class="tag ${d.status === "resolved" ? "ok" : "warn"}">${d.status === "resolved" ? `${tx("Resolved", "সমাধান")}${d.refund_amount ? ` · ${money(d.refund_amount)}` : ""}` : tx("Open", "চলছে")}</span></a>`)}`)
        : String(emptyBlock("No reports. Good!", "কোনো রিপোর্ট নেই।"));
    }
    if (tab === "profile") {
      box.innerHTML = String(html`<form class="card" id="pf" style="max-width:480px"><label class="field"><span>${tx("Name", "নাম")}</span><input class="input" name="name" value="${customer.name}" required></label>
        <label class="field"><span>${tx("Email", "ইমেইল")}</span><input class="input" name="email" type="email" value="${customer.email ?? ""}"></label>
        <button class="btn primary">${tx("Save", "সংরক্ষণ")}</button></form>`);
      $("#pf", box).addEventListener("submit", async (e) => {
        e.preventDefault();
        try { toast(tt(await api("/account/me", { method: "PUT", body: { name: e.target.name.value.trim(), email: e.target.email.value.trim() } }))); await me(true); }
        catch (err) { showFieldErrors(e.target, err); toast(errMsg(err), "error"); }
      });
    }
  } catch (e) { box.innerHTML = String(html`<p class="error-box">${errMsg(e)}</p>`); }
}

async function authScreen(el, navigate) {
  const ref = __shopDemo.virtual().searchParams.get("ref") ?? "";
  let mode = ref ? "register" : "login";
  const paint = async () => {
    el.innerHTML = String(html`<div class="container section" style="max-width:460px">
      <h1>${mode === "login" ? tx("Sign in", "সাইন ইন") : mode === "register" ? tx("Create account", "অ্যাকাউন্ট খুলুন") : tx("Reset password", "পাসওয়ার্ড রিসেট")}</h1>
      <form class="card" id="af" novalidate>
        ${mode === "register" ? html`<label class="field"><span>${tx("Name", "নাম")}</span><input class="input" name="name" autocomplete="name" required></label>` : ""}
        <label class="field"><span>${tx("Mobile number", "মোবাইল নম্বর")}</span><input class="input" name="phone" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" required></label>
        ${mode !== "login" ? html`<div class="row"><button class="btn sm" type="button" id="send">${tx("Send SMS code", "SMS কোড পাঠান")}</button><span class="small muted" id="sent"></span></div>
          <label class="field" style="margin-top:10px"><span>${tx("6-digit code", "৬ সংখ্যার কোড")}</span><input class="input" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label>` : ""}
        ${mode === "register" ? html`<label class="field"><span>${tx("Email (optional)", "ইমেইল (ঐচ্ছিক)")}</span><input class="input" name="email" type="email"></label>
          <label class="field"><span>${tx("Referral code (optional)", "রেফারেল কোড (ঐচ্ছিক)")}</span><input class="input" name="referralCode" value="${ref}"></label>` : ""}
        <label class="field"><span>${mode === "reset" ? tx("New password", "নতুন পাসওয়ার্ড") : tx("Password", "পাসওয়ার্ড")}</span><input class="input" name="password" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" required minlength="${mode === "login" ? 1 : 8}"></label>
        <div id="ts"></div>
        <button class="btn primary block" style="margin-top:8px">${mode === "login" ? tx("Sign in", "সাইন ইন") : mode === "register" ? tx("Create account", "অ্যাকাউন্ট খুলুন") : tx("Change password", "পাসওয়ার্ড বদলান")}</button>
        <p class="small" style="text-align:center;margin:14px 0 0">${mode === "login" ? html`<button class="btn sm ghost" type="button" data-mode="register">${tx("New here? Create an account", "নতুন? অ্যাকাউন্ট খুলুন")}</button> <button class="btn sm ghost" type="button" data-mode="reset">${tx("Forgot password", "পাসওয়ার্ড ভুলে গেছি")}</button>` : html`<button class="btn sm ghost" type="button" data-mode="login">${tx("Back to sign in", "সাইন ইনে ফিরুন")}</button>`}</p>
      </form>
      <p class="small muted" style="margin-top:14px">${tx("No account needed to buy — accounts keep your orders, saved IDs and points in one place.", "কিনতে অ্যাকাউন্ট লাগে না — অ্যাকাউন্টে আপনার অর্ডার, সংরক্ষিত আইডি ও পয়েন্ট এক জায়গায় থাকে।")}</p></div>`);
    const f = $("#af", el);
    const ts = await turnstile($("#ts", el)).catch(() => async () => undefined);
    el.querySelectorAll("[data-mode]").forEach((b) => (b.onclick = () => { mode = b.dataset.mode; paint(); }));
    $("#send", el)?.addEventListener("click", async () => {
      const phone = normalizePhone(f.phone.value);
      if (!phone) return showFieldErrors(f, { data: { fields: [{ field: "phone", en: "Enter a valid mobile number", bn: "সঠিক মোবাইল নম্বর দিন" }] } });
      try {
        const r = mode === "register" ? await api("/otp/send", { method: "POST", body: { phone, lang: document.documentElement.lang, turnstileToken: await ts() } }) : await api("/account/reset/request", { method: "POST", body: { phone, turnstileToken: await ts() } });
        $("#sent", el).textContent = r.devCode ? `Demo — no SMS is sent. Your code: ${r.devCode}` : tx("Code sent.", "কোড পাঠানো হয়েছে।");
      } catch (err) { toast(errMsg(err), "error"); }
    });
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        if (mode === "login") await api("/account/login", { method: "POST", body: { phone: f.phone.value.trim(), password: f.password.value, turnstileToken: await ts() } });
        if (mode === "register") {
          await api("/otp/verify", { method: "POST", body: { phone: normalizePhone(f.phone.value) ?? f.phone.value, code: f.code.value.trim() } });
          await api("/account/register", { method: "POST", body: { name: f.name.value.trim(), phone: f.phone.value.trim(), email: f.email.value.trim(), password: f.password.value, referralCode: f.referralCode.value.trim() || null, turnstileToken: await ts() } });
        }
        if (mode === "reset") {
          toast(tt(await api("/account/reset/confirm", { method: "POST", body: { phone: f.phone.value.trim(), code: f.code.value.trim(), password: f.password.value } })));
          mode = "login";
          return paint();
        }
        await me(true);
        navigate("/account/orders", { replace: true });
      } catch (err) { showFieldErrors(f, err); toast(errMsg(err), "error"); }
    });
  };
  paint();
}
