// Reusable storefront pieces: product cards, rating stars, wellness-need chips, collection, kit and journal cards,
// certification badges, the product disclaimer, loading/empty/error states.
import { t, L, money, num, lang, tt, date } from "./i18n.js";
import { html, raw, icon, wishlist, toast, cart } from "./core.js";
import { track } from "./track.js";

/** Wellness needs (shop filter, collections, kit builder). An area of wellbeing — never a disease. */
export const CONCERN_LABELS = {
  digestion: { en: "Digestion", bn: "হজম" },
  skin: { en: "Skin", bn: "ত্বক" },
  hair: { en: "Hair", bn: "চুল" },
  immunity: { en: "Immunity", bn: "রোগ প্রতিরোধ ক্ষমতা" },
  sleep: { en: "Sleep & calm", bn: "ঘুম ও প্রশান্তি" },
};
export const CONCERN_COLORS = { digestion: "yellow", skin: "peach", hair: "lavender", immunity: "mint", sleep: "sky" };
export const CONCERN_ICONS = { digestion: "tea", skin: "drop", hair: "comb", immunity: "shield", sleep: "moon" };
export const concernLabel = (k) => (CONCERN_LABELS[k] ? tt(CONCERN_LABELS[k]) : k);

export const stars = (n, size = "sm") =>
  raw(`<span class="stars ${size}" aria-label="${Number(n).toFixed(1)} / 5">${[1, 2, 3, 4, 5].map((i) => `<svg class="icon ${i <= Math.round(n) ? "on" : ""}" aria-hidden="true"><use href="#i-star"/></svg>`).join("")}</span>`);

/** Wellness-need chips; an empty list means the product isn't aimed at one particular need. */
export const concernChips = (list, max = 3) => {
  const l = list ?? [];
  if (!l.length) return "";
  return html`<span class="occ-chips">${l.slice(0, max).map((a) => html`<span class="chip ${CONCERN_COLORS[a] ?? ""}">${concernLabel(a)}</span>`)}${l.length > max ? html`<span class="chip">+${num(l.length - max)}</span>` : ""}</span>`;
};

export function productCard(p) {
  const saved = wishlist.ids().has(p.id);
  const price = p.sale_price && p.sale_price < p.price ? p.sale_price : p.price;
  return html`<article class="card product-card">
    <a class="thumb" href="/product/${p.slug}" aria-label="${L(p, "name")}">
      <img src="${p.images?.[0] ?? "img/logo.svg"}" alt="" loading="lazy" width="400" height="400">
      ${p.discount_percent ? html`<span class="tag sale">-${num(p.discount_percent)}%</span>` : ""}
      ${!p.in_stock ? html`<span class="tag soldout">${t("outOfStock")}</span>` : ""}
      ${p.is_kit ? html`<span class="tag kit">${icon("box")} ${t("kit")}</span>` : ""}
      ${p.delivery_mode === "free" ? html`<span class="tag free-ship">${icon("truck")} ${t("freeDelivery")}</span>` : ""}
    </a>
    <button class="wish ${saved ? "on" : ""}" type="button" data-wish="${p.id}" aria-pressed="${saved}" aria-label="${t("wishlist")}">${icon("heart")}</button>
    <div class="body">
      ${concernChips(p.concerns, 2)}
      <h3><a href="/product/${p.slug}">${L(p, "name")}</a></h3>
      ${p.size_label && p.size_label !== "Standard" ? html`<span class="muted small size-label">${p.size_label}${p.variant_count > 1 ? " +" : ""}</span>` : ""}
      ${p.rating_count ? html`<div class="rating">${stars(p.rating_avg)} <span class="muted small">(${num(p.rating_count)})</span></div>` : ""}
      <div class="price-row"><b class="price">${money(price)}</b>${price < p.price ? html`<s class="muted">${money(p.price)}</s>` : ""}</div>
    </div>
  </article>`;
}

/** Collection cards: cover photo, name, wellness need, product count and the combined price. */
export const collectionCards = (items) => html`<div class="collection-grid">${items.map((c) => html`<a class="collection-card ${CONCERN_COLORS[c.concern] ?? "mint"}" href="/collections/${c.slug}">
    <span class="cc-img"><img src="${c.image_url ?? "img/logo.svg"}" alt="" loading="lazy" width="480" height="480"></span>
    <span class="cc-body"><span class="eyebrow">${c.concern ? html`${icon(CONCERN_ICONS[c.concern] ?? "leaf")} ${concernLabel(c.concern)}` : html`${icon("leaf")} ${t("allAges")}`}</span><b>${L(c, "name")}</b>
      <small class="muted">${t("pieces", { n: num(c.piece_count) })}${c.set_price ? html` · ${t("setPrice", { price: money(c.set_price) })}` : ""}</small>
      <span class="link">${t("shopTheSet")} →</span></span></a>`)}</div>`;

/** Journal cards. */
export const postCards = (items) => html`<div class="journal-grid">${items.map((p) => html`<a class="journal-card" href="/journal/${p.slug}">
    <span class="jc-img"><img src="${p.cover_url ?? "img/og-cover.png"}" alt="" loading="lazy" width="560" height="360"></span>
    <span class="jc-body">${p.published_at ? html`<span class="eyebrow">${icon("book")} ${date(p.published_at)}</span>` : ""}<b>${L(p, "title")}</b>
      <small class="muted">${L(p, "excerpt")}</small><span class="link">${t("readMore")} →</span></span></a>`)}</div>`;

/** Certification badges (only ever given certifications the shop holds proof for — the API filters them). */
export const certBadges = (list, { note = true } = {}) =>
  list?.length
    ? html`<div class="certs" aria-label="${t("certified")}">${list.map((c) => html`<span class="cert-badge" title="${[c.issuer ? `${t("issuer")}: ${c.issuer}` : "", c.valid_until ? `${t("validUntil")}: ${date(c.valid_until)}` : ""].filter(Boolean).join(" · ")}">${icon(c.icon || "shield")} ${L(c, "name")}</span>`)}${note ? html`<p class="small muted">${t("certNote")}</p>` : ""}</div>`
    : "";

/**
 * The product disclaimer (hard requirement): shown on every product, kit and journal page, at checkout and in the
 * footer. The wording is edited in one place — Admin → Settings → Store information.
 */
const DEFAULT_DISCLAIMER = {
  en: "These statements have not been evaluated for diagnosing, treating, curing, or preventing any disease. Consult a physician before use, especially if pregnant, nursing, or on medication.",
  bn: "এই তথ্যগুলো কোনো রোগ নির্ণয়, চিকিৎসা, নিরাময় বা প্রতিরোধের জন্য মূল্যায়ন করা হয়নি। ব্যবহারের আগে চিকিৎসকের পরামর্শ নিন, বিশেষ করে গর্ভাবস্থায়, স্তন্যদানকালে বা অন্য ওষুধ সেবন করলে।",
};
export const disclaimer = (store, { compact = false } = {}) => {
  // Falls back to the standard wording if the settings haven't loaded, so the disclaimer is never missing.
  const text = (lang() === "bn" ? store?.disclaimer_bn || store?.disclaimer_en : store?.disclaimer_en || store?.disclaimer_bn) || tt(DEFAULT_DISCLAIMER);
  return html`<aside class="disclaimer ${compact ? "compact" : ""}" role="note">${icon("info")}<p>${compact ? "" : html`<b>${t("disclaimerTitle")}:</b> `}${text}</p></aside>`;
};

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

export const STATUS_STEPS = ["pending", "confirmed", "packed", "shipped", "delivered"];
