// Collections and kits: the list of curated collections, one collection with its products ("add the collection"),
// and the wellness-kits page (ready-made kits, each packed and stocked as one box).
import { t, L, money, num } from "../i18n.js";
import { $, api, html, icon, errMsg, config } from "../core.js";
import { productCard, productGrid, bindCards, collectionCards, emptyState, skeletonGrid, addToCart, concernLabel, CONCERN_ICONS, disclaimer } from "../ui.js";

const setTitle = (s) => (document.title = `${s} | ${document.title.split("|").pop().trim()}`);

export default async function collections(el, { params, variant }) {
  el.innerHTML = String(html`<div class="container section">${skeletonGrid(4)}</div>`);
  try {
    const cfg = await config().catch(() => ({}));
    if (variant === "kits") {
      const r = await api("/products?kit=1&limit=48&sort=popular");
      setTitle(t("kits"));
      el.innerHTML = String(html`<div class="container section">
        <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <span>${t("kits")}</span></nav>
        <h1 class="sprig-title">${t("kits")}</h1>
        <p class="muted">${t("kitsSub")} <a href="/kit-builder">${t("findGift")} →</a></p>
        ${r.items.length ? productGrid(r.items) : emptyState(t("noResults"), "", html`<a class="btn primary" href="/kit-builder">${t("findGift")}</a>`)}
        ${disclaimer(cfg.store)}</div>`);
      bindCards(el);
      return;
    }
    if (!params.slug) {
      const r = await api("/collections");
      setTitle(t("collections"));
      el.innerHTML = String(html`<div class="container section">
        <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <span>${t("collections")}</span></nav>
        <h1 class="sprig-title">${t("collections")}</h1>
        <p class="muted">${t("giftingGuideSub")} <a href="/kit-builder">${t("findGift")} →</a></p>
        ${r.collections.length ? collectionCards(r.collections) : emptyState(t("noResults"))}</div>`);
      return;
    }
    const r = await api(`/collections/${params.slug}`);
    const c = r.collection;
    const inStock = r.items.filter((p) => p.in_stock);
    const total = r.items.reduce((s, p) => s + (p.sale_price && p.sale_price < p.price ? p.sale_price : p.price), 0);
    setTitle(L(c, "name"));
    el.innerHTML = String(html`<div class="container section">
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <a href="/collections">${t("collections")}</a> ${icon("chevron")} <span>${L(c, "name")}</span></nav>
      <header class="collection-hero">
        ${c.image_url ? html`<img src="${c.image_url}" alt="" width="640" height="640">` : ""}
        <div>
          <span class="eyebrow">${c.concern ? html`${icon(CONCERN_ICONS[c.concern] ?? "leaf")} ${concernLabel(c.concern)}` : html`${icon("leaf")} ${t("allAges")}`}</span>
          <h1>${L(c, "name")}</h1>
          ${c.description_en ? html`<p class="lead">${L(c, "description")}</p>` : ""}
          <p class="muted">${t("pieces", { n: num(r.items.length) })} · ${t("setPrice", { price: money(total) })}</p>
          ${inStock.length > 1 ? html`<button class="btn primary lg" type="button" id="add-all">${icon("bag")} ${t("addRoutine")} (${num(inStock.length)})</button>` : ""}
        </div>
      </header>
      ${r.items.length ? html`<div class="grid products">${r.items.map(productCard)}</div>` : emptyState(t("noResults"))}
      <p class="safe-note small">${icon("shield")} <span>${t("safeUse")}</span></p>
      ${disclaimer(cfg.store)}</div>`);
    bindCards(el);
    // "Add the collection": adds the first in-stock option of every product; sizes can be changed in the cart.
    $("#add-all", el)?.addEventListener("click", async (e) => {
      e.currentTarget.disabled = true;
      for (const p of inStock) {
        const d = await api(`/products/${p.slug}`).catch(() => null);
        const v = d?.variants.find((x) => x.stock > 0);
        if (v) addToCart(d.product, v, 1);
      }
      e.currentTarget.disabled = false;
    });
  } catch (e) {
    el.innerHTML = String(html`<div class="container section">${e.status === 404 ? emptyState(t("notFound"), "", html`<a class="btn primary" href="/collections">${t("collections")}</a>`) : html`<p class="error-box">${errMsg(e)}</p>`}</div>`);
  }
}
