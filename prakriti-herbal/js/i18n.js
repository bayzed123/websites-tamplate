// Bilingual strings (Bangla default, English toggle). Plain, friendly language throughout.
const STR = {
  bn: {
    skipToContent: "মূল অংশে যান", search: "খুঁজুন", searchPlaceholder: "অশ্বগন্ধা, তুলসী চা, নারকেল তেল…", account: "অ্যাকাউন্ট", wishlist: "পছন্দের তালিকা", cart: "কার্ট",
    home: "হোম", shop: "শপ", about: "আমাদের কথা", contact: "যোগাযোগ", giftFinder: "কিট বিল্ডার", track: "অর্ডার ট্র্যাক", registry: "আবার কিনুন",
    shopByCategory: "ক্যাটাগরি অনুযায়ী কিনুন", shopByAge: "প্রয়োজন অনুযায়ী কিনুন", collections: "সংগ্রহ", shopTheSet: "সংগ্রহটি দেখুন", pieces: "{n}টি পণ্য", setPrice: "সব মিলিয়ে {price}", customerPhotos: "ক্রেতাদের রিভিউ", newArrivals: "নতুন এসেছে", bestSellers: "সবচেয়ে বেশি বিক্রি", viewAll: "সব দেখুন",
    giftingGuide: "নিজের ওয়েলনেস কিট বানান", giftingGuideSub: "কোন বিষয়ে সহায়তা চান আর বাজেট কত বলুন — প্রতিটি তাক থেকে একটি করে মানানসই পণ্য সাজিয়ে দেবো।", findGift: "কিট বানান",
    happyParents: "ক্রেতারা যা বলছেন", noReviewsYet: "প্রথম রিভিউ আপনিই দিন — কেনার পর অর্ডার পেজ থেকে রিভিউ লিখতে পারবেন।",
    newsletter: "অফার ও নতুন পণ্যের খবর পান", newsletterSub: "মাসে ১–২টি মেসেজ, স্প্যাম নয়।", subscribe: "সাবস্ক্রাইব", emailOrPhone: "ইমেইল বা মোবাইল নম্বর",
    footerAbout: "ঢাকার হারবাল ও প্রাকৃতিক পণ্যের দোকান — হারবাল তেল, আয়ুর্বেদিক সাপ্লিমেন্ট, প্রাকৃতিক চা, হাতে তৈরি সাবান ও ঐতিহ্যবাহী উপকরণ। ব্যাচ অনুযায়ী ট্র্যাক করা, সৎভাবে লেবেল করা। সারা দেশে ক্যাশ অন ডেলিভারি।", policies: "নীতিমালা", visitUs: "আমাদের ঠিকানা",
    returnsPolicy: "রিটার্ন ও রিফান্ড", deliveryPolicy: "ডেলিভারি", privacyPolicy: "গোপনীয়তা", weAccept: "যেভাবে পেমেন্ট করবেন",
    chatWhatsApp: "হোয়াটসঅ্যাপে চ্যাট", callUs: "কল করুন",
    filters: "ফিল্টার", clearAll: "সব মুছুন", ageRange: "প্রয়োজন", occasions: "প্রয়োজন", materials: "প্রয়োজন", weight: "পরিমাণ", grams: "{n} গ্রাম", completeTheLook: "একসাথে ভালো যায়", giftWrap: "গিফট বক্স", giftWrapAdd: "গিফট বক্সে দিন — বক্স, রিবন ও হাতে লেখা কার্ড (+{fee})", giftWrapNote: "চেকআউটে গিফট বক্স (+{fee}) যোগ করতে পারবেন", zoomHint: "বড় করে দেখতে ছবিতে চাপুন", category: "ক্যাটাগরি", brand: "ব্র্যান্ড", price: "দাম", min: "সর্বনিম্ন", max: "সর্বোচ্চ", apply: "প্রয়োগ করুন",
    inStockOnly: "শুধু স্টকে আছে", onSale: "ছাড়ে", sortBy: "সাজান", sort_newest: "নতুন আগে", sort_price_asc: "দাম: কম থেকে বেশি", sort_price_desc: "দাম: বেশি থেকে কম", sort_popular: "জনপ্রিয়", sort_rating: "রেটিং",
    results: "{n}টি পণ্য", noResults: "কিছু পাওয়া যায়নি", noResultsSub: "ফিল্টার কমিয়ে বা অন্য শব্দে খুঁজে দেখুন।", loadMore: "আরও দেখুন", searchResultsFor: "“{q}” এর ফলাফল",
    addToCart: "কার্টে যোগ করুন", buyNow: "এখনই কিনুন", added: "কার্টে যোগ হয়েছে", outOfStock: "স্টক শেষ", inStock: "স্টকে আছে", onlyLeft: "মাত্র {n}টি বাকি", chooseOption: "একটি অপশন বেছে নিন",
    size: "সাইজ", color: "রং", qty: "পরিমাণ", material: "উপাদান", care: "জেনে রাখুন", description: "বিবরণ", reviews: "রিভিউ", writeReview: "রিভিউ লিখুন", relatedProducts: "এ ধরনের আরও", completeTheSet: "সাথে ভালো যায়",
    sizeChart: "সাইজ চার্ট", certified: "সার্টিফিকেশন", certNote: "শুধু যে সার্টিফিকেশনের প্রমাণ (ডকুমেন্ট) আমাদের কাছে আছে, সেগুলোই দেখানো হয়।", validUntil: "মেয়াদ", issuer: "প্রদানকারী",
    notifyMe: "স্টকে এলে জানান", notifyMeSub: "মোবাইল নম্বর দিন — স্টকে এলেই SMS পাবেন।", notifyDone: "স্টকে এলেই আপনাকে জানাবো।", share: "শেয়ার",
    ages: "প্রয়োজন", allAges: "সবার জন্য", codAvailable: "ক্যাশ অন ডেলিভারি", deliveryIn: "ডেলিভারি {eta}", easyReturns: "না খোলা, সিল করা পণ্য ৭ দিনে রিটার্ন",
    yourCart: "আপনার কার্ট", cartEmpty: "কার্ট খালি। চলুন প্রকৃতি থেকে কিছু বেছে নিই!", continueShopping: "কেনাকাটা চালিয়ে যান", subtotal: "সাবটোটাল", discount: "ছাড়", delivery: "ডেলিভারি চার্জ", total: "মোট", vat: "ভ্যাট", vatIncluded: "ভ্যাট ({rate}%) অন্তর্ভুক্ত",
    free: "ফ্রি", freeDelivery: "ফ্রি ডেলিভারি", deliveryAuto: "ডেলিভারি চার্জ আপনার এলাকা অনুযায়ী চেকআউটে অটো হিসাব হবে", deliveryAtCheckout: "এলাকা বেছে নিলে হিসাব হবে", freeDeliveryCoupon: "কুপন", freeDeliveryItems: "এই পণ্যগুলোতে", popupClose: "বন্ধ করুন", proceedCheckout: "চেকআউট করুন", viewCart: "কার্ট দেখুন", remove: "সরান", coupon: "কুপন বা রেফারেল কোড", applyCoupon: "প্রয়োগ", couponApplied: "কোড প্রয়োগ হয়েছে", freeOver: "৳{n}+ অর্ডারে ফ্রি ডেলিভারি",
    checkout: "চেকআউট", contactDetails: "আপনার তথ্য", fullName: "পুরো নাম", mobile: "মোবাইল নম্বর", email: "ইমেইল (ঐচ্ছিক)", deliveryAddress: "ডেলিভারি ঠিকানা",
    division: "বিভাগ", district: "জেলা", upazila: "উপজেলা / থানা", area: "বাড়ি, রোড, এলাকা", areaHint: "যেমন: বাড়ি ১২, রোড ৩, সেকশন ১০", quickArea: "পোস্টকোড বা এলাকার নাম দিয়ে খুঁজুন", noAreaMatch: "মিল পাওয়া যায়নি", choose: "বেছে নিন",
    payment: "পেমেন্ট", cod: "ক্যাশ অন ডেলিভারি", codSub: "পণ্য হাতে পেয়ে টাকা দিন", card: "কার্ড (ভিসা/মাস্টারকার্ড)", cardSub: "নিরাপদ SSLCommerz পেজে", mfsSend: "{method} ({type}) নম্বরে ৳{total} Send Money করুন: {number}", trxId: "ট্রানজেকশন আইডি (TrxID)", payOnPage: "পরের ধাপে {method} পেজে পেমেন্ট করবেন",
    orderNote: "বিশেষ নির্দেশনা (ঐচ্ছিক)", giftMessage: "উপহার বার্তা (ঐচ্ছিক)", placeOrder: "অর্ডার করুন", placing: "অর্ডার হচ্ছে…",
    verifyPhone: "মোবাইল নম্বর যাচাই", sendCode: "কোড পাঠান", resend: "আবার পাঠান", enterCode: "৬ সংখ্যার কোড", verify: "যাচাই করুন", verified: "যাচাই হয়েছে ✓", verifyWhy: "ভুয়া অর্ডার ঠেকাতে ক্যাশ অন ডেলিভারির আগে নম্বর যাচাই করা হয়।", skipOtp: "SMS আসছে না? আমরা কল করে কনফার্ম করবো।",
    orderSummary: "অর্ডার সারাংশ", secureCheckout: "আপনার তথ্য নিরাপদ। কার্ডের তথ্য আমরা কখনো দেখি না।", registryShipNote: "",
    thankYou: "ধন্যবাদ! অর্ডারটি পেয়েছি", orderNumber: "অর্ডার নম্বর", invoice: "ইনভয়েস", downloadInvoice: "ইনভয়েস ডাউনলোড (PDF)", weWillCall: "অর্ডার কনফার্ম করতে আমরা শীঘ্রই আপনাকে কল করবো।", confirmedAuto: "আপনার অর্ডার কনফার্ম হয়েছে!",
    orderStatus: "অর্ডারের অবস্থা", trackOrder: "অর্ডার ট্র্যাক করুন", trackSub: "অর্ডার নম্বর ও মোবাইল নম্বর দিন", find: "খুঁজুন", courier: "কুরিয়ার", trackingId: "ট্র্যাকিং আইডি", trackWithCourier: "কুরিয়ারের সাইটে দেখুন",
    requestReturn: "রিটার্নের অনুরোধ", returnReason: "কারণ", reason_damaged: "ক্ষতিগ্রস্ত পণ্য", reason_wrong_item: "ভুল পণ্য এসেছে", reason_not_as_described: "বিবরণের সাথে মেলেনি", reason_changed_mind: "মত বদলেছি", reason_other: "অন্য কারণ", details: "বিস্তারিত", send: "পাঠান",
    rateProduct: "রেটিং দিন", yourReview: "আপনার অভিজ্ঞতা", yourName: "আপনার নাম", reviewThanks: "ধন্যবাদ! যাচাইয়ের পর রিভিউ দেখানো হবে।", verifiedPurchase: "যাচাইকৃত ক্রেতা",
    signIn: "সাইন ইন", register: "অ্যাকাউন্ট খুলুন", password: "পাসওয়ার্ড", forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?", signOut: "সাইন আউট", newHere: "নতুন? অ্যাকাউন্ট খুলুন", haveAccount: "অ্যাকাউন্ট আছে? সাইন ইন করুন", resetPassword: "পাসওয়ার্ড রিসেট", newPassword: "নতুন পাসওয়ার্ড", code: "কোড",
    myOrders: "আমার অর্ডার", addresses: "ঠিকানা", registries: "আবার কিনুন", returns: "রিটার্ন", referral: "বন্ধুকে রেফার করুন", profile: "প্রোফাইল", save: "সংরক্ষণ", saved: "সংরক্ষণ হয়েছে", cancel: "বাতিল", delete: "মুছুন", edit: "এডিট", addNew: "নতুন যোগ করুন",
    noOrders: "এখনো কোনো অর্ডার নেই।", label: "লেবেল", recipient: "প্রাপকের নাম", makeDefault: "ডিফল্ট ঠিকানা", defaultTag: "ডিফল্ট",
    copy: "কপি", copied: "কপি হয়েছে",
    referralHeadline: "বন্ধুকে ৳{friend} ছাড় দিন, আপনি পান ৳{reward}", referralSub: "বন্ধুর প্রথম অর্ডার (৳{min}+) ডেলিভারি হলেই আপনার রিওয়ার্ড কোড SMS এ আসবে।", yourCode: "আপনার কোড", uses: "ব্যবহার", rewards: "রিওয়ার্ড",
    giftFinderTitle: "ওয়েলনেস কিট বিল্ডার", giftFinderSub: "দুটি প্রশ্নের উত্তর দিন — স্টকে থাকা পণ্য থেকে আপনার বাজেটে একটি ছোট কিট সাজিয়ে দেবো।", budget: "বাজেট (৳)", occasion: "প্রয়োজন", anythingElse: "আর কিছু জানাতে চান? (ঐচ্ছিক)", showGifts: "আমার কিট দেখুন",
    notFound: "পেজটি পাওয়া যায়নি", backHome: "হোমে ফিরে যান", somethingWrong: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।", loading: "লোড হচ্ছে…", retry: "আবার চেষ্টা করুন",
    status_pending: "অপেক্ষমাণ", status_confirmation_attempted: "কনফার্মের অপেক্ষায়", status_confirmed: "কনফার্মড", status_packed: "প্যাক হয়েছে", status_shipped: "পাঠানো হয়েছে", status_delivered: "ডেলিভারি হয়েছে", status_cancelled: "বাতিল", status_refused: "ফেরত গেছে", status_returned: "রিটার্ন হয়েছে",
    pay_pending: "বাকি", pay_paid: "পরিশোধিত", pay_failed: "ব্যর্থ", pay_refunded: "ফেরত", pay_partially_refunded: "আংশিক ফেরত",
    installApp: "অ্যাপের মতো ব্যবহার করুন", enableUpdates: "অর্ডারের আপডেট নোটিফিকেশনে পান",
    quiz: "কিট বিল্ডার", routines: "সংগ্রহ", shopByConcern: "প্রয়োজন অনুযায়ী কিনুন", concerns: "প্রয়োজন", concern: "প্রয়োজন", suitsAll: "সবার জন্য",
    ingredients: "সম্পূর্ণ উপাদান / কম্পোজিশন", heroIngredients: "মূল ভেষজ", howToUse: "যেভাবে ব্যবহার করবেন", 
    pao: "খোলার পর {n} মাসের মধ্যে ব্যবহার করুন", madeIn: "উৎস: {c}", bestBefore: "মেয়াদ: {d} পর্যন্ত", bestBeforeNote: "যে ব্যাচ থেকে পাঠানো হবে তার মেয়াদ", packSize: "পরিমাণ / সাইজ", 
    spotlight: "ভেষজ পরিচিতি", shopSpotlight: "{i} আছে এমন পণ্য",
    quizStep1: "কোন বিষয়ে সহায়তা চান?", quizStep2: "আপনার বাজেট", quizResult: "আপনার ওয়েলনেস কিট", quizTotal: "কিটের মোট দাম", addRoutine: "পুরো কিট কার্টে নিন", retake: "আবার শুরু করুন", quizNone: "এই বাজেটে মানানসই পণ্য পাওয়া যায়নি — বাজেট একটু বাড়িয়ে দেখুন।", next: "পরের ধাপ", back: "আগের ধাপ",
    myRoutine: "আবার কিনুন", myRoutineSub: "আপনি যে পণ্যগুলো আগে কিনেছেন — এক চাপে আবার অর্ডার করুন।", noRoutine: "কেনাকাটার পর আপনার পণ্যগুলো এখানে দেখাবে, সহজে আবার কেনার জন্য।", lastOrdered: "শেষ অর্ডার {d}", reorder: "আবার অর্ডার করুন",
    reason_expired: "মেয়াদ শেষ / প্রায় শেষ", reason_reaction: "মানায়নি / অস্বস্তি হয়েছে",
    timesOrdered: "{n} বার কিনেছেন", kits: "ওয়েলনেস কিট", kit: "কিট", allKits: "সব কিট", kitsSub: "একসাথে প্যাক করা পণ্য — আলাদা কেনার চেয়ে কম দামে।", kitContains: "এই কিটে আছে",
    kitSeparate: "আলাদা কিনলে {price}", kitSave: "কিটে সাশ্রয় {price}", inKits: "এই কিটগুলোতেও আছে", readyKits: "তৈরি কিট", journal: "জার্নাল", journalTitle: "ওয়েলনেস জার্নাল",
    journalSub: "ভেষজ, ঐতিহ্য আর প্রতিদিনের সুস্থ অভ্যাস নিয়ে সহজ লেখা।", readMore: "পড়ুন", byAuthor: "লিখেছেন {a}", productsInPost: "এই লেখায় যে পণ্যগুলোর কথা আছে",
    noPosts: "শীঘ্রই নতুন লেখা আসছে।", traditionalUse: "ঐতিহ্যগত ব্যবহার", disclaimerTitle: "গুরুত্বপূর্ণ সতর্কতা",
    safeUse: "প্রথমবার অল্প পরিমাণে ব্যবহার করে দেখুন। অস্বস্তি হলে ব্যবহার বন্ধ করুন। শিশুদের নাগালের বাইরে রাখুন।", certificationsTitle: "আমাদের সার্টিফিকেশন",
    certificationsSub: "যে সনদের প্রমাণ আমাদের কাছে আছে, শুধু সেগুলোই।", ourStory: "আমাদের গল্প", storyTitle: "মাটি থেকে বোতলে — সৎভাবে",
    storyBody: "আমরা দেশের কৃষক ও ছোট উৎপাদকদের কাছ থেকে ভেষজ সংগ্রহ করি, প্রতিটি ব্যাচের নম্বর ও মেয়াদ লিখে রাখি, আর লেবেলে যা আছে ঠিক তা-ই বলি। কোনো অলৌকিক দাবি নয় — শুধু ঐতিহ্যগত ব্যবহারের সৎ তথ্য।",
    sourcing: "উৎস ও সংগ্রহ", batchTracked: "প্রতিটি ব্যাচ ট্র্যাক করা", honestLabels: "সৎ লেবেল, কোনো চিকিৎসা-দাবি নয়", naturalFirst: "প্রকৃতি থেকে, যত্নে বাছাই",
    goesWellWith: "একসাথে ভালো যায়", kitBuilderTeaser: "কোথা থেকে শুরু করবেন বুঝতে পারছেন না?", concernTitle: "প্রয়োজন অনুযায়ী", kitOnly: "শুধু কিট", productType: "ধরন",
    singleProducts: "একক পণ্য",
  },
  en: {
    skipToContent: "Skip to content", search: "Search", searchPlaceholder: "Ashwagandha, tulsi tea, coconut oil…", account: "Account", wishlist: "Wishlist", cart: "Cart",
    home: "Home", shop: "Shop", about: "About us", contact: "Contact", giftFinder: "Kit builder", track: "Track order", registry: "Buy again",
    shopByCategory: "Shop by category", shopByAge: "Shop by need", collections: "Collections", shopTheSet: "See the collection", pieces: "{n} products", setPrice: "{price} together", customerPhotos: "Customer reviews", newArrivals: "New arrivals", bestSellers: "Best sellers", viewAll: "View all",
    giftingGuide: "Build your wellness kit", giftingGuideSub: "Tell us what you'd like support with and your budget — we'll pick one suitable product from each shelf.", findGift: "Build a kit",
    happyParents: "What customers say", noReviewsYet: "Be the first to review — after your order arrives you can write one from the order page.",
    newsletter: "Get offers & new arrivals", newsletterSub: "1–2 messages a month. No spam.", subscribe: "Subscribe", emailOrPhone: "Email or mobile number",
    footerAbout: "A herbal and natural products shop in Dhaka — herbal oils, ayurvedic supplements, natural teas, handmade soaps and traditional remedies. Batch-tracked and honestly labelled. Cash on Delivery across Bangladesh.", policies: "Policies", visitUs: "Visit us",
    returnsPolicy: "Returns & refunds", deliveryPolicy: "Delivery", privacyPolicy: "Privacy", weAccept: "Ways to pay",
    chatWhatsApp: "Chat on WhatsApp", callUs: "Call us",
    filters: "Filters", clearAll: "Clear all", ageRange: "Need", occasions: "Need", materials: "Need", weight: "Amount", grams: "{n} g", completeTheLook: "Goes well with", giftWrap: "Gift box", giftWrapAdd: "Gift-box it — box, ribbon and a handwritten card (+{fee})", giftWrapNote: "Add a gift box (+{fee}) at checkout", zoomHint: "Tap the photo to zoom", category: "Category", brand: "Brand", price: "Price", min: "Min", max: "Max", apply: "Apply",
    inStockOnly: "In stock only", onSale: "On sale", sortBy: "Sort", sort_newest: "Newest", sort_price_asc: "Price: low to high", sort_price_desc: "Price: high to low", sort_popular: "Popular", sort_rating: "Rating",
    results: "{n} products", noResults: "Nothing found", noResultsSub: "Try fewer filters or a different word.", loadMore: "Show more", searchResultsFor: "Results for “{q}”",
    addToCart: "Add to cart", buyNow: "Buy now", added: "Added to cart", outOfStock: "Out of stock", inStock: "In stock", onlyLeft: "Only {n} left", chooseOption: "Choose an option",
    size: "Size", color: "Colour", qty: "Quantity", material: "Ingredients", care: "Good to know", description: "Description", reviews: "Reviews", writeReview: "Write a review", relatedProducts: "More like this", completeTheSet: "Goes well with",
    sizeChart: "Size chart", certified: "Certifications", certNote: "We only show certifications we hold documents for.", validUntil: "Valid until", issuer: "Issued by",
    notifyMe: "Notify me when back", notifyMeSub: "Leave your mobile number — we'll SMS you as soon as it's back.", notifyDone: "We'll let you know as soon as it's back.", share: "Share",
    ages: "Needs", allAges: "For everyone", codAvailable: "Cash on Delivery", deliveryIn: "Delivery in {eta}", easyReturns: "7-day returns on unopened, sealed items",
    yourCart: "Your cart", cartEmpty: "Your cart is empty. Let's pick something from nature!", continueShopping: "Continue shopping", subtotal: "Subtotal", discount: "Discount", delivery: "Delivery", total: "Total", vat: "VAT", vatIncluded: "Includes VAT ({rate}%)",
    free: "Free", freeDelivery: "Free delivery", deliveryAuto: "Delivery charge is calculated automatically for your area at checkout", deliveryAtCheckout: "Calculated when you choose your area", freeDeliveryCoupon: "coupon", freeDeliveryItems: "on these items", popupClose: "Close", proceedCheckout: "Checkout", viewCart: "View cart", remove: "Remove", coupon: "Coupon or referral code", applyCoupon: "Apply", couponApplied: "Code applied", freeOver: "Free delivery over ৳{n}",
    checkout: "Checkout", contactDetails: "Your details", fullName: "Full name", mobile: "Mobile number", email: "Email (optional)", deliveryAddress: "Delivery address",
    division: "Division", district: "District", upazila: "Upazila / Thana", area: "House, road, area", areaHint: "e.g. House 12, Road 3, Section 10", quickArea: "Search by postcode or area name", noAreaMatch: "No match", choose: "Choose",
    payment: "Payment", cod: "Cash on Delivery", codSub: "Pay when it arrives", card: "Card (Visa/Mastercard)", cardSub: "On the secure SSLCommerz page", mfsSend: "Send Money ৳{total} to our {method} ({type}) number: {number}", trxId: "Transaction ID (TrxID)", payOnPage: "You'll pay on the {method} page next",
    orderNote: "Delivery instructions (optional)", giftMessage: "Gift message (optional)", placeOrder: "Place order", placing: "Placing order…",
    verifyPhone: "Verify your mobile", sendCode: "Send code", resend: "Resend", enterCode: "6-digit code", verify: "Verify", verified: "Verified ✓", verifyWhy: "We verify numbers before Cash on Delivery to stop fake orders.", skipOtp: "No SMS? We'll call you to confirm instead.",
    orderSummary: "Order summary", secureCheckout: "Your details are safe. We never see card numbers.", registryShipNote: "",
    thankYou: "Thank you! We've got your order", orderNumber: "Order number", invoice: "Invoice", downloadInvoice: "Download invoice (PDF)", weWillCall: "We'll call you shortly to confirm your order.", confirmedAuto: "Your order is confirmed!",
    orderStatus: "Order status", trackOrder: "Track your order", trackSub: "Enter your order number and mobile number", find: "Find", courier: "Courier", trackingId: "Tracking ID", trackWithCourier: "Track on courier site",
    requestReturn: "Request a return", returnReason: "Reason", reason_damaged: "Damaged item", reason_wrong_item: "Wrong item sent", reason_not_as_described: "Not as described", reason_changed_mind: "Changed my mind", reason_other: "Other", details: "Details", send: "Send",
    rateProduct: "Your rating", yourReview: "Your experience", yourName: "Your name", reviewThanks: "Thank you! Your review will appear after a quick check.", verifiedPurchase: "Verified purchase",
    signIn: "Sign in", register: "Create account", password: "Password", forgotPassword: "Forgot password?", signOut: "Sign out", newHere: "New here? Create an account", haveAccount: "Have an account? Sign in", resetPassword: "Reset password", newPassword: "New password", code: "Code",
    myOrders: "My orders", addresses: "Addresses", registries: "Buy again", returns: "Returns", referral: "Refer a friend", profile: "Profile", save: "Save", saved: "Saved", cancel: "Cancel", delete: "Delete", edit: "Edit", addNew: "Add new",
    noOrders: "No orders yet.", label: "Label", recipient: "Recipient name", makeDefault: "Default address", defaultTag: "Default",
    copy: "Copy", copied: "Copied",
    referralHeadline: "Give a friend ৳{friend} off, get ৳{reward}", referralSub: "When your friend's first order (৳{min}+) is delivered, your reward code arrives by SMS.", yourCode: "Your code", uses: "Uses", rewards: "Rewards",
    giftFinderTitle: "Wellness kit builder", giftFinderSub: "Answer two questions — we'll put together a small kit from products in stock, within your budget.", budget: "Budget (৳)", occasion: "Need", anythingElse: "Anything else? (optional)", showGifts: "Show my kit",
    notFound: "Page not found", backHome: "Back to home", somethingWrong: "Something went wrong. Please try again.", loading: "Loading…", retry: "Try again",
    status_pending: "Pending", status_confirmation_attempted: "Awaiting confirmation", status_confirmed: "Confirmed", status_packed: "Packed", status_shipped: "Shipped", status_delivered: "Delivered", status_cancelled: "Cancelled", status_refused: "Returned to us", status_returned: "Returned",
    pay_pending: "Due", pay_paid: "Paid", pay_failed: "Failed", pay_refunded: "Refunded", pay_partially_refunded: "Partly refunded",
    installApp: "Use it like an app", enableUpdates: "Get order updates as notifications",
    quiz: "Kit builder", routines: "Collections", shopByConcern: "Shop by need", concerns: "Need", concern: "Need", suitsAll: "For everyone",
    ingredients: "Full ingredients / composition", heroIngredients: "Key herbs", howToUse: "How to use", 
    pao: "Use within {n} months of opening", madeIn: "Sourced from {c}", bestBefore: "Best before {d}", bestBeforeNote: "Expiry of the batch your order will be packed from", packSize: "Size / weight", 
    spotlight: "Herb spotlight", shopSpotlight: "Products with {i}",
    quizStep1: "What would you like support with?", quizStep2: "Your budget", quizResult: "Your wellness kit", quizTotal: "Kit total", addRoutine: "Add the whole kit to cart", retake: "Start again", quizNone: "Nothing suitable within this budget — try a slightly higher one.", next: "Next", back: "Back",
    myRoutine: "Buy again", myRoutineSub: "Products you've bought before — reorder in one tap.", noRoutine: "After you shop, your products will appear here so you can reorder easily.", lastOrdered: "Last ordered {d}", reorder: "Order again",
    reason_expired: "Expired / close to expiry", reason_reaction: "Didn't suit me",
    timesOrdered: "Bought {n} times", kits: "Wellness kits", kit: "Kit", allKits: "All kits", kitsSub: "Products packed together — for less than buying them separately.",
    kitContains: "What's in this kit", kitSeparate: "{price} if bought separately", kitSave: "You save {price} with the kit", inKits: "Also in these kits",
    readyKits: "Ready-made kits", journal: "Journal", journalTitle: "Wellness journal", journalSub: "Simple reads on herbs, traditions and everyday wellbeing.", readMore: "Read",
    byAuthor: "By {a}", productsInPost: "Products in this article", noPosts: "New articles coming soon.", traditionalUse: "Traditional use", disclaimerTitle: "Important",
    safeUse: "Try a small amount first. Stop using it if you feel any discomfort. Keep out of reach of children.", certificationsTitle: "Our certifications",
    certificationsSub: "Only the ones we hold documents for.", ourStory: "Our story", storyTitle: "From the soil to the bottle — honestly",
    storyBody: "We source herbs from Bangladeshi farmers and small makers, record every batch number and expiry date, and say exactly what's on the label. No miracle claims — just honest information about traditional use.",
    sourcing: "Sourcing", batchTracked: "Every batch tracked", honestLabels: "Honest labels, no medical claims", naturalFirst: "From nature, chosen with care",
    goesWellWith: "Goes well with", kitBuilderTeaser: "Not sure where to start?", concernTitle: "By need", kitOnly: "Kits only", productType: "Type",
    singleProducts: "Single products",
  },
};

const KEY = "pkh_lang";
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
  document.cookie = `pkh_lang=${l}; path=/; max-age=31536000; samesite=lax`;
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
