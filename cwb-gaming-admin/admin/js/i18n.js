// Platform admin strings (Bangla / English). Shared toolkit keys live in STR; views use tx(en, bn) inline.
const STR = {
  en: {
    // nav
    dashboard: "Dashboard", applications: "Seller applications", sellers: "Sellers", catalog: "Games & products", games: "Games", products: "Packs", orders: "Orders",
    disputes: "Disputes", payouts: "Payouts", commission: "Commission", fraud: "Fraud & risk", customers: "Buyers", reviews: "Reviews", abandoned: "Abandoned checkouts",
    reports: "Reports", staff: "Staff & roles", settings: "System settings", help: "Help", audit: "Audit log", profile: "My profile",
    g_marketplace: "Marketplace", g_money: "Money", g_trust: "Trust & safety", g_system: "System",
    // toolkit
    close: "Close", cancel: "Cancel", yes: "Yes", save: "Save", saving: "Saving…", saved: "Saved.", add: "Add", edit: "Edit", delete: "Delete", deleted: "Moved to Trash.",
    restore: "Restore", restored: "Restored.", deleteForever: "Delete forever", trash: "Trash", active: "Active", actions: "Actions", searchPlaceholder: "Search…",
    exportCsv: "Export CSV", prev: "Previous", next: "Next", pageOf: "Page {p} of {n}", noItems: "Nothing here yet", noItemsSub: "Items you add will appear here.",
    retry: "Try again", loadError: "Couldn't load. Check your connection.", uploading: "Uploading…", confirmDelete: "Move “{name}” to Trash?", confirmPurge: "Delete “{name}” forever? This can't be undone.",
    yesNo_1: "Yes", yesNo_0: "No",
    // auth
    signInTitle: "Platform admin", loginId: "Email or username", password: "Password", code: "6-digit code", phone: "Mobile number", sendCode: "Send SMS code",
    signIn: "Sign in", signingIn: "Signing in…", phoneLogin: "Sign in with phone", passwordLogin: "Sign in with password", otpSent: "Code sent.",
    twoFaTitle: "Set up two-step sign-in", twoFaSetup: "Scan this QR code with Google Authenticator, Microsoft Authenticator or Authy, then type the 6-digit code. Required for your role.",
    twoFaKey: "Or type this key", currentPassword: "Current password", newPassword: "New password (at least 10 characters)", confirm: "Confirm", signOut: "Sign out", viewShop: "View marketplace", collapse: "Collapse", notifications: "Needs attention", search: "Search",
  },
  bn: {
    dashboard: "ড্যাশবোর্ড", applications: "সেলার আবেদন", sellers: "সেলার", catalog: "গেম ও প্রোডাক্ট", games: "গেম", products: "প্যাক", orders: "অর্ডার",
    disputes: "বিরোধ", payouts: "পেআউট", commission: "কমিশন", fraud: "প্রতারণা ও ঝুঁকি", customers: "ক্রেতা", reviews: "রিভিউ", abandoned: "অসম্পূর্ণ চেকআউট",
    reports: "রিপোর্ট", staff: "স্টাফ ও রোল", settings: "সিস্টেম সেটিংস", help: "সহায়তা", audit: "অডিট লগ", profile: "আমার প্রোফাইল",
    g_marketplace: "মার্কেটপ্লেস", g_money: "টাকা", g_trust: "নিরাপত্তা", g_system: "সিস্টেম",
    close: "বন্ধ", cancel: "বাতিল", yes: "হ্যাঁ", save: "সংরক্ষণ", saving: "সংরক্ষণ হচ্ছে…", saved: "সংরক্ষণ হয়েছে।", add: "যোগ করুন", edit: "সম্পাদনা", delete: "মুছুন", deleted: "ট্র্যাশে পাঠানো হয়েছে।",
    restore: "ফিরিয়ে আনুন", restored: "ফিরিয়ে আনা হয়েছে।", deleteForever: "স্থায়ীভাবে মুছুন", trash: "ট্র্যাশ", active: "সক্রিয়", actions: "অ্যাকশন", searchPlaceholder: "খুঁজুন…",
    exportCsv: "CSV এক্সপোর্ট", prev: "আগের", next: "পরের", pageOf: "পেজ {p} / {n}", noItems: "এখনো কিছু নেই", noItemsSub: "যোগ করলে এখানে দেখাবে।",
    retry: "আবার চেষ্টা করুন", loadError: "লোড হয়নি। ইন্টারনেট সংযোগ দেখুন।", uploading: "আপলোড হচ্ছে…", confirmDelete: "“{name}” ট্র্যাশে পাঠাবেন?", confirmPurge: "“{name}” স্থায়ীভাবে মুছবেন? আর ফেরানো যাবে না।",
    yesNo_1: "হ্যাঁ", yesNo_0: "না",
    signInTitle: "প্ল্যাটফর্ম অ্যাডমিন", loginId: "ইমেইল বা ইউজারনেম", password: "পাসওয়ার্ড", code: "৬ সংখ্যার কোড", phone: "মোবাইল নম্বর", sendCode: "SMS কোড পাঠান",
    signIn: "সাইন ইন", signingIn: "সাইন ইন হচ্ছে…", phoneLogin: "ফোন দিয়ে সাইন ইন", passwordLogin: "পাসওয়ার্ড দিয়ে সাইন ইন", otpSent: "কোড পাঠানো হয়েছে।",
    twoFaTitle: "দুই-ধাপের সাইন-ইন সেটআপ", twoFaSetup: "Google Authenticator, Microsoft Authenticator বা Authy দিয়ে QR কোড স্ক্যান করে ৬ সংখ্যার কোড লিখুন। আপনার রোলের জন্য বাধ্যতামূলক।",
    twoFaKey: "অথবা এই কী লিখুন", currentPassword: "বর্তমান পাসওয়ার্ড", newPassword: "নতুন পাসওয়ার্ড (কমপক্ষে ১০ অক্ষর)", confirm: "নিশ্চিত করুন", signOut: "সাইন আউট", viewShop: "মার্কেটপ্লেস দেখুন", collapse: "ছোট করুন", notifications: "মনোযোগ দরকার", search: "খুঁজুন",
  },
};

let current = (() => { try { return localStorage.getItem("cwb_admin_lang") || "bn"; } catch { return "bn"; } })();
export const lang = () => current;
export function setLang(l) {
  current = l === "en" ? "en" : "bn";
  try { localStorage.setItem("cwb_admin_lang", current); } catch { /* ignore */ }
  document.documentElement.lang = current;
}
export function t(key, vars = {}) {
  const s = STR[current][key] ?? STR.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}
export const tx = (en, bn) => (current === "bn" ? bn : en);
export const tt = (o) => (o ? o[current] ?? o.en ?? "" : "");
export const L = (obj, field) => (obj ? (current === "bn" ? obj[`${field}_bn`] || obj[`${field}_en`] : obj[`${field}_en`] || obj[`${field}_bn`]) ?? "" : "");
const nf = { en: new Intl.NumberFormat("en-IN"), bn: new Intl.NumberFormat("bn-BD") };
export const num = (n) => nf[current].format(n ?? 0);
export const money = (n) => `৳${num(n)}`;
export const dt = (iso, time = false) =>
  iso ? new Date(iso).toLocaleString(current === "bn" ? "bn-BD" : "en-GB", time ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", year: "numeric" }) : "—";
/** "in 12 min" / "8 min late" from a deadline. */
export function dueIn(iso) {
  if (!iso) return "";
  const m = Math.round((Date.parse(iso) - Date.now()) / 60000);
  return m >= 0 ? tx(`${m} min left`, `${num(m)} মিনিট বাকি`) : tx(`${-m} min late`, `${num(-m)} মিনিট দেরি`);
}
