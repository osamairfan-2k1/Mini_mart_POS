import { useState, useEffect } from "react";
import Sidebar from "./sidebar";

const formatRs = (n) => "Rs. " + Number(n || 0).toLocaleString();
async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Server did not return valid JSON:", text);
    return null;
  }
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  // fields for the add product form
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch("http://localhost/backend/getproducts.php", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(res);

      if (!data) {
        setError("The server sent an unexpected response. Check the browser console and the PHP error log.");
        return;
      }
      if (!res.ok) {
        setError(data.error || "Failed to load products");
        return;
      }
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch (err) {
      console.error("Load products failed:", err);
      setError("Could not reach the Server. Is the PHP server running?");
    } finally {
      setLoading(false);
    }
  }

  function isLow(p) {
    return Number(p.stock_quantity) <= Number(p.low_stock_threshold);
  }

  // count how many products are low on stock
  let lowCount = 0;
  for (const p of products) {
    if (isLow(p)) lowCount++;
  }

  // total value of everything in stock
  let stockValue = 0;
  for (const p of products) {
    stockValue += Number(p.selling_price || 0) * Number(p.stock_quantity || 0);
  }

  // apply search + low stock filter
  const filtered = products.filter((p) => {
    if (lowOnly && !isLow(p)) return false;

    const q = query.trim().toLowerCase();
    if (!q) return true;

    // named pName / pCategory so they don't shadow the form state above
    const pName = (p.name || "").toLowerCase();
    const pCategory = (p.category || "").toLowerCase();
    return pName.includes(q) || pCategory.includes(q);
  });

  function openAddModal() {
    setName("");
    setCategory("");
    setCostPrice("");
    setSellingPrice("");
    setStockQuantity("");
    setLowStockThreshold("");
    setFormError("");
    setNotice("");
    setShowAddModal(true);
  }

  function closeAddModal() {
    if (submitting) return;
    setShowAddModal(false);
  }

  async function handleAddProduct(e) {
    e.preventDefault();

    if (!name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (costPrice === "" || Number(costPrice) < 0) {
      setFormError("Enter a valid cost price.");
      return;
    }
    if (sellingPrice === "" || Number(sellingPrice) < 0) {
      setFormError("Enter a valid selling price.");
      return;
    }
    if (stockQuantity === "" || Number(stockQuantity) < 0) {
      setFormError("Enter a valid stock quantity.");
      return;
    }
    if (lowStockThreshold === "" || Number(lowStockThreshold) < 0) {
      setFormError("Enter a valid low stock threshold.");
      return;
    }

    setFormError("");
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost/backend/addproduct.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          category: category.trim(),
          cost_price: Number(costPrice),
          selling_price: Number(sellingPrice),
          stock_quantity: Number(stockQuantity),
          low_stock_threshold: Number(lowStockThreshold),
        }),
      });

      const data = await readJson(res);

      if (!data) {
        setFormError("The server sent an unexpected response. Check the browser console and the PHP error log.");
        return;
      }
      if (!res.ok) {
        setFormError(data.error || "Failed to add product");
        return;
      }

      // put the new/updated product at the top, without duplicating it
      setProducts((prev) => [
        data.product,
        ...prev.filter((p) => String(p.id) !== String(data.product.id)),
      ]);

      // if the product already existed, the server added to its stock
      setNotice(
        data.merged
          ? `${data.product.name} already existed. Added ${Number(stockQuantity)} to its stock.`
          : ""
      );
      setShowAddModal(false);
    } catch (err) {
      console.error("Add product failed:", err);
      setFormError("Could not reach the server. Is the PHP server running?");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteProduct(product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;

    setDeleteError("");
    setNotice("");
    setDeletingId(product.id);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost/backend/deleteproduct.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: product.id }),
      });

      const data = await readJson(res);

      if (!data) {
        setDeleteError("The server sent an unexpected response. Check the browser console and the PHP error log.");
        return;
      }
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete product");
        return;
      }

      setProducts((prev) => prev.filter((p) => String(p.id) !== String(product.id)));
    } catch (err) {
      console.error("Delete product failed:", err);
      setDeleteError("Could not reach the server. Is the PHP server running?");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex min-h-screen bg-stone-100">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-stone-900">
                Products
              </h1>
              <p className="mt-1 text-stone-600">
                Manage your mart's stock and prices from here.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Add Product
            </button>
          </header>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-xl">
              {error}
            </div>
          )}

          {/* Delete error */}
          {deleteError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-xl">
              {deleteError}
            </div>
          )}

          {/* Merge notice */}
          {notice && (
            <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 max-w-xl">
              {notice}
            </div>
          )}

          {/* Summary */}
          {!loading && !error && products.length > 0 && (
            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                <p className="text-sm text-stone-500">Total products</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">
                  {products.length}
                </p>
              </div>
              <div
                className={`rounded-xl border px-5 py-4 ${
                  lowCount > 0 ? "border-red-200 bg-red-50" : "border-stone-200 bg-white"
                }`}
              >
                <p className={`text-sm ${lowCount > 0 ? "text-red-700" : "text-stone-500"}`}>
                  Low on stock
                </p>
                <p
                  className={`mt-1 text-2xl font-semibold ${
                    lowCount > 0 ? "text-red-700" : "text-stone-900"
                  }`}
                >
                  {lowCount}
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                <p className="text-sm text-stone-500">Stock value</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">
                  {formatRs(stockValue)}
                </p>
              </div>
            </section>
          )}

          {/* Toolbar */}
          {!loading && products.length > 0 && (
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or category"
                className="w-full max-w-md rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              />

              <button
                type="button"
                onClick={() => setLowOnly(!lowOnly)}
                className={`rounded-lg border px-3.5 py-2 text-sm font-medium ${
                  lowOnly
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
                }`}
              >
                Low stock only
              </button>

              <p className="text-sm text-stone-500 sm:ml-auto">
                Showing {filtered.length} of {products.length}
              </p>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <p className="text-stone-500">Loading products...</p>
          ) : products.length === 0 && !error ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
              <p className="text-lg font-semibold text-stone-900">No products yet</p>
              <p className="mt-1 text-stone-600">
                Add your first product to start tracking stock.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Add Product
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
              <p className="text-lg font-semibold text-stone-900">No matching products</p>
              <p className="mt-1 text-stone-600">
                Try a different search or turn off the low stock filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((product) => {
                const low = isLow(product);
                const stock = Number(product.stock_quantity) || 0;
                const threshold = Number(product.low_stock_threshold) || 0;
                let pct = (stock / Math.max(threshold * 3, 1)) * 100;
                if (pct > 100) pct = 100;

                return (
                  <article
                    key={product.id}
                    className={`rounded-xl border bg-white p-5 shadow-sm ${
                      low ? "border-red-300" : "border-stone-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-semibold leading-snug text-stone-900">
                        {product.name}
                      </h2>
                      {low && (
                        <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                          Low stock
                        </span>
                      )}
                    </div>

                    <span className="mt-2 inline-block rounded-md bg-stone-100 px-2 py-0.5 text-xs text-stone-600">
                      {product.category || "Uncategorized"}
                    </span>

                    <p className="mt-4 text-2xl font-bold tracking-tight text-stone-900">
                      {formatRs(product.selling_price)}
                    </p>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className={`font-medium ${low ? "text-red-700" : "text-stone-700"}`}>
                          {stock} in stock
                        </span>
                        <span className="text-xs text-stone-400">Reorder at {threshold}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                        <div
                          className={`h-full rounded-full ${low ? "bg-red-500" : "bg-emerald-600"}`}
                          style={{ width: pct + "%" }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 border-t border-stone-100 pt-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(product)}
                        disabled={deletingId === product.id}
                        className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                      >
                        {deletingId === product.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Product modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4"
          onClick={closeAddModal}
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">Add Product</h2>
              <button type="button" onClick={closeAddModal} className="text-stone-400 hover:text-stone-600">
                ✕
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  placeholder="e.g. Lays Chips 40g"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  placeholder="e.g. Snacks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700">Cost price (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700">Selling price (Rs.)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  placeholder="0"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Stock qty</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Reorder at</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeAddModal}
                  disabled={submitting}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? "Adding..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}