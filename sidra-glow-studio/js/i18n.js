// Bilingual strings (Bangla default, English toggle). Plain, friendly language throughout.
const STR = {
  bn: {
    skipToContent: "মূল অংশে যান", search: "খুঁজুন", searchPlaceholder: "সিরাম, সানস্ক্রিন, নায়াসিনামাইড…", account: "অ্যাকাউন্ট", wishlist: "পছন্দের তালিকা", cart: "কার্ট",
    home: "হোম", shop: "শপ", about: "আমাদের কথা", contact: "যোগাযোগ", giftFinder: "স্কিন কুইজ", track: "অর্ডার ট্র্যাক", registry: "রুটিন",
    shopByCategory: "ক্যাটাগরি অনুযায়ী কিনুন", shopByAge: "সমস্যা অনুযায়ী কিনুন", collections: "রুটিন সেট", shopTheSet: "রুটিনটি দেখুন", pieces: "{n}টি পণ্য", setPrice: "সব মিলিয়ে {price}", customerPhotos: "ক্রেতাদের রিভিউ", newArrivals: "নতুন এসেছে", bestSellers: "সবচেয়ে বেশি বিক্রি", viewAll: "সব দেখুন",
    giftingGuide: "স্কিন কুইজ", giftingGuideSub: "ত্বকের ধরন, মূল সমস্যা আর বাজেট বলুন — আপনার জন্য সহজ একটি রুটিন সাজিয়ে দিচ্ছি।", findGift: "কুইজ শুরু করুন",
    happyParents: "ক্রেতারা যা বলছেন", noReviewsYet: "প্রথম রিভিউ আপনিই দিন — কেনার পর অর্ডার পেজ থেকে রিভিউ লিখতে পারবেন।",
    newsletter: "অফার ও নতুন পণ্যের খবর পান", newsletterSub: "মাসে ১–২টি মেসেজ, স্প্যাম নয়।", subscribe: "সাবস্ক্রাইব", emailOrPhone: "ইমেইল বা মোবাইল নম্বর",
    footerAbout: "টাঙ্গাইলের স্কিনকেয়ার শপ ও বিউটি স্টুডিও — আপনার ত্বকের উপযোগী ক্লেনজার, সিরাম, সানস্ক্রিন ও ফেসিয়াল। সারা দেশে ক্যাশ অন ডেলিভারি।", policies: "নীতিমালা", visitUs: "আমাদের ঠিকানা",
    returnsPolicy: "রিটার্ন ও রিফান্ড", deliveryPolicy: "ডেলিভারি", privacyPolicy: "গোপনীয়তা", sizeGuidePage: "ত্বকের ধরন গাইড", weAccept: "যেভাবে পেমেন্ট করবেন",
    chatWhatsApp: "হোয়াটসঅ্যাপে চ্যাট", callUs: "কল করুন",
    filters: "ফিল্টার", clearAll: "সব মুছুন", ageRange: "ত্বকের ধরন", occasions: "ত্বকের ধরন", materials: "সমস্যা", weight: "পরিমাণ", grams: "{n} গ্রাম", sizeGuide: "ত্বকের ধরন গাইড", ringSizeGuide: "ত্বকের ধরন গাইড", bangleSizeGuide: "ত্বকের ধরন গাইড", completeTheLook: "রুটিনটি সম্পূর্ণ করুন", giftWrap: "গিফট বক্স", giftWrapAdd: "গিফট বক্সে দিন — বক্স, রিবন ও হাতে লেখা কার্ড (+{fee})", giftWrapNote: "চেকআউটে গিফট বক্স (+{fee}) যোগ করতে পারবেন", zoomHint: "বড় করে দেখতে ছবিতে চাপুন", imitationNote: "এটি একটি কসমেটিক পণ্য — কোনো ওষুধ নয়। ত্বকের সমস্যা থাকলে চর্মরোগ বিশেষজ্ঞের পরামর্শ নিন।", category: "ক্যাটাগরি", brand: "ব্র্যান্ড", price: "দাম", min: "সর্বনিম্ন", max: "সর্বোচ্চ", apply: "প্রয়োগ করুন",
    inStockOnly: "শুধু স্টকে আছে", onSale: "ছাড়ে", sortBy: "সাজান", sort_newest: "নতুন আগে", sort_price_asc: "দাম: কম থেকে বেশি", sort_price_desc: "দাম: বেশি থেকে কম", sort_popular: "জনপ্রিয়", sort_rating: "রেটিং",
    results: "{n}টি পণ্য", noResults: "কিছু পাওয়া যায়নি", noResultsSub: "ফিল্টার কমিয়ে বা অন্য শব্দে খুঁজে দেখুন।", loadMore: "আরও দেখুন", searchResultsFor: "“{q}” এর ফলাফল",
    addToCart: "কার্টে যোগ করুন", buyNow: "এখনই কিনুন", added: "কার্টে যোগ হয়েছে", outOfStock: "স্টক শেষ", inStock: "স্টকে আছে", onlyLeft: "মাত্র {n}টি বাকি", chooseOption: "একটি অপশন বেছে নিন",
    size: "সাইজ", color: "রং", qty: "পরিমাণ", material: "উপাদান", care: "জেনে রাখুন", description: "বিবরণ", reviews: "রিভিউ", writeReview: "রিভিউ লিখুন", relatedProducts: "এ ধরনের আরও", completeTheSet: "সাথে ভালো যায়",
    sizeChart: "সাইজ চার্ট", certified: "যাচাইকৃত টেস্ট সার্টিফিকেট", certNote: "শুধু ডকুমেন্টসহ প্রকৃত সার্টিফিকেশন দেখানো হয়।", validUntil: "মেয়াদ", issuer: "প্রদানকারী",
    notifyMe: "স্টকে এলে জানান", notifyMeSub: "মোবাইল নম্বর দিন — স্টকে এলেই SMS পাবেন।", notifyDone: "স্টকে এলেই আপনাকে জানাবো।", addToRegistry: "রুটিনে যোগ করুন", share: "শেয়ার",
    ages: "ত্বকের ধরন", allAges: "সব ত্বক", codAvailable: "ক্যাশ অন ডেলিভারি", deliveryIn: "ডেলিভারি {eta}", easyReturns: "না খোলা পণ্য ৭ দিনে রিটার্ন",
    yourCart: "আপনার কার্ট", cartEmpty: "কার্ট খালি। চলুন আপনার ত্বকের জন্য কিছু খুঁজি!", continueShopping: "কেনাকাটা চালিয়ে যান", subtotal: "সাবটোটাল", discount: "ছাড়", delivery: "ডেলিভারি চার্জ", total: "মোট", vat: "ভ্যাট", vatIncluded: "ভ্যাট ({rate}%) অন্তর্ভুক্ত",
    free: "ফ্রি", freeDelivery: "ফ্রি ডেলিভারি", deliveryAuto: "ডেলিভারি চার্জ আপনার এলাকা অনুযায়ী চেকআউটে অটো হিসাব হবে", deliveryAtCheckout: "এলাকা বেছে নিলে হিসাব হবে", freeDeliveryCoupon: "কুপন", freeDeliveryItems: "এই পণ্যগুলোতে", popupClose: "বন্ধ করুন", proceedCheckout: "চেকআউট করুন", viewCart: "কার্ট দেখুন", remove: "সরান", coupon: "কুপন বা রেফারেল কোড", applyCoupon: "প্রয়োগ", couponApplied: "কোড প্রয়োগ হয়েছে", freeOver: "৳{n}+ অর্ডারে ফ্রি ডেলিভারি",
    checkout: "চেকআউট", contactDetails: "আপনার তথ্য", fullName: "পুরো নাম", mobile: "মোবাইল নম্বর", email: "ইমেইল (ঐচ্ছিক)", deliveryAddress: "ডেলিভারি ঠিকানা",
    division: "বিভাগ", district: "জেলা", upazila: "উপজেলা / থানা", area: "বাড়ি, রোড, এলাকা", areaHint: "যেমন: বাড়ি ১২, রোড ৩, সেকশন ১০", quickArea: "পোস্টকোড বা এলাকার নাম দিয়ে খুঁজুন", noAreaMatch: "মিল পাওয়া যায়নি", choose: "বেছে নিন",
    payment: "পেমেন্ট", cod: "ক্যাশ অন ডেলিভারি", codSub: "পণ্য হাতে পেয়ে টাকা দিন", card: "কার্ড (ভিসা/মাস্টারকার্ড)", cardSub: "নিরাপদ SSLCommerz পেজে", mfsSend: "{method} ({type}) নম্বরে ৳{total} Send Money করুন: {number}", trxId: "ট্রানজেকশন আইডি (TrxID)", payOnPage: "পরের ধাপে {method} পেজে পেমেন্ট করবেন",
    orderNote: "বিশেষ নির্দেশনা (ঐচ্ছিক)", giftMessage: "উপহার বার্তা (ঐচ্ছিক)", placeOrder: "অর্ডার করুন", placing: "অর্ডার হচ্ছে…",
    verifyPhone: "মোবাইল নম্বর যাচাই", sendCode: "কোড পাঠান", resend: "আবার পাঠান", enterCode: "৬ সংখ্যার কোড", verify: "যাচাই করুন", verified: "যাচাই হয়েছে ✓", verifyWhy: "ভুয়া অর্ডার ঠেকাতে ক্যাশ অন ডেলিভারির আগে নম্বর যাচাই করা হয়।", skipOtp: "SMS আসছে না? আমরা কল করে কনফার্ম করবো।",
    orderSummary: "অর্ডার সারাংশ", secureCheckout: "আপনার তথ্য নিরাপদ। কার্ডের তথ্য আমরা কখনো দেখি না।", registryShipNote: "",
    thankYou: "ধন্যবাদ! অর্ডারটি পেয়েছি", orderNumber: "অর্ডার নম্বর", invoice: "ইনভয়েস", downloadInvoice: "ইনভয়েস ডাউনলোড (PDF)", weWillCall: "অর্ডার কনফার্ম করতে আমরা শীঘ্রই আপনাকে কল করবো।", confirmedAuto: "আপনার অর্ডার কনফার্ম হয়েছে!",
    orderStatus: "অর্ডারের অবস্থা", trackOrder: "অর্ডার ট্র্যাক করুন", trackSub: "অর্ডার নম্বর ও মোবাইল নম্বর দিন", find: "খুঁজুন", courier: "কুরিয়ার", trackingId: "ট্র্যাকিং আইডি", trackWithCourier: "কুরিয়ারের সাইটে দেখুন",
    requestReturn: "রিটার্নের অনুরোধ", returnReason: "কারণ", reason_wrong_size: "ভুল সাইজ", reason_damaged: "ক্ষতিগ্রস্ত পণ্য", reason_wrong_item: "ভুল পণ্য এসেছে", reason_not_as_described: "বিবরণের সাথে মেলেনি", reason_changed_mind: "মত বদলেছি", reason_other: "অন্য কারণ", details: "বিস্তারিত", send: "পাঠান",
    rateProduct: "রেটিং দিন", yourReview: "আপনার অভিজ্ঞতা", yourName: "আপনার নাম", reviewThanks: "ধন্যবাদ! যাচাইয়ের পর রিভিউ দেখানো হবে।", verifiedPurchase: "যাচাইকৃত ক্রেতা",
    signIn: "সাইন ইন", register: "অ্যাকাউন্ট খুলুন", password: "পাসওয়ার্ড", forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?", signOut: "সাইন আউট", newHere: "নতুন? অ্যাকাউন্ট খুলুন", haveAccount: "অ্যাকাউন্ট আছে? সাইন ইন করুন", resetPassword: "পাসওয়ার্ড রিসেট", newPassword: "নতুন পাসওয়ার্ড", code: "কোড",
    myOrders: "আমার অর্ডার", addresses: "ঠিকানা", registries: "আমার রুটিন", returns: "রিটার্ন", referral: "বন্ধুকে রেফার করুন", profile: "প্রোফাইল", save: "সংরক্ষণ", saved: "সংরক্ষণ হয়েছে", cancel: "বাতিল", delete: "মুছুন", edit: "এডিট", addNew: "নতুন যোগ করুন",
    noOrders: "এখনো কোনো অর্ডার নেই।", label: "লেবেল", recipient: "প্রাপকের নাম", makeDefault: "ডিফল্ট ঠিকানা", defaultTag: "ডিফল্ট",
    copy: "কপি", copied: "কপি হয়েছে",
    referralHeadline: "বন্ধুকে ৳{friend} ছাড় দিন, আপনি পান ৳{reward}", referralSub: "বন্ধুর প্রথম অর্ডার (৳{min}+) ডেলিভারি হলেই আপনার রিওয়ার্ড কোড SMS এ আসবে।", yourCode: "আপনার কোড", uses: "ব্যবহার", rewards: "রিওয়ার্ড",
    giftFinderTitle: "স্কিন কুইজ", giftFinderSub: "তিনটি প্রশ্নের উত্তর দিন — আপনার ত্বক ও বাজেট অনুযায়ী স্টকে থাকা পণ্য দিয়ে সহজ রুটিন দেখাবো।", forWhom: "কার জন্য", who_wife: "স্ত্রী", who_mother: "মা", who_sister: "বোন", who_friend: "বান্ধবী", who_bride: "কনে", who_self: "নিজের জন্য", budget: "বাজেট (৳)", occasion: "মূল সমস্যা", anythingElse: "আর কিছু জানাতে চান? (ঐচ্ছিক)", showGifts: "আমার রুটিন দেখুন",
    notFound: "পেজটি পাওয়া যায়নি", backHome: "হোমে ফিরে যান", somethingWrong: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।", loading: "লোড হচ্ছে…", retry: "আবার চেষ্টা করুন",
    status_pending: "অপেক্ষমাণ", status_confirmation_attempted: "কনফার্মের অপেক্ষায়", status_confirmed: "কনফার্মড", status_packed: "প্যাক হয়েছে", status_shipped: "পাঠানো হয়েছে", status_delivered: "ডেলিভারি হয়েছে", status_cancelled: "বাতিল", status_refused: "ফেরত গেছে", status_returned: "রিটার্ন হয়েছে",
    pay_pending: "বাকি", pay_paid: "পরিশোধিত", pay_failed: "ব্যর্থ", pay_refunded: "ফেরত", pay_partially_refunded: "আংশিক ফেরত",
    installApp: "অ্যাপের মতো ব্যবহার করুন", enableUpdates: "অর্ডারের আপডেট নোটিফিকেশনে পান",
    quiz: "স্কিন কুইজ", treatments: "ট্রিটমেন্ট", routines: "রুটিন", book: "বুক করুন", shopByConcern: "সমস্যা অনুযায়ী কিনুন", skinTypes: "ত্বকের ধরন", concerns: "ত্বকের সমস্যা", skinType: "ত্বকের ধরন", concern: "সমস্যা", suitsAll: "সব ধরনের ত্বকের জন্য",
    ingredients: "সম্পূর্ণ উপাদান (INCI)", heroIngredients: "মূল উপাদান", howToUse: "যেভাবে ব্যবহার করবেন", patchTest: "প্যাচ টেস্ট: প্রথমবার ব্যবহারের আগে কানের পেছনে বা কবজির ভেতরে সামান্য লাগিয়ে ২৪ ঘণ্টা দেখুন। লালচে ভাব, চুলকানি বা জ্বালা হলে ব্যবহার করবেন না।",
    pao: "খোলার পর {n} মাসের মধ্যে ব্যবহার করুন", madeIn: "উৎপাদন: {c}", bestBefore: "মেয়াদ: {d} পর্যন্ত", bestBeforeNote: "যে ব্যাচ থেকে পাঠানো হবে তার মেয়াদ", packSize: "সাইজ", completeRoutine: "রুটিনটি সম্পূর্ণ করুন", step: "ধাপ {n}",
    routineStep_1: "পরিষ্কার", routineStep_2: "টোন", routineStep_3: "সিরাম / ট্রিটমেন্ট", routineStep_4: "ময়েশ্চারাইজ", routineStep_5: "সুরক্ষা (দিনে)", routineStep_6: "সাপ্তাহিক যত্ন", routineStep_0: "অতিরিক্ত যত্ন",
    am: "সকাল", pm: "রাত", both: "সকাল ও রাত", spotlight: "উপাদান পরিচিতি", shopSpotlight: "{i} আছে এমন পণ্য",
    quizStep1: "আপনার ত্বকের ধরন কী?", quizStep2: "সবচেয়ে বেশি কোন বিষয়ে যত্ন চান?", quizStep3: "আপনার বাজেট", quizSensitive: "আমার ত্বক সহজে লাল হয় বা জ্বালা করে", quizResult: "আপনার রুটিন", quizTotal: "রুটিনের মোট দাম", addRoutine: "পুরো রুটিন কার্টে নিন", retake: "আবার কুইজ দিন", quizNone: "এই বাজেটে মানানসই পণ্য পাওয়া যায়নি — বাজেট একটু বাড়িয়ে দেখুন।", next: "পরের ধাপ", back: "আগের ধাপ",
    skinHelp: "নিশ্চিত নন? সকালে মুখ ধোয়ার ১ ঘণ্টা পর দেখুন: পুরো মুখ চকচকে = তৈলাক্ত; টানটান বা খসখসে = শুষ্ক; শুধু কপাল-নাক চকচকে = মিশ্র; আরামদায়ক = স্বাভাবিক।",
    treatmentsTitle: "টাঙ্গাইল স্টুডিওতে ট্রিটমেন্ট", treatmentsSub: "অনলাইনে সময় বেছে নিন — আমরা কল করে কনফার্ম করবো। পেমেন্ট স্টুডিওতে।", minutes: "{n} মিনিট", from: "শুরু {price}", whatHappens: "কী কী হয়", suits: "কাদের জন্য", aftercare: "পরের যত্ন", bookThis: "এই ট্রিটমেন্ট বুক করুন", pickDate: "দিন বেছে নিন", pickTime: "সময় বেছে নিন", noSlots: "এই দিনে খালি সময় নেই — অন্য দিন দেখুন।", studioClosed: "এই দিন স্টুডিও বন্ধ।", yourDetails: "আপনার তথ্য", bookingNote: "কিছু জানাতে চান? (ঐচ্ছিক, যেমন ত্বকের অ্যালার্জি)", requestBooking: "বুকিং অনুরোধ পাঠান", booking: "বুকিং", bookingNo: "বুকিং নম্বর", bookingThanks: "ধন্যবাদ! বুকিং অনুরোধ পেয়েছি", bookingWeCall: "কনফার্ম করতে আমরা শীঘ্রই কল করবো। পেমেন্ট স্টুডিওতে।", payAtStudio: "পেমেন্ট স্টুডিওতে", myBookings: "আমার বুকিং", noBookings: "এখনো কোনো বুকিং নেই।", booking_requested: "অনুরোধ করা হয়েছে", booking_confirmed: "কনফার্মড", booking_completed: "সম্পন্ন", booking_cancelled: "বাতিল", booking_no_show: "আসেননি", studioAddress: "স্টুডিওর ঠিকানা", otherTreatments: "আরও ট্রিটমেন্ট", featuredTreatments: "স্টুডিও ট্রিটমেন্ট",
    myRoutine: "আমার রুটিন", myRoutineSub: "আপনি যে পণ্যগুলো কিনেছেন, রুটিনের ধাপ অনুযায়ী সাজানো।", noRoutine: "কেনাকাটার পর আপনার পণ্যগুলো এখানে রুটিন আকারে দেখাবে।", lastOrdered: "শেষ অর্ডার {d}", reorder: "আবার অর্ডার করুন",
    reviewSkin: "আপনার ত্বকের ধরন (ঐচ্ছিক)", allReviews: "সব রিভিউ", reviewsFor: "{s} ত্বকের রিভিউ", reason_expired: "মেয়াদ শেষ / প্রায় শেষ", reason_reaction: "ত্বকে মানায়নি",
  },
  en: {
    skipToContent: "Skip to content", search: "Search", searchPlaceholder: "Serum, sunscreen, niacinamide…", account: "Account", wishlist: "Wishlist", cart: "Cart",
    home: "Home", shop: "Shop", about: "About us", contact: "Contact", giftFinder: "Skin quiz", track: "Track order", registry: "Routine",
    shopByCategory: "Shop by category", shopByAge: "Shop by concern", collections: "Routine sets", shopTheSet: "See the routine", pieces: "{n} products", setPrice: "{price} together", customerPhotos: "Customer reviews", newArrivals: "New arrivals", bestSellers: "Best sellers", viewAll: "View all",
    giftingGuide: "Skin quiz", giftingGuideSub: "Tell us your skin type, main concern and budget — we will put together a simple routine for you.", findGift: "Start the quiz",
    happyParents: "What customers say", noReviewsYet: "Be the first to review — after your order arrives you can write one from the order page.",
    newsletter: "Get offers & new arrivals", newsletterSub: "1–2 messages a month. No spam.", subscribe: "Subscribe", emailOrPhone: "Email or mobile number",
    footerAbout: "A skincare shop and beauty studio in Tangail — cleansers, serums, sunscreen and facials chosen for your skin. Cash on Delivery across Bangladesh.", policies: "Policies", visitUs: "Visit us",
    returnsPolicy: "Returns & refunds", deliveryPolicy: "Delivery", privacyPolicy: "Privacy", sizeGuidePage: "Skin type guide", weAccept: "Ways to pay",
    chatWhatsApp: "Chat on WhatsApp", callUs: "Call us",
    filters: "Filters", clearAll: "Clear all", ageRange: "Skin type", occasions: "Skin type", materials: "Concern", weight: "Amount", grams: "{n} g", sizeGuide: "Skin type guide", ringSizeGuide: "Skin type guide", bangleSizeGuide: "Skin type guide", completeTheLook: "Complete your routine", giftWrap: "Gift box", giftWrapAdd: "Gift-box it — box, ribbon and a handwritten card (+{fee})", giftWrapNote: "Add a gift box (+{fee}) at checkout", zoomHint: "Tap the photo to zoom", imitationNote: "A cosmetic product, not a medicine. For a skin condition, please see a dermatologist.", category: "Category", brand: "Brand", price: "Price", min: "Min", max: "Max", apply: "Apply",
    inStockOnly: "In stock only", onSale: "On sale", sortBy: "Sort", sort_newest: "Newest", sort_price_asc: "Price: low to high", sort_price_desc: "Price: high to low", sort_popular: "Popular", sort_rating: "Rating",
    results: "{n} products", noResults: "Nothing found", noResultsSub: "Try fewer filters or a different word.", loadMore: "Show more", searchResultsFor: "Results for “{q}”",
    addToCart: "Add to cart", buyNow: "Buy now", added: "Added to cart", outOfStock: "Out of stock", inStock: "In stock", onlyLeft: "Only {n} left", chooseOption: "Choose an option",
    size: "Size", color: "Colour", qty: "Quantity", material: "Ingredients", care: "Good to know", description: "Description", reviews: "Reviews", writeReview: "Write a review", relatedProducts: "More like this", completeTheSet: "Goes well with",
    sizeChart: "Size chart", certified: "Verified test certificates", certNote: "We only show certifications we hold documents for.", validUntil: "Valid until", issuer: "Issued by",
    notifyMe: "Notify me when back", notifyMeSub: "Leave your mobile number — we'll SMS you as soon as it's back.", notifyDone: "We'll let you know as soon as it's back.", addToRegistry: "Add to routine", share: "Share",
    ages: "Skin types", allAges: "All skin types", codAvailable: "Cash on Delivery", deliveryIn: "Delivery in {eta}", easyReturns: "7-day returns on unopened items",
    yourCart: "Your cart", cartEmpty: "Your cart is empty. Let's find something for your skin!", continueShopping: "Continue shopping", subtotal: "Subtotal", discount: "Discount", delivery: "Delivery", total: "Total", vat: "VAT", vatIncluded: "Includes VAT ({rate}%)",
    free: "Free", freeDelivery: "Free delivery", deliveryAuto: "Delivery charge is calculated automatically for your area at checkout", deliveryAtCheckout: "Calculated when you choose your area", freeDeliveryCoupon: "coupon", freeDeliveryItems: "on these items", popupClose: "Close", proceedCheckout: "Checkout", viewCart: "View cart", remove: "Remove", coupon: "Coupon or referral code", applyCoupon: "Apply", couponApplied: "Code applied", freeOver: "Free delivery over ৳{n}",
    checkout: "Checkout", contactDetails: "Your details", fullName: "Full name", mobile: "Mobile number", email: "Email (optional)", deliveryAddress: "Delivery address",
    division: "Division", district: "District", upazila: "Upazila / Thana", area: "House, road, area", areaHint: "e.g. House 12, Road 3, Section 10", quickArea: "Search by postcode or area name", noAreaMatch: "No match", choose: "Choose",
    payment: "Payment", cod: "Cash on Delivery", codSub: "Pay when it arrives", card: "Card (Visa/Mastercard)", cardSub: "On the secure SSLCommerz page", mfsSend: "Send Money ৳{total} to our {method} ({type}) number: {number}", trxId: "Transaction ID (TrxID)", payOnPage: "You'll pay on the {method} page next",
    orderNote: "Delivery instructions (optional)", giftMessage: "Gift message (optional)", placeOrder: "Place order", placing: "Placing order…",
    verifyPhone: "Verify your mobile", sendCode: "Send code", resend: "Resend", enterCode: "6-digit code", verify: "Verify", verified: "Verified ✓", verifyWhy: "We verify numbers before Cash on Delivery to stop fake orders.", skipOtp: "No SMS? We'll call you to confirm instead.",
    orderSummary: "Order summary", secureCheckout: "Your details are safe. We never see card numbers.", registryShipNote: "",
    thankYou: "Thank you! We've got your order", orderNumber: "Order number", invoice: "Invoice", downloadInvoice: "Download invoice (PDF)", weWillCall: "We'll call you shortly to confirm your order.", confirmedAuto: "Your order is confirmed!",
    orderStatus: "Order status", trackOrder: "Track your order", trackSub: "Enter your order number and mobile number", find: "Find", courier: "Courier", trackingId: "Tracking ID", trackWithCourier: "Track on courier site",
    requestReturn: "Request a return", returnReason: "Reason", reason_wrong_size: "Wrong size", reason_damaged: "Damaged item", reason_wrong_item: "Wrong item sent", reason_not_as_described: "Not as described", reason_changed_mind: "Changed my mind", reason_other: "Other", details: "Details", send: "Send",
    rateProduct: "Your rating", yourReview: "Your experience", yourName: "Your name", reviewThanks: "Thank you! Your review will appear after a quick check.", verifiedPurchase: "Verified purchase",
    signIn: "Sign in", register: "Create account", password: "Password", forgotPassword: "Forgot password?", signOut: "Sign out", newHere: "New here? Create an account", haveAccount: "Have an account? Sign in", resetPassword: "Reset password", newPassword: "New password", code: "Code",
    myOrders: "My orders", addresses: "Addresses", registries: "My routine", returns: "Returns", referral: "Refer a friend", profile: "Profile", save: "Save", saved: "Saved", cancel: "Cancel", delete: "Delete", edit: "Edit", addNew: "Add new",
    noOrders: "No orders yet.", label: "Label", recipient: "Recipient name", makeDefault: "Default address", defaultTag: "Default",
    copy: "Copy", copied: "Copied",
    referralHeadline: "Give a friend ৳{friend} off, get ৳{reward}", referralSub: "When your friend's first order (৳{min}+) is delivered, your reward code arrives by SMS.", yourCode: "Your code", uses: "Uses", rewards: "Rewards",
    giftFinderTitle: "Skin quiz", giftFinderSub: "Answer three questions — we will build a simple routine from products in stock, for your skin and budget.", forWhom: "Who is it for", who_wife: "Wife", who_mother: "Mother", who_sister: "Sister", who_friend: "Friend", who_bride: "Bride", who_self: "Myself", budget: "Budget (৳)", occasion: "Main concern", anythingElse: "Anything else? (optional)", showGifts: "Show my routine",
    notFound: "Page not found", backHome: "Back to home", somethingWrong: "Something went wrong. Please try again.", loading: "Loading…", retry: "Try again",
    status_pending: "Pending", status_confirmation_attempted: "Awaiting confirmation", status_confirmed: "Confirmed", status_packed: "Packed", status_shipped: "Shipped", status_delivered: "Delivered", status_cancelled: "Cancelled", status_refused: "Returned to us", status_returned: "Returned",
    pay_pending: "Due", pay_paid: "Paid", pay_failed: "Failed", pay_refunded: "Refunded", pay_partially_refunded: "Partly refunded",
    installApp: "Use it like an app", enableUpdates: "Get order updates as notifications",
    quiz: "Skin quiz", treatments: "Treatments", routines: "Routines", book: "Book", shopByConcern: "Shop by concern", skinTypes: "Skin type", concerns: "Skin concern", skinType: "Skin type", concern: "Concern", suitsAll: "Suits all skin types",
    ingredients: "Full ingredients (INCI)", heroIngredients: "Key ingredients", howToUse: "How to use", patchTest: "Patch test first: apply a little behind your ear or on the inner wrist and wait 24 hours. Don't use it if you see redness, itching or stinging.",
    pao: "Use within {n} months of opening", madeIn: "Made in {c}", bestBefore: "Best before {d}", bestBeforeNote: "Expiry of the batch your order will be packed from", packSize: "Size", completeRoutine: "Complete your routine", step: "Step {n}",
    routineStep_1: "Cleanse", routineStep_2: "Tone", routineStep_3: "Serum / treat", routineStep_4: "Moisturise", routineStep_5: "Protect (daytime)", routineStep_6: "Weekly care", routineStep_0: "Extra care",
    am: "Morning", pm: "Night", both: "Morning & night", spotlight: "Ingredient spotlight", shopSpotlight: "Products with {i}",
    quizStep1: "What's your skin type?", quizStep2: "What would you most like to care for?", quizStep3: "Your budget", quizSensitive: "My skin reddens or stings easily", quizResult: "Your routine", quizTotal: "Routine total", addRoutine: "Add the whole routine to cart", retake: "Take the quiz again", quizNone: "Nothing fits this budget yet — try a slightly higher budget.", next: "Next", back: "Back",
    skinHelp: "Not sure? Look an hour after washing in the morning: shiny all over = oily; tight or flaky = dry; shiny forehead and nose only = combination; comfortable = normal.",
    treatmentsTitle: "Treatments at our Tangail studio", treatmentsSub: "Pick a time online — we call to confirm. You pay at the studio.", minutes: "{n} min", from: "From {price}", whatHappens: "What happens", suits: "Who it suits", aftercare: "Aftercare", bookThis: "Book this treatment", pickDate: "Choose a day", pickTime: "Choose a time", noSlots: "No free times on this day — try another day.", studioClosed: "The studio is closed on this day.", yourDetails: "Your details", bookingNote: "Anything we should know? (optional, e.g. skin allergies)", requestBooking: "Send booking request", booking: "Booking", bookingNo: "Booking number", bookingThanks: "Thank you! We've got your booking request", bookingWeCall: "We'll call you shortly to confirm. You pay at the studio.", payAtStudio: "Pay at the studio", myBookings: "My bookings", noBookings: "No bookings yet.", booking_requested: "Requested", booking_confirmed: "Confirmed", booking_completed: "Completed", booking_cancelled: "Cancelled", booking_no_show: "Missed", studioAddress: "Studio address", otherTreatments: "More treatments", featuredTreatments: "Studio treatments",
    myRoutine: "My routine", myRoutineSub: "The products you've bought, arranged by routine step.", noRoutine: "After you shop, your products will appear here as a routine.", lastOrdered: "Last ordered {d}", reorder: "Order again",
    reviewSkin: "Your skin type (optional)", allReviews: "All reviews", reviewsFor: "Reviews from {s} skin", reason_expired: "Expired / close to expiry", reason_reaction: "Didn't suit my skin",
  },
};

const KEY = "sgs_lang";
export function lang() {
  try {
    const q = __shopDemo.virtual().searchParams.get("lang");
    if (q === "en" || q === "bn") return q;
    const v = localStorage.getItem(KEY);
    if (v === "en" || v === "bn") return v;
  } catch { /* storage blocked */ }
  return document.documentElement.getAttribute("data-default-lang") === "en" ? "en" : "bn";
}
export function setLang(l) {
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  document.cookie = `sgs_lang=${l}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = l;
}
export function t(key, vars = {}) {
  const s = STR[lang()][key] ?? STR.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}
/** Picks the bilingual field: L(product, "name") → product.name_bn / name_en. */
export const L = (obj, field) => (obj ? (lang() === "bn" ? obj[`${field}_bn`] || obj[`${field}_en`] : obj[`${field}_en`] || obj[`${field}_bn`]) ?? "" : "");
/** Picks from {en, bn}. */
export const tt = (o) => (o ? (lang() === "bn" ? o.bn || o.en : o.en || o.bn) : "");

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const digits = (s) => (lang() === "bn" ? String(s).replace(/\d/g, (d) => BN_DIGITS[d]) : String(s));
export const num = (n) => digits(Number(n ?? 0).toLocaleString("en-IN"));
export const money = (n) => `৳${num(n)}`;
export const date = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(lang() === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
};

/** Applies data-i18n / data-i18n-placeholder / data-i18n-label attributes in static HTML. */
export function applyStatic(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => el.setAttribute("placeholder", t(el.dataset.i18nPlaceholder)));
  root.querySelectorAll("[data-i18n-label]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nLabel)));
}
