import React, { useMemo, useState } from "react";
import { useLoaderData } from "react-router-dom";
import { money } from "./adminData";
import { onImageError } from "../../demo/imageFallback";

const PAGE = 20;

const AdminProducts = () => {
  const { products } = useLoaderData();
  const [query, setQuery] = useState("");
  const [stock, setStock] = useState("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      // "all" is the dropdown's everything option, not a value any row holds.
      // Comparing it literally is what emptied the SmartGadget admin.
      if (stock === "in" && !p.isInStock) return false;
      if (stock === "out" && p.isInStock) return false;
      if (!q) return true;
      return `${p.name} ${p.brandName} ${p.productCode}`.toLowerCase().includes(q);
    });
  }, [products, query, stock]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages);
  const rows = filtered.slice((current - 1) * PAGE, current * PAGE);

  return (
    <div className="p-6">
      <p className="text-xs uppercase font-bold opacity-60">Catalogue</p>
      <h1 className="text-3xl font-bold mb-1">Products</h1>
      <p className="opacity-70 mb-5">
        {filtered.length} of {products.length} products — the same catalogue the shop sells
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="search"
          className="input input-bordered input-sm w-64 max-w-full"
          placeholder="Search name, brand or code"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          aria-label="Search products"
        />
        <select
          className="select select-bordered select-sm"
          value={stock}
          onChange={(e) => {
            setStock(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by stock"
        >
          <option value="all">Any stock level</option>
          <option value="in">In stock</option>
          <option value="out">Out of stock</option>
        </select>
      </div>

      <div className="card bg-base-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Category</th>
                <th className="text-right">Price</th>
                <th className="text-right">Rating</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center opacity-70 py-6">
                    No products match those filters.
                  </td>
                </tr>
              )}
              {rows.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <img
                        src={product.imageUrl}
                        onError={onImageError}
                        alt=""
                        className="w-10 h-10 object-cover rounded shrink-0"
                        loading="lazy"
                      />
                      <span className="font-medium line-clamp-2">{product.name}</span>
                    </div>
                  </td>
                  <td className="opacity-70">{product.brandName}</td>
                  <td className="opacity-70 capitalize">{product.category}</td>
                  <td className="text-right font-bold">{money(product.price?.current?.value)}</td>
                  <td className="text-right">{product.rating ?? "—"}</td>
                  <td>
                    <span className={`badge badge-sm ${product.isInStock ? "badge-success" : "badge-error"}`}>
                      {product.isInStock ? "In stock" : "Out of stock"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="join mt-4">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`join-item btn btn-sm ${n === current ? "btn-active" : ""}`}
              onClick={() => setPage(n)}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
