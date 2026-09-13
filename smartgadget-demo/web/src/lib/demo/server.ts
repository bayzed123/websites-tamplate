/**
 * The whole backend, in the browser.
 *
 * This demo has no server. `api()` hands every request here instead of over
 * the network, and this file answers it from {@link ./dataset}. That is what
 * lets the admin dashboard open with no password and still be safe to publish:
 * there is no database to reach, no token to steal, and no endpoint behind it
 * — the "API" is a function call inside the visitor's own tab.
 *
 * Writes mutate the in-memory arrays, so editing a price and going back to the
 * dashboard shows the new number, exactly as it would against a real API. It
 * all resets on reload, which is the right behaviour for a shared demo: the
 * next visitor gets the shop as designed rather than whatever the last one
 * left behind.
 */
import {
  AUDIT, BANNERS, CATEGORIES, CUSTOMERS, MOVEMENTS, ORDERS, PAGES, POSTS,
  PRESS, PRODUCTS, REVIEWS, SETTINGS, STAFF,
  type DemoOrder,
} from './dataset';
import type { AdminProduct } from '../types';

/* Seconds throughout, matching the real API and src/lib/format.ts. */
const DAY = 86_400;
const nowSec = () => Math.floor(Date.now() / 1000);

/** Thrown with the status the real API would have used, so the pages' own
 *  error handling is exercised rather than bypassed. */
export class DemoHttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

type Body = Record<string, unknown> | undefined;
type Handler = (ctx: Ctx) => unknown;
interface Ctx {
  params: string[];
  query: URLSearchParams;
  body: Body;
  method: string;
}

const str = (b: Body, k: string, fallback = ''): string => (typeof b?.[k] === 'string' ? (b[k] as string) : fallback);
const num = (b: Body, k: string, fallback = 0): number => (typeof b?.[k] === 'number' ? (b[k] as number) : fallback);

/* ---------- shared derivations ---------- */

const publicProduct = (p: AdminProduct) => {
  const { cost_price, profit_per_unit, margin_pct, markup_pct, stock_value, retail_value, ...rest } = p;
  // Cost and margin are the shop's business, not the shopper's — the real API
  // strips them for the public routes and so does this.
  void cost_price; void profit_per_unit; void margin_pct; void markup_pct; void stock_value; void retail_value;
  return rest;
};

const visible = () => PRODUCTS.filter((p) => p.status === 'active');

function sortProducts(list: AdminProduct[], sort: string): AdminProduct[] {
  const out = [...list];
  switch (sort) {
    case 'popular': return out.sort((a, b) => b.units_sold - a.units_sold);
    case 'price_asc': return out.sort((a, b) => a.price - b.price);
    case 'price_desc': return out.sort((a, b) => b.price - a.price);
    case 'discount': return out.sort((a, b) => b.discount_pct - a.discount_pct);
    case 'rating': return out.sort((a, b) => b.rating - a.rating);
    default: return out.sort((a, b) => b.created_at - a.created_at);
  }
}

function paginate<T>(rows: T[], query: URLSearchParams, per = 24) {
  const limit = Number(query.get('limit')) || per;
  const page = Math.max(1, Number(query.get('page')) || 1);
  const pages = Math.max(1, Math.ceil(rows.length / limit));
  return { slice: rows.slice((page - 1) * limit, page * limit), page, pages, total: rows.length };
}

function filterProducts(query: URLSearchParams, pool: AdminProduct[]): AdminProduct[] {
  const q = (query.get('q') ?? '').trim().toLowerCase();
  const category = query.get('category') ?? '';
  const brand = query.get('brand') ?? '';
  // The catalogue URL carries taka because a shopper reads it; the data is in
  // poisha. Converting here keeps that difference in one place.
  const min = query.get('price_min') ? Number(query.get('price_min')) * 100 : null;
  const max = query.get('price_max') ? Number(query.get('price_max')) * 100 : null;
  return pool.filter((p) => {
    if (q && !`${p.name} ${p.brand} ${p.sku}`.toLowerCase().includes(q)) return false;
    if (category && p.category?.slug !== category) return false;
    if (brand && p.brand !== brand) return false;
    if (query.get('in_stock') === '1' && !p.in_stock) return false;
    if (min !== null && p.price < min) return false;
    if (max !== null && p.price > max) return false;
    if (query.get('status') && p.status !== query.get('status')) return false;
    return true;
  });
}

function quoteFor(items: { product_id: number; qty: number }[], zone: string) {
  const lines = items
    .map((it) => {
      const p = PRODUCTS.find((x) => x.id === it.product_id);
      if (!p) return null;
      const qty = Math.max(1, it.qty);
      const tier = [...p.tiers].reverse().find((t) => qty >= t.min_qty) ?? p.tiers[0];
      const top = p.tiers[0].unit_price;
      return {
        product_id: p.id, sku: p.sku, name: p.name, image_url: p.image_url,
        qty, moq: p.moq, unit_price: tier.unit_price, line_total: tier.unit_price * qty,
        tier_savings: (top - tier.unit_price) * qty, stock: p.stock, in_stock: p.in_stock,
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const units = lines.reduce((s, l) => s + l.qty, 0);
  const deliveryZone = zone === 'dhaka' ? 'dhaka' : 'outside';
  const baseShipping = deliveryZone === 'dhaka' ? SETTINGS.shipping_dhaka : SETTINGS.shipping_outside;
  const free = subtotal >= SETTINGS.free_shipping_over;
  return {
    lines, subtotal, tier_savings: lines.reduce((s, l) => s + l.tier_savings, 0),
    discount: 0, shipping: free ? 0 : baseShipping, tax: 0,
    total: subtotal + (free ? 0 : baseShipping), units,
    delivery_zone: deliveryZone, free_shipping_applied: free,
    free_shipping_gap: free ? 0 : Math.max(0, SETTINGS.free_shipping_over - subtotal),
  };
}

const inWindow = (days: number) => (o: DemoOrder) => o.created_at >= nowSec() - days * DAY;
const EARNING = ['confirmed', 'packed', 'shipped', 'delivered'];

function overview(days: number) {
  const period = ORDERS.filter(inWindow(days)).filter((o) => EARNING.includes(o.status));
  const prior = ORDERS.filter(
    (o) => o.created_at < nowSec() - days * DAY && o.created_at >= nowSec() - days * 2 * DAY,
  ).filter((o) => EARNING.includes(o.status));

  const sum = (rows: DemoOrder[]) => {
    const revenue = rows.reduce((s, o) => s + o.total, 0);
    const cost = rows.reduce((s, o) => s + o.cost_total, 0);
    const netSales = rows.reduce((s, o) => s + o.subtotal - o.discount, 0);
    const units = rows.reduce((s, o) => s + o.units, 0);
    const profit = netSales - cost;
    return {
      revenue, net_sales: netSales, cost, profit,
      margin_pct: netSales ? Number(((profit / netSales) * 100).toFixed(1)) : 0,
      orders: rows.length, units,
      customers: new Set(rows.map((o) => o.customer_phone)).size,
      aov: rows.length ? Math.round(revenue / rows.length) : 0,
    };
  };

  const cur = sum(period);
  const prev = sum(prior);
  // Null rather than 0% when there is nothing to compare against — a blank is
  // honest, "0% change" from an empty period is not.
  const delta = (a: number, b: number) => (b === 0 ? null : Number((((a - b) / b) * 100).toFixed(1)));

  const pipeline: Record<string, { count: number; value: number }> = {};
  ORDERS.filter(inWindow(days)).forEach((o) => {
    const row = (pipeline[o.status] ??= { count: 0, value: 0 });
    row.count += 1;
    row.value += o.total;
  });

  return {
    period_days: days,
    sales: cur,
    change: {
      revenue: delta(cur.revenue, prev.revenue), profit: delta(cur.profit, prev.profit),
      orders: delta(cur.orders, prev.orders), units: delta(cur.units, prev.units),
      aov: delta(cur.aov, prev.aov),
    },
    previous: { revenue: prev.revenue, profit: prev.profit, orders: prev.orders, units: prev.units, aov: prev.aov },
    pipeline,
    inventory: {
      stock_units: PRODUCTS.reduce((s, p) => s + p.stock, 0),
      stock_cost_value: PRODUCTS.reduce((s, p) => s + p.stock * p.cost_price, 0),
      stock_retail_value: PRODUCTS.reduce((s, p) => s + p.stock * p.price, 0),
      unrealised_profit: PRODUCTS.reduce((s, p) => s + p.stock * (p.price - p.cost_price), 0),
      low_stock: PRODUCTS.filter((p) => p.stock_state === 'low').length,
      out_of_stock: PRODUCTS.filter((p) => p.stock_state === 'out').length,
    },
    catalogue: {
      total: PRODUCTS.length,
      active: PRODUCTS.filter((p) => p.status === 'active').length,
      draft: PRODUCTS.filter((p) => p.status === 'draft').length,
      archived: PRODUCTS.filter((p) => p.status === 'archived').length,
      updated_in_period: PRODUCTS.filter((p) => p.updated_at >= nowSec() - days * DAY).length,
    },
  };
}

function alerts() {
  return PRODUCTS.filter((p) => p.stock_state !== 'ok').map((p) => ({
    id: p.id, sku: p.sku, name: p.name, image_url: p.image_url, stock: p.stock,
    low_stock_threshold: p.low_stock_threshold, stock_state: p.stock_state as 'low' | 'out',
    moq: p.moq, cost_price: p.cost_price, price: p.price, tied_up: p.stock * p.cost_price,
  }));
}

function nextOrderNo(): string {
  const highest = ORDERS.reduce((n, o) => Math.max(n, Number(o.order_no.replace(/\D/g, '')) || 0), 0);
  return `SG-${highest + 1}`;
}

/* ---------- routes ---------- */

const ROUTES: [string, string, Handler][] = [
  /* storefront */
  ['GET', '/api/settings', () => SETTINGS],
  ['GET', '/api/categories', () => ({
    categories: CATEGORIES.map((c) => ({
      ...c, product_count: visible().filter((p) => p.category?.slug === c.slug).length,
    })),
  })],
  ['GET', '/api/storefront', () => {
    const live = visible();
    return {
      categories: CATEGORIES.map((c) => ({ ...c, product_count: live.filter((p) => p.category?.slug === c.slug).length })),
      featured: live.filter((p) => p.featured).slice(0, 8).map(publicProduct),
      newest: sortProducts(live, 'newest').slice(0, 8).map(publicProduct),
      deals: sortProducts(live.filter((p) => p.discount_pct > 0), 'discount').slice(0, 8).map(publicProduct),
      settings: SETTINGS,
    };
  }],
  ['GET', '/api/brands', ({ query }) => {
    const cat = query.get('category');
    const pool = cat ? visible().filter((p) => p.category?.slug === cat) : visible();
    return { brands: [...new Set(pool.map((p) => p.brand))].sort() };
  }],
  ['GET', '/api/products', ({ query }) => {
    const rows = sortProducts(filterProducts(query, visible()), query.get('sort') ?? 'newest');
    const { slice, page, pages, total } = paginate(rows, query);
    return { products: slice.map(publicProduct), page, pages, total };
  }],
  ['GET', '/api/products/:slug', ({ params }) => {
    const product = visible().find((p) => p.slug === params[0]);
    if (!product) throw new DemoHttpError(404, 'Product not found');
    const related = visible()
      .filter((p) => p.id !== product.id && p.category?.slug === product.category?.slug)
      .slice(0, 4);
    return { product: publicProduct(product), related: related.map(publicProduct) };
  }],
  ['GET', '/api/products/:slug/reviews', ({ params }) => {
    const product = PRODUCTS.find((p) => p.slug === params[0]);
    const rows = REVIEWS.filter((r) => r.product_id === product?.id && r.visible === 1);
    const stars: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    rows.forEach((r) => { stars[String(r.rating)] += 1; });
    return {
      summary: {
        count: rows.length,
        average: rows.length ? Number((rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1)) : 0,
        stars,
      },
      reviews: rows.map((r) => ({ id: r.id, name: r.customer_name, rating: r.rating, comment: r.comment, created_at: r.created_at })),
    };
  }],
  ['GET', '/api/products/:slug/reviews/eligibility', () => ({
    can_rate: true,
    name: 'Demo shopper',
  })],
  ['POST', '/api/products/:slug/reviews', ({ params, body }) => {
    const product = PRODUCTS.find((p) => p.slug === params[0]);
    if (!product) throw new DemoHttpError(404, 'Product not found');
    REVIEWS.unshift({
      id: Math.max(0, ...REVIEWS.map((r) => r.id)) + 1,
      rating: num(body, 'rating', 5),
      comment: str(body, 'comment'),
      customer_name: str(body, 'name', 'Demo shopper'),
      customer_phone: str(body, 'phone'),
      visible: 1,
      created_at: nowSec(),
      product_id: product.id,
      product_name: product.name,
      product_slug: product.slug,
      order_no: str(body, 'order') || null,
    });
    return { ok: true };
  }],
  ['POST', '/api/quote', ({ body }) => quoteFor(
    (body?.items as { product_id: number; qty: number }[]) ?? [],
    str(body, 'delivery_zone', 'outside'),
  )],
  ['POST', '/api/orders', ({ body }) => {
    const items = (body?.items as { product_id: number; qty: number }[]) ?? [];
    const zone = str(body, 'delivery_zone', 'outside');
    const q = quoteFor(items, zone);
    if (!q.lines.length) throw new DemoHttpError(400, 'Your cart is empty');
    const order: DemoOrder = {
      id: Math.max(0, ...ORDERS.map((o) => o.id)) + 1,
      order_no: nextOrderNo(),
      invoice_no: `INV-${nextOrderNo().replace('SG-', '')}`,
      customer_name: str(body, 'customer_name', 'Demo shopper'),
      customer_phone: str(body, 'customer_phone'),
      customer_email: str(body, 'customer_email'),
      city: str(body, 'city', zone === 'dhaka' ? 'Dhaka' : 'Chattogram'),
      address: str(body, 'address'),
      delivery_zone: zone,
      status: 'pending',
      subtotal: q.subtotal, discount: q.discount, shipping: q.shipping, tax: q.tax, total: q.total,
      cost_total: q.lines.reduce((s, l) => {
        const p = PRODUCTS.find((x) => x.id === l.product_id);
        return s + (p ? p.cost_price * l.qty : 0);
      }, 0),
      profit: 0, margin_pct: 0,
      payment_method: str(body, 'payment_method', 'cod'),
      payment_reference: str(body, 'payment_reference'),
      created_at: nowSec(),
      units: q.units,
      courier: '', consignment_id: '', tracking_code: '', courier_status: '',
      note: str(body, 'note'),
      items: q.lines.map((l) => {
        const p = PRODUCTS.find((x) => x.id === l.product_id)!;
        return { product_id: l.product_id, name: l.name, sku: l.sku, qty: l.qty, unit_price: l.unit_price, cost_price: p.cost_price, line_total: l.line_total };
      }),
    };
    order.profit = order.subtotal - order.discount - order.cost_total;
    order.margin_pct = order.subtotal ? Number(((order.profit / order.subtotal) * 100).toFixed(1)) : 0;
    ORDERS.unshift(order);
    return { order: { order_no: order.order_no, total: order.total, status: order.status } };
  }],
  ['GET', '/api/orders/:orderNo', ({ params }) => {
    const order = ORDERS.find((o) => o.order_no.toLowerCase() === decodeURIComponent(params[0]).toLowerCase());
    if (!order) throw new DemoHttpError(404, 'No order found with that number and phone');
    return {
      order: { ...order, updated_at: order.created_at, courier_synced_at: order.courier ? order.created_at : null },
      items: order.items.map((it) => ({
        sku: it.sku, name: it.name,
        image_url: PRODUCTS.find((p) => p.id === it.product_id)?.image_url ?? '',
        qty: it.qty, unit_price: it.unit_price, line_total: it.line_total,
      })),
    };
  }],
  ['GET', '/api/pages', () => ({
    company: PAGES.filter((p) => p.section === 'company').map(({ slug, title, section, summary }) => ({ slug, title, section, summary })),
    policy: PAGES.filter((p) => p.section === 'policy').map(({ slug, title, section, summary }) => ({ slug, title, section, summary })),
  })],
  ['GET', '/api/pages/:slug', ({ params }) => {
    const page = PAGES.find((p) => p.slug === params[0]);
    if (!page) throw new DemoHttpError(404, 'Page not found');
    return { page };
  }],
  ['GET', '/api/posts', ({ query }) => ({
    posts: POSTS.filter((p) => p.published).slice(0, Number(query.get('limit')) || 24),
  })],
  ['GET', '/api/posts/:slug', ({ params }) => {
    const post = POSTS.find((p) => p.slug === params[0]);
    if (!post) throw new DemoHttpError(404, 'Post not found');
    return { post, more: POSTS.filter((p) => p.slug !== post.slug).slice(0, 3) };
  }],
  ['GET', '/api/press', () => ({ press: PRESS.filter((p) => p.visible) })],
  ['GET', '/api/banners', () => ({ banners: BANNERS.filter((b) => b.active) })],

  /* Chat and pixel forwarding have no counterpart here — the demo answers
     "not connected" rather than pretending to hold an AI key or to have
     posted a conversion to anyone's ad account. */
  ['GET', '/api/support/status', () => ({ connected: false })],
  ['POST', '/api/support/chat', () => ({ ok: false, error: 'The assistant is switched off in this demonstration build.', reply: '' })],
  ['POST', '/api/meta/events', () => ({ ok: true })],

  /* customer account */
  ['GET', '/api/account/me', () => { throw new DemoHttpError(401, 'Not signed in'); }],
  ['POST', '/api/account/login', ({ body }) => ({
    token: '',
    customer: { id: 1, name: 'Demo Shopper', phone: str(body, 'phone', '01800000000'), email: str(body, 'email'), city: 'Dhaka', address: '' },
  })],
  ['POST', '/api/account/register', ({ body }) => ({
    token: '',
    customer: { id: 1, name: str(body, 'name', 'Demo Shopper'), phone: str(body, 'phone'), email: str(body, 'email'), city: str(body, 'city'), address: str(body, 'address') },
  })],
  ['PATCH', '/api/account/me', () => ({ ok: true })],
  ['GET', '/api/account/orders', () => ({ orders: ORDERS.slice(0, 6).map((o) => ({ order_no: o.order_no, status: o.status, total: o.total, units: o.units, city: o.city, payment_method: o.payment_method, created_at: o.created_at })) })],
  ['GET', '/api/account/wishlist', () => ({ products: visible().slice(0, 4).map(publicProduct) })],
  ['GET', '/api/account/wishlist/ids', () => ({ product_ids: visible().slice(0, 4).map((p) => p.id) })],
  ['POST', '/api/account/wishlist', () => ({ ok: true })],
  ['DELETE', '/api/account/wishlist/:id', () => ({ ok: true })],

  /* admin session — open by design, see the note in api.ts */
  ['GET', '/api/admin/me', () => ({ admin: { id: 1, email: 'owner@smartgadget.demo', username: 'owner', name: 'Store Owner', role: 'owner' } })],
  ['POST', '/api/admin/login', () => ({ token: '', admin: { id: 1, email: 'owner@smartgadget.demo', username: 'owner', name: 'Store Owner', role: 'owner' } })],

  /* admin catalogue */
  ['GET', '/api/admin/products', ({ query }) => {
    const rows = sortProducts(filterProducts(query, PRODUCTS), query.get('sort') ?? 'newest');
    const { slice, page, pages, total } = paginate(rows, query, 20);
    return { products: slice, page, pages, total };
  }],
  ['POST', '/api/admin/products', ({ body }) => {
    const id = Math.max(0, ...PRODUCTS.map((p) => p.id)) + 1;
    const base = PRODUCTS[0];
    const created = { ...base, ...(body as object), id, created_at: nowSec(), updated_at: nowSec() } as AdminProduct;
    PRODUCTS.unshift(created);
    return { product: created };
  }],
  ['GET', '/api/admin/products/:id', ({ params }) => {
    const product = PRODUCTS.find((p) => p.id === Number(params[0]));
    if (!product) throw new DemoHttpError(404, 'Product not found');
    return { product };
  }],
  ['PATCH', '/api/admin/products/:id', ({ params, body }) => {
    const product = PRODUCTS.find((p) => p.id === Number(params[0]));
    if (!product) throw new DemoHttpError(404, 'Product not found');
    Object.assign(product, body, { updated_at: nowSec() });
    // Derived columns are recomputed here for the same reason the API
    // recomputes them: an edited price with a stale margin beside it is worse
    // than no margin at all.
    product.profit_per_unit = product.price - product.cost_price;
    product.margin_pct = product.price ? Number((((product.price - product.cost_price) / product.price) * 100).toFixed(1)) : 0;
    product.stock_value = product.stock * product.cost_price;
    product.retail_value = product.stock * product.price;
    product.in_stock = product.stock > 0;
    product.stock_state = product.stock === 0 ? 'out' : product.stock <= product.low_stock_threshold ? 'low' : 'ok';
    return { product };
  }],
  ['DELETE', '/api/admin/products/:id', ({ params }) => {
    const i = PRODUCTS.findIndex((p) => p.id === Number(params[0]));
    if (i >= 0) PRODUCTS.splice(i, 1);
    return { ok: true };
  }],
  ['GET', '/api/admin/products/:id/movements', ({ params }) => ({
    movements: MOVEMENTS.filter((m) => m.product_id === Number(params[0])),
  })],
  ['POST', '/api/admin/products/:id/stock', ({ params, body }) => {
    const product = PRODUCTS.find((p) => p.id === Number(params[0]));
    if (!product) throw new DemoHttpError(404, 'Product not found');
    const delta = num(body, 'delta');
    product.stock = Math.max(0, product.stock + delta);
    product.in_stock = product.stock > 0;
    product.stock_state = product.stock === 0 ? 'out' : product.stock <= product.low_stock_threshold ? 'low' : 'ok';
    MOVEMENTS.unshift({
      id: Math.max(0, ...MOVEMENTS.map((m) => m.id)) + 1,
      product_id: product.id, name: product.name, sku: product.sku, delta,
      reason: str(body, 'reason', 'manual'), ref_type: 'manual', ref_id: null,
      balance_after: product.stock, unit_cost: product.cost_price,
      note: str(body, 'note'), actor: 'owner', created_at: nowSec(),
    });
    return { product };
  }],

  /* admin orders */
  ['GET', '/api/admin/orders', ({ query }) => {
    const q = (query.get('q') ?? '').trim().toLowerCase();
    const status = query.get('status') ?? '';
    const rows = ORDERS.filter((o) => {
      if (status && o.status !== status) return false;
      if (q && !`${o.order_no} ${o.customer_name} ${o.customer_phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const { slice, page, pages, total } = paginate(rows, query, 20);
    return { orders: slice, page, pages, total };
  }],
  ['GET', '/api/admin/orders/:id', ({ params }) => {
    const order = ORDERS.find((o) => o.id === Number(params[0]));
    if (!order) throw new DemoHttpError(404, 'Order not found');
    return {
      order,
      items: order.items.map((it, i) => ({
        id: i + 1, product_id: it.product_id, sku: it.sku, name: it.name,
        image_url: PRODUCTS.find((p) => p.id === it.product_id)?.image_url ?? '',
        qty: it.qty, unit_price: it.unit_price, unit_cost: it.cost_price,
        line_total: it.line_total, line_cost: it.cost_price * it.qty,
        line_profit: it.line_total - it.cost_price * it.qty,
      })),
    };
  }],
  ['PATCH', '/api/admin/orders/:id', ({ params, body }) => {
    const order = ORDERS.find((o) => o.id === Number(params[0]));
    if (!order) throw new DemoHttpError(404, 'Order not found');
    if (str(body, 'status')) order.status = str(body, 'status');
    return { order };
  }],
  ['POST', '/api/admin/orders/:id/courier', ({ params }) => {
    const order = ORDERS.find((o) => o.id === Number(params[0]));
    if (!order) throw new DemoHttpError(404, 'Order not found');
    order.courier = 'Steadfast';
    order.consignment_id = String(7_000_000 + order.id);
    order.tracking_code = `SF${100000 + order.id}`;
    order.courier_status = 'in_review';
    return { tracking_code: order.tracking_code, consignment_id: order.consignment_id };
  }],
  ['POST', '/api/admin/orders/:id/courier/sync', ({ params }) => {
    const order = ORDERS.find((o) => o.id === Number(params[0]));
    if (!order) throw new DemoHttpError(404, 'Order not found');
    return { courier_status_label: order.courier_status || 'Not booked' };
  }],
  ['POST', '/api/admin/courier/sync', () => ({ checked: 0, moved: 0, failed: 0 })],

  /* The courier integration is deliberately reported as not configured: this
     build holds no API key, and a demo that claimed a live courier connection
     would be the one screen on the site that lies. */
  ['GET', '/api/admin/courier', () => ({
    connected: false, balance: null, reason: 'not_configured' as const, status: null,
    message: 'No courier account is connected in this demonstration build.',
    fix: 'In a live shop you would add your Steadfast API key under Settings → Courier accounts.',
    credentials: {
      api_key_present: false, secret_key_present: false, api_key_length: 0, secret_key_length: 0,
      base_url: '', account_label: 'None', source: 'none' as const,
    },
  })],
  ['GET', '/api/admin/courier/accounts', () => ({ accounts: [] })],
  ['GET', '/api/admin/courier/payments', () => ({ ok: false, error: 'Not connected in this demo', payments: [] })],
  ['POST', '/api/admin/courier/accounts', () => { throw new DemoHttpError(400, 'Courier accounts cannot be added in this demonstration build.'); }],
  ['POST', '/api/admin/courier/accounts/:id/activate', () => ({ ok: true })],
  ['DELETE', '/api/admin/courier/accounts/:id', () => ({ ok: true })],

  /* admin analytics */
  ['GET', '/api/admin/analytics/overview', ({ query }) => overview(Number(query.get('days')) || 30)],
  ['GET', '/api/admin/analytics/timeseries', ({ query }) => {
    const days = Number(query.get('days')) || 30;
    const series = Array.from({ length: days }, (_, i) => {
      const start = new Date((nowSec() - (days - 1 - i) * DAY) * 1000);
      start.setHours(0, 0, 0, 0);
      const from = Math.floor(start.getTime() / 1000);
      const to = from + DAY;
      const rows = ORDERS.filter((o) => o.created_at >= from && o.created_at < to && EARNING.includes(o.status));
      const revenue = rows.reduce((s, o) => s + o.total, 0);
      const cost = rows.reduce((s, o) => s + o.cost_total, 0);
      return {
        day: start.toISOString().slice(0, 10),
        orders: rows.length, revenue, cost,
        profit: rows.reduce((s, o) => s + o.subtotal - o.discount, 0) - cost,
        units: rows.reduce((s, o) => s + o.units, 0),
      };
    });
    return { series };
  }],
  ['GET', '/api/admin/analytics/top-products', ({ query }) => {
    const days = Number(query.get('days')) || 30;
    const tally = new Map<number, { units: number; revenue: number; profit: number }>();
    ORDERS.filter(inWindow(days)).filter((o) => EARNING.includes(o.status)).forEach((o) =>
      o.items.forEach((it) => {
        const row = tally.get(it.product_id) ?? { units: 0, revenue: 0, profit: 0 };
        row.units += it.qty;
        row.revenue += it.line_total;
        row.profit += it.line_total - it.cost_price * it.qty;
        tally.set(it.product_id, row);
      }),
    );
    const products = [...tally.entries()]
      .map(([id, row]) => {
        const p = PRODUCTS.find((x) => x.id === id);
        return p && { id: p.id, sku: p.sku, name: p.name, image_url: p.image_url, stock: p.stock, stock_state: p.stock_state, price: p.price, ...row };
      })
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, Number(query.get('limit')) || 8);
    return { products };
  }],
  ['GET', '/api/admin/analytics/categories', ({ query }) => {
    const days = Number(query.get('days')) || 30;
    const categories = CATEGORIES.map((c) => {
      const ids = new Set(PRODUCTS.filter((p) => p.category?.slug === c.slug).map((p) => p.id));
      let units = 0, revenue = 0, profit = 0;
      ORDERS.filter(inWindow(days)).filter((o) => EARNING.includes(o.status)).forEach((o) =>
        o.items.filter((it) => ids.has(it.product_id)).forEach((it) => {
          units += it.qty;
          revenue += it.line_total;
          profit += it.line_total - it.cost_price * it.qty;
        }),
      );
      return { id: c.id, slug: c.slug, name: c.name, icon: c.icon, skus: ids.size, units, revenue, profit };
    });
    return { categories: categories.sort((a, b) => b.revenue - a.revenue) };
  }],
  ['GET', '/api/admin/analytics/inventory', () => ({
    alerts: alerts(),
    dead_stock: PRODUCTS
      .filter((p) => p.stock > 0 && p.updated_at < nowSec() - 45 * DAY)
      .map((p) => ({ id: p.id, sku: p.sku, name: p.name, stock: p.stock, tied_up: p.stock * p.cost_price, updated_at: p.updated_at })),
    recent_movements: MOVEMENTS.slice(0, 12),
  })],
  ['GET', '/api/admin/analytics/courier', ({ query }) => {
    const rows = ORDERS.filter(inWindow(Number(query.get('days')) || 30));
    const booked = rows.filter((o) => o.courier).length;
    const delivered = rows.filter((o) => o.status === 'delivered').length;
    const returned = rows.filter((o) => o.status === 'returned').length;
    const settled = delivered + returned;
    return {
      booked, delivered, returned,
      in_transit: rows.filter((o) => o.status === 'shipped').length,
      awaiting_approval: rows.filter((o) => o.status === 'pending').length,
      success_rate: settled ? Number(((delivered / settled) * 100).toFixed(1)) : 0,
      return_rate: settled ? Number(((returned / settled) * 100).toFixed(1)) : 0,
      cod_collected: rows.filter((o) => o.status === 'delivered' && o.payment_method === 'cod').reduce((s, o) => s + o.total, 0),
      cod_outstanding: rows.filter((o) => o.status === 'shipped' && o.payment_method === 'cod').reduce((s, o) => s + o.total, 0),
    };
  }],

  /* admin customers */
  ['GET', '/api/admin/customers', ({ query }) => {
    const q = (query.get('q') ?? '').trim().toLowerCase();
    const rows = CUSTOMERS.filter((c) => !q || `${c.name} ${c.phone} ${c.email} ${c.city}`.toLowerCase().includes(q));
    const { slice, page, pages, total } = paginate(rows, query, 20);
    return { customers: slice, page, pages, total };
  }],
  ['GET', '/api/admin/customers/:id', ({ params }) => {
    const customer = CUSTOMERS.find((c) => c.id === Number(params[0]));
    if (!customer) throw new DemoHttpError(404, 'Customer not found');
    return {
      orders: ORDERS.filter((o) => o.customer_phone === customer.phone).map((o) => ({
        id: o.id, order_no: o.order_no, status: o.status, total: o.total, units: o.units,
        payment_method: o.payment_method, city: o.city, created_at: o.created_at,
      })),
    };
  }],
  ['PATCH', '/api/admin/customers/:id', ({ params, body }) => {
    const customer = CUSTOMERS.find((c) => c.id === Number(params[0]));
    if (customer) customer.active = body?.active ? 1 : 0;
    return { ok: true };
  }],

  /* admin reviews */
  ['GET', '/api/admin/reviews', ({ query }) => {
    const hidden = query.get('hidden') === '1';
    const rows = REVIEWS.filter((r) => (hidden ? r.visible === 0 : r.visible === 1));
    const all = REVIEWS.filter((r) => r.visible === 1);
    return {
      reviews: rows,
      totals: {
        total: REVIEWS.length,
        average: all.length ? Number((all.reduce((s, r) => s + r.rating, 0) / all.length).toFixed(1)) : 0,
        hidden: REVIEWS.filter((r) => r.visible === 0).length,
      },
    };
  }],
  ['PATCH', '/api/admin/reviews/:id', ({ params, body }) => {
    const review = REVIEWS.find((r) => r.id === Number(params[0]));
    if (review) review.visible = num(body, 'visible', review.visible);
    return { ok: true };
  }],

  /* admin content */
  ['GET', '/api/admin/content/pages', () => ({ pages: PAGES })],
  ['GET', '/api/admin/content/posts', () => ({ posts: POSTS })],
  ['GET', '/api/admin/content/press', () => ({ press: PRESS })],
  ['GET', '/api/admin/content/banners', () => ({ banners: BANNERS })],
  ['GET', '/api/admin/content/:kind/:id', ({ params }) => {
    const row = contentRows(params[0]).find((r) => (r as { id: number }).id === Number(params[1]));
    if (!row) throw new DemoHttpError(404, 'Not found');
    return { [singular(params[0])]: row };
  }],
  ['POST', '/api/admin/content/:kind', ({ params, body }) => {
    const rows = contentRows(params[0]);
    const id = Math.max(0, ...rows.map((r) => (r as { id: number }).id)) + 1;
    rows.unshift({ ...(rows[0] ?? {}), ...(body as object), id, updated_at: nowSec() });
    return { ok: true, id };
  }],
  ['PATCH', '/api/admin/content/:kind/:id', ({ params, body }) => {
    const row = contentRows(params[0]).find((r) => (r as { id: number }).id === Number(params[1]));
    if (!row) throw new DemoHttpError(404, 'Not found');
    Object.assign(row as object, body, { updated_at: nowSec() });
    return { ok: true };
  }],
  ['DELETE', '/api/admin/content/:kind/:id', ({ params }) => {
    const rows = contentRows(params[0]);
    const i = rows.findIndex((r) => (r as { id: number }).id === Number(params[1]));
    if (i >= 0) rows.splice(i, 1);
    return { ok: true };
  }],

  /* admin staff, settings, audit */
  ['GET', '/api/admin/staff', () => ({ staff: STAFF })],
  ['POST', '/api/admin/staff', ({ body }) => {
    STAFF.push({
      id: Math.max(0, ...STAFF.map((s) => s.id)) + 1,
      username: str(body, 'username') || null,
      name: str(body, 'name', 'New staff'),
      email: str(body, 'email'),
      role: (str(body, 'role', 'staff') as 'owner' | 'admin' | 'staff'),
      active: true, created_at: nowSec(), last_login_at: null, has_security_question: false,
    });
    return { ok: true };
  }],
  ['PATCH', '/api/admin/staff/:id', ({ params, body }) => {
    const row = STAFF.find((s) => s.id === Number(params[0]));
    if (row) {
      if ('active' in (body ?? {})) row.active = Boolean(body?.active);
      if (str(body, 'role')) row.role = str(body, 'role') as 'owner' | 'admin' | 'staff';
    }
    return { ok: true };
  }],
  ['GET', '/api/admin/settings', () => ({
    settings: Object.entries(SETTINGS).map(([key, value]) => ({ key, value: String(value ?? '') })),
  })],
  ['PATCH', '/api/admin/settings', ({ body }) => {
    Object.assign(SETTINGS, body ?? {});
    return { ok: true };
  }],
  ['GET', '/api/admin/audit', ({ query }) => ({ entries: AUDIT.slice(0, Number(query.get('limit')) || 40) })],
  ['GET', '/api/admin/notifications', () => {
    const items = [
      { kind: 'orders', count: ORDERS.filter((o) => o.status === 'pending').length, label: 'orders awaiting confirmation', href: '/admin/orders?status=pending' },
      { kind: 'stock', count: PRODUCTS.filter((p) => p.stock_state !== 'ok').length, label: 'products low or out of stock', href: '/admin/inventory' },
      { kind: 'reviews', count: REVIEWS.filter((r) => r.visible === 0).length, label: 'reviews hidden from the storefront', href: '/admin/reviews' },
    ].filter((i) => i.count > 0);
    return { items, total: items.reduce((s, i) => s + i.count, 0) };
  }],

  /* Integrations this build genuinely does not have. Answering honestly keeps
     every "connect" screen truthful instead of showing invented Google data. */
  ['GET', '/api/admin/assistant/status', () => ({ connected: false })],
  ['POST', '/api/admin/assistant/chat', () => ({ ok: false, error: 'The admin assistant is switched off in this demonstration build.', reply: '' })],
  ['GET', '/api/admin/gemini/status', () => ({ connected: false })],
  ['GET', '/api/admin/google/status', () => ({ connected: false, error: NOT_CONNECTED })],
  ['GET', '/api/admin/google/ga4/properties', () => ({ ok: false, error: NOT_CONNECTED, properties: [] })],
  ['GET', '/api/admin/google/ga4/summary', () => ({ ok: false, error: NOT_CONNECTED, summary: null })],
  ['GET', '/api/admin/google/gsc/sites', () => ({ ok: false, error: NOT_CONNECTED, sites: [] })],
  ['GET', '/api/admin/google/gsc/summary', () => ({ ok: false, error: NOT_CONNECTED, summary: null })],
  ['GET', '/api/admin/google/gtm/summary', () => ({ ok: false, error: NOT_CONNECTED, summary: null })],
  ['GET', '/api/admin/google/sheets/status', () => ({ ok: false, error: NOT_CONNECTED, connected: false })],
  ['POST', '/api/admin/google/sheets/connect', () => ({ ok: false, error: NOT_CONNECTED })],
  ['POST', '/api/admin/google/sheets/sync', () => ({ ok: false, error: NOT_CONNECTED })],
  ['GET', '/api/admin/health-check/status', () => ({ ok: true, checks: [], ran_at: nowSec() })],
  ['POST', '/api/admin/health-check/run', () => ({ ok: true, checks: [], ran_at: nowSec() })],
];

const NOT_CONNECTED = 'No Google account is connected in this demonstration build.';

function singular(kind: string): string {
  return kind === 'pages' ? 'page' : kind === 'posts' ? 'post' : kind === 'banners' ? 'banner' : 'press';
}

function contentRows(kind: string): Record<string, unknown>[] {
  switch (kind) {
    case 'pages': return PAGES as unknown as Record<string, unknown>[];
    case 'posts': return POSTS as unknown as Record<string, unknown>[];
    case 'press': return PRESS as unknown as Record<string, unknown>[];
    case 'banners': return BANNERS as unknown as Record<string, unknown>[];
    default: throw new DemoHttpError(404, 'Unknown content type');
  }
}

/** `/api/admin/products/:id/stock` must not be answered by `/api/admin/products/:id`,
 *  so a pattern only matches when the segment counts agree. */
function match(pattern: string, path: string): string[] | null {
  const a = pattern.split('/');
  const b = path.split('/');
  if (a.length !== b.length) return null;
  const params: string[] = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params.push(b[i]);
    else if (a[i] !== b[i]) return null;
  }
  return params;
}

/**
 * Answer one request. Rejects with {@link DemoHttpError} where the real API
 * would return an error status, so the pages show their own error states.
 */
export async function handle(method: string, url: string, body: Body): Promise<unknown> {
  const [rawPath, rawQuery = ''] = url.split('?');
  const query = new URLSearchParams(rawQuery);
  const path = rawPath.replace(/\/$/, '') || '/';

  for (const [verb, pattern, handler] of ROUTES) {
    if (verb !== method) continue;
    const params = match(pattern, path);
    if (!params) continue;
    // A little latency, so spinners and disabled buttons are visible rather
    // than flashing past — this is a demo of the interface, and instant
    // responses hide half of it.
    await new Promise((r) => setTimeout(r, 120 + Math.random() * 160));
    return handler({ params, query, body, method });
  }

  throw new DemoHttpError(404, `This demonstration build has no ${method} ${path}.`);
}
