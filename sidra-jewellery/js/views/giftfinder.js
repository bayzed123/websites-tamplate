// Gift finder: occasion + budget (+ who it's for / notes) → in-stock pieces. Workers AI refines the pick when enabled.
import { t, lang, tt } from "../i18n.js";
import { $, api, html, icon, raw, errMsg } from "../core.js";
import { productGrid, bindCards, OCCASION_LABELS, OCCASION_COLORS, skeletonGrid, emptyState } from "../ui.js";

const WHO = ["wife", "mother", "sister", "friend", "bride", "self"];

export default async function giftfinder(el, { query }) {
  const occasion = OCCASION_LABELS[query.get("occasion")] ? query.get("occasion") : "festive";
  el.innerHTML = String(html`<div class="container section">
    <div class="gift-guide"><div class="gift-guide-text">
      <span class="eyebrow">${icon("gift")} ${t("giftFinder")}</span><h1>${t("giftFinderTitle")}</h1><p>${t("giftFinderSub")}</p>
      <form id="gf" class="stack">
        <fieldset class="age-pick"><legend>${t("occasion")}</legend>${Object.entries(OCCASION_LABELS).map(([k, l]) => html`<label class="chip lg ${OCCASION_COLORS[k]}"><input type="radio" name="occasion" value="${k}" ${k === occasion ? raw("checked") : ""}> ${tt(l)}</label>`)}</fieldset>
        <div class="form-grid">
          <label class="field"><span>${t("budget")}</span><input class="input" type="number" name="budget" min="100" step="100" value="${query.get("budget") ?? 2000}"></label>
          <label class="field"><span>${t("forWhom")}</span><select class="input" name="recipient">${WHO.map((k) => html`<option value="${k}">${t(`who_${k}`)}</option>`)}</select></label>
        </div>
        <label class="field"><span>${t("anythingElse")}</span><input class="input" name="note" maxlength="200" placeholder="${lang() === "bn" ? "যেমন: হালকা গয়না পছন্দ, রোজ গোল্ড ভালোবাসে" : "e.g. likes light pieces, loves rose gold"}"></label>
        <button class="btn primary lg" type="submit">${t("showGifts")}</button>
      </form></div>
      <div id="gf-results" class="gift-guide-items"></div></div></div>`);
  const out = $("#gf-results", el);
  bindCards(out);
  const run = async () => {
    const f = $("#gf", el);
    out.innerHTML = String(skeletonGrid(4));
    try {
      const p = new URLSearchParams({ occasion: f.occasion.value, budget: f.budget.value || "2000", recipient: f.recipient.value, note: f.note.value });
      if (!f.note.value) p.delete("note");
      const r = await api(`/recommend?${p}`);
      out.innerHTML = r.items.length
        ? String(html`<p class="note-card small">${icon("sparkle")} ${tt(r.reason)}</p>${productGrid(r.items)}`)
        : String(emptyState(t("noResults"), t("noResultsSub")));
    } catch (e) {
      out.innerHTML = String(html`<p class="error-box">${errMsg(e)}</p>`);
    }
  };
  $("#gf", el).addEventListener("submit", (e) => { e.preventDefault(); run(); });
  run();
}
