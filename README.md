# FoodLink AI – Smart Food Donation Platform 🍽️🤝

A full-stack web platform that connects restaurants with NGOs to reduce food waste through smart, location-aware food donation management. Built with **React + Tailwind CSS** frontend, **FastAPI** backend, **MongoDB Atlas** database, and **scikit-learn** ML predictions.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4-F7931E?logo=scikitlearn)

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based login/register
- Role-based access: **Restaurant**, **NGO**, **Admin**
- Protected routes on frontend and backend

### 🍽️ Restaurant Dashboard
- Add food donations (name, quantity, expiry, location)
- Auto-detect location via browser GPS
- View all posted donations with status tracking
- Interactive map of donation locations

### 🤝 NGO Dashboard
- View nearby food donations sorted by distance
- Request pickup with one click
- Track pickup request status (pending → accepted → completed)
- Map visualization of available donations

### 🛡️ Admin Dashboard
- Platform statistics (total donations, pickups, users)
- Interactive charts (bar + pie) via Recharts
- Full user management table

### 🗺️ Map Integration
- Leaflet + OpenStreetMap (free, no API key needed)
- Custom markers for regular and high-demand donations
- Auto-fit bounds to show all markers

### 🤖 ML Demand Prediction
- scikit-learn RandomForest model
- Predicts high-demand areas based on donation/pickup history
- Donations in high-demand areas get a **"🔥 High Demand"** badge
- Graceful fallback with insufficient data

---

## 📁 Project Structure

```
foodlink-ai-smart-food-donation-platform/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment settings
│   │   ├── database.py          # MongoDB Atlas connection
│   │   ├── middleware/auth.py   # JWT auth + role guard
│   │   ├── models/              # Pydantic models
│   │   ├── routes/              # API routes (auth, food, requests, admin)
│   │   ├── ml/                  # Demand prediction ML
│   │   └── utils/               # Helper functions
│   ├── requirements.txt
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/axios.js         # Axios + JWT interceptor
│   │   ├── context/AuthContext.jsx
│   │   ├── components/          # Navbar, FoodCard, MapView, etc.
│   │   ├── pages/               # Login, Register, 3 Dashboards
│   │   ├── App.jsx              # Router + auth
│   │   └── index.css            # Tailwind + global styles
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **Python** ≥ 3.9
- **MongoDB Atlas** account (free M0 cluster)

### 1. Clone the repo
```bash
git clone https://github.com/yourusername/foodlink-ai-smart-food-donation-platform.git
cd foodlink-ai-smart-food-donation-platform
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux
pip install -r requirements.txt
```

Create `.env` with your MongoDB Atlas URI:
```env
MONGODB_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/foodlink?retryWrites=true&w=majority
JWT_SECRET=your-super-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRY_MINUTES=1440
```

Start the backend:
```bash
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env`:
```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/auth/register` | ✗ | — | Register user |
| POST | `/auth/login` | ✗ | — | Login, returns JWT |
| POST | `/food` | ✓ | restaurant | Add food donation |
| GET | `/food` | ✓ | any | List available food |
| GET | `/food/my` | ✓ | restaurant | My donations |
| GET | `/food/nearby` | ✓ | ngo | Nearby donations |
| POST | `/requests` | ✓ | ngo | Request pickup |
| GET | `/requests/my` | ✓ | any | My requests |
| PATCH | `/requests/{id}/status` | ✓ | restaurant/admin | Update status |
| GET | `/admin/stats` | ✓ | admin | Platform stats |
| GET | `/admin/users` | ✓ | admin | All users |

---

## 🌐 Deployment

### Backend → Render
1. Create **Web Service** on [Render](https://render.com)
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add env vars: `MONGODB_URL`, `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRY_MINUTES`

### Frontend → Netlify
1. Connect repo on [Netlify](https://netlify.com)
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `frontend/dist`
5. Add env var: `VITE_API_URL=https://your-backend.onrender.com`
6. Add `_redirects` file in `public/` with: `/* /index.html 200`

### MongoDB Atlas
1. Create free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create database user
3. Whitelist `0.0.0.0/0` for cloud access
4. Copy connection string to `MONGODB_URL`

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite, Tailwind CSS 3 |
| Backend | FastAPI, Python 3.9+ |
| Database | MongoDB Atlas (Motor async driver) |
| Auth | JWT (python-jose + passlib/bcrypt) |
| Maps | Leaflet + OpenStreetMap |
| Charts | Recharts |
| ML | scikit-learn (RandomForest) |
| Notifications | react-hot-toast |

---

## 📄 License

MIT License – Built for hackathon demonstration purposes.
