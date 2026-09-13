/**
 * The NestJS API, answered inside the page.
 *
 * Every screen in this app talks to http://localhost:3000/api/ through the
 * shared axios instance in src/axios.js. On static hosting that host does not
 * exist, so without this the storefront renders an empty grid and the admin —
 * eight screens of it — never gets past the login guard.
 *
 * This intercepts at the axios *adapter*, which is the single point every
 * request in the app funnels through, rather than patching each store. The
 * route table below is the contract, read off client/src/store/*.js and
 * server/src/**\/*.controller.ts: the paths the client actually calls and the
 * envelopes the controllers actually return (a bare array for GET /products,
 * `{ message, status }` for a write, `{ length }` for users/length).
 *
 * Writes mutate the in-memory copies, so confirming an order or deleting a
 * product sticks while you browse and resets on reload.
 */
import { PRODUCTS, ORDERS, USERS, MESSAGES } from './data';

const db = {
  products: JSON.parse(JSON.stringify(PRODUCTS)),
  orders: JSON.parse(JSON.stringify(ORDERS)),
  users: JSON.parse(JSON.stringify(USERS)),
  messages: JSON.parse(JSON.stringify(MESSAGES)),
};

/** Anything aimed at the API host, however the caller spelled it. */
const API = /^(https?:\/\/localhost:3000)?\/?api\//i;
/**
 * The template uploads avatars to imgbb with a key committed in the source.
 * A published demo must not carry someone's third-party credential to a third
 * party, so this answers that call locally and the request never leaves.
 */
const IMGBB = /^https:\/\/api\.imgbb\.com\//i;

const nowIso = () => new Date().toISOString();

/**
 * Hand back a copy, never the stored object.
 *
 * Several views prefix the image path in place — `product.imgUrl = baseUrl +
 * product.imgUrl` in Dashboard, Products, and every category page. A real API
 * sends fresh JSON each time, so that is harmless there. Returning the live
 * object instead would write the prefix back into this module's data and the
 * second visit would render `.../api/products/.../api/products/photo.jpeg`.
 */
const copy = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const ok = (data, status = 200) => ({ status, data: copy(data) });

/** Read an uploaded File into a data URI so a demo upload can be displayed. */
function readFile(file) {
  return new Promise((resolve) => {
    if (!file || typeof FileReader === 'undefined') return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/** Pull the File out of a FormData body under any of the names used here. */
function fileFrom(body) {
  if (typeof FormData === 'undefined' || !(body instanceof FormData)) return null;
  return body.get('file') ?? body.get('image') ?? null;
}

function parseBody(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return body;
}

const nextId = (rows, key = 'id') => Math.max(0, ...rows.map((r) => Number(r[key]) || 0)) + 1;

/**
 * `[method, matcher, handler]`. The matcher is a RegExp over the path with the
 * API prefix already stripped, so `products/single/7` — not the full URL.
 */
const ROUTES = [
  ['POST', /^auth\/login$/, () => {
    const owner = db.users[0];
    return ok({ token: 'demo-session-token', role: owner.role, user: owner }, 201);
  }],

  ['GET', /^users$/, () => ok(db.users)],
  ['GET', /^users\/length$/, () => ok({ length: db.users.length })],
  ['GET', /^users\/user$/, () => ok(db.users[0])],
  ['POST', /^users\/create$/, ({ body }) => {
    const created = { id: nextId(db.users), role: 'USER', imgUrl: db.users[0].imgUrl,
      createAt: nowIso(), updateAt: nowIso(), ...parseBody(body) };
    delete created.password;
    db.users.push(created);
    return ok({ message: 'User created', status: 201 }, 201);
  }],
  ['PUT', /^users\/update\/avatar\/(\d+)$/, async ({ body, params }) => {
    const user = db.users.find((u) => String(u.id) === params[0]);
    if (!user) return ok({ message: 'Not found' }, 404);
    const next = parseBody(body);
    if (next.imgUrl) user.imgUrl = next.imgUrl;
    user.updateAt = nowIso();
    return ok({ message: 'Avatar updated', status: 200 });
  }],
  ['PUT', /^users\/update\/(\d+)$/, ({ body, params }) => {
    const user = db.users.find((u) => String(u.id) === params[0]);
    if (!user) return ok({ message: 'Not found' }, 404);
    Object.assign(user, parseBody(body), { updateAt: nowIso() });
    delete user.password;
    return ok({ message: 'User updated', status: 200 });
  }],

  ['POST', /^products\/upload$/, async ({ body }) => {
    const uri = await readFile(fileFrom(body));
    // The controller answers { data: <stored filename> }; a data URI stands in
    // for the filename, and the <img> renders it the same way.
    return ok({ data: uri || db.products[0].imgUrl }, 201);
  }],
  ['POST', /^products\/create$/, ({ body }) => {
    const next = parseBody(body);
    db.products.unshift({ id: nextId(db.products), createAt: nowIso(), updateAt: nowIso(), ...next });
    return ok({ message: 'Product created', status: 201 }, 201);
  }],
  ['GET', /^products$/, () => ok(db.products)],
  ['GET', /^products\/single\/(\d+)$/, ({ params }) => {
    const found = db.products.find((p) => String(p.id) === params[0]);
    return found ? ok(found) : ok({ message: 'Product not found' }, 404);
  }],
  ['GET', /^products\/type\/([^/]+)$/, ({ params }) => {
    const type = decodeURIComponent(params[0]);
    return ok(db.products.filter((p) => p.types === type || type === 'all'));
  }],
  ['PUT', /^products\/update\/cover\/(\d+)$/, ({ body, params }) => {
    const product = db.products.find((p) => String(p.id) === params[0]);
    if (!product) return ok({ message: 'Not found' }, 404);
    const next = parseBody(body);
    if (next.imgUrl) product.imgUrl = next.imgUrl;
    product.updateAt = nowIso();
    return ok({ message: 'Product Updated', status: 200 });
  }],
  ['PUT', /^products\/update\/(\d+)$/, ({ body, params }) => {
    const product = db.products.find((p) => String(p.id) === params[0]);
    if (!product) return ok({ message: 'Not found' }, 404);
    Object.assign(product, parseBody(body), { updateAt: nowIso() });
    return ok({ message: 'Product Updated', status: 200 });
  }],
  ['DELETE', /^products\/(\d+)$/, ({ params }) => {
    const i = db.products.findIndex((p) => String(p.id) === params[0]);
    if (i === -1) return ok({ message: 'Not found' }, 404);
    db.products.splice(i, 1);
    return ok({ message: 'Delete success', status: 200 });
  }],

  ['GET', /^orders$/, () => ok(db.orders)],
  ['POST', /^orders\/create$/, ({ body }) => {
    const next = parseBody(body);
    db.orders.unshift({ id: nextId(db.orders), createAt: nowIso(), status: false, products: [], ...next });
    return ok({ message: 'Order created', status: 201 }, 201);
  }],
  ['PUT', /^orders\/confirm\/(\d+)$/, ({ params }) => {
    const order = db.orders.find((o) => String(o.id) === params[0]);
    if (!order) return ok({ message: 'Not found' }, 404);
    order.status = true;
    return ok({ message: 'Order confirmed', status: 200 });
  }],

  ['GET', /^messages$/, () => ok(db.messages)],
  ['POST', /^messages\/send$/, ({ body }) => {
    const next = parseBody(body);
    db.messages.unshift({
      messageId: nextId(db.messages, 'messageId'),
      createAt: nowIso(),
      deviceType: /Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
      ...next,
    });
    return ok({ message: 'Message sent', status: 201 }, 201);
  }],
  ['DELETE', /^messages\/(\d+)$/, ({ params }) => {
    const i = db.messages.findIndex((m) => String(m.messageId) === params[0]);
    if (i === -1) return ok({ message: 'Not found' }, 404);
    db.messages.splice(i, 1);
    return ok({ message: 'Delete success', status: 200 });
  }],
];

/** Strip the base and any leading slash so the matchers stay readable. */
function pathOf(config) {
  const raw = `${config.baseURL ?? ''}${config.url ?? ''}`;
  return raw.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/?api\//i, '').replace(/^\//, '').split('?')[0];
}

async function handle(config) {
  const method = String(config.method ?? 'get').toUpperCase();

  if (IMGBB.test(String(config.url ?? ''))) {
    const uri = await readFile(fileFrom(config.data));
    // imgbb's own envelope, so the caller's res.data.data.display_url works.
    return { status: 200, data: { data: { display_url: uri } } };
  }

  const path = pathOf(config);
  for (const [verb, matcher, handler] of ROUTES) {
    if (verb !== method) continue;
    const m = matcher.exec(path);
    if (!m) continue;
    const res = await handler({ body: config.data, params: m.slice(1) });
    return res;
  }
  return { status: 404, data: { message: `No demo route for ${method} /api/${path}` } };
}

export function installDemoServer(axios) {
  const respond = (config, result) => ({
    ...result,
    statusText: result.status < 400 ? 'OK' : 'Error',
    headers: {},
    config,
    request: { status: result.status },
  });

  axios.defaults.adapter = async (config) => {
    const result = await handle(config);
    const response = respond(config, result);
    if (result.status >= 400) {
      // Shaped like a real axios failure: the stores read err.response.data.
      const error = new Error(result.data?.message ?? `Request failed with status ${result.status}`);
      error.response = response;
      error.config = config;
      error.isAxiosError = true;
      throw error;
    }
    return response;
  };

  // The app opens the admin without a sign-in, the same way SmartGadget does:
  // there is no database behind it, so there is nothing for a password to
  // protect. The Login screen still works if a visitor wants to see it.
  try {
    if (!sessionStorage.getItem('access_token')) {
      sessionStorage.setItem('access_token', 'demo-session-token');
      sessionStorage.setItem('role', 'SUPER_ADMIN');
    }
  } catch {
    /* Private mode with storage blocked: the storefront still works. */
  }
}

export { API };
