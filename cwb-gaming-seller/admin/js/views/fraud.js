// Fraud & risk: open flags (velocity, card testing, new-buyer caps, holds, device sharing, seller complaints, SLA misses)
// and the chargeback log (logging one marks the buyer 🔴 Verify so every later order is held).
import { t, tx, money, dt } from "../i18n.js";
import { html, icon, api, $, $$, can, toast, msg, errMsg, listTable, pill, exportCsv, showErrors } from "../core.js";

export default async function fraud(view) {
  const state = { status: "open", tab: "flags" };
  view.innerHTML = String(html`<div class="page-head"><h1>${t("fraud")}</h1></div>
    <div class="tabs chips"><button class="chip" data-tab="flags" aria-pressed="true">${tx("Flags", "সতর্কতা")}</button><button class="chip" data-tab="chargebacks" aria-pressed="false">${tx("Chargebacks", "চার্জব্যাক")}</button></div>
    <div id="body"></div>`);
  const body = $("#body", view);

  async function flags() {
    body.innerHTML = String(html`<div class="card"><div class="toolbar"><div class="chips">${[["open", "Open", "চলমান"], ["cleared", "Cleared", "নিষ্পত্তি"], ["confirmed", "Confirmed fraud", "নিশ্চিত প্রতারণা"]].map(([v, en, bn]) => html`<button class="chip" data-st="${v}" aria-pressed="${state.status === v}">${tx(en, bn)}</button>`)}</div><button class="btn sm" id="csv">${icon("download")} CSV</button></div><div id="list"></div></div>`);
    const table = listTable($("#list", body), {
      columns: [
        { label: { en: "When", bn: "কখন" }, render: (r) => dt(r.created_at, true) },
        { label: { en: "Kind", bn: "ধরন" }, render: (r) => html`${pill(r.severity === "high" ? "failed" : r.severity === "medium" ? "pending" : "inactive", r.kind)}` },
        { label: { en: "Why", bn: "কারণ" }, render: (r) => tx(r.reason_en, r.reason_bn) },
        { label: { en: "About", bn: "সম্পর্কিত" }, render: (r) => html`${r.order_no ? html`<a href="#/orders/${r.order_id}" class="mono">${r.order_no}</a> ` : ""}${r.customer_phone ? html`<a href="#/customers?id=${r.customer_id}">${r.customer_phone}</a> ` : ""}${r.seller_code ? html`<a href="#/sellers/${r.seller_id}">${r.seller_code}</a>` : ""}<br><span class="small mono muted">${r.ip ?? ""} ${(r.device_id ?? "").slice(0, 8)}</span>` },
      ],
      actions: (r) => (r.status === "open" && can("fraud.act") ? html`<button class="btn sm" data-clear="${r.id}">${tx("Clear", "নিষ্পত্তি")}</button> <button class="btn sm danger" data-confirm="${r.id}">${tx("Fraud", "প্রতারণা")}</button>` : pill(r.status)),
    });
    const load = async () => { table.loading(); try { table.render({ ...(await api(`/fraud?status=${state.status}`)), page: 1, pages: 1 }); } catch (e) { table.error(e, load); } };
    $$("[data-st]", body).forEach((b) => (b.onclick = () => { state.status = b.dataset.st; flags(); }));
    $("#csv", body).onclick = () => exportCsv(`/fraud?status=${state.status}`, "fraud-flags").catch((e) => toast(errMsg(e), "err"));
    body.onclick = async (e) => {
      const b = e.target.closest("[data-clear],[data-confirm]");
      if (!b) return;
      try { await api(`/fraud/${b.dataset.clear ?? b.dataset.confirm}`, { method: "POST", body: { status: b.dataset.clear ? "cleared" : "confirmed" } }); toast(t("saved")); load(); } catch (err) { toast(errMsg(err), "err"); }
    };
    await load();
  }

  async function chargebacks() {
    body.innerHTML = String(html`${can("fraud.act") ? html`<form class="card" id="cbf"><h3>${tx("Log a chargeback", "চার্জব্যাক রেকর্ড করুন")}</h3><div class="grid2">
      <label class="field"><span>${tx("Order number", "অর্ডার নম্বর")}</span><input class="input mono" name="orderNo" required></label><label class="field"><span>${tx("Amount", "পরিমাণ")}</span><input class="input" name="amount" type="number" required></label>
      <label class="field"><span>${tx("Reason", "কারণ")}</span><input class="input" name="reason"></label><label class="field"><span>${tx("Outcome", "ফলাফল")}</span><select class="input" name="outcome"><option value="open">${tx("Open", "চলমান")}</option><option value="lost">${tx("Lost", "হেরেছি")}</option><option value="won">${tx("Won", "জিতেছি")}</option></select></label></div>
      <button class="btn danger">${tx("Log chargeback", "রেকর্ড করুন")}</button></form>` : ""}<div class="card" style="margin-top:14px"><div class="toolbar"><button class="btn sm" id="csv">${icon("download")} CSV</button></div><div id="list"></div></div>`);
    const table = listTable($("#list", body), {
      columns: [
        { label: { en: "Order", bn: "অর্ডার" }, render: (r) => html`<a class="mono" href="#/orders/${r.order_id}">${r.order_no}</a><br><span class="small muted">${dt(r.created_at, true)}</span>` },
        { label: { en: "Buyer", bn: "ক্রেতা" }, render: (r) => `${r.customer_name ?? ""} ${r.customer_phone ?? ""}` },
        { label: { en: "Amount", bn: "পরিমাণ" }, render: (r) => `${r.payment_method} · ${money(r.amount)}` },
        { label: { en: "Outcome", bn: "ফলাফল" }, render: (r) => (can("fraud.act") ? html`<select class="input" data-cb="${r.id}">${["open", "lost", "won"].map((o) => html`<option ${o === r.outcome ? "selected" : ""}>${o}</option>`)}</select>` : pill(r.outcome)) },
      ],
    });
    const load = async () => { table.loading(); try { table.render({ ...(await api("/chargebacks")), page: 1, pages: 1 }); } catch (e) { table.error(e, load); } };
    $("#csv", body).onclick = () => exportCsv("/chargebacks", "chargebacks").catch((e) => toast(errMsg(e), "err"));
    $("#cbf", body)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try { toast(msg(await api("/chargebacks", { method: "POST", body: { orderNo: f.orderNo.value.trim(), amount: Number(f.amount.value), reason: f.reason.value.trim() || null, outcome: f.outcome.value } }))); f.reset(); load(); }
      catch (err) { showErrors(f, err); toast(errMsg(err), "err"); }
    });
    body.onchange = async (e) => { const s = e.target.closest("[data-cb]"); if (s) { try { await api(`/chargebacks/${s.dataset.cb}`, { method: "PUT", body: { outcome: s.value } }); toast(t("saved")); } catch (err) { toast(errMsg(err), "err"); } } };
    body.onclick = null;
    await load();
  }
  $$("[data-tab]", view).forEach((b) => (b.onclick = () => { $$("[data-tab]", view).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); state.tab = b.dataset.tab; (state.tab === "flags" ? flags : chargebacks)(); }));
  await flags();
}
