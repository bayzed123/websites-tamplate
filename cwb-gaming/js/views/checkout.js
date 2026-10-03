// Checkout: contact + SMS code, payment method (bKash / Nagad / Rocket / card — no Cash on Delivery), a summary that
// repeats the player ID back, and an explicit "this ID is correct" tick. Placing the order reserves the codes; the
// payment page comes next, and nothing is delivered until the gateway confirms the payment server-side.
import { tx, L, money, num } from "../i18n.js";
import { html, api, $, config, me, draft, errMsg, toast, showFieldErrors, turnstile, sessionId, utm, adRef, cookie, deviceId, recentOrders, debounce, normalizePhone, ApiErr, emptyBlock, loadingBlock } from "../core.js";
import { track } from "../track.js";

export default async function checkout(el, { navigate }) {
  document.title = tx("Checkout — CWB Gaming", "চেকআউট — সিডব্লিউবি গেমিং");
  const d = draft.get();
  if (!d) {
    el.innerHTML = String(html`<div class="container section">${emptyBlock("Nothing to pay for yet — pick a pack first.", "এখনো কিছু বাছাই করা হয়নি — আগে একটি প্যাক বেছে নিন।")}<p style="text-align:center"><a class="btn primary" href="/games">${tx("Browse games", "গেম দেখুন")}</a></p></div>`);
    return;
  }
  el.innerHTML = String(html`<div class="container section">${loadingBlock(3)}</div>`);
  const line = { listingId: d.listingId, quantity: d.quantity, deliveryMethod: d.deliveryMethod, playerId: d.playerId, serverId: d.serverId };
  let cfg, customer, quote;
  try {
    [cfg, customer] = await Promise.all([config(), me()]);
    quote = await api("/checkout/quote", { method: "POST", body: { items: [line], usePoints: 0 } });
  } catch (e) {
    el.innerHTML = String(html`<div class="container section"><p class="error-box">${errMsg(e)}</p><a class="btn" href="/game/${d.game.slug}">${tx("Choose again", "আবার বাছাই করুন")}</a></div>`);
    return;
  }
  const q0 = quote.lines[0];
  const methods = [["bkash", "bKash"], ["nagad", "Nagad"], ["rocket", "Rocket"], ["card", tx("Card (Visa / Mastercard)", "কার্ড (ভিসা / মাস্টারকার্ড)")]].filter(([k]) => cfg.payments[k]?.enabled);
  const state = { method: methods[0]?.[0] ?? null, points: 0, otpOk: Boolean(customer), sid: sessionId() };
  const idLabel = L(d.game, "player_id_label") || tx("Player ID", "প্লেয়ার আইডি");
  track("InitiateCheckout", { value: quote.total, items: [{ sku: q0.sku, name: `${q0.gameNameEn} ${q0.productNameEn}`, price: q0.unitPrice, quantity: q0.quantity }] });

  el.innerHTML = String(html`<div class="container section">
    <h1>${tx("Checkout", "চেকআউট")}</h1>
    <div class="topup-layout">
      <form id="co" novalidate>
        <div class="card">
          <div class="step-title" style="margin-top:0"><i>1</i>${tx("Your contact", "আপনার যোগাযোগ")}</div>
          <p class="small muted">${tx("Your code and order updates are sent to this number.", "এই নম্বরে আপনার কোড ও অর্ডারের আপডেট পাঠানো হবে।")}</p>
          <label class="field"><span>${tx("Name", "নাম")}</span><input class="input" name="name" autocomplete="name" required value="${customer?.name ?? ""}"></label>
          <label class="field"><span>${tx("Mobile number", "মোবাইল নম্বর")}</span><input class="input" name="phone" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" required value="${customer?.phone ?? ""}" ${customer ? "readonly" : ""}></label>
          <div id="otp-box" ${customer ? "hidden" : ""}>
            <div class="row"><button class="btn sm" type="button" id="send-otp">${tx("Send SMS code", "SMS কোড পাঠান")}</button><span class="small muted" id="otp-status"></span></div>
            <label class="field" style="margin-top:10px"><span>${tx("6-digit code", "৬ সংখ্যার কোড")}</span><div class="row" style="flex-wrap:nowrap"><input class="input" name="code" inputmode="numeric" maxlength="6" autocomplete="one-time-code"><button class="btn sm" type="button" id="verify-otp">${tx("Verify", "যাচাই")}</button></div></label>
          </div>
          <label class="field"><span>${tx("Email (optional — for a copy of the code)", "ইমেইল (ঐচ্ছিক — কোডের কপির জন্য)")}</span><input class="input" name="email" type="email" autocomplete="email" value="${customer?.email ?? ""}"></label>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="step-title" style="margin-top:0"><i>2</i>${tx("Payment method", "পেমেন্ট পদ্ধতি")}</div>
          ${methods.length ? html`<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">${methods.map(([k, label]) => html`<label class="card hover check" style="padding:12px"><input type="radio" name="method" value="${k}" ${state.method === k ? "checked" : ""}><b>${label}</b></label>`)}</div>`
            : html`<p class="error-box">${tx("Payments are switched off right now. Please try again later.", "এই মুহূর্তে পেমেন্ট বন্ধ আছে। পরে চেষ্টা করুন।")}</p>`}
          <p class="small muted" style="margin:10px 0 0">${cfg.sandbox ? html`<b class="accent">${tx("Test mode:", "টেস্ট মোড:")}</b> ${tx("payments go through a simulated gateway — no real money moves.", "পেমেন্ট একটি সিমুলেটেড গেটওয়ে দিয়ে যায় — আসল টাকা কাটে না।")} ` : ""}${tx("There is no Cash on Delivery. Unpaid orders expire after", "ক্যাশ অন ডেলিভারি নেই। পেমেন্ট না হলে অর্ডার বাতিল হয়")} ${num(cfg.payments.expiryMinutes)} ${tx("minutes.", "মিনিট পর।")}</p>
          ${customer && quote.pointsBalance > 0 ? html`<label class="check" style="margin-top:12px"><input type="checkbox" id="use-points"> ${tx(`Use my points (balance ${quote.pointsBalance})`, `আমার পয়েন্ট ব্যবহার করুন (ব্যালেন্স ${num(quote.pointsBalance)})`)}</label>` : ""}
        </div>

        <div class="card" style="margin-top:14px">
          <div class="step-title" style="margin-top:0"><i>3</i>${tx("Check & confirm", "যাচাই ও নিশ্চিত করুন")}</div>
          ${d.deliveryMethod === "direct" && d.playerId ? html`<p style="margin:0 0 4px">${tx("The top-up goes to this", "টপ-আপ যাবে এই")} ${idLabel}:</p>
            <div class="player-echo" data-testid="player-echo">${d.playerId}${d.serverId ? html` <span class="muted">(${L(d.game, "server_label") || "Zone"} ${d.serverId})</span>` : ""}</div>
            ${d.playerName ? html`<p class="player-ok">✓ ${d.playerName}</p>` : ""}
            <label class="check" style="margin-top:12px"><input type="checkbox" name="confirmId" required> <span>${tx(`I checked: ${d.playerId} is my ${d.game.name_en} ${idLabel}. A top-up sent to a wrong ID can't be reversed.`, `আমি যাচাই করেছি: ${d.playerId} আমার ${d.game.name_bn} ${idLabel}। ভুল আইডিতে পাঠানো টপ-আপ ফেরত আনা যায় না।`)}</span></label>`
          : html`<p style="margin:0">${tx("You'll receive a redeem code on your order page and by SMS once the payment is confirmed.", "পেমেন্ট নিশ্চিত হলে অর্ডার পেজে ও SMS এ রিডিম কোড পাবেন।")}</p>
            <label class="check" style="margin-top:12px"><input type="checkbox" name="confirmId" required> <span>${tx("I understand this is a digital code: it's delivered after payment and can't be returned once shown.", "আমি বুঝেছি এটি ডিজিটাল কোড: পেমেন্টের পর দেওয়া হয় এবং দেখানোর পর ফেরত দেওয়া যায় না।")}</span></label>`}
          ${customer ? html`<label class="check" style="margin-top:8px"><input type="checkbox" name="saveId" checked> ${tx("Save this ID to my account", "এই আইডি আমার অ্যাকাউন্টে রাখুন")}</label>` : ""}
          <div id="ts" style="margin-top:12px"></div>
        </div>
      </form>

      <aside class="card buy-panel">
        <div class="row" style="flex-wrap:nowrap"><img src="${d.game.image}" alt="" width="64" height="80" style="width:64px;height:80px;object-fit:cover"><div><b>${L(d.game, "name")}</b><div>${L(d.product, "name")}</div><div class="small muted">${d.seller.store_name}</div></div></div>
        <div class="summary-row" style="margin-top:12px"><span>${tx("Delivery", "ডেলিভারি")}</span><span>${d.deliveryMethod === "direct" ? tx("Direct top-up", "সরাসরি টপ-আপ") : tx("Redeem code", "রিডিম কোড")}</span></div>
        ${d.playerId ? html`<div class="summary-row"><span>${idLabel}</span><b class="mono">${d.playerId}${d.serverId ? ` (${d.serverId})` : ""}</b></div>` : ""}
        <div class="summary-row"><span>${tx("Price", "দাম")}</span><span>${money(q0.unitPrice)} × ${num(q0.quantity)}</span></div>
        <div class="summary-row" id="pts-row" hidden><span>${tx("Points", "পয়েন্ট")}</span><span id="pts"></span></div>
        <div class="summary-row total"><span>${tx("Total", "মোট")}</span><span id="total">${money(quote.total)}</span></div>
        <button class="btn cta lg block" type="submit" form="co" id="place" ${methods.length ? "" : "disabled"}>${tx("Place order & pay", "অর্ডার করে পেমেন্ট করুন")}</button>
        <p class="small muted" style="margin:10px 0 0">${tx("Your code or top-up is released only after the payment gateway confirms the payment — usually within a minute.", "পেমেন্ট গেটওয়ে নিশ্চিত করার পরই কোড বা টপ-আপ দেওয়া হয় — সাধারণত এক মিনিটের মধ্যে।")}</p>
      </aside>
    </div></div>`);

  const form = $("#co", el);
  const tsToken = await turnstile($("#ts", el)).catch(() => async () => undefined);

  const saveDraft = debounce((step) => {
    const phone = form.phone.value.trim();
    api("/abandoned", { method: "POST", body: { sessionId: state.sid, name: form.name.value.trim() || undefined, phone: phone || undefined, email: form.email.value.trim() || undefined, step, cart: [{ listingId: d.listingId, productName: `${d.game.name_en} ${d.product.name_en}`, playerId: d.playerId, quantity: d.quantity, price: d.price }], utm: utm() } }).catch(() => {});
  }, 1200);
  form.addEventListener("input", (e) => saveDraft(e.target.name === "phone" || e.target.name === "name" ? "contact" : "payment"));
  form.addEventListener("change", async (e) => {
    if (e.target.name === "method") state.method = e.target.value;
    if (e.target.id === "use-points") {
      try {
        const q = await api("/checkout/quote", { method: "POST", body: { items: [line], usePoints: e.target.checked ? quote.pointsBalance : 0 } });
        state.points = q.pointsUsed;
        $("#pts-row", el).hidden = !q.pointsUsed;
        $("#pts", el).textContent = `− ${money(q.pointsUsed)}`;
        $("#total", el).textContent = money(q.total);
      } catch (err) { toast(errMsg(err), "error"); }
    }
  });

  $("#send-otp", el)?.addEventListener("click", async () => {
    const phone = normalizePhone(form.phone.value);
    if (!phone) return showFieldErrors(form, { data: { fields: [{ field: "phone", en: "Enter a valid mobile number (01XXXXXXXXX)", bn: "সঠিক মোবাইল নম্বর দিন (01XXXXXXXXX)" }] } });
    try {
      const r = await api("/otp/send", { method: "POST", body: { phone, lang: document.documentElement.lang, turnstileToken: await tsToken() } });
      $("#otp-status", el).textContent = r.devCode ? `Demo — no SMS is sent. Your code: ${r.devCode}` : tx("Code sent.", "কোড পাঠানো হয়েছে।");
      form.code.focus();
    } catch (err) { toast(errMsg(err), "error"); }
  });
  $("#verify-otp", el)?.addEventListener("click", async () => {
    try {
      await api("/otp/verify", { method: "POST", body: { phone: normalizePhone(form.phone.value) ?? form.phone.value, code: form.code.value.trim() } });
      state.otpOk = true;
      $("#otp-box", el).innerHTML = String(html`<p class="player-ok">✓ ${tx("Number verified", "নম্বর যাচাই হয়েছে")}</p>`);
      form.phone.readOnly = true;
    } catch (err) { showFieldErrors(form, err); toast(errMsg(err), "error"); }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.confirmId.checked) return showFieldErrors(form, { data: { fields: [{ field: "confirmId", en: "Please tick to confirm", bn: "নিশ্চিত করতে টিক দিন" }] } });
    const btn = $("#place", el);
    btn.disabled = true;
    btn.textContent = tx("Placing order…", "অর্ডার হচ্ছে…");
    try {
      const r = await api("/orders", {
        method: "POST",
        body: {
          customer: { name: form.name.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim() },
          items: [line], paymentMethod: state.method, usePoints: state.points, playerIdConfirmed: true, savePlayerIds: Boolean(form.saveId?.checked),
          deviceId: deviceId(), sessionId: state.sid, turnstileToken: await tsToken(), utm: utm(), adRef: adRef(), fbp: cookie("_fbp"), fbc: cookie("_fbc"), lang: document.documentElement.lang,
        },
      });
      recentOrders.add(r.orderNo, r.token);
      draft.clear();
      const pay = await api(`/orders/${r.orderNo}/pay`, { method: "POST", body: { token: r.token } });
      if (pay.kind === "redirect") { __shopDemo.go(pay.url); return; }
      navigate(`/order/${r.orderNo}?token=${r.token}`);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = tx("Place order & pay", "অর্ডার করে পেমেন্ট করুন");
      if (err instanceof ApiErr && err.data?.code === "otp_required") { $("#otp-box", el).hidden = false; $("#otp-box", el).scrollIntoView({ behavior: "smooth", block: "center" }); }
      showFieldErrors(form, err);
      toast(errMsg(err), "error", 6000);
    }
  });
}
