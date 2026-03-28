import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ✅ Logout handler
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // ✅ FINAL Dashboard Navigation (clean + safe)
  const navigateDashboard = () => {
    if (!user?.role) return navigate('/login');

    if (user.role === 'restaurant') navigate('/restaurant');
    else if (user.role === 'ngo') navigate('/ngo');
    else navigate('/admin');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div
            onClick={navigateDashboard}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 transition">
              F
            </div>
            <span className="text-lg font-bold text-green-600">
              FoodLink AI
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {user && (
              <>
                {/* ✅ Dashboard Button */}
                <button
                  onClick={navigateDashboard}
                  className="text-sm font-medium text-gray-700 hover:text-green-600 transition"
                >
                  Dashboard
                </button>

                <div className="flex items-center gap-3">

                  {/* Role */}
                  <div className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold uppercase">
                    {user.role}
                  </div>

                  {/* Name */}
                  <span className="text-sm text-gray-700">
                    {user.name}
                  </span>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 text-sm font-medium text-white bg-black rounded-xl hover:bg-gray-800 transition"
                  >
                    Logout
                  </button>

                </div>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          >
            ☰
          </button>

        </div>

        {/* Mobile Menu */}
        {mobileOpen && user && (
          <div className="md:hidden pb-4">

            <div className="flex flex-col gap-2">

              <button
                onClick={() => {
                  navigateDashboard();
                  setMobileOpen(false);
                }}
                className="px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 text-left"
              >
                Dashboard
              </button>

              <div className="px-3 py-2 text-xs text-gray-500">
                {user.name} · <span className="uppercase text-green-600">{user.role}</span>
              </div>

              <button
                onClick={handleLogout}
                className="mx-3 px-4 py-2 text-sm text-white bg-black rounded-xl hover:bg-gray-800"
              >
                Logout
              </button>

            </div>

          </div>
        )}

      </div>
    </nav>
  );
}