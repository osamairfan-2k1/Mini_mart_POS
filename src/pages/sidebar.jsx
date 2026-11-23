import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingCart, Settings, Menu, X } from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { key: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
  { key: "sales", label: "Sales", icon: ShoppingCart, path: "/sales" },
  { key: "settings", label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const go = (path) => {
    navigate(path);
    setOpen(false);
  };

  const links = (
    <nav className="space-y-1">
      {NAV_ITEMS.map(({ key, label, icon: Icon, path }) => {
        const isActive = location.pathname === path;
        return (
          <button
            key={key}
            onClick={() => go(path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm ${
              isActive ? "bg-gray-100 text-black font-medium" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:hidden print:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-gray-700 hover:bg-gray-100"
        >
          <Menu size={22} />
        </button>
        <span className="text-lg font-semibold text-black">Mini Mart</span>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-stone-900/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white p-4 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-black">Mini Mart</h1>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            {links}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-gray-200 bg-white p-4 md:block print:hidden">
        <h1 className="mb-6 text-lg font-semibold text-black">Mini Mart</h1>
        {links}
      </aside>
    </>
  );
}