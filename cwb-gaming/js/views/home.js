// Home: hero, popular games, trending top-ups, top sellers, how-it-works strip, recent reviews.
import { tx, L, num, money } from "../i18n.js";
import { html, api, loadingBlock, errorBlock, config } from "../core.js";
import { gameCard, gameImg, sellerCard, reviewCard } from "../ui.js";

export default async function home(el) {
  document.title = tx("CWB Gaming — Game top-ups & codes in Bangladesh", "সিডব্লিউবি গেমিং — বাংলাদেশে গেম টপ-আপ ও কোড");
  el.innerHTML = String(html`<div class="container section">${loadingBlock(4)}</div>`);
  let d, cfg;
  try { [d, cfg] = await Promise.all([api("/home"), config()]); } catch (e) { el.innerHTML = String(html`<div class="container section">${errorBlock(e)}</div>`); return; }
  const featured = d.games.find((g) => g.is_featured) ?? d.games[0];
  const pay = cfg.payments;
  const methods = [pay.bkash.enabled && "bKash", pay.nagad.enabled && "Nagad", pay.rocket.enabled && "Rocket", pay.card.enabled && tx("Card", "কার্ড")].filter(Boolean);
  el.innerHTML = String(html`
  <section class="hero"><div class="container hero-inner">
    <div>
      <span class="tag cyan">${tx("Pay first · Play in minutes", "আগে পেমেন্ট · মিনিটেই খেলা")}</span>
      <h1 style="margin-top:14px"><span>${tx("Top up", "টপ-আপ করুন")}</span><span class="glow-text">${tx("compare sellers", "সেলার তুলনা করে")}</span><span>${tx("pay safely", "নিরাপদে পেমেন্ট")}</span></h1>
      <p class="lead">${tx("UC, Diamonds, CP and Google Play / Steam codes from KYC-verified sellers. Your code or top-up is released only after the payment gateway confirms your payment.", "KYC যাচাইকৃত সেলারদের কাছ থেকে UC, ডায়মন্ড, CP এবং Google Play / Steam কোড। পেমেন্ট গেটওয়ে নিশ্চিত করার পরই আপনার কোড বা টপ-আপ দেওয়া হয়।")}</p>
      <div class="row"><a class="btn cta lg" href="/games">${tx("Choose your game", "আপনার গেম বেছে নিন")}</a><a class="btn ghost lg" href="/how-it-works">${tx("How it works", "কীভাবে কাজ করে")}</a></div>
      <div class="pay-strip">${methods.map((m) => html`<span class="tag">${m}</span>`)}<span class="tag bad">${tx("No Cash on Delivery", "ক্যাশ অন ডেলিভারি নেই")}</span></div>
      <div class="hero-stats"><div><b>${num(d.stats?.games ?? 0)}</b><span>${tx("games", "গেম")}</span></div><div><b>${num(d.stats?.sellers ?? 0)}</b><span>${tx("approved sellers", "অনুমোদিত সেলার")}</span></div><div><b>${num(d.stats?.deliveries ?? 0)}</b><span>${tx("deliveries", "ডেলিভারি")}</span></div></div>
    </div>
    ${featured ? html`<a class="hero-art" href="/game/${featured.slug}" aria-label="${L(featured, "name")}"><img src="${gameImg(featured)}" alt="" width="880" height="605" fetchpriority="high"></a>` : ""}
  </div></section>

  <section class="container section"><div class="sec-head"><h2>${tx("Popular games", "জনপ্রিয় গেম")}</h2><a class="small accent" href="/games">${tx("All games", "সব গেম")} →</a></div>
    <div class="games">${d.games.map(gameCard)}</div></section>

  ${d.trending.length ? html`<section class="container section"><div class="sec-head"><h2>${tx("Trending top-ups", "ট্রেন্ডিং টপ-আপ")}</h2></div>
    <div class="packs">${d.trending.map((p) => html`<a class="pack" href="/topup/${p.game_slug}/${p.slug}"><span class="small muted">${L(p, "game_name")}</span><span class="amount">${L(p, "name")}</span>${p.bonus ? html`<span class="bonus">+${num(p.bonus)} ${tx("bonus", "বোনাস")}</span>` : ""}<span class="price">${tx("from", "শুরু")} ${money(p.min_price)}</span><span class="offers">${tx(`${p.offer_count} sellers`, `${num(p.offer_count)} জন সেলার`)}</span></a>`)}</div></section>` : ""}

  <section class="container section"><div class="sec-head"><h2>${tx("How it works", "কীভাবে কাজ করে")}</h2></div>
    <div class="steps">
      <div class="card"><h3>${tx("Pick a pack & seller", "প্যাক ও সেলার বাছুন")}</h3><p class="muted small">${tx("Every seller's price for the same pack, side by side — with their rating and real delivery speed.", "একই প্যাকে সব সেলারের দাম পাশাপাশি — রেটিং আর আসল ডেলিভারি সময়সহ।")}</p></div>
      <div class="card"><h3>${tx("Enter & confirm your ID", "আইডি দিন ও নিশ্চিত করুন")}</h3><p class="muted small">${tx("We check the format and repeat it back to you before you pay. A wrong ID can't be undone.", "পেমেন্টের আগে ফরম্যাট যাচাই করে আইডিটি আবার দেখাই। ভুল আইডি পরে ঠিক করা যায় না।")}</p></div>
      <div class="card"><h3>${tx("Pay with bKash, Nagad or card", "বিকাশ, নগদ বা কার্ডে পেমেন্ট")}</h3><p class="muted small">${tx("The order waits until the payment is confirmed by the gateway itself — not by the page you come back to.", "গেটওয়ে নিজে পেমেন্ট নিশ্চিত না করা পর্যন্ত অর্ডার অপেক্ষা করে — ফিরে আসা পেজ দেখে নয়।")}</p></div>
      <div class="card"><h3>${tx("Get your code / top-up", "কোড / টপ-আপ পান")}</h3><p class="muted small">${tx("Codes appear on your order page and by SMS. Something wrong? Report it within 7 days.", "কোড অর্ডার পেজে ও SMS এ আসে। সমস্যা হলে ৭ দিনের মধ্যে রিপোর্ট করুন।")}</p></div>
    </div></section>

  ${d.sellers.length ? html`<section class="container section"><div class="sec-head"><h2>${tx("Top sellers", "শীর্ষ সেলার")}</h2><a class="small accent" href="/sellers">${tx("All sellers", "সব সেলার")} →</a></div>
    <div class="sellers">${d.sellers.map(sellerCard)}</div></section>` : ""}

  <section class="container section" id="reviews-sec" hidden><div class="sec-head"><h2>${tx("What gamers say", "গেমাররা যা বলছেন")}</h2></div><div class="reviews" id="reviews"></div></section>

  <section class="container section"><div class="card" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));align-items:center;background:linear-gradient(120deg,rgba(155,92,255,.18),rgba(34,229,255,.08))">
    <div><h2 style="margin:0">${tx("Sell on CWB Gaming", "সিডব্লিউবি গেমিং এ বিক্রি করুন")}</h2><p class="muted" style="margin:6px 0 0">${tx("Reach gamers across Bangladesh. KYC once, list against our catalogue, get paid to bKash, Nagad or bank.", "সারা বাংলাদেশের গেমারদের কাছে পৌঁছান। একবার KYC, আমাদের ক্যাটালগে লিস্ট করুন, বিকাশ, নগদ বা ব্যাংকে টাকা নিন।")}</p></div>
    <div style="text-align:right"><a class="btn primary lg" href="/sell">${tx("Become a seller", "সেলার হোন")}</a></div></div></section>`);
  api("/reviews?limit=6").then((r) => {
    if (!r.items.length || !el.querySelector("#reviews")) return;
    el.querySelector("#reviews").innerHTML = String(html`${r.items.map(reviewCard)}`);
    el.querySelector("#reviews-sec").hidden = false;
  }).catch(() => {});
}
