// Studio treatments: the treatment menu, one treatment with its steps and an online booking form (pick a day →
// free times from /api/treatments/:slug/slots → name + mobile), and the booking confirmation page.
// A booking is a request: the team calls to confirm it, and the customer pays at the studio.
import { t, L, lang, money, num, tt } from "../i18n.js";
import { $, $$, api, html, icon, raw, errMsg, toast, config, me, normalizePhone, showFieldErrors, turnstile, utm } from "../core.js";
import { treatmentCards, emptyState, skeletonGrid } from "../ui.js";

const lines = (s) => (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
/** Bangladesh date (UTC+6) `plus` days from today, YYYY-MM-DD. */
const bdDay = (plus = 0) => new Date(Date.now() + 6 * 3600_000 + plus * 86400_000).toISOString().slice(0, 10);
const dayLabel = (d) => {
  const dt = new Date(`${d}T00:00:00Z`);
  const loc = lang() === "bn" ? "bn-BD" : "en-GB";
  return { wd: dt.toLocaleDateString(loc, { weekday: "short", timeZone: "UTC" }), dm: dt.toLocaleDateString(loc, { day: "numeric", month: "short", timeZone: "UTC" }) };
};
const timeLabel = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const s = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
  return lang() === "bn" ? s.replace(/\d/g, (x) => "০১২৩৪৫৬৭৮৯"[x]).replace("am", "সকাল").replace("pm", "বিকাল/সন্ধ্যা") : s;
};

export default async function treatments(el, ctx) {
  if (ctx.variant === "booking") return bookingPage(el, ctx);
  if (ctx.params.slug) return detail(el, ctx);
  el.innerHTML = String(html`<div class="container section">${skeletonGrid(4)}</div>`);
  try {
    const [r, cfg] = await Promise.all([api("/treatments"), config()]);
    document.title = `${t("treatments")} | ${document.title.split("|").pop().trim()}`;
    const s = cfg.store;
    el.innerHTML = String(html`<div class="container section">
      <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <span>${t("treatments")}</span></nav>
      <header class="studio-hero">
        <div>
          <span class="eyebrow">${icon("spa")} ${lang() === "bn" ? s.city_bn : s.city_en}</span>
          <h1>${t("treatmentsTitle")}</h1>
          <p class="lead">${t("treatmentsSub")}</p>
          <ul class="info-list small">
            <li>${icon("pin")}<span>${lang() === "bn" ? s.address_bn : s.address_en}</span></li>
            <li>${icon("clock")}<span>${lang() === "bn" ? s.hours_bn : s.hours_en}</span></li>
            <li>${icon("phone")}<a href="tel:${s.phone}">${s.phone}</a></li>
          </ul>
        </div>
        <img src="img/treatments/signature-glow-facial.webp" alt="" width="520" height="520">
      </header>
      ${r.treatments.length ? treatmentCards(r.treatments) : emptyState(t("noResults"))}
    </div>`);
  } catch (e) {
    el.innerHTML = String(html`<div class="container section"><p class="error-box">${errMsg(e)}</p></div>`);
  }
}

async function detail(el, { params, navigate }) {
  el.innerHTML = String(html`<div class="container section"><div class="pdp"><div class="skel sq big"></div><div><div class="skel line"></div><div class="skel line short"></div></div></div></div>`);
  let d;
  try {
    d = await api(`/treatments/${params.slug}`);
  } catch (e) {
    el.innerHTML = String(html`<div class="container section">${e.status === 404 ? emptyState(t("notFound"), "", html`<a class="btn primary" href="/treatments">${t("treatments")}</a>`) : html`<p class="error-box">${errMsg(e)}</p>`}</div>`);
    return;
  }
  const tr = d.treatment;
  const [list, who] = await Promise.all([api("/treatments").catch(() => ({ studio: { advanceDays: 14, closedDays: [] } })), me().catch(() => null)]);
  const studio = list.studio ?? { advanceDays: 14, closedDays: [] };
  document.title = `${L(tr, "name")} | ${document.title.split("|").pop().trim()}`;
  const days = Array.from({ length: Math.min(14, studio.advanceDays ?? 14) + 1 }, (_, i) => bdDay(i));
  let day = days.find((x) => !studio.closedDays?.includes(new Date(`${x}T00:00:00Z`).getUTCDay())) ?? days[0];
  let time = "";

  el.innerHTML = String(html`<div class="container section">
    <nav class="crumbs" aria-label="breadcrumb"><a href="/">${t("home")}</a> ${icon("chevron")} <a href="/treatments">${t("treatments")}</a> ${icon("chevron")} <span>${L(tr, "name")}</span></nav>
    <div class="pdp">
      <div class="gallery"><div class="main-img"><img src="${tr.image_url ?? "img/og-cover.png"}" alt="${L(tr, "name")}" width="800" height="800"></div></div>
      <div class="buy-box">
        <span class="eyebrow">${icon("clock")} ${t("minutes", { n: num(tr.duration_min) })} · ${t("payAtStudio")}</span>
        <h1>${L(tr, "name")}</h1>
        <div class="price-row big"><b class="price">${money(tr.sale_price ?? tr.price)}</b>${tr.sale_price ? html`<s class="muted">${money(tr.price)}</s>` : ""}</div>
        ${tr.summary_en ? html`<p class="lead">${L(tr, "summary")}</p>` : ""}
        <form id="book" class="booking-form stack" novalidate>
          <h2>${t("bookThis")}</h2>
          <fieldset><legend>${t("pickDate")}</legend>
            <div class="day-picker">${days.map((x) => {
              const l = dayLabel(x);
              const closed = studio.closedDays?.includes(new Date(`${x}T00:00:00Z`).getUTCDay());
              return html`<button type="button" class="day ${closed ? "closed" : ""}" data-day="${x}" ${closed ? raw("disabled") : ""} aria-pressed="${x === day}"><small>${l.wd}</small><b>${l.dm}</b></button>`;
            })}</div>
          </fieldset>
          <fieldset><legend>${t("pickTime")}</legend><div class="slots" id="slots"></div><input type="hidden" name="time"></fieldset>
          <fieldset><legend>${t("yourDetails")}</legend>
            <div class="form-grid">
              <label class="field"><span>${t("fullName")}</span><input class="input" name="name" required maxlength="80" autocomplete="name" value="${who?.name ?? ""}"></label>
              <label class="field"><span>${t("mobile")}</span><input class="input" name="phone" required inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" value="${who?.phone ?? ""}"></label>
            </div>
            <label class="field"><span>${t("bookingNote")}</span><textarea class="input" name="note" maxlength="500" rows="2"></textarea></label>
          </fieldset>
          <div id="ts"></div>
          <button class="btn primary lg block" type="submit">${icon("calendar")} ${t("requestBooking")}</button>
          <p class="small muted">${t("bookingWeCall")}</p>
        </form>
      </div>
    </div>
    <div class="pdp-details">
      ${tr.description_en ? html`<section><h2>${t("description")}</h2><p>${L(tr, "description")}</p></section>` : ""}
      ${tr.steps_en ? html`<section><h2>${t("whatHappens")}</h2><ol class="use-steps">${lines(L(tr, "steps")).map((s) => html`<li>${s}</li>`)}</ol></section>` : ""}
      ${tr.suits_en ? html`<section><h2>${t("suits")}</h2><p>${L(tr, "suits")}</p></section>` : ""}
      ${tr.aftercare_en ? html`<section><h2>${t("aftercare")}</h2><p>${L(tr, "aftercare")}</p></section>` : ""}
    </div>
    ${d.others.length ? html`<section class="section"><div class="section-head"><h2>${t("otherTreatments")}</h2></div>${treatmentCards(d.others)}</section>` : ""}
  </div>`);

  const slotsBox = $("#slots", el);
  async function loadSlots() {
    time = "";
    slotsBox.innerHTML = String(html`<span class="muted small">${t("loading")}</span>`);
    try {
      const r = await api(`/treatments/${tr.slug}/slots?date=${day}`);
      const free = r.slots.filter((s) => s.available);
      slotsBox.innerHTML = !r.slots.length
        ? String(html`<p class="muted small">${t("studioClosed")}</p>`)
        : !free.length
          ? String(html`<p class="muted small">${t("noSlots")}</p>`)
          : String(html`${r.slots.map((s) => html`<button type="button" class="slot" data-time="${s.time}" ${s.available ? "" : raw("disabled")} aria-pressed="false">${timeLabel(s.time)}</button>`)}`);
      $$("[data-time]", slotsBox).forEach((b) => b.addEventListener("click", () => {
        time = b.dataset.time;
        $('input[name="time"]', el).value = time;
        $$("[data-time]", slotsBox).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      }));
    } catch (e) {
      slotsBox.innerHTML = String(html`<p class="error-box">${errMsg(e)}</p>`);
    }
  }
  $$("[data-day]", el).forEach((b) => b.addEventListener("click", () => {
    day = b.dataset.day;
    $$("[data-day]", el).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    loadSlots();
  }));
  loadSlots();
  const getToken = await turnstile($("#ts", el));

  $("#book", el).addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const phone = normalizePhone(f.phone.value);
    const fields = [];
    if (!f.name.value.trim()) fields.push({ field: "name", en: "Required", bn: "আবশ্যক" });
    if (!phone) fields.push({ field: "phone", en: "Enter a valid mobile number", bn: "সঠিক মোবাইল নম্বর দিন" });
    if (!time) fields.push({ field: "time", en: "Pick a time", bn: "সময় বেছে নিন" });
    if (fields.length) return showFieldErrors(f, { data: { fields } });
    const btn = $('button[type="submit"]', f);
    btn.disabled = true;
    try {
      const r = await api("/bookings", {
        method: "POST",
        body: { treatmentId: tr.id, date: day, time, name: f.name.value.trim(), phone, note: f.note.value.trim() || undefined, lang: lang(), turnstileToken: await getToken(), utm: utm() },
      });
      toast(r[lang()] ?? r.en);
      navigate(`/booking/${r.bookingNo}?token=${r.token}`);
    } catch (err) {
      showFieldErrors(f, err);
      toast(errMsg(err), "error");
      if (err.status === 409) loadSlots();
      btn.disabled = false;
    }
  });
}

async function bookingPage(el, { params, query }) {
  el.innerHTML = String(html`<div class="container section narrow"><div class="skel line"></div></div>`);
  try {
    const [{ booking: b }, cfg] = await Promise.all([api(`/bookings/${params.bookingNo}?token=${encodeURIComponent(query.get("token") ?? "")}`), config()]);
    const s = cfg.store;
    const l = dayLabel(b.booking_date);
    el.innerHTML = String(html`<div class="container section narrow">
      <div class="success-card">
        <div class="blob-icon">${icon(b.status === "cancelled" ? "close" : "check")}</div>
        <h1>${b.status === "requested" ? t("bookingThanks") : t(`booking_${b.status}`)}</h1>
        <p class="muted">${b.status === "requested" ? t("bookingWeCall") : ""}</p>
        <dl class="specs">
          <div><dt>${t("bookingNo")}</dt><dd><b>${b.booking_no}</b></dd></div>
          <div><dt>${t("treatments")}</dt><dd>${lang() === "bn" ? b.treatment_name_bn || b.treatment_name : b.treatment_name}</dd></div>
          <div><dt>${t("pickDate")}</dt><dd>${l.wd}, ${l.dm} · ${timeLabel(b.start_time)}</dd></div>
          <div><dt>${t("price")}</dt><dd>${money(b.price)} · ${t("payAtStudio")}</dd></div>
          <div><dt>${t("orderStatus")}</dt><dd><span class="pill ${b.status}">${t(`booking_${b.status}`)}</span></dd></div>
          <div><dt>${t("studioAddress")}</dt><dd>${lang() === "bn" ? s.address_bn : s.address_en}</dd></div>
        </dl>
        ${b.aftercare_en ? html`<p class="note-card small">${icon("sparkle")} <b>${t("aftercare")}:</b> ${tt({ en: b.aftercare_en, bn: b.aftercare_bn })}</p>` : ""}
        <div class="row center-row"><a class="btn primary" href="tel:${s.phone}">${icon("phone")} ${t("callUs")}</a><a class="btn" href="/shop">${t("continueShopping")}</a></div>
      </div></div>`);
  } catch (e) {
    el.innerHTML = String(html`<div class="container section">${emptyState(t("notFound"), errMsg(e), html`<a class="btn primary" href="/treatments">${t("treatments")}</a>`)}</div>`);
  }
}
