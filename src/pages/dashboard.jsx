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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const token = sessionStorage.getItem("token");
      const res = await fetch("http://localhost/backend/dashboard.php", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await readJson(res);

      if (!json) {
        setError("The server sent an unexpected response. Check the browser console and the PHP error log.");
        return;
      }
      if (!res.ok) {
        setError(json.error || "Failed to load dashboard");
        return;
      }
      setData(json);
    } catch (err) {
      console.error("Load dashboard failed:", err);
      setError("Could not reach the server. Is the PHP server running?");
    } finally {
      setLoading(false);
    }
  }

  const maxRevenue = data ? Math.max(...data.week.map((d) => d.revenue), 1) : 1;

  return (
    <div className="flex min-h-screen bg-stone-100">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-stone-900">Dashboard</h1>
            <p className="mt-1 text-stone-600">How your mart is doing today.</p>
          </header>

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-xl">
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-stone-500">Loading dashboard...</p>
          ) : (
            data && (
              <>
                {/* Today */}
                <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                    <p className="text-sm text-stone-500">Today's sales</p>
                    <p className="mt-1 text-2xl font-semibold text-stone-900">
                      {formatRs(data.today.revenue)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                    <p className="text-sm text-stone-500">Today's profit</p>
                    <p className="mt-1 text-2xl font-semibold text-emerald-700">
                      {formatRs(data.today.profit)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                    <p className="text-sm text-stone-500">Orders</p>
                    <p className="mt-1 text-2xl font-semibold text-stone-900">
                      {data.today.sales_count}
                    </p>
                  </div>
                  <div className="rounded-xl border border-stone-200 bg-white px-5 py-4">
                    <p className="text-sm text-stone-500">Items sold</p>
                    <p className="mt-1 text-2xl font-semibold text-stone-900">
                      {data.today.items_sold}
                    </p>
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                  {/* Last 7 days */}
                  <section className="rounded-xl border border-stone-200 bg-white p-5 lg:col-span-2">
                    <h2 className="text-base font-semibold text-stone-900">Last 7 days</h2>
                    <div className="mt-4 flex h-40 items-end gap-3">
                      {data.week.map((d) => (
                        <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end">
                          <span className="mb-1 text-[10px] text-stone-400">
                            {d.revenue > 0 ? Number(d.revenue).toLocaleString() : ""}
                          </span>
                          <div
                            className="w-full rounded-t-md bg-emerald-600"
                            style={{ height: (d.revenue / maxRevenue) * 100 + "%", minHeight: d.revenue > 0 ? 4 : 0 }}
                          />
                          <span className="mt-2 text-xs text-stone-500">
                            {new Date(d.day + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Low stock */}
                  <section className="rounded-xl border border-stone-200 bg-white p-5">
                    <h2 className="text-base font-semibold text-stone-900">Low stock</h2>
                    {data.low_stock.length === 0 ? (
                      <p className="mt-4 text-sm text-stone-500">Everything is well stocked.</p>
                    ) : (
                      <ul className="mt-4 space-y-2">
                        {data.low_stock.map((p) => (
                          <li key={p.id} className="flex justify-between text-sm">
                            <span className="truncate pr-2 text-stone-700">{p.name}</span>
                            <span className="shrink-0 font-medium text-red-700">
                              {p.stock_quantity} left
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>

                {/* Recent sales */}
                <section className="mt-6 rounded-xl border border-stone-200 bg-white p-5">
                  <h2 className="text-base font-semibold text-stone-900">Recent sales</h2>
                  {data.recent.length === 0 ? (
                    <p className="mt-4 text-sm text-stone-500">No sales yet. Complete a sale to see it here.</p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-stone-200 text-stone-500">
                            <th className="py-2 pr-4 font-medium">Sale</th>
                            <th className="py-2 pr-4 font-medium">Time</th>
                            <th className="py-2 pr-4 font-medium">Items</th>
                            <th className="py-2 pr-4 font-medium">Payment</th>
                            <th className="py-2 text-right font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recent.map((s) => (
                            <tr key={s.id} className="border-b border-stone-100 text-stone-700">
                              <td className="py-2 pr-4">#{s.id}</td>
                              <td className="py-2 pr-4">
                                {new Date(s.created_at.replace(" ", "T")).toLocaleString()}
                              </td>
                              <td className="py-2 pr-4">{s.items}</td>
                              <td className="py-2 pr-4 capitalize">{s.payment_method}</td>
                              <td className="py-2 text-right font-medium text-stone-900">
                                {formatRs(s.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              </>
            )
          )}
        </div>
      </main>
    </div>
  );
}