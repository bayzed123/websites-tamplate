import React from "react";
import { useLoaderData } from "react-router-dom";
import { money } from "./adminData";

const AdminCustomers = () => {
  const { users, orders } = useLoaderData();

  // Spend and order counts are counted from the order list rather than stored,
  // so a customer row can never claim a total the Orders screen cannot show.
  const rows = users.map((user) => {
    const theirs = orders.filter((o) => o.userId === user.id);
    const settled = theirs.filter((o) => o.orderStatus !== "cancelled");
    return {
      ...user,
      orderCount: theirs.length,
      spent: settled.reduce((sum, o) => sum + Number(o.subtotal ?? 0), 0),
      wishlist: (user.userWishlist ?? []).length,
    };
  });

  return (
    <div className="p-6">
      <p className="text-xs uppercase font-bold opacity-60">People</p>
      <h1 className="text-3xl font-bold mb-1">Customers</h1>
      <p className="opacity-70 mb-5">
        {rows.length} registered {rows.length === 1 ? "account" : "accounts"} — register on the
        shop and the new account appears here
      </p>

      <div className="card bg-base-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Delivery address</th>
                <th className="text-right">Orders</th>
                <th className="text-right">Spent</th>
                <th className="text-right">Wishlist</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user) => (
                <tr key={user.id}>
                  <td className="font-medium">
                    {user.name} {user.lastname}
                  </td>
                  <td className="opacity-70">
                    <span className="block">{user.email}</span>
                    <span className="text-xs">{user.phone}</span>
                  </td>
                  <td className="opacity-70">{user.adress}</td>
                  <td className="text-right">{user.orderCount}</td>
                  <td className="text-right font-bold">{money(user.spent)}</td>
                  <td className="text-right">{user.wishlist}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminCustomers;
