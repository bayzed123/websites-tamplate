// Approved-seller pages. Sellers see only what they need to fulfil — pack, quantity, player ID — never the buyer's
// name, phone or any payment detail.
import { tx, lang, num, money, dt, dueIn } from "../../admin/js/i18n.js";
import { html, icon, $, $$, toast, showErrors, slideOver, confirmDialog, pill, listTable, downloadBlob } from "../../admin/js/core.js";
import { sapi, smsg, serr, session } from "./api.js";

const kpi = (c, ico, label, value, sub) => html`<div class="kpi card" style="--c:var(--${c})"><span class="ico">${icon(ico)}</span><div class="label">${label}</div><div class="value">${value}</div>${sub ? html`<span class="delta muted">${sub}</span>` : ""}</div>`;

async function csv(path, name) {
  const res = await fetch(`/api/seller${path}${path.includes("?") ? "&" : "?"}format=csv`, { credentials: "same-origin", headers: { "x-requested-with": "fetch" } });
  if (!res.ok) throw new Error(String(res.status));
  downloadBlob(await res.text(), `${name}-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function dashboard(view) {
  const d = await sapi("/dashboard");
  const t = d.trust;
  const pct = Math.min(100, Math.round((t.verified_progress.delivered / t.verified_progress.needed) * 100));
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("Dashboard", "ড্যাশবোর্ড")}</h1></div>
    <div class="kpis">
      ${kpi("k4", "orders", tx("To deliver now", "এখন ডেলিভারি দিন"), num(d.counts.queued), d.counts.overdue ? tx(`${d.counts.overdue} late!`, `${num(d.counts.overdue)}টি দেরি!`) : tx(`deadline ${d.slaMinutes} min`, `সময়সীমা ${num(d.slaMinutes)} মিনিট`))}
      ${kpi("k1", "money", tx("Earned today", "আজকের আয়"), money(d.counts.earned_today), tx(`${d.counts.delivered_today} delivered`, `${num(d.counts.delivered_today)}টি ডেলিভারি`))}
      ${kpi("k6", "money", tx("Available to withdraw", "তোলা যাবে"), money(d.balance.available), tx(`pending ${money(d.balance.pending)} · held ${money(d.balance.held)}`, `অপেক্ষমাণ ${money(d.balance.pending)} · আটকে ${money(d.balance.held)}`))}
      ${kpi("k2", "reviews", tx("Rating", "রেটিং"), t.rating_count ? `★ ${t.rating_avg}` : "—", tx(`${t.rating_count} ratings`, `${num(t.rating_count)}টি রেটিং`))}
      ${kpi("k5", "alert", tx("Open disputes", "চলমান বিরোধ"), num(d.counts.open_disputes))}
    </div>
    <div class="split">
      <section class="card"><h2>${tx("Your standing", "আপনার অবস্থান")}</h2><p>${pill(t.standing, `${t.standing_badge.icon} ${tx(t.standing_badge.en, t.standing_badge.bn)}`)} ${t.standing_reason ? tx(t.standing_reason.en, t.standing_reason.bn) : ""}</p>
        <h3>${tx("Verified Seller badge", "ভেরিফায়েড সেলার ব্যাজ")}</h3>
        ${t.is_verified ? html`<p>✓ ${tx("You've earned it. Keep the dispute rate low to keep it.", "আপনি এটি অর্জন করেছেন। ধরে রাখতে বিরোধের হার কম রাখুন।")}</p>`
          : html`<p class="small muted">${tx(`Earned automatically after ${t.verified_progress.needed} delivered orders with a dispute rate under ${t.verified_progress.maxDisputeRate * 100}%. It can't be requested.`, `${num(t.verified_progress.needed)}টি ডেলিভারি ও ${num(t.verified_progress.maxDisputeRate * 100)}% এর কম বিরোধে নিজে থেকেই আসে। অনুরোধ করা যায় না।`)}</p>
            <div class="kpi" style="padding:0;border:0;background:none"><div class="bar"><i style="width:${pct}%"></i></div></div><p class="small">${num(t.verified_progress.delivered)} / ${num(t.verified_progress.needed)}</p>`}
        <p class="small muted">${tx("Usually delivers in", "সাধারণত ডেলিভারি")}: ${t.avg_fulfil_minutes ? tx(`${t.avg_fulfil_minutes} min`, `${num(t.avg_fulfil_minutes)} মিনিট`) : "—"}</p></section>
      <section class="card"><h2>${tx("Low code stock", "কোডের স্টক কম")}</h2>${d.lowStock.length ? d.lowStock.map((l) => html`<div class="att-row"><a class="att-main" href="#/listings?id=${l.id}"><span class="mono small">${l.sku}</span> · ${l.game} ${lang() === "bn" ? l.name_bn : l.name_en}</a>${pill(l.stock ? "pending" : "failed", `${num(l.stock)} ${tx("left", "বাকি")}`)}</div>`) : html`<p class="muted">${tx("All good.", "সব ঠিক আছে।")}</p>`}
        ${d.counts.queued ? html`<a class="btn primary" href="#/orders" style="margin-top:12px">${tx("Go to orders to deliver", "ডেলিভারির অর্ডারে যান")}</a>` : ""}</section>
    </div>`);
}

export async function orders(view, query) {
  const state = { status: query.get("status") ?? "queued", q: "" };
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("My orders", "আমার অর্ডার")}</h1><button class="btn" id="csv">${icon("download")} CSV</button></div>
    <p class="muted small">${tx("Deliver each top-up within your deadline. Late lines are escalated and may be moved to another seller. You never see buyers' contact or payment details.", "সময়সীমার মধ্যে প্রতিটি টপ-আপ দিন। দেরি হলে এসকেলেট হয় ও অন্য সেলারকে দেওয়া হতে পারে। আপনি ক্রেতার যোগাযোগ বা পেমেন্টের তথ্য দেখবেন না।")}</p>
    <div class="card"><div class="toolbar"><div class="chips">${[["queued", "To deliver", "ডেলিভারি দিন"], ["held", "Held by platform", "প্ল্যাটফর্মে আটকে"], ["delivered", "Delivered", "ডেলিভারি সম্পন্ন"], ["refunded", "Refunded", "রিফান্ড"]].map(([v, en, bn]) => html`<button class="chip" data-st="${v}" aria-pressed="${state.status === v}">${tx(en, bn)}</button>`)}</div>
      <input class="input" id="q" type="search" placeholder="${tx("Order no., player ID, SKU", "অর্ডার নং, প্লেয়ার আইডি, SKU")}"></div><div id="list"></div></div>`);
  const table = listTable($("#list", view), {
    columns: [
      { label: { en: "Order", bn: "অর্ডার" }, render: (r) => html`<b class="mono">${r.order_no}</b><br><span class="small muted">${tx("paid", "পেমেন্ট")} ${dt(r.paid_at, true)}</span>` },
      { label: { en: "Pack", bn: "প্যাক" }, render: (r) => html`${r.game_name} · ${lang() === "bn" ? r.product_name_bn : r.product_name_en} × <b>${num(r.quantity)}</b><br><span class="small mono">${r.sku}</span>` },
      { label: { en: "Deliver to", bn: "যেখানে দেবেন" }, render: (r) => (r.delivery_method === "direct" ? html`<b class="mono" style="font-size:1.05rem">${r.player_id}</b>${r.server_id ? html` <span class="mono">(${r.server_id})</span>` : ""}${r.player_name ? html`<br><span class="small">${r.player_name}</span>` : ""}` : html`${tx("Redeem code", "রিডিম কোড")}`) },
      { label: { en: "Deadline", bn: "সময়সীমা" }, render: (r) => (r.fulfillment_status === "queued" ? html`<span class="${Date.parse(r.sla_due_at) < Date.now() ? "sla-late" : "sla-ok"}" data-due="${r.sla_due_at}">${dueIn(r.sla_due_at)}</span>${r.escalated_at ? html`<br>${pill("failed", tx("escalated", "এসকেলেটেড"))}` : ""}` : r.delivered_at ? dt(r.delivered_at, true) : pill(r.fulfillment_status)) },
      { label: { en: "You earn", bn: "আপনার আয়" }, render: (r) => html`${money(r.seller_earning)}<br><span class="small">${pill(r.payout_status)}</span>${r.open_dispute ? html` ${pill("open", r.open_dispute)}` : ""}`, cls: "mono" },
    ],
    actions: (r) => (r.fulfillment_status === "queued" ? html`<button class="btn sm primary" data-fulfil="${r.id}">${tx("Mark delivered", "ডেলিভারি সম্পন্ন")}</button>` : ""),
  });
  let rows = [];
  const load = async () => {
    table.loading();
    try { const r = await sapi(`/orders?status=${state.status}${state.q ? `&q=${encodeURIComponent(state.q)}` : ""}`); rows = r.items; table.render({ items: rows, page: 1, pages: 1 }); }
    catch (e) { table.error(e, load); }
  };
  $$("[data-st]", view).forEach((b) => (b.onclick = () => { state.status = b.dataset.st; $$("[data-st]", view).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); load(); }));
  let h;
  $("#q", view).addEventListener("input", (e) => { clearTimeout(h); h = setTimeout(() => { state.q = e.target.value.trim(); load(); }, 300); });
  $("#csv", view).onclick = () => csv(`/orders?status=${state.status}`, "my-orders").catch((e) => toast(serr(e), "err"));
  const timer = setInterval(() => { if (!view.isConnected) return clearInterval(timer); $$("[data-due]", view).forEach((s) => { s.textContent = dueIn(s.dataset.due); s.className = Date.parse(s.dataset.due) < Date.now() ? "sla-late" : "sla-ok"; }); }, 30_000);
  view.addEventListener("click", (e) => {
    const b = e.target.closest("[data-fulfil]");
    if (!b) return;
    const r = rows.find((x) => x.id === Number(b.dataset.fulfil));
    const code = r.delivery_method === "code";
    const { body, close } = slideOver({
      title: `${r.order_no} · ${r.sku}`,
      body: html`<p>${r.game_name} · ${r.product_name_en} × <b>${num(r.quantity)}</b></p>
        ${code ? "" : html`<div class="codebox" style="font-size:1.3rem">${r.player_id}${r.server_id ? ` (${r.server_id})` : ""}</div><p class="small muted">${tx("Top up exactly this ID. Double-check before you send.", "ঠিক এই আইডিতেই টপ-আপ দিন। পাঠানোর আগে আবার মিলিয়ে নিন।")}</p>`}
        <form id="ff">${code ? html`<label class="field"><span>${tx(`Codes — ${r.quantity}, one per line`, `কোড — ${r.quantity}টি, প্রতি লাইনে একটি`)}</span><textarea class="input mono" name="codes" rows="${Math.min(10, r.quantity + 1)}" required></textarea><span class="hint">${tx("A code that was already used on this marketplace is refused.", "এই মার্কেটপ্লেসে আগে ব্যবহৃত কোড গ্রহণ করা হবে না।")}</span></label>`
          : html`<label class="field"><span>${tx("Top-up confirmation / transaction ID", "টপ-আপ কনফার্মেশন / ট্রানজেকশন আইডি")}</span><input class="input mono" name="deliveryRef" required></label>`}
          <label class="field"><span>${tx("Note (optional)", "নোট (ঐচ্ছিক)")}</span><input class="input" name="note"></label></form>`,
      footer: html`<button class="btn" data-close type="button">${tx("Cancel", "বাতিল")}</button><button class="btn primary" type="submit" form="ff">${tx("Confirm delivered", "ডেলিভারি নিশ্চিত")}</button>`,
    });
    $("#ff", body).addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const f = ev.target;
      try {
        toast(smsg(await sapi(`/orders/${r.id}/fulfil`, { method: "POST", body: { codes: code ? f.codes.value.split(/\n+/).map((x) => x.trim()).filter(Boolean) : undefined, deliveryRef: f.deliveryRef?.value.trim() || null, note: f.note.value.trim() || null } })));
        close(); load();
      } catch (err) { showErrors(f, err); toast(serr(err), "err"); }
    });
  });
  await load();
}

export async function listings(view, query) {
  const [l, cat] = await Promise.all([sapi("/listings"), sapi("/catalog")]);
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("My listings", "আমার লিস্টিং")}</h1><button class="btn" id="csv">${icon("download")} CSV</button><button class="btn primary" id="add">${icon("plus")} ${tx("List a pack", "প্যাক লিস্ট করুন")}</button></div>
    <p class="muted small">${tx("You list against the platform catalogue; the SKU is created for you (GAME-[Game]-[Pack]-[Your code]). Only write true things — no fake stock or “100% safe” claims.", "প্ল্যাটফর্মের ক্যাটালগে লিস্ট করবেন; SKU নিজে তৈরি হয় (GAME-[গেম]-[প্যাক]-[আপনার কোড])। শুধু সত্য লিখুন — বানানো স্টক বা “১০০% নিরাপদ” দাবি নয়।")}</p>
    <div class="card"><div id="list"></div></div>`);
  const table = listTable($("#list", view), {
    rowAttrs: (r) => `class="clickable" data-id="${r.id}"`,
    columns: [
      { label: { en: "Pack", bn: "প্যাক" }, render: (r) => html`<b>${r.game_name_en} ${lang() === "bn" ? r.name_bn : r.name_en}</b><br><span class="mono small">${r.sku}</span>` },
      { label: { en: "Price", bn: "দাম" }, render: (r) => html`${money(r.price)}${r.market_min != null && r.market_min < r.price ? html`<br><span class="small muted">${tx("lowest", "সর্বনিম্ন")} ${money(r.market_min)}</span>` : ""}`, cls: "mono" },
      { label: { en: "Delivery", bn: "ডেলিভারি" }, render: (r) => `${r.delivery_method} · ${r.fulfillment_source}` },
      { label: { en: "Code stock", bn: "কোড স্টক" }, render: (r) => (["code", "both"].includes(r.delivery_method) && r.codes_prestocked ? pill(r.stock > r.low_stock_alert ? "ok" : r.stock ? "pending" : "failed", `${num(r.stock)}${r.reserved ? ` (+${num(r.reserved)} ${tx("reserved", "রাখা")})` : ""}`) : "—") },
      { label: { en: "Sold", bn: "বিক্রি" }, render: (r) => num(r.sold_count) },
      { label: { en: "On", bn: "চালু" }, render: (r) => (r.is_available ? pill("active", tx("on", "চালু")) : pill("inactive", tx("off", "বন্ধ"))) },
    ],
  });
  table.render({ items: l.items, page: 1, pages: 1 });
  $("#csv", view).onclick = () => csv("/listings", "my-listings").catch((e) => toast(serr(e), "err"));
  const reload = () => listings(view, new URLSearchParams()).catch((e) => toast(serr(e), "err"));

  const form = (item) => {
    const options = cat.items.filter((p) => item || !p.my_listing_id);
    const { body, close } = slideOver({
      title: item ? item.sku : tx("List a pack", "প্যাক লিস্ট করুন"),
      wide: true,
      body: html`<form id="lf" class="grid2">
        ${item ? "" : html`<label class="field" style="grid-column:1/-1"><span>${tx("Pack from the catalogue", "ক্যাটালগের প্যাক")}</span><select class="input" name="product_id">${options.map((p) => html`<option value="${p.id}">${p.game_code} · ${p.game_name_en} · ${lang() === "bn" ? p.name_bn : p.name_en} (${p.allowed_methods})${p.market_min != null ? ` — ${tx("lowest now", "এখন সর্বনিম্ন")} ৳${p.market_min}` : ""}</option>`)}</select></label>`}
        <label class="field"><span>${tx("Your price (৳)", "আপনার দাম (৳)")}</span><input class="input" name="price" type="number" min="1" value="${item?.price ?? ""}" required></label>
        <label class="field"><span>${tx("Delivery", "ডেলিভারি")}</span><select class="input" name="delivery_method">${[["direct", "Direct top-up to the buyer's ID", "ক্রেতার আইডিতে সরাসরি টপ-আপ"], ["code", "Redeem code", "রিডিম কোড"], ["both", "Both (buyer chooses)", "দুটোই (ক্রেতা বাছবেন)"]].map(([v, en, bn]) => html`<option value="${v}" ${item?.delivery_method === v ? "selected" : ""}>${tx(en, bn)}</option>`)}</select></label>
        <label class="field"><span>${tx("Direct top-ups are done", "সরাসরি টপ-আপ হয়")}</span><select class="input" name="fulfillment_source"><option value="manual" ${item?.fulfillment_source !== "api" ? "selected" : ""}>${tx("By me, within my deadline", "আমার দ্বারা, সময়সীমার মধ্যে")}</option><option value="api" ${item?.fulfillment_source === "api" ? "selected" : ""}>${tx("Through the platform's provider API (instant)", "প্ল্যাটফর্মের প্রোভাইডার API দিয়ে (সাথে সাথে)")}</option></select></label>
        <label class="check"><input type="checkbox" name="codes_prestocked" ${item ? (item.codes_prestocked ? "checked" : "") : "checked"}> ${tx("Codes are pre-stocked (delivered instantly after payment)", "কোড আগে থেকে স্টক করা (পেমেন্টের পর সাথে সাথে ডেলিভারি)")}</label>
        <label class="field"><span>${tx("Alert me when codes fall to", "কোড এই সংখ্যায় নামলে জানান")}</span><input class="input" name="low_stock_alert" type="number" min="0" value="${item?.low_stock_alert ?? 5}"></label>
        <label class="check"><input type="checkbox" name="is_available" ${item ? (item.is_available ? "checked" : "") : "checked"}> ${tx("Listing is on", "লিস্টিং চালু")}</label></form>
        ${item && ["code", "both"].includes(item.delivery_method) ? html`<hr><h3>${tx("Code stock", "কোড স্টক")} · ${num(item.stock)}</h3>
          <form id="cf"><label class="field"><span>${tx("Add codes — one per line (encrypted on save)", "কোড যোগ করুন — প্রতি লাইনে একটি (সংরক্ষণে এনক্রিপ্ট হয়)")}</span><textarea class="input mono" name="codes" rows="5"></textarea></label><button class="btn primary">${tx("Add to stock", "স্টকে যোগ করুন")}</button></form>
          <div id="codes" style="margin-top:12px"></div>` : ""}
        ${item ? html`<hr><button class="btn danger" id="remove" type="button">${tx("Remove listing", "লিস্টিং সরান")}</button>` : ""}`,
      footer: html`<button class="btn" data-close type="button">${tx("Cancel", "বাতিল")}</button><button class="btn primary" type="submit" form="lf">${tx("Save", "সংরক্ষণ")}</button>`,
    });
    $("#lf", body).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      const data = { price: Number(f.price.value), delivery_method: f.delivery_method.value, fulfillment_source: f.fulfillment_source.value, codes_prestocked: f.codes_prestocked.checked ? 1 : 0, low_stock_alert: Number(f.low_stock_alert.value), is_available: f.is_available.checked ? 1 : 0 };
      try {
        toast(smsg(item ? await sapi(`/listings/${item.id}`, { method: "PUT", body: data }) : await sapi("/listings", { method: "POST", body: { ...data, product_id: Number(f.product_id.value) } })));
        close(); reload();
      } catch (err) { showErrors(f, err); toast(serr(err), "err"); }
    });
    if (item) {
      const loadCodes = async () => {
        const box = $("#codes", body);
        if (!box) return;
        const c = await sapi(`/listings/${item.id}/codes`);
        box.innerHTML = String(html`${c.items.slice(0, 100).map((x) => html`<div class="att-row"><span class="att-main mono small">…${x.code_last4} · ${dt(x.added_at)}</span>${pill(x.status === "available" ? "ok" : x.status === "void" ? "inactive" : x.status)}${x.status === "available" ? html`<button class="btn sm ghost" data-void="${x.id}">${tx("Withdraw", "তুলে নিন")}</button>` : ""}</div>`)}`);
      };
      loadCodes().catch(() => {});
      $("#cf", body)?.addEventListener("submit", async (e) => {
        e.preventDefault();
        try { const r = await sapi(`/listings/${item.id}/codes`, { method: "POST", body: { codes: e.target.codes.value } }); toast(smsg(r)); e.target.reset(); loadCodes(); } catch (err) { showErrors(e.target, err); toast(serr(err), "err"); }
      });
      body.addEventListener("click", async (e) => {
        const v = e.target.closest("[data-void]");
        try {
          if (v) { await sapi(`/listings/${item.id}/codes/${v.dataset.void}`, { method: "DELETE" }); loadCodes(); }
          if (e.target.closest("#remove") && (await confirmDialog(tx("Remove this listing? Unsold codes are withdrawn.", "লিস্টিং সরাবেন? অবিক্রীত কোড তুলে নেওয়া হবে।")))) { toast(smsg(await sapi(`/listings/${item.id}`, { method: "DELETE" }))); close(); reload(); }
        } catch (err) { toast(serr(err), "err"); }
      });
    }
  };
  $("#add", view).onclick = () => form(null);
  $("#list", view).addEventListener("click", (e) => { const tr = e.target.closest("tr[data-id]"); if (tr) form(l.items.find((x) => x.id === Number(tr.dataset.id))); });
  if (query.get("id")) form(l.items.find((x) => x.id === Number(query.get("id"))));
}

export async function payouts(view) {
  const d = await sapi("/payouts");
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("Payouts", "পেআউট")}</h1></div>
    <div class="kpis">${kpi("k6", "money", tx("Available", "তোলা যাবে"), money(d.balance.available))}${kpi("k3", "money", tx("Pending (hold window)", "অপেক্ষমাণ (হোল্ড)"), money(d.balance.pending), tx(`${d.holdHours} h after delivery`, `ডেলিভারির ${num(d.holdHours)} ঘণ্টা পর`))}${kpi("k5", "alert", tx("Held (disputes)", "আটকে (বিরোধ)"), money(d.balance.held))}${kpi("k1", "money", tx("Paid so far", "এ পর্যন্ত পেয়েছেন"), money(d.balance.paid))}</div>
    <section class="card"><h2>${tx("Request a payout", "পেআউট চান")}</h2>
      <p class="small">${tx("To", "যেখানে")}: <b>${d.account.method ?? "—"}</b> <span class="mono">${d.account.number ?? ""}</span> · ${tx("minimum", "সর্বনিম্ন")} ${money(d.minPayout)}</p>
      ${d.account.lockedUntil ? html`<p class="error-box">${tx("Payout account changed recently — payouts open again at", "পেআউট অ্যাকাউন্ট সম্প্রতি বদলেছে — আবার পেআউট নেওয়া যাবে")} ${dt(d.account.lockedUntil, true)}</p>` : ""}
      <form id="pf" class="toolbar"><input class="input otp-code" name="totp" inputmode="numeric" maxlength="6" placeholder="${tx("Authenticator code", "অথেন্টিকেটর কোড")}" required style="max-width:220px"><button class="btn primary" ${d.balance.available < d.minPayout ? "disabled" : ""}>${tx("Request", "অনুরোধ করুন")} ${money(d.balance.available)}</button></form></section>
    <section class="card" style="margin-top:16px"><h2>${tx("History", "ইতিহাস")}</h2>${d.items.length ? d.items.map((p) => html`<div class="att-row"><span class="att-main"><b class="mono">${p.payout_no}</b> · ${money(p.amount)} · ${num(p.item_count)} ${tx("lines", "লাইন")} · ${dt(p.requested_at)}${p.note ? html` · <i>${p.note}</i>` : ""}${p.txn_ref ? html` · ref <span class="mono">${p.txn_ref}</span>` : ""}</span>${pill(p.status)}</div>`) : html`<p class="muted">—</p>`}</section>`);
  $("#pf", view).addEventListener("submit", async (e) => {
    e.preventDefault();
    try { toast(smsg(await sapi("/payouts/request", { method: "POST", body: { totp: e.target.totp.value.trim() } }))); payouts(view); } catch (err) { showErrors(e.target, err); toast(serr(err), "err"); }
  });
}

export async function reviews(view) {
  const d = await sapi("/reviews");
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("Reviews", "রিভিউ")}</h1></div>
    ${d.items.length ? d.items.map((r) => html`<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between"><b>${r.name} · ${"★".repeat(r.rating)}</b><span class="small muted">${lang() === "bn" ? r.product_name_bn : r.product_name_en} · ${dt(r.created_at)}</span></div>
      ${r.body ? html`<p>${r.body}</p>` : ""}${r.seller_reply ? html`<p class="small">↳ ${r.seller_reply}</p>` : html`<form class="toolbar" data-reply="${r.id}"><input class="input" name="reply" placeholder="${tx("Reply politely (public)", "ভদ্রভাবে উত্তর দিন (সবাই দেখবে)")}" required><button class="btn sm">${tx("Reply", "উত্তর")}</button></form>`}</div>`) : html`<p class="muted">${tx("No reviews yet.", "এখনো কোনো রিভিউ নেই।")}</p>`}`);
  view.addEventListener("submit", async (e) => {
    const f = e.target.closest("[data-reply]");
    if (!f) return;
    e.preventDefault();
    try { await sapi(`/reviews/${f.dataset.reply}/reply`, { method: "POST", body: { reply: f.reply.value.trim() } }); toast(tx("Reply posted.", "উত্তর দেওয়া হয়েছে।")); reviews(view); } catch (err) { showErrors(f, err); toast(serr(err), "err"); }
  });
}

export async function disputes(view) {
  const d = await sapi("/disputes");
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("Disputes", "বিরোধ")}</h1></div>
    <p class="muted small">${tx("Answer within 24 hours with proof (top-up confirmation, screenshot). Unanswered reports go straight to the platform. Your earning for the line is held until it's resolved.", "২৪ ঘণ্টার মধ্যে প্রমাণসহ (টপ-আপ কনফার্মেশন, স্ক্রিনশট) উত্তর দিন। উত্তর না দিলে সরাসরি প্ল্যাটফর্মে যায়। সমাধান না হওয়া পর্যন্ত ওই লাইনের আয় আটকে থাকে।")}</p>
    ${d.items.length ? d.items.map((x) => html`<div class="card" style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b class="mono">${x.dispute_no} · ${x.order_no}</b>${pill(x.status)}</div>
      <p class="small">${x.game_name} ${x.product_name_en} × ${num(x.quantity)} · <span class="mono">${x.sku}</span>${x.player_id ? html` · ID <span class="mono">${x.player_id}${x.server_id ? ` (${x.server_id})` : ""}</span>` : ""}${x.delivery_ref ? html` · ref <span class="mono">${x.delivery_ref}</span>` : ""}</p>
      <p><b>${x.reason.replace("_", " ")}</b>: ${x.details}</p>
      ${x.status === "open" ? html`<p class="small">${tx("Answer by", "উত্তরের শেষ সময়")} ${dt(x.seller_deadline, true)} (${dueIn(x.seller_deadline)})</p>
        <form data-respond="${x.id}"><label class="field"><span>${tx("Your answer", "আপনার উত্তর")}</span><textarea class="input" name="response" required></textarea></label><label class="field"><span>${tx("Proof link (optional)", "প্রমাণের লিংক (ঐচ্ছিক)")}</span><input class="input" name="evidenceUrl" type="url"></label><button class="btn primary sm">${tx("Send answer", "উত্তর পাঠান")}</button></form>`
        : x.seller_response ? html`<p class="small">${tx("You answered", "আপনার উত্তর")}: ${x.seller_response}</p>` : ""}
      ${x.status === "resolved" ? html`<p class="small">${tx("Decision", "সিদ্ধান্ত")}: <b>${x.resolution}</b>${x.refund_amount ? ` · ${money(x.refund_amount)}` : ""} — ${x.resolution_note ?? ""}</p>` : ""}</div>`) : html`<p class="muted">${tx("No disputes. Great work!", "কোনো বিরোধ নেই। চমৎকার!")}</p>`}`);
  view.addEventListener("submit", async (e) => {
    const f = e.target.closest("[data-respond]");
    if (!f) return;
    e.preventDefault();
    try { toast(smsg(await sapi(`/disputes/${f.dataset.respond}/respond`, { method: "POST", body: { response: f.response.value.trim(), evidenceUrl: f.evidenceUrl.value.trim() || null } }))); disputes(view); } catch (err) { showErrors(f, err); toast(serr(err), "err"); }
  });
}

export async function settings(view) {
  const p = session.profile ?? (await sapi("/auth/me")).seller;
  view.innerHTML = String(html`<div class="page-head"><h1>${tx("Settings", "সেটিংস")}</h1></div>
    <div class="split">
      <form class="card" id="prof"><h2>${tx("Store profile", "স্টোর প্রোফাইল")}</h2>
        <label class="field"><span>${tx("Store name", "স্টোরের নাম")}</span><input class="input" name="store_name" value="${p.store_name}" required></label>
        <label class="field"><span>${tx("About (English)", "পরিচিতি (ইংরেজি)")}</span><textarea class="input" name="bio_en" rows="3">${p.bio_en ?? ""}</textarea></label>
        <label class="field"><span>${tx("About (Bangla)", "পরিচিতি (বাংলা)")}</span><textarea class="input" name="bio_bn" rows="3">${p.bio_bn ?? ""}</textarea></label>
        <label class="field"><span>${tx("Logo image URL", "লোগোর ছবির URL")}</span><input class="input" name="logo_url" value="${p.logo_url ?? ""}"></label>
        <label class="check"><input type="checkbox" name="notify_sms" ${p.notify_sms ? "checked" : ""}> ${tx("SMS me new orders", "নতুন অর্ডার SMS এ জানান")}</label>
        <label class="check"><input type="checkbox" name="notify_email" ${p.notify_email ? "checked" : ""}> ${tx("Email me new orders", "নতুন অর্ডার ইমেইলে জানান")}</label>
        <button class="btn primary" style="margin-top:10px">${tx("Save", "সংরক্ষণ")}</button></form>
      <div>
        <form class="card" id="pay"><h2>${tx("Payout account", "পেআউট অ্যাকাউন্ট")}</h2><p class="small muted">${tx("Changing it needs your authenticator code and pauses payouts for 72 hours (protects you if someone gets into your account).", "পরিবর্তনে অথেন্টিকেটর কোড লাগে এবং ৭২ ঘণ্টা পেআউট বন্ধ থাকে (কেউ অ্যাকাউন্টে ঢুকলে আপনাকে রক্ষা করে)।")}</p>
          <div class="grid2"><label class="field"><span>${tx("Method", "পদ্ধতি")}</span><select class="input" name="payout_method">${["bkash", "nagad", "rocket", "bank"].map((m) => html`<option ${p.payout_method === m ? "selected" : ""}>${m}</option>`)}</select></label>
          <label class="field"><span>${tx("Account name", "অ্যাকাউন্টের নাম")}</span><input class="input" name="payout_account_name" value="${p.payout_account_name ?? ""}" required></label>
          <label class="field"><span>${tx("Number", "নম্বর")} (${p.payout_account_number ?? "—"})</span><input class="input" name="payout_account_number" required></label>
          <label class="field"><span>${tx("Bank (for bank)", "ব্যাংক (ব্যাংকের জন্য)")}</span><input class="input" name="payout_bank_name" value="${p.payout_bank_name ?? ""}"></label>
          <label class="field"><span>${tx("Authenticator code", "অথেন্টিকেটর কোড")}</span><input class="input otp-code" name="totp" inputmode="numeric" maxlength="6" required></label></div>
          <button class="btn primary">${tx("Save payout account", "পেআউট অ্যাকাউন্ট সংরক্ষণ")}</button></form>
        <form class="card" id="pw" style="margin-top:16px"><h2>${tx("Password", "পাসওয়ার্ড")}</h2>
          <label class="field"><span>${tx("Current password", "বর্তমান পাসওয়ার্ড")}</span><input class="input" name="currentPassword" type="password" required></label>
          <label class="field"><span>${tx("New password (10+)", "নতুন পাসওয়ার্ড (১০+)")}</span><input class="input" name="newPassword" type="password" minlength="10" required></label>
          <button class="btn">${tx("Change password", "পাসওয়ার্ড বদলান")}</button></form>
      </div></div>`);
  const submit = (id, path, method, read) => $(id, view).addEventListener("submit", async (e) => {
    e.preventDefault();
    try { toast(smsg(await sapi(path, { method, body: read(e.target) }))); } catch (err) { showErrors(e.target, err); toast(serr(err), "err"); }
  });
  submit("#prof", "/settings/profile", "PUT", (f) => ({ store_name: f.store_name.value.trim(), bio_en: f.bio_en.value.trim() || null, bio_bn: f.bio_bn.value.trim() || null, logo_url: f.logo_url.value.trim() || null, notify_sms: f.notify_sms.checked ? 1 : 0, notify_email: f.notify_email.checked ? 1 : 0 }));
  submit("#pay", "/settings/payout", "PUT", (f) => ({ payout_method: f.payout_method.value, payout_account_name: f.payout_account_name.value.trim(), payout_account_number: f.payout_account_number.value.trim(), payout_bank_name: f.payout_bank_name.value.trim() || null, payout_branch: null, totp: f.totp.value.trim() }));
  submit("#pw", "/settings/password", "PUT", (f) => ({ currentPassword: f.currentPassword.value, newPassword: f.newPassword.value }));
}
