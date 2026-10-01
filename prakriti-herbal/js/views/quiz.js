// Wellness kit builder: wellness need → budget → a small kit of in-stock products, one from each shelf (oil, tea,
// supplement …), within budget, plus ready-made kits for the same need. Rule-based on the server (/api/kit-builder).
import { t, tt, num, money, L } from "../i18n.js";
import { $, $$, api, html, icon, raw, errMsg, config } from "../core.js";
import { productCard, productGrid, bindCards, skeletonGrid, emptyState, addToCart, disclaimer, CONCERN_LABELS, CONCERN_COLORS, CONCERN_ICONS } from "../ui.js";

const BUDGETS = [1000, 2000, 3500, 5000];

export default async function kitBuilder(el, { query }) {
  const state = {
    concern: CONCERN_LABELS[query.get("concern")] ? query.get("concern") : "",
    budget: BUDGETS.includes(Number(query.get("budget"))) ? Number(query.get("budget")) : 2000,
  };
  let step = state.concern ? 2 : 1;
  document.title = `${t("giftFinderTitle")} | ${document.title.split("|").pop().trim()}`;
  const cfg = await config().catch(() => ({}));

  const draw = () => {
    el.innerHTML = String(html`<div class="container section">
      <div class="quiz">
        <div class="quiz-head">
          <span class="eyebrow">${icon("sprout")} ${t("quiz")}</span>
          <h1>${t("giftFinderTitle")}</h1>
          <p class="muted">${t("giftFinderSub")}</p>
          <ol class="quiz-progress" aria-label="progress">${[1, 2].map((n) => html`<li class="${n < step ? "done" : n === step ? "current" : ""}">${num(n)}</li>`)}</ol>
        </div>
        <form id="quiz-form" class="quiz-card">
          ${step === 1
            ? html`<fieldset><legend><h2>${t("quizStep1")}</h2></legend>
              <div class="quiz-options concerns">${Object.entries(CONCERN_LABELS).map(([k, l]) => html`<label class="quiz-option ${CONCERN_COLORS[k]}"><input type="radio" name="concern" value="${k}" ${state.concern === k ? raw("checked") : ""} required>${icon(CONCERN_ICONS[k])}<span>${tt(l)}</span></label>`)}</div></fieldset>`
            : html`<fieldset><legend><h2>${t("quizStep2")}</h2></legend>
              <div class="quiz-options budgets">${BUDGETS.map((b) => html`<label class="quiz-option"><input type="radio" name="budget" value="${b}" ${state.budget === b ? raw("checked") : ""}><span>≤ ${money(b)}</span></label>`)}</div></fieldset>`}
          <div class="quiz-actions">
            ${step > 1 ? html`<button class="btn ghost" type="button" id="back">${t("back")}</button>` : html`<span></span>`}
            <button class="btn primary lg" type="submit">${step < 2 ? html`${t("next")} ${icon("chevron")}` : t("showGifts")}</button>
          </div>
        </form>
        <div id="quiz-result"></div>
      </div></div>`);
    const f = $("#quiz-form", el);
    $("#back", el)?.addEventListener("click", () => { step--; draw(); });
    // Picking a need moves on straight away.
    if (step === 1) $$('input[type="radio"]', f).forEach((i) => i.addEventListener("change", () => f.requestSubmit()));
    f.addEventListener("submit", (e) => {
      e.preventDefault();
      if (step === 1) {
        state.concern = f.concern.value;
        step = 2;
        return draw();
      }
      state.budget = Number(f.budget.value) || state.budget;
      result();
    });
  };

  const result = async () => {
    const out = $("#quiz-result", el);
    out.innerHTML = String(skeletonGrid(4));
    const p = new URLSearchParams({ concern: state.concern, budget: String(state.budget) });
    history.replaceState({}, "", `/kit-builder?${p}`);
    try {
      const r = await api(`/kit-builder?${p}`);
      if (!r.items.length && !r.kits.length) {
        out.innerHTML = String(emptyState(t("quizNone"), "", html`<a class="btn" href="/shop?concern=${state.concern}">${t("shop")}</a>`));
        return;
      }
      out.innerHTML = String(html`<section class="quiz-result">
        ${r.items.length ? html`<div class="section-head"><h2>${t("quizResult")}</h2><button class="link-btn" type="button" id="retake">${t("retake")}</button></div>
        <p class="note-card small">${icon("leaf")} ${tt(r.reason)}</p>
        <ol class="kit-steps">${r.items.map((s) => html`<li><span class="shelf-label">${L(s, "category")}</span>${productCard(s.product)}</li>`)}</ol>
        <div class="quiz-total"><span>${t("quizTotal")}: <b>${money(r.total)}</b></span><button class="btn primary lg" type="button" id="add-kit">${icon("bag")} ${t("addRoutine")}</button></div>` : ""}
        ${r.kits.length ? html`<div class="section-head"><h2>${t("readyKits")}</h2><a href="/kits">${t("allKits")} ${icon("chevron")}</a></div>${productGrid(r.kits)}` : ""}
        <p class="safe-note small">${icon("shield")} <span>${t("safeUse")}</span></p>
        ${disclaimer(cfg.store)}
      </section>`);
      bindCards(out);
      $("#retake", out)?.addEventListener("click", () => { step = 1; draw(); });
      $("#add-kit", out)?.addEventListener("click", async (e) => {
        e.currentTarget.disabled = true;
        for (const s of r.items) {
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
  if (state.concern && query.get("budget")) result();
}
