// Skin quiz: skin type → main concern → budget (+ "my skin is sensitive") → a short routine of in-stock products,
// one per step (cleanse, tone, treat, moisturise, protect), within budget. Rule-based on the server (/api/quiz).
import { t, tt, num, money } from "../i18n.js";
import { $, $$, api, html, icon, raw, errMsg } from "../core.js";
import { productCard, bindCards, skeletonGrid, emptyState, addToCart, SKIN_LABELS, SKIN_COLORS, CONCERN_LABELS, CONCERN_COLORS, CONCERN_ICONS } from "../ui.js";

const BUDGETS = [1500, 2500, 4000, 6000];

export default async function quiz(el, { query }) {
  const state = {
    skin: SKIN_LABELS[query.get("skin")] ? query.get("skin") : "",
    concern: CONCERN_LABELS[query.get("concern")] ? query.get("concern") : "",
    budget: Number(query.get("budget")) || 2500,
    sensitive: query.get("sensitive") === "1",
  };
  let step = state.skin ? (state.concern ? 3 : 2) : 1;
  document.title = `${t("quiz")} | ${document.title.split("|").pop().trim()}`;

  const draw = () => {
    el.innerHTML = String(html`<div class="container section">
      <div class="quiz">
        <div class="quiz-head">
          <span class="eyebrow">${icon("flask")} ${t("quiz")}</span>
          <h1>${t("giftFinderTitle")}</h1>
          <p class="muted">${t("giftFinderSub")}</p>
          <ol class="quiz-progress" aria-label="progress">${[1, 2, 3].map((n) => html`<li class="${n < step ? "done" : n === step ? "current" : ""}">${num(n)}</li>`)}</ol>
        </div>
        <form id="quiz-form" class="quiz-card">
          ${step === 1 ? html`<fieldset><legend><h2>${t("quizStep1")}</h2></legend>
              <div class="quiz-options">${Object.entries(SKIN_LABELS).map(([k, l]) => html`<label class="quiz-option ${SKIN_COLORS[k]}"><input type="radio" name="skin" value="${k}" ${state.skin === k ? raw("checked") : ""} required><span>${tt(l)}</span></label>`)}</div>
              <p class="small muted">${t("skinHelp")}</p></fieldset>`
            : step === 2 ? html`<fieldset><legend><h2>${t("quizStep2")}</h2></legend>
              <div class="quiz-options">${Object.entries(CONCERN_LABELS).map(([k, l]) => html`<label class="quiz-option ${CONCERN_COLORS[k]}"><input type="radio" name="concern" value="${k}" ${state.concern === k ? raw("checked") : ""} required>${icon(CONCERN_ICONS[k])}<span>${tt(l)}</span></label>`)}</div></fieldset>`
            : html`<fieldset><legend><h2>${t("quizStep3")}</h2></legend>
              <div class="quiz-options budgets">${BUDGETS.map((b) => html`<label class="quiz-option"><input type="radio" name="budget" value="${b}" ${state.budget === b ? raw("checked") : ""}><span>${b === BUDGETS[BUDGETS.length - 1] ? `${money(b)}+` : `≤ ${money(b)}`}</span></label>`)}</div>
              <label class="check"><input type="checkbox" name="sensitive" ${state.sensitive ? raw("checked") : ""}> ${t("quizSensitive")}</label></fieldset>`}
          <div class="quiz-actions">
            ${step > 1 ? html`<button class="btn ghost" type="button" id="back">${t("back")}</button>` : html`<span></span>`}
            <button class="btn primary lg" type="submit">${step < 3 ? html`${t("next")} ${icon("chevron")}` : t("showGifts")}</button>
          </div>
        </form>
        <div id="quiz-result"></div>
      </div></div>`);
    const f = $("#quiz-form", el);
    $("#back", el)?.addEventListener("click", () => { step--; draw(); });
    // Picking an answer moves on straight away on steps 1 and 2.
    if (step < 3) $$('input[type="radio"]', f).forEach((i) => i.addEventListener("change", () => f.requestSubmit()));
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (step === 1) state.skin = f.skin.value;
      if (step === 2) state.concern = f.concern.value;
      if (step === 3) {
        state.budget = Number(f.budget.value) || state.budget;
        state.sensitive = f.sensitive.checked;
        return result();
      }
      step++;
      draw();
    });
  };

  const result = async () => {
    const out = $("#quiz-result", el);
    out.innerHTML = String(skeletonGrid(4));
    const p = new URLSearchParams({ skin: state.skin, concern: state.concern, budget: String(state.budget), sensitive: state.sensitive ? "1" : "0" });
    history.replaceState({}, "", `/skin-quiz?${p}`);
    try {
      const r = await api(`/quiz?${p}`);
      if (!r.steps.length) {
        out.innerHTML = String(emptyState(t("quizNone"), "", html`<a class="btn" href="/shop">${t("shop")}</a>`));
        return;
      }
      out.innerHTML = String(html`<section class="quiz-result">
        <div class="section-head"><h2>${t("quizResult")}</h2><button class="link-btn" type="button" id="retake">${t("retake")}</button></div>
        <p class="note-card small">${icon("sparkle")} ${tt(r.reason)}</p>
        <ol class="routine-steps">${r.steps.map((s) => html`<li><span class="step-no">${tt({ en: s.label_en, bn: s.label_bn })}</span>${productCard(s.product)}</li>`)}</ol>
        <div class="quiz-total"><span>${t("quizTotal")}: <b>${money(r.total)}</b></span><button class="btn primary lg" type="button" id="add-routine">${icon("bag")} ${t("addRoutine")}</button></div>
        <p class="patch-note small">${icon("shield")} <span>${t("patchTest")}</span></p>
      </section>`);
      bindCards(out);
      $("#retake", out).addEventListener("click", () => { step = 1; draw(); });
      $("#add-routine", out).addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        for (const s of r.steps) {
          const d = await api(`/products/${s.product.slug}`).catch(() => null);
          const v = d?.variants.find((x) => x.stock > 0);
          if (v) addToCart(d.product, v, 1);
        }
        e.currentTarget.disabled = false;
      });
      out.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      out.innerHTML = String(html`<p class="error-box">${errMsg(err)}</p>`);
    }
  };

  draw();
  if (state.skin && state.concern && query.get("budget")) result();
}
