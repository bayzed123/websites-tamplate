/**
 * Static demo layer for the Rinova admin dashboard.
 *
 * The dashboard is the real build, copied unchanged from the rinovabd.com
 * repository. What it normally talks to is a Cloudflare Worker with a D1
 * database, and this hub is a static host — so without this file every panel
 * would either sit behind a login nobody can pass or render an error.
 *
 * Two jobs:
 *   1. Sign the visitor in. No password: a client opening the link should land
 *      on the dashboard, not on a form whose credentials they have to be told.
 *   2. Answer /api/* with believable, entirely fictional data so the screens
 *      show a working shop rather than empty tables.
 *
 * Nothing here reaches rinovabd.com. The real dashboard resolves its API at the
 * page's own origin (`/api`), which on this host does not exist; this
 * intercepts those calls before they leave the browser. Writes are accepted and
 * discarded so buttons feel alive without pretending to persist.
 *
 * Every name, phone number and address below is invented for the demo.
 */
(function () {
  'use strict';

  // Load-bearing: app.js boot() shows the login screen unless a token is
  // already in sessionStorage. Seeding one is what removes the password step.
  try { sessionStorage.setItem('rinova-admin-token', 'static-demo'); } catch (e) { /* private mode */ }

  var DAY = 86400000;
  var now = Date.now();
  var iso = function (daysAgo) { return new Date(now - daysAgo * DAY).toISOString(); };
  var taka = function (n) { return Math.round(n); };

  var PRODUCTS = [
    { id: 1, sku: 'RNV-CLN-001', slug: 'gentle-foaming-cleanser', name: 'Gentle Foaming Cleanser 150ml', categoryName: 'Cleanser', price: 690, costPrice: 405, stock: 132, lowStockThreshold: 20, status: 'active' },
    { id: 2, sku: 'RNV-SRM-014', slug: 'niacinamide-serum', name: 'Niacinamide 10% Serum 30ml', categoryName: 'Serum', price: 1150, costPrice: 640, stock: 74, lowStockThreshold: 25, status: 'active' },
    { id: 3, sku: 'RNV-MST-006', slug: 'ceramide-moisturiser', name: 'Ceramide Repair Moisturiser 50ml', categoryName: 'Moisturiser', price: 1390, costPrice: 810, stock: 12, lowStockThreshold: 20, status: 'active' },
    { id: 4, sku: 'RNV-SUN-002', slug: 'daily-sunscreen-spf50', name: 'Daily Sunscreen SPF 50+ PA++++', categoryName: 'Sun care', price: 980, costPrice: 560, stock: 208, lowStockThreshold: 40, status: 'active' },
    { id: 5, sku: 'RNV-LIP-009', slug: 'tinted-lip-balm', name: 'Tinted Lip Balm — Rosewood', categoryName: 'Lip care', price: 420, costPrice: 205, stock: 6, lowStockThreshold: 15, status: 'active' },
    { id: 6, sku: 'RNV-MSK-003', slug: 'clay-detox-mask', name: 'Clay Detox Mask 100g', categoryName: 'Mask', price: 760, costPrice: 430, stock: 0, lowStockThreshold: 10, status: 'draft' },
    { id: 7, sku: 'RNV-TON-011', slug: 'hydrating-toner', name: 'Hydrating Rose Toner 200ml', categoryName: 'Toner', price: 640, costPrice: 355, stock: 96, lowStockThreshold: 20, status: 'active' },
    { id: 8, sku: 'RNV-OIL-005', slug: 'rosehip-facial-oil', name: 'Rosehip Facial Oil 30ml', categoryName: 'Serum', price: 1290, costPrice: 720, stock: 38, lowStockThreshold: 15, status: 'active' }
  ];

  var STATUSES = ['pending', 'confirmed', 'packed', 'shipped', 'delivered', 'delivered', 'cancelled', 'returned'];
  var BUYERS = [
    ['Nusrat Jahan', '01711000101', 'House 12, Road 4, Uposhohor', 'Rajshahi'],
    ['Tanvir Ahmed', '01711000102', 'Flat 3B, Shaheb Bazar', 'Rajshahi'],
    ['Sadia Islam', '01711000103', 'Kazla, near RU gate', 'Rajshahi'],
    ['Mehedi Hasan', '01711000104', 'Block C, Mirpur 10', 'Dhaka'],
    ['Farhana Akter', '01711000105', 'Kotwali, Station Road', 'Chattogram'],
    ['Rakibul Islam', '01711000106', 'Boalia, Greater Road', 'Rajshahi'],
    ['Sumaiya Khatun', '01711000107', 'Zindabazar', 'Sylhet'],
    ['Imran Kabir', '01711000108', 'Motihar, Budhpara', 'Rajshahi'],
    ['Anika Rahman', '01711000109', 'Dhanmondi 27', 'Dhaka'],
    ['Jubair Hossain', '01711000110', 'Shalbagan', 'Rajshahi'],
    ['Ruma Parvin', '01711000111', 'New Market area', 'Rajshahi'],
    ['Shakil Mahmud', '01711000112', 'Uttara Sector 7', 'Dhaka']
  ];

  var ORDERS = BUYERS.map(function (buyer, i) {
    var subtotal = taka(690 + (i * 237) % 2600);
    var discount = i % 4 === 0 ? taka(subtotal * 0.1) : 0;
    return {
      id: 1000 + i,
      orderCode: 'RNV' + (24010 + i),
      invoiceNumber: 'INV-' + (24010 + i),
      name: buyer[0], phone: buyer[1], address: buyer[2], district: buyer[3],
      status: STATUSES[i % STATUSES.length],
      paymentMethod: i % 3 === 0 ? 'bKash' : 'Cash on delivery',
      paymentStatus: i % 3 === 0 ? 'paid' : 'due',
      courierStatus: ['', 'in_review', 'delivered', 'pending'][i % 4],
      subtotal: subtotal, discount: discount,
      deliveryFee: buyer[3] === 'Rajshahi' ? 60 : 120,
      offerCode: discount ? 'GLOW10' : '',
      customerNote: i % 5 === 0 ? 'Please call before delivery.' : '',
      createdAt: iso(i * 1.5)
    };
  });

  var revenue = ORDERS.filter(function (o) { return o.status !== 'cancelled' && o.status !== 'returned'; })
    .reduce(function (sum, o) { return sum + o.subtotal - o.discount + o.deliveryFee; }, 0);
  var stockUnits = PRODUCTS.reduce(function (s, p) { return s + p.stock; }, 0);
  var stockCost = PRODUCTS.reduce(function (s, p) { return s + p.stock * p.costPrice; }, 0);
  var stockRetail = PRODUCTS.reduce(function (s, p) { return s + p.stock * p.price; }, 0);

  var OVERVIEW = {
    revenue: { revenue: revenue, orders: ORDERS.length },
    grossProfit: taka(revenue * 0.42),
    stock: {
      units: stockUnits, costValue: stockCost, retailValue: stockRetail,
      needsRestock: PRODUCTS.filter(function (p) { return p.stock <= p.lowStockThreshold; }).length
    },
    pipeline: STATUSES.filter(function (s, i, a) { return a.indexOf(s) === i; }).map(function (s) {
      return { status: s, count: ORDERS.filter(function (o) { return o.status === s; }).length };
    }),
    topProducts: PRODUCTS.slice(0, 5).map(function (p, i) {
      return { sku: p.sku, name: p.name, units: 48 - i * 7, revenue: (48 - i * 7) * p.price };
    })
  };

  var CATEGORIES = ['Cleanser', 'Serum', 'Moisturiser', 'Sun care', 'Lip care', 'Mask', 'Toner']
    .map(function (name, i) { return { id: i + 1, name: name, slug: name.toLowerCase().replace(/ /g, '-'), productCount: 1 + (i % 3) }; });

  var CUSTOMERS = BUYERS.slice(0, 8).map(function (b, i) {
    return { id: i + 1, name: b[0], phone: b[1], district: b[3], orders: 1 + (i % 5), spent: taka(900 + i * 640), createdAt: iso(30 + i * 3) };
  });

  var NOTIFICATIONS = [
    { id: 1, title: 'Low stock: Tinted Lip Balm — Rosewood', body: '6 left, below the threshold of 15.', read: 0, createdAt: iso(0.2) },
    { id: 2, title: 'New order RNV24021', body: 'Cash on delivery, Rajshahi.', read: 0, createdAt: iso(0.6) },
    { id: 3, title: 'Return requested on RNV24017', body: 'Customer reports a damaged seal.', read: 1, createdAt: iso(2) }
  ];

  var REVIEWS = [
    { id: 1, productName: PRODUCTS[1].name, customerName: 'Nusrat Jahan', rating: 5, body: 'Skin felt calmer within a week.', status: 'pending', createdAt: iso(1) },
    { id: 2, productName: PRODUCTS[3].name, customerName: 'Mehedi Hasan', rating: 4, body: 'No white cast, good for daily use.', status: 'approved', createdAt: iso(4) },
    { id: 3, productName: PRODUCTS[0].name, customerName: 'Sadia Islam', rating: 5, body: 'Gentle enough for morning and night.', status: 'approved', createdAt: iso(7) }
  ];

  var SETTINGS = {
    storeName: 'Rinova BD', supportPhone: '01711000100', supportEmail: 'hello@rinova.example',
    address: 'Shaheb Bazar, Rajshahi', currency: 'BDT', freeDeliveryOver: 1500,
    deliveryInside: 60, deliveryOutside: 120, bkashNumber: '01711000100'
  };

  // Endpoint → payload. Matched longest-prefix first so /admin/products/sku/X
  // does not accidentally answer with the /admin/products list.
  var ROUTES = [
    ['/config', { storeName: 'Rinova BD', currency: 'BDT', partnerName: 'Rinova BD' }],
    ['/admin/session', { username: 'Demo owner', role: 'owner' }],
    ['/admin/overview-insights', {
      insights: [
        { title: 'Sun care is carrying the month', body: 'SPF 50+ is 31% of units sold in the last 30 days.' },
        { title: 'Two lines need restocking', body: 'Ceramide Moisturiser and Tinted Lip Balm are below threshold.' }
      ],
      // Drives the "Product price, cost & delivery" cards. Derived from the
      // same orders above so the panel agrees with the headline metrics
      // instead of showing three numbers from nowhere.
      finance: {
        productRevenue: ORDERS.reduce(function (s, o) { return s + o.subtotal - o.discount; }, 0),
        productCost: taka(ORDERS.reduce(function (s, o) { return s + o.subtotal - o.discount; }, 0) * 0.58),
        deliveryCharges: ORDERS.reduce(function (s, o) { return s + o.deliveryFee; }, 0)
      },
      courier: [
        { courierProvider: 'Steadfast', deliveryZone: 'Inside Rajshahi', orders: ORDERS.filter(function (o) { return o.district === 'Rajshahi'; }).length, deliveryCharges: ORDERS.filter(function (o) { return o.district === 'Rajshahi'; }).reduce(function (s, o) { return s + o.deliveryFee; }, 0) },
        { courierProvider: 'Steadfast', deliveryZone: 'Outside Rajshahi', orders: ORDERS.filter(function (o) { return o.district !== 'Rajshahi'; }).length, deliveryCharges: ORDERS.filter(function (o) { return o.district !== 'Rajshahi'; }).reduce(function (s, o) { return s + o.deliveryFee; }, 0) }
      ]
    }],
    ['/admin/overview-search', { results: [] }],
    ['/admin/overview', OVERVIEW],
    ['/admin/analytics/summary', {
      configured: true, days: 30,
      metrics: { users: 4820, sessions: 6140, pageViews: 18930, conversionRate: 2.4 },
      events: [{ name: 'purchase', count: 118 }, { name: 'add_to_cart', count: 642 }, { name: 'view_item', count: 3110 }],
      pages: [{ path: '/', views: 6210 }, { path: '/product/niacinamide-serum', views: 1840 }, { path: '/checkout.html', views: 730 }]
    }],
    ['/admin/products/sku/', { ok: true }],
    ['/admin/products', { products: PRODUCTS }],
    ['/admin/pos/products', { products: PRODUCTS.filter(function (p) { return p.stock > 0; }) }],
    ['/admin/pos/sales', { sales: [] }],
    ['/admin/orders', { orders: ORDERS }],
    ['/admin/customers', { customers: CUSTOMERS }],
    ['/admin/categories', { categories: CATEGORIES }],
    ['/admin/reviews', { reviews: REVIEWS }],
    ['/admin/returns', { returns: ORDERS.filter(function (o) { return o.status === 'returned'; }).map(function (o, i) {
      return { id: i + 1, orderCode: o.orderCode, customerName: o.name, reason: 'Damaged seal on arrival', status: 'pending', createdAt: o.createdAt };
    }) }],
    ['/admin/notifications', { notifications: NOTIFICATIONS, unread: 2 }],
    ['/admin/settings', { settings: SETTINGS }],
    ['/admin/staff', { staff: [
      { id: 1, username: 'demo-owner', role: 'owner', active: 1, createdAt: iso(200) },
      { id: 2, username: 'demo-manager', role: 'manager', active: 1, createdAt: iso(90) }
    ] }],
    ['/admin/offers', { offers: [
      { id: 1, code: 'GLOW10', type: 'percent', value: 10, active: 1, uses: 34, endsAt: iso(-14) },
      { id: 2, code: 'WINTER', type: 'percent', value: 15, active: 0, uses: 112, endsAt: iso(21) }
    ] }],
    ['/admin/posts', { posts: [
      { id: 1, title: 'A morning routine that survives Rajshahi humidity', slug: 'morning-routine', status: 'published', createdAt: iso(9) },
      { id: 2, title: 'How to layer niacinamide without irritation', slug: 'layering-niacinamide', status: 'draft', createdAt: iso(3) }
    ] }],
    ['/admin/pages', { pages: [{ id: 1, title: 'About Rinova', slug: 'about', status: 'published' }] }],
    ['/admin/media-library', { media: [] }],
    ['/admin/marketing-banners', { banners: [] }],
    ['/admin/content/topbar_notice', { content: { value: 'Free delivery over ৳1,500 across Bangladesh' } }],
    ['/admin/content', { content: {} }],
    ['/admin/chat', { messages: [] }],
    ['/admin/sheets', { sheets: [] }],
    ['/admin/invoices', { invoice: null }],
    ['/orders/', { order: null }]
  ].sort(function (a, b) { return b[0].length - a[0].length; });

  function payloadFor(path) {
    for (var i = 0; i < ROUTES.length; i += 1) {
      if (path.indexOf(ROUTES[i][0]) === 0) return ROUTES[i][1];
    }
    // Unknown read: an empty-but-valid envelope, so a panel we have not
    // fixtured renders empty instead of throwing.
    return { ok: true, items: [], results: [], products: [], orders: [] };
  }

  var respond = function (body) {
    return Promise.resolve(new Response(JSON.stringify(body), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    }));
  };

  var nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    var apiIndex = url.indexOf('/api/');
    if (apiIndex === -1) return nativeFetch(input, init);

    var path = url.slice(apiIndex + 4).split('?')[0];
    if (method !== 'GET') {
      // Writes are accepted and dropped: buttons respond, nothing persists,
      // and no visitor can change what the next visitor sees.
      if (path.indexOf('/admin/login') === 0) return respond({ token: 'static-demo', username: 'Demo owner', role: 'owner' });
      return respond({ ok: true, demo: true });
    }
    return respond(payloadFor(path));
  };

  // A quiet, permanent marker so nobody mistakes these numbers for a real shop.
  document.addEventListener('DOMContentLoaded', function () {
    var note = document.createElement('div');
    note.textContent = 'Demo data — not a live shop';
    note.setAttribute('style', 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99999;'
      + 'background:rgba(16,22,19,.92);color:#EDEFEC;border:1px solid rgba(0,208,132,.4);border-radius:999px;'
      + 'padding:7px 15px;font:500 11px/1 system-ui,sans-serif;letter-spacing:.02em;pointer-events:none');
    document.body.appendChild(note);
  });
})();
