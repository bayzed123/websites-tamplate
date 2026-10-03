// Order page: Payment Pending → Payment Confirmed → Delivering → Delivered (or Held for Review). Codes appear here the
// moment the server has the gateway's confirmation — the page just asks the server; it never decides anything itself.
import { tx, L, money, num, digits, dateTime, tt } from "../i18n.js";
import { html, api, $, $$, loadingBlock, errorBlock, toast, errMsg, copyText, overlay, showFieldErrors, recentOrders, icon, me, emptyBlock } from "../core.js";
import { statusTrack } from "../ui.js";
import { track } from "../track.js";

const REASONS = [
  ["not_received", "I didn't receive it", "পাইনি"],
  ["code_invalid", "The code doesn't work", "কোড কাজ করছে না"],
  ["code_used", "The code was already used", "কোড আগেই ব্যবহৃত"],
  ["wrong_amount", "Wrong amount", "ভুল পরিমাণ"],
  ["late", "It's taking too long", "অনেক দেরি হচ্ছে"],
  ["other", "Something else", "অন্য কিছু"],
];

export default async function order(el, { params, query, variant }) {
  if (variant === "lookup") return lookup(el);
  const no = params.orderNo;
  const token = query.get("token") ?? recentOrders.list().find((o) => o.orderNo === no)?.token ?? "";
  if (token) recentOrders.add(no, token);
  document.title = `${tx("Order", "অর্ডার")} ${no} — CWB Gaming`;
  el.innerHTML = String(html`<div class="container section">${loadingBlock(3)}</div>`);
  let timer, tick;
  let polls = 0;

  async function load(first = false) {
    let o;
    try { o = (await api(`/orders/${encodeURIComponent(no)}?token=${encodeURIComponent(token)}`)).order; }
    catch (e) { if (first) el.innerHTML = String(html`<div class="container section">${errorBlock(e)}</div>`); return; }
    if (!el.isConnected) return;
    paint(o);
    const waiting = ["payment_pending", "paid", "delivering", "held"].includes(o.status);
    clearTimeout(timer);
    if (waiting && polls++ < 400) timer = setTimeout(() => load(), o.status === "payment_pending" && o.payment_mode === "manual" ? 15000 : 4000);
    if (o.paid_at) {
      try {
        if (!localStorage.getItem(`cwb_p_${o.order_no}`)) {
          localStorage.setItem(`cwb_p_${o.order_no}`, "1");
          track("Purchase", { value: o.total, eventId: `purchase-${o.order_no}`, relay: false, transactionId: o.order_no, items: o.items.map((i) => ({ sku: i.sku, name: `${i.game_name} ${i.product_name_en}`, price: i.unit_price, quantity: i.quantity })) });
        }
      } catch { /* ignore */ }
    }
  }

  function paint(o) {
    clearInterval(tick);
    const pending = o.status === "payment_pending" || o.status === "payment_failed";
    el.innerHTML = String(html`<div class="container section" style="max-width:860px">
      <div class="spread"><div><span class="small muted">${tx("Order", "অর্ডার")}</span><h1 style="margin:0">${o.order_no}</h1></div>
        <div style="text-align:right"><span class="tag ${o.status === "delivered" ? "ok" : o.status === "held" ? "warn" : ["expired", "cancelled", "payment_failed", "refunded"].includes(o.status) ? "bad" : "cyan"}" data-testid="order-status">${tt(o.status_label)}</span>
        ${o.invoice_no ? html`<div class="small muted" style="margin-top:6px">${tx("Invoice", "ইনভয়েস")} ${o.invoice_no}</div>` : ""}</div></div>
      ${statusTrack(o)}
      ${query.get("payment") === "returned" && pending ? html`<div class="note-box pulse">${tx("Waiting for the payment gateway to confirm your payment…", "পেমেন্ট গেটওয়ের নিশ্চিতকরণের অপেক্ষায়…")}</div>` : ""}
      ${query.get("payment") === "failed" && pending ? html`<div class="error-box">${tx("The payment didn't go through. You can try again below.", "পেমেন্ট সম্পন্ন হয়নি। নিচে আবার চেষ্টা করতে পারেন।")}</div>` : ""}
      ${pending ? payBlock(o) : ""}
      ${o.status === "held" ? html`<div class="warn-box">${tt(o.hold_reason_public)}</div>` : ""}
      ${o.status === "expired" ? html`<div class="error-box">${tx("This order expired because the payment didn't arrive in time. Nothing was charged.", "সময়মতো পেমেন্ট না আসায় অর্ডারটি বাতিল হয়েছে। কোনো টাকা কাটা হয়নি।")}</div>` : ""}
      <div style="margin-top:18px">${o.items.map((i) => itemBlock(o, i))}</div>
      <div class="card" style="margin-top:14px">
        <div class="summary-row"><span>${tx("Subtotal", "সাবটোটাল")}</span><span>${money(o.subtotal)}</span></div>
        ${o.points_used ? html`<div class="summary-row"><span>${tx("Points", "পয়েন্ট")}</span><span>− ${money(o.points_used)}</span></div>` : ""}
        <div class="summary-row total"><span>${tx("Total", "মোট")}</span><span>${money(o.total)}</span></div>
        ${o.refunded_amount ? html`<div class="summary-row"><span>${tx("Refunded", "রিফান্ড")}</span><span>${money(o.refunded_amount)}</span></div>` : ""}
        <div class="small muted">${tx("Payment", "পেমেন্ট")}: ${o.payment_method.toUpperCase()} · ${dateTime(o.created_at)}</div>
        ${o.links.invoice ? html`<a class="btn sm" style="margin-top:12px" href="${o.links.invoice}" target="_blank" rel="noopener">${icon("receipt")} ${tx("Invoice (PDF)", "ইনভয়েস (PDF)")}</a>` : ""}
      </div>
      <p class="small muted" style="margin-top:14px">${tx("Keep this page's link — it's your private order link. Codes are also sent to your phone.", "এই পেজের লিংকটি রেখে দিন — এটি আপনার ব্যক্তিগত অর্ডার লিংক। কোড আপনার ফোনেও পাঠানো হয়।")}</p>
    </div>`);
    const exp = $("#expiry", el);
    if (exp) {
      const end = Date.parse(o.expires_at);
      const draw = () => { const s = Math.max(0, Math.round((end - Date.now()) / 1000)); exp.textContent = `${digits(Math.floor(s / 60))}:${digits(String(s % 60).padStart(2, "0"))}`; };
      draw();
      tick = setInterval(draw, 1000);
    }
    $$(".sla", el).forEach((s) => {
      const end = Date.parse(s.dataset.due);
      const mins = Math.max(0, Math.round((end - Date.now()) / 60000));
      s.textContent = end > Date.now() ? tx(`within ~${mins} min`, `~${digits(mins)} মিনিটের মধ্যে`) : tx("running late — our team has been alerted", "দেরি হচ্ছে — আমাদের টিমকে জানানো হয়েছে");
    });
  }

  function payBlock(o) {
    const manual = o.payment_mode === "manual";
    return html`<div class="card" style="margin-top:14px">
      <div class="spread"><h3 style="margin:0">${tx("Complete your payment", "পেমেন্ট সম্পন্ন করুন")}</h3><span class="small muted">${tx("Time left", "বাকি সময়")}: <b class="timer" id="expiry"></b></span></div>
      ${manual ? html`<div id="manual-box"><p class="small muted">${tx("Loading payment details…", "পেমেন্টের তথ্য লোড হচ্ছে…")}</p></div>` : html`<p class="muted">${tx("Pay on the secure payment page. This page updates by itself once the gateway confirms.", "নিরাপদ পেমেন্ট পেজে পেমেন্ট করুন। গেটওয়ে নিশ্চিত করলেই এই পেজ নিজে আপডেট হবে।")}</p>`}
      ${manual ? "" : html`<button class="btn cta" type="button" id="pay-now">${tx("Pay now", "এখন পেমেন্ট করুন")} · ${money(o.total)}</button>`}
    </div>`;
  }

  function itemBlock(o, i) {
    const label = i.delivery_method === "direct" ? tx("Direct top-up", "সরাসরি টপ-আপ") : tx("Redeem code", "রিডিম কোড");
    return html`<div class="card" style="margin-bottom:10px" data-item="${i.id}">
      <div class="spread"><div><b>${i.game_name} · ${L(i, "product_name")}${i.quantity > 1 ? ` × ${num(i.quantity)}` : ""}</b>
        <div class="small muted">${label} · ${tx("Seller", "সেলার")}: <a href="/store/${i.seller.slug}">${i.seller.store_name}</a>${i.player_id ? html` · ID <span class="mono">${i.player_id}${i.server_id ? ` (${i.server_id})` : ""}</span>` : ""}</div></div>
        <b>${money(i.line_total)}</b></div>
      ${i.fulfillment_status === "delivered" && i.codes.length ? html`<div style="margin-top:10px" data-testid="codes">${i.codes.map((c) => html`<div class="code-box"><code>${c.code}</code><button class="btn sm" type="button" data-copy="${c.code}">${icon("copy")} ${tx("Copy", "কপি")}</button></div>`)}
        <p class="small muted" style="margin:6px 0 0">${tx("Redeem it in the game or store. Keep it private — anyone with the code can use it.", "গেম বা স্টোরে রিডিম করুন। কোডটি গোপন রাখুন — কোড যার কাছে থাকবে সে-ই ব্যবহার করতে পারবে।")}</p></div>` : ""}
      ${i.fulfillment_status === "delivered" && i.delivery_method === "direct" ? html`<p class="player-ok" style="margin:10px 0 0">✓ ${tx("Topped up to your account", "আপনার অ্যাকাউন্টে টপ-আপ হয়েছে")}${i.delivery_ref ? html` · ${tx("ref", "রেফ")} <span class="mono">${i.delivery_ref}</span>` : ""}</p>` : ""}
      ${i.fulfillment_status === "queued" ? html`<p class="small" style="margin:10px 0 0">${icon("clock")} ${tx("The seller is delivering this", "সেলার এটি ডেলিভারি দিচ্ছেন")} — <span class="sla" data-due="${i.sla_due_at}"></span></p>` : ""}
      ${i.fulfillment_status === "refunded" ? html`<p class="small" style="margin:10px 0 0;color:var(--warn)">${tx("Refunded", "রিফান্ড হয়েছে")}</p>` : ""}
      ${i.dispute ? html`<p class="small" style="margin:10px 0 0">${icon("flag")} ${tx("Report", "রিপোর্ট")} ${i.dispute.dispute_no}: ${i.dispute.status === "resolved" ? tx(`resolved (${i.dispute.resolution.replace("_", " ")})`, "সমাধান হয়েছে") : tx("being looked at", "দেখা হচ্ছে")}</p>` : ""}
      <div class="row" style="margin-top:10px">${i.can_review ? html`<button class="btn sm" type="button" data-review="${i.id}">${icon("star")} ${tx("Rate the seller", "সেলারকে রেটিং দিন")}</button>` : ""}${i.can_dispute ? html`<button class="btn sm ghost" type="button" data-dispute="${i.id}">${icon("flag")} ${tx("Report a problem", "সমস্যা জানান")}</button>` : ""}</div>
    </div>`;
  }

  el.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-copy]");
    if (c) return copyText(c.dataset.copy);
    if (e.target.closest("#pay-now")) {
      try {
        const r = await api(`/orders/${no}/pay`, { method: "POST", body: { token } });
        if (r.kind === "redirect") __shopDemo.go(r.url);
        else if (r.kind === "paid") load();
        else load();
      } catch (err) { toast(errMsg(err), "error"); }
    }
    const d = e.target.closest("[data-dispute]");
    if (d) disputeForm(Number(d.dataset.dispute));
    const rv = e.target.closest("[data-review]");
    if (rv) reviewForm(Number(rv.dataset.review));
  });

  // Manual mobile banking: the shop's merchant number + a TrxID box (only a claim — staff confirm the money).
  el.addEventListener("submit", async (e) => {
    if (e.target.id !== "trx-form") return;
    e.preventDefault();
    try {
      const r = await api(`/orders/${no}/trx`, { method: "POST", body: { token, trxId: e.target.trxId.value.trim() } });
      toast(tt(r), "success", 6000);
      load();
    } catch (err) { showFieldErrors(e.target, err); toast(errMsg(err), "error"); }
  });

  function disputeForm(itemId) {
    const { panel, close } = overlay("modal", {
      title: tx("Report a problem", "সমস্যা জানান"),
      body: html`<form id="df"><label class="field"><span>${tx("What happened?", "কী হয়েছে?")}</span><select class="input" name="reason">${REASONS.map(([v, en, bn]) => html`<option value="${v}">${tx(en, bn)}</option>`)}</select></label>
        <label class="field"><span>${tx("Details", "বিস্তারিত")}</span><textarea class="input" name="details" required maxlength="2000"></textarea></label>
        <label class="field"><span>${tx("Screenshot link (optional)", "স্ক্রিনশটের লিংক (ঐচ্ছিক)")}</span><input class="input" name="evidenceUrl" type="url"></label>
        <p class="small muted">${tx("The seller has 24 hours to answer, then our team decides. Seller earnings for this item are on hold meanwhile.", "সেলার ২৪ ঘণ্টার মধ্যে উত্তর দেবেন, তারপর আমাদের টিম সিদ্ধান্ত নেবে। এর মধ্যে এই আইটেমের সেলারের টাকা আটকে থাকবে।")}</p></form>`,
      footer: html`<button class="btn" data-close type="button">${tx("Cancel", "বাতিল")}</button><button class="btn cta" type="submit" form="df">${tx("Send report", "রিপোর্ট পাঠান")}</button>`,
    });
    $("#df", panel).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const r = await api(`/orders/${no}/dispute`, { method: "POST", body: { orderItemId: itemId, reason: f.reason.value, details: f.details.value.trim(), evidenceUrl: f.evidenceUrl.value.trim() || null, token } });
        toast(tt(r), "success", 6000);
        close();
        load();
      } catch (err) { showFieldErrors(f, err); toast(errMsg(err), "error"); }
    });
  }

  function reviewForm(itemId) {
    const { panel, close } = overlay("modal", {
      title: tx("Rate the seller", "সেলারকে রেটিং দিন"),
      body: html`<form id="rf"><div class="seg" role="radiogroup">${[1, 2, 3, 4, 5].map((n) => html`<label style="flex:1;text-align:center;padding:10px;cursor:pointer"><input type="radio" name="rating" value="${n}" ${n === 5 ? "checked" : ""}> ${"★".repeat(n)}</label>`)}</div>
        <label class="field" style="margin-top:12px"><span>${tx("A few words (optional)", "কিছু কথা (ঐচ্ছিক)")}</span><textarea class="input" name="body" maxlength="1000"></textarea></label></form>`,
      footer: html`<button class="btn" data-close type="button">${tx("Cancel", "বাতিল")}</button><button class="btn primary" type="submit" form="rf">${tx("Submit", "জমা দিন")}</button>`,
    });
    $("#rf", panel).addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = e.target;
      try {
        const r = await api(`/orders/${no}/review`, { method: "POST", body: { orderItemId: itemId, rating: Number(f.rating.value), body: f.body.value.trim() || null, token } });
        toast(tt(r));
        close();
        load();
      } catch (err) { showFieldErrors(f, err); toast(errMsg(err), "error"); }
    });
  }

  await load(true);
  // Manual payment details come from the store config (the shop's own merchant number).
  const mb = $("#manual-box", el);
  if (mb) {
    try {
      const r = await api(`/orders/${no}/pay`, { method: "POST", body: { token } });
      if (r.kind === "manual") {
        mb.innerHTML = String(html`<ol class="small" style="padding-left:18px">
          <li>${tx(`Open ${r.method} and choose “Payment” (merchant).`, `${r.method} খুলে “পেমেন্ট” (মার্চেন্ট) বেছে নিন।`)}</li>
          <li>${tx("Pay", "পেমেন্ট করুন")} <b>${money(r.amount)}</b> ${tx("to", "এই নম্বরে")} <b class="mono">${r.number}</b> (${r.accountType}) <button class="btn sm ghost" type="button" data-copy="${r.number}">${icon("copy")}</button></li>
          <li>${tx("Reference", "রেফারেন্স")}: <b class="mono">${r.reference}</b></li>
          <li>${tx("Type the transaction ID (TrxID) from the payment SMS below.", "পেমেন্ট SMS এর ট্রানজেকশন আইডি (TrxID) নিচে লিখুন।")}</li></ol>
          <form id="trx-form" class="row" style="flex-wrap:nowrap"><input class="input mono" name="trxId" placeholder="TrxID" maxlength="20" required><button class="btn primary" type="submit">${tx("Submit", "জমা দিন")}</button></form>
          <p class="small muted" style="margin:8px 0 0">${tx("Our team checks the money in the merchant account, then your order is delivered. The TrxID alone doesn't release anything.", "আমাদের টিম মার্চেন্ট অ্যাকাউন্টে টাকা যাচাই করবে, তারপর অর্ডার ডেলিভারি হবে। শুধু TrxID দিয়ে কিছু ডেলিভারি হয় না।")}</p>`);
      } else if (r.kind === "redirect") {
        mb.innerHTML = String(html`<a class="btn cta" href="${r.url}">${tx("Pay now", "এখন পেমেন্ট করুন")}</a>`);
      }
    } catch (e) { mb.innerHTML = String(html`<p class="error-box">${errMsg(e)}</p>`); }
  }
}

async function lookup(el) {
  document.title = tx("My orders — CWB Gaming", "আমার অর্ডার — সিডব্লিউবি গেমিং");
  const list = recentOrders.list();
  const customer = await me();
  el.innerHTML = String(html`<div class="container section" style="max-width:760px">
    <h1>${tx("My orders", "আমার অর্ডার")}</h1>
    ${customer ? html`<p><a class="btn primary" href="/account/orders">${tx("See all orders in my account", "অ্যাকাউন্টে সব অর্ডার দেখুন")}</a></p>` : html`<p class="muted">${tx("Orders placed on this device are listed here. The link in your SMS also opens your order. Sign in to see every order.", "এই ডিভাইস থেকে দেওয়া অর্ডারগুলো এখানে আছে। SMS এর লিংক দিয়েও অর্ডার খোলা যায়। সব অর্ডার দেখতে সাইন ইন করুন।")}</p><a class="btn" href="/account">${tx("Sign in", "সাইন ইন")}</a>`}
    <div style="margin-top:18px">${list.length ? list.map((o) => html`<a class="list-row" href="/order/${o.orderNo}?token=${o.token}"><b class="mono">${o.orderNo}</b><span class="small muted">${dateTime(new Date(o.at).toISOString())} →</span></a>`) : emptyBlock("No orders on this device yet.", "এই ডিভাইসে এখনো কোনো অর্ডার নেই।")}</div></div>`);
}
