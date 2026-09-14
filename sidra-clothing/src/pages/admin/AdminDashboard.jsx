import React from "react";
import { useLoaderData, Link } from "react-router-dom";
import { money, summarise, STATUS_TONE } from "./adminData";
import { onImageError } from "../../demo/imageFallback";

const AdminDashboard = () => {
  const data = useLoaderData();
  const s = summarise(data);

  const tiles = [
    { label: "Revenue", value: money(s.revenue), note: `across ${s.settledCount} settled orders` },
    { label: "Orders", value: String(s.orderCount), note: `${s.units} items sold` },
    { label: "Average order", value: money(s.averageOrder), note: "cancelled orders excluded" },
    { label: "Catalogue", value: String(s.productCount), note: `${s.outOfStock.length} out of stock` },
  ];

  return (
    <div className="p-6">
      <p className="text-xs uppercase font-bold opacity-60">Sidra Clothing &amp; Shoes</p>
      <h1 className="text-3xl font-bold mb-6">Store performance</h1>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="card bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <p className="text-xs uppercase font-bold opacity-60">{tile.label}</p>
              <p className="text-3xl font-bold">{tile.value}</p>
              <p className="text-sm opacity-70">{tile.note}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-0">
            <div className="flex justify-between items-center p-4 pb-2">
              <h2 className="font-bold">Recent orders</h2>
              <Link to="/admin/orders" className="text-sm opacity-70 hover:opacity-100">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Items</th>
                    <th className="text-right">Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.slice(0, 6).map((order) => (
                    <tr key={order.id}>
                      <td className="font-mono text-xs">{String(order.id).slice(0, 8)}</td>
                      <td>{(order.cartItems ?? []).length}</td>
                      <td className="text-right font-bold">{money(order.subtotal)}</td>
                      <td>
                        <span className={`badge badge-sm ${STATUS_TONE[order.orderStatus] ?? ""}`}>
                          {order.orderStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-sm">
          <div className="card-body p-0">
            <div className="flex justify-between items-center p-4 pb-2">
              <h2 className="font-bold">Out of stock</h2>
              <Link to="/admin/products" className="text-sm opacity-70 hover:opacity-100">
                Manage catalogue
              </Link>
            </div>
            <div className="overflow-x-auto">
              {s.outOfStock.length === 0 ? (
                <p className="p-4 opacity-70">Everything in the catalogue is in stock.</p>
              ) : (
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Brand</th>
                      <th className="text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.outOfStock.slice(0, 6).map((product) => (
                      <tr key={product.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <img
                              src={product.imageUrl}
                              onError={onImageError}
                              alt=""
                              className="w-8 h-8 object-cover rounded"
                              loading="lazy"
                            />
                            <span className="line-clamp-1">{product.name}</span>
                          </div>
                        </td>
                        <td className="opacity-70">{product.brandName}</td>
                        <td className="text-right">{money(product.price?.current?.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
