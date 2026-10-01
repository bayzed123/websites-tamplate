// Content pages: About, Contact (Tangail studio, phone, WhatsApp, map), skin-type guide, policies and a friendly 404.
// ADJUSTABLE: policy wording is a plain-language starting point — have it reviewed before launch.
import { t, lang, tt } from "../i18n.js";
import { html, icon, config } from "../core.js";
import { skinGuideTable, emptyState } from "../ui.js";

const POLICIES = {
  returns: {
    en: ["Unopened, sealed items can be returned within 7 days of delivery.", "For hygiene reasons, skincare that has been opened can't be returned — unless it arrived damaged, leaking, wrong or past its expiry date.", "Damaged, leaking or wrong item? Tell us within 48 hours with a photo or unboxing video; we replace it or refund in full.", "If a product doesn't agree with your skin, stop using it and call us — we'll help you choose something gentler.", "Refunds go back by bKash/Nagad or bank within 5 working days after we receive the item.", "Every order is packed from the batch that expires first; the batch number and expiry are printed on your invoice."],
    bn: ["সিল না খোলা পণ্য ডেলিভারির ৭ দিনের মধ্যে ফেরত দেওয়া যাবে।", "স্বাস্থ্যগত কারণে খোলা স্কিনকেয়ার পণ্য ফেরত নেওয়া হয় না — তবে ক্ষতিগ্রস্ত, লিক করা, ভুল বা মেয়াদোত্তীর্ণ পণ্য এলে নেওয়া হবে।", "ক্ষতিগ্রস্ত, লিক করা বা ভুল পণ্য? ৪৮ ঘণ্টার মধ্যে ছবি বা আনবক্সিং ভিডিওসহ জানান; বদলে দেবো বা পুরো টাকা ফেরত দেবো।", "কোনো পণ্য ত্বকে না মানালে ব্যবহার বন্ধ করে আমাদের কল করুন — আরও কোমল কিছু বেছে নিতে সাহায্য করবো।", "পণ্য হাতে পাওয়ার ৫ কর্মদিবসের মধ্যে বিকাশ/নগদ বা ব্যাংকে টাকা ফেরত।", "প্রতিটি অর্ডার সবচেয়ে আগে মেয়াদ শেষ হওয়া ব্যাচ থেকে প্যাক করা হয়; ব্যাচ নম্বর ও মেয়াদ ইনভয়েসে লেখা থাকে।"],
  },
  delivery: {
    en: ["Cash on Delivery all over Bangladesh. Pay the courier when your parcel arrives.", "Delivery fees are calculated automatically at checkout from your division, district and upazila.", "Tangail town: usually same or next day. Rest of Tangail and Dhaka: 1–2 days. Elsewhere: 2–5 days.", "We call or SMS to confirm new orders before they ship — this keeps fake orders away and prices low.", "Track any order from the Track order page with your order number and mobile number."],
    bn: ["সারা বাংলাদেশে ক্যাশ অন ডেলিভারি। পার্সেল হাতে পেয়ে কুরিয়ারকে টাকা দিন।", "চেকআউটে আপনার বিভাগ, জেলা ও উপজেলা অনুযায়ী ডেলিভারি চার্জ নিজে থেকে হিসাব হয়।", "টাঙ্গাইল শহর: সাধারণত একই দিন বা পরের দিন। টাঙ্গাইলের অন্যান্য এলাকা ও ঢাকা: ১–২ দিন। অন্যান্য এলাকা: ২–৫ দিন।", "পাঠানোর আগে নতুন অর্ডার কল বা SMS এ কনফার্ম করা হয় — এতে ভুয়া অর্ডার কমে, দামও কম থাকে।", "অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে “অর্ডার ট্র্যাক” পেজ থেকে যেকোনো অর্ডার দেখুন।"],
  },
  privacy: {
    en: ["We collect only what we need to deliver your order or book your treatment: name, mobile number, address and, optionally, email.", "If you start checkout but don't finish, we save what you typed so we can help you complete it; it's deleted automatically after 30 days.", "Skin type and concerns from the skin quiz stay in your browser; a skin type you add to a review is shown with that review.", "We use analytics and advertising tags (Meta, Google, Microsoft Clarity) to improve the shop and measure ads. Phone and email are hashed before being shared with ad platforms.", "We never see or store card numbers — card payments happen on SSLCommerz's secure page.", "Ask us any time to see or delete your data: call or WhatsApp us."],
    bn: ["অর্ডার পৌঁছাতে বা ট্রিটমেন্ট বুক করতে যা দরকার শুধু তাই নিই: নাম, মোবাইল নম্বর, ঠিকানা এবং ঐচ্ছিক ইমেইল।", "চেকআউট শুরু করে শেষ না করলে, সাহায্য করতে আপনার লেখা তথ্য সংরক্ষণ করা হয়; ৩০ দিন পর নিজে থেকেই মুছে যায়।", "স্কিন কুইজের উত্তর আপনার ব্রাউজারেই থাকে; রিভিউতে ত্বকের ধরন দিলে তা রিভিউয়ের সাথে দেখানো হয়।", "দোকান উন্নত করতে ও বিজ্ঞাপন মাপতে অ্যানালিটিক্স ও বিজ্ঞাপন ট্যাগ (মেটা, গুগল, মাইক্রোসফট ক্ল্যারিটি) ব্যবহার করি। ফোন ও ইমেইল হ্যাশ করে পাঠানো হয়।", "কার্ডের নম্বর আমরা কখনো দেখি বা রাখি না — কার্ড পেমেন্ট হয় SSLCommerz এর নিরাপদ পেজে।", "আপনার তথ্য দেখতে বা মুছতে যেকোনো সময় কল বা হোয়াটসঅ্যাপ করুন।"],
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
  if (params.page === "skin-guide") {
    el.innerHTML = String(html`<div class="container section narrow"><h1>${t("sizeGuidePage")}</h1>${skinGuideTable()}
      <p class="patch-note small">${icon("shield")} <span>${t("patchTest")}</span></p>
      <p><a class="btn primary" href="/skin-quiz">${icon("flask")} ${t("findGift")}</a></p></div>`);
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
  el.innerHTML = String(html`<div class="container section narrow prose">
    <h1>${t("about")}</h1>
    <p class="lead">${tt(cfg.brand.tagline)}</p>
    <p>${lang() === "bn"
      ? `${s.name_bn} ${s.city_bn}-এর একটি স্কিনকেয়ার শপ ও বিউটি স্টুডিও। আমরা উপাদান দেখে পণ্য বাছাই করি, প্রতিটি পণ্যের সম্পূর্ণ উপাদান তালিকা দিই, আর আপনার ত্বকের ধরন অনুযায়ী সহজ রুটিন বানাতে সাহায্য করি। স্টুডিওতে ফেসিয়াল ও স্কিন ট্রিটমেন্টও করা হয়।`
      : `${s.name_en} is a skincare shop and beauty studio in ${s.city_en}. We choose products by their ingredients, publish the full ingredient list for every one, and help you build a simple routine for your skin type. Our studio offers facials and skin treatments too.`}</p>
    <p class="note-card small">${t("imitationNote")}</p>
    <h2>${lang() === "bn" ? "আমাদের প্রতিশ্রুতি" : "Our promises"}</h2>
    <ul class="checks">
      <li>${icon("leaf")} <span>${lang() === "bn" ? "প্রতিটি পণ্যের সম্পূর্ণ উপাদান তালিকা (INCI) — লুকানো কিছু নেই।" : "The full ingredient list (INCI) for every product — nothing hidden."}</span></li>
      <li>${icon("calendar")} <span>${lang() === "bn" ? "প্রতিটি ব্যাচের মেয়াদ আমরা ট্র্যাক করি; সবচেয়ে আগে মেয়াদ শেষ হওয়া ব্যাচ আগে পাঠাই, মেয়াদোত্তীর্ণ পণ্য কখনো নয়।" : "We track every batch's expiry; the batch that expires first ships first, and nothing expired is ever sold."}</span></li>
      <li>${icon("shield")} <span>${lang() === "bn" ? "“চর্মরোগ বিশেষজ্ঞ দ্বারা পরীক্ষিত” বা “নন-কমেডোজেনিক” ব্যাজ শুধু তখনই দেখাই যখন টেস্ট রিপোর্ট আমাদের কাছে আছে।" : "We only show a “dermatologically tested” or “non-comedogenic” badge when we hold the test report."}</span></li>
      <li>${icon("check")} <span>${lang() === "bn" ? "“মাত্র কয়েকটি বাকি” লেখা থাকলে সেটা আসল স্টক থেকে আসে — বানানো নয়।" : "When we say “only a few left”, it's our real stock count — never made up."}</span></li>
      <li>${icon("sparkle")} <span>${lang() === "bn" ? "আমরা কখনো বলি না কোনো পণ্য রোগ সারায় — শুধু সৎ, কসমেটিক বর্ণনা।" : "We never claim a product cures or treats a condition — only honest, cosmetic descriptions."}</span></li>
    </ul>
    ${contactCard}
  </div>`);
}
