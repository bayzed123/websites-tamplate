// System settings: store info, payments (no Cash on Delivery), marketplace rules (commission default, SLA, payout hold,
// Verified badge), fraud thresholds, loyalty & referral, notifications, message templates, tracking IDs.
// Secrets (API keys) are never shown or edited here — only whether each one is set.
import { t, tx } from "../i18n.js";
import { html, icon, api, $, $$, can, toast, msg, errMsg, confirmDialog } from "../core.js";

const SECTIONS = [
  ["store", "Store information", "দোকানের তথ্য", "Shown in the marketplace header, footer and on invoices.", "মার্কেটপ্লেসের হেডার, ফুটার ও ইনভয়েসে দেখায়।"],
  ["payments", "Payments", "পেমেন্ট", "bKash / Nagad / Rocket in “manual” mode use your merchant number; staff confirm each payment. There is no Cash on Delivery.", "ম্যানুয়াল মোডে বিকাশ / নগদ / রকেট আপনার মার্চেন্ট নম্বর ব্যবহার করে; প্রতিটি পেমেন্ট স্টাফ নিশ্চিত করেন। ক্যাশ অন ডেলিভারি নেই।"],
  ["marketplace", "Marketplace rules", "মার্কেটপ্লেসের নিয়ম", "Default commission (basis points), delivery deadline, payout hold, Verified badge and standing thresholds. ADJUSTABLE.", "ডিফল্ট কমিশন (বেসিস পয়েন্ট), ডেলিভারির সময়সীমা, পেআউট হোল্ড, ভেরিফায়েড ব্যাজ ও অবস্থানের সীমা। পরিবর্তনযোগ্য।"],
  ["fraud", "Fraud thresholds", "প্রতারণা প্রতিরোধের সীমা", "Velocity limits, card-testing block, new-buyer daily cap, when paid orders are held for review.", "ভেলোসিটি সীমা, কার্ড-টেস্টিং ব্লক, নতুন ক্রেতার দৈনিক সীমা, কখন পেইড অর্ডার যাচাইয়ে আটকে থাকবে।"],
  ["loyalty", "Loyalty points", "লয়ালটি পয়েন্ট", "1 point = ৳1.", "১ পয়েন্ট = ৳১।"],
  ["referral", "Referral", "রেফারেল", "", ""],
  ["notifications", "Notifications", "নোটিফিকেশন", "Owner phone gets security, payment-check and escalation alerts.", "মালিকের ফোনে নিরাপত্তা, পেমেন্ট যাচাই ও এসকেলেশনের সতর্কবার্তা যায়।"],
  ["automation", "Automation", "অটোমেশন", "", ""],
  ["abandoned", "Abandoned checkouts", "অসম্পূর্ণ চেকআউট", "", ""],
  ["integrations", "Tracking IDs", "ট্র্যাকিং আইডি", "Meta Pixel, GA4, Google Ads, Clarity. The Conversions API token is a Worker secret.", "Meta Pixel, GA4, Google Ads, Clarity। Conversions API টোকেন Worker সিক্রেট।"],
  ["templates", "Message templates", "মেসেজ টেমপ্লেট", "Placeholders: {name} {order_no} {invoice_no} {total} {store} {link} {product} {codes} {amount} {reason} …", "প্লেসহোল্ডার: {name} {order_no} {invoice_no} {total} {store} {link} {product} {codes} {amount} {reason} …"],
];
const label = (k) => k.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

function fields(obj, prefix = "") {
  return html`${Object.entries(obj).map(([k, v]) => {
    const name = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      if ("en" in v && "bn" in v && Object.keys(v).length === 2) return html`<div class="card" style="grid-column:1/-1;padding:12px"><b>${label(k)}</b><label class="field"><span>English</span><textarea class="input" rows="2" name="${name}.en">${v.en}</textarea></label><label class="field"><span>বাংলা</span><textarea class="input" rows="2" name="${name}.bn">${v.bn}</textarea></label></div>`;
      return html`<fieldset class="card" style="grid-column:1/-1;padding:12px"><legend><b>${label(k)}</b></legend><div class="grid2">${fields(v, name)}</div></fieldset>`;
    }
    if (typeof v === "boolean") return html`<label class="check"><input type="checkbox" name="${name}" ${v ? "checked" : ""}> ${label(k)}</label>`;
    if (typeof v === "number") return html`<label class="field"><span>${label(k)}</span><input class="input" type="number" step="any" name="${name}" value="${v}"></label>`;
    if (k === "mode") return html`<label class="field"><span>${label(k)}</span><select class="input" name="${name}">${["manual", "api"].map((m) => html`<option ${m === v ? "selected" : ""}>${m}</option>`)}</select></label>`;
    return html`<label class="field" style="${String(v).length > 60 ? "grid-column:1/-1" : ""}"><span>${label(k)}</span>${String(v).length > 60 ? html`<textarea class="input" rows="2" name="${name}">${v}</textarea>` : html`<input class="input" name="${name}" value="${v}">`}</label>`;
  })}`;
}

function read(form, base) {
  const out = structuredClone(base);
  for (const el of form.elements) {
    if (!el.name) continue;
    const path = el.name.split(".");
    let o = out;
    for (const p of path.slice(0, -1)) o = o[p];
    const k = path.at(-1);
    o[k] = el.type === "checkbox" ? el.checked : typeof o[k] === "number" ? Number(el.value) : el.value;
  }
  return out;
}

export default async function settings(view) {
  let d;
  try { d = await api("/settings"); } catch (e) { view.innerHTML = String(html`<p class="error-box">${errMsg(e)}</p>`); return; }
  const editable = can("settings.manage");
  view.innerHTML = String(html`<div class="page-head"><h1>${t("settings")}</h1>${editable ? html`<button class="btn" id="backup">${icon("download")} ${tx("Back up now", "এখনই ব্যাকআপ")}</button>` : ""}</div>
    <section class="card health" style="margin-bottom:16px"><h2>${tx("Connected services (Worker secrets)", "যুক্ত সার্ভিস (Worker সিক্রেট)")}</h2>
      <ul>${Object.entries(d.secrets).map(([k, v]) => html`<li><span class="led ${v ? "ok" : "partial"}"></span><span><b>${k}</b> — ${v ? tx("set", "সেট আছে") : tx("not set", "সেট নেই")}</span></li>`)}</ul>
      <p class="small muted">${tx("Set secrets with “wrangler secret put NAME” or GitHub Actions secrets — never in this screen or in the repository.", "“wrangler secret put NAME” বা GitHub Actions সিক্রেট দিয়ে সিক্রেট দিন — এই স্ক্রিনে বা রিপোজিটরিতে কখনো নয়।")}</p></section>
    <div class="chips" style="margin-bottom:14px">${SECTIONS.map(([k, en, bn], i) => html`<button class="chip" data-sec="${k}" aria-pressed="${i === 0}">${tx(en, bn)}</button>`)}</div>
    <div id="sec"></div>`);
  const show = (key) => {
    const [, en, bn, ien, ibn] = SECTIONS.find((s) => s[0] === key);
    $("#sec", view).innerHTML = String(html`<form class="card" id="sf"><h2>${tx(en, bn)}</h2>${ien ? html`<p class="muted small">${tx(ien, ibn)}</p>` : ""}
      <fieldset ${editable ? "" : "disabled"} style="border:0;padding:0;margin:0"><div class="grid2">${fields(d.settings[key])}</div></fieldset>
      ${editable ? html`<button class="btn primary" style="margin-top:12px">${t("save")}</button>` : html`<p class="small muted">${tx("Only a Super Admin can change settings.", "শুধু সুপার অ্যাডমিন সেটিংস বদলাতে পারেন।")}</p>`}</form>`);
    $("#sf", view).addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const r = await api(`/settings/${key}`, { method: "PUT", body: read(e.target, d.settings[key]) });
        d.settings[key] = r.settings;
        toast(msg(r));
      } catch (err) { toast(errMsg(err), "err"); }
    });
  };
  $$("[data-sec]", view).forEach((b) => (b.onclick = () => { $$("[data-sec]", view).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); show(b.dataset.sec); }));
  $("#backup", view)?.addEventListener("click", async () => {
    if (!(await confirmDialog(tx("Copy the whole database to private storage now?", "এখনই পুরো ডাটাবেস প্রাইভেট স্টোরেজে কপি করবেন?"), { danger: false }))) return;
    try { toast(msg(await api("/backup", { method: "POST" }))); } catch (err) { toast(errMsg(err), "err"); }
  });
  show(SECTIONS[0][0]);
}
