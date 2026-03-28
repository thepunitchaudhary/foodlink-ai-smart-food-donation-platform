import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import Login from './pages/Login';
import Register from './pages/Register';
import RestaurantDashboard from './pages/RestaurantDashboard';
import NgoDashboard from './pages/NgoDashboard';
import AdminDashboard from './pages/AdminDashboard';


// ✅ SIMPLE & SAFE PROTECTED ROUTE
function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-4">Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}


// ✅ HOME REDIRECT (SMART)
function HomeRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-4">Loading...</p>;

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'ngo') return <Navigate to="/ngo" replace />;
  return <Navigate to="/restaurant" replace />;
}


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>

        <Toaster position="top-right" />

        <Routes>

          {/* Default */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Restaurant */}
          <Route
            path="/restaurant"
            element={
              <ProtectedRoute role="restaurant">
                <RestaurantDashboard />
              </ProtectedRoute>
            }
          />

          {/* NGO */}
          <Route
            path="/ngo"
            element={
              <ProtectedRoute role="ngo">
                <NgoDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>

      </AuthProvider>
    </BrowserRouter>
  );
}