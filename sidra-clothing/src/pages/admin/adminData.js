import axios from "axios";

/**
 * One place that reads the shop's data for the admin screens.
 *
 * Deliberately the same endpoints the storefront uses, answered by the same
 * in-page server in src/demo/. The admin therefore cannot describe a catalogue
 * the shop does not sell, or quote a total the order list cannot produce —
 * which is the failure this hub has already shipped once.
 */
const API = "http://localhost:8080";

export const money = (value) =>
  `$${Number(value ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const STATUS_TONE = {
  delivered: "badge-success",
  "in progress": "badge-warning",
  cancelled: "badge-error",
};

export async function fetchAdminData() {
  const [products, orders, users] = await Promise.all([
    axios.get(`${API}/products`),
    axios.get(`${API}/orders`),
    axios.get(`${API}/user`),
  ]);
  return {
    products: products.data,
    orders: orders.data,
    users: users.data,
  };
}

/** Totals the dashboard shows, all derived from the rows the other screens list. */
export function summarise({ products, orders }) {
  const settled = orders.filter((o) => o.orderStatus !== "cancelled");
  const revenue = settled.reduce((sum, o) => sum + Number(o.subtotal ?? 0), 0);
  const units = orders.reduce(
    (sum, o) => sum + (o.cartItems ?? []).reduce((n, i) => n + Number(i.amount ?? 1), 0),
    0,
  );
  const outOfStock = products.filter((p) => !p.isInStock);
  return {
    revenue,
    orderCount: orders.length,
    settledCount: settled.length,
    averageOrder: settled.length ? revenue / settled.length : 0,
    units,
    productCount: products.length,
    outOfStock,
  };
}

export const adminLoader = async () => fetchAdminData();
