// Orders: list (filters, search, CSV) and the order slide-over with every action — confirm a mobile-banking payment,
// release a held order, force-refund, reassign a line to another seller, deliver on a seller's behalf, reveal codes.
import { t, tx, tt, num, money, dt, dueIn, lang } from "../i18n.js";
import { html, icon, api, $, $$, can, toast, msg, errMsg, listTable, pill, debounce, exportCsv, slideOver, confirmDialog, riskBadge, showErrors } from "../core.js";

const STATUSES = [["", "All", "সব"], ["payment_pending", "Payment pending", "পেমেন্ট বাকি"], ["held", "Held", "আটকে আছে"], ["delivering", "Delivering", "ডেলিভারি হচ্ছে"], ["delivered", "Delivered", "ডেলিভারি সম্পন্ন"], ["partially_delivered", "Partly delivered", "আংশিক"], ["refunded", "Refunded", "রিফান্ড"], ["expired", "Expired", "মেয়াদোত্তীর্ণ"], ["cancelled", "Cancelled", "বাতিল"]];

export default async function orders(view, { id, query, refreshRail }) {
  const state = { q: query.get("q") ?? "", status: query.get("status") ?? "", awaiting_confirmation: query.get("awaiting_confirmation") ?? "", overdue: query.get("overdue") ?? "", payment_method: "", page: 1 };
  view.innerHTML = String(html`<div class="page-head"><h1>${t("orders")}</h1><button class="btn" id="csv">${icon("download")} ${t("exportCsv")}</button></div>
    <div class="card"><div class="toolbar">
      <input class="input" id="q" type="search" placeholder="${tx("Order no., invoice, phone, player ID, TrxID, SKU…", "অর্ডার নং, ইনভয়েস, ফোন, প্লেয়ার আইডি, TrxID, SKU…")}" value="${state.q}" aria-label="${t("search")}">
      <select class="input" id="st" aria-label="Status">${STATUSES.map(([v, en, bn]) => html`<option value="${v}" ${state.status === v ? "selected" : ""}>${tx(en, bn)}</option>`)}</select>
      <select class="input" id="pm" aria-label="Payment"><option value="">${tx("Any payment", "সব পেমেন্ট")}</option>${["bkash", "nagad", "rocket", "card"].map((m) => html`<option>${m}</option>`)}</select>
      <div class="chips"><button class="chip" data-chip="awaiting_confirmation" aria-pressed="${state.awaiting_confirmation === "1"}">${tx("Payments to check", "যাচাইয়ের পেমেন্ট")}</button><button class="chip" data-chip="overdue" aria-pressed="${state.overdue === "1"}">${tx("Late deliveries", "দেরিতে ডেলিভারি")}</button></div>
    </div><div id="list"></div></div>`);
  const table = listTable($("#list", view), {
    rowAttrs: (r) => `class="clickable" data-id="${r.id}"`,
    columns: [
      { label: { en: "Order", bn: "অর্ডার" }, render: (r) => html`<b class="mono">${r.order_no}</b><br><span class="muted small">${dt(r.created_at, true)}${r.invoice_no ? ` · ${r.invoice_no}` : ""}</span>` },
      { label: { en: "Buyer", bn: "ক্রেতা" }, render: (r) => html`${r.customer_name}<br><span class="muted small mono">${r.customer_phone}</span> ${riskBadge(r.risk_level, r.risk_badge)}` },
      { label: { en: "Items", bn: "আইটেম" }, render: (r) => html`<span class="small mono">${r.skus}</span>${r.overdue_lines ? html`<br><span class="sla-late small">${tx("late", "দেরি")}</span>` : ""}` },
      { label: { en: "Payment", bn: "পেমেন্ট" }, render: (r) => html`${r.payment_method} · ${pill(r.payment_status)}${r.payment_trx_claimed && !r.paid_at ? html`<br><span class="small">TrxID <span class="mono">${r.payment_trx_claimed}</span></span>` : ""}` },
      { label: { en: "Total", bn: "মোট" }, render: (r) => money(r.total), cls: "mono" },
      { label: { en: "Status", bn: "অবস্থা" }, render: (r) => pill(r.status, tt(r.status_label)) },
    ],
  });
  let rows = [];
  async function load() {
    table.loading();
    const qs = new URLSearchParams(Object.entries({ ...state, limit: "25" }).filter(([, v]) => v !== ""));
    try { const r = await api(`/orders?${qs}`); rows = r.items; table.render(r, { onPage: (p) => { state.page = p; load(); } }); } catch (e) { table.error(e, load); }
  }
  $("#q", view).addEventListener("input", debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }));
  $("#st", view).onchange = (e) => { state.status = e.target.value; state.page = 1; load(); };
  $("#pm", view).onchange = (e) => { state.payment_method = e.target.value; state.page = 1; load(); };
  $$("[data-chip]", view).forEach((b) => (b.onclick = () => { const k = b.dataset.chip; state[k] = state[k] ? "" : "1"; b.setAttribute("aria-pressed", String(Boolean(state[k]))); state.page = 1; load(); }));
  $("#csv", view).onclick = async () => { try { await exportCsv(`/orders?${new URLSearchParams(Object.entries(state).filter(([k, v]) => v !== "" && k !== "page"))}`, "orders"); } catch (err) { toast(errMsg(err), "err"); } };
  $("#list", view).addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) openOrder(Number(tr.dataset.id), () => { load(); refreshRail?.(); }); });
  await load();
  if (id) openOrder(Number(id), () => { load(); refreshRail?.(); });
  void rows;
}

export async function openOrder(orderId, onChange = () => {}) {
  let d;
  try { d = await api(`/orders/${orderId}`); } catch (e) { return toast(errMsg(e), "err"); }
  const o = d.order;
  const unpaid = !o.paid_at;
  const holds = o.hold_reason ?? [];
  const { panel, close, body } = slideOver({
    title: `${tx("Order", "অর্ডার")} ${o.order_no}`,
    wide: true,
    body: html`
      <div class="spread" style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-bottom:12px">${pill(o.status, tt(o.status_label))} ${pill(o.payment_status)} ${riskBadge(o.risk_level, o.risk_badge)} ${o.invoice_no ? html`<span class="mono small">${o.invoice_no}</span>` : ""}</div>
      ${holds.length ? html`<div class="card" style="border-color:var(--warn)"><b>${tx("Held because", "আটকে থাকার কারণ")}:</b><ul style="margin:6px 0 0">${holds.map((h) => html`<li>${tx(h.en, h.bn)}</li>`)}</ul></div>` : ""}
      <div class="split" style="margin-top:12px">
        <div class="card"><h3>${tx("Payment", "পেমেন্ট")}</h3><dl class="kv">
          <dt>${tx("Method", "পদ্ধতি")}</dt><dd>${o.payment_method} · ${o.payment_mode}</dd>
          <dt>${tx("Total", "মোট")}</dt><dd class="mono">${money(o.total)}${o.points_used ? ` (${tx("points", "পয়েন্ট")} ${money(o.points_used)})` : ""}</dd>
          <dt>${tx("Confirmed ref", "নিশ্চিত রেফ")}</dt><dd class="mono">${o.payment_ref ?? "—"}</dd>
          <dt>${tx("Paid", "পেমেন্ট হয়েছে")}</dt><dd>${o.paid_at ? `${dt(o.paid_at, true)} · ${money(o.paid_amount)}` : "—"}</dd>
          ${o.payment_trx_claimed ? html`<dt>${tx("Buyer's TrxID (unverified)", "ক্রেতার TrxID (যাচাই হয়নি)")}</dt><dd class="mono">${o.payment_trx_claimed}${o.trx_used_elsewhere.length ? html` <span class="pill failed">${tx("also on", "আরও আছে")} ${o.trx_used_elsewhere.join(", ")}</span>` : ""}</dd>` : ""}
          ${o.refunded_amount ? html`<dt>${tx("Refunded", "রিফান্ড")}</dt><dd class="mono">${money(o.refunded_amount)}</dd>` : ""}
          <dt>${tx("Expires", "মেয়াদ")}</dt><dd>${unpaid ? dt(o.expires_at, true) : "—"}</dd></dl></div>
        <div class="card"><h3>${tx("Buyer", "ক্রেতা")}</h3><dl class="kv"><dt>${tx("Name", "নাম")}</dt><dd>${o.customer_name}</dd><dt>${t("phone")}</dt><dd class="mono">${o.customer_phone}</dd>
          ${o.customer_email ? html`<dt>Email</dt><dd>${o.customer_email}</dd>` : ""}
          ${d.customer ? html`<dt>${tx("History", "ইতিহাস")}</dt><dd>${num(d.customer.delivered_orders)} ${tx("delivered", "ডেলিভারি")} · ${num(d.customer.chargeback_count)} ${tx("chargebacks", "চার্জব্যাক")}${d.customer.is_blocked ? html` ${pill("blocked")}` : ""}</dd>` : ""}
          <dt>IP / ${tx("device", "ডিভাইস")}</dt><dd class="mono small">${o.ip ?? "—"} · ${(o.device_id ?? "—").slice(0, 10)}</dd>
          <dt>UTM</dt><dd class="small">${[o.utm_source, o.utm_medium, o.utm_campaign].filter(Boolean).join(" / ") || "—"}</dd></dl>
          ${d.customer ? html`<a class="btn sm" href="#/customers?id=${d.customer.id}">${tx("Open buyer", "ক্রেতা দেখুন")}</a>` : ""}</div>
      </div>
      <h3 style="margin-top:16px">${tx("Lines", "লাইন")}</h3>
      ${d.items.map((i) => html`<div class="card" style="margin-bottom:8px">
        <div class="spread" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${i.game_name} · ${lang() === "bn" ? i.product_name_bn : i.product_name_en} × ${num(i.quantity)}</b><br>
          <span class="small mono">${i.sku}</span> · <a href="#/sellers/${i.seller_id}">${i.seller_code} ${i.seller_name}</a> ${pill(i.seller_standing)}</div>
          <div style="text-align:right">${pill(i.fulfillment_status)}<br><span class="mono small">${money(i.line_total)} · ${tx("fee", "কমিশন")} ${money(i.commission_amount)}</span></div></div>
        <div class="small" style="margin-top:6px">${i.delivery_method === "direct" ? html`${tx("Direct to", "সরাসরি")} <b class="mono">${i.player_id}${i.server_id ? ` (${i.server_id})` : ""}</b>${i.player_name ? ` · ${i.player_name}` : ""}` : tx("Redeem code", "রিডিম কোড")} · ${i.fulfillment_source}
          ${i.fulfillment_status === "queued" ? html` · <span class="${Date.parse(i.sla_due_at) < Date.now() ? "sla-late" : "sla-ok"}">${dueIn(i.sla_due_at)}</span>` : ""}
          ${i.delivered_at ? html` · ${tx("delivered", "ডেলিভারি")} ${dt(i.delivered_at, true)} ${tx("by", "দ্বারা")} ${i.delivered_by}${i.delivery_ref ? html` · ref <span class="mono">${i.delivery_ref}</span>` : ""}` : ""}
          ${i.code_last4s ? html` · ${tx("codes", "কোড")} <span class="mono">${i.code_last4s}</span>` : ""} · ${tx("payout", "পেআউট")}: ${pill(i.payout_status)}</div>
        <div class="one-tap" style="margin-top:8px">
          ${can("orders.update") && ["awaiting_payment", "held", "queued"].includes(i.fulfillment_status) ? html`<button class="btn sm" data-reassign="${i.id}">${tx("Reassign", "অন্য সেলারকে দিন")}</button>` : ""}
          ${can("orders.update") && i.fulfillment_status === "queued" ? html`<button class="btn sm" data-fulfil="${i.id}" data-method="${i.delivery_method}" data-qty="${i.quantity}">${tx("Deliver for seller", "সেলারের হয়ে ডেলিভারি")}</button>` : ""}
          ${can("orders.reveal") && i.codes_delivered ? html`<button class="btn sm ghost" data-reveal="${i.id}">${icon("info")} ${tx("Reveal codes", "কোড দেখুন")}</button>` : ""}
        </div><div data-slot="${i.id}"></div></div>`)}
      <div class="one-tap" style="margin:14px 0">
        ${unpaid && can("orders.release") ? html`<button class="btn primary" id="confirm-pay">${tx("Confirm payment received", "পেমেন্ট পেয়েছি — নিশ্চিত করুন")}</button>` : ""}
        ${o.status === "held" && can("orders.release") ? html`<button class="btn primary" id="release">${tx("Release (deliver now)", "রিলিজ (এখন ডেলিভারি)")}</button>` : ""}
        ${o.paid_at && can("orders.refund") && o.payment_status !== "refunded" ? html`<button class="btn danger" id="refund">${tx("Refund", "রিফান্ড")}</button>` : ""}
        ${unpaid && can("orders.update") && ["payment_pending", "payment_failed"].includes(o.status) ? html`<button class="btn danger" id="cancel">${tx("Cancel unpaid order", "পেমেন্টবিহীন অর্ডার বাতিল")}</button>` : ""}
      </div>
      <div id="action-slot"></div>
      ${can("orders.update") ? html`<label class="field"><span>${tx("Internal notes", "অভ্যন্তরীণ নোট")}</span><textarea class="input" id="notes" rows="3">${o.admin_notes ?? ""}</textarea></label><button class="btn sm" id="save-notes">${t("save")}</button>` : ""}
      ${d.flags.length ? html`<h3 style="margin-top:16px">${tx("Risk flags", "ঝুঁকির সতর্কতা")}</h3>${d.flags.map((f) => html`<div class="small">${pill(f.status, f.kind)} ${tx(f.reason_en, f.reason_bn)} <span class="muted">${dt(f.created_at, true)}</span></div>`)}` : ""}
      <h3 style="margin-top:16px">${tx("Payment events", "পেমেন্ট ইভেন্ট")}</h3>${d.paymentEvents.length ? d.paymentEvents.map((p) => html`<div class="small">${dt(p.created_at, true)} · <b>${p.gateway}</b> ${p.event} <span class="mono">${p.ref}</span> ${p.amount != null ? money(p.amount) : ""} ${p.verified ? pill("ok", tx("verified", "যাচাইকৃত")) : pill("pending", tx("unverified", "অযাচাইকৃত"))}</div>`) : html`<p class="muted small">—</p>`}
      <h3 style="margin-top:16px">${tx("History", "ইতিহাস")}</h3>${d.history.map((h) => html`<div class="small" style="padding:3px 0">${dt(h.created_at, true)} · ${pill(h.status)} ${h.note ?? ""} <span class="muted">— ${h.actor}</span></div>`)}`,
  });

  const done = async (p, text) => {
    try { toast(msg(await p) || text || t("saved")); close(); onChange(); openOrder(orderId, onChange); } catch (err) { toast(errMsg(err), "err"); throw err; }
  };
  const slot = $("#action-slot", body);
  $("#confirm-pay", body)?.addEventListener("click", () => {
    slot.innerHTML = String(html`<form class="card" id="cpf"><p class="small">${tx("Only confirm after you found this exact money in the merchant account (app or statement). This releases the order.", "মার্চেন্ট অ্যাকাউন্টে (অ্যাপ বা স্টেটমেন্টে) ঠিক এই টাকা খুঁজে পাওয়ার পরই নিশ্চিত করুন। এতে অর্ডার রিলিজ হবে।")}</p>
      <div class="grid2"><label class="field"><span>TrxID</span><input class="input mono" name="trxId" value="${o.payment_trx_claimed ?? ""}" required></label><label class="field"><span>${tx("Amount received", "প্রাপ্ত টাকা")}</span><input class="input" name="amount" type="number" value="${o.total}" required></label></div>
      <label class="field"><span>${tx("Note", "নোট")}</span><input class="input" name="note"></label><button class="btn primary">${tx("Confirm payment", "পেমেন্ট নিশ্চিত করুন")}</button></form>`);
    $("#cpf", body).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      if (!(await confirmDialog(tx(`Confirm ৳${f.amount.value} received with TrxID ${f.trxId.value}?`, `TrxID ${f.trxId.value} দিয়ে ৳${f.amount.value} পেয়েছেন নিশ্চিত?`), { danger: false }))) return;
      done(api(`/orders/${orderId}/confirm-payment`, { method: "POST", body: { trxId: f.trxId.value.trim(), amount: Number(f.amount.value), note: f.note.value.trim() || null } })).catch((err) => showErrors(f, err));
    });
  });
  $("#release", body)?.addEventListener("click", async () => {
    if (!(await confirmDialog(tx("Release this order? Delivery starts immediately.", "অর্ডারটি রিলিজ করবেন? সাথে সাথে ডেলিভারি শুরু হবে।"), { danger: false }))) return;
    done(api(`/orders/${orderId}/release`, { method: "POST", body: {} }));
  });
  $("#cancel", body)?.addEventListener("click", async () => {
    const reason = prompt(tx("Reason for cancelling", "বাতিলের কারণ"));
    if (reason) done(api(`/orders/${orderId}/cancel`, { method: "POST", body: { reason } }));
  });
  $("#refund", body)?.addEventListener("click", () => {
    const open = d.items.filter((i) => !["refunded", "cancelled"].includes(i.fulfillment_status));
    slot.innerHTML = String(html`<form class="card" id="rff"><p class="small">${tx("Records the refund and reverses seller earnings for the chosen lines. Send the money back through the payment merchant panel.", "রিফান্ড রেকর্ড হয় এবং বাছাই করা লাইনের সেলারের আয় ফেরত যায়। টাকা পেমেন্ট মার্চেন্ট প্যানেল থেকে ফেরত পাঠান।")}</p>
      ${open.map((i) => html`<label class="check"><input type="checkbox" name="item" value="${i.id}" checked> ${i.sku} · ${money(i.line_total)} (${i.fulfillment_status})</label>`)}
      <div class="grid2"><label class="field"><span>${tx("Amount (empty = the chosen lines)", "পরিমাণ (খালি = বাছাই করা লাইন)")}</span><input class="input" name="amount" type="number" min="1"></label><label class="field"><span>${tx("Reason", "কারণ")}</span><input class="input" name="reason" required></label></div>
      <button class="btn danger">${tx("Record refund", "রিফান্ড রেকর্ড করুন")}</button></form>`);
    $("#rff", body).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const itemIds = [...f.querySelectorAll("[name=item]:checked")].map((x) => Number(x.value));
      if (!(await confirmDialog(tx("Record this refund? It can't be undone.", "এই রিফান্ড রেকর্ড করবেন? আর ফেরানো যাবে না।")))) return;
      done(api(`/orders/${orderId}/refund`, { method: "POST", body: { itemIds, amount: f.amount.value ? Number(f.amount.value) : undefined, reason: f.reason.value.trim() } })).catch((err) => showErrors(f, err));
    });
  });
  $("#save-notes", body)?.addEventListener("click", () => api(`/orders/${orderId}/notes`, { method: "PUT", body: { notes: $("#notes", body).value } }).then(() => toast(t("saved"))).catch((e) => toast(errMsg(e), "err")));

  body.addEventListener("click", async (e) => {
    const ra = e.target.closest("[data-reassign]");
    if (ra) {
      const itemId = Number(ra.dataset.reassign);
      const s = $(`[data-slot="${itemId}"]`, body);
      try {
        const r = await api(`/orders/${orderId}/reassign-options?item=${itemId}`);
        s.innerHTML = r.items.length
          ? String(html`<div style="margin-top:8px">${r.items.map((l) => html`<div class="att-row"><span class="att-main">${l.code} ${l.store_name} ${l.is_official ? pill("active", tx("Official", "অফিসিয়াল")) : ""} · ${money(l.price)} · ${l.delivery_method}${l.codes_prestocked ? ` · ${tx("stock", "স্টক")} ${l.stock}` : ""} ${pill(l.standing)}</span><button class="btn sm primary" data-to="${l.id}" data-item="${itemId}">${tx("Move here", "এখানে দিন")}</button></div>`)}</div>`)
          : String(html`<p class="muted small">${tx("No other seller lists this pack right now.", "এই মুহূর্তে আর কোনো সেলার এই প্যাক লিস্ট করেননি।")}</p>`);
      } catch (err) { toast(errMsg(err), "err"); }
    }
    const to = e.target.closest("[data-to]");
    if (to) done(api(`/orders/${orderId}/reassign`, { method: "POST", body: { itemId: Number(to.dataset.item), listingId: Number(to.dataset.to) } }));
    const fu = e.target.closest("[data-fulfil]");
    if (fu) {
      const itemId = Number(fu.dataset.fulfil);
      const s = $(`[data-slot="${itemId}"]`, body);
      const code = fu.dataset.method === "code";
      s.innerHTML = String(html`<form class="card" data-ff="${itemId}" style="margin-top:8px">${code ? html`<label class="field"><span>${tx(`Codes (${fu.dataset.qty}, one per line)`, `কোড (${fu.dataset.qty}টি, প্রতি লাইনে একটি)`)}</span><textarea class="input mono" name="codes" rows="3" required></textarea></label>` : html`<label class="field"><span>${tx("Top-up reference / transaction ID", "টপ-আপ রেফারেন্স / ট্রানজেকশন আইডি")}</span><input class="input mono" name="deliveryRef" required></label>`}
        <label class="field"><span>${tx("Note", "নোট")}</span><input class="input" name="note"></label><button class="btn primary">${tx("Mark delivered", "ডেলিভারি সম্পন্ন")}</button></form>`);
    }
    const rv = e.target.closest("[data-reveal]");
    if (rv) {
      const reason = prompt(tx("Why do you need to see the code? (saved in the audit log)", "কোড কেন দেখতে চান? (অডিট লগে থাকবে)"));
      if (!reason) return;
      try {
        const r = await api(`/orders/${orderId}/reveal`, { method: "POST", body: { itemId: Number(rv.dataset.reveal), reason } });
        $(`[data-slot="${rv.dataset.reveal}"]`, body).innerHTML = String(html`${r.codes.map((c) => html`<div class="codebox" style="margin-top:6px">${c.code}</div>`)}`);
      } catch (err) { toast(errMsg(err), "err"); }
    }
  });
  body.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-ff]");
    if (!f) return;
    e.preventDefault();
    const codes = f.codes ? f.codes.value.split(/\n+/).map((x) => x.trim()).filter(Boolean) : undefined;
    done(api(`/orders/${orderId}/fulfil`, { method: "POST", body: { itemId: Number(f.dataset.ff), codes, deliveryRef: f.deliveryRef?.value.trim() || null, note: f.note.value.trim() || null } })).catch((err) => showErrors(f, err));
  });
  void panel;
}
