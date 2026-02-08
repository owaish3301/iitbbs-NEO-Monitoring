# SkyNetics — Near-Earth Object Monitoring Platform

A full-stack dashboard that pulls live asteroid data from NASA and turns it into
something you can actually understand: risk scores, interactive 3D orbits, alerts
for close approaches, and a community chat to talk about it all.

---

## What it does

- **Live NASA feed** — Pulls Near-Earth Object data from NASA's NeoWs API, caches
  it in Redis so you're not hammering their servers
- **Risk scoring** — Calculates a risk score for each asteroid based on size,
  speed, miss distance, and hazardous classification
- **3D orbit viewer** — See asteroid orbits relative to Earth in an interactive
  Three.js scene (drag to rotate, scroll to zoom, click an asteroid for details)
- **Alerts** — Flags close-approach events and lets you mark them as read or
  dismiss them
- **Auth via Supabase** — Login/register handled by Supabase, tokens verified
  server-side
- **Community chat** — Real-time Socket.io threads per asteroid
- **One-command Docker deploy** — `docker compose up --build` and you're done

---

## Tech stack

| Layer     | What's used                                     |
| --------- | ----------------------------------------------- |
| Frontend  | React 19, Vite, Tailwind CSS, React Three Fiber, Recharts |
| Backend   | Node.js, Express 5, Socket.io                   |
| Database  | Supabase (PostgreSQL)                            |
| Cache     | Redis (managed — e.g. Upstash, Redis Cloud)      |
| Auth      | Supabase Auth                                    |
| API       | NASA NeoWs                                       |
| DevOps    | Docker, Docker Compose, Nginx reverse proxy      |

---

## Project structure

```
NEO-Monitoring/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # Dashboard, landing page, profile, UI primitives
│   │   ├── context/        # Auth context (Supabase)
│   │   ├── pages/          # Route-level pages
│   │   ├── services/       # API client (talks to backend, never NASA directly)
│   │   └── lib/            # Supabase client, utils
│   ├── Dockerfile          # Multi-stage: node build → nginx serve
│   └── nginx.conf          # Proxies /api and /socket.io to backend
├── server/                 # Express API
│   ├── src/
│   │   ├── controllers/    # Request handlers
│   │   ├── services/       # NASA API client + Redis caching
│   │   ├── middleware/     # Supabase auth, error handler
│   │   ├── routes/         # Route definitions
│   │   ├── utils/          # Risk scoring logic
│   │   ├── errors/         # Custom error classes
│   │   └── lib/            # Redis + Supabase helpers
│   └── Dockerfile          # Multi-stage: npm ci → non-root production image
├── docker-compose.yml      # Runs server + client together
├── .env.example            # All env vars in one place
└── package.json            # Root scripts (install:all, dev, docker:up)
```

---

## Getting started

### You'll need

- **Node.js 18+** (for local dev)
- **Docker** (for containerised setup)
- A **NASA API key** — free at [api.nasa.gov](https://api.nasa.gov) (`DEMO_KEY` works but is heavily rate-limited)
- A **Supabase project** — for auth and database
- A **managed Redis instance** — e.g. [Upstash](https://upstash.com) or [Redis Cloud](https://redis.com/cloud/) (free tiers available)

### 1. Clone it

```bash
git clone https://github.com/<your-username>/NEO-Monitoring.git
cd NEO-Monitoring
```

### 2. Set up environment variables

Copy the example and fill in your credentials:

```bash
cp .env.example .env
```

The `.env` file has everything — server keys, database URL, Redis, and the
Vite build-time variables for the frontend. One file, both services.

### 3a. Run with Docker (recommended)

```bash
docker compose up --build
```

That's it. The backend and frontend both start up, Nginx proxies API calls, and
everything connects to your managed Redis and Supabase.

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost      |
| Backend  | http://localhost:5000 |

### 3b. Run locally (development)

```bash
npm run install:all          # Install deps for both server and client
```

Make sure the server has its env vars (you can copy values from the root `.env`
into `server/.env`), then:

```bash
npm run dev                  # Starts both concurrently
```

Or separately:

```bash
npm run dev:server           # Express on port 5001
npm run dev:client           # Vite on port 5173
```

---

## API endpoints

All routes are under `/api`. The frontend never calls NASA directly — everything
goes through the backend, which caches responses in Redis.

| Method | Endpoint                      | What it does                        | Auth required |
| ------ | ----------------------------- | ----------------------------------- | ------------- |
| GET    | `/api/health`                 | Health check                        | No            |
| GET    | `/api/me`                     | Current user profile                | Yes           |
| GET    | `/api/neos/feed`              | NEO feed for a date range           | No            |
| GET    | `/api/neos/summary`           | Stats summary for a date range      | No            |
| GET    | `/api/neos/lookup/:id`        | Full details for one asteroid       | No            |
| GET    | `/api/neos/alerts`            | Generated alerts for a date range   | No            |
| PATCH  | `/api/neos/alerts/:id/read`   | Mark an alert as read               | Yes           |
| PATCH  | `/api/neos/alerts/read-all`   | Mark multiple alerts as read        | Yes           |
| DELETE | `/api/neos/alerts/:id`        | Delete an alert                     | Yes           |
| GET    | `/api/watchlist`              | Get user's watched asteroids        | Yes           |
| POST   | `/api/watchlist`              | Add asteroid to watchlist           | Yes           |
| PATCH  | `/api/watchlist/:neoId/alert` | Toggle alert for a watchlist item   | Yes           |
| DELETE | `/api/watchlist/:neoId`       | Remove from watchlist               | Yes           |

---

## Docker setup

Both services use **multi-stage builds** to keep images small:

- **server** — `node:22-alpine` installs deps → production image runs as
  non-root user. Uses Google DNS (`8.8.8.8`) for reliable outbound connections
  to NASA.
- **client** — `node:22-alpine` builds the Vite app → `nginx:alpine` serves
  the static files. Nginx proxies `/api/*` and `/socket.io/*` to the backend
  container.

Supabase (PostgreSQL + Auth) and Redis are external managed services — no
database containers to worry about.

---

## Security

- **Supabase Auth** for user management (tokens verified server-side)
- **Helmet** for HTTP security headers
- **CORS** configured for the frontend origin
- **Rate limiting** on API endpoints
- **Non-root user** in the production Docker container

---

## License

MIT
