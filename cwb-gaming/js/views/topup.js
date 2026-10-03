// Pack page (/topup/<game>/<pack>): every seller's offer sorted by price, with rating and real delivery speed,
// then the buy panel — delivery method, player ID (format-checked, looked up where the game supports it), quantity.
import { tx, L, money, num, digits } from "../i18n.js";
import { html, api, $, $$, loadingBlock, errorBlock, emptyBlock, draft, me, debounce } from "../core.js";
import { gameImg, offerRow, methodLabel, reviewCard, sellerBadges } from "../ui.js";
import { track } from "../track.js";

export default async function topup(el, { params, navigate }) {
  el.innerHTML = String(html`<div class="container section">${loadingBlock(4)}</div>`);
  let d;
  try { d = await api(`/games/${params.game}/${params.product}`); } catch (e) { el.innerHTML = String(html`<div class="container section">${errorBlock(e)}</div>`); return; }
  const { game: g, product: p, offers } = d;
  document.title = `${L(g, "name")} ${L(p, "name")} — ${tx("compare prices", "দাম তুলনা")} | CWB Gaming`;
  const inStock = offers.filter((o) => o.in_stock);
  const state = { listing: inStock[0]?.listing_id ?? null, method: null, qty: 1, playerId: "", serverId: "", checked: null };
  const offerOf = () => offers.find((o) => o.listing_id === state.listing);
  const pickMethod = () => {
    const o = offerOf();
    if (!o) return;
    if (!o.methods.includes(state.method)) state.method = o.methods.includes("direct") && g.requires_player_id ? "direct" : o.methods[0];
  };
  pickMethod();
  track("ViewContent", { value: inStock[0]?.price, items: [{ sku: `${g.code}-${p.code}`, name: `${g.name_en} ${p.name_en}`, price: inStock[0]?.price }] });

  el.innerHTML = String(html`<div class="container section">
    <nav class="small muted" aria-label="breadcrumb"><a href="/games">${tx("Games", "গেম")}</a> / <a href="/game/${g.slug}">${L(g, "name")}</a> / ${L(p, "name")}</nav>
    <div class="game-banner" style="margin-top:10px"><img src="${gameImg(g)}" alt=""><div><span class="tag cyan">${L(g, "name")}</span>
      <h1 style="margin:8px 0 4px">${L(p, "name")}${p.bonus ? html` <span class="tag magenta" style="vertical-align:middle">+${num(p.bonus)} ${tx("bonus", "বোনাস")}</span>` : ""}</h1>
      <p style="margin:0">${inStock.length ? tx(`${inStock.length} seller${inStock.length > 1 ? "s" : ""} · from ${money(Math.min(...inStock.map((o) => o.price)))}`, `${digits(inStock.length)} জন সেলার · ${money(Math.min(...inStock.map((o) => o.price)))} থেকে শুরু`) : tx("No seller has this pack in stock right now.", "এই মুহূর্তে কোনো সেলারের কাছে এই প্যাক নেই।")}</p></div></div>
    <div class="row" style="gap:6px;margin-bottom:18px;overflow-x:auto;flex-wrap:nowrap">${d.siblings.map((s) => html`<a class="btn sm ${s.id === p.id ? "primary" : "ghost"}" href="/topup/${g.slug}/${s.slug}">${L(s, "name")}</a>`)}</div>

    <div class="topup-layout">
      <div>
        <div class="sec-head"><h2>${tx("Compare sellers", "সেলার তুলনা করুন")}</h2><span class="small muted">${tx("Sorted by price", "দাম অনুযায়ী সাজানো")}</span></div>
        <div id="offers">${offers.length ? offers.map((o, i) => offerRow(o, { best: i === 0 && o.in_stock })) : emptyBlock("No offers for this pack yet.", "এই প্যাকে এখনো কোনো অফার নেই।")}</div>
        ${L(p, "description") ? html`<div class="card" style="margin-top:18px"><h3>${tx("About this pack", "এই প্যাক সম্পর্কে")}</h3><p class="muted" style="margin:0">${L(p, "description")}</p></div>` : ""}
        ${d.reviews.length ? html`<div class="sec-head" style="margin-top:26px"><h2>${tx("Buyer ratings", "ক্রেতাদের রেটিং")}</h2></div><div class="reviews">${d.reviews.map(reviewCard)}</div>` : ""}
      </div>
      <aside class="card buy-panel" id="buy" aria-label="${tx("Buy", "কিনুন")}"></aside>
    </div></div>`);

  const saved = (await me()) ? await api("/account/me/player-ids").then((r) => r.items.filter((x) => x.game_id === g.id)).catch(() => []) : [];

  const validate = debounce(async () => {
    const box = $("#id-check", el);
    if (!box || !g.requires_player_id || state.method !== "direct") return;
    if (!state.playerId) { box.textContent = ""; state.checked = null; return; }
    try {
      const r = await api("/validate-id", { method: "POST", body: { gameId: g.id, playerId: state.playerId, serverId: state.serverId || null } });
      state.checked = r.ok ? r : null;
      box.className = r.ok ? "player-ok" : "field-error";
      box.textContent = r.ok ? (r.playerName ? `✓ ${tx("Account", "অ্যাকাউন্ট")}: ${r.playerName}${r.simulated ? " (test)" : ""}` : `✓ ${tx("Format looks right", "ফরম্যাট সঠিক মনে হচ্ছে")}`) : (r[document.documentElement.lang] ?? r.en);
      paintTotal();
    } catch { /* offline: the server checks again at checkout */ }
  }, 450);

  function paintTotal() {
    const o = offerOf();
    const btn = $("#go", el);
    if (!o || !btn) return;
    $("#total", el).textContent = money(o.price * state.qty);
    const needsId = state.method === "direct" && g.requires_player_id;
    btn.disabled = needsId && !state.checked;
  }

  function paintBuy() {
    const o = offerOf();
    if (!o) { $("#buy", el).innerHTML = String(html`<p class="muted" style="margin:0">${tx("Pick a seller to continue.", "চালিয়ে যেতে একজন সেলার বেছে নিন।")}</p>`); return; }
    const needsId = state.method === "direct" && g.requires_player_id;
    $("#buy", el).innerHTML = String(html`
      <h3 style="margin-bottom:6px">${L(p, "name")}</h3>
      <div class="small">${tx("Seller", "সেলার")}: <b>${o.seller.store_name}</b> ${sellerBadges(o.seller)}</div>
      <div class="step-title"><i>1</i>${tx("Delivery", "ডেলিভারি")}</div>
      <div class="seg" role="group">${o.methods.map((m) => html`<button type="button" data-method="${m}" aria-pressed="${state.method === m}">${m === "direct" ? tx("Direct top-up", "সরাসরি টপ-আপ") : tx("Redeem code", "রিডিম কোড")}</button>`)}</div>
      <p class="small muted" style="margin:8px 0 0">${state.method === "direct" ? tx("Sent straight to your game account — no code to type.", "সরাসরি আপনার গেম অ্যাকাউন্টে যাবে — কোড লিখতে হবে না।") : tx("You get a code on your order page and by SMS; redeem it yourself.", "অর্ডার পেজে ও SMS এ কোড পাবেন; নিজে রিডিম করবেন।")}</p>
      ${needsId ? html`<div class="step-title"><i>2</i>${L(g, "player_id_label") || tx("Player ID", "প্লেয়ার আইডি")}</div>
        ${saved.length ? html`<div class="row" style="gap:6px;margin-bottom:8px">${saved.map((s) => html`<button class="btn sm ghost" type="button" data-saved="${s.player_id}" data-server="${s.server_id}">${s.label || s.player_id}</button>`)}</div>` : ""}
        <label class="field"><span class="sr-only">${L(g, "player_id_label")}</span><input class="input big" id="pid" inputmode="${g.player_id_regex?.includes("[0-9]") || g.player_id_regex?.includes("\\d") ? "numeric" : "text"}" autocomplete="off" value="${state.playerId}" placeholder="${tx("e.g. 5123456789", "যেমন 5123456789")}"></label>
        ${g.needs_server ? html`<label class="field"><span>${L(g, "server_label") || tx("Server / Zone ID", "সার্ভার / জোন আইডি")}</span><input class="input big" id="sid" inputmode="numeric" autocomplete="off" value="${state.serverId}"></label>` : ""}
        <div id="id-check" class="small" aria-live="polite"></div>
        ${L(g, "player_id_hint") ? html`<p class="small muted" style="margin:6px 0 0">${L(g, "player_id_hint")}</p>` : ""}` : ""}
      <div class="step-title"><i>${needsId ? 3 : 2}</i>${tx("Quantity", "পরিমাণ")}</div>
      <div class="qty"><button type="button" data-q="-1" aria-label="-">−</button><input id="qty" value="${state.qty}" inputmode="numeric" aria-label="${tx("Quantity", "পরিমাণ")}"><button type="button" data-q="1" aria-label="+">+</button></div>
      <div class="summary-row total"><span>${tx("Total", "মোট")}</span><span id="total">${money(o.price * state.qty)}</span></div>
      <button class="btn cta lg block" id="go" type="button">${tx("Continue to payment", "পেমেন্টে যান")}</button>
      <p class="small muted" style="margin:10px 0 0">${tx("Nothing is delivered until your payment is confirmed by the gateway. No Cash on Delivery.", "গেটওয়ে পেমেন্ট নিশ্চিত না করা পর্যন্ত কিছু ডেলিভারি হয় না। ক্যাশ অন ডেলিভারি নেই।")}</p>`);
    paintTotal();
    if (needsId && state.playerId) validate();
  }
  paintBuy();

  el.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) {
      state.listing = Number(pick.dataset.pick);
      pickMethod();
      paintBuy();
      if (innerWidth < 980) $("#buy", el).scrollIntoView({ behavior: "smooth" });
      return;
    }
    const m = e.target.closest("[data-method]");
    if (m) { state.method = m.dataset.method; paintBuy(); return; }
    const s = e.target.closest("[data-saved]");
    if (s) { state.playerId = s.dataset.saved; state.serverId = s.dataset.server || ""; paintBuy(); return; }
    const q = e.target.closest("[data-q]");
    if (q) { state.qty = Math.max(1, Math.min(10, state.qty + Number(q.dataset.q))); $("#qty", el).value = state.qty; paintTotal(); return; }
    if (e.target.closest("#go")) {
      const o = offerOf();
      if (!o) return;
      const playerId = state.method === "direct" && g.requires_player_id ? (state.checked?.playerId ?? state.playerId) : null;
      draft.set({
        listingId: o.listing_id, quantity: state.qty, deliveryMethod: state.method, playerId, serverId: state.method === "direct" ? state.checked?.serverId ?? (state.serverId || null) : null,
        playerName: state.checked?.playerName ?? null, price: o.price, sku: o.sku,
        game: { id: g.id, slug: g.slug, name_en: g.name_en, name_bn: g.name_bn, player_id_label_en: g.player_id_label_en, player_id_label_bn: g.player_id_label_bn, server_label_en: g.server_label_en, server_label_bn: g.server_label_bn, image: gameImg(g) },
        product: { slug: p.slug, name_en: p.name_en, name_bn: p.name_bn },
        seller: { store_name: o.seller.store_name, slug: o.seller.slug, is_verified: o.seller.is_verified, is_official: o.seller.is_official },
        methodLabel: methodLabel(state.method),
      });
      track("AddToCart", { value: o.price * state.qty, items: [{ sku: o.sku, name: `${g.name_en} ${p.name_en}`, price: o.price, quantity: state.qty }] });
      navigate("/checkout");
    }
  });
  el.addEventListener("input", (e) => {
    if (e.target.id === "pid") { state.playerId = e.target.value.trim(); state.checked = null; paintTotal(); validate(); }
    if (e.target.id === "sid") { state.serverId = e.target.value.trim(); state.checked = null; paintTotal(); validate(); }
    if (e.target.id === "qty") { state.qty = Math.max(1, Math.min(10, Number(e.target.value) || 1)); paintTotal(); }
  });
  $$("[data-pick]", el).forEach((b) => b.setAttribute("aria-label", tx("Choose this seller", "এই সেলার বাছুন")));
}
