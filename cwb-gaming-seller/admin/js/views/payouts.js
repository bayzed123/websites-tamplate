// Payouts: approve, mark paid (with the transfer reference) or reject — one tap each, CSV export.
import { t, tx, num, money, dt } from "../i18n.js";
import { html, icon, api, $, $$, can, toast, msg, errMsg, listTable, pill, exportCsv, slideOver, confirmDialog, showErrors } from "../core.js";

export default async function payouts(view, { query, refreshRail }) {
  const state = { status: query.get("status") ?? "" };
  view.innerHTML = String(html`<div class="page-head"><h1>${t("payouts")}</h1><button class="btn" id="csv">${icon("download")} ${t("exportCsv")}</button></div>
    <p class="muted">${tx("Sellers request payouts of earnings that cleared the hold window. A payout account changed in the last 72 hours blocks new requests (account-takeover guard).", "হোল্ড সময় পার হওয়া আয়ের জন্য সেলার পেআউট চান। গত ৭২ ঘণ্টায় পেআউট অ্যাকাউন্ট বদলালে নতুন অনুরোধ বন্ধ থাকে (অ্যাকাউন্ট দখল প্রতিরোধ)।")}</p>
    <div class="card"><div class="toolbar"><div class="chips">${[["", "All", "সব"], ["requested", "Requested", "অনুরোধ"], ["approved", "Approved", "অনুমোদিত"], ["paid", "Paid", "পরিশোধিত"], ["rejected", "Rejected", "বাতিল"]].map(([v, en, bn]) => html`<button class="chip" data-st="${v}" aria-pressed="${state.status === v}">${tx(en, bn)}</button>`)}</div></div><div id="list"></div></div>`);
  const table = listTable($("#list", view), {
    rowAttrs: (r) => `class="clickable" data-id="${r.id}"`,
    columns: [
      { label: { en: "Payout", bn: "পেআউট" }, render: (r) => html`<b class="mono">${r.payout_no}</b><br><span class="small muted">${dt(r.requested_at, true)}</span>` },
      { label: { en: "Seller", bn: "সেলার" }, render: (r) => html`${r.seller_code} ${r.seller_name} ${pill(r.standing)}${r.open_disputes ? html` ${pill("open", `${r.open_disputes} ${tx("disputes", "বিরোধ")}`)}` : ""}` },
      { label: { en: "To", bn: "যেখানে" }, render: (r) => html`${r.account.method} · <span class="mono">${r.account.number}</span><br><span class="small">${r.account.name ?? ""}</span>` },
      { label: { en: "Amount", bn: "পরিমাণ" }, render: (r) => html`<b>${money(r.amount)}</b><br><span class="small muted">${num(r.item_count)} ${tx("lines", "লাইন")}</span>`, cls: "mono" },
      { label: { en: "Status", bn: "অবস্থা" }, render: (r) => html`${pill(r.status)}${r.txn_ref ? html`<br><span class="small mono">${r.txn_ref}</span>` : ""}` },
    ],
    actions: (r) => (can("payouts.decide") && ["requested", "approved"].includes(r.status) ? html`${r.status === "requested" ? html`<button class="btn sm" data-approve="${r.id}">${tx("Approve", "অনুমোদন")}</button>` : ""} <button class="btn sm primary" data-paid="${r.id}">${tx("Mark paid", "পরিশোধিত")}</button> <button class="btn sm danger" data-reject="${r.id}">${tx("Reject", "বাতিল")}</button>` : ""),
  });
  let rows = [];
  const load = async () => { table.loading(); try { rows = (await api(`/payouts${state.status ? `?status=${state.status}` : ""}`)).items; table.render({ items: rows, page: 1, pages: 1 }); } catch (e) { table.error(e, load); } };
  const decide = async (id, decision, extra = {}) => { try { toast(msg(await api(`/payouts/${id}/decide`, { method: "POST", body: { decision, ...extra } }))); load(); refreshRail?.(); } catch (err) { toast(errMsg(err), "err"); } };
  $$("[data-st]", view).forEach((b) => (b.onclick = () => { state.status = b.dataset.st; $$("[data-st]", view).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); load(); }));
  $("#csv", view).onclick = () => exportCsv(`/payouts${state.status ? `?status=${state.status}` : ""}`, "payouts").catch((e) => toast(errMsg(e), "err"));
  view.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-approve],[data-paid],[data-reject]");
    if (a) {
      e.stopPropagation();
      if (a.dataset.approve) return (await confirmDialog(tx("Approve this payout?", "এই পেআউট অনুমোদন দেবেন?"), { danger: false })) && decide(a.dataset.approve, "approve");
      if (a.dataset.paid) { const ref = prompt(tx("Transfer reference (bKash/Nagad TrxID or bank ref)", "ট্রান্সফার রেফারেন্স (বিকাশ/নগদ TrxID বা ব্যাংক রেফ)")); if (ref) decide(a.dataset.paid, "paid", { txnRef: ref }); return; }
      if (a.dataset.reject) { const note = prompt(tx("Reason (shown to the seller)", "কারণ (সেলার দেখবেন)")); if (note) decide(a.dataset.reject, "reject", { note }); return; }
    }
    const tr = e.target.closest("tr[data-id]");
    if (tr) openPayout(Number(tr.dataset.id));
  });
  async function openPayout(id) {
    try {
      const r = await api(`/payouts/${id}`);
      slideOver({ title: r.payout.payout_no, wide: true, body: html`<p>${r.payout.seller_code} ${r.payout.seller_name} · <b>${money(r.payout.amount)}</b> · ${pill(r.payout.status)}</p>
        <table class="table"><thead><tr><th>${tx("Order", "অর্ডার")}</th><th>SKU</th><th>${tx("Line", "লাইন")}</th><th>${tx("Commission", "কমিশন")}</th><th>${tx("Earning", "আয়")}</th></tr></thead><tbody>${r.lines.map((l) => html`<tr><td class="mono">${l.order_no}</td><td class="mono small">${l.sku}</td><td>${money(l.line_total)}</td><td>${money(l.commission_amount)}</td><td><b>${money(l.seller_earning)}</b></td></tr>`)}</tbody></table>` });
    } catch (err) { toast(errMsg(err), "err"); }
  }
  await load();
  if (query.get("id")) openPayout(Number(query.get("id")));
  void showErrors;
}
