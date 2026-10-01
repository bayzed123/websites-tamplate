// Admin copy — plain language for a non-technical team. Bangla default, English toggle.
const dict = {
  en: {
    dashboard: "Dashboard", orders: "Orders", products: "Products", categories: "Categories", customers: "Customers", coupons: "Coupons & discounts",
    inventory: "Inventory & stock", banners: "Banners & logo", reviews: "Reviews", staff: "Staff & roles", reports: "Reports", settings: "Settings",
    zones: "Delivery zones", audit: "Activity log", help: "Help center", catalog: "Catalogue", sales: "Sales", marketing: "Marketing", system: "System",
    collapse: "Collapse menu", search: "Search invoice no, phone, name, SKU…", invoiceNo: "Invoice no", orderNo: "Order no", profile: "Profile settings", signOut: "Sign out", notifications: "Notifications",
    onlineNow: "Online now", onlyYou: "Only you are online.", newOrders: "New orders", lowStock: "Low stock", pendingReviews: "Reviews waiting",
    nothingNew: "Nothing new right now.",
    todayOrders: "Today's orders", todayRevenue: "Today's sales", monthRevenue: "This month's sales", pendingCod: "Waiting for confirmation", lowStockItems: "Low-stock items", newCustomers: "New customers (7 days)",
    vsYesterday: "vs yesterday", vsLastMonth: "vs last month", vsLastWeek: "vs last week", ofVariants: "of {n} variants", codCount: "{n} are Cash on Delivery",
    salesChart: "Monthly sales", recentOrders: "Recent orders", topProducts: "Top sellers (30 days)", viewAll: "View all", orderMix: "Last 30 days by status",
    add: "Add new", edit: "Edit", delete: "Delete", restore: "Restore", deleteForever: "Delete forever", save: "Save", cancel: "Cancel", close: "Close", yes: "Yes", back: "Back",
    saving: "Saving…", confirmDelete: "Move \"{name}\" to Trash? You can restore it later.", confirmPurge: "Delete \"{name}\" forever? This cannot be undone.",
    active: "Active", trash: "Trash", all: "All", searchPlaceholder: "Search…", noItems: "Nothing here yet.", noItemsSub: "Items you add will show up here.",
    loadError: "Couldn't load. Check the internet and try again.", retry: "Try again", prev: "Previous", next: "Next", pageOf: "Page {p} of {n}",
    actions: "Actions", status: "Status", date: "Date", total: "Total", customer: "Customer", phone: "Phone", payment: "Payment", items: "Items", courier: "Courier", tracking: "Tracking ID",
    s_pending: "Pending", s_confirmed: "Confirmed", s_packed: "Packed", s_shipped: "Shipped", s_delivered: "Delivered", s_returned: "Returned", s_cancelled: "Cancelled",
    moveTo: "Move to", markAs: "Mark as", orderDetail: "Order", printInvoice: "Print invoice", printLabel: "Print shipping label", sendAgain: "Send SMS again",
    shipDialog: "Ship this order", chooseCourier: "Courier", bookSteadfast: "Book with Steadfast automatically", orEnterTracking: "Or type the tracking ID from the courier",
    notifyCustomer: "Send SMS to the customer", note: "Note (optional)", refund: "Record a refund", refundAmount: "Refund amount (৳)", refundReason: "Reason",
    markPaid: "Mark as paid", paymentRef: "Payment reference / TrxID", adminNotes: "Staff notes (customer can't see)", history: "History", messages: "Messages sent",
    customerHistory: "This customer: {n} orders, {f} cancelled/returned", deliverTo: "Deliver to", subtotal: "Subtotal", discount: "Discount", deliveryFee: "Delivery",
    bulkSelected: "{n} selected", bulkConfirm: "Confirm selected", bulkPack: "Mark selected packed",
    exportCsv: "Export CSV", importCsv: "Import CSV", importHelp: "One row per size/colour. Required columns: slug, name_en, name_bn, category_slug, price, size, color, stock.", importDone: "{n} products imported.",
    duplicate: "Duplicate", images: "Photos", uploadImage: "Add photo", uploading: "Uploading…", firstIsCover: "The first photo is the cover.",
    variants: "Sizes, colours & stock", addVariant: "Add size/colour", basics: "Basic details", descriptions: "Descriptions", pricing: "Price", seo: "Search engine (SEO)",
    aiWrite: "Write with AI", aiWorking: "Writing…",
    adjustStock: "Adjust stock", setTo: "Set to", addQty: "Add", removeQty: "Remove", reason: "Reason", restock: "New stock arrived", adjustment: "Correction", returnR: "Customer return",
    stockLog: "Stock history", lowOnly: "Low stock", outOnly: "Out of stock",
    dragHint: "Drag ⋮⋮ to reorder. Drop onto another category to make it a sub-category.", saveOrder: "Save order", addSub: "Add sub-category",
    from: "From", to: "To", groupBy: "Group by", byDay: "Day", byMonth: "Month", byCategory: "Category", byProduct: "Product", byPayment: "Payment method", byZone: "Delivery zone",
    salesReport: "Sales", bestCustomers: "Best customers", courierPerf: "Courier performance", orders_: "Orders", revenue: "Revenue", avgOrder: "Average order",
    storeInfo: "Store information", paymentsSettings: "Payment methods", notifSettings: "Customer messages", smsTemplates: "Message templates", seoDefaults: "SEO defaults", integrations: "Connected services",
    connected: "Connected", notConnected: "Not connected", secretsNote: "API keys are kept safely as Cloudflare secrets (ask your developer). They are never shown here.",
    manual: "Manual (customer sends money, types TrxID)", api: "Automatic (API)", number: "Receiving number", accountType: "Account type",
    templatesHelp: "You can use {name}, {order_no}, {invoice_no}, {total}, {courier}, {tracking}, {store}.",
    signInTitle: "Staff sign in", email: "Email", loginId: "Username or email", password: "Password", signIn: "Sign in", signingIn: "Signing in…",
    currentPassword: "Current password", newPassword: "New password (min 10 characters)", roleMatrix: "What each role can do",
    saved: "Saved.", deleted: "Moved to Trash.", restored: "Restored.", forbidden: "You don't have permission for this.",
    helpIntro: "Short guides for everyday tasks. Tap a question to open it.",
    yesNo_1: "Yes", yesNo_0: "No",
  },
  bn: {
    dashboard: "ড্যাশবোর্ড", orders: "অর্ডার", products: "পণ্য", categories: "ক্যাটাগরি", customers: "গ্রাহক", coupons: "কুপন ও ছাড়",
    inventory: "স্টক ও ইনভেন্টরি", banners: "ব্যানার ও লোগো", reviews: "রিভিউ", staff: "স্টাফ ও রোল", reports: "রিপোর্ট", settings: "সেটিংস",
    zones: "ডেলিভারি জোন", audit: "কার্যক্রমের লগ", help: "সাহায্য", catalog: "ক্যাটালগ", sales: "বিক্রি", marketing: "মার্কেটিং", system: "সিস্টেম",
    collapse: "মেনু ছোট করুন", search: "ইনভয়েস নং, মোবাইল, নাম, SKU খুঁজুন…", invoiceNo: "ইনভয়েস নং", orderNo: "অর্ডার নং", profile: "প্রোফাইল সেটিংস", signOut: "সাইন আউট", notifications: "নোটিফিকেশন",
    onlineNow: "এখন অনলাইনে", onlyYou: "শুধু আপনি অনলাইনে আছেন।", newOrders: "নতুন অর্ডার", lowStock: "স্টক কম", pendingReviews: "অপেক্ষমাণ রিভিউ",
    nothingNew: "এই মুহূর্তে নতুন কিছু নেই।",
    todayOrders: "আজকের অর্ডার", todayRevenue: "আজকের বিক্রি", monthRevenue: "এই মাসের বিক্রি", pendingCod: "কনফার্মের অপেক্ষায়", lowStockItems: "স্টক কম এমন আইটেম", newCustomers: "নতুন গ্রাহক (৭ দিন)",
    vsYesterday: "গতকালের তুলনায়", vsLastMonth: "গত মাসের তুলনায়", vsLastWeek: "গত সপ্তাহের তুলনায়", ofVariants: "{n}টি ভ্যারিয়েন্টের মধ্যে", codCount: "{n}টি ক্যাশ অন ডেলিভারি",
    salesChart: "মাসিক বিক্রি", recentOrders: "সাম্প্রতিক অর্ডার", topProducts: "সেরা বিক্রিত (৩০ দিন)", viewAll: "সব দেখুন", orderMix: "গত ৩০ দিনের অবস্থা",
    add: "নতুন যোগ করুন", edit: "সম্পাদনা", delete: "মুছুন", restore: "ফিরিয়ে আনুন", deleteForever: "স্থায়ীভাবে মুছুন", save: "সংরক্ষণ করুন", cancel: "বাতিল", close: "বন্ধ করুন", yes: "হ্যাঁ", back: "ফিরে যান",
    saving: "সংরক্ষণ হচ্ছে…", confirmDelete: "\"{name}\" ট্র্যাশে পাঠাবেন? পরে ফিরিয়ে আনা যাবে।", confirmPurge: "\"{name}\" স্থায়ীভাবে মুছে ফেলবেন? এটি আর ফেরত আনা যাবে না।",
    active: "চালু", trash: "ট্র্যাশ", all: "সব", searchPlaceholder: "খুঁজুন…", noItems: "এখানে এখনো কিছু নেই।", noItemsSub: "যা যোগ করবেন তা এখানে দেখা যাবে।",
    loadError: "লোড হয়নি। ইন্টারনেট দেখে আবার চেষ্টা করুন।", retry: "আবার চেষ্টা করুন", prev: "আগের", next: "পরের", pageOf: "পৃষ্ঠা {p} / {n}",
    actions: "কাজ", status: "অবস্থা", date: "তারিখ", total: "মোট", customer: "গ্রাহক", phone: "ফোন", payment: "পেমেন্ট", items: "পণ্য", courier: "কুরিয়ার", tracking: "ট্র্যাকিং আইডি",
    s_pending: "অপেক্ষমাণ", s_confirmed: "কনফার্মড", s_packed: "প্যাকড", s_shipped: "পাঠানো হয়েছে", s_delivered: "ডেলিভারড", s_returned: "ফেরত", s_cancelled: "বাতিল",
    moveTo: "পরের ধাপ", markAs: "চিহ্নিত করুন", orderDetail: "অর্ডার", printInvoice: "ইনভয়েস প্রিন্ট", printLabel: "শিপিং লেবেল প্রিন্ট", sendAgain: "আবার SMS পাঠান",
    shipDialog: "অর্ডারটি পাঠান", chooseCourier: "কুরিয়ার", bookSteadfast: "স্টেডফাস্টে অটোমেটিক বুক করুন", orEnterTracking: "অথবা কুরিয়ারের ট্র্যাকিং আইডি লিখুন",
    notifyCustomer: "গ্রাহককে SMS পাঠান", note: "নোট (ঐচ্ছিক)", refund: "রিফান্ড রেকর্ড করুন", refundAmount: "রিফান্ডের পরিমাণ (৳)", refundReason: "কারণ",
    markPaid: "পেমেন্ট পেয়েছি", paymentRef: "পেমেন্ট রেফারেন্স / TrxID", adminNotes: "স্টাফ নোট (গ্রাহক দেখবেন না)", history: "ইতিহাস", messages: "পাঠানো মেসেজ",
    customerHistory: "এই গ্রাহক: {n}টি অর্ডার, {f}টি বাতিল/ফেরত", deliverTo: "ডেলিভারির ঠিকানা", subtotal: "পণ্যের দাম", discount: "ছাড়", deliveryFee: "ডেলিভারি",
    bulkSelected: "{n}টি নির্বাচিত", bulkConfirm: "নির্বাচিতগুলো কনফার্ম করুন", bulkPack: "নির্বাচিতগুলো প্যাকড করুন",
    exportCsv: "CSV এক্সপোর্ট", importCsv: "CSV ইমপোর্ট", importHelp: "প্রতি সাইজ/রঙের জন্য একটি সারি। আবশ্যক কলাম: slug, name_en, name_bn, category_slug, price, size, color, stock।", importDone: "{n}টি পণ্য ইমপোর্ট হয়েছে।",
    duplicate: "কপি করুন", images: "ছবি", uploadImage: "ছবি যোগ করুন", uploading: "আপলোড হচ্ছে…", firstIsCover: "প্রথম ছবিটি কভার হিসেবে দেখাবে।",
    variants: "সাইজ, রং ও স্টক", addVariant: "সাইজ/রং যোগ করুন", basics: "মূল তথ্য", descriptions: "বিবরণ", pricing: "দাম", seo: "সার্চ ইঞ্জিন (SEO)",
    aiWrite: "AI দিয়ে লিখুন", aiWorking: "লেখা হচ্ছে…",
    adjustStock: "স্টক পরিবর্তন", setTo: "নির্দিষ্ট করুন", addQty: "যোগ", removeQty: "বাদ", reason: "কারণ", restock: "নতুন স্টক এসেছে", adjustment: "সংশোধন", returnR: "গ্রাহক ফেরত",
    stockLog: "স্টকের ইতিহাস", lowOnly: "স্টক কম", outOnly: "স্টক শেষ",
    dragHint: "ক্রম বদলাতে ⋮⋮ টেনে আনুন। অন্য ক্যাটাগরির উপর ছাড়লে সেটির সাব-ক্যাটাগরি হবে।", saveOrder: "ক্রম সংরক্ষণ", addSub: "সাব-ক্যাটাগরি যোগ",
    from: "শুরু", to: "শেষ", groupBy: "ভাগ করুন", byDay: "দিন", byMonth: "মাস", byCategory: "ক্যাটাগরি", byProduct: "পণ্য", byPayment: "পেমেন্ট পদ্ধতি", byZone: "ডেলিভারি জোন",
    salesReport: "বিক্রি", bestCustomers: "সেরা গ্রাহক", courierPerf: "কুরিয়ারের পারফরম্যান্স", orders_: "অর্ডার", revenue: "আয়", avgOrder: "গড় অর্ডার",
    storeInfo: "দোকানের তথ্য", paymentsSettings: "পেমেন্ট পদ্ধতি", notifSettings: "গ্রাহককে মেসেজ", smsTemplates: "মেসেজের টেমপ্লেট", seoDefaults: "SEO", integrations: "সংযুক্ত সার্ভিস",
    connected: "সংযুক্ত", notConnected: "সংযুক্ত নয়", secretsNote: "API কী নিরাপদে Cloudflare secret হিসেবে রাখা হয় (ডেভেলপারকে বলুন)। এখানে কখনো দেখানো হয় না।",
    manual: "ম্যানুয়াল (গ্রাহক টাকা পাঠিয়ে TrxID দেবেন)", api: "অটোমেটিক (API)", number: "টাকা গ্রহণের নম্বর", accountType: "অ্যাকাউন্টের ধরন",
    templatesHelp: "ব্যবহার করতে পারেন: {name}, {order_no}, {invoice_no}, {total}, {courier}, {tracking}, {store}",
    signInTitle: "স্টাফ সাইন ইন", email: "ইমেইল", loginId: "ইউজারনেম বা ইমেইল", password: "পাসওয়ার্ড", signIn: "সাইন ইন", signingIn: "সাইন ইন হচ্ছে…",
    currentPassword: "বর্তমান পাসওয়ার্ড", newPassword: "নতুন পাসওয়ার্ড (কমপক্ষে ১০ অক্ষর)", roleMatrix: "কোন রোল কী করতে পারে",
    saved: "সংরক্ষণ হয়েছে।", deleted: "ট্র্যাশে পাঠানো হয়েছে।", restored: "ফিরিয়ে আনা হয়েছে।", forbidden: "এই কাজের অনুমতি আপনার নেই।",
    helpIntro: "প্রতিদিনের কাজের ছোট গাইড। প্রশ্নে চাপ দিয়ে খুলুন।",
    yesNo_1: "হ্যাঁ", yesNo_0: "না",
  },
};

// ---- Shop additions ----
Object.assign(dict.en, {
  collections: "Routine sets", abandoned: "Abandoned checkouts", returns: "Returns & refunds", landing: "Campaign pages", referrals: "Referrals",
  s_confirmation_attempted: "Call attempted", s_refused: "Refused at delivery", s_returned: "Returned",
  attention: "Needs your attention today", healthCheck: "What's connected", setupTitle: "Let's set up your shop", setupSub: "Six small steps — each takes a minute.", dismiss: "Hide",
  callsToMake: "Orders waiting for a confirmation call", abandonedToFollow: "Abandoned checkouts to follow up", paymentsToVerify: "Mobile payments to check (TrxID)", returnRequests: "Return requests", backInStock: "Back in stock — people are waiting",
  allClear: "All clear — nothing waiting. 🎉", pendingCodKpi: "Cash still to collect (COD)", activeRegistries: "Bookings today", abandonedKpi: "Abandoned checkouts",
  call: "Call", whatsapp: "WhatsApp", noAnswer: "No answer", confirmedCall: "Customer confirmed", declined: "Customer said no",
  logCall: "How did the call go?", confirmGateNo: "Can't confirm yet", dispatchGateNo: "Call before shipping", verifiedNumber: "Number verified by SMS", notVerified: "Number not verified",
  risk: "Risk", riskReason: "Why", courierHistory: "Courier history", recheck: "Check again", flags: "Warnings",
  markContacted: "I contacted them", markRecovered: "Recovered", notInterested: "Not interested", sendRecovery: "Send recovery message", reopen: "Reopen", lastStep: "Got as far as", cart: "Cart",
  step_cart: "Cart", step_contact: "Contact details", step_address: "Address", step_payment: "Payment",
  bulkShip: "Mark selected shipped", bulkConfirmMsg: "You're about to mark {n} orders as {s} — continue?", downloadInvoice: "Invoice PDF",
  certifications: "Test certificates", certHelp: "Tick a badge (dermatologically tested, non-comedogenic, fragrance-free…) only if you hold the test report or certificate. Each badge needs its document attached before it can be saved.", attachDoc: "Attach certificate (PDF/photo)", docAttached: "Document attached", docMissing: "Attach the document to enable this badge",
  ageRanges: "Skin types", occasions: "Skin types", occ_everyday: "Everyday", occ_festive: "Festive", occ_bridal: "Bridal", weight: "Pack size", weightHint: "The amount in one pack.", material: "Ingredients", finish: "Shade", giftItem: "Featured", sizeChart: "Skin type guide", sizeGuideRing: "", sizeGuideBangle: "", sizeGuideNone: "",
  skuAuto: "Leave blank — we'll create it (e.g. SKN-SRM-30ML-0042)", notifyWaiting: "Notify {n} waiting", waiting: "waiting",
  approve: "Approve", reject: "Reject", received: "Item received", refunded: "Refund sent", reply: "Reply",
  twoFaTitle: "Two-step sign-in", twoFaSetup: "Protect your account: scan this code with Google Authenticator (or any authenticator app), then type the 6-digit code.", twoFaKey: "Or type this key", code: "6-digit code", confirm: "Confirm",
  phoneLogin: "Sign in with phone (staff)", passwordLogin: "Sign in with password", sendCode: "Send code", otpSent: "Code sent by SMS.",
  runJobs: "Run background jobs now", backupNow: "Back up now", viewShop: "View shop", reset2fa: "Reset 2FA",
  studio: "Studio", bookings: "Bookings", treatments: "Treatments", skinTypes: "Skin types", concerns: "Concerns", heroIngredients: "Hero ingredients (2–3)", heroHelp: "The ingredients you call out on the product page, with one cosmetic line each (e.g. “Helps skin look more even”).", inci: "Full ingredient list (INCI)", inciHelp: "Copy it exactly as printed on the pack, separated by commas.", howToUse: "How to use (one step per line)", caution: "Good to know / cautions", pao: "Use within (months after opening)", origin: "Made in", noClaims: "Cosmetic wording only: “hydrates”, “brightens”, “helps reduce the look of”. Never “cures”, “treats acne”, “heals” or “prevents”.", volume: "Amount", unit: "Unit", shade: "Shade",
  batches: "Batches & expiry", receiveBatch: "Receive stock (batch)", batchNo: "Batch / lot number", expiry: "Expiry date", mfgDate: "Manufactured on", supplier: "Supplier", costPrice: "Cost price (৳)", qtyReceived: "Received", qtyLeft: "Left", daysLeft: "Days left", writeOff: "Write off", writeOffWhy: "Why? (damaged, expired, tester…)", expiringSoon: "Expiring soon", expired: "Expired", nextExpiry: "Next expiry", fefoNote: "Orders are packed from the batch that expires first. Expired units are taken off sale automatically every day.", expiringBatchesKpi: "Batches expiring within {n} days", bookingsKpi: "Studio bookings today", toConfirm: "{n} to confirm", expiringToSell: "Batches expiring soon — sell or use first", bookingsToConfirm: "Studio bookings to confirm / today",
  b_requested: "Requested", b_confirmed: "Confirmed", b_completed: "Completed", b_cancelled: "Cancelled", b_no_show: "No-show", confirmBooking: "Confirm booking", markDone: "Mark done", noShow: "No-show", moveBooking: "Change time", visits: "visits", studioSettings: "Studio hours & bookings", spotlightSettings: "Home page ingredient spotlight", expirySettings: "Expiry warnings", routineStep: "Routine step", minutes: "{n} min",
  fraudSettings: "Fake-order protection", abandonedSettings: "Abandoned checkouts", automationSettings: "Automatic messages", taxSettings: "VAT on invoices", referralSettings: "Refer-a-friend", trackingSettings: "Ads & tracking", waTemplates: "WhatsApp quick replies",
});
Object.assign(dict.bn, {
  collections: "রুটিন সেট", abandoned: "অসম্পূর্ণ চেকআউট", returns: "রিটার্ন ও রিফান্ড", landing: "ক্যাম্পেইন পেজ", referrals: "রেফারেল",
  s_confirmation_attempted: "কল করা হয়েছে", s_refused: "ডেলিভারিতে নেননি", s_returned: "ফেরত এসেছে",
  attention: "আজ যা দেখতে হবে", healthCheck: "কী কী যুক্ত আছে", setupTitle: "চলুন দোকান সাজাই", setupSub: "ছয়টি ছোট ধাপ — প্রতিটি এক মিনিট।", dismiss: "লুকান",
  callsToMake: "কনফার্ম কলের অপেক্ষায় অর্ডার", abandonedToFollow: "অসম্পূর্ণ চেকআউট — যোগাযোগ করুন", paymentsToVerify: "মোবাইল পেমেন্ট যাচাই (TrxID)", returnRequests: "রিটার্নের অনুরোধ", backInStock: "স্টকে ফিরেছে — গ্রাহক অপেক্ষায়",
  allClear: "সব ঠিক আছে — কিছু অপেক্ষায় নেই। 🎉", pendingCodKpi: "যে ক্যাশ এখনো আসবে (COD)", activeRegistries: "আজকের বুকিং", abandonedKpi: "অসম্পূর্ণ চেকআউট",
  call: "কল", whatsapp: "হোয়াটসঅ্যাপ", noAnswer: "ধরেননি", confirmedCall: "গ্রাহক কনফার্ম করেছেন", declined: "গ্রাহক না বলেছেন",
  logCall: "কল কেমন হলো?", confirmGateNo: "এখনো কনফার্ম করা যাবে না", dispatchGateNo: "পাঠানোর আগে কল করুন", verifiedNumber: "SMS এ নম্বর যাচাই হয়েছে", notVerified: "নম্বর যাচাই হয়নি",
  risk: "ঝুঁকি", riskReason: "কেন", courierHistory: "কুরিয়ার রেকর্ড", recheck: "আবার দেখুন", flags: "সতর্কতা",
  markContacted: "যোগাযোগ করেছি", markRecovered: "অর্ডার হয়েছে", notInterested: "আগ্রহী নন", sendRecovery: "রিকভারি মেসেজ পাঠান", reopen: "আবার খুলুন", lastStep: "কোন পর্যন্ত এসেছিলেন", cart: "কার্ট",
  step_cart: "কার্ট", step_contact: "যোগাযোগের তথ্য", step_address: "ঠিকানা", step_payment: "পেমেন্ট",
  bulkShip: "নির্বাচিতগুলো শিপড করুন", bulkConfirmMsg: "{n}টি অর্ডার \"{s}\" করতে যাচ্ছেন — চালিয়ে যাবেন?", downloadInvoice: "ইনভয়েস PDF",
  certifications: "টেস্ট সার্টিফিকেট", certHelp: "টেস্ট রিপোর্ট বা সার্টিফিকেট থাকলেই শুধু ব্যাজে টিক দিন (চর্মরোগ বিশেষজ্ঞ দ্বারা পরীক্ষিত, নন-কমেডোজেনিক, সুগন্ধিমুক্ত…)। প্রতিটি ব্যাজ সংরক্ষণের আগে ডকুমেন্ট যুক্ত করতে হবে।", attachDoc: "সার্টিফিকেট যুক্ত করুন (PDF/ছবি)", docAttached: "ডকুমেন্ট যুক্ত আছে", docMissing: "ব্যাজ চালু করতে ডকুমেন্ট যুক্ত করুন",
  ageRanges: "ত্বকের ধরন", occasions: "ত্বকের ধরন", occ_everyday: "প্রতিদিন", occ_festive: "উৎসব", occ_bridal: "ব্রাইডাল", weight: "প্যাক সাইজ", weightHint: "এক প্যাকে কতটুকু।", material: "উপাদান", finish: "শেড", giftItem: "ফিচার্ড", sizeChart: "ত্বকের ধরন গাইড", sizeGuideRing: "", sizeGuideBangle: "", sizeGuideNone: "",
  skuAuto: "খালি রাখুন — আমরা তৈরি করে দেবো (যেমন SKN-SRM-30ML-0042)", notifyWaiting: "{n} জনকে জানান", waiting: "অপেক্ষায়",
  approve: "অনুমোদন", reject: "বাতিল", received: "পণ্য ফেরত পেয়েছি", refunded: "টাকা ফেরত দিয়েছি", reply: "উত্তর",
  twoFaTitle: "দুই-ধাপের সাইন-ইন", twoFaSetup: "অ্যাকাউন্ট সুরক্ষিত করুন: Google Authenticator (বা যেকোনো অথেন্টিকেটর অ্যাপ) দিয়ে কোডটি স্ক্যান করে ৬ সংখ্যার কোড লিখুন।", twoFaKey: "অথবা এই কী লিখুন", code: "৬ সংখ্যার কোড", confirm: "নিশ্চিত করুন",
  phoneLogin: "ফোন দিয়ে সাইন ইন (স্টাফ)", passwordLogin: "পাসওয়ার্ড দিয়ে সাইন ইন", sendCode: "কোড পাঠান", otpSent: "SMS এ কোড পাঠানো হয়েছে।",
  runJobs: "ব্যাকগ্রাউন্ড কাজ এখন চালান", backupNow: "এখনই ব্যাকআপ নিন", viewShop: "দোকান দেখুন", reset2fa: "2FA রিসেট",
  studio: "স্টুডিও", bookings: "বুকিং", treatments: "ট্রিটমেন্ট", skinTypes: "ত্বকের ধরন", concerns: "সমস্যা", heroIngredients: "মূল উপাদান (২–৩টি)", heroHelp: "পণ্য পেজে যে উপাদানগুলো আলাদা করে দেখাবেন, প্রতিটির জন্য একটি কসমেটিক বাক্য (যেমন “ত্বক সমান দেখাতে সাহায্য করে”)।", inci: "সম্পূর্ণ উপাদান তালিকা (INCI)", inciHelp: "প্যাকেটে যেভাবে লেখা আছে হুবহু কপি করুন, কমা দিয়ে আলাদা করে।", howToUse: "যেভাবে ব্যবহার করবেন (প্রতি লাইনে একটি ধাপ)", caution: "জেনে রাখুন / সতর্কতা", pao: "খোলার পর কত মাসের মধ্যে ব্যবহার", origin: "উৎপাদন দেশ", noClaims: "শুধু কসমেটিক শব্দ: “আর্দ্রতা দেয়”, “উজ্জ্বল করে”, “… কম দেখাতে সাহায্য করে”। কখনো “সারায়”, “ব্রণ দূর করে”, “নিরাময়” বা “প্রতিরোধ করে” নয়।", volume: "পরিমাণ", unit: "একক", shade: "শেড",
  batches: "ব্যাচ ও মেয়াদ", receiveBatch: "স্টক গ্রহণ (ব্যাচ)", batchNo: "ব্যাচ / লট নম্বর", expiry: "মেয়াদ শেষের তারিখ", mfgDate: "উৎপাদনের তারিখ", supplier: "সরবরাহকারী", costPrice: "ক্রয়মূল্য (৳)", qtyReceived: "গ্রহণ", qtyLeft: "বাকি", daysLeft: "দিন বাকি", writeOff: "বাদ দিন", writeOffWhy: "কেন? (ক্ষতিগ্রস্ত, মেয়াদোত্তীর্ণ, টেস্টার…)", expiringSoon: "শীঘ্রই মেয়াদ শেষ", expired: "মেয়াদ শেষ", nextExpiry: "পরবর্তী মেয়াদ", fefoNote: "সবচেয়ে আগে মেয়াদ শেষ হওয়া ব্যাচ থেকে অর্ডার প্যাক হয়। মেয়াদোত্তীর্ণ পণ্য প্রতিদিন নিজে থেকেই বিক্রি থেকে সরে যায়।", expiringBatchesKpi: "{n} দিনের মধ্যে মেয়াদ শেষ হবে এমন ব্যাচ", bookingsKpi: "আজকের স্টুডিও বুকিং", toConfirm: "{n}টি কনফার্ম বাকি", expiringToSell: "শীঘ্রই মেয়াদ শেষ — আগে বিক্রি বা ব্যবহার করুন", bookingsToConfirm: "কনফার্ম করার বুকিং / আজকের বুকিং",
  b_requested: "অনুরোধ", b_confirmed: "কনফার্মড", b_completed: "সম্পন্ন", b_cancelled: "বাতিল", b_no_show: "আসেননি", confirmBooking: "বুকিং কনফার্ম", markDone: "সম্পন্ন", noShow: "আসেননি", moveBooking: "সময় বদলান", visits: "বার এসেছেন", studioSettings: "স্টুডিওর সময় ও বুকিং", spotlightSettings: "হোম পেজের উপাদান পরিচিতি", expirySettings: "মেয়াদের সতর্কতা", routineStep: "রুটিনের ধাপ", minutes: "{n} মিনিট",
  fraudSettings: "ভুয়া অর্ডার সুরক্ষা", abandonedSettings: "অসম্পূর্ণ চেকআউট", automationSettings: "স্বয়ংক্রিয় মেসেজ", taxSettings: "ইনভয়েসে ভ্যাট", referralSettings: "বন্ধুকে রেফার", trackingSettings: "বিজ্ঞাপন ও ট্র্যাকিং", waTemplates: "হোয়াটসঅ্যাপ দ্রুত উত্তর",
});

let current = (() => { try { return localStorage.getItem("sgs_admin_lang") || "bn"; } catch { return "bn"; } })();
export const lang = () => current;
export function setLang(l) {
  current = l === "en" ? "en" : "bn";
  try { localStorage.setItem("sgs_admin_lang", current); } catch { /* ignore */ }
  document.documentElement.lang = current;
}
export function t(key, vars) {
  let s = dict[current][key] ?? dict.en[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  return s;
}
/** Bilingual literal: tt({ en: "…", bn: "…" }) */
export const tt = (o) => (o ? o[current] ?? o.en ?? "" : "");
const nf = { bn: new Intl.NumberFormat("bn-BD"), en: new Intl.NumberFormat("en-IN") };
export const num = (n) => nf[current].format(n ?? 0);
export const money = (n) => `৳${num(n)}`;
export const dt = (iso, time = false) =>
  iso ? new Date(iso).toLocaleString(current === "bn" ? "bn-BD" : "en-GB", { day: "numeric", month: "short", year: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—";
