import axios from "axios";

// ✅ Use local backend (change later for deployment)
const API = axios.create({
  baseURL: "http://127.0.0.1:8001",
});

// ✅ Attach JWT token automatically
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Handle errors globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // 🔴 Unauthorized → logout
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // redirect safely
      window.location.href = "/login";
    }

    // 🔴 Backend down / network issue
    if (!error.response) {
      alert("Backend not running or network error ❌");
    }

    return Promise.reject(error);
  }
);

export default API;