// Collections & sets: the list of curated looks, and one collection with all its pieces ("shop the set").
import { t, L, money, num } from "../i18n.js";
import { $, api, html, icon, errMsg, raw } from "../core.js";
import { productGrid, bindCards, collectionCards, occasionLabel, emptyState, skeletonGrid, addToCart } from "../ui.js";

export default async function collections(el, { params }) {
  el.innerHTML = String(html`<div class="container section">${skeletonGrid(4)}</div>`);
  try {
    if (!params.slug) {
      const r = await api("/collections");
      document.title = `${t("collections")} | ${document.title.split("|").pop().trim()}`;
      el.innerHTML = String(html`<div class="container section">
        <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <span>${t("collections")}</span></nav>
        <h1>${t("collections")}</h1>
        ${r.collections.length ? collectionCards(r.collections) : emptyState(t("noResults"))}</div>`);
      return;
    }
    const r = await api(`/collections/${params.slug}`);
    const c = r.collection;
    const inStock = r.items.filter((p) => p.in_stock);
    const total = r.items.reduce((s, p) => s + (p.sale_price && p.sale_price < p.price ? p.sale_price : p.price), 0);
    document.title = `${L(c, "name")} | ${document.title.split("|").pop().trim()}`;
    el.innerHTML = String(html`<div class="container section">
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <a href="/collections">${t("collections")}</a> ${icon("chevron")} <span>${L(c, "name")}</span></nav>
      <header class="collection-hero">
        ${c.image_url ? html`<img src="${c.image_url}" alt="" width="640" height="640">` : ""}
        <div>
          ${c.occasion ? html`<span class="eyebrow">${occasionLabel(c.occasion)}</span>` : ""}
          <h1>${L(c, "name")}</h1>
          ${c.description_en ? html`<p class="lead">${L(c, "description")}</p>` : ""}
          <p class="muted">${t("pieces", { n: num(r.items.length) })} · ${t("setPrice", { price: money(total) })}</p>
          ${inStock.length > 1 ? html`<button class="btn primary lg" type="button" id="add-all">${icon("bag")} ${t("shopTheSet")} (${num(inStock.length)})</button>` : ""}
        </div>
      </header>
      ${r.items.length ? productGrid(r.items) : emptyState(t("noResults"))}</div>`);
    bindCards(el);
    // "Shop the set": adds the first in-stock option of every piece; sizes can be changed in the cart.
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
  void raw;
}
