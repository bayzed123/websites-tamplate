// Shared storefront components: game & pack cards, seller badges, offer rows (price comparison), ratings,
// the order status track, review cards. Numbers shown are always real data from the API — no invented urgency.
import { L, tx, money, num, digits, eta, date } from "./i18n.js";
import { html, icon, raw } from "./core.js";

export const gameImg = (g) => g?.cover_url || g?.icon_url || "img/games/placeholder.webp";

export function gameCard(g) {
  return html`<a class="game-card" href="/game/${g.slug}">
    <div class="art"><img src="${gameImg(g)}" alt="" loading="lazy" width="400" height="500"></div>
    <div class="body"><b>${L(g, "name")}</b>
      <small>${g.kind === "giftcard" ? tx("Gift codes", "গিফট কোড") : L(g, "currency_name") || tx("Top-up", "টপ-আপ")}${g.from_price != null ? html` · <span class="from">${tx("from", "শুরু")} ${money(g.from_price)}</span>` : ""}</small></div></a>`;
}

export function packCard(p, game, { current = false, href } = {}) {
  return html`<a class="pack" href="${href ?? `/topup/${game.slug}/${p.slug}`}" aria-current="${current}">
    ${p.is_popular ? html`<span class="pop">${tx("Popular", "জনপ্রিয়")}</span>` : ""}
    <span class="amount">${L(p, "name")}</span>
    ${p.bonus ? html`<span class="bonus">+${num(p.bonus)} ${tx("bonus", "বোনাস")}</span>` : ""}
    <span class="price">${p.min_price != null ? html`${tx("from", "শুরু")} ${money(p.min_price)}` : tx("No offers yet", "এখনো অফার নেই")}</span>
    <span class="offers">${p.offer_count ? tx(`${p.offer_count} seller${p.offer_count > 1 ? "s" : ""}`, `${digits(p.offer_count)} জন সেলার`) : ""}</span></a>`;
}

export const avatar = (s) => html`<span class="avatar">${s.logo_url ? html`<img src="${s.logo_url}" alt="">` : (s.store_name ?? "?").slice(0, 1).toUpperCase()}</span>`;

export function sellerBadges(s) {
  return html`${s.is_official ? html`<span class="tag purple">${tx("Official store", "অফিসিয়াল স্টোর")}</span>` : ""}
    ${s.is_verified ? html`<span class="verified" title="${tx("Earned after 50+ clean orders — never granted on request", "৫০+ ঝামেলাহীন অর্ডারের পর অর্জিত — অনুরোধে দেওয়া হয় না")}">${icon("verified")}${tx("Verified Seller", "ভেরিফায়েড সেলার")}</span>` : ""}`;
}

export const stars = (avg, count) =>
  Number(count) > 0
    ? html`<span class="stars" aria-label="${avg} / 5">${"★".repeat(Math.round(avg))}${"☆".repeat(5 - Math.round(avg))}</span> <span class="muted small">${digits(Number(avg).toFixed(1))} (${num(count)})</span>`
    : html`<span class="muted small">${tx("No ratings yet", "এখনো রেটিং নেই")}</span>`;

export const methodLabel = (m) => (m === "direct" ? tx("Direct top-up to your ID", "আপনার আইডিতে সরাসরি টপ-আপ") : tx("Redeem code", "রিডিম কোড"));

/** One seller's offer in the price comparison. */
export function offerRow(o, { best = false } = {}) {
  const instant = o.instant.code || o.instant.direct;
  return html`<div class="offer ${best ? "best" : ""} ${o.in_stock ? "" : "out"}" data-listing="${o.listing_id}">
    <div class="seller">${avatar(o.seller)}<div style="min-width:0">
      <div class="name"><a href="/store/${o.seller.slug}">${o.seller.store_name}</a> ${sellerBadges(o.seller)}</div>
      <div class="meta"><span>${stars(o.seller.rating_avg, o.seller.rating_count)}</span>
        <span>${icon("bolt")} ${eta(o.eta_minutes, instant)}</span>
        <span>${num(o.seller.delivered_count)} ${tx("delivered", "ডেলিভারি")}</span>
        ${o.stock_left != null ? html`<span>${o.stock_left > 0 ? tx(`${o.stock_left} codes in stock`, `${digits(o.stock_left)}টি কোড স্টকে`) : tx("Out of codes", "কোড শেষ")}</span>` : ""}</div>
      <div class="row" style="gap:6px;margin-top:6px">${o.methods.map((m) => html`<span class="tag ${m === "direct" ? "cyan" : "purple"}">${m === "direct" ? tx("Direct", "সরাসরি") : tx("Code", "কোড")}</span>`)}${best ? html`<span class="tag magenta">${tx("Best price", "সেরা দাম")}</span>` : ""}</div>
    </div></div>
    <div class="price">${money(o.price)}</div>
    <div class="actions"><button class="btn ${best ? "cta" : "primary"}" type="button" data-pick="${o.listing_id}" ${o.in_stock ? "" : raw("disabled")}>${o.in_stock ? tx("Choose", "বাছাই করুন") : tx("Unavailable", "পাওয়া যাচ্ছে না")}</button></div>
  </div>`;
}

export function sellerCard(s) {
  return html`<a class="card hover seller-card" href="/store/${s.slug}">${avatar(s)}<div style="min-width:0">
    <b style="display:block">${s.store_name}</b><div class="row" style="gap:6px">${sellerBadges(s)}</div>
    <div class="small">${stars(s.rating_avg, s.rating_count)}</div>
    <div class="small muted">${num(s.delivered_count)} ${tx("deliveries", "ডেলিভারি")}${s.avg_fulfil_minutes ? html` · ${tx("usually", "সাধারণত")} ${eta(s.avg_fulfil_minutes, s.avg_fulfil_minutes <= 1)}` : ""}</div></div></a>`;
}

export function reviewCard(r) {
  return html`<div class="card"><div class="spread"><b>${r.name}</b><span class="stars">${"★".repeat(r.rating)}</span></div>
    <p class="small muted" style="margin:4px 0 8px">${r.game_name_en ? `${r.game_name_en} · ` : ""}${L(r, "product_name")} · ${r.store_name ? html`<a href="/store/${r.seller_slug}">${r.store_name}</a>` : ""} · ${date(r.created_at)}</p>
    ${r.body ? html`<p style="margin:0">${r.body}</p>` : ""}
    ${r.seller_reply ? html`<p class="small" style="margin:8px 0 0;padding-left:10px;border-left:2px solid var(--purple)"><b>${tx("Seller", "সেলার")}:</b> ${r.seller_reply}</p>` : ""}</div>`;
}

const TRACK = [
  ["payment_pending", "Payment pending", "পেমেন্টের অপেক্ষায়"],
  ["paid", "Payment confirmed", "পেমেন্ট নিশ্চিত"],
  ["delivering", "Delivering", "ডেলিভারি হচ্ছে"],
  ["delivered", "Delivered", "ডেলিভারি সম্পন্ন"],
];
/** Payment Pending → Payment Confirmed → Delivering → Delivered (or Held for Review). */
export function statusTrack(o) {
  const order = { payment_pending: 0, payment_failed: 0, expired: 0, cancelled: 0, paid: 1, held: 1, delivering: 2, delivered: 3, partially_delivered: 3, refunded: 3 };
  const at = order[o.status] ?? 0;
  return html`<div class="status-track" role="list">${TRACK.map(([, en, bn], i) => {
    const label = i === 1 && o.status === "held" ? tx("Held for review", "যাচাইয়ের জন্য অপেক্ষমাণ") : tx(en, bn);
    return html`<div role="listitem" class="${i < at || (i === at && at === 3) ? "done" : i === at ? "now" : ""}">${label}</div>`;
  })}</div>`;
}
