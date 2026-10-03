// Declarative definitions for the simpler admin modules. views/resource.js turns each into a searchable, filterable
// list (with CSV export), create/edit slide-overs, delete→Trash and restore.
import { t, tx, tt, num, money, dt, lang, L as Lf } from "./i18n.js";
import { html, pill, api, riskBadge } from "./core.js";

const L = (en, bn) => ({ en, bn });
const yes = (v) => (v ? pill("active", t("yesNo_1")) : pill("inactive", t("yesNo_0")));
const ALL = L("All", "সব");
export const NO_CLAIMS = L(
  "Write what's true. No fake stock counts or “offer ends today”, no “100% safe / ban-proof / guaranteed instant”, no “cheapest in Bangladesh”, no free-UC / generator / hack wording, nothing about crypto or USD — copy like that is refused when you save.",
  "যা সত্য তাই লিখুন। বানানো স্টক সংখ্যা বা “আজই অফার শেষ”, “১০০% নিরাপদ / ব্যান হবে না / নিশ্চিত সাথে সাথে”, “বাংলাদেশে সবচেয়ে সস্তা”, ফ্রি ইউসি / জেনারেটর / হ্যাক, ক্রিপ্টো বা USD — এমন লেখা সংরক্ষণ হবে না।",
);

let gameOpts;
export const gameOptions = async () => (gameOpts ??= api("/games?limit=200&sort=sort_order").then((r) => r.items.map((g) => [g.id, `${g.code} · ${lang() === "bn" ? g.name_bn : g.name_en}`])));
let sellerOpts;
const sellerOptions = async () => (sellerOpts ??= api("/sellers?limit=200&status=approved").then((r) => r.items.map((s) => [s.id, `${s.code} · ${s.store_name}`])));

function slugFromName(form, from = "name_en") {
  const name = form.elements[from], slug = form.elements.slug;
  if (!name || !slug) return;
  let touched = Boolean(slug.value);
  slug.addEventListener("input", () => (touched = true));
  name.addEventListener("input", () => { if (!touched) slug.value = name.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); });
}

const TIERS = [["standard", L("Standard", "স্ট্যান্ডার্ড")], ["silver", L("Silver", "সিলভার")], ["gold", L("Gold", "গোল্ড")], ["official", L("Official store", "অফিসিয়াল স্টোর")]];

export const RESOURCES = {
  games: {
    endpoint: "/games",
    perm: "catalog",
    csv: true,
    title: L("Games", "গেম"),
    intro: L("The master catalogue. Sellers can only list packs of these games. The game code (PUBG, FF…) is part of every SKU.", "মাস্টার ক্যাটালগ। সেলাররা শুধু এই গেমগুলোর প্যাক লিস্ট করতে পারেন। গেম কোড (PUBG, FF…) প্রতিটি SKU তে থাকে।"),
    nameOf: (r) => r.name_en,
    filters: [{ name: "kind", label: L("Kind", "ধরন"), options: [["", ALL], ["topup", L("Top-up", "টপ-আপ")], ["giftcard", L("Gift card", "গিফট কার্ড")]] }, { name: "is_active", label: L("Status", "অবস্থা"), options: [["", ALL], ["1", L("On", "চালু")], ["0", L("Off", "বন্ধ")]] }],
    columns: [
      { label: L("Game", "গেম"), render: (r) => html`<b>${Lf(r, "name")}</b><br><span class="muted small mono">${r.code} · /${r.slug}</span>` },
      { label: L("Kind", "ধরন"), render: (r) => (r.kind === "giftcard" ? tx("Gift card", "গিফট কার্ড") : tx("Top-up", "টপ-আপ")) },
      { label: L("Player ID check", "প্লেয়ার আইডি যাচাই"), render: (r) => (r.requires_player_id ? html`<span class="mono small">${r.player_id_regex ?? "—"}</span>${r.needs_server ? html` + ${tx("zone", "জোন")}` : ""}` : "—") },
      { label: L("Packs", "প্যাক"), render: (r) => num(r.product_count) },
      { label: L("Listings", "লিস্টিং"), render: (r) => num(r.listing_count) },
      { label: L("On", "চালু"), render: (r) => yes(r.is_active) },
    ],
    onForm: (form) => slugFromName(form),
    fields: async () => [
      { name: "code", label: L("Game code (2–6 capitals)", "গেম কোড (২–৬ বড় হাতের অক্ষর)"), required: true, maxlength: 6 },
      { name: "slug", label: L("Web address", "ওয়েব ঠিকানা"), required: true },
      { name: "name_en", label: L("Name (English)", "নাম (ইংরেজি)"), required: true },
      { name: "name_bn", label: L("Name (Bangla)", "নাম (বাংলা)"), required: true },
      { name: "publisher", label: L("Publisher", "প্রকাশক") },
      { name: "kind", label: L("Kind", "ধরন"), type: "select", options: [["topup", L("Game top-up", "গেম টপ-আপ")], ["giftcard", L("Gift card / wallet code", "গিফট কার্ড / ওয়ালেট কোড")]] },
      { name: "currency_name_en", label: L("In-game currency (English)", "গেমের মুদ্রা (ইংরেজি)"), placeholder: "UC" },
      { name: "currency_name_bn", label: L("In-game currency (Bangla)", "গেমের মুদ্রা (বাংলা)") },
      { name: "icon_url", label: L("Icon image", "আইকন ছবি"), type: "image" },
      { name: "cover_url", label: L("Cover image (realistic art, no publisher logos)", "কভার ছবি (বাস্তবধর্মী, প্রকাশকের লোগো ছাড়া)"), type: "image" },
      { name: "description_en", label: L("Description (English)", "বর্ণনা (ইংরেজি)"), type: "textarea", span: 2, hint: NO_CLAIMS },
      { name: "description_bn", label: L("Description (Bangla)", "বর্ণনা (বাংলা)"), type: "textarea", span: 2 },
      { name: "requires_player_id", label: L("Needs a player ID", "প্লেয়ার আইডি লাগে"), type: "checkbox", default: 1 },
      { name: "needs_server", label: L("Needs a server / zone ID", "সার্ভার / জোন আইডি লাগে"), type: "checkbox" },
      { name: "player_id_label_en", label: L("ID label (English)", "আইডির নাম (ইংরেজি)"), placeholder: "Player ID" },
      { name: "player_id_label_bn", label: L("ID label (Bangla)", "আইডির নাম (বাংলা)") },
      { name: "player_id_regex", label: L("ID format (pattern)", "আইডির ফরম্যাট (প্যাটার্ন)"), placeholder: "^[0-9]{8,12}$", hint: L("Checked before payment. A broken pattern is ignored, never blocks a sale.", "পেমেন্টের আগে যাচাই হয়। ভুল প্যাটার্ন উপেক্ষা করা হয়, বিক্রি আটকায় না।") },
      { name: "server_regex", label: L("Zone format (pattern)", "জোনের ফরম্যাট (প্যাটার্ন)") },
      { name: "player_id_hint_en", label: L("Where to find the ID (English)", "আইডি কোথায় পাবেন (ইংরেজি)"), type: "textarea", rows: 2 },
      { name: "player_id_hint_bn", label: L("Where to find the ID (Bangla)", "আইডি কোথায় পাবেন (বাংলা)"), type: "textarea", rows: 2 },
      { name: "server_label_en", label: L("Zone label (English)", "জোনের নাম (ইংরেজি)") },
      { name: "server_label_bn", label: L("Zone label (Bangla)", "জোনের নাম (বাংলা)") },
      { name: "lookup_supported", label: L("Player-name lookup available", "প্লেয়ারের নাম যাচাই আছে"), type: "checkbox" },
      { name: "sort_order", label: L("Order", "ক্রম"), type: "number" },
      { name: "is_featured", label: L("Featured on home", "হোমে ফিচার্ড"), type: "checkbox" },
      { name: "is_active", label: L("On sale", "বিক্রি চালু"), type: "checkbox", default: 1 },
      { name: "meta_title", label: L("Search title", "সার্চ টাইটেল"), span: 2 },
      { name: "meta_description", label: L("Search description", "সার্চ বর্ণনা"), type: "textarea", rows: 2, span: 2 },
    ],
  },
  products: {
    endpoint: "/products",
    perm: "catalog",
    csv: true,
    title: L("Packs (denominations)", "প্যাক (ডিনোমিনেশন)"),
    intro: L("Each pack gets one landing page with a live price comparison. The pack code (660UC…) is part of every SKU.", "প্রতিটি প্যাকের একটি ল্যান্ডিং পেজ থাকে, যেখানে সরাসরি দামের তুলনা দেখায়। প্যাক কোড (660UC…) প্রতিটি SKU তে থাকে।"),
    nameOf: (r) => `${r.game_name} ${r.name_en}`,
    filters: [{ name: "is_active", label: L("Status", "অবস্থা"), options: [["", ALL], ["1", L("On", "চালু")], ["0", L("Off", "বন্ধ")]] }],
    columns: [
      { label: L("Pack", "প্যাক"), render: (r) => html`<b>${Lf(r, "name")}</b><br><span class="muted small mono">${r.game_code}-${r.code}</span>` },
      { label: L("Game", "গেম"), render: (r) => r.game_name },
      { label: L("Delivery", "ডেলিভারি"), render: (r) => r.allowed_methods },
      { label: L("Sellers", "সেলার"), render: (r) => num(r.listing_count) },
      { label: L("Lowest price", "সর্বনিম্ন দাম"), render: (r) => (r.min_price != null ? money(r.min_price) : "—"), cls: "mono" },
      { label: L("On", "চালু"), render: (r) => yes(r.is_active) },
    ],
    onForm: (form) => slugFromName(form),
    fields: async () => [
      { name: "game_id", label: L("Game", "গেম"), type: "select", numeric: true, required: true, options: await gameOptions() },
      { name: "code", label: L("Pack code", "প্যাক কোড"), required: true, placeholder: "660UC" },
      { name: "slug", label: L("Web address", "ওয়েব ঠিকানা"), required: true, placeholder: "660-uc" },
      { name: "amount", label: L("Amount (units / face value)", "পরিমাণ (ইউনিট / মূল্য)"), type: "number" },
      { name: "name_en", label: L("Name (English)", "নাম (ইংরেজি)"), required: true, placeholder: "660 UC" },
      { name: "name_bn", label: L("Name (Bangla)", "নাম (বাংলা)"), required: true },
      { name: "bonus", label: L("Publisher bonus included", "প্রকাশকের বোনাস"), type: "number" },
      { name: "allowed_methods", label: L("Allowed delivery", "অনুমোদিত ডেলিভারি"), type: "select", options: [["direct,code", L("Direct top-up or code", "সরাসরি টপ-আপ বা কোড")], ["direct", L("Direct top-up only", "শুধু সরাসরি টপ-আপ")], ["code", L("Code only", "শুধু কোড")]] },
      { name: "description_en", label: L("Description (English)", "বর্ণনা (ইংরেজি)"), type: "textarea", span: 2, hint: NO_CLAIMS },
      { name: "description_bn", label: L("Description (Bangla)", "বর্ণনা (বাংলা)"), type: "textarea", span: 2 },
      { name: "sort_order", label: L("Order", "ক্রম"), type: "number" },
      { name: "is_popular", label: L("Popular tag", "জনপ্রিয় ট্যাগ"), type: "checkbox" },
      { name: "is_active", label: L("On sale", "বিক্রি চালু"), type: "checkbox", default: 1 },
      { name: "meta_title", label: L("Search title", "সার্চ টাইটেল"), span: 2 },
      { name: "meta_description", label: L("Search description", "সার্চ বর্ণনা"), type: "textarea", rows: 2, span: 2 },
    ],
  },
  commission: {
    endpoint: "/commission",
    perm: "commission",
    deletePerm: "commission.write",
    csv: true,
    title: L("Commission rules", "কমিশনের নিয়ম"),
    intro: L("The most specific rule wins: seller → game + tier → game → tier → default. Rates are basis points: 800 = 8.00 %. The rate is fixed on each order line when it's placed. (ADJUSTABLE — confirm your rates.)", "সবচেয়ে নির্দিষ্ট নিয়ম প্রযোজ্য: সেলার → গেম + টিয়ার → গেম → টিয়ার → ডিফল্ট। হার বেসিস পয়েন্টে: ৮০০ = ৮.০০%। অর্ডারের সময় প্রতিটি লাইনে হার স্থির হয়। (পরিবর্তনযোগ্য — আপনার হার নিশ্চিত করুন।)"),
    nameOf: (r) => `${r.scope} ${r.rate_bps}`,
    filters: [{ name: "scope", label: L("Scope", "পরিধি"), options: [["", ALL], ["default", "default"], ["tier", "tier"], ["game", "game"], ["game_tier", "game + tier"], ["seller", "seller"]] }],
    columns: [
      { label: L("Applies to", "প্রযোজ্য"), render: (r) => html`<b>${r.scope}</b> ${r.game_name ?? ""} ${r.tier ?? ""} ${r.seller_code ? `${r.seller_code} ${r.seller_name}` : ""}` },
      { label: L("Rate", "হার"), render: (r) => `${(r.rate_bps / 100).toFixed(2)} %`, cls: "mono" },
      { label: L("Note", "নোট"), render: (r) => r.note ?? "" },
      { label: L("On", "চালু"), render: (r) => yes(r.is_active) },
    ],
    fields: async () => [
      { name: "scope", label: L("Scope", "পরিধি"), type: "select", options: [["default", L("Default (everything)", "ডিফল্ট (সব)")], ["tier", L("Seller tier", "সেলার টিয়ার")], ["game", L("Game", "গেম")], ["game_tier", L("Game + tier", "গেম + টিয়ার")], ["seller", L("One seller", "একজন সেলার")]] },
      { name: "rate_bps", label: L("Rate (basis points, 800 = 8 %)", "হার (বেসিস পয়েন্ট, ৮০০ = ৮%)"), type: "number", required: true },
      { name: "game_id", label: L("Game", "গেম"), type: "select", numeric: true, allowEmpty: true, options: await gameOptions() },
      { name: "tier", label: L("Tier", "টিয়ার"), type: "select", allowEmpty: true, options: TIERS },
      { name: "seller_id", label: L("Seller", "সেলার"), type: "select", numeric: true, allowEmpty: true, options: await sellerOptions() },
      { name: "note", label: L("Note", "নোট") },
      { name: "is_active", label: L("Active", "সক্রিয়"), type: "checkbox", default: 1 },
    ],
  },
  customers: {
    endpoint: "/customers",
    perm: "customers",
    deletePerm: "customers.write",
    csv: true,
    noCreate: true,
    title: L("Buyers", "ক্রেতা"),
    intro: L("🟢 Trusted — 3+ delivered orders, no chargebacks · 🟡 New · 🔴 Verify — chargeback history or blocked: every order is held for review.", "🟢 বিশ্বস্ত — ৩+ ডেলিভারি, কোনো চার্জব্যাক নেই · 🟡 নতুন · 🔴 যাচাই করুন — চার্জব্যাকের ইতিহাস বা ব্লক: প্রতিটি অর্ডার যাচাইয়ে আটকে থাকে।"),
    nameOf: (r) => r.name,
    filters: [
      { name: "risk_level", label: L("Risk", "ঝুঁকি"), options: [["", L("Everyone", "সবাই")], ["trusted", L("🟢 Trusted", "🟢 বিশ্বস্ত")], ["new", L("🟡 New", "🟡 নতুন")], ["verify", L("🔴 Verify", "🔴 যাচাই করুন")]] },
      { name: "is_blocked", label: L("Status", "অবস্থা"), options: [["", ALL], ["0", L("Active", "চালু")], ["1", L("Blocked", "ব্লক")]] },
    ],
    columns: [
      { label: L("Buyer", "ক্রেতা"), render: (r) => html`<b>${r.name}</b><br><span class="muted small mono">${r.phone}</span>` },
      { label: L("Risk", "ঝুঁকি"), render: (r) => riskBadge(r.risk_level, r.risk_badge, r.risk_reason) },
      { label: L("Paid / delivered", "পেইড / ডেলিভারি"), render: (r) => `${num(r.total_orders)} / ${num(r.delivered_orders)}` },
      { label: L("Spent", "খরচ"), render: (r) => money(r.total_spent), cls: "mono" },
      { label: L("Chargebacks", "চার্জব্যাক"), render: (r) => (r.chargeback_count ? pill("failed", num(r.chargeback_count)) : "0") },
      { label: L("Points", "পয়েন্ট"), render: (r) => num(r.loyalty_points) },
      { label: L("Joined", "যোগদান"), render: (r) => dt(r.created_at) },
    ],
    detail: (r) => html`<h3>${tx("Recent orders", "সাম্প্রতিক অর্ডার")}</h3>${(r.orders ?? []).map((o) => html`<div class="att-row"><a class="att-main" href="#/orders/${o.id}"><b class="mono">${o.order_no}</b> · ${o.status} · ${money(o.total)}</a><span class="small muted">${dt(o.created_at)}</span></div>`)}
      ${(r.player_ids ?? []).length ? html`<h3 style="margin-top:14px">${tx("Saved player IDs", "সংরক্ষিত প্লেয়ার আইডি")}</h3>${r.player_ids.map((p) => html`<div class="small mono">${p.game}: ${p.player_id}${p.server_id ? ` (${p.server_id})` : ""}</div>`)}` : ""}
      ${(r.flags ?? []).length ? html`<h3 style="margin-top:14px">${tx("Risk flags", "ঝুঁকির সতর্কতা")}</h3>${r.flags.map((f) => html`<div class="small">${pill(f.status, f.kind)} ${lang() === "bn" ? f.reason_bn : f.reason_en}</div>`)}` : ""}`,
    fields: async () => [
      { name: "name", label: L("Name", "নাম"), required: true },
      { name: "email", label: L("Email", "ইমেইল"), type: "email" },
      { name: "is_blocked", label: L("Blocked (can't place orders)", "ব্লক (অর্ডার করতে পারবে না)"), type: "checkbox" },
      { name: "admin_note", label: L("Internal note", "অভ্যন্তরীণ নোট"), type: "textarea", span: 2 },
    ],
  },
  reviews: {
    endpoint: "/reviews",
    perm: "reviews",
    writePerm: "reviews.moderate",
    csv: true,
    noCreate: true,
    title: L("Reviews", "রিভিউ"),
    intro: L("Only buyers with a delivered order can rate. Reviews publish at once; hide one by rejecting it (seller ratings update automatically).", "শুধু ডেলিভারি পাওয়া ক্রেতারা রেটিং দিতে পারেন। রিভিউ সাথে সাথে প্রকাশ হয়; বাতিল করে লুকানো যায় (সেলারের রেটিং নিজে আপডেট হয়)।"),
    nameOf: (r) => `${r.name} · ${r.seller_name}`,
    filters: [{ name: "status", label: L("Status", "অবস্থা"), options: [["", ALL], ["approved", L("Published", "প্রকাশিত")], ["pending", L("Pending", "অপেক্ষমাণ")], ["rejected", L("Hidden", "লুকানো")]] }, { name: "rating", label: L("Stars", "তারা"), options: [["", ALL], ...[1, 2, 3, 4, 5].map((n) => [String(n), "★".repeat(n)])] }],
    columns: [
      { label: L("Seller", "সেলার"), render: (r) => html`<b>${r.seller_name}</b><br><span class="muted small">${r.product_name}</span>` },
      { label: L("Rating", "রেটিং"), render: (r) => "★".repeat(r.rating) },
      { label: L("Text", "লেখা"), render: (r) => html`${r.body ?? ""}${r.seller_reply ? html`<br><span class="muted small">↳ ${r.seller_reply}</span>` : ""}` },
      { label: L("Status", "অবস্থা"), render: (r) => pill(r.status === "approved" ? "active" : r.status) },
      { label: L("Date", "তারিখ"), render: (r) => dt(r.created_at) },
    ],
    fields: async () => [{ name: "status", label: L("Status", "অবস্থা"), type: "select", options: [["approved", L("Published", "প্রকাশিত")], ["pending", L("Pending", "অপেক্ষমাণ")], ["rejected", L("Hidden", "লুকানো")]] }],
  },
  staff: {
    endpoint: "/staff",
    perm: "staff",
    writePerm: "staff.manage",
    deletePerm: "staff.manage",
    title: L("Staff & roles", "স্টাফ ও রোল"),
    intro: L("Super Admin: everything. Operations Manager: everything except staff, system settings and permanent deletes. Reviewer: held orders, disputes, applications, reviews — no money decisions. Viewer: read-only. Super Admin and Operations Manager must use two-step sign-in; reviewers and viewers can sign in with phone + SMS code.", "সুপার অ্যাডমিন: সব। অপারেশন ম্যানেজার: স্টাফ, সিস্টেম সেটিংস ও স্থায়ী মুছে ফেলা ছাড়া সব। রিভিউয়ার: আটকে থাকা অর্ডার, বিরোধ, আবেদন, রিভিউ — টাকার সিদ্ধান্ত নয়। ভিউয়ার: শুধু দেখা। সুপার অ্যাডমিন ও অপারেশন ম্যানেজারের দুই-ধাপের সাইন-ইন বাধ্যতামূলক; রিভিউয়ার ও ভিউয়ার ফোন + SMS কোডে সাইন ইন করতে পারেন।"),
    nameOf: (r) => r.name,
    filters: [{ name: "role", label: L("Role", "রোল"), options: [["", ALL], ["super_admin", "Super Admin"], ["ops_manager", "Operations Manager"], ["reviewer", "Reviewer"], ["viewer", "Viewer"]] }],
    columns: [
      { label: L("Name", "নাম"), render: (r) => html`<b>${r.name}</b><br><span class="muted small">${r.email}${r.phone ? ` · ${r.phone}` : ""}</span>` },
      { label: L("Role", "রোল"), render: (r) => r.role.replace("_", " ") },
      { label: "2FA", render: (r) => yes(r.totp_enabled) },
      { label: L("Last sign-in", "শেষ সাইন-ইন"), render: (r) => dt(r.last_login_at, true) },
      { label: L("Active", "সক্রিয়"), render: (r) => yes(r.is_active) },
    ],
    fields: async () => [
      { name: "name", label: L("Name", "নাম"), required: true },
      { name: "email", label: L("Email or username", "ইমেইল বা ইউজারনেম"), required: true },
      { name: "phone", label: L("Mobile (for SMS sign-in)", "মোবাইল (SMS সাইন-ইনের জন্য)") },
      { name: "role", label: L("Role", "রোল"), type: "select", options: [["reviewer", "Reviewer"], ["viewer", "Viewer"], ["ops_manager", "Operations Manager"], ["super_admin", "Super Admin"]] },
      { name: "password", label: L("Password (leave empty to keep)", "পাসওয়ার্ড (খালি রাখলে আগেরটা থাকবে)"), type: "password" },
      { name: "is_active", label: L("Active", "সক্রিয়"), type: "checkbox", default: 1 },
    ],
  },
};

export { tt };
