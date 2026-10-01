// Reusable storefront pieces: product cards, rating stars, occasion chips, ring / bangle size guides, loading/empty/error states.
import { t, L, money, num, lang, tt } from "./i18n.js";
import { html, raw, icon, wishlist, toast, overlay, cart } from "./core.js";
import { track } from "./track.js";

export const OCCASION_LABELS = {
  everyday: { en: "Everyday", bn: "প্রতিদিন" },
  festive: { en: "Festive", bn: "উৎসব" },
  bridal: { en: "Bridal", bn: "ব্রাইডাল" },
};
export const OCCASION_COLORS = { everyday: "sky", festive: "yellow", bridal: "pink" };
export const OCCASION_BLURB = {
  everyday: { en: "Light pieces for office, campus and every day", bn: "অফিস, ক্যাম্পাস ও প্রতিদিনের হালকা গয়না" },
  festive: { en: "Eid, Puja, Boishakh and wedding dawats", bn: "ঈদ, পূজা, বৈশাখ ও বিয়ের দাওয়াত" },
  bridal: { en: "Holud, wedding and reception statement sets", bn: "হলুদ, বিয়ে ও রিসেপশনের জমকালো সেট" },
};
export const occasionLabel = (a) => (OCCASION_LABELS[a] ? tt(OCCASION_LABELS[a]) : t("allAges"));

export const stars = (n, size = "sm") =>
  raw(`<span class="stars ${size}" aria-label="${Number(n).toFixed(1)} / 5">${[1, 2, 3, 4, 5].map((i) => `<svg class="icon ${i <= Math.round(n) ? "on" : ""}" aria-hidden="true"><use href="#i-star"/></svg>`).join("")}</span>`);

export const occasionChips = (list) => html`<span class="occ-chips">${(list ?? []).map((a) => html`<span class="chip ${OCCASION_COLORS[a] ?? ""}">${occasionLabel(a)}</span>`)}</span>`;

export function productCard(p) {
  const saved = wishlist.ids().has(p.id);
  const price = p.sale_price && p.sale_price < p.price ? p.sale_price : p.price;
  return html`<article class="card product-card">
    <a class="thumb" href="/product/${p.slug}" aria-label="${L(p, "name")}">
      <img src="${p.images?.[0] ?? "img/logo.svg"}" alt="" loading="lazy" width="400" height="400">
      ${p.discount_percent ? html`<span class="tag sale">-${num(p.discount_percent)}%</span>` : ""}
      ${!p.in_stock ? html`<span class="tag soldout">${t("outOfStock")}</span>` : ""}
      ${p.delivery_mode === "free" ? html`<span class="tag free-ship">${icon("truck")} ${t("freeDelivery")}</span>` : ""}
    </a>
    <button class="wish ${saved ? "on" : ""}" type="button" data-wish="${p.id}" aria-pressed="${saved}" aria-label="${t("wishlist")}">${icon("heart")}</button>
    <div class="body">
      ${occasionChips(p.occasions)}
      <h3><a href="/product/${p.slug}">${L(p, "name")}</a></h3>
      ${p.rating_count ? html`<div class="rating">${stars(p.rating_avg)} <span class="muted small">(${num(p.rating_count)})</span></div>` : ""}
      <div class="price-row"><b class="price">${money(price)}</b>${price < p.price ? html`<s class="muted">${money(p.price)}</s>` : ""}</div>
    </div>
  </article>`;
}

/** Collection / set cards: cover photo, name, piece count and the combined price. */
export const collectionCards = (items) => html`<div class="collection-grid">${items.map((c) => html`<a class="collection-card ${OCCASION_COLORS[c.occasion] ?? ""}" href="/collections/${c.slug}">
    <span class="cc-img"><img src="${c.image_url ?? "img/logo.svg"}" alt="" loading="lazy" width="480" height="480"></span>
    <span class="cc-body">${c.occasion ? html`<span class="eyebrow">${occasionLabel(c.occasion)}</span>` : ""}<b>${L(c, "name")}</b>
      <small class="muted">${t("pieces", { n: num(c.piece_count) })}${c.set_price ? html` · ${t("setPrice", { price: money(c.set_price) })}` : ""}</small>
      <span class="link">${t("shopTheSet")} →</span></span></a>`)}</div>`;

export const productGrid = (items) => html`<div class="grid products">${items.map(productCard)}</div>`;
export const skeletonGrid = (n = 8) => raw(`<div class="grid products">${Array.from({ length: n }, () => '<div class="card skel-card"><div class="skel sq"></div><div class="skel line"></div><div class="skel line short"></div></div>').join("")}</div>`);
export const emptyState = (title, sub = "", action = "") => html`<div class="state"><div class="blob-icon">${icon("search")}</div><h3>${title}</h3>${sub ? html`<p class="muted">${sub}</p>` : ""}${action}</div>`;
export const errorState = (msg) => html`<div class="state"><p class="error-box">${msg}</p><button class="btn" type="button" data-retry>${t("retry")}</button></div>`;

/** Wires wishlist hearts inside a container (event delegation). */
export function bindCards(root) {
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-wish]");
    if (!b) return;
    e.preventDefault();
    const on = await wishlist.toggle(Number(b.dataset.wish));
    b.classList.toggle("on", on);
    b.setAttribute("aria-pressed", String(on));
  });
}

/** Adds a variant to the cart and fires AddToCart (Pixel + Conversions API relay + GA4). */
export function addToCart(product, variant, qty = 1) {
  const unitPrice = variant.price_override ?? (product.sale_price && product.sale_price < product.price ? product.sale_price : product.price);
  cart.add({ variantId: variant.id, productId: product.id, slug: product.slug, sku: variant.sku, name_en: product.name_en, name_bn: product.name_bn, size: variant.size, color: variant.color, image: product.images?.[0], unitPrice }, qty);
  track("AddToCart", { value: unitPrice * qty, items: [{ sku: variant.sku, name: product.name_en, price: unitPrice, quantity: qty }] });
  toast(t("added"));
}

// ---------- Ring & bangle size guides (ADJUSTABLE) ----------
// Rings: US sizes with inner diameter / circumference and the nearest Indian (also used in Bangladesh) size.
const RING_CHART = [
  ["US 5", 15.7, 49.3, 9],
  ["US 6", 16.5, 51.9, 12],
  ["US 7", 17.3, 54.4, 14],
  ["US 8", 18.1, 57.0, 17],
  ["US 9", 18.9, 59.5, 19],
  ["US 10", 19.8, 62.1, 22],
];
// Bangles: sizes read as inches + sixteenths of an inch of inner diameter ("2.6" = 2 6/16 in = 60.3 mm).
const BANGLE_CHART = [
  ["2.2", 54.0, 169.6],
  ["2.4", 57.2, 179.6],
  ["2.6", 60.3, 189.5],
  ["2.8", 63.5, 199.5],
  ["2.10", 66.7, 209.4],
];
const mm = (v) => `${num(v.toFixed(1))} mm`;
const bn = () => lang() === "bn";
export const sizeChartTable = (kind = "ring") =>
  kind === "bangle"
    ? html`<table class="table size-table">
        <thead><tr><th>${t("size")}</th><th>${bn() ? "ভেতরের ব্যাস" : "Inner diameter"}</th><th>${bn() ? "ভেতরের পরিধি" : "Inner circumference"}</th></tr></thead>
        <tbody>${BANGLE_CHART.map(([s, d, c]) => html`<tr><td><b>${s}</b></td><td>${mm(d)}</td><td>${mm(c)}</td></tr>`)}</tbody></table>
      <p class="small muted">${bn() ? "চুড়ির সাইজ ইঞ্চি ও ১৬ ভাগের হিসাবে: ২.৬ মানে ভেতরের ব্যাস ২ ৬/১৬ ইঞ্চি।" : "Bangle sizes are inches and sixteenths: 2.6 means an inner diameter of 2 6/16 inches."}</p>
      <ol class="small guide-steps">
        <li>${bn() ? "হাতের আঙুলগুলো একসাথে করে (যেভাবে চুড়ি পরেন) সবচেয়ে চওড়া অংশ ফিতা দিয়ে মাপুন।" : "Bring your fingers together as if slipping on a bangle and measure around the widest part of your hand."}</li>
        <li>${bn() ? "মাপটি টেবিলের “ভেতরের পরিধি”র সাথে মিলিয়ে নিন; মাঝামাঝি হলে বড়টি নিন।" : "Match it to the inner circumference above; between sizes, go one up."}</li>
        <li>${bn() ? "অথবা আপনার পুরোনো একটি চুড়ির ভেতরের ব্যাস মাপুন।" : "Or measure the inside diameter of a bangle that already fits you."}</li>
      </ol>`
    : html`<table class="table size-table">
        <thead><tr><th>${t("size")}</th><th>${bn() ? "ভেতরের ব্যাস" : "Inner diameter"}</th><th>${bn() ? "ভেতরের পরিধি" : "Inner circumference"}</th><th>${bn() ? "≈ ভারতীয়/বাংলাদেশি সাইজ" : "≈ Indian / BD size"}</th></tr></thead>
        <tbody>${RING_CHART.map(([s, d, c, ind]) => html`<tr><td><b>${s}</b></td><td>${mm(d)}</td><td>${mm(c)}</td><td>${num(ind)}</td></tr>`)}</tbody></table>
      <ol class="small guide-steps">
        <li>${bn() ? "একটি সুতা বা কাগজের ফালি আঙুলের গোড়ায় পেঁচিয়ে দাগ দিন।" : "Wrap a thread or paper strip around the base of your finger and mark where it meets."}</li>
        <li>${bn() ? "স্কেলে মিলিমিটারে মাপুন — এটিই “ভেতরের পরিধি”।" : "Measure it in millimetres — that's the inner circumference."}</li>
        <li>${bn() ? "অথবা আপনার একটি আংটির ভেতরের ব্যাস মাপুন। সন্ধ্যায় আঙুল একটু ফোলে, তখন মাপা ভালো।" : "Or measure the inside diameter of a ring that fits. Fingers swell a little in the evening — measure then."}</li>
      </ol>`;
export const openSizeChart = (kind = "ring") => overlay("modal", { title: kind === "bangle" ? t("bangleSizeGuide") : t("ringSizeGuide"), body: sizeChartTable(kind) });

export const STATUS_STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"];
