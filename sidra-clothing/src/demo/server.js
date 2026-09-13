/**
 * The json-server backend, running inside the page.
 *
 * This app was written against `json-server --watch src/data/db.json --port
 * 8080`: twenty call sites hit http://localhost:8080 directly. On a published
 * demo there is no such server, so every screen rendered empty — which is what
 * the deploy's own check caught ("page rendered almost no text").
 *
 * Rather than rewrite twenty call sites, this intercepts at the two places the
 * app talks to the network: axios' adapter and window.fetch. The components
 * are untouched, so the demo stays an honest copy of the real build.
 *
 * It implements only the slice of json-server's query language this app
 * actually uses — equality, _lte/_gte, q, _sort/_order, _page/_limit — because
 * a fuller emulation would be code nobody here exercises.
 *
 * Writes mutate the in-memory copy, so registering, adding to a wishlist and
 * placing an order all behave, and a reload resets the shop to its seeded
 * state. That is the right behaviour for a demo anyone can open.
 */
import seed from '../data/db.json';

/* A deep copy, so a visitor's edits never write back into the imported
   module and leak into the next route that reads it. */
const db = JSON.parse(JSON.stringify(seed));
if (!Array.isArray(db.user)) db.user = [db.user];
if (!Array.isArray(db.orders)) db.orders = [];

const DELAY = 90; // enough for spinners to be visible, short enough to feel instant

/** Nested paths like `price.current.value` are used for sorting and filtering. */
function pluck(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

/** json-server compares loosely: ?isInStock=true must match the boolean true. */
function looseEquals(value, wanted) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'boolean') return String(value) === wanted;
  if (typeof value === 'number') return String(value) === wanted;
  return String(value).toLowerCase() === String(wanted).toLowerCase();
}

function matchesFullText(row, term) {
  return JSON.stringify(row).toLowerCase().includes(term.toLowerCase());
}

function applyQuery(rows, params) {
  let out = rows.slice();

  for (const [rawKey, rawValue] of params.entries()) {
    if (rawValue === '' || rawValue === 'undefined' || rawValue === 'null') continue;
    if (rawKey.startsWith('_') || rawKey === 'q') continue;

    if (rawKey.endsWith('_lte')) {
      const field = rawKey.slice(0, -4);
      out = out.filter((r) => Number(pluck(r, field)) <= Number(rawValue));
    } else if (rawKey.endsWith('_gte')) {
      const field = rawKey.slice(0, -4);
      const wanted = Number(rawValue);
      // productionDate_gte arrives as a date string in some routes and as a
      // number in others; a NaN bound would filter everything out.
      if (Number.isNaN(wanted)) {
        out = out.filter((r) => String(pluck(r, field)) >= rawValue);
      } else {
        out = out.filter((r) => Number(pluck(r, field)) >= wanted);
      }
    } else {
      out = out.filter((r) => looseEquals(pluck(r, rawKey), rawValue));
    }
  }

  const term = params.get('q');
  if (term) out = out.filter((r) => matchesFullText(r, term));

  const sort = params.get('_sort');
  if (sort) {
    const dir = params.get('_order') === 'desc' ? -1 : 1;
    out.sort((a, b) => {
      const x = pluck(a, sort);
      const y = pluck(b, sort);
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
  }

  const total = out.length;
  const page = Number(params.get('_page'));
  const limit = Number(params.get('_limit')) || 10;
  if (page) out = out.slice((page - 1) * limit, page * limit);
  else if (params.get('_limit')) out = out.slice(0, limit);

  return { rows: out, total };
}

const nextId = (rows) => rows.reduce((n, r) => Math.max(n, Number(r.id) || 0), 0) + 1;

class NotFound extends Error {
  constructor(what) {
    super(what);
    this.status = 404;
  }
}

/** Resolve one request. Returns { body, headers } or throws NotFound. */
function handle(method, pathname, params, body) {
  const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');
  const [collection, id] = segments;
  const rows = db[collection];
  if (!Array.isArray(rows)) throw new NotFound(`no collection ${collection}`);

  if (method === 'GET' && id === undefined) {
    const { rows: page, total } = applyQuery(rows, params);
    // Pagination headers are part of json-server's contract even though this
    // app only reads the array today.
    return { body: page, headers: { 'x-total-count': String(total) } };
  }

  if (method === 'GET') {
    const row = rows.find((r) => String(r.id) === String(id));
    if (!row) throw new NotFound(`${collection}/${id}`);
    return { body: row, headers: {} };
  }

  if (method === 'POST') {
    const created = { ...body, id: body?.id ?? nextId(rows) };
    rows.push(created);
    return { body: created, headers: {} };
  }

  if (method === 'PUT' || method === 'PATCH') {
    const index = rows.findIndex((r) => String(r.id) === String(id));
    if (index === -1) throw new NotFound(`${collection}/${id}`);
    rows[index] = method === 'PUT' ? { ...body, id: rows[index].id } : { ...rows[index], ...body };
    return { body: rows[index], headers: {} };
  }

  if (method === 'DELETE') {
    const index = rows.findIndex((r) => String(r.id) === String(id));
    if (index !== -1) rows.splice(index, 1);
    return { body: {}, headers: {} };
  }

  throw new NotFound(`${method} ${pathname}`);
}

/** Only requests aimed at the json-server origin are intercepted. */
const MINE = /^https?:\/\/localhost:8080/i;

function parse(url) {
  const u = new URL(url, 'http://localhost:8080');
  return { pathname: u.pathname, params: u.searchParams };
}

export function installDemoServer(axios) {
  axios.defaults.adapter = async (config) => {
    const url = axios.getUri ? axios.getUri(config) : `${config.baseURL ?? ''}${config.url}`;
    if (!MINE.test(url)) throw new Error(`Demo build: refusing to call ${url}`);

    const { pathname, params } = parse(url);
    const method = (config.method || 'get').toUpperCase();
    const body = typeof config.data === 'string' ? JSON.parse(config.data || 'null') : config.data;

    await new Promise((r) => setTimeout(r, DELAY));
    try {
      const { body: data, headers } = handle(method, pathname, params, body);
      return { data, status: 200, statusText: 'OK', headers, config, request: {} };
    } catch (err) {
      // Shaped like a real axios error so `catch (e) { e.response.status }`
      // in the components still works.
      const error = new Error(err.message);
      error.response = { data: {}, status: err.status || 500, statusText: 'Not Found', headers: {}, config };
      error.config = config;
      throw error;
    }
  };

  // Login and Register use fetch() rather than axios.
  const nativeFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!MINE.test(url)) {
      if (nativeFetch) return nativeFetch(input, init);
      throw new Error(`Demo build: refusing to call ${url}`);
    }
    const { pathname, params } = parse(url);
    const method = (init.method || 'GET').toUpperCase();
    const body = init.body ? JSON.parse(init.body) : undefined;

    await new Promise((r) => setTimeout(r, DELAY));
    try {
      const { body: data, headers } = handle(method, pathname, params, body);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'content-type': 'application/json', ...headers },
      });
    } catch (err) {
      return new Response(JSON.stringify({}), { status: err.status || 500 });
    }
  };
}
