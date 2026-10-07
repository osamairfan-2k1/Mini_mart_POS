import { useState, useEffect, useMemo } from "react";
import Sidebar from "./sidebar";

const formatRs = (n) => "Rs. " + Number(n || 0).toLocaleString();
const isLow = (p) => Number(p.stock_quantity) <= Number(p.low_stock_threshold);

async function readJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    console.error("Server did not return valid JSON:", text);
    return null;
  }
}

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // add product form state
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
      setError("Could not reach the server. Is the PHP server running?");
    } finally {
      setLoading(false);
    }
  }

  // unique category names for the dropdown, alphabetical, "Uncategorized" last
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category || "Uncategorized"));
    return Array.from(set).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
  }, [products]);

  const lowCount = products.filter(isLow).length;
  const stockValue = products.reduce(
    (sum, p) => sum + Number(p.selling_price || 0) * Number(p.stock_quantity || 0),
    0
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (lowOnly && !isLow(p)) return false;
      if (selectedCategory !== "All" && (p.category || "Uncategorized") !== selectedCategory) return false;
      if (!q) return true;
      return (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q);
    });
  }, [products, query, lowOnly, selectedCategory]);

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

    if (!name.trim()) return setFormError("Product name is required.");
    if (costPrice === "" || Number(costPrice) < 0) return setFormError("Enter a valid cost price.");
    if (sellingPrice === "" || Number(sellingPrice) < 0) return setFormError("Enter a valid selling price.");
    if (stockQuantity === "" || Number(stockQuantity) < 0) return setFormError("Enter a valid stock quantity.");
    if (lowStockThreshold === "" || Number(lowStockThreshold) < 0) return setFormError("Enter a valid low stock threshold.");

    setFormError("");
    setSubmitting(true);

    try {
      const token = sessionStorage.getItem("token");
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
      if (!data) return setFormError("The server sent an unexpected response. Check the browser console and the PHP error log.");
      if (!res.ok) return setFormError(data.error || "Failed to add product");

      setProducts((prev) => [
        data.product,
        ...prev.filter((p) => String(p.id) !== String(data.product.id)),
      ]);

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
      const token = sessionStorage.getItem("token");
      const res = await fetch("http://localhost/backend/deleteproduct.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: product.id }),
      });

      const data = await readJson(res);
      if (!data) return setDeleteError("The server sent an unexpected response. Check the browser console and the PHP error log.");
      if (!res.ok) return setDeleteError(data.error || "Failed to delete product");

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
              <h1 className="text-3xl font-bold tracking-tight text-stone-900">Inventory</h1>
              <p className="mt-1 text-stone-600">Manage your mart's stock and prices from here.</p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              + Add Product
            </button>
          </header>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-xl">
              {error}
            </div>
          )}
          {deleteError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-xl">
              {deleteError}
            </div>
          )}
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
                <p className="mt-1 text-2xl font-semibold text-stone-900">{products.length}</p>
              </div>
              <div className={`rounded-xl border px-5 py-4 ${lowCount > 0 ? "border-red-200 bg-red-50" : "border-stone-200 bg-white"}`}>
                <p className={`text-sm ${lowCount > 0 ? "text-red-700" : "text-stone-500"}`}>Low on stock</p>
                <p className={`mt-1 text-2xl font-semibold ${lowCount > 0 ? "text-red-700" : "text-stone-900"}`}>{lowCount}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                <p className="text-sm text-stone-500">Stock value</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">{formatRs(stockValue)}</p>
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

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              >
                <option value="All">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setLowOnly(!lowOnly)}
                className={`rounded-lg border px-3.5 py-2 text-sm font-medium ${
                  lowOnly ? "border-red-600 bg-red-600 text-white" : "border-stone-300 bg-white text-stone-700 hover:bg-stone-50"
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
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-6 px-5 py-4 border-b border-stone-100 last:border-b-0">
                  <div className="h-4 w-1/4 rounded bg-stone-200" />
                  <div className="h-4 w-1/6 rounded bg-stone-200" />
                  <div className="h-4 w-1/6 rounded bg-stone-200" />
                  <div className="h-4 w-1/6 rounded bg-stone-200" />
                </div>
              ))}
            </div>
          ) : products.length === 0 && !error ? (
            <div className="rounded-xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
              <p className="text-lg font-semibold text-stone-900">No products yet</p>
              <p className="mt-1 text-stone-600">Add your first product to start tracking stock.</p>
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
              <p className="mt-1 text-stone-600">Try a different search or filter.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <th className="text-left font-medium text-stone-500 px-5 py-3">Product</th>
                    <th className="text-left font-medium text-stone-500 px-5 py-3">Category</th>
                    <th className="text-left font-medium text-stone-500 px-5 py-3">Price</th>
                    <th className="text-left font-medium text-stone-500 px-5 py-3">In Stock</th>
                    <th className="text-left font-medium text-stone-500 px-5 py-3">Status</th>
                    <th className="text-right font-medium text-stone-500 px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((product) => {
                    const low = isLow(product);
                    return (
                      <tr key={product.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition">
                        <td className="px-5 py-3.5 font-medium text-emerald-700">{product.name}</td>
                        <td className="px-5 py-3.5 text-stone-600">{product.category || "Uncategorized"}</td>
                        <td className="px-5 py-3.5 text-stone-900">{formatRs(product.selling_price)}</td>
                        <td className="px-5 py-3.5 text-stone-900">{product.stock_quantity}</td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            low ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          }`}>
                            {low ? "Low stock" : "In stock"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(product)}
                            disabled={deletingId === product.id}
                            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {deletingId === product.id ? "Deleting..." : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
              <button type="button" onClick={closeAddModal} className="text-stone-400 hover:text-stone-600">✕</button>
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
                  list="category-suggestions"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  placeholder="e.g. Snacks"
                />
                <datalist id="category-suggestions">
                  {categories.filter((c) => c !== "Uncategorized").map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
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