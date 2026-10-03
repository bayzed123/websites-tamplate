// Public seller storefront (/store/<slug>) and the seller directory (/sellers).
import { tx, L, money, num, date, digits, eta } from "../i18n.js";
import { html, api, loadingBlock, errorBlock, emptyBlock, icon } from "../core.js";
import { avatar, sellerBadges, stars, sellerCard, reviewCard } from "../ui.js";

export default async function store(el, { params, variant }) {
  el.innerHTML = String(html`<div class="container section">${loadingBlock(3)}</div>`);
  if (variant === "list") {
    document.title = tx("Sellers — CWB Gaming", "সেলার — সিডব্লিউবি গেমিং");
    try {
      const r = await api("/sellers");
      el.innerHTML = String(html`<div class="container section"><h1>${tx("Sellers", "সেলার")}</h1>
        <p class="muted">${tx("Every seller here passed KYC. The Verified badge is earned automatically after 50+ orders with a low dispute rate — it can't be bought or requested.", "এখানকার প্রতিটি সেলার KYC পার করেছেন। ভেরিফায়েড ব্যাজ ৫০+ অর্ডার ও কম বিরোধের হারে নিজে থেকেই আসে — কেনা বা অনুরোধ করা যায় না।")}</p>
        ${r.items.length ? html`<div class="sellers">${r.items.map(sellerCard)}</div>` : emptyBlock("No sellers yet.", "এখনো কোনো সেলার নেই।")}</div>`);
    } catch (e) { el.innerHTML = String(html`<div class="container section">${errorBlock(e)}</div>`); }
    return;
  }
  let r;
  try { r = await api(`/stores/${params.slug}`); } catch (e) { el.innerHTML = String(html`<div class="container section">${errorBlock(e)}</div>`); return; }
  const s = r.seller;
  document.title = `${s.store_name} — CWB Gaming`;
  el.innerHTML = String(html`<div class="container section">
    <div class="card" style="display:flex;gap:16px;align-items:center;flex-wrap:wrap"><div class="seller-card">${avatar(s)}</div>
      <div style="flex:1;min-width:220px"><h1 style="margin:0">${s.store_name}</h1><div class="row" style="gap:6px;margin:6px 0">${sellerBadges(s)}<span class="tag">${s.standing.icon} ${tx(s.standing.en, s.standing.bn)}</span></div>
        <div>${stars(s.rating_avg, s.rating_count)}</div>
        <div class="small muted">${num(s.delivered_count)} ${tx("deliveries", "ডেলিভারি")}${s.avg_fulfil_minutes ? html` · ${tx("usually delivers", "সাধারণত ডেলিভারি")} ${eta(s.avg_fulfil_minutes, s.avg_fulfil_minutes <= 1)}` : ""} · ${tx("selling since", "বিক্রি শুরু")} ${date(s.since)}</div>
        ${L(s, "bio") ? html`<p style="margin:10px 0 0">${L(s, "bio")}</p>` : ""}</div></div>
    <div class="sec-head" style="margin-top:24px"><h2>${tx("Packs from this seller", "এই সেলারের প্যাক")}</h2></div>
    ${r.listings.length ? html`<div class="packs">${r.listings.map((l) => html`<a class="pack" href="/topup/${l.game_slug}/${l.slug}"><span class="small muted">${L(l, "game_name")}</span><span class="amount">${L(l, "name")}</span><span class="price">${money(l.price)}</span>
        <span class="offers">${l.methods.map((m) => (m === "direct" ? tx("Direct", "সরাসরি") : tx("Code", "কোড"))).join(" · ")}${l.codes_prestocked && l.methods.includes("code") ? html` · ${l.stock > 0 ? html`${icon("bolt")} ${tx("instant", "সাথে সাথে")}` : tx("out of codes", "কোড শেষ")}` : ""}</span></a>`)}</div>` : emptyBlock("No packs listed right now.", "এখন কোনো প্যাক লিস্ট করা নেই।")}
    ${r.reviews.length ? html`<div class="sec-head" style="margin-top:28px"><h2>${tx("Ratings", "রেটিং")} (${digits(r.reviews.length)})</h2></div><div class="reviews">${r.reviews.map(reviewCard)}</div>` : ""}
  </div>`);
}
