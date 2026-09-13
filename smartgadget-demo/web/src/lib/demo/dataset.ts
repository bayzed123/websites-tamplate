/**
 * Everything this demo shows, generated rather than hand-written.
 *
 * WHY GENERATED. A demo falls apart on the second click. Hand-written fixtures
 * give you a dashboard saying "৳1,339,260 revenue, 21 orders" beside an order
 * list with four rows and an analytics chart that agrees with neither. A
 * prospect notices, and the thing that was supposed to prove the build works
 * proves the opposite.
 *
 * So the orders are built from the real product list, the totals are summed
 * from the orders, and the charts are summed from the same orders. Every
 * number on every screen traces back to one array. Change a price here and
 * the revenue, the margin and the top-products chart all move together,
 * because they are all reading the same thing.
 *
 * NONE OF IT IS REAL. No product, customer, order, phone number or address
 * below came from a real store. This file IS the database — there is no API
 * behind this demo, which is exactly what makes an admin dashboard with no
 * password safe to publish.
 *
 * Money is in poisha (integer minor units), the way the production build
 * stores it, so formatting and analytics behave as they do in production
 * rather than being quietly simplified for the demo.
 */
import type { AdminOrder, AdminProduct, Category, StoreSettings } from '../types';

/* Seconds, not milliseconds. Every timestamp the real API returns is a unix
   value in SECONDS — src/lib/format.ts multiplies by 1000 before formatting —
   so fixtures in milliseconds render as "just now" forever and as dates tens
   of thousands of years out. */
const DAY = 86_400;
const HOUR = 3_600;
const now = Math.floor(Date.now() / 1000);

/** Deterministic pseudo-random, so every visitor sees the same shop and a
 *  screenshot taken today still matches the site tomorrow. */
let seed = 20260912;
function rnd(): number {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
const between = (lo: number, hi: number) => lo + Math.floor(rnd() * (hi - lo + 1));

export const CATEGORIES: Category[] = [
  { id: 1, slug: 'smartphones', name: 'Smartphones', icon: '📱' },
  { id: 2, slug: 'audio', name: 'Audio', icon: '🎧' },
  { id: 3, slug: 'wearables', name: 'Wearables', icon: '⌚' },
  { id: 4, slug: 'power-charging', name: 'Power & Charging', icon: '⚡' },
  { id: 5, slug: 'computing', name: 'Computing', icon: '💻' },
  { id: 6, slug: 'smart-home', name: 'Smart Home', icon: '🏠' },
  { id: 7, slug: 'cameras', name: 'Cameras', icon: '📷' },
  { id: 8, slug: 'accessories', name: 'Accessories', icon: '🔌' },
];

type Seed = [name: string, brand: string, cat: number, price: number, cost: number, moq: number];

/* Brands and models are invented. Any resemblance to a shipping product is
   incidental — the point is plausible pricing tiers, not a real catalogue. */
const SEEDS: Seed[] = [
  ['Nexora Pulse 5G 128GB', 'Nexora', 1, 18_900_00, 15_200_00, 5],
  ['Nexora Pulse Lite 64GB', 'Nexora', 1, 12_400_00, 9_900_00, 5],
  ['Volt V30 Pro 256GB', 'Volt', 1, 27_500_00, 22_800_00, 3],
  ['Volt V12 Basic', 'Volt', 1, 6_950_00, 5_400_00, 10],
  ['Kestrel K9 Rugged', 'Kestrel', 1, 21_300_00, 17_600_00, 4],
  ['Aurio Buds Air 3', 'Aurio', 2, 2_450_00, 1_680_00, 20],
  ['Aurio Studio Over-Ear', 'Aurio', 2, 5_900_00, 4_100_00, 10],
  ['Boomline Party Speaker 40W', 'Boomline', 2, 7_800_00, 5_600_00, 6],
  ['Boomline Pocket Speaker', 'Boomline', 2, 1_650_00, 1_050_00, 24],
  ['Aurio Neckband Sport', 'Aurio', 2, 1_950_00, 1_280_00, 20],
  ['Chrona Watch S2', 'Chrona', 3, 4_600_00, 3_200_00, 10],
  ['Chrona Band Fit', 'Chrona', 3, 2_100_00, 1_420_00, 20],
  ['Kestrel Trek GPS Watch', 'Kestrel', 3, 8_900_00, 6_700_00, 5],
  ['Voltcell 20000mAh PD', 'Voltcell', 4, 2_850_00, 1_950_00, 15],
  ['Voltcell 10000mAh Slim', 'Voltcell', 4, 1_450_00, 940_00, 25],
  ['Voltcell 65W GaN Charger', 'Voltcell', 4, 2_200_00, 1_480_00, 20],
  ['Voltcell Car Charger Duo', 'Voltcell', 4, 780_00, 470_00, 40],
  ['Meridian Slim 14 i5', 'Meridian', 5, 62_000_00, 54_500_00, 2],
  ['Meridian Book Air 13', 'Meridian', 5, 48_500_00, 42_200_00, 2],
  ['Meridian USB-C Hub 8-in-1', 'Meridian', 5, 3_400_00, 2_250_00, 12],
  ['Hearth Smart Bulb RGB', 'Hearth', 6, 690_00, 410_00, 40],
  ['Hearth Smart Plug 16A', 'Hearth', 6, 950_00, 590_00, 30],
  ['Hearth Door Sensor', 'Hearth', 6, 1_150_00, 720_00, 25],
  ['Lenscape Action Cam 4K', 'Lenscape', 7, 11_900_00, 9_200_00, 4],
  ['Lenscape Webcam 1080p', 'Lenscape', 7, 2_300_00, 1_520_00, 15],
  ['Lenscape Gimbal Mini', 'Lenscape', 7, 6_400_00, 4_800_00, 6],
  ['Braid USB-C Cable 2m', 'Braid', 8, 320_00, 165_00, 60],
  ['Braid Lightning Cable 1m', 'Braid', 8, 380_00, 205_00, 60],
  ['Braid Screen Guard Pack', 'Braid', 8, 240_00, 110_00, 100],
  ['Braid Phone Stand Alloy', 'Braid', 8, 560_00, 310_00, 40],
];

const SPEC_POOL: Record<number, Record<string, string>> = {
  1: { Display: '6.6" AMOLED 120Hz', Battery: '5000 mAh', Charging: '33W wired', SIM: 'Dual nano-SIM', Warranty: '1 year' },
  2: { Driver: '13 mm dynamic', Battery: 'Up to 28 h with case', Bluetooth: '5.3', Rating: 'IPX5', Warranty: '6 months' },
  3: { Display: '1.85" AMOLED', Battery: 'Up to 12 days', Sensors: 'HR, SpO2, GPS', Rating: '5 ATM', Warranty: '1 year' },
  4: { Capacity: 'See title', Output: 'USB-C PD + dual USB-A', Cells: 'Li-polymer', Safety: 'OVP / OCP / OTP', Warranty: '1 year' },
  5: { CPU: '12th gen i5', RAM: '16 GB LPDDR5', Storage: '512 GB NVMe', Display: '14" 2.2K', Warranty: '2 years' },
  6: { Protocol: 'Wi-Fi 2.4 GHz', App: 'iOS and Android', Power: 'AC 220V', Install: 'No hub needed', Warranty: '1 year' },
  7: { Sensor: '1/2.3" CMOS', Video: '4K 60fps', Stabilisation: 'Electronic', Storage: 'microSD up to 256 GB', Warranty: '1 year' },
  8: { Material: 'Braided nylon', Length: 'See title', Current: 'Up to 3A', Compatibility: 'Universal', Warranty: '6 months' },
};

const COLOURS = ['Midnight', 'Graphite', 'Silver', 'Ocean Blue', 'Sand'];

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/* Product images are generated SVG tiles rather than photographs. A demo that
   ships thirty stock photos either infringes something or looks like a stock
   photo gallery; a tile that carries the brand name and the category mark
   reads as a placeholder on purpose, and costs no network request. */
const CAT_TINT: Record<number, [string, string]> = {
  1: ['#1f2b57', '#3b5bdb'], 2: ['#1d3b34', '#2f9e6f'], 3: ['#3a2350', '#7f4bd8'],
  4: ['#4a2c10', '#e8802a'], 5: ['#16323f', '#2f8fb5'], 6: ['#3d2436', '#c2528a'],
  7: ['#22303a', '#5a7f9c'], 8: ['#332f1c', '#9a8b3a'],
};

function tile(name: string, brand: string, catId: number, icon: string): string {
  const [from, to] = CAT_TINT[catId] ?? CAT_TINT[8];
  const line = name.replace(/^\S+\s/, '').slice(0, 22);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="600" height="600" fill="url(#g)"/>` +
    `<text x="300" y="270" font-size="150" text-anchor="middle">${icon}</text>` +
    `<text x="300" y="380" font-family="system-ui,sans-serif" font-size="46" font-weight="700" fill="#fff" text-anchor="middle">${brand}</text>` +
    `<text x="300" y="430" font-family="system-ui,sans-serif" font-size="28" fill="#ffffffcc" text-anchor="middle">${line}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const PRODUCTS: AdminProduct[] = SEEDS.map(([name, brand, catId, price, cost, moq], i) => {
  const category = CATEGORIES.find((c) => c.id === catId)!;
  const stock = between(0, 240);
  const threshold = Math.max(6, Math.round(moq * 1.5));
  const discount = rnd() < 0.35 ? between(5, 22) : 0;
  const compare = discount ? Math.round(price / (1 - discount / 100)) : 0;
  const unitsSold = between(4, 180);
  return {
    id: i + 1,
    sku: `SG-${String(catId).padStart(2, '0')}-${String(i + 1).padStart(3, '0')}`,
    slug: slugify(name),
    name,
    brand,
    category: { slug: category.slug, name: category.name },
    summary: `${brand} ${category.name.toLowerCase()} line. Wholesale tiers from ${moq} units.`,
    description:
      `${name} is stocked by the carton for resellers. Pricing steps down as quantity rises, ` +
      `and every unit is checked before dispatch. Ships nationwide within 48 hours of a confirmed order.`,
    price,
    compare_at_price: compare,
    discount_pct: discount,
    moq,
    stock,
    stock_state: stock === 0 ? 'out' : stock <= threshold ? 'low' : 'ok',
    in_stock: stock > 0,
    image_url: tile(name, brand, catId, category.icon),
    gallery: [tile(name, brand, catId, category.icon), tile(name, brand, catId, '📦')],
    specs: SPEC_POOL[catId] ?? {},
    tags: [category.slug, brand.toLowerCase()],
    featured: i % 7 === 0,
    rating: Number((3.6 + rnd() * 1.3).toFixed(1)),
    review_count: between(2, 46),
    colours: catId <= 3 ? COLOURS.slice(0, between(2, 4)) : [],
    returnable: discount < 20,
    units_sold: unitsSold,
    tiers: [
      { min_qty: moq, unit_price: price },
      { min_qty: moq * 3, unit_price: Math.round(price * 0.94) },
      { min_qty: moq * 8, unit_price: Math.round(price * 0.88) },
    ],
    min_price: Math.round(price * 0.88),
    status: stock === 0 && rnd() < 0.3 ? 'draft' : 'active',
    cost_price: cost,
    profit_per_unit: price - cost,
    margin_pct: Number((((price - cost) / price) * 100).toFixed(1)),
    markup_pct: Number((((price - cost) / cost) * 100).toFixed(1)),
    stock_value: stock * cost,
    retail_value: stock * price,
    low_stock_threshold: threshold,
    category_id: catId,
    created_at: now - between(30, 400) * DAY,
    updated_at: now - between(0, 20) * DAY,
  };
});

const CITIES = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh', 'Savar', 'Gazipur'];
const FIRST = ['Rakib', 'Nusrat', 'Tanvir', 'Sumaiya', 'Imran', 'Farhana', 'Shakil', 'Mitu', 'Anika', 'Jannat', 'Sabbir', 'Rumana'];
const LAST = ['Hasan', 'Akter', 'Islam', 'Rahman', 'Chowdhury', 'Uddin', 'Begum', 'Karim', 'Sheikh', 'Mahmud'];
const STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'delivered', 'delivered', 'returned', 'cancelled'];
const PAYMENTS = ['cod', 'bkash', 'nagad', 'bank'];

export interface DemoOrderItem {
  product_id: number; name: string; sku: string; qty: number; unit_price: number; cost_price: number; line_total: number;
}
export interface DemoOrder extends AdminOrder {
  items: DemoOrderItem[];
  address: string;
  note: string;
  customer_email: string;
}

/** 140 orders across the last 90 days — enough for the charts to have a shape
 *  and for the order list to need its filters, which is the point of showing
 *  them. */
export const ORDERS: DemoOrder[] = Array.from({ length: 140 }, (_, i) => {
  const daysAgo = Math.floor(rnd() * rnd() * 90); // weighted toward recent, like a growing shop
  const created = now - daysAgo * DAY - between(0, 23) * HOUR;
  const lineCount = between(1, 3);
  const items: DemoOrderItem[] = [];
  for (let n = 0; n < lineCount; n++) {
    const p = pick(PRODUCTS);
    if (items.some((it) => it.product_id === p.id)) continue;
    const qty = p.moq * between(1, 4);
    const tier = [...p.tiers].reverse().find((t) => qty >= t.min_qty) ?? p.tiers[0];
    items.push({
      product_id: p.id, name: p.name, sku: p.sku, qty,
      unit_price: tier.unit_price, cost_price: p.cost_price, line_total: tier.unit_price * qty,
    });
  }
  const subtotal = items.reduce((s, it) => s + it.line_total, 0);
  const costTotal = items.reduce((s, it) => s + it.cost_price * it.qty, 0);
  const city = pick(CITIES);
  const shipping = city === 'Dhaka' ? 60_00 : 120_00;
  const discount = rnd() < 0.18 ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal - discount + shipping;
  const status = daysAgo < 2 ? pick(['pending', 'confirmed']) : pick(STATUSES);
  const name = `${pick(FIRST)} ${pick(LAST)}`;
  const booked = ['shipped', 'delivered', 'returned'].includes(status);
  return {
    id: 1000 + i,
    order_no: `SG-${String(24_000 + i)}`,
    invoice_no: `INV-${String(24_000 + i)}`,
    customer_name: name,
    customer_phone: `018${between(10, 99)}${between(100000, 999999)}`,
    customer_email: `${name.split(' ')[0].toLowerCase()}${between(10, 99)}@example.com`,
    city,
    address: `House ${between(1, 90)}, Road ${between(1, 20)}, ${city}`,
    delivery_zone: city === 'Dhaka' ? 'inside-dhaka' : 'outside-dhaka',
    status,
    subtotal, discount, shipping, tax: 0, total,
    cost_total: costTotal,
    profit: subtotal - discount - costTotal,
    margin_pct: subtotal ? Number((((subtotal - discount - costTotal) / subtotal) * 100).toFixed(1)) : 0,
    payment_method: pick(PAYMENTS),
    payment_reference: rnd() < 0.5 ? `TRX${between(100000, 999999)}` : '',
    created_at: created,
    units: items.reduce((s, it) => s + it.qty, 0),
    courier: booked ? 'Steadfast' : '',
    consignment_id: booked ? String(between(7_000_000, 7_999_999)) : '',
    tracking_code: booked ? `SF${between(100000, 999999)}` : '',
    courier_status: booked ? (status === 'delivered' ? 'delivered' : status === 'returned' ? 'returned' : 'in_review') : '',
    items,
    note: rnd() < 0.2 ? 'Please call before delivery.' : '',
  } as DemoOrder;
}).sort((a, b) => b.created_at - a.created_at);

export const SETTINGS: StoreSettings & Record<string, unknown> = {
  currency: 'BDT',
  currency_symbol: '৳',
  store_name: 'SmartGadget',
  legal_name: 'SmartGadget Demo Store',
  store_tagline: 'Wholesale gadgets, factory direct',
  /* Placeholders on purpose. This build takes no payment and receives no
     mail — a real number here would collect calls for a shop that does not
     exist. */
  bkash_number: '01XXXXXXXXX (demo)',
  nagad_number: '01XXXXXXXXX (demo)',
  rocket_number: '01XXXXXXXXX (demo)',
  bank_details: 'Demo Bank · A/C 0000 0000 0000 · Demo Branch',
  order_whatsapp: '',
  whatsapp_number: '',
  support_whatsapp_url: '',
  support_phone: '',
  support_email: '',
  store_address: 'Demonstration build — no physical address',
  shipping_dhaka: 60_00,
  shipping_outside: 120_00,
  free_shipping_over: 15_000_00,
  tax_pct: 0,
  owner_name: 'SmartGadget',
  credit_dev_name: 'Sayad Bayezid',
  credit_dev_url: 'https://sayadbayezid.com',
  /* Left empty on purpose: the footer prints "Dev" and "Developer" as two
     separate credits, and filling both with the same name reads as a bug. */
  credit_author_name: '',
  credit_author_url: '',
  facebook_url: '',
  hero_banner_url: '',
};

export interface DemoCustomer {
  id: number; name: string; phone: string; email: string; address: string; city: string;
  created_at: number; last_login_at: number | null; active: number;
  orders: number; spent: number; last_order_at: number | null;
}

/** Customers derived from the orders, so the count and the spend agree with
 *  the order list rather than being a second invented number. */
export const CUSTOMERS: DemoCustomer[] = (() => {
  const byPhone = new Map<string, DemoCustomer>();
  ORDERS.forEach((o) => {
    const found = byPhone.get(o.customer_phone);
    if (found) {
      found.orders += 1;
      found.spent += o.total;
      found.last_order_at = Math.max(found.last_order_at ?? 0, o.created_at);
    } else {
      byPhone.set(o.customer_phone, {
        id: byPhone.size + 1,
        name: o.customer_name,
        phone: o.customer_phone,
        email: o.customer_email,
        address: o.address,
        city: o.city,
        created_at: o.created_at - between(1, 200) * DAY,
        last_login_at: rnd() < 0.6 ? o.created_at : null,
        active: 1,
        orders: 1,
        spent: o.total,
        last_order_at: o.created_at,
      });
    }
  });
  return [...byPhone.values()].sort((a, b) => b.spent - a.spent);
})();

const REVIEW_BODIES = [
  'Arrived sealed and on time. Reselling these with no complaints so far.',
  'Good margin at the second tier. Will order a larger carton next month.',
  'One unit had a scuff on the box, the product itself was fine.',
  'Packaging is solid enough for courier handling. No returns yet.',
  'Stock moved in under two weeks. Reordering.',
  'Courier took three days outside Dhaka, which is what they quoted.',
];

export interface DemoReview {
  id: number; rating: number; comment: string; customer_name: string; customer_phone: string;
  visible: number; created_at: number; product_id: number; product_name: string;
  product_slug: string; order_no: string | null;
}

export const REVIEWS: DemoReview[] = PRODUCTS.flatMap((p, i) =>
  Array.from({ length: i % 3 === 0 ? 2 : 1 }, (_, n) => {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    return {
      id: i * 10 + n + 1,
      rating: between(3, 5),
      comment: pick(REVIEW_BODIES),
      customer_name: name,
      customer_phone: `018${between(10, 99)}${between(100000, 999999)}`,
      /* A couple held back, so the Reviews screen has something in its
         "hidden" tab and the approve/hide control has an effect to show. */
      visible: (i + n) % 9 === 0 ? 0 : 1,
      created_at: now - between(1, 70) * DAY,
      product_id: p.id,
      product_name: p.name,
      product_slug: p.slug,
      order_no: rnd() < 0.7 ? pick(ORDERS).order_no : null,
    };
  }),
);

export interface DemoBanner {
  id: number; title: string; subtitle: string; image_url: string; link_url: string;
  cta_label: string; placement: 'popup' | 'home' | 'both'; active: number; sort_order: number;
}

export const BANNERS: DemoBanner[] = [
  {
    id: 1, title: 'Carton pricing on audio', subtitle: 'Second tier starts at 60 units',
    image_url: '', link_url: '/catalog?category=audio', cta_label: 'See audio',
    placement: 'home', active: 1, sort_order: 1,
  },
  {
    id: 2, title: 'Ships in 48 hours', subtitle: 'Nationwide courier, cash on delivery',
    image_url: '', link_url: '/catalog', cta_label: 'Browse everything',
    placement: 'both', active: 1, sort_order: 2,
  },
  {
    id: 3, title: 'New reseller? Start at tier one', subtitle: 'No minimum order value — only the per-line MOQ',
    image_url: '', link_url: '/catalog?sort=discount', cta_label: 'See the deals',
    placement: 'popup', active: 1, sort_order: 3,
  },
];

export interface DemoPage {
  id: number; slug: string; title: string; section: string; summary: string; body: string;
  sort_order: number; published: number; updated_at: number;
}

export const PAGES: DemoPage[] = [
  {
    id: 1, slug: 'about', title: 'About SmartGadget', section: 'company',
    summary: 'Who this shop is and what it stocks.',
    body:
      'SmartGadget supplies phones, audio, wearables, power and accessories to resellers across Bangladesh at wholesale tiers.\n\n' +
      'This is a demonstration build. Every product, price, order, customer and review on this site was generated for the demo — none of it is a real trading record.',
    sort_order: 1, published: 1, updated_at: now - 20 * DAY,
  },
  {
    id: 2, slug: 'returns', title: 'Returns policy', section: 'policy',
    summary: 'Seven days on sealed units.',
    body: 'Sealed units may be returned within 7 days if unopened and undamaged. Clearance lines are marked non-returnable on the product page itself, before the item reaches the cart.',
    sort_order: 2, published: 1, updated_at: now - 40 * DAY,
  },
  {
    id: 3, slug: 'shipping', title: 'Shipping', section: 'policy',
    summary: 'Rates and dispatch times.',
    body: 'Inside Dhaka ৳60. Outside Dhaka ৳120. Free over ৳15,000. Dispatch within 48 hours of a confirmed order, by nationwide courier.',
    sort_order: 3, published: 1, updated_at: now - 55 * DAY,
  },
  {
    id: 4, slug: 'privacy', title: 'Privacy', section: 'policy',
    summary: 'What this demo does and does not store.',
    body: 'This demonstration build has no server and no database. Nothing you type into it leaves your browser, and nothing is retained once you close the tab.',
    sort_order: 4, published: 1, updated_at: now - 55 * DAY,
  },
];

export interface DemoPost {
  id: number; slug: string; title: string; excerpt: string; body: string; cover_url: string;
  author: string; tags: string; published: number; published_at: number; updated_at: number;
}

export const POSTS: DemoPost[] = [
  {
    id: 1, slug: 'choosing-wholesale-tiers',
    title: 'How to choose a wholesale tier that actually pays',
    excerpt: 'The second tier is usually where the margin is. The third is usually where the cash-flow problem is.',
    body:
      'Buying deeper lowers the unit price and raises the amount of money sitting on a shelf. Both are true at once, and only one of them shows up on the price list.\n\n' +
      'A worked example. A line at ৳2,450 drops to ৳2,303 at three cartons and ৳2,156 at eight. The eight-carton step looks like the obvious win — 12% off — until you notice it ties up four times the cash for a line that turns over twice a month.\n\n' +
      'The test is not the discount. It is how many days of stock the step buys you. Anything past sixty days of cover is a loan to your supplier at your own expense.',
    cover_url: '', author: 'SmartGadget', tags: 'wholesale,pricing', published: 1,
    published_at: now - 12 * DAY, updated_at: now - 12 * DAY,
  },
  {
    id: 2, slug: 'cash-on-delivery-returns',
    title: 'Cash on delivery and the return rate nobody budgets for',
    excerpt: 'COD is what customers want and what quietly eats the margin. Here is the arithmetic.',
    body:
      'A return rate around 12% on COD orders is normal in this market. The parcel goes out, the courier fee is spent, and the item comes back to a shelf it already left.\n\n' +
      'On a ৳2,000 order with ৳120 delivery, a returned parcel costs the delivery out and, on most courier contracts, the delivery back. That is ৳240 against the margin of the orders that did stick.\n\n' +
      'Two things move the number more than anything else: a confirmation call before dispatch, and a product page honest enough that nobody is surprised by what arrives.',
    cover_url: '', author: 'SmartGadget', tags: 'operations,cod', published: 1,
    published_at: now - 34 * DAY, updated_at: now - 30 * DAY,
  },
  {
    id: 3, slug: 'stock-that-stopped-moving',
    title: 'What to do with stock that stopped moving',
    excerpt: 'Dead stock is not a storage problem. It is money you already spent, sitting still.',
    body:
      'The Inventory screen in this dashboard lists lines with stock that has not moved. That list is the most expensive page in any shop.\n\n' +
      'Clearing it at cost is not a loss — the loss already happened when the stock was bought. Holding it at full price to avoid admitting that is the second loss.',
    cover_url: '', author: 'SmartGadget', tags: 'inventory', published: 1,
    published_at: now - 58 * DAY, updated_at: now - 58 * DAY,
  },
];

export interface DemoPress {
  id: number; title: string; outlet: string; url: string; thumbnail_url: string;
  excerpt: string; published_at: number; visible: number; sort_order: number;
}

export const PRESS: DemoPress[] = [
  {
    id: 1, title: 'Reseller platforms grow across Dhaka', outlet: 'Demo Business Weekly',
    url: '', thumbnail_url: '',
    excerpt: 'An illustrative press entry. The outlet, the headline and the quote are all invented for this demonstration.',
    published_at: now - 70 * DAY, visible: 1, sort_order: 1,
  },
  {
    id: 2, title: 'Wholesale gadget trade moves online', outlet: 'Demo Tech Review',
    url: '', thumbnail_url: '',
    excerpt: 'A second placeholder entry, here to show how the press section lays out with more than one item in it.',
    published_at: now - 130 * DAY, visible: 1, sort_order: 2,
  },
];

export interface DemoStaff {
  id: number; username: string | null; name: string; email: string;
  role: 'owner' | 'admin' | 'staff'; active: boolean; created_at: number;
  last_login_at: number | null; has_security_question: boolean;
}

export const STAFF: DemoStaff[] = [
  { id: 1, username: 'owner', name: 'Store Owner', email: 'owner@smartgadget.demo', role: 'owner', active: true, created_at: now - 300 * DAY, last_login_at: now - 2 * HOUR, has_security_question: true },
  { id: 2, username: 'manager', name: 'Shop Manager', email: 'manager@smartgadget.demo', role: 'admin', active: true, created_at: now - 120 * DAY, last_login_at: now - 26 * HOUR, has_security_question: true },
  { id: 3, username: 'sales', name: 'Salesperson', email: 'sales@smartgadget.demo', role: 'staff', active: true, created_at: now - 45 * DAY, last_login_at: now - 5 * DAY, has_security_question: false },
  { id: 4, username: 'packer', name: 'Packing Desk', email: 'packing@smartgadget.demo', role: 'staff', active: false, created_at: now - 200 * DAY, last_login_at: null, has_security_question: false },
];

const AUDIT_ACTIONS: [string, string, string][] = [
  ['product.update', 'product', 'Price changed'],
  ['order.status', 'order', 'Moved to shipped'],
  ['stock.adjust', 'product', 'Stock adjusted after count'],
  ['settings.update', 'settings', 'Shipping rate updated'],
  ['review.hide', 'review', 'Review hidden'],
  ['content.update', 'page', 'Returns policy edited'],
];

export const AUDIT = Array.from({ length: 40 }, (_, i) => {
  const [action, entity, detail] = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length];
  return {
    id: 500 - i,
    actor: pick(['owner', 'manager', 'sales']),
    action,
    entity,
    entity_id: String(between(1, 60)),
    detail,
    created_at: now - i * between(2, 20) * HOUR,
  };
});

export const MOVEMENTS = PRODUCTS.slice(0, 14).map((p, i) => ({
  id: i + 1,
  product_id: p.id,
  name: p.name,
  sku: p.sku,
  delta: i % 3 === 0 ? -between(5, 40) : between(20, 120),
  reason: i % 3 === 0 ? 'order' : 'restock',
  ref_type: i % 3 === 0 ? 'order' : 'manual',
  ref_id: null,
  balance_after: p.stock,
  unit_cost: p.cost_price,
  note: i % 3 === 0 ? 'Sold' : 'Carton received',
  actor: pick(['owner', 'manager']),
  created_at: now - between(1, 40) * DAY,
}));
