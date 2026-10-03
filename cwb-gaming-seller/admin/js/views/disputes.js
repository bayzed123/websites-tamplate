// Disputes: buyer report → seller response (24 h) → platform decision: refund buyer / pay seller / split.
import { t, tx, money, dt } from "../i18n.js";
import { html, icon, api, $, $$, can, toast, msg, errMsg, listTable, pill, exportCsv, slideOver, confirmDialog, showErrors } from "../core.js";

export default async function disputes(view, { query, refreshRail }) {
  const state = { status: query.get("status") ?? "" };
  view.innerHTML = String(html`<div class="page-head"><h1>${t("disputes")}</h1><button class="btn" id="csv">${icon("download")} ${t("exportCsv")}</button></div>
    <p class="muted">${tx("While a dispute is open the seller's earning for that line is held. Refunds and splits need a role that can refund.", "বিরোধ চলাকালীন ওই লাইনের সেলারের আয় আটকে থাকে। রিফান্ড ও ভাগাভাগির জন্য রিফান্ড করার অনুমতি লাগে।")}</p>
    <div class="card"><div class="toolbar"><div class="chips">${[["", "All", "সব"], ["awaiting_platform", "Waiting for us", "আমাদের অপেক্ষায়"], ["open", "Waiting for seller", "সেলারের অপেক্ষায়"], ["resolved", "Resolved", "সমাধান"]].map(([v, en, bn]) => html`<button class="chip" data-st="${v}" aria-pressed="${state.status === v}">${tx(en, bn)}</button>`)}</div></div><div id="list"></div></div>`);
  const table = listTable($("#list", view), {
    rowAttrs: (r) => `class="clickable" data-id="${r.id}"`,
    columns: [
      { label: { en: "Dispute", bn: "বিরোধ" }, render: (r) => html`<b class="mono">${r.dispute_no}</b><br><span class="small muted">${r.order_no} · ${dt(r.created_at, true)}</span>` },
      { label: { en: "Item", bn: "আইটেম" }, render: (r) => html`${r.game_name} ${r.product_name_en}<br><span class="small mono">${r.sku}</span>` },
      { label: { en: "Seller", bn: "সেলার" }, render: (r) => `${r.seller_code} ${r.seller_name}` },
      { label: { en: "Reason", bn: "কারণ" }, render: (r) => tx(r.reason_label?.en ?? r.reason, r.reason_label?.bn ?? r.reason) },
      { label: { en: "Status", bn: "অবস্থা" }, render: (r) => html`${pill(r.status)} ${r.resolution ?? ""}` },
    ],
  });
  let rows = [];
  const load = async () => {
    table.loading();
    try { const r = await api(`/disputes${state.status ? `?status=${state.status}` : ""}`); rows = r.items; table.render({ items: rows, page: 1, pages: 1 }); } catch (e) { table.error(e, load); }
  };
  $$("[data-st]", view).forEach((b) => (b.onclick = () => { state.status = b.dataset.st; $$("[data-st]", view).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); load(); }));
  $("#csv", view).onclick = () => exportCsv(`/disputes${state.status ? `?status=${state.status}` : ""}`, "disputes").catch((e) => toast(errMsg(e), "err"));
  $("#list", view).addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) open(rows.find((r) => r.id === Number(tr.dataset.id))); });

  function open(d) {
    if (!d) return;
    const { body, close } = slideOver({
      title: `${d.dispute_no} · ${d.order_no}`,
      wide: true,
      body: html`<div class="split"><div class="card"><h3>${tx("Buyer says", "ক্রেতা বলছেন")}</h3><p><b>${tx(d.reason_label?.en ?? d.reason, d.reason_label?.bn ?? d.reason)}</b></p><p>${d.details}</p>${d.evidence_url ? html`<a href="${d.evidence_url}" target="_blank" rel="noopener noreferrer">${tx("Evidence", "প্রমাণ")}</a>` : ""}<p class="small muted">${d.customer_name} · ${d.customer_phone}</p></div>
        <div class="card"><h3>${tx("Seller says", "সেলার বলছেন")}</h3>${d.seller_response ? html`<p>${d.seller_response}</p>${d.seller_evidence_url ? html`<a href="${d.seller_evidence_url}" target="_blank" rel="noopener noreferrer">${tx("Evidence", "প্রমাণ")}</a>` : ""}<p class="small muted">${dt(d.seller_responded_at, true)}</p>` : html`<p class="muted">${tx("No answer yet. Deadline", "এখনো উত্তর নেই। সময়সীমা")} ${dt(d.seller_deadline, true)}</p>`}</div></div>
        <div class="card" style="margin-top:12px"><dl class="kv"><dt>${tx("Item", "আইটেম")}</dt><dd>${d.game_name} ${d.product_name_en} · <span class="mono">${d.sku}</span> · ${money(d.line_total)}</dd>
          <dt>${tx("Delivery", "ডেলিভারি")}</dt><dd>${d.delivery_method}${d.player_id ? ` → ${d.player_id}${d.server_id ? ` (${d.server_id})` : ""}` : ""}${d.delivery_ref ? ` · ref ${d.delivery_ref}` : ""} · ${dt(d.delivered_at, true)}</dd></dl>
          <a class="btn sm" href="#/orders/${d.order_id}">${tx("Open order", "অর্ডার দেখুন")}</a></div>
        ${d.status === "resolved" ? html`<div class="card" style="margin-top:12px"><b>${d.resolution}</b> · ${money(d.refund_amount)} · ${d.resolution_note ?? ""} <span class="muted small">— ${d.resolved_by}, ${dt(d.resolved_at, true)}</span></div>`
          : can("disputes.resolve") ? html`<form class="card" id="rs" style="margin-top:12px"><h3>${tx("Decision", "সিদ্ধান্ত")}</h3>
            <label class="check"><input type="radio" name="resolution" value="refund_buyer" checked> ${tx("Refund the buyer (seller's earning reversed)", "ক্রেতাকে রিফান্ড (সেলারের আয় ফেরত)")}</label>
            <label class="check"><input type="radio" name="resolution" value="pay_seller"> ${tx("Pay the seller (delivery was correct — doesn't count against them)", "সেলারকে টাকা দিন (ডেলিভারি সঠিক ছিল — তাদের বিপক্ষে গণ্য হবে না)")}</label>
            <label class="check"><input type="radio" name="resolution" value="split"> ${tx("Split: refund part, seller keeps the rest", "ভাগাভাগি: আংশিক রিফান্ড, বাকিটা সেলার পাবেন")}</label>
            <div class="grid2" style="margin-top:8px"><label class="field"><span>${tx("Refund amount (for refund/split)", "রিফান্ডের পরিমাণ (রিফান্ড/ভাগাভাগি)")}</span><input class="input" name="refundAmount" type="number" min="1" max="${d.line_total}" placeholder="${d.line_total}"></label>
            <label class="field"><span>${tx("Note (shown in the history)", "নোট (ইতিহাসে দেখাবে)")}</span><input class="input" name="note" required></label></div>
            <button class="btn primary">${tx("Resolve", "সমাধান করুন")}</button></form>` : ""}`,
    });
    $("#rs", body)?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const resolution = f.resolution.value;
      if (!(await confirmDialog(tx(`Resolve as “${resolution.replace("_", " ")}”? Money moves accordingly.`, `“${resolution}” হিসেবে সমাধান করবেন? সেই অনুযায়ী টাকা যাবে।`), { danger: resolution !== "pay_seller" }))) return;
      try {
        toast(msg(await api(`/disputes/${d.id}/resolve`, { method: "POST", body: { resolution, refundAmount: f.refundAmount.value ? Number(f.refundAmount.value) : undefined, note: f.note.value.trim() } })));
        close(); load(); refreshRail?.();
      } catch (err) { showErrors(f, err); toast(errMsg(err), "err"); }
    });
  }
  await load();
  if (query.get("id")) open(rows.find((r) => r.id === Number(query.get("id"))));
}
