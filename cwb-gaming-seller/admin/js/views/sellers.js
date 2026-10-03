// Seller Applications (KYC review queue) and Sellers (standing, listings, balance, suspend / reinstate, tier & SLA).
// KYC documents are fetched with the staff session and shown from memory — never through a public URL.
import { t, tx, num, money, dt } from "../i18n.js";
import { html, icon, api, $, $$, can, toast, msg, errMsg, listTable, pill, debounce, exportCsv, slideOver, confirmDialog, riskBadge, showErrors } from "../core.js";

const STATUS = [["submitted", "Waiting for review", "যাচাইয়ের অপেক্ষায়"], ["info_requested", "More info requested", "আরও তথ্য চাওয়া হয়েছে"], ["draft", "Not submitted yet", "এখনো জমা দেননি"], ["rejected", "Rejected", "বাতিল"]];
const DOC = { id_front: ["ID (front)", "পরিচয়পত্র (সামনে)"], id_back: ["ID (back)", "পরিচয়পত্র (পেছনে)"], selfie: ["Selfie with ID", "পরিচয়পত্র হাতে সেলফি"], trade_licence: ["Trade licence", "ট্রেড লাইসেন্স"], other: ["Other", "অন্যান্য"] };

export default async function sellers(view, { key, id, query, refreshRail }) {
  const apps = key === "applications";
  const state = { q: "", status: apps ? query.get("status") ?? "submitted" : query.get("status") ?? "", standing: query.get("standing") ?? "", page: 1 };
  view.innerHTML = String(html`<div class="page-head"><h1>${t(key)}</h1>${apps ? "" : html`<button class="btn" id="csv">${icon("download")} ${t("exportCsv")}</button>`}</div>
    ${apps ? html`<p class="muted">${tx("Approve only when the ID, the selfie and the name on the payout account match. Sellers can't sell anything until approved, and two-step sign-in must already be on.", "পরিচয়পত্র, সেলফি ও পেআউট অ্যাকাউন্টের নাম মিললেই অনুমোদন দিন। অনুমোদনের আগে সেলার কিছু বিক্রি করতে পারেন না, আর দুই-ধাপের সাইন-ইন আগেই চালু থাকতে হবে।")}</p>` : ""}
    <div class="card"><div class="toolbar">
      ${apps ? html`<div class="chips">${STATUS.map(([v, en, bn]) => html`<button class="chip" data-st="${v}" aria-pressed="${state.status === v}">${tx(en, bn)}</button>`)}</div>`
        : html`<input class="input" id="q" type="search" placeholder="${tx("Store, code, email, phone…", "স্টোর, কোড, ইমেইল, ফোন…")}" aria-label="${t("search")}">
          <select class="input" id="st" aria-label="Status"><option value="">${tx("All statuses", "সব অবস্থা")}</option>${["approved", "suspended", "submitted", "info_requested", "draft", "rejected"].map((s) => html`<option ${state.status === s ? "selected" : ""}>${s}</option>`)}</select>
          <select class="input" id="sd" aria-label="Standing"><option value="">${tx("Any standing", "সব অবস্থান")}</option><option value="good" ${state.standing === "good" ? "selected" : ""}>🟢 ${tx("Good standing", "ভালো অবস্থান")}</option><option value="watch" ${state.standing === "watch" ? "selected" : ""}>🟡 ${tx("Watch", "নজরে")}</option><option value="review" ${state.standing === "review" ? "selected" : ""}>🔴 ${tx("Under review", "পর্যালোচনায়")}</option></select>`}
    </div><div id="list"></div></div>`);
  const table = listTable($("#list", view), {
    rowAttrs: (r) => `class="clickable" data-id="${r.id}"`,
    columns: apps
      ? [
          { label: { en: "Store", bn: "স্টোর" }, render: (r) => html`<b>${r.store_name}</b><br><span class="muted small">${r.code} · ${r.owner_name}</span>` },
          { label: { en: "Contact", bn: "যোগাযোগ" }, render: (r) => html`<span class="small">${r.email}<br>${r.phone}${r.phone_verified_at ? " ✓" : ""}</span>` },
          { label: { en: "Documents", bn: "ডকুমেন্ট" }, render: (r) => num(r.doc_count) },
          { label: "2FA", render: (r) => (r.totp_enabled ? pill("ok", "on") : pill("failed", "off")) },
          { label: { en: "Submitted", bn: "জমা" }, render: (r) => dt(r.submitted_at ?? r.created_at, true) },
        ]
      : [
          { label: { en: "Seller", bn: "সেলার" }, render: (r) => html`<b>${r.store_name}</b>${r.is_official ? html` ${pill("active", tx("Official", "অফিসিয়াল"))}` : ""}${r.is_verified ? html` ${pill("ok", tx("Verified", "ভেরিফায়েড"))}` : ""}<br><span class="muted small">${r.code} · ${r.commission_tier}</span>` },
          { label: { en: "Status", bn: "অবস্থা" }, render: (r) => pill(r.status) },
          { label: { en: "Standing", bn: "অবস্থান" }, render: (r) => riskBadge(r.standing, r.standing_badge, r.standing_reason) },
          { label: { en: "Delivered / disputes", bn: "ডেলিভারি / বিরোধ" }, render: (r) => `${num(r.delivered_count)} / ${num(r.dispute_count)}` },
          { label: { en: "Rating", bn: "রেটিং" }, render: (r) => (r.rating_count ? `★ ${r.rating_avg} (${num(r.rating_count)})` : "—") },
          { label: { en: "Queue", bn: "কিউ" }, render: (r) => (r.queued ? pill("queued", num(r.queued)) : "0") },
          { label: "GMV", render: (r) => money(r.gmv), cls: "mono" },
        ],
  });
  async function load() {
    table.loading();
    try {
      const r = apps ? await api(`/sellers/applications?status=${state.status}`) : await api(`/sellers?${new URLSearchParams(Object.entries({ ...state, limit: "25" }).filter(([, v]) => v !== ""))}`);
      table.render(apps ? { items: r.items, page: 1, pages: 1 } : r, { onPage: (p) => { state.page = p; load(); } });
    } catch (e) { table.error(e, load); }
  }
  const reload = () => { load(); refreshRail?.(); };
  $$("[data-st]", view).forEach((b) => (b.onclick = () => { state.status = b.dataset.st; $$("[data-st]", view).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); load(); }));
  $("#q", view)?.addEventListener("input", debounce((e) => { state.q = e.target.value.trim(); state.page = 1; load(); }));
  $("#st", view)?.addEventListener("change", (e) => { state.status = e.target.value; state.page = 1; load(); });
  $("#sd", view)?.addEventListener("change", (e) => { state.standing = e.target.value; state.page = 1; load(); });
  $("#csv", view)?.addEventListener("click", async () => { try { await exportCsv(`/sellers?${new URLSearchParams(Object.entries(state).filter(([k, v]) => v !== "" && k !== "page"))}`, "sellers"); } catch (err) { toast(errMsg(err), "err"); } });
  $("#list", view).addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) openSeller(Number(tr.dataset.id), reload); });
  await load();
  if (id) openSeller(Number(id), reload);
}

async function openSeller(sellerId, onChange) {
  let d;
  try { d = await api(`/sellers/${sellerId}`); } catch (e) { return toast(errMsg(e), "err"); }
  const s = d.seller;
  const reviewable = ["submitted", "info_requested"].includes(s.status);
  const { body, close } = slideOver({
    title: `${s.store_name} · ${s.code}`,
    wide: true,
    body: html`<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${pill(s.status)} ${riskBadge(s.standing, s.standing_badge, s.standing_reason)} ${s.is_verified ? pill("ok", tx("Verified Seller (earned)", "ভেরিফায়েড সেলার (অর্জিত)")) : ""} ${s.totp_enabled ? pill("ok", "2FA") : pill("failed", tx("no 2FA", "2FA নেই"))}</div>
      <div class="split">
        <div class="card"><h3>${tx("Identity & business", "পরিচয় ও ব্যবসা")}</h3><dl class="kv">
          <dt>${tx("Owner", "মালিক")}</dt><dd>${s.owner_name}</dd><dt>Email</dt><dd>${s.email}</dd><dt>${t("phone")}</dt><dd>${s.phone} ${s.phone_verified_at ? "✓" : html`<span class="pill failed">${tx("not verified", "যাচাই হয়নি")}</span>`}</dd>
          <dt>${tx("Business", "ব্যবসা")}</dt><dd>${s.business_name ?? "—"}</dd><dt>${tx("Address", "ঠিকানা")}</dt><dd>${s.business_address ?? "—"}</dd>
          <dt>${tx("ID", "পরিচয়পত্র")}</dt><dd>${s.id_doc_type ?? "—"} ${s.id_doc_number_last4 ? `…${s.id_doc_number_last4}` : ""}</dd>
          <dt>${tx("Terms accepted", "শর্ত গ্রহণ")}</dt><dd>${dt(s.terms_accepted_at)} (${s.terms_version ?? ""})</dd></dl></div>
        <div class="card"><h3>${tx("Payout & terms", "পেআউট ও শর্ত")}</h3><dl class="kv">
          <dt>${tx("Payout", "পেআউট")}</dt><dd>${s.payout_method ?? "—"} · ${s.payout_account_name ?? ""} · <span class="mono">${s.payout_account_number ?? ""}</span>${s.payout_bank_name ? ` · ${s.payout_bank_name} ${s.payout_branch ?? ""}` : ""}</dd>
          <dt>${tx("Changed", "পরিবর্তন")}</dt><dd>${dt(s.payout_changed_at, true)}</dd>
          <dt>${tx("Tier", "টিয়ার")}</dt><dd>${s.commission_tier}</dd><dt>SLA</dt><dd>${num(s.sla_minutes)} ${tx("min", "মিনিট")}</dd>
          <dt>${tx("Deposit", "জামানত")}</dt><dd>${money(s.security_deposit)}</dd>
          <dt>${tx("Balance", "ব্যালেন্স")}</dt><dd class="small">${tx("pending", "অপেক্ষমাণ")} ${money(d.balance.pending)} · ${tx("available", "তোলা যাবে")} ${money(d.balance.available)} · ${tx("held", "আটকে")} ${money(d.balance.held)} · ${tx("paid", "পরিশোধিত")} ${money(d.balance.paid)}</dd></dl></div>
      </div>
      <h3 style="margin-top:16px">${tx("KYC documents", "KYC ডকুমেন্ট")}</h3>
      ${d.documents.length ? html`<div class="doc-grid">${d.documents.map((doc) => html`<figure><div data-doc="${doc.id}" data-mime="${doc.mime}">${can("sellers.kyc") ? html`<button class="btn sm" type="button" data-show="${doc.id}">${icon("info")} ${tx("Show", "দেখুন")}</button>` : tx("No permission", "অনুমতি নেই")}</div><figcaption class="small">${tx(...DOC[doc.kind])} · ${num(Math.round(doc.size / 1024))} KB · ${dt(doc.uploaded_at)}</figcaption></figure>`)}</div>
        <p class="small muted">${tx("Every view is written to the audit log.", "প্রতিটি দেখা অডিট লগে লেখা হয়।")}</p>` : html`<p class="muted small">${tx("No documents uploaded.", "কোনো ডকুমেন্ট আপলোড হয়নি।")}</p>`}
      ${reviewable && can("sellers.review") ? html`<form class="card" id="decide" style="margin-top:16px"><h3>${tx("Decision", "সিদ্ধান্ত")}</h3>
        <div class="grid2"><label class="field"><span>${tx("Commission tier", "কমিশন টিয়ার")}</span><select class="input" name="commission_tier">${["standard", "silver", "gold"].map((x) => html`<option>${x}</option>`)}</select></label>
          <label class="field"><span>${tx("Delivery deadline (minutes)", "ডেলিভারির সময়সীমা (মিনিট)")}</span><input class="input" name="sla_minutes" type="number" value="${s.sla_minutes}"></label>
          <label class="field"><span>${tx("Security deposit (optional, ৳)", "জামানত (ঐচ্ছিক, ৳)")}</span><input class="input" name="security_deposit" type="number" value="${s.security_deposit}"></label></div>
        <label class="field"><span>${tx("Note to the seller (required to reject or ask for more)", "সেলারের জন্য নোট (বাতিল বা আরও তথ্য চাইতে আবশ্যক)")}</span><textarea class="input" name="note" rows="2"></textarea></label>
        <div class="one-tap"><button class="btn primary" type="submit" data-d="approve">${tx("Approve", "অনুমোদন")}</button><button class="btn" type="submit" data-d="request_info">${tx("Ask for more info", "আরও তথ্য চান")}</button><button class="btn danger" type="submit" data-d="reject">${tx("Reject", "বাতিল")}</button></div></form>` : ""}
      ${!reviewable && can("sellers.manage") && ["approved", "suspended"].includes(s.status) ? html`<form class="card" id="manage" style="margin-top:16px"><h3>${tx("Manage", "পরিচালনা")}</h3>
        <div class="grid2"><label class="field"><span>${tx("Commission tier", "কমিশন টিয়ার")}</span><select class="input" name="commission_tier">${["standard", "silver", "gold", "official"].map((x) => html`<option ${s.commission_tier === x ? "selected" : ""}>${x}</option>`)}</select></label>
          <label class="field"><span>SLA (${tx("minutes", "মিনিট")})</span><input class="input" name="sla_minutes" type="number" value="${s.sla_minutes}"></label>
          <label class="field"><span>${tx("Security deposit (৳)", "জামানত (৳)")}</span><input class="input" name="security_deposit" type="number" value="${s.security_deposit}"></label></div>
        <label class="field"><span>${tx("Reason / note", "কারণ / নোট")}</span><input class="input" name="note"></label>
        <div class="one-tap"><button class="btn primary" type="submit" data-a="update">${t("save")}</button>${s.status === "approved" ? html`<button class="btn danger" type="submit" data-a="suspend">${tx("Suspend", "স্থগিত")}</button>` : html`<button class="btn" type="submit" data-a="reinstate">${tx("Reinstate", "পুনর্বহাল")}</button>`}</div></form>` : ""}
      <h3 style="margin-top:16px">${tx("Listings", "লিস্টিং")} (${num(d.listings.length)})</h3>
      ${d.listings.map((l) => html`<div class="small" style="padding:3px 0"><span class="mono">${l.sku}</span> · ${l.game} ${l.name_en} · ${money(l.price)} · ${l.delivery_method}/${l.fulfillment_source} · ${tx("stock", "স্টক")} ${num(l.stock)} · ${tx("sold", "বিক্রি")} ${num(l.sold_count)} ${l.is_available ? "" : pill("inactive", "off")}</div>`)}
      ${d.flags.length ? html`<h3 style="margin-top:16px">${tx("Flags", "সতর্কতা")}</h3>${d.flags.map((f) => html`<div class="small">${pill(f.status, f.kind)} ${tx(f.reason_en, f.reason_bn)} · ${dt(f.created_at)}</div>`)}` : ""}
      ${d.disputes.length ? html`<h3 style="margin-top:16px">${tx("Disputes", "বিরোধ")}</h3>${d.disputes.map((x) => html`<div class="small"><a href="#/disputes?id=${x.id}">${x.dispute_no}</a> · ${x.reason} · ${pill(x.status)} ${x.resolution ?? ""}</div>`)}` : ""}
      <h3 style="margin-top:16px">${tx("Timeline", "সময়রেখা")}</h3>${d.events.map((ev) => html`<div class="small">${dt(ev.created_at, true)} · <b>${ev.event}</b> ${ev.note ?? ""} <span class="muted">— ${ev.actor}</span></div>`)}`,
  });

  body.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-show]");
    if (!b) return;
    const box = b.parentElement;
    try {
      const res = await fetch(`/api/admin/sellers/${sellerId}/documents/${b.dataset.show}`, { credentials: "same-origin", headers: { "x-requested-with": "fetch" } });
      if (!res.ok) throw new Error(String(res.status));
      const url = URL.createObjectURL(await res.blob());
      box.innerHTML = box.dataset.mime.startsWith("image/") ? String(html`<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt=""></a>`) : String(html`<a class="btn sm" href="${url}" target="_blank" rel="noopener">PDF</a>`);
    } catch (err) { toast(errMsg(err), "err"); }
  });
  let clicked = null;
  body.addEventListener("click", (e) => { const x = e.target.closest("[data-d],[data-a]"); if (x) clicked = x; });
  $("#decide", body)?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const decision = clicked?.dataset.d ?? "approve";
    if (!(await confirmDialog(decision === "approve" ? tx("Approve this seller? They can list and sell right away.", "এই সেলারকে অনুমোদন দেবেন? সাথে সাথে লিস্ট ও বিক্রি করতে পারবেন।") : tx("Send this decision to the seller?", "সিদ্ধান্তটি সেলারকে পাঠাবেন?"), { danger: decision === "reject" }))) return;
    try {
      toast(msg(await api(`/sellers/${sellerId}/decision`, { method: "POST", body: { decision, note: f.note.value.trim() || null, commission_tier: f.commission_tier.value, sla_minutes: Number(f.sla_minutes.value), security_deposit: Number(f.security_deposit.value || 0) } })));
      close(); onChange();
    } catch (err) { showErrors(f, err); toast(errMsg(err), "err"); }
  });
  $("#manage", body)?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    const action = clicked?.dataset.a ?? "update";
    if (action === "suspend" && !(await confirmDialog(tx("Suspend this seller? All their listings go offline and they're signed out.", "এই সেলারকে স্থগিত করবেন? সব লিস্টিং বন্ধ হবে ও সাইন আউট হবেন।")))) return;
    try {
      toast(msg(await api(`/sellers/${sellerId}/manage`, { method: "POST", body: { action, note: f.note.value.trim() || null, commission_tier: f.commission_tier.value, sla_minutes: Number(f.sla_minutes.value), security_deposit: Number(f.security_deposit.value || 0) } })));
      close(); onChange();
    } catch (err) { showErrors(f, err); toast(errMsg(err), "err"); }
  });
}
