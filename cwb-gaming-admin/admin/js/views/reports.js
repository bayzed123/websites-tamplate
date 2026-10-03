// Reports & analytics: GMV, commission, refunds, disputes and chargebacks for a date range, by day / game / seller /
// payment method / traffic source — each table exports to CSV.
import { t, tx, num, money } from "../i18n.js";
import { html, icon, api, $, toast, errMsg, downloadBlob } from "../core.js";

export default async function reports(view) {
  const today = new Date();
  const from = new Date(today.getTime() - 29 * 86400_000).toISOString().slice(0, 10);
  view.innerHTML = String(html`<div class="page-head"><h1>${t("reports")}</h1></div>
    <form class="card toolbar" id="rf"><label class="field" style="margin:0"><span>${tx("From", "থেকে")}</span><input class="input" type="date" name="from" value="${from}"></label>
      <label class="field" style="margin:0"><span>${tx("To", "পর্যন্ত")}</span><input class="input" type="date" name="to" value="${today.toISOString().slice(0, 10)}"></label><button class="btn primary">${tx("Show", "দেখুন")}</button></form>
    <div id="out"><div class="skel"></div></div>`);
  const range = () => {
    const f = $("#rf", view);
    return { from: new Date(`${f.from.value}T00:00:00+06:00`).toISOString(), to: new Date(`${f.to.value}T23:59:59+06:00`).toISOString() };
  };
  const table = (key, title, cols, rows) => html`<section class="card" style="margin-top:14px"><div class="card-title"><h2>${title}</h2><button class="btn sm" data-csv="${key}">${icon("download")} CSV</button></div>
    ${rows.length ? html`<table class="table"><thead><tr>${cols.map(([, l]) => html`<th>${l}</th>`)}</tr></thead><tbody>${rows.map((r) => html`<tr>${cols.map(([k, , fmt]) => html`<td data-label="${k}" class="${fmt ? "mono" : ""}">${fmt ? fmt(r[k]) : r[k] ?? ""}</td>`)}</tr>`)}</tbody></table>` : html`<p class="muted">—</p>`}</section>`;
  async function load() {
    const r = range();
    try {
      const d = await api(`/reports?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}`);
      const s = d.summary;
      const k = (label, v) => html`<div class="kpi card"><div class="label">${label}</div><div class="value">${v}</div></div>`;
      $("#out", view).innerHTML = String(html`<div class="kpis">${k(tx("Paid orders", "পেইড অর্ডার"), `${num(s.paid_orders)} / ${num(s.orders)}`)}${k(tx("Gross paid", "মোট পেমেন্ট"), money(s.gross))}${k(tx("Refunded", "রিফান্ড"), money(s.refunded))}${k(tx("Commission earned", "কমিশন আয়"), money(s.commission))}${k(tx("Disputes", "বিরোধ"), num(s.disputes))}${k(tx("Chargebacks", "চার্জব্যাক"), num(s.chargebacks))}${k(tx("Expired unpaid", "পেমেন্টবিহীন বাতিল"), num(s.expired))}</div>
        ${table("day", tx("By day", "দিন অনুযায়ী"), [["day", tx("Day", "দিন")], ["orders", tx("Orders", "অর্ডার")], ["net", tx("Net", "নিট"), money]], d.byDay)}
        ${table("game", tx("By game", "গেম অনুযায়ী"), [["game_name", tx("Game", "গেম")], ["lines", tx("Lines", "লাইন")], ["units", tx("Units", "ইউনিট")], ["gmv", "GMV", money], ["commission", tx("Commission", "কমিশন"), money]], d.byGame)}
        ${table("seller", tx("By seller", "সেলার অনুযায়ী"), [["code", tx("Code", "কোড")], ["store_name", tx("Seller", "সেলার")], ["lines", tx("Lines", "লাইন")], ["gmv", "GMV", money], ["commission", tx("Commission", "কমিশন"), money], ["earnings", tx("Earnings", "আয়"), money], ["late", tx("Late", "দেরি")], ["disputes", tx("Disputes", "বিরোধ")]], d.bySeller)}
        ${table("method", tx("By payment method", "পেমেন্ট পদ্ধতি অনুযায়ী"), [["payment_method", tx("Method", "পদ্ধতি")], ["payment_mode", tx("Mode", "মোড")], ["orders", tx("Orders", "অর্ডার")], ["paid", tx("Paid", "পেইড")], ["amount", tx("Amount", "পরিমাণ"), money]], d.byMethod)}
        ${table("source", tx("By traffic source (UTM)", "ট্রাফিক সোর্স (UTM)"), [["source", tx("Source", "সোর্স")], ["campaign", tx("Campaign", "ক্যাম্পেইন")], ["orders", tx("Orders", "অর্ডার")], ["paid", tx("Paid", "পেইড")], ["amount", tx("Amount", "পরিমাণ"), money]], d.bySource)}`);
    } catch (e) { $("#out", view).innerHTML = String(html`<p class="error-box">${errMsg(e)}</p>`); }
  }
  $("#rf", view).addEventListener("submit", (e) => { e.preventDefault(); load(); });
  view.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-csv]");
    if (!b) return;
    const r = range();
    try {
      const res = await fetch(`/api/admin/reports?from=${encodeURIComponent(r.from)}&to=${encodeURIComponent(r.to)}&csv=${b.dataset.csv}`, { credentials: "same-origin", headers: { "x-requested-with": "fetch" } });
      if (!res.ok) throw new Error(String(res.status));
      downloadBlob(await res.text(), `report-${b.dataset.csv}.csv`);
    } catch (err) { toast(errMsg(err), "err"); }
  });
  await load();
}
