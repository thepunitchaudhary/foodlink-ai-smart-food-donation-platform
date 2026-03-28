import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Load from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    setLoading(false);
  }, []);

  // ✅ LOGIN (works with token + user)
  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });

    const { access_token, user: userData } = res.data;

    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(access_token);
    setUser(userData);

    return userData;
  };

  // ✅ FIXED REGISTER (no token expected)
  const register = async (name, email, password, role) => {
    const res = await API.post('/auth/register', {
      name,
      email,
      password,
      role,
    });

    // ✅ just return response (no token handling)
    return res.data;
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ✅ Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}