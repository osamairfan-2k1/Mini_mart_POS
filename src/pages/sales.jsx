import { useState, useEffect, useMemo, useRef } from "react";
import Sidebar from "./sidebar";

const formatRs = (n) => "Rs. " + Number(n || 0).toLocaleString();

function ReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 px-4 print:bg-transparent">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6 print:shadow-none print:rounded-none">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-stone-900">Mini Mart</h2>
          <p className="text-xs text-stone-500">{receipt.timestamp.toLocaleString()}</p>
          <p className="text-xs text-stone-500">Sale #{receipt.saleId}</p>
        </div>

        <div className="border-t border-dashed border-stone-300 my-3" />

        <div className="space-y-1.5 mb-3">
          {receipt.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm text-stone-700">
              <span className="truncate pr-2">{item.name} × {item.quantity}</span>
              <span className="shrink-0">{formatRs(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-dashed border-stone-300 my-3" />

        <div className="flex justify-between font-bold text-stone-900 mb-1">
          <span>Total</span>
          <span>{formatRs(receipt.total)}</span>
        </div>
        <p className="text-xs text-stone-500 capitalize mb-5">Paid by {receipt.paymentMethod}</p>

        <div className="flex gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 rounded-lg border border-stone-300 text-stone-700 font-medium py-2 text-sm hover:bg-stone-50 transition"
          >
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg bg-emerald-600 text-white font-semibold py-2 text-sm hover:bg-emerald-700 transition"
          >
            New sale
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({}); // { productId: quantity }
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const searchBoxRef = useRef(null);

  const fetchProducts = async () => {
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch("http://localhost/backend/getproducts.php", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load products");
        return;
      }
      setProducts(data.products);
    } catch (err) {
      setError("Could not reach the server. Is the PHP server running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // close the suggestion dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => (p.name || "").toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, query]);

  const addToCart = (product) => {
    setCart((prev) => {
      const current = prev[product.id] || 0;
      if (current >= product.stock_quantity) return prev; // can't exceed stock
      return { ...prev, [product.id]: current + 1 };
    });
    setQuery("");
    setShowSuggestions(false);
  };

  const updateQuantity = (productId, quantity, max) => {
    const qty = Math.max(0, Math.min(quantity, max));
    setCart((prev) => {
      const next = { ...prev };
      if (qty === 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  };

  const removeFromCart = (productId) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const cartItems = useMemo(
    () =>
      Object.entries(cart).map(([productId, quantity]) => ({
        product: products.find((p) => Number(p.id) === Number(productId)),
        quantity,
      })),
    [cart, products]
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const total = cartItems.reduce(
    (sum, item) => sum + (item.product ? item.product.selling_price * item.quantity : 0),
    0
  );

  const handleCheckout = async () => {
    setError("");
    setSuccess("");
    if (cartItems.length === 0) {
      setError("Add at least one product before checking out");
      return;
    }

    setSubmitting(true);
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch("http://localhost/backend/create_sale.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cartItems.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
          payment_method: paymentMethod,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Checkout failed");
        return;
      }

      setReceipt({
        saleId: data.sale_id,
        items: cartItems.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.selling_price,
        })),
        total: data.total,
        paymentMethod,
        timestamp: new Date(),
      });

      setSuccess(`Sale #${data.sale_id} completed — ${formatRs(data.total)}`);
      setCart({});
      fetchProducts();
    } catch (err) {
      setError("Could not reach the server. Is the PHP server running?");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-stone-100">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <header className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">Sales</h1>
            <p className="mt-1 text-stone-600">
              Search a product to add it, then complete the sale to generate a bill.
            </p>
          </header>

          {error && (
            <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-xl">
              {error}
            </div>
          )}
          {success && (
            <div role="status" className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 max-w-xl">
              {success}
            </div>
          )}

          {/* Summary cards, matching Inventory */}
          {!loading && (
            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                <p className="text-sm text-stone-500">Items in cart</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">{cartCount}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                <p className="text-sm text-stone-500">Bill total</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">{formatRs(total)}</p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                <p className="text-sm text-stone-500">Products available</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">{products.length}</p>
              </div>
            </section>
          )}

          {/* Search-to-add */}
          <div ref={searchBoxRef} className="relative mb-6 max-w-md">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
              viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
            >
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search a product to add to the bill"
              className="w-full rounded-lg border border-stone-300 bg-white py-2 pl-9 pr-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
            />

            {showSuggestions && query.trim() && (
              <div className="absolute z-10 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg overflow-hidden">
                {suggestions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-stone-500">No matching products.</p>
                ) : (
                  suggestions.map((product) => {
                    const outOfStock = product.stock_quantity <= 0;
                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => !outOfStock && addToCart(product)}
                        disabled={outOfStock}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed border-b border-stone-100 last:border-b-0"
                      >
                        <span>
                          <span className="font-medium text-stone-900">{product.name}</span>
                          <span className="ml-2 text-xs text-stone-500">{product.category || "Uncategorized"}</span>
                        </span>
                        <span className="text-stone-600 shrink-0 ml-3">
                          {formatRs(product.selling_price)} · {outOfStock ? "Out of stock" : `${product.stock_quantity} left`}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* Bill table, styled like Inventory's table */}
          <div className="rounded-xl border border-stone-200 bg-white overflow-hidden mb-6">
            {cartItems.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-lg font-semibold text-stone-900">No items yet</p>
                <p className="mt-1 text-stone-600">Search above to start building the bill.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50">
                    <th className="text-left font-medium text-stone-500 px-5 py-3">Product</th>
                    <th className="text-left font-medium text-stone-500 px-5 py-3">Price</th>
                    <th className="text-left font-medium text-stone-500 px-5 py-3">Quantity</th>
                    <th className="text-left font-medium text-stone-500 px-5 py-3">Subtotal</th>
                    <th className="text-right font-medium text-stone-500 px-5 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map(({ product, quantity }) => (
                    <tr key={product.id} className="border-b border-stone-100 last:border-b-0 hover:bg-stone-50 transition">
                      <td className="px-5 py-3.5 font-medium text-emerald-700">{product.name}</td>
                      <td className="px-5 py-3.5 text-stone-900">{formatRs(product.selling_price)}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity - 1, product.stock_quantity)}
                            className="w-6 h-6 rounded border border-stone-300 text-stone-600 hover:bg-stone-100"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-stone-900">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, quantity + 1, product.stock_quantity)}
                            disabled={quantity >= product.stock_quantity}
                            className="w-6 h-6 rounded border border-stone-300 text-stone-600 hover:bg-stone-100 disabled:opacity-30"
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-medium text-stone-900">
                        {formatRs(product.selling_price * quantity)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Bill summary + checkout */}
          {cartItems.length > 0 && (
            <div className="rounded-xl border border-stone-200 bg-white p-5 max-w-sm ml-auto">
              <div className="flex justify-between text-lg font-bold text-stone-900 mb-4">
                <span>Total</span>
                <span>{formatRs(total)}</span>
              </div>

              <label className="block text-xs font-medium text-stone-600 mb-1.5">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 mb-4 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>

              <button
                onClick={handleCheckout}
                disabled={submitting}
                className="w-full rounded-lg bg-emerald-600 text-white font-semibold py-2.5 text-sm hover:bg-emerald-700 transition disabled:opacity-40"
              >
                {submitting ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          )}
        </div>
      </main>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}