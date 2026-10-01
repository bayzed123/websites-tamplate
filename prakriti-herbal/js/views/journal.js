// Wellness journal: article list and one article (plain-text body, blank line = new paragraph) with the products it
// mentions and the product disclaimer. Articles are checked for medical claims when they are saved in the admin.
import { t, L, date } from "../i18n.js";
import { api, html, icon, errMsg, config } from "../core.js";
import { productGrid, bindCards, postCards, emptyState, skeletonGrid, disclaimer } from "../ui.js";

const setTitle = (s) => (document.title = `${s} | ${document.title.split("|").pop().trim()}`);
const paragraphs = (s) => (s ?? "").split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);

export default async function journal(el, { params, query }) {
  el.innerHTML = String(html`<div class="container section">${skeletonGrid(3)}</div>`);
  try {
    if (!params.slug) {
      const page = Math.max(1, Number(query.get("page")) || 1);
      const r = await api(`/journal?page=${page}`);
      setTitle(t("journalTitle"));
      el.innerHTML = String(html`<div class="container section">
        <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <span>${t("journalTitle")}</span></nav>
        <h1 class="sprig-title">${t("journalTitle")}</h1>
        <p class="muted">${t("journalSub")}</p>
        ${r.items.length ? postCards(r.items) : emptyState(t("noPosts"))}
        ${r.pages > 1 ? html`<div class="row center-row">${page > 1 ? html`<a class="btn" href="/journal?page=${page - 1}">${t("back")}</a>` : ""}${page < r.pages ? html`<a class="btn" href="/journal?page=${page + 1}">${t("loadMore")}</a>` : ""}</div>` : ""}
      </div>`);
      return;
    }
    const [r, cfg] = await Promise.all([api(`/journal/${params.slug}`), config().catch(() => ({}))]);
    const p = r.post;
    setTitle(L(p, "title"));
    el.innerHTML = String(html`<div class="container section">
      <article class="article">
        <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <a href="/journal">${t("journalTitle")}</a></nav>
        <span class="eyebrow">${icon("book")} ${[p.published_at ? date(p.published_at) : "", p.author ? t("byAuthor", { a: p.author }) : ""].filter(Boolean).join(" · ")}</span>
        <h1>${L(p, "title")}</h1>
        ${p.excerpt_en || p.excerpt_bn ? html`<p class="lead muted">${L(p, "excerpt")}</p>` : ""}
        ${p.cover_url ? html`<img class="cover" src="${p.cover_url}" alt="" width="1200" height="675">` : ""}
        <div class="body">${paragraphs(L(p, "body")).map((x) => html`<p>${x}</p>`)}</div>
        ${disclaimer(cfg.store)}
      </article>
      ${r.products.length ? html`<section class="section"><div class="section-head"><h2>${t("productsInPost")}</h2></div>${productGrid(r.products.slice(0, 8))}</section>` : ""}
      <p class="center"><a class="btn" href="/journal">${icon("book")} ${t("journalTitle")}</a></p>
    </div>`);
    bindCards(el);
  } catch (e) {
    el.innerHTML = String(html`<div class="container section">${e.status === 404 ? emptyState(t("notFound"), "", html`<a class="btn primary" href="/journal">${t("journalTitle")}</a>`) : html`<p class="error-box">${errMsg(e)}</p>`}</div>`);
  }
}
