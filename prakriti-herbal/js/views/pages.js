// Content pages: About (sourcing story, certifications we hold), Contact (phone, WhatsApp, map), policies and a 404.
// ADJUSTABLE: policy wording is a plain-language starting point — have it reviewed before launch.
import { t, lang, tt, L } from "../i18n.js";
import { html, icon, config, api } from "../core.js";
import { emptyState, certBadges, disclaimer } from "../ui.js";

const POLICIES = {
  returns: {
    en: ["Unopened, sealed items can be returned within 7 days of delivery.", "For hygiene and safety, herbal products that have been opened can't be returned — unless they arrived damaged, leaking, wrong or past their expiry date.", "Damaged, leaking or wrong item? Tell us within 48 hours with a photo or unboxing video; we replace it or refund in full.", "If a product doesn't suit you, stop using it and call us — we'll help you choose something else.", "Refunds go back by bKash/Nagad or bank within 5 working days after we receive the item.", "Every order is packed from the batch that expires first; the batch number and expiry are printed on your invoice."],
    bn: ["সিল না খোলা পণ্য ডেলিভারির ৭ দিনের মধ্যে ফেরত দেওয়া যাবে।", "স্বাস্থ্য ও নিরাপত্তার কারণে খোলা হারবাল পণ্য ফেরত নেওয়া হয় না — তবে ক্ষতিগ্রস্ত, লিক করা, ভুল বা মেয়াদোত্তীর্ণ পণ্য এলে নেওয়া হবে।", "ক্ষতিগ্রস্ত, লিক করা বা ভুল পণ্য? ৪৮ ঘণ্টার মধ্যে ছবি বা আনবক্সিং ভিডিওসহ জানান; বদলে দেবো বা পুরো টাকা ফেরত দেবো।", "কোনো পণ্য আপনার না মানালে ব্যবহার বন্ধ করে আমাদের কল করুন — অন্য কিছু বেছে নিতে সাহায্য করবো।", "পণ্য হাতে পাওয়ার ৫ কর্মদিবসের মধ্যে বিকাশ/নগদ বা ব্যাংকে টাকা ফেরত।", "প্রতিটি অর্ডার সবচেয়ে আগে মেয়াদ শেষ হওয়া ব্যাচ থেকে প্যাক করা হয়; ব্যাচ নম্বর ও মেয়াদ ইনভয়েসে লেখা থাকে।"],
  },
  delivery: {
    en: ["Cash on Delivery all over Bangladesh. Pay the courier when your parcel arrives.", "Delivery fees are calculated automatically at checkout from your division, district and upazila.", "Inside Dhaka: usually 1–2 days. Dhaka suburbs: 2–3 days. Elsewhere: 2–5 days.", "We call or SMS to confirm new orders before they ship — this keeps fake orders away and prices low.", "Track any order from the Track order page with your order number and mobile number."],
    bn: ["সারা বাংলাদেশে ক্যাশ অন ডেলিভারি। পার্সেল হাতে পেয়ে কুরিয়ারকে টাকা দিন।", "চেকআউটে আপনার বিভাগ, জেলা ও উপজেলা অনুযায়ী ডেলিভারি চার্জ নিজে থেকে হিসাব হয়।", "ঢাকা শহরে: সাধারণত ১–২ দিন। ঢাকার আশপাশে: ২–৩ দিন। অন্যান্য এলাকা: ২–৫ দিন।", "পাঠানোর আগে নতুন অর্ডার কল বা SMS এ কনফার্ম করা হয় — এতে ভুয়া অর্ডার কমে, দামও কম থাকে।", "অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে “অর্ডার ট্র্যাক” পেজ থেকে যেকোনো অর্ডার দেখুন।"],
  },
  privacy: {
    en: ["We collect only what we need to deliver your order: name, mobile number, address and, optionally, email.", "If you start checkout but don't finish, we save what you typed so we can help you complete it; it's deleted automatically after 30 days.", "Answers to the kit builder stay in your browser and the page address; we don't ask about health conditions.", "We use analytics and advertising tags (Meta, Google, Microsoft Clarity) to improve the shop and measure ads. Phone and email are hashed before being shared with ad platforms.", "We never see or store card numbers — card payments happen on SSLCommerz's secure page.", "Ask us any time to see or delete your data: call or WhatsApp us."],
    bn: ["অর্ডার পৌঁছাতে যা দরকার শুধু তাই নিই: নাম, মোবাইল নম্বর, ঠিকানা এবং ঐচ্ছিক ইমেইল।", "চেকআউট শুরু করে শেষ না করলে, সাহায্য করতে আপনার লেখা তথ্য সংরক্ষণ করা হয়; ৩০ দিন পর নিজে থেকেই মুছে যায়।", "কিট বিল্ডারের উত্তর আপনার ব্রাউজার ও পেজের ঠিকানাতেই থাকে; আমরা কোনো অসুখের কথা জিজ্ঞেস করি না।", "দোকান উন্নত করতে ও বিজ্ঞাপন মাপতে অ্যানালিটিক্স ও বিজ্ঞাপন ট্যাগ (মেটা, গুগল, মাইক্রোসফট ক্ল্যারিটি) ব্যবহার করি। ফোন ও ইমেইল হ্যাশ করে পাঠানো হয়।", "কার্ডের নম্বর আমরা কখনো দেখি বা রাখি না — কার্ড পেমেন্ট হয় SSLCommerz এর নিরাপদ পেজে।", "আপনার তথ্য দেখতে বা মুছতে যেকোনো সময় কল বা হোয়াটসঅ্যাপ করুন।"],
  },
};

export default async function pages(el, { params, notFound }) {
  const cfg = await config();
  const s = cfg.store;
  const addr = lang() === "bn" ? s.address_bn : s.address_en;
  if (notFound) {
    el.innerHTML = String(html`<div class="container section">${emptyState(t("notFound"), "", html`<a class="btn primary" href="/">${t("backHome")}</a>`)}</div>`);
    return;
  }
  if (params.policy) {
    const titles = { returns: "returnsPolicy", delivery: "deliveryPolicy", privacy: "privacyPolicy" };
    el.innerHTML = String(html`<div class="container section narrow prose"><h1>${t(titles[params.policy])}</h1><ul class="checks">${POLICIES[params.policy][lang()].map((x) => html`<li>${icon("check")} <span>${x}</span></li>`)}</ul></div>`);
    return;
  }
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${cfg.brand.location.lat},${cfg.brand.location.lng}`)}`;
  const contactCard = html`<div class="card pad contact-card">
    <h2>${t("visitUs")}</h2>
    <ul class="info-list">
      <li>${icon("pin")}<span>${addr}, ${lang() === "bn" ? "বাংলাদেশ" : "Bangladesh"} · <a href="${map}" target="_blank" rel="noopener">${lang() === "bn" ? "ম্যাপে দেখুন" : "Open in Maps"}</a></span></li>
      <li>${icon("phone")}<a href="tel:${s.phone}">${s.phone}</a></li>
      <li>${icon("whatsapp")}<a href="/wa?lang=${lang()}">${t("chatWhatsApp")}</a></li>
      <li>${icon("clock")}<span>${lang() === "bn" ? s.hours_bn : s.hours_en}</span></li>
    </ul></div>`;
  if (params.page === "contact") {
    el.innerHTML = String(html`<div class="container section narrow"><h1>${t("contact")}</h1>${contactCard}</div>`);
    return;
  }
  const held = await api("/certifications").then((r) => r.certifications).catch(() => []);
  const bn = lang() === "bn";
  el.innerHTML = String(html`<div class="container section narrow prose">
    <h1 class="sprig-title">${t("about")}</h1>
    <p class="lead">${tt(cfg.brand.tagline)}</p>
    <p>${bn
      ? `${s.name_bn} ${s.city_bn}-এর একটি হারবাল ও প্রাকৃতিক পণ্যের দোকান। যেখানে সম্ভব, আমরা দেশের কৃষক ও ছোট উৎপাদকদের কাছ থেকে ভেষজ সংগ্রহ করি, প্রতিটি পণ্যের উৎস পেজে লিখে দিই, আর সৎভাবে লেবেল করি।`
      : `${s.name_en} is a herbal and natural products shop in ${s.city_en}. Wherever we can, we source herbs from Bangladeshi farmers and small makers, name the origin on every product page, and label everything honestly.`}</p>

    <h2>${t("sourcing")}</h2>
    <div class="story-grid">
      <div class="paper-card">${icon("sprout")}<h3>${bn ? "উৎস জানা" : "Known origins"}</h3><p class="small">${bn ? "প্রতিটি পণ্যের পাতায় লেখা থাকে কোথা থেকে এসেছে।" : "Every product page says where it comes from."}</p></div>
      <div class="paper-card">${icon("calendar")}<h3>${bn ? "ব্যাচ ও মেয়াদ" : "Batches & expiry"}</h3><p class="small">${bn ? "প্রতিটি ব্যাচের নম্বর ও মেয়াদ রেকর্ড করা হয়; আগে মেয়াদ শেষ হওয়া ব্যাচ আগে পাঠানো হয়, মেয়াদোত্তীর্ণ পণ্য কখনো নয়।" : "Every batch number and expiry date is recorded; the batch that expires first ships first, and nothing expired is ever sold."}</p></div>
      <div class="paper-card">${icon("jar")}<h3>${bn ? "সম্পূর্ণ উপাদান তালিকা" : "Full ingredient lists"}</h3><p class="small">${bn ? "প্যাকে যা লেখা, পেজেও ঠিক তা-ই — কিছু লুকানো নেই।" : "What's printed on the pack is on the page too — nothing hidden."}</p></div>
      <div class="paper-card">${icon("shield")}<h3>${bn ? "কোনো চিকিৎসা-দাবি নয়" : "No medical claims"}</h3><p class="small">${bn ? "আমরা কখনো বলি না কোনো পণ্য রোগ সারায় — শুধু ঐতিহ্যগত ব্যবহারের সৎ তথ্য।" : "We never say a product cures or treats a disease — only honest information about traditional use."}</p></div>
    </div>

    ${held.length ? html`<h2>${t("certificationsTitle")}</h2><p class="muted">${t("certificationsSub")}</p>${certBadges(held, { note: false })}
      <ul class="checks small">${held.filter((c) => c.description_en || c.description_bn).map((c) => html`<li>${icon(c.icon || "check")} <span><b>${L(c, "name")}</b>${c.issuer ? ` (${c.issuer})` : ""} — ${L(c, "description")}</span></li>`)}</ul>` : ""}

    <h2>${bn ? "আমাদের প্রতিশ্রুতি" : "Our promises"}</h2>
    <ul class="checks">
      <li>${icon("check")} <span>${bn ? "“মাত্র কয়েকটি বাকি” লেখা থাকলে সেটা আসল স্টক থেকে আসে — বানানো নয়।" : "When we say “only a few left”, it's our real stock count — never made up."}</span></li>
      <li>${icon("shield")} <span>${bn ? "সার্টিফিকেশন ব্যাজ শুধু তখনই দেখাই যখন সনদের কাগজ আমাদের কাছে আছে।" : "We show a certification badge only when we hold the certificate."}</span></li>
      <li>${icon("leaf")} <span>${bn ? "কিটের “সাশ্রয়” আসল দাম থেকে হিসাব করা — আলাদা কিনলে যত পড়ত, তার সাথে তুলনা।" : "Kit savings are calculated from real prices — what the same products cost separately."}</span></li>
    </ul>
    ${disclaimer(s)}
    ${contactCard}
  </div>`);
}
