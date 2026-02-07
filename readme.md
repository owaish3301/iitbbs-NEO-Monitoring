# 🌌 Cosmic Watch — Near-Earth Object Monitoring Platform

A full-stack web platform that fetches live asteroid data from NASA's NeoWs API to provide a comprehensive monitoring dashboard with real-time risk analysis, 3D orbital visualization, and community chat.

---

## 📁 Project Structure

```
NEO-Monitoring/
├── client/                # React (Vite) frontend
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── server/                # Express.js backend
│   ├── src/
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── docker-compose.yml     # Orchestrates all services
├── package.json           # Root monorepo scripts
└── README.md
```

---

## ✨ Features

- **User Authentication** — Secure JWT-based login/register for researchers and enthusiasts
- **Real-Time NASA Data Feed** — Integration with NASA NeoWs API for live asteroid tracking
- **Risk Analysis Engine** — Categorises asteroids by hazardous status, diameter, and miss distance into a clear risk score
- **Alert & Notification System** — Scheduled checks for close-approach events with dashboard notifications
- **3D Orbital Visualization** — Interactive Three.js view of asteroid orbits relative to Earth *(bonus)*
- **Real-Time Community Chat** — Socket.io-powered live discussion threads per asteroid *(bonus)*
- **Containerised Deployment** — Multi-stage Docker builds orchestrated via Docker Compose

---

## 🛠️ Tech Stack

| Layer      | Technology                                      |
| ---------- | ----------------------------------------------- |
| Frontend   | React 19, Vite, React Three Fiber, Recharts     |
| Backend    | Node.js, Express 5, Mongoose, Socket.io         |
| Database   | MongoDB 7                                       |
| Auth       | JWT, bcryptjs                                   |
| API Source | NASA NeoWs (Near Earth Object Web Service)      |
| DevOps     | Docker, Docker Compose, Nginx                   |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Docker** & **Docker Compose** (for containerised setup)
- A **NASA API Key** — get one free at [https://api.nasa.gov](https://api.nasa.gov) (or use `DEMO_KEY`)

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/NEO-Monitoring.git
cd NEO-Monitoring
```

### 2a. Run with Docker (Recommended)

Create a `.env` file in the project root:

```env
NASA_API_KEY=your_nasa_api_key
JWT_SECRET=your_secret_key
```

Then start all services:

```bash
docker-compose up --build
```

| Service  | URL                        |
| -------- | -------------------------- |
| Frontend | http://localhost           |
| Backend  | http://localhost:5000      |
| MongoDB  | mongodb://localhost:27017  |

### 2b. Run Locally (Development)

**Install all dependencies:**

```bash
npm run install:all
```

**Configure the server:**

```bash
cp server/.env.example server/.env
# Edit server/.env with your NASA_API_KEY and JWT_SECRET
```

**Start both server and client:**

```bash
npm run dev
```

Or run them individually:

```bash
npm run dev:server   # Express on port 5000
npm run dev:client   # Vite on port 5173
```

---

## 🐳 Docker Architecture

All services use **multi-stage builds** to minimise image size:

- **server** — `node:20-alpine` build → production stage with non-root user
- **client** — `node:20-alpine` build → `nginx:alpine` serving static assets
- **mongo** — Official `mongo:7` image with a persistent volume

Nginx reverse-proxies `/api/*` and `/socket.io/*` requests to the backend.

---

## 📡 API Endpoints

| Method | Endpoint              | Description                     | Auth |
| ------ | --------------------- | ------------------------------- | ---- |
| GET    | `/api/health`         | Server health check             | No   |
| POST   | `/api/auth/register`  | Register a new user             | No   |
| POST   | `/api/auth/login`     | Login and receive JWT           | No   |
| GET    | `/api/auth/me`        | Get current user profile        | Yes  |
| GET    | `/api/neo/feed`       | Fetch NEO feed (date range)     | No   |
| GET    | `/api/neo/lookup/:id` | Lookup a specific asteroid      | No   |
| GET    | `/api/neo/today`      | Today's close approaches        | No   |
| GET    | `/api/user/watchlist` | Get user's watched asteroids    | Yes  |
| POST   | `/api/user/watchlist` | Add asteroid to watchlist       | Yes  |
| DELETE | `/api/user/watchlist` | Remove asteroid from watchlist  | Yes  |
| GET    | `/api/alerts`         | Get user's pending alerts       | Yes  |

> A full **Postman Collection** is included in the repository for testing all endpoints.

---

## 🔒 Security

- Passwords hashed with **bcryptjs**
- **JWT** tokens for stateless authentication
- **Helmet** for HTTP security headers
- **CORS** configured for frontend origin
- **Rate limiting** on API endpoints
- Non-root user in production Docker containers

---

## 📊 Evaluation Criteria Coverage

| Criteria                       | Implementation                                                   |
| ------------------------------ | ---------------------------------------------------------------- |
| API & Data Architecture (25)   | RESTful endpoints, NASA API integration, risk scoring engine     |
| Full-Stack Implementation (25) | React ↔ Express ↔ MongoDB end-to-end flow                       |
| Docker & Deployment (20)       | Multi-stage builds, docker-compose, Nginx reverse proxy          |
| Postman Documentation (10)     | Complete collection with environment variables and test scripts  |
| UI/UX Space Theme (10)         | Dark-mode immersive design, responsive layout                    |
| 3D Graphics Bonus (5)          | Three.js orbital visualization via React Three Fiber             |
| Real-time Chat Bonus (5)       | Socket.io live community threads                                 |

---

## 📝 License

MIT
