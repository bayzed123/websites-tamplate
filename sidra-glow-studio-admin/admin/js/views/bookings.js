// Studio bookings: the day's appointments grouped by date, with confirm / done / no-show / cancel actions,
// call and WhatsApp shortcuts, moving a booking to another time and a CSV export.
import { t, num, money, dt, lang } from "../i18n.js";
import { html, icon, api, $, $$, can, toast, msg, errMsg, pill, debounce, exportCsv, slideOver, showErrors, emptyState, errorState, skeleton } from "../core.js";

const bdToday = () => new Date(Date.now() + 6 * 3600_000).toISOString().slice(0, 10);
const waLink = (phone) => `https://wa.me/88${String(phone).replace(/\D/g, "").replace(/^88/, "")}`;
const time12 = (hm) => {
  const [h, m] = String(hm).split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

export default async function bookings(view, { query, refreshBell }) {
  const L = (en, bn) => (lang() === "bn" ? bn : en);
  const state = { status: query.get("status") ?? "", from: query.get("from") ?? bdToday(), date: "", q: "", page: 1 };
  const canAct = can("bookings.update");
  view.innerHTML = String(html`
    <div class="page-head"><h1>${t("bookings")}</h1><button class="btn" id="csv">${icon("download")} ${t("exportCsv")}</button></div>
    <div class="chips" id="tabs" style="margin-bottom:14px">${[["", t("all")], ["requested", t("b_requested")], ["confirmed", t("b_confirmed")], ["completed", t("b_completed")], ["no_show", t("b_no_show")], ["cancelled", t("b_cancelled")]].map(([v, l]) => html`<button class="chip" data-tab="${v}" aria-pressed="${state.status === v}">${l}</button>`)}</div>
    <div class="card"><div class="toolbar">
      <input class="input" id="bq" type="search" placeholder="${L("Booking no., name, phone, treatment…", "বুকিং নং, নাম, ফোন, ট্রিটমেন্ট…")}" aria-label="${t("searchPlaceholder")}">
      <label class="field inline"><span class="small muted">${L("From", "থেকে")}</span><input class="input" id="bfrom" type="date" value="${state.from}"></label>
      <label class="field inline"><span class="small muted">${L("Only this day", "শুধু এই দিন")}</span><input class="input" id="bdate" type="date"></label>
    </div><div id="list"></div><div id="pager"></div></div>`);

  let rows = [];
  const qs = (x = {}) => new URLSearchParams(Object.entries({ ...state, ...x }).filter(([, v]) => v !== ""));
  const actions = (b) => {
    if (!canAct) return "";
    const btn = (to, label, cls = "") => html`<button class="btn sm ${cls}" data-id="${b.id}" data-to="${to}">${label}</button>`;
    return {
      requested: html`${btn("confirmed", t("confirmBooking"), "primary")} ${btn("move", t("moveBooking"))} ${btn("cancelled", t("cancel"))}`,
      confirmed: html`${btn("completed", t("markDone"), "primary")} ${btn("no_show", t("noShow"))} ${btn("move", t("moveBooking"))} ${btn("cancelled", t("cancel"))}`,
      cancelled: btn("requested", L("Reopen", "আবার খুলুন")),
      no_show: btn("confirmed", L("Re-book", "আবার বুক")),
    }[b.status] ?? "";
  };
  const statusPill = (s) => pill(s, t(`b_${s}`));
  const row = (b) => html`<div class="booking-row">
      <span class="time">${time12(b.start_time)}<br><span class="muted small">${t("minutes", { n: num(b.duration_min) })}</span></span>
      <span><b>${b.treatment_name}</b> · ${money(b.price)}<br><span class="muted small">${b.booking_no} · ${statusPill(b.status)}</span>${b.note ? html`<br><span class="small">“${b.note}”</span>` : ""}${b.staff_note ? html`<br><span class="small muted">${icon("edit")} ${b.staff_note}</span>` : ""}</span>
      <span>${b.name}<br><a class="small" href="tel:${b.phone}">${b.phone}</a> · <a class="small" href="${waLink(b.phone)}" target="_blank" rel="noopener">WhatsApp</a>
        <br><span class="muted small">${num(b.visits)} ${t("visits")}${b.no_shows ? html` · <span class="exp-gone">${num(b.no_shows)} ${t("noShow")}</span>` : ""}</span></span>
      <span class="acts">${actions(b)}</span></div>`;

  async function load() {
    const list = $("#list", view);
    list.innerHTML = String(skeleton(3));
    try {
      const res = await api(`/bookings?${qs({ limit: "60" })}`);
      rows = res.items;
      if (!rows.length) { list.innerHTML = String(emptyState(L("No bookings here", "এখানে কোনো বুকিং নেই"), L("New requests from the treatments page appear here.", "ট্রিটমেন্ট পেজ থেকে আসা নতুন অনুরোধ এখানে দেখাবে।"))); $("#pager", view).innerHTML = ""; return; }
      const days = new Map();
      for (const b of rows) { if (!days.has(b.booking_date)) days.set(b.booking_date, []); days.get(b.booking_date).push(b); }
      const today = bdToday();
      list.innerHTML = String(html`${[...days].map(([d, items]) => html`<h3 class="day-head">${d === today ? L("Today", "আজ") + " · " : ""}${dt(d)} <span class="muted small">(${num(items.length)})</span></h3>${items.map(row)}`)}`);
      $("#pager", view).innerHTML = res.pages > 1 ? String(html`<div class="pager">${state.page > 1 ? html`<button class="btn sm" data-page="${state.page - 1}">←</button>` : ""}<span class="muted small">${num(state.page)} / ${num(res.pages)}</span>${state.page < res.pages ? html`<button class="btn sm" data-page="${state.page + 1}">→</button>` : ""}</div>`) : "";
    } catch (e) {
      list.innerHTML = String(errorState(errMsg(e)));
      $("[data-retry]", list)?.addEventListener("click", load);
    }
  }

  const help = {
    confirmed: L("The customer gets an SMS with the date, time and studio address.", "গ্রাহক তারিখ, সময় ও স্টুডিওর ঠিকানাসহ SMS পাবেন।"),
    cancelled: L("The customer gets an SMS that the booking is cancelled. Add a short reason for your records.", "গ্রাহক বাতিলের SMS পাবেন। রেকর্ডের জন্য ছোট কারণ লিখুন।"),
    completed: L("Mark the visit as done. Add notes for next time (products used, skin observations).", "ভিজিট সম্পন্ন করুন। পরের বারের জন্য নোট রাখুন (ব্যবহৃত পণ্য, ত্বকের অবস্থা)।"),
    no_show: L("The customer didn't come. Repeated no-shows are shown next to their name.", "গ্রাহক আসেননি। বারবার না এলে নামের পাশে দেখাবে।"),
    requested: L("Put the booking back in the requests list.", "বুকিংটি আবার অনুরোধের তালিকায় ফিরবে।"),
    move: L("Pick a new date and time. The slot must be free; the customer is told by SMS.", "নতুন তারিখ ও সময় দিন। স্লট খালি থাকতে হবে; গ্রাহককে SMS-এ জানানো হবে।"),
  };

  view.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) { state.status = tab.dataset.tab; state.page = 1; $$("[data-tab]", view).forEach((b) => b.setAttribute("aria-pressed", String(b === tab))); return load(); }
    const pg = e.target.closest("[data-page]");
    if (pg) { state.page = Number(pg.dataset.page); return load(); }
    const b = e.target.closest("[data-to]");
    if (!b) return;
    const bk = rows.find((x) => x.id === Number(b.dataset.id));
    const to = b.dataset.to;
    const moving = to === "move";
    const { panel, close } = slideOver({
      title: `${bk.booking_no} → ${b.textContent.trim()}`,
      body: html`<form id="bf" novalidate><p>${help[to]}</p>
        <p class="muted small">${bk.treatment_name} · ${bk.name} · ${dt(bk.booking_date)} ${time12(bk.start_time)}</p>
        ${moving ? html`<div class="grid2"><label class="field"><span>${t("date")} *</span><input class="input" type="date" name="booking_date" value="${bk.booking_date}" required></label>
          <label class="field"><span>${L("Time", "সময়")} *</span><input class="input" type="time" name="start_time" step="1800" value="${bk.start_time}" required></label></div>` : ""}
        <label class="field"><span>${t("note")}</span><textarea class="input" name="staff_note" maxlength="1000"></textarea></label>
        ${["confirmed", "cancelled"].includes(to) || moving ? html`<label class="check"><input type="checkbox" name="notify" checked> ${L("Send SMS to the customer", "গ্রাহককে SMS পাঠান")}</label>` : ""}</form>`,
      footer: html`<button class="btn" data-close>${t("cancel")}</button><button class="btn primary" type="submit" form="bf">${t("save")}</button>`,
    });
    $("#bf", panel).addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const body = { staff_note: fd.get("staff_note") || null, notify: fd.get("notify") === "on" };
      if (moving) { body.booking_date = fd.get("booking_date"); body.start_time = fd.get("start_time"); if (bk.status === "requested") body.status = "confirmed"; }
      else body.status = to;
      try { toast(msg(await api(`/bookings/${bk.id}`, { method: "PUT", body }))); close(); load(); refreshBell?.(); }
      catch (err) { showErrors(ev.target, err); toast(errMsg(err), "err"); }
    });
  });
  $("#bq", view).addEventListener("input", debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }));
  $("#bfrom", view).onchange = (e) => { state.from = e.target.value; state.page = 1; load(); };
  $("#bdate", view).onchange = (e) => { state.date = e.target.value; state.page = 1; load(); };
  $("#csv", view).onclick = async () => { try { await exportCsv(`/bookings?${qs({ page: "" })}`, "bookings"); } catch (err) { toast(errMsg(err), "err"); } };
  await load();
}
