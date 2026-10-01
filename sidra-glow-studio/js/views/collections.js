// Routine sets: the list of curated routines, and one routine with its products in order ("add the routine").
import { t, L, money, num } from "../i18n.js";
import { $, api, html, icon, errMsg } from "../core.js";
import { productCard, bindCards, collectionCards, skinLabel, emptyState, skeletonGrid, addToCart } from "../ui.js";

export default async function routines(el, { params }) {
  el.innerHTML = String(html`<div class="container section">${skeletonGrid(4)}</div>`);
  try {
    if (!params.slug) {
      const r = await api("/routines");
      document.title = `${t("collections")} | ${document.title.split("|").pop().trim()}`;
      el.innerHTML = String(html`<div class="container section">
        <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <span>${t("collections")}</span></nav>
        <h1>${t("collections")}</h1>
        <p class="muted">${t("giftingGuideSub")} <a href="/skin-quiz">${t("findGift")} →</a></p>
        ${r.routines.length ? collectionCards(r.routines) : emptyState(t("noResults"))}</div>`);
      return;
    }
    const r = await api(`/routines/${params.slug}`);
    const c = r.routine;
    const inStock = r.items.filter((p) => p.in_stock);
    const total = r.items.reduce((s, p) => s + (p.sale_price && p.sale_price < p.price ? p.sale_price : p.price), 0);
    document.title = `${L(c, "name")} | ${document.title.split("|").pop().trim()}`;
    el.innerHTML = String(html`<div class="container section">
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <a href="/routines">${t("collections")}</a> ${icon("chevron")} <span>${L(c, "name")}</span></nav>
      <header class="collection-hero">
        ${c.image_url ? html`<img src="${c.image_url}" alt="" width="640" height="640">` : ""}
        <div>
          <span class="eyebrow">${[c.time_of_day ? t(c.time_of_day) : "", c.skin_type ? skinLabel(c.skin_type) : t("allAges")].filter(Boolean).join(" · ")}</span>
          <h1>${L(c, "name")}</h1>
          ${c.description_en ? html`<p class="lead">${L(c, "description")}</p>` : ""}
          <p class="muted">${t("pieces", { n: num(r.items.length) })} · ${t("setPrice", { price: money(total) })}</p>
          ${inStock.length > 1 ? html`<button class="btn primary lg" type="button" id="add-all">${icon("bag")} ${t("addRoutine")} (${num(inStock.length)})</button>` : ""}
        </div>
      </header>
      ${r.items.length
        ? html`<ol class="routine-steps">${r.items.map((p, i) => html`<li><span class="step-no">${t("step", { n: num(i + 1) })}</span>${productCard(p)}</li>`)}</ol>`
        : emptyState(t("noResults"))}
      <p class="patch-note small">${icon("shield")} <span>${t("patchTest")}</span></p></div>`);
    bindCards(el);
    // "Add the routine": adds the first in-stock option of every product; sizes can be changed in the cart.
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
    el.innerHTML = String(html`<div class="container section">${e.status === 404 ? emptyState(t("notFound"), "", html`<a class="btn primary" href="/routines">${t("collections")}</a>`) : html`<p class="error-box">${errMsg(e)}</p>`}</div>`);
  }
}
