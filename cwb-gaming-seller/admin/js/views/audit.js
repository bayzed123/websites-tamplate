// Audit log — who (staff, seller, system or buyer) changed what and when. Read-only, CSV export.
import { t, tx, dt } from "../i18n.js";
import { html, icon, api, $, listTable, pill, debounce, exportCsv, toast, errMsg } from "../core.js";

export default async function audit(view) {
  const state = { q: "", entity: "", actor_type: "", page: 1 };
  view.innerHTML = String(html`<div class="page-head"><h1>${t("audit")}</h1><button class="btn" id="csv">${icon("download")} ${t("exportCsv")}</button></div>
    <div class="card"><div class="toolbar">
      <input class="input" id="aq" type="search" placeholder="${t("searchPlaceholder")}" aria-label="${t("searchPlaceholder")}">
      <select class="input" id="aent" aria-label="Entity"><option value="">${tx("All items", "সব বিষয়")}</option>${["order", "order_item", "seller", "listing", "payout", "dispute", "chargeback", "fraud_flag", "game", "product", "commission_rule", "customer", "review", "staff", "settings", "admin", "payment", "media", "report", "system"].map((e) => html`<option>${e}</option>`)}</select>
      <select class="input" id="aact" aria-label="Actor"><option value="">${tx("Everyone", "সবাই")}</option>${["admin", "seller", "system", "customer"].map((e) => html`<option>${e}</option>`)}</select>
    </div><div id="list"></div></div>`);
  const table = listTable($("#list", view), {
    columns: [
      { label: { en: "When", bn: "কখন" }, render: (r) => dt(r.created_at, true) },
      { label: { en: "Who", bn: "কে" }, render: (r) => html`<b>${r.admin_name}</b> ${pill(r.actor_type === "system" ? "inactive" : r.actor_type === "seller" ? "submitted" : "confirmed", r.actor_type)}<br><span class="muted small">${r.ip ?? ""}</span>` },
      { label: { en: "Action", bn: "কাজ" }, render: (r) => pill(/fail|bad|purge|delete|suspend|reveal|kyc_view/.test(r.action) ? "failed" : "confirmed", r.action) },
      { label: { en: "Item", bn: "বিষয়" }, render: (r) => html`${r.entity} ${r.entity_id ? html`#${r.entity_id}` : ""}` },
      { label: { en: "Details", bn: "বিস্তারিত" }, render: (r) => html`<code class="small" style="word-break:break-all">${(typeof r.details === "string" ? r.details : JSON.stringify(r.details ?? "")).slice(0, 220)}</code>` },
    ],
  });
  const load = async () => {
    table.loading();
    const qs = new URLSearchParams(Object.entries({ ...state, limit: "40" }).filter(([, v]) => v !== ""));
    try { const r = await api(`/audit?${qs}`); table.render({ items: r.items, page: state.page, pages: r.items.length === 40 ? state.page + 1 : state.page }, { onPage: (p) => { state.page = p; load(); } }); } catch (e) { table.error(e, load); }
  };
  $("#aq", view).addEventListener("input", debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }));
  $("#aent", view).onchange = (e) => { state.entity = e.target.value; state.page = 1; load(); };
  $("#aact", view).onchange = (e) => { state.actor_type = e.target.value; state.page = 1; load(); };
  $("#csv", view).onclick = async () => { try { await exportCsv(`/audit?${new URLSearchParams(Object.entries(state).filter(([k, v]) => v !== "" && k !== "page"))}`, "audit-log"); } catch (err) { toast(errMsg(err), "err"); } };
  await load();
}
