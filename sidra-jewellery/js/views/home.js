// Home: hero, trust strip, category tiles, festive offer, collections, shop by occasion, new arrivals, best sellers,
// gifting guide, customer photos & reviews, newsletter.
import { t, L, tt, lang } from "../i18n.js";
import { $, $$, api, html, icon, raw, toast, errMsg, config } from "../core.js";
import { productGrid, skeletonGrid, bindCards, OCCASION_LABELS, OCCASION_COLORS, OCCASION_BLURB, stars, collectionCards } from "../ui.js";

const CAT_ICONS = { earrings: "sparkle", "necklaces-pendants": "heart", "bangles-bracelets": "star", rings: "star", anklets: "sparkle", "hair-accessories": "sparkle", "jewellery-sets": "gift" };
const OCC_IMG = { everyday: "img/products/ad-solitaire-pendant.webp", festive: "img/products/jhumka-antique-ruby.webp", bridal: "img/products/kundan-bridal-set.webp" };

export default async function home(el) {
  el.innerHTML = String(html`<section class="hero-wrap"><div class="container"><div class="skel hero-skel"></div></div></section><div class="container section">${skeletonGrid(4)}</div>`);
  let data, cats, cfg;
  try {
    [data, cats, cfg] = await Promise.all([api("/home"), api("/categories"), config()]);
  } catch (e) {
    el.innerHTML = String(html`<div class="container section"><p class="error-box">${errMsg(e)}</p></div>`);
    return;
  }
  const heroes = data.banners.filter((b) => b.placement === "hero");
  const offers = data.banners.filter((b) => b.placement === "offer");
  const marketing = data.banners.filter((b) => b.placement === "marketing");
  const top = cats.categories.filter((c) => !c.parent_id);
  const zone = cfg.zones.find((z) => z.free_shipping_min);

  el.innerHTML = String(html`
    <section class="hero-wrap">
      <div class="container">
        <div class="hero-slider" id="hero">
          ${heroes.map((b, i) => html`<div class="hero ${b.color ?? "yellow"}" ${i ? raw("hidden") : ""} data-slide="${i}">
            <div class="hero-text">
              <h1>${L(b, "title")}</h1>
              ${b.subtitle_en ? html`<p>${L(b, "subtitle")}</p>` : ""}
              ${b.link_url ? html`<a class="btn primary lg" href="${b.link_url}">${L(b, "cta") || t("shop")} ${icon("chevron")}</a>` : ""}
            </div>
            <div class="hero-art" aria-hidden="true">${b.image_url ? html`<img src="${b.image_url}" alt="" width="560" height="560" ${i ? "" : raw('fetchpriority="high"')}>` : html`<img src="img/logo.svg" alt="" width="300" height="300">`}</div>
          </div>`)}
          ${heroes.length > 1 ? html`<div class="dots">${heroes.map((_, i) => html`<button type="button" data-dot="${i}" aria-label="${i + 1}" aria-current="${i === 0}"></button>`)}</div>` : ""}
        </div>
        <ul class="trust-strip">
          <li>${icon("cash")}<span>${t("codAvailable")}</span></li>
          <li>${icon("truck")}<span>${zone ? t("freeOver", { n: zone.free_shipping_min }) : t("delivery")}</span></li>
          <li>${icon("return")}<span>${t("easyReturns")}</span></li>
          <li>${icon("gift")}<span>${cfg.giftWrap?.enabled ? t("giftWrapNote", { fee: "৳" + cfg.giftWrap.fee }) : t("giftWrap")}</span></li>
        </ul>
      </div>
    </section>

    ${offers.length ? html`<section class="container section offers">${offers.map((b) => html`<a class="offer-banner ${b.color ?? "peach"}" href="${b.link_url || "/shop"}">
        ${b.image_url ? html`<img src="${b.image_url}" alt="" loading="lazy" width="220" height="220">` : ""}
        <span class="offer-text"><b>${L(b, "title")}</b>${b.subtitle_en ? html`<span>${L(b, "subtitle")}</span>` : ""}</span>
        <span class="btn primary">${L(b, "cta") || t("shop")} ${icon("chevron")}</span></a>`)}</section>` : ""}

    <section class="container section">
      <div class="section-head"><h2>${t("shopByCategory")}</h2></div>
      <div class="cat-tiles">
        ${top.map((c) => html`<a class="cat-tile ${c.color ?? "yellow"}" href="/shop/${c.slug}">
          <span class="blob">${c.image_url ? html`<img src="${c.image_url}" alt="" loading="lazy" width="96" height="96">` : icon(CAT_ICONS[c.slug] ?? "star")}</span>
          <b>${L(c, "name")}</b></a>`)}
      </div>
    </section>

    ${data.collections?.length ? html`<section class="container section">
      <div class="section-head"><h2>${t("collections")}</h2><a href="/collections">${t("viewAll")} ${icon("chevron")}</a></div>
      ${collectionCards(data.collections.slice(0, 4))}
    </section>` : ""}

    <section class="container section">
      <div class="section-head"><h2>${t("shopByAge")}</h2></div>
      <div class="occ-tiles">
        ${Object.entries(OCCASION_LABELS).map(([code, l]) => html`<a class="occ-tile ${OCCASION_COLORS[code]}" href="/shop?occasion=${code}">
          <img src="${OCC_IMG[code]}" alt="" loading="lazy" width="400" height="400">
          <span class="occ-text"><b>${tt(l)}</b><small>${tt(OCCASION_BLURB[code])}</small></span></a>`)}
      </div>
    </section>

    ${marketing.length ? html`<section class="container section"><div class="promo-cards">${marketing.map((b) => html`<a class="promo-card ${b.color ?? "sky"}" href="${b.link_url || "/shop"}">
        <span class="promo-text"><b>${L(b, "title")}</b>${b.subtitle_en ? html`<span>${L(b, "subtitle")}</span>` : ""}<span class="link">${L(b, "cta") || t("shop")} →</span></span>
        ${b.image_url ? html`<img src="${b.image_url}" alt="" loading="lazy" width="200" height="200">` : ""}</a>`)}</div></section>` : ""}

    <section class="container section">
      <div class="section-head"><h2>${t("newArrivals")}</h2><a href="/shop?sort=newest">${t("viewAll")} ${icon("chevron")}</a></div>
      ${productGrid(data.newArrivals.slice(0, 8))}
    </section>

    ${data.bestSellers.length ? html`<section class="container section">
      <div class="section-head"><h2>${t("bestSellers")}</h2><a href="/shop?sort=popular">${t("viewAll")} ${icon("chevron")}</a></div>
      ${productGrid(data.bestSellers.slice(0, 8))}
    </section>` : ""}

    <section class="container section">
      <div class="gift-guide">
        <div class="gift-guide-text">
          <span class="eyebrow">${icon("gift")} ${t("giftingGuide")}</span>
          <h2>${lang() === "bn" ? "উপহার দেবেন? আমরা সাহায্য করি" : "Giving a gift? We'll help"}</h2>
          <p>${t("giftingGuideSub")}</p>
          <div class="gift-ages">${Object.entries(OCCASION_LABELS).map(([code, l]) => html`<a class="chip lg ${OCCASION_COLORS[code]}" href="/gift-finder?occasion=${code}">${tt(l)}</a>`)}</div>
          <a class="btn primary" href="/gift-finder">${t("findGift")} ${icon("chevron")}</a>
        </div>
        <div class="gift-guide-items">${productGrid(data.gifts.slice(0, 4))}</div>
      </div>
    </section>

    <section class="container section">
      <div class="section-head"><h2>${t("customerPhotos")}</h2></div>
      ${data.testimonials.length
        ? html`<div class="reviews-row">${data.testimonials.map((r) => html`<figure class="review-card">${r.photo_url ? html`<img class="review-photo" src="${r.photo_url}" alt="" loading="lazy" width="320" height="320">` : ""}${stars(r.rating)}<blockquote>“${r.body}”</blockquote><figcaption><b>${r.name}</b>${r.verified_purchase ? html` · <span class="verified">${icon("check")} ${t("verifiedPurchase")}</span>` : ""}<br><a class="small review-product" href="/product/${r.slug}">${r.product_image ? html`<img src="${r.product_image}" alt="" width="36" height="36" loading="lazy">` : ""}${L(r, "product")}</a></figcaption></figure>`)}</div>`
        : html`<p class="muted note-card">${t("noReviewsYet")}</p>`}
    </section>

    <section class="container section">
      <form class="newsletter" id="newsletter">
        <div><h2>${t("newsletter")}</h2><p class="muted">${t("newsletterSub")}</p></div>
        <div class="newsletter-row">
          <label class="sr-only" for="nl-contact">${t("emailOrPhone")}</label>
          <input class="input" id="nl-contact" name="contact" required placeholder="${t("emailOrPhone")}" autocomplete="email">
          <button class="btn primary" type="submit">${t("subscribe")}</button>
        </div>
      </form>
    </section>`);

  bindCards(el);
  // Simple, accessible hero slider (auto-advances; pauses when the tab is hidden).
  const slides = $$("[data-slide]", el), dots = $$("[data-dot]", el);
  let cur = 0;
  const show = (i) => {
    cur = (i + slides.length) % slides.length;
    slides.forEach((s, j) => (s.hidden = j !== cur));
    dots.forEach((d, j) => d.setAttribute("aria-current", String(j === cur)));
  };
  dots.forEach((d) => d.addEventListener("click", () => show(Number(d.dataset.dot))));
  if (slides.length > 1) {
    const timer = setInterval(() => { if (!document.hidden && el.isConnected) show(cur + 1); else if (!el.isConnected) clearInterval(timer); }, 6000);
  }
  $("#newsletter", el).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    try {
      const r = await api("/newsletter", { method: "POST", body: { contact: f.contact.value, lang: lang() } });
      toast(r[lang()] ?? r.en);
      f.reset();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  });
}
