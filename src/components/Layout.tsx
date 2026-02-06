import { NavLink, Outlet } from "react-router-dom";
import { PieChart, BarChart3 } from "lucide-react";

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 p-1.5 rounded-lg">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900">基金工具</h1>
            </div>
            <nav className="flex items-center gap-1 ml-6">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <PieChart className="w-4 h-4" />
                估值
              </NavLink>
              <NavLink
                to="/market"
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                <BarChart3 className="w-4 h-4" />
                行情
              </NavLink>
            </nav>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
