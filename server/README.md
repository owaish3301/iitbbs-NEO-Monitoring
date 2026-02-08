# Cosmic Watch — Server

Express.js REST API for the NEO Monitoring platform. Fetches asteroid data from
NASA's NeoWs API, scores risk, caches in Redis, and serves it to the frontend.

---

## Quick start

```bash
npm install
cp .env.example .env       # fill in your keys
npm run dev                 # starts on http://localhost:5001
```

## Environment variables

| Variable                   | Purpose                                    | Required |
| -------------------------- | ------------------------------------------ | -------- |
| `PORT`                     | Server port (default `5001`)               | No       |
| `NASA_API_KEY`             | NASA API key ([get one free](https://api.nasa.gov)) | Yes |
| `SUPABASE_URL`             | Supabase project URL                       | Yes      |
| `SUPABASE_ANON_KEY`        | Supabase anon key                          | Yes      |
| `SUPABASE_SERVICE_ROLE_KEY`| Supabase service role key (server-side)    | Yes      |
| `REDIS_URL`                | Redis connection string                    | Yes      |

## Scripts

| Command         | What it does                              |
| --------------- | ----------------------------------------- |
| `npm run dev`   | Start with nodemon (auto-restart on save) |
| `npm start`     | Start in production mode                  |

## API routes

All routes are prefixed with `/api`.

### Public

| Method | Endpoint                       | Description                          |
| ------ | ------------------------------ | ------------------------------------ |
| GET    | `/api/health`                  | Health check (status, uptime)        |
| GET    | `/api/neos/feed`               | NEO feed for a date range (paginated) |
| GET    | `/api/neos/summary`            | Stats summary for a date range       |
| GET    | `/api/neos/lookup/:id`         | Full details for one asteroid        |
| GET    | `/api/neos/alerts`             | Generated close-approach alerts      |

### Authenticated (Supabase token required)

| Method | Endpoint                       | Description                          |
| ------ | ------------------------------ | ------------------------------------ |
| GET    | `/api/me`                      | Current user profile                 |
| PATCH  | `/api/neos/alerts/:id/read`    | Mark an alert as read                |
| PATCH  | `/api/neos/alerts/read-all`    | Mark multiple alerts as read         |
| DELETE | `/api/neos/alerts/:id`         | Delete an alert                      |
| GET    | `/api/watchlist`               | Get user's watched asteroids         |
| POST   | `/api/watchlist`               | Add asteroid to watchlist            |
| PATCH  | `/api/watchlist/:neoId/alert`  | Toggle alert for a watchlist item    |
| DELETE | `/api/watchlist/:neoId`        | Remove asteroid from watchlist       |

## Project structure

```
src/
├── index.js               — App entry, middleware setup, route mounting
├── controllers/
│   ├── neoController      — NEO feed, lookup, summary, alerts
│   └── watchlistController — Watchlist CRUD
├── services/
│   └── nasa               — NASA API client with retry + Redis caching
├── middleware/
│   ├── verifySupabase     — Validates Supabase JWT from Authorization header
│   └── errorHandler       — Global error handler (Axios, Supabase, app errors)
├── routes/
│   ├── neoRoutes          — /api/neos/* route definitions
│   └── watchlistRoutes    — /api/watchlist/* route definitions
├── utils/
│   └── risk               — Risk score calculation (size, speed, miss distance)
├── errors/
│   └── appError           — Custom error classes (ValidationError, NotFoundError, etc.)
└── lib/
    ├── redis              — Redis singleton with getCached / setCache helpers
    └── supabase           — Supabase admin client singleton
```

## How caching works

1. Every NASA request checks Redis first (`getCached`)
2. On cache miss, calls NASA with retry + exponential backoff (handles timeouts,
   rate limits, server errors)
3. Response is stored in Redis (`setCache`) with a 1-hour TTL
4. Subsequent requests for the same data hit Redis, not NASA

This means the first load of the 3D orbit viewer triggers ~100 lookup calls to
NASA (one per asteroid), but after that they're all served from cache instantly.

## Key dependencies

- **Express 5** — HTTP framework
- **ioredis** — Redis client
- **axios** — HTTP client for NASA API
- **@supabase/supabase-js** — Server-side Supabase client
- **helmet** — Security headers
- **cors** — Cross-origin config
- **morgan** — Request logging
- **express-rate-limit** — Rate limiting
- **socket.io** — Real-time WebSocket server

## Docker

The Dockerfile is a multi-stage build:

1. `node:22-alpine` — installs production dependencies
2. `node:22-alpine` — copies `node_modules` + `src/`, runs as non-root user

The container uses Google DNS (`8.8.8.8`) configured in docker-compose for
reliable outbound connections to NASA's API.
