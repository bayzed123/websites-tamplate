import React, { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { money, STATUS_TONE } from "./adminData";
import { onImageError } from "../../demo/imageFallback";

const TABS = ["all", "in progress", "delivered", "cancelled"];

const AdminOrders = () => {
  const { orders, users } = useLoaderData();
  const [status, setStatus] = useState("all");
  const [open, setOpen] = useState(null);

  const byId = useMemo(
    () => Object.fromEntries(users.map((u) => [u.id, u])),
    [users],
  );

  // "all" is the tab's everything option, never a value a row holds.
  const rows = useMemo(
    () => (status === "all" ? orders : orders.filter((o) => o.orderStatus === status)),
    [orders, status],
  );

  return (
    <div className="p-6">
      <p className="text-xs uppercase font-bold opacity-60">Fulfilment</p>
      <h1 className="text-3xl font-bold mb-1">Orders</h1>
      <p className="opacity-70 mb-5">
        {rows.length} of {orders.length} orders
      </p>

      <div role="tablist" className="tabs tabs-boxed mb-4 inline-flex flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            className={`tab capitalize ${status === tab ? "tab-active" : ""}`}
            onClick={() => {
              setStatus(tab);
              setOpen(null);
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th className="text-right">Items</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center opacity-70 py-6">
                    No orders with that status.
                  </td>
                </tr>
              )}
              {rows.map((order) => {
                const items = order.cartItems ?? [];
                const customer = byId[order.userId];
                const isOpen = open === order.id;
                return (
                  <React.Fragment key={order.id}>
                    <tr>
                      <td className="font-mono text-xs">{String(order.id).slice(0, 8)}</td>
                      <td>
                        {customer ? (
                          <>
                            <span className="block">{customer.name} {customer.lastname}</span>
                            <span className="opacity-60 text-xs">{customer.email}</span>
                          </>
                        ) : (
                          // Seed orders reference ids with no matching account.
                          // Saying so beats printing a blank cell that reads as
                          // a rendering bug.
                          <span className="opacity-60">Guest checkout</span>
                        )}
                      </td>
                      <td className="text-right">{items.length}</td>
                      <td className="text-right font-bold">{money(order.subtotal)}</td>
                      <td>
                        <span className={`badge badge-sm ${STATUS_TONE[order.orderStatus] ?? ""}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => setOpen(isOpen ? null : order.id)}
                          aria-expanded={isOpen}
                        >
                          {isOpen ? "Hide" : "Items"}
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} className="bg-base-200">
                          <ul className="flex flex-col gap-2 py-2">
                            {items.map((item, i) => (
                              <li key={`${order.id}-${i}`} className="flex items-center gap-3">
                                <img
                                  src={item.image}
                                  onError={onImageError}
                                  alt=""
                                  className="w-10 h-10 object-cover rounded shrink-0"
                                  loading="lazy"
                                />
                                <span className="flex-1 min-w-0 line-clamp-1">{item.title}</span>
                                <span className="opacity-70 text-sm">
                                  {item.selectedSize ? `size ${item.selectedSize} · ` : ""}
                                  ×{item.amount ?? 1}
                                </span>
                                <span className="font-bold">{money(item.price)}</span>
                              </li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOrders;
