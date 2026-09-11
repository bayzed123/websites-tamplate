/**
 * SmartGadget demo — every product, order, customer and metric on this site.
 *
 * All of it is invented. No record here came from a real store, a real
 * customer or a real order, and nothing in this demo talks to a database:
 * this file IS the database. That is what makes an admin dashboard with no
 * password safe to publish — there is nothing behind it to protect.
 *
 * Money is in poisha (integer minor units), the way the real build stores it,
 * so the formatting and the analytics conversion behave exactly as they do in
 * production rather than being quietly simplified for the demo.
 */

export const STORE = {
  name: 'SmartGadget',
  tagline: 'Wholesale gadgets, priced by the carton',
  blurb: 'Phones, audio, wearables and accessories at wholesale tiers. Live stock, volume pricing, 48-hour dispatch across Bangladesh.',
  phone: '+8801700000000',
  email: 'hello@smartgadget.example',
  address: 'Demo House, Tangail, Bangladesh',
  currency: 'BDT',
};

export const CATEGORIES = [
  { slug: 'phones', name: 'Phones', icon: '📱' },
  { slug: 'audio', name: 'Audio', icon: '🎧' },
  { slug: 'wearables', name: 'Wearables', icon: '⌚' },
  { slug: 'power', name: 'Power', icon: '🔋' },
  { slug: 'accessories', name: 'Accessories', icon: '🔌' },
];

/** tiers: buy this many or more, pay this much each. Poisha. */
export const PRODUCTS = [
  {
    id: 'sg-101', slug: 'aurora-buds-pro', name: 'Aurora Buds Pro', category: 'audio',
    price: 189000, mrp: 249000, stock: 240, rating: 4.7, reviews: 128, badge: 'Best seller',
    blurb: 'Active noise cancelling earbuds with a 36-hour case and low-latency game mode.',
    specs: { Driver: '11 mm', Battery: '8 h + 28 h case', Bluetooth: '5.3', Water: 'IPX5' },
    tiers: [{ qty: 10, price: 172000 }, { qty: 50, price: 161000 }, { qty: 200, price: 152000 }],
  },
  {
    id: 'sg-102', slug: 'nimbus-5g-handset', name: 'Nimbus 5G Handset', category: 'phones',
    price: 2149000, mrp: 2399000, stock: 62, rating: 4.5, reviews: 47, badge: 'New',
    blurb: '6.7-inch 120 Hz display, 5000 mAh, 8 GB / 256 GB. Dual SIM, warranty-backed.',
    specs: { Display: '6.7" AMOLED 120 Hz', Chip: 'Octa-core 5G', Memory: '8 GB / 256 GB', Battery: '5000 mAh' },
    tiers: [{ qty: 5, price: 2065000 }, { qty: 20, price: 1995000 }],
  },
  {
    id: 'sg-103', slug: 'pulse-watch-s2', name: 'Pulse Watch S2', category: 'wearables',
    price: 345000, mrp: 449000, stock: 180, rating: 4.4, reviews: 89,
    blurb: 'AMOLED fitness watch with SpO2, 14-day battery and 120 workout modes.',
    specs: { Display: '1.43" AMOLED', Battery: '14 days', Sensors: 'HR, SpO2, SleepTrack', Water: '5 ATM' },
    tiers: [{ qty: 10, price: 318000 }, { qty: 60, price: 296000 }],
  },
  {
    id: 'sg-104', slug: 'voltcore-20k', name: 'VoltCore 20K Power Bank', category: 'power',
    price: 159000, mrp: 199000, stock: 410, rating: 4.6, reviews: 212, badge: 'Bulk favourite',
    blurb: '20,000 mAh, 22.5 W fast charge, three outputs, airline-safe cell certification.',
    specs: { Capacity: '20000 mAh', Output: '22.5 W PD', Ports: 'USB-C + 2× USB-A', Weight: '390 g' },
    tiers: [{ qty: 20, price: 144000 }, { qty: 100, price: 133000 }, { qty: 500, price: 126000 }],
  },
  {
    id: 'sg-105', slug: 'echo-soundbar-mini', name: 'Echo Soundbar Mini', category: 'audio',
    price: 425000, mrp: 549000, stock: 95, rating: 4.3, reviews: 61,
    blurb: '40 W 2.1 channel bar with wireless subwoofer, optical and Bluetooth in.',
    specs: { Power: '40 W RMS', Channels: '2.1', Inputs: 'Optical, AUX, BT 5.0', Sub: 'Wireless 6"' },
    tiers: [{ qty: 6, price: 398000 }, { qty: 24, price: 372000 }],
  },
  {
    id: 'sg-106', slug: 'gridline-usbc-hub', name: 'Gridline 8-in-1 USB-C Hub', category: 'accessories',
    price: 289000, mrp: 349000, stock: 320, rating: 4.5, reviews: 154,
    blurb: 'HDMI 4K60, gigabit ethernet, SD/TF, 100 W pass-through charging.',
    specs: { Video: 'HDMI 4K60', Network: 'Gigabit', Card: 'SD + microSD', Power: '100 W PD' },
    tiers: [{ qty: 15, price: 268000 }, { qty: 75, price: 249000 }],
  },
  {
    id: 'sg-107', slug: 'lumen-ringlight-18', name: 'Lumen 18" Ring Light', category: 'accessories',
    price: 375000, mrp: 469000, stock: 68, rating: 4.2, reviews: 38,
    blurb: 'Bi-colour 3000–6000 K, remote, phone cradle and 2 m adjustable stand.',
    specs: { Size: '18 inch', Colour: '3000–6000 K', Control: 'Remote + dial', Stand: '2 m' },
    tiers: [{ qty: 8, price: 349000 }, { qty: 30, price: 328000 }],
  },
  {
    id: 'sg-108', slug: 'trailmate-earbuds', name: 'TrailMate Sport Earbuds', category: 'audio',
    price: 119000, mrp: 159000, stock: 0, rating: 4.1, reviews: 73, badge: 'Restocking',
    blurb: 'Ear-hook sport fit, IPX7, 9-hour play. Back in stock next container.',
    specs: { Fit: 'Ear hook', Battery: '9 h + 27 h', Water: 'IPX7', Bluetooth: '5.2' },
    tiers: [{ qty: 20, price: 108000 }, { qty: 120, price: 99000 }],
  },
];

export const ORDERS = [
  { id: 'SG-24817', customer: 'Rafiq Traders', phone: '+8801700000011', city: 'Dhaka', items: 3, qty: 64, total: 11_264_000, status: 'Delivered', courier: 'Steadfast', placed: '2026-09-02', paid: 'Paid' },
  { id: 'SG-24818', customer: 'Nabila Electronics', phone: '+8801700000012', city: 'Chattogram', items: 2, qty: 120, total: 17_040_000, status: 'In transit', courier: 'Steadfast', placed: '2026-09-04', paid: 'Paid' },
  { id: 'SG-24819', customer: 'Tangail Mobile Zone', phone: '+8801700000013', city: 'Tangail', items: 5, qty: 210, total: 28_930_000, status: 'Packed', courier: 'Pathao', placed: '2026-09-06', paid: 'COD' },
  { id: 'SG-24820', customer: 'Sylhet Gadget Bari', phone: '+8801700000014', city: 'Sylhet', items: 1, qty: 24, total: 8_928_000, status: 'Pending', courier: '—', placed: '2026-09-08', paid: 'Unpaid' },
  { id: 'SG-24821', customer: 'Khulna Digital', phone: '+8801700000015', city: 'Khulna', items: 4, qty: 88, total: 13_376_000, status: 'Pending', courier: '—', placed: '2026-09-09', paid: 'COD' },
  { id: 'SG-24822', customer: 'Rajshahi Retail Co', phone: '+8801700000016', city: 'Rajshahi', items: 2, qty: 40, total: 6_440_000, status: 'Returned', courier: 'Steadfast', placed: '2026-08-28', paid: 'Refunded' },
];

export const CUSTOMERS = [
  { name: 'Rafiq Traders', phone: '+8801700000011', city: 'Dhaka', orders: 14, spent: 142_600_000, since: '2024-03-11', tier: 'Wholesale' },
  { name: 'Nabila Electronics', phone: '+8801700000012', city: 'Chattogram', orders: 9, spent: 98_400_000, since: '2024-07-02', tier: 'Wholesale' },
  { name: 'Tangail Mobile Zone', phone: '+8801700000013', city: 'Tangail', orders: 21, spent: 211_050_000, since: '2023-11-19', tier: 'Distributor' },
  { name: 'Sylhet Gadget Bari', phone: '+8801700000014', city: 'Sylhet', orders: 4, spent: 31_700_000, since: '2025-06-08', tier: 'Retail' },
  { name: 'Khulna Digital', phone: '+8801700000015', city: 'Khulna', orders: 7, spent: 62_900_000, since: '2025-01-24', tier: 'Wholesale' },
];

/** Fourteen days of shop numbers, for the dashboard charts. */
export const DAILY = [
  { day: '29 Aug', orders: 6, revenue: 8_120_000, visitors: 412 },
  { day: '30 Aug', orders: 9, revenue: 12_640_000, visitors: 508 },
  { day: '31 Aug', orders: 7, revenue: 9_380_000, visitors: 447 },
  { day: '1 Sep', orders: 11, revenue: 15_900_000, visitors: 596 },
  { day: '2 Sep', orders: 13, revenue: 19_240_000, visitors: 655 },
  { day: '3 Sep', orders: 8, revenue: 10_480_000, visitors: 471 },
  { day: '4 Sep', orders: 12, revenue: 17_850_000, visitors: 620 },
  { day: '5 Sep', orders: 15, revenue: 22_310_000, visitors: 708 },
  { day: '6 Sep', orders: 14, revenue: 20_770_000, visitors: 681 },
  { day: '7 Sep', orders: 10, revenue: 13_960_000, visitors: 534 },
  { day: '8 Sep', orders: 16, revenue: 24_180_000, visitors: 742 },
  { day: '9 Sep', orders: 18, revenue: 27_640_000, visitors: 803 },
  { day: '10 Sep', orders: 13, revenue: 18_920_000, visitors: 659 },
  { day: '11 Sep', orders: 17, revenue: 25_470_000, visitors: 771 },
];

export const REVIEWS = [
  { product: 'sg-101', name: 'Imran H.', stars: 5, when: '4 days ago', body: 'Ordered 50 pieces for the shop. Packaging was tight and every unit paired first try.' },
  { product: 'sg-104', name: 'Shirin A.', stars: 5, when: '1 week ago', body: 'Charges a phone three times over. My customers keep coming back for these.' },
  { product: 'sg-103', name: 'Mahfuz R.', stars: 4, when: '2 weeks ago', body: 'Battery is genuinely two weeks. Strap quality could be a little better.' },
];

/** Poisha → "৳4,250" */
export function money(poisha) {
  return '৳' + (Math.round(poisha) / 100).toLocaleString('en-BD', { maximumFractionDigits: 0 });
}

/** The unit price for a given quantity, walking the wholesale tiers down. */
export function tierPrice(product, qty) {
  let price = product.price;
  for (const tier of product.tiers || []) if (qty >= tier.qty) price = tier.price;
  return price;
}
