import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { key: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
  { key: "sales", label: "Sales", icon: ShoppingCart, path: "/sales" },
  { key: "settings", label: "Settings", icon: Settings, path: "/settings" },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="h-screen w-64 bg-white border-r border-gray-200 p-4">
      <h1 className="text-lg font-semibold text-black mb-6">Mini Mart</h1>

      <nav className="space-y-1">
        {NAV_ITEMS.map(({ key, label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm ${
                isActive
                  ? "bg-gray-100 text-black font-medium"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}