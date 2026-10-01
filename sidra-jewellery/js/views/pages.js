// Content pages: About, Contact (location, phone, WhatsApp, map), size guide, policies and a friendly 404.
// ADJUSTABLE: policy wording is a plain-language starting point — have it reviewed before launch.
import { t, lang, tt } from "../i18n.js";
import { html, icon, config } from "../core.js";
import { sizeChartTable, emptyState } from "../ui.js";

const POLICIES = {
  returns: {
    en: ["Returns within 7 days of delivery for unworn pieces in the original box and pouch, with tags on.", "Wrong ring or bangle size? We'll exchange it — we cover the courier fee the first time.", "Damaged, broken stone or wrong item? Tell us within 48 hours with a photo or unboxing video; we replace or refund in full.", "Refunds go back by bKash/Nagad or bank within 5 working days after we receive the item.", "For hygiene reasons, pierced earrings (studs, hoops, jhumkas with posts) can't be returned once the seal is opened unless they're faulty.", "Plating is fashion jewellery: keep it away from water and perfume. Normal wear of the plating after use isn't a fault."],
    bn: ["ডেলিভারির ৭ দিনের মধ্যে না-পরা গয়না আসল বক্স ও পাউচে, ট্যাগসহ ফেরত দেওয়া যাবে।", "আংটি বা চুড়ির সাইজ মেলেনি? বদলে দেবো — প্রথমবার কুরিয়ার চার্জ আমাদের।", "ভাঙা, পাথর খোলা বা ভুল পণ্য? ৪৮ ঘণ্টার মধ্যে ছবি বা আনবক্সিং ভিডিওসহ জানান; বদলে দেবো বা পুরো টাকা ফেরত দেবো।", "পণ্য হাতে পাওয়ার ৫ কর্মদিবসের মধ্যে বিকাশ/নগদ বা ব্যাংকে টাকা ফেরত।", "স্বাস্থ্যগত কারণে কানের দুল (টপ, হুপ, পোস্টওয়ালা ঝুমকা) সিল খোলার পর ত্রুটি ছাড়া ফেরত নেওয়া হয় না।", "প্লেটিং করা ফ্যাশন জুয়েলারি পানি ও পারফিউম থেকে দূরে রাখুন। ব্যবহারে প্লেটিং স্বাভাবিকভাবে হালকা হওয়া ত্রুটি নয়।"],
  },
  delivery: {
    en: ["Cash on Delivery all over Bangladesh. Pay the courier when your parcel arrives.", "Delivery fees are calculated automatically at checkout from your division, district and upazila.", "Dhaka City: usually 1–2 days. Elsewhere: 2–5 days.", "We call or SMS to confirm new orders before they ship — this keeps fake orders away and prices low.", "Track any order from the Track order page with your order number and mobile number."],
    bn: ["সারা বাংলাদেশে ক্যাশ অন ডেলিভারি। পার্সেল হাতে পেয়ে কুরিয়ারকে টাকা দিন।", "চেকআউটে আপনার বিভাগ, জেলা ও উপজেলা অনুযায়ী ডেলিভারি চার্জ নিজে থেকে হিসাব হয়।", "ঢাকা সিটি: সাধারণত ১–২ দিন। অন্যান্য এলাকা: ২–৫ দিন।", "পাঠানোর আগে নতুন অর্ডার কল বা SMS এ কনফার্ম করা হয় — এতে ভুয়া অর্ডার কমে, দামও কম থাকে।", "অর্ডার নম্বর ও মোবাইল নম্বর দিয়ে “অর্ডার ট্র্যাক” পেজ থেকে যেকোনো অর্ডার দেখুন।"],
  },
  privacy: {
    en: ["We collect only what we need to deliver your order: name, mobile number, address and, optionally, email.", "If you start checkout but don't finish, we save what you typed so we can help you complete it; it's deleted automatically after 30 days.", "We use analytics and advertising tags (Meta, Google, Microsoft Clarity) to improve the shop and measure ads. Phone and email are hashed before being shared with ad platforms.", "We never see or store card numbers — card payments happen on SSLCommerz's secure page.", "Ask us any time to see or delete your data: call or WhatsApp us."],
    bn: ["অর্ডার পৌঁছাতে যা দরকার শুধু তাই নিই: নাম, মোবাইল নম্বর, ঠিকানা এবং ঐচ্ছিক ইমেইল।", "চেকআউট শুরু করে শেষ না করলে, সাহায্য করতে আপনার লেখা তথ্য সংরক্ষণ করা হয়; ৩০ দিন পর নিজে থেকেই মুছে যায়।", "দোকান উন্নত করতে ও বিজ্ঞাপন মাপতে অ্যানালিটিক্স ও বিজ্ঞাপন ট্যাগ (মেটা, গুগল, মাইক্রোসফট ক্ল্যারিটি) ব্যবহার করি। ফোন ও ইমেইল হ্যাশ করে পাঠানো হয়।", "কার্ডের নম্বর আমরা কখনো দেখি বা রাখি না — কার্ড পেমেন্ট হয় SSLCommerz এর নিরাপদ পেজে।", "আপনার তথ্য দেখতে বা মুছতে যেকোনো সময় কল বা হোয়াটসঅ্যাপ করুন।"],
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
  if (params.page === "size-guide") {
    el.innerHTML = String(html`<div class="container section narrow"><h1>${t("sizeGuidePage")}</h1><h2>${t("ringSizeGuide")}</h2>${sizeChartTable("ring")}<h2>${t("bangleSizeGuide")}</h2>${sizeChartTable("bangle")}</div>`);
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
      ? `${s.name_bn} ${s.city_bn}-ভিত্তিক একটি ফ্যাশন জুয়েলারি দোকান। প্রতিদিনের হালকা টপ ও লকেট থেকে বিয়ের কুন্দন সেট — প্রতিটি পিস আমরা নিজে দেখে বাছাই করি, মাপ ও ওজন লিখে দিই, আর যত্ন করে বক্সে প্যাক করি।`
      : `${s.name_en} is a fashion jewellery shop in ${s.city_en}. From light everyday studs and pendants to bridal kundan sets, we check every piece ourselves, list its real weight and plating, and pack it with care.`}</p>
    <p class="note-card small">${t("imitationNote")} ${lang() === "bn" ? "আসল সোনা/রুপার জন্য বিএসটিআই হলমার্ক ও ইন্স্যুরেন্সসহ শিপিং দরকার — আমরা সেগুলো বিক্রি করি না।" : "Genuine gold and silver need BSTI hallmarking and insured shipping — we don't sell those."}</p>
    <h2>${lang() === "bn" ? "আমাদের প্রতিশ্রুতি" : "Our promises"}</h2>
    <ul class="checks">
      <li>${icon("shield")} <span>${lang() === "bn" ? "“নিকেল-মুক্ত” বা “হাইপোঅ্যালার্জেনিক” ব্যাজ শুধু তখনই দেখাই যখন টেস্ট রিপোর্ট আমাদের কাছে আছে — সাজানোর জন্য কখনো নয়।" : "We only show a “nickel-free” or “hypoallergenic” badge when we hold the test report — never as decoration."}</span></li>
      <li>${icon("check")} <span>${lang() === "bn" ? "“মাত্র কয়েকটি বাকি” লেখা থাকলে সেটা আসল স্টক থেকে আসে — বানানো নয়।" : "When we say “only a few left”, it's our real stock count — never made up."}</span></li>
      <li>${icon("cash")} <span>${lang() === "bn" ? "সারা দেশে ক্যাশ অন ডেলিভারি, সহজ রিটার্ন।" : "Cash on Delivery across Bangladesh and easy returns."}</span></li>
    </ul>
    ${contactCard}
  </div>`);
}
