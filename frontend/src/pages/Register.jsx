import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('restaurant');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // ✅ Call API
      await register(name, email, password, role);

      // ✅ Success message
      toast.success("Account created successfully ✅");

      // ✅ Redirect to login page
      navigate("/login");

    } catch (err) {
      console.error(err);

      // ✅ Show backend error
      toast.error(
        err.response?.data?.detail || "Registration failed ❌"
      );
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'restaurant', label: '🍽️ Restaurant' },
    { value: 'ngo', label: '🤝 NGO' },
    { value: 'admin', label: '🛡️ Admin' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent-50 via-white to-primary-50 px-4 py-8">
      <div className="w-full max-w-md animate-slide-up">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            F
          </div>
          <h1 className="text-3xl font-bold">Create Account</h1>
          <p className="text-gray-500 mt-2">Join FoodLink AI today</p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-lg p-6 space-y-4"
        >

          {/* Name */}
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full p-3 border rounded-lg"
          />

          {/* Email */}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-3 border rounded-lg"
          />

          {/* Password */}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-3 border rounded-lg"
          />

          {/* Role Selection */}
          <div className="flex gap-2">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setRole(r.value)}
                className={`flex-1 p-2 rounded-lg border ${
                  role === r.value
                    ? "bg-green-500 text-white"
                    : "bg-gray-100"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white p-3 rounded-lg"
          >
            {loading ? "Creating..." : "Create Account"}
          </button>

          {/* Login Link */}
          <p className="text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-green-600">
              Login
            </Link>
          </p>

        </form>
      </div>
    </div>
  );
}