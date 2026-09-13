import React from "react";
import { NavLink, Outlet, Link } from "react-router-dom";

/**
 * Chrome for the admin screens.
 *
 * There is no sign-in guard, on purpose and for the same reason as the other
 * demos in this hub: the build has no database and no API — the whole backend
 * is a file in the browser — so an open dashboard shows a visitor exactly what
 * reading the source would. The strip at the top says so, because a prospect
 * reading a revenue figure deserves to know it was invented before they
 * believe it.
 */
const LINKS = [
  { to: "/admin", end: true, label: "Dashboard" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/customers", label: "Customers" },
];

const AdminLayout = () => {
  return (
    {/* No data-theme here: the admin follows whichever theme the visitor
        picked on the shop. A theme name pinned here would also have to be
        one daisyUI actually compiled — "winter" is named in
        tailwind.config.js but never reaches the CSS, because the list sits
        under `theme:` where daisyUI expects a top-level `daisyui:` key. */}
    <div className="min-h-screen bg-base-200">
      <div className="bg-base-300 text-base-content px-4 py-2 text-sm flex flex-wrap gap-x-3 gap-y-1 items-center">
        <span className="badge badge-neutral badge-sm font-bold">DEMO</span>
        <span>
          Every product, order and customer here is invented. The dashboard opens with no
          sign-in because there is no database behind it to protect.
        </span>
        <Link to="/" className="ml-auto font-bold underline">
          Back to the shop
        </Link>
      </div>

      <div className="flex min-h-screen">
        <aside className="w-60 shrink-0 bg-neutral text-neutral-content p-4 hidden md:block">
          <Link to="/admin" className="block text-2xl font-bold tracking-wide mb-6">
            SIDRA
            <span className="block text-xs font-normal opacity-70 tracking-widest">
              CLOTHING &amp; SHOES
            </span>
          </Link>
          <p className="text-xs uppercase font-bold opacity-60 mb-2">Shop admin</p>
          <nav className="flex flex-col gap-1">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-base-100 text-base-content font-bold"
                      : "opacity-70 hover:opacity-100"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="divider opacity-30"></div>
          <Link to="/" className="text-sm opacity-70 hover:opacity-100 px-3">
            View the shop
          </Link>
        </aside>

        <main className="flex-1 min-w-0">
          {/* The mobile nav: the sidebar is hidden below md, so without this the
              admin is a single screen with no way to reach the others. */}
          <nav className="md:hidden flex overflow-x-auto gap-1 bg-neutral text-neutral-content p-2">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded px-3 py-2 text-sm whitespace-nowrap ${
                    isActive ? "bg-base-100 text-base-content font-bold" : "opacity-70"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
