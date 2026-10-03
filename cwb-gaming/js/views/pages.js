// Info pages: about, contact, how it works, sell on CWB, policies, 404.
import { tx, L, t } from "../i18n.js";
import { html, config } from "../core.js";

export default async function pages(el, { params, notFound }) {
  const cfg = await config().catch(() => ({ store: {}, disputeWindowDays: 7, payments: { expiryMinutes: 30 } }));
  const s = cfg.store ?? {};
  const days = cfg.disputeWindowDays ?? 7;
  const page = notFound ? "404" : params.page ?? params.policy;
  const P = {
    "404": () => html`<h1>${t("notFound")}</h1><p><a class="btn primary" href="/">${t("home")}</a></p>`,
    about: () => html`<h1>${tx("About CWB Gaming", "সিডব্লিউবি গেমিং সম্পর্কে")}</h1>
      <p>${tx("CWB Gaming is a marketplace for game top-ups and redeem codes in Bangladesh: PUBG Mobile UC, Free Fire and Mobile Legends Diamonds, Call of Duty Mobile CP, and Google Play and Steam codes.", "সিডব্লিউবি গেমিং বাংলাদেশে গেম টপ-আপ ও রিডিম কোডের মার্কেটপ্লেস: PUBG Mobile UC, Free Fire ও Mobile Legends ডায়মন্ড, Call of Duty Mobile CP, এবং Google Play ও Steam কোড।")}</p>
      <h2>${tx("What we promise", "আমাদের প্রতিশ্রুতি")}</h2><ul>
        <li>${tx("Payment first, always: nothing is delivered until the payment gateway confirms your payment to our server.", "সবসময় আগে পেমেন্ট: পেমেন্ট গেটওয়ে আমাদের সার্ভারে নিশ্চিত না করা পর্যন্ত কিছু ডেলিভারি হয় না।")}</li>
        <li>${tx("Every seller passes identity checks (KYC) before they can sell.", "বিক্রির আগে প্রতিটি সেলার পরিচয় যাচাই (KYC) পার করেন।")}</li>
        <li>${tx("Sellers never see your payment details — only what they need: the pack and your player ID.", "সেলাররা কখনো আপনার পেমেন্টের তথ্য দেখেন না — শুধু যা দরকার: প্যাক আর আপনার প্লেয়ার আইডি।")}</li>
        <li>${tx("Real numbers only: the stock, ratings and delivery times you see come from actual orders.", "শুধু আসল সংখ্যা: যে স্টক, রেটিং ও ডেলিভারি সময় দেখেন তা আসল অর্ডার থেকে আসে।")}</li></ul>
      <p class="muted small">${tx("We sell only official top-ups and genuine codes. No cryptocurrency, no USD/PayPal trading, no accounts, no hacks.", "আমরা শুধু অফিসিয়াল টপ-আপ ও আসল কোড বিক্রি করি। ক্রিপ্টোকারেন্সি, USD/PayPal লেনদেন, অ্যাকাউন্ট বা হ্যাক নেই।")}</p>`,
    contact: () => html`<h1>${tx("Contact", "যোগাযোগ")}</h1>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        <div class="card"><h3>${tx("Phone", "ফোন")}</h3><a href="tel:${s.phone}">${s.phone}</a><p class="small muted">${L(s, "hours")}</p></div>
        <div class="card"><h3>WhatsApp</h3><a class="btn" href="/wa">${tx("Chat with us", "চ্যাট করুন")}</a></div>
        <div class="card"><h3>${tx("Email", "ইমেইল")}</h3><a href="mailto:${s.email}">${s.email}</a></div>
        <div class="card"><h3>${tx("Office", "অফিস")}</h3><p class="small" style="margin:0">${L(s, "address")}</p></div></div>
      <p class="muted" style="margin-top:16px">${tx("For a problem with an order, open the order and press “Report a problem” — it's the fastest way, and it holds the seller's money until it's sorted.", "অর্ডারে সমস্যা হলে অর্ডারটি খুলে “সমস্যা জানান” চাপুন — এটিই সবচেয়ে দ্রুত, আর সমাধান না হওয়া পর্যন্ত সেলারের টাকা আটকে থাকে।")}</p>`,
    "how-it-works": () => html`<h1>${tx("How it works", "কীভাবে কাজ করে")}</h1>
      <div class="steps" style="margin:20px 0">
        <div class="card"><h3>${tx("Choose", "বাছুন")}</h3><p class="small muted">${tx("Pick your game and pack, then compare every seller's price, rating and delivery speed.", "গেম ও প্যাক বেছে সব সেলারের দাম, রেটিং ও ডেলিভারি সময় তুলনা করুন।")}</p></div>
        <div class="card"><h3>${tx("Confirm your ID", "আইডি নিশ্চিত করুন")}</h3><p class="small muted">${tx("We check the format, show it back to you and ask you to tick that it's correct.", "আমরা ফরম্যাট যাচাই করে আইডিটি আবার দেখাই এবং সঠিক কিনা টিক দিতে বলি।")}</p></div>
        <div class="card"><h3>${tx("Pay", "পেমেন্ট")}</h3><p class="small muted">${tx("bKash, Nagad, Rocket or card. No Cash on Delivery. Unpaid orders expire.", "বিকাশ, নগদ, রকেট বা কার্ড। ক্যাশ অন ডেলিভারি নেই। পেমেন্ট না হলে অর্ডার বাতিল হয়।")}</p></div>
        <div class="card"><h3>${tx("Receive", "পান")}</h3><p class="small muted">${tx("Once the gateway confirms: stocked codes appear instantly, direct top-ups usually arrive within the seller's 30-minute deadline.", "গেটওয়ে নিশ্চিত করলেই: স্টকের কোড সাথে সাথে আসে, সরাসরি টপ-আপ সাধারণত সেলারের ৩০ মিনিটের সময়সীমার মধ্যে আসে।")}</p></div></div>
      <div class="prose"><h2>${tx("Why might my order be “held for review”?", "আমার অর্ডার কেন “যাচাইয়ের জন্য অপেক্ষমাণ” হতে পারে?")}</h2>
      <p>${tx("To protect buyers and sellers from stolen payments, some paid orders get a quick human check first — for example a first order above a certain amount or a very large order. It usually takes under 30 minutes. Your money is safe; if we can't deliver, you're refunded.", "চুরি করা পেমেন্ট থেকে ক্রেতা ও সেলারকে রক্ষা করতে কিছু পেইড অর্ডার প্রথমে একজন মানুষ দ্রুত যাচাই করেন — যেমন নির্দিষ্ট অঙ্কের বেশি প্রথম অর্ডার বা খুব বড় অর্ডার। সাধারণত ৩০ মিনিটের কম লাগে। আপনার টাকা নিরাপদ; ডেলিভারি দিতে না পারলে রিফান্ড পাবেন।")}</p>
      <h2>${tx("Something went wrong?", "কিছু ভুল হয়েছে?")}</h2><p>${tx(`Report it from your order page within ${days} days. The seller answers within 24 hours, then our team decides: refund, release to the seller, or a split.`, `${days} দিনের মধ্যে অর্ডার পেজ থেকে রিপোর্ট করুন। সেলার ২৪ ঘণ্টার মধ্যে উত্তর দেবেন, তারপর আমাদের টিম সিদ্ধান্ত নেবে: রিফান্ড, সেলারকে টাকা, বা ভাগাভাগি।`)}</p></div>`,
    sell: () => html`<h1>${tx("Sell on CWB Gaming", "সিডব্লিউবি গেমিং এ বিক্রি করুন")}</h1>
      <p class="muted" style="max-width:720px">${tx("Run a top-up or code business? List your packs next to the Official Store and reach buyers across Bangladesh.", "টপ-আপ বা কোডের ব্যবসা করেন? অফিসিয়াল স্টোরের পাশে আপনার প্যাক লিস্ট করে সারা বাংলাদেশের ক্রেতার কাছে পৌঁছান।")}</p>
      <div class="steps" style="margin:20px 0">
        <div class="card"><h3>${tx("Sign up & 2FA", "সাইন আপ ও 2FA")}</h3><p class="small muted">${tx("Create your seller account and turn on an authenticator app (required).", "সেলার অ্যাকাউন্ট খুলে অথেন্টিকেটর অ্যাপ চালু করুন (বাধ্যতামূলক)।")}</p></div>
        <div class="card"><h3>KYC</h3><p class="small muted">${tx("NID / passport, a selfie with it, your phone and a payout account. Documents are stored privately and seen only by our review team.", "NID / পাসপোর্ট, সেটি হাতে সেলফি, ফোন ও পেআউট অ্যাকাউন্ট। ডকুমেন্ট গোপনে রাখা হয়, শুধু আমাদের রিভিউ টিম দেখে।")}</p></div>
        <div class="card"><h3>${tx("List & stock", "লিস্ট ও স্টক")}</h3><p class="small muted">${tx("List against our catalogue (SKU made for you), upload codes (encrypted) or deliver top-ups within 30 minutes.", "আমাদের ক্যাটালগে লিস্ট করুন (SKU নিজে তৈরি হয়), কোড আপলোড করুন (এনক্রিপ্টেড) বা ৩০ মিনিটে টপ-আপ দিন।")}</p></div>
        <div class="card"><h3>${tx("Get paid", "টাকা পান")}</h3><p class="small muted">${tx("Earnings become withdrawable after a short hold window; request a payout to bKash, Nagad, Rocket or bank.", "অল্প সময় আটকে থাকার পর আয় তোলা যায়; বিকাশ, নগদ, রকেট বা ব্যাংকে পেআউট নিন।")}</p></div></div>
      <p><a class="btn cta lg" href="../cwb-gaming-seller/index.html#/register" target="_self">${tx("Apply as a seller", "সেলার হিসেবে আবেদন করুন")}</a> <a class="btn ghost lg" href="../cwb-gaming-seller/index.html" target="_self">${tx("Seller sign in", "সেলার সাইন ইন")}</a></p>
      <p class="small muted">${tx("The Verified Seller badge is earned automatically after 50 clean orders with a low dispute rate. It's never sold or granted on request.", "ভেরিফায়েড সেলার ব্যাজ ৫০টি ঝামেলাহীন অর্ডার ও কম বিরোধের হারে নিজে থেকেই আসে। এটি কখনো বিক্রি বা অনুরোধে দেওয়া হয় না।")}</p>`,
    refund: () => html`<h1>${tx("Refunds & disputes", "রিফান্ড ও বিরোধ")}</h1><div class="prose">
      <p>${tx("Digital goods can't be returned once delivered, but you're protected:", "ডিজিটাল পণ্য ডেলিভারির পর ফেরত দেওয়া যায় না, তবে আপনি সুরক্ষিত:")}</p><ul>
      <li>${tx("If an order can't be delivered, you get a full refund to the original payment method.", "অর্ডার ডেলিভারি দেওয়া না গেলে মূল পেমেন্ট মাধ্যমে পুরো টাকা ফেরত পাবেন।")}</li>
      <li>${tx(`Code didn't work, wasn't received or the amount was wrong? Report it within ${days} days from the order page.`, `কোড কাজ করেনি, পাননি বা পরিমাণ ভুল? ${days} দিনের মধ্যে অর্ডার পেজ থেকে রিপোর্ট করুন।`)}</li>
      <li>${tx("A top-up sent to the player ID you entered and confirmed can't be reversed — please double-check it at checkout.", "আপনার দেওয়া ও নিশ্চিত করা প্লেয়ার আইডিতে পাঠানো টপ-আপ ফেরত আনা যায় না — চেকআউটে আবার দেখে নিন।")}</li>
      <li>${tx("Unpaid orders simply expire; nothing is charged.", "পেমেন্ট না হওয়া অর্ডার নিজে থেকেই বাতিল হয়; কোনো টাকা কাটে না।")}</li></ul></div>`,
    privacy: () => html`<h1>${tx("Privacy", "গোপনীয়তা")}</h1><div class="prose"><ul>
      <li>${tx("We keep your name, phone, optional email, order history and the player IDs you enter — to deliver and support your orders.", "আপনার নাম, ফোন, ঐচ্ছিক ইমেইল, অর্ডারের ইতিহাস ও প্লেয়ার আইডি রাখি — অর্ডার ডেলিভারি ও সহায়তার জন্য।")}</li>
      <li>${tx("Card and wallet details are entered on the payment provider's page; we never see or store card numbers.", "কার্ড ও ওয়ালেটের তথ্য পেমেন্ট প্রোভাইডারের পেজে দেওয়া হয়; আমরা কার্ড নম্বর দেখি না বা রাখি না।")}</li>
      <li>${tx("Sellers see only the pack, quantity and player ID needed to deliver.", "সেলাররা শুধু ডেলিভারির জন্য দরকারি প্যাক, পরিমাণ ও প্লেয়ার আইডি দেখেন।")}</li>
      <li>${tx("Redeem codes are stored encrypted. Fraud checks use your device, IP and order history.", "রিডিম কোড এনক্রিপ্ট করে রাখা হয়। প্রতারণা রোধে ডিভাইস, IP ও অর্ডারের ইতিহাস ব্যবহার করা হয়।")}</li>
      <li>${tx("Unfinished checkouts are deleted after 30 days.", "অসম্পূর্ণ চেকআউট ৩০ দিন পর মুছে ফেলা হয়।")}</li></ul></div>`,
    terms: () => html`<h1>${tx("Terms", "শর্তাবলী")}</h1><div class="prose"><ul>
      <li>${tx("CWB Gaming is a marketplace: each pack is sold by the seller shown, under these terms.", "সিডব্লিউবি গেমিং একটি মার্কেটপ্লেস: প্রতিটি প্যাক দেখানো সেলার এই শর্তে বিক্রি করেন।")}</li>
      <li>${tx("Payment must be confirmed by the gateway before delivery. There is no Cash on Delivery.", "ডেলিভারির আগে গেটওয়েকে পেমেন্ট নিশ্চিত করতে হবে। ক্যাশ অন ডেলিভারি নেই।")}</li>
      <li>${tx("Orders may be held for a short review; we may cancel and refund orders we believe are fraudulent.", "অর্ডার অল্প সময় যাচাইয়ে থাকতে পারে; প্রতারণামূলক মনে হলে অর্ডার বাতিল করে রিফান্ড দিতে পারি।")}</li>
      <li>${tx("Only official top-ups and genuine codes are sold. No cryptocurrency or foreign-currency (USD/PayPal) trading.", "শুধু অফিসিয়াল টপ-আপ ও আসল কোড বিক্রি হয়। ক্রিপ্টোকারেন্সি বা বৈদেশিক মুদ্রা (USD/PayPal) লেনদেন নেই।")}</li>
      <li>${tx("Game names belong to their publishers; we're not affiliated with them.", "গেমের নাম তাদের প্রকাশকদের; আমরা তাদের সাথে যুক্ত নই।")}</li></ul></div>`,
    "seller-terms": () => html`<h1>${tx("Seller terms", "সেলার শর্তাবলী")}</h1><div class="prose"><ul>
      <li>${tx("KYC and two-factor sign-in are required. You can only list packs from the platform catalogue.", "KYC ও দুই-ধাপের সাইন-ইন বাধ্যতামূলক। শুধু প্ল্যাটফর্মের ক্যাটালগের প্যাক লিস্ট করা যায়।")}</li>
      <li>${tx("Manual top-ups must be delivered within your deadline (30 minutes by default); missed deadlines are escalated and may be moved to another seller.", "ম্যানুয়াল টপ-আপ আপনার সময়সীমার মধ্যে দিতে হবে (ডিফল্ট ৩০ মিনিট); সময় পার হলে অর্ডার এসকেলেট হয় ও অন্য সেলারকে দেওয়া হতে পারে।")}</li>
      <li>${tx("Codes must be genuine and unused. A code can only ever be delivered once on this marketplace.", "কোড অবশ্যই আসল ও অব্যবহৃত হতে হবে। একটি কোড এই মার্কেটপ্লেসে একবারই দেওয়া যায়।")}</li>
      <li>${tx("A commission is deducted per order; earnings are held for a short window and during disputes.", "প্রতি অর্ডারে কমিশন কাটা হয়; আয় অল্প সময় এবং বিরোধ চলাকালীন আটকে থাকে।")}</li>
      <li>${tx("No fake urgency, “100% safe / ban-proof” claims, hacks, generators or account selling — such copy is refused.", "বানানো তাড়া, “১০০% নিরাপদ / ব্যান হবে না” দাবি, হ্যাক, জেনারেটর বা অ্যাকাউন্ট বিক্রি চলবে না — এমন লেখা গ্রহণ করা হয় না।")}</li>
      <li>${tx("You never receive buyers' payment details; contacting buyers off-platform isn't allowed.", "আপনি কখনো ক্রেতার পেমেন্টের তথ্য পাবেন না; প্ল্যাটফর্মের বাইরে ক্রেতার সাথে যোগাযোগ অনুমোদিত নয়।")}</li></ul></div>`,
  };
  document.title = `${page === "404" ? t("notFound") : tx("CWB Gaming", "সিডব্লিউবি গেমিং")} — CWB Gaming`;
  el.innerHTML = String(html`<div class="container section">${(P[page] ?? P["404"])()}</div>`);
}
