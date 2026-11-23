import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// Public demo account. Create this user in the database (see the SQL insert).
const DEMO = { email: "demo@minimart.com", password: "demo1234" };

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  // null | "form" | "demo" -> tells us which button should show "Signing in..."
  const [loadingMode, setLoadingMode] = useState(null);
  const loading = loadingMode !== null;
  const navigate = useNavigate();

  // Shared by the normal form and the demo button.
  const doLogin = async (emailValue, passwordValue, mode) => {
    setError("");
    setLoadingMode(mode);

    try {
      const res = await fetch("https://martpos.infinityfree.me/backend/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailValue, password: passwordValue }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      console.log("Logged in:", data.user);
      sessionStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (err) {
      setError("Could not reach the server. Is the PHP server running?");
    } finally {
      setLoadingMode(null);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    doLogin(email, password, "form");
  };

  const handleDemo = () => {
    // Fill the fields too, so the visitor sees what was used.
    setEmail(DEMO.email);
    setPassword(DEMO.password);
    doLogin(DEMO.email, DEMO.password, "demo");
  };

  const inputClass =
    "w-full px-3 py-2 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg " +
    "focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 transition";

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900">Mini Mart</h1>
        <p className="text-gray-600 text-sm mt-1 mb-6">
          Sign in to your staff account.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@minimart.com"
              required
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {loadingMode === "form" ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5" aria-hidden="true">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={handleDemo}
          disabled={loading}
          className="w-full bg-white text-emerald-700 text-sm font-semibold py-2.5 border border-emerald-600 rounded-lg hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
        >
          {loadingMode === "demo" ? "Opening demo..." : "Try demo account"}
        </button>
        <p className="mt-2 text-center text-xs text-gray-500">
          No signup needed. Explore the app with sample data.
        </p>
      </div>
    </div>
  );
}