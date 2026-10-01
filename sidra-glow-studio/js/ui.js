// Reusable storefront pieces: product cards, rating stars, skin-type / concern chips, routine and treatment cards,
// the skin-type guide, loading/empty/error states.
import { t, L, money, num, lang, tt } from "./i18n.js";
import { html, raw, icon, wishlist, toast, overlay, cart } from "./core.js";
import { track } from "./track.js";

export const SKIN_LABELS = {
  oily: { en: "Oily", bn: "তৈলাক্ত" },
  dry: { en: "Dry", bn: "শুষ্ক" },
  combination: { en: "Combination", bn: "মিশ্র" },
  normal: { en: "Normal", bn: "স্বাভাবিক" },
  sensitive: { en: "Sensitive", bn: "সংবেদনশীল" },
  acne_prone: { en: "Acne-prone", bn: "ব্রণপ্রবণ" },
};
export const SKIN_COLORS = { oily: "mint", dry: "peach", combination: "lavender", normal: "sky", sensitive: "pink", acne_prone: "yellow" };
export const CONCERN_LABELS = {
  brightening: { en: "Brightening & dark spots", bn: "উজ্জ্বলতা ও কালো দাগ" },
  hydration: { en: "Hydration", bn: "আর্দ্রতা" },
  anti_aging: { en: "Fine lines & firmness", bn: "সূক্ষ্ম রেখা ও টানটান ভাব" },
  acne: { en: "Blemish-prone skin", bn: "ব্রণপ্রবণ ত্বকের যত্ন" },
  pores: { en: "Pores & oil control", bn: "লোমকূপ ও তেল নিয়ন্ত্রণ" },
  dullness: { en: "Dullness & uneven tone", bn: "নিস্তেজ ও অসমান ত্বক" },
  sun_care: { en: "Sun care", bn: "রোদ থেকে সুরক্ষা" },
  barrier: { en: "Skin barrier & redness", bn: "স্কিন ব্যারিয়ার ও লালচে ভাব" },
};
export const CONCERN_COLORS = { brightening: "yellow", hydration: "sky", anti_aging: "lavender", acne: "mint", pores: "mint", dullness: "peach", sun_care: "yellow", barrier: "pink" };
export const CONCERN_ICONS = { brightening: "sparkle", hydration: "drop", anti_aging: "clock", acne: "leaf", pores: "leaf", dullness: "sparkle", sun_care: "sparkle", barrier: "shield" };
export const skinLabel = (k) => (SKIN_LABELS[k] ? tt(SKIN_LABELS[k]) : t("allAges"));
export const concernLabel = (k) => (CONCERN_LABELS[k] ? tt(CONCERN_LABELS[k]) : k);

export const stars = (n, size = "sm") =>
  raw(`<span class="stars ${size}" aria-label="${Number(n).toFixed(1)} / 5">${[1, 2, 3, 4, 5].map((i) => `<svg class="icon ${i <= Math.round(n) ? "on" : ""}" aria-hidden="true"><use href="#i-star"/></svg>`).join("")}</span>`);

/** Skin-type chips; an empty list means the product suits every skin type. */
export const skinChips = (list, max = 3) => {
  const l = list ?? [];
  if (!l.length) return html`<span class="occ-chips"><span class="chip sage">${t("suitsAll")}</span></span>`;
  return html`<span class="occ-chips">${l.slice(0, max).map((a) => html`<span class="chip ${SKIN_COLORS[a] ?? ""}">${skinLabel(a)}</span>`)}${l.length > max ? html`<span class="chip">+${num(l.length - max)}</span>` : ""}</span>`;
};

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
      ${skinChips(p.skin_types, 2)}
      <h3><a href="/product/${p.slug}">${L(p, "name")}</a></h3>
      ${p.size_label && p.size_label !== "Standard" ? html`<span class="muted small size-label">${p.size_label}${p.variant_count > 1 ? " +" : ""}</span>` : ""}
      ${p.rating_count ? html`<div class="rating">${stars(p.rating_avg)} <span class="muted small">(${num(p.rating_count)})</span></div>` : ""}
      <div class="price-row"><b class="price">${money(price)}</b>${price < p.price ? html`<s class="muted">${money(p.price)}</s>` : ""}</div>
    </div>
  </article>`;
}

/** Routine-set cards: cover photo, name, skin type / time of day, product count and the combined price. */
export const collectionCards = (items) => html`<div class="collection-grid">${items.map((c) => html`<a class="collection-card ${SKIN_COLORS[c.skin_type] ?? "pink"}" href="/routines/${c.slug}">
    <span class="cc-img"><img src="${c.image_url ?? "img/logo.svg"}" alt="" loading="lazy" width="480" height="480"></span>
    <span class="cc-body"><span class="eyebrow">${[c.time_of_day ? t(c.time_of_day) : "", c.skin_type ? skinLabel(c.skin_type) : t("allAges")].filter(Boolean).join(" · ")}</span><b>${L(c, "name")}</b>
      <small class="muted">${t("pieces", { n: num(c.piece_count) })}${c.set_price ? html` · ${t("setPrice", { price: money(c.set_price) })}` : ""}</small>
      <span class="link">${t("shopTheSet")} →</span></span></a>`)}</div>`;

/** Studio treatment cards. */
export const treatmentCards = (items) => html`<div class="treatment-grid">${items.map((tr) => html`<a class="treatment-card" href="/treatments/${tr.slug}">
    <span class="tc-img"><img src="${tr.image_url ?? "img/og-cover.png"}" alt="" loading="lazy" width="480" height="480"></span>
    <span class="tc-body"><span class="eyebrow">${icon("clock")} ${t("minutes", { n: num(tr.duration_min) })}</span><b>${L(tr, "name")}</b>
      <small class="muted">${L(tr, "summary")}</small>
      <span class="tc-foot"><span class="price-row"><b class="price">${money(tr.sale_price ?? tr.price)}</b>${tr.sale_price ? html`<s class="muted">${money(tr.price)}</s>` : ""}</span><span class="btn sm primary">${t("book")}</span></span></span></a>`)}</div>`;

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

// ---------- Skin-type guide ----------
const SKIN_GUIDE = [
  ["oily", { en: "Shiny all over by midday; pores look larger on the nose and cheeks.", bn: "দুপুরের মধ্যে পুরো মুখ চকচকে; নাক ও গালের লোমকূপ বড় দেখায়।" }, { en: "Gel cleansers, niacinamide, oil-free gel moisturisers, gel sunscreen.", bn: "জেল ক্লেনজার, নায়াসিনামাইড, অয়েল-ফ্রি জেল ময়েশ্চারাইজার, জেল সানস্ক্রিন।" }],
  ["dry", { en: "Feels tight after washing; can look flaky or dull.", bn: "ধোয়ার পর টানটান লাগে; খসখসে বা নিস্তেজ দেখাতে পারে।" }, { en: "Cream or balm cleansers, hyaluronic acid, ceramide creams.", bn: "ক্রিম বা বাম ক্লেনজার, হায়ালুরোনিক অ্যাসিড, সেরামাইড ক্রিম।" }],
  ["combination", { en: "Shiny forehead and nose, normal or dry cheeks.", bn: "কপাল ও নাক চকচকে, গাল স্বাভাবিক বা শুষ্ক।" }, { en: "Gentle foam cleansers, light layers, gel-creams.", bn: "কোমল ফোম ক্লেনজার, হালকা স্তর, জেল-ক্রিম।" }],
  ["normal", { en: "Comfortable most of the day — neither tight nor shiny.", bn: "সারাদিন আরামদায়ক — টানটানও না, চকচকেও না।" }, { en: "Keep it simple: cleanse, moisturise, SPF.", bn: "সহজ রাখুন: ক্লেনজ, ময়েশ্চারাইজ, SPF।" }],
  ["sensitive", { en: "Reddens, stings or itches easily with new products or heat.", bn: "নতুন পণ্য বা গরমে সহজে লাল হয়, জ্বালা বা চুলকায়।" }, { en: "Fragrance-free, centella, ceramides, mineral sunscreen — patch-test everything.", bn: "সুগন্ধিমুক্ত, সেন্টেলা, সেরামাইড, মিনারেল সানস্ক্রিন — সবকিছু প্যাচ টেস্ট করুন।" }],
  ["acne_prone", { en: "Gets blemishes and clogged pores often.", bn: "প্রায়ই ব্রণ ও বন্ধ লোমকূপ হয়।" }, { en: "Salicylic acid, niacinamide, non-comedogenic moisturisers, blemish patches.", bn: "স্যালিসাইলিক অ্যাসিড, নায়াসিনামাইড, নন-কমেডোজেনিক ময়েশ্চারাইজার, ব্লেমিশ প্যাচ।" }],
];
export const skinGuideTable = () => html`<table class="table size-table">
    <thead><tr><th>${t("skinType")}</th><th>${lang() === "bn" ? "লক্ষণ" : "How it feels"}</th><th>${lang() === "bn" ? "কী মানায়" : "What helps"}</th></tr></thead>
    <tbody>${SKIN_GUIDE.map(([k, how, what]) => html`<tr><td><span class="chip ${SKIN_COLORS[k]}">${skinLabel(k)}</span></td><td>${tt(how)}</td><td>${tt(what)}</td></tr>`)}</tbody></table>
  <p class="small muted">${t("skinHelp")}</p>`;
export const openSkinGuide = () => overlay("modal", { title: t("sizeGuide"), body: skinGuideTable() });

export const STATUS_STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"];
