// Product detail: gallery with zoom, wellness-need tags, size / weight options, honest stock and the best-before date
// of the batch the order will be packed from, key herbs, the "traditional use" block with the disclaimer right next to
// it (hard requirement), the full ingredient / composition list, certification badges the shop holds proof for, kit
// contents with the real separate price, kits this product is in, reviews, "goes well with", related products,
// back-in-stock.
import { t, L, lang, money, num, date } from "../i18n.js";
import { $, $$, api, html, icon, errMsg, toast, overlay, wishlist, normalizePhone, showFieldErrors, config } from "../core.js";
import { productGrid, bindCards, concernChips, stars, addToCart, emptyState, certBadges, disclaimer, CONCERN_COLORS, concernLabel } from "../ui.js";
import { track } from "../track.js";

/** "2027-06-30" → "Jun 2027" / "জুন ২০২৭" */
const monthYear = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(lang() === "bn" ? "bn-BD" : "en-GB", { month: "short", year: "numeric", timeZone: "UTC" });
const lines = (s) => (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

export default async function product(el, { params, navigate }) {
  el.innerHTML = String(html`<div class="container section"><div class="pdp"><div class="skel sq big"></div><div><div class="skel line"></div><div class="skel line short"></div><div class="skel line"></div></div></div></div>`);
  let d;
  try {
    d = await api(`/products/${params.slug}`);
  } catch (e) {
    el.innerHTML = String(html`<div class="container section">${e.status === 404 ? emptyState(t("notFound"), "", html`<a class="btn primary" href="/shop">${t("shop")}</a>`) : html`<p class="error-box">${errMsg(e)}</p>`}</div>`);
    return;
  }
  const p = d.product;
  const variants = d.variants;
  const sizes = [...new Set(variants.map((v) => v.size))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];
  let size = variants.find((v) => v.stock > 0)?.size ?? sizes[0];
  let color = variants.find((v) => v.stock > 0 && v.size === size)?.color ?? colors[0] ?? "";
  let qty = 1;
  const current = () => variants.find((v) => v.size === size && (v.color || "") === (color || "")) ?? null;
  const priceOf = (v) => v?.price_override ?? (p.sale_price && p.sale_price < p.price ? p.sale_price : p.price);
  const basePrice = (v) => v?.price_override ?? p.price;
  document.title = `${L(p, "name")} | ${document.title.split("|").pop().trim()}`;
  const cfg = await config().catch(() => ({}));
  const hero = p.hero_ingredients ?? [];
  const traditional = L(p, "traditional_use");
  const heroNames = hero.map((h) => h.name.toLowerCase().replace(/\s*[\d.]+%.*$/, "").replace(/\s*\(.*\)$/, "").trim()).filter((n) => n.length > 2);

  el.innerHTML = String(html`
    <div class="container section">
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a>${d.breadcrumbs.map((c) => html` ${icon("chevron")} <a href="/shop/${c.slug}">${L(c, "name")}</a>`)} ${icon("chevron")} <span>${L(p, "name")}</span></nav>
      <div class="pdp">
        <div class="gallery">
          <div class="main-img" id="zoom" title="${t("zoomHint")}"><img id="main-img" src="${p.images[0] ?? "img/logo.svg"}" alt="${L(p, "name")}" width="800" height="800"><span class="zoom-hint">${icon("search")}</span></div>
          ${p.images.length > 1 ? html`<div class="thumbs">${p.images.map((src, i) => html`<button type="button" data-img="${src}" aria-label="${i + 1}" aria-current="${i === 0}"><img src="${src}" alt="" width="80" height="80" loading="lazy"></button>`)}</div>` : ""}
        </div>
        <div class="buy-box">
          ${p.is_kit ? html`<span class="chip lg peach">${icon("box")} ${t("kit")}</span>` : ""}
          <h1>${L(p, "name")}</h1>
          <p class="muted small">${[p.brand, p.origin ? t("madeIn", { c: p.origin }) : ""].filter(Boolean).join(" · ")}</p>
          ${p.rating_count ? html`<a class="rating" href="#reviews">${stars(p.rating_avg)} <span class="muted small">${num(p.rating_avg.toFixed(1))} · ${num(p.rating_count)} ${t("reviews")}</span></a>` : ""}
          <div class="price-row big"><b class="price" id="price"></b><s class="muted" id="was"></s><span class="tag sale" id="off" hidden></span></div>
          ${p.concerns?.length ? html`<div class="concern-chips">${p.concerns.map((c) => html`<a class="chip ${CONCERN_COLORS[c] ?? ""}" href="/shop?concern=${c}">${concernLabel(c)}</a>`)}</div>` : ""}

          ${hero.length ? html`<div class="hero-ingredients">
            <b class="eyebrow">${icon("leaf")} ${t("heroIngredients")}</b>
            <ul>${hero.map((h) => html`<li><b>${h.name}</b>${h.benefit_en || h.benefit_bn ? html`<span>${L(h, "benefit")}</span>` : ""}</li>`)}</ul>
          </div>` : ""}

          ${traditional ? html`<section class="traditional-use" aria-labelledby="tu-h">
            <b class="eyebrow" id="tu-h">${icon("sprout")} ${t("traditionalUse")}</b>
            <p>${traditional}</p>
            ${disclaimer(cfg.store)}
          </section>` : disclaimer(cfg.store)}

          ${d.kit ? html`<div class="kit-box">
            <h2>${icon("box")} ${t("kitContains")}</h2>
            <ul class="kit-items">${d.kit.items.map((x) => html`<li><img src="${x.product.images?.[0] ?? "img/logo.svg"}" alt="" width="52" height="52" loading="lazy"><a href="/product/${x.product.slug}">${L(x.product, "name")}</a><span class="qty-x">× ${num(x.quantity)}</span></li>`)}</ul>
            ${d.kit.saving > 0 ? html`<p class="kit-save small"><span class="muted">${t("kitSeparate", { price: money(d.kit.separate_price) })}</span><b>${t("kitSave", { price: money(d.kit.saving) })}</b></p>` : ""}
          </div>` : ""}

          ${certBadges(d.certifications)}

          ${sizes.length > 1 || sizes[0] !== "Standard" ? html`<div class="opt">
            <div class="opt-head"><b>${t("packSize")}</b></div>
            <div class="swatches" id="sizes">${sizes.map((s) => html`<button type="button" class="swatch" data-size="${s}">${s}</button>`)}</div></div>` : ""}
          ${colors.length ? html`<div class="opt"><div class="opt-head"><b>${t("color")}</b> <span class="muted" id="color-name"></span></div>
            <div class="swatches" id="colors">${colors.map((c) => html`<button type="button" class="swatch" data-color="${c}">${c}</button>`)}</div></div>` : ""}

          <p class="stock-line" id="stock-line" aria-live="polite"></p>
          <p class="expiry-line small" id="expiry-line" hidden></p>
          <p class="delivery-line ${p.delivery_mode === "free" ? "free" : ""}">${icon("truck")} ${p.delivery_mode === "free" ? html`<b>${t("freeDelivery")}</b>` : t("deliveryAuto")}</p>

          <div class="buy-actions" id="buy-actions">
            <div class="qty" role="group" aria-label="${t("qty")}"><button type="button" data-q="-1" aria-label="-">${icon("minus")}</button><output id="qty">1</output><button type="button" data-q="1" aria-label="+">${icon("plus")}</button></div>
            <button class="btn primary lg" type="button" id="add">${icon("bag")} ${t("addToCart")}</button>
            <button class="btn accent lg" type="button" id="buy">${t("buyNow")}</button>
          </div>
          <div class="notify" id="notify" hidden>
            <form id="notify-form" class="inline-form"><p class="small">${t("notifyMeSub")}</p>
              <div class="row"><input class="input" name="phone" inputmode="tel" placeholder="01XXXXXXXXX" required><button class="btn primary" type="submit">${icon("bell")} ${t("notifyMe")}</button></div></form>
          </div>

          <p class="safe-note small">${icon("shield")} <span>${t("safeUse")}</span></p>

          <div class="secondary-actions">
            <button class="icon-text" type="button" id="wish">${icon("heart")} ${t("wishlist")}</button>
            <button class="icon-text" type="button" id="share">${icon("share")} ${t("share")}</button>
          </div>
          <ul class="perks small">
            <li>${icon("cash")} ${t("codAvailable")}</li>
            <li>${icon("return")} ${t("easyReturns")}</li>
            ${cfg.giftWrap?.enabled ? html`<li>${icon("gift")} ${t("giftWrapNote", { fee: money(cfg.giftWrap.fee) })}</li>` : ""}
            <li>${icon("whatsapp")} <a href="/wa?product=${p.slug}&lang=${lang()}">${t("chatWhatsApp")}</a></li>
          </ul>
        </div>
      </div>

      <div class="pdp-details">
        ${p.description_en || p.description_bn ? html`<section><h2>${t("description")}</h2><p>${L(p, "description")}</p></section>` : ""}
        ${p.how_to_use_en || p.how_to_use_bn ? html`<section><h2>${t("howToUse")}</h2><ol class="use-steps">${lines(L(p, "how_to_use")).map((s) => html`<li>${s}</li>`)}</ol></section>` : ""}
        ${p.ingredients ? html`<section><h2>${t("ingredients")}</h2>
          <p class="composition">${p.ingredients.split(/,\s*/).map((ing, i, all) => {
            const hit = heroNames.some((n) => ing.toLowerCase().includes(n));
            return html`${hit ? html`<mark>${ing}</mark>` : ing}${i < all.length - 1 ? ", " : ""}`;
          })}</p></section>` : ""}
        <section><h2>${t("care")}</h2>
          <ul class="good-to-know">
            ${p.caution_en || p.caution_bn ? html`<li>${icon("sparkle")} ${L(p, "caution")}</li>` : ""}
            ${p.pao_months ? html`<li>${icon("clock")} ${t("pao", { n: num(p.pao_months) })}</li>` : ""}
          </ul>
          ${disclaimer(cfg.store)}
        </section>
      </div>

      <section class="section" id="reviews">
        <div class="section-head"><h2>${t("reviews")}</h2></div>
        ${d.reviews.length
          ? html`<div class="reviews-list">${d.reviews.map((r) => html`<article class="review-card">${r.photo_url ? html`<img class="review-photo" src="${r.photo_url}" alt="" loading="lazy" width="320" height="320">` : ""}<div class="row">${stars(r.rating)} <b>${r.name}</b></div>${r.verified_purchase ? html`<span class="verified">${icon("check")} ${t("verifiedPurchase")}</span>` : ""}<p>${r.body}</p>${r.reply ? html`<p class="reply"><b>${lang() === "bn" ? "দোকানের উত্তর" : "Shop reply"}:</b> ${r.reply}</p>` : ""}<small class="muted">${date(r.created_at)}</small></article>`)}</div>`
          : html`<p class="muted note-card">${t("noReviewsYet")}</p>`}
      </section>

      ${d.inKits?.length ? html`<section class="section"><div class="section-head"><h2>${t("inKits")}</h2><a href="/kits">${t("allKits")} ${icon("chevron")}</a></div>${productGrid(d.inKits.slice(0, 4))}</section>` : ""}
      ${(d.goesWellWith ?? []).map((look) => html`<section class="section look">
        <div class="section-head"><h2>${t("goesWellWith")} <small class="muted">· ${L(look, "name")}</small></h2><a href="/collections/${look.slug}">${t("shopTheSet")} ${icon("chevron")}</a></div>
        ${productGrid(look.items.slice(0, 4))}</section>`)}
      ${d.upsell.length && !(d.goesWellWith ?? []).length ? html`<section class="section"><div class="section-head"><h2>${t("completeTheSet")}</h2></div>${productGrid(d.upsell.slice(0, 4))}</section>` : ""}
      ${d.related.length ? html`<section class="section"><div class="section-head"><h2>${t("relatedProducts")}</h2></div>${productGrid(d.related.slice(0, 4))}</section>` : ""}
    </div>`);

  bindCards(el);
  track("ViewContent", { value: priceOf(current()), items: [{ sku: current()?.sku ?? p.slug, name: p.name_en, price: priceOf(current()), quantity: 1 }] });

  function refresh() {
    const v = current();
    $$("[data-size]", el).forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.size === size));
      b.classList.toggle("unavailable", !variants.some((x) => x.size === b.dataset.size && x.stock > 0));
    });
    $$("[data-color]", el).forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.color === color));
      b.classList.toggle("unavailable", !variants.some((x) => x.size === size && x.color === b.dataset.color && x.stock > 0));
    });
    if ($("#color-name", el)) $("#color-name", el).textContent = color;
    const price = priceOf(v);
    const was = basePrice(v);
    $("#price", el).textContent = money(price);
    $("#was", el).textContent = price < was ? money(was) : "";
    const off = $("#off", el);
    off.hidden = !(price < was);
    off.textContent = `-${num(Math.round(((was - price) / was) * 100))}%`;
    const line = $("#stock-line", el);
    // Honest urgency: "only X left" appears only when the real stock is at or below the low-stock level.
    if (!v) line.innerHTML = String(html`<span class="muted">${t("chooseOption")}</span>`);
    else if (v.stock <= 0) line.innerHTML = String(html`<span class="out">${t("outOfStock")}</span>`);
    else if (v.stock <= v.low_stock_threshold) line.innerHTML = String(html`<span class="low">${t("onlyLeft", { n: num(v.stock) })}</span>`);
    else line.innerHTML = String(html`<span class="ok">${icon("check")} ${t("inStock")}</span>`);
    // Best before: the expiry of the batch the next order is packed from (oldest-expiry-first), straight from stock records.
    const exp = $("#expiry-line", el);
    exp.hidden = !(v && v.stock > 0 && v.next_expiry);
    if (!exp.hidden) exp.innerHTML = String(html`${icon("calendar")} <span title="${t("bestBeforeNote")}">${t("bestBefore", { d: monthYear(v.next_expiry) })}</span>`);
    const soldOut = !v || v.stock <= 0;
    $("#buy-actions", el).hidden = soldOut;
    $("#notify", el).hidden = !soldOut || !v;
    qty = Math.min(qty, Math.max(1, v?.stock ?? 1));
    $("#qty", el).textContent = num(qty);
  }

  $$("[data-size]", el).forEach((b) => b.addEventListener("click", () => {
    size = b.dataset.size;
    if (!variants.some((v) => v.size === size && v.color === color)) color = variants.find((v) => v.size === size && v.stock > 0)?.color ?? variants.find((v) => v.size === size)?.color ?? "";
    refresh();
  }));
  $$("[data-color]", el).forEach((b) => b.addEventListener("click", () => { color = b.dataset.color; refresh(); }));
  $$("[data-q]", el).forEach((b) => b.addEventListener("click", () => {
    const max = Math.min(20, current()?.stock ?? 1);
    qty = Math.max(1, Math.min(max, qty + Number(b.dataset.q)));
    $("#qty", el).textContent = num(qty);
  }));
  $$("[data-img]", el).forEach((b) => b.addEventListener("click", () => {
    $("#main-img", el).src = b.dataset.img;
    $$("[data-img]", el).forEach((x) => x.setAttribute("aria-current", String(x === b)));
  }));
  // Zoom: hover pans a 2.2× view on desktop; tap/click opens the full-size photo.
  const zoom = $("#zoom", el);
  const mainImg = $("#main-img", el);
  zoom.addEventListener("mousemove", (e) => {
    const r = zoom.getBoundingClientRect();
    mainImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
    zoom.classList.add("zooming");
  });
  zoom.addEventListener("mouseleave", () => zoom.classList.remove("zooming"));
  zoom.addEventListener("click", () => overlay("modal", { title: L(p, "name"), body: html`<img class="zoom-full" src="${mainImg.src}" alt="${L(p, "name")}" width="1200" height="1200">` }));
  $("#add", el).addEventListener("click", () => { const v = current(); if (v) addToCart(p, v, qty); });
  $("#buy", el).addEventListener("click", () => { const v = current(); if (v) { addToCart(p, v, qty); navigate("/checkout"); } });

  $("#notify-form", el).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const phone = normalizePhone(f.phone.value);
    if (!phone) return showFieldErrors(f, { data: { fields: [{ field: "phone", en: "Enter a valid mobile number", bn: "সঠিক মোবাইল নম্বর দিন" }] } });
    try {
      const r = await api("/stock-notify", { method: "POST", body: { productId: p.id, variantId: current()?.id, phone, lang: lang() } });
      toast(r[lang()] ?? t("notifyDone"));
      f.reset();
    } catch (err) {
      toast(errMsg(err), "error");
    }
  });

  const wishBtn = $("#wish", el);
  wishBtn.classList.toggle("on", wishlist.ids().has(p.id));
  wishBtn.addEventListener("click", async () => wishBtn.classList.toggle("on", await wishlist.toggle(p.id)));

  $("#share", el).addEventListener("click", async () => {
    const url = location.href.split("?")[0];
    if (navigator.share) navigator.share({ title: L(p, "name"), url }).catch(() => {});
    else { await navigator.clipboard?.writeText(url); toast(t("copied")); }
  });

  refresh();
}
