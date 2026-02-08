# Cosmic Watch — Client

React frontend for the NEO Monitoring platform. Built with Vite, styled with
Tailwind CSS, and uses Three.js for 3D asteroid orbit visualization.

---

## Quick start

```bash
npm install
cp .env.example .env       # fill in your Supabase keys
npm run dev                 # starts on http://localhost:5173
```

In local dev, the Vite proxy forwards `/api` requests to the backend — no need
to set `VITE_API_URL`.

## Environment variables

| Variable                               | Purpose                              | Required |
| -------------------------------------- | ------------------------------------ | -------- |
| `VITE_SUPABASE_URL`                   | Your Supabase project URL            | Yes      |
| `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase anon/public key           | Yes      |
| `VITE_API_URL`                         | Backend URL (leave empty for local dev, Vite proxies `/api`) | No |

## Scripts

| Command         | What it does                        |
| --------------- | ----------------------------------- |
| `npm run dev`   | Start Vite dev server (port 5173)   |
| `npm run build` | Production build → `dist/`          |
| `npm run preview` | Preview the production build locally |
| `npm run lint`  | Run ESLint                          |

## Pages

| Page          | Route         | Description                                  |
| ------------- | ------------- | -------------------------------------------- |
| Landing       | `/`           | Marketing page with features and hero        |
| Auth          | `/auth`       | Login / register (Supabase Auth)             |
| Dashboard     | `/dashboard`  | NEO feed, risk analysis, 3D orbits, alerts, chat |
| Profile       | `/profile`    | User settings, sessions, danger zone         |
| 404           | `*`           | Catch-all not found page                     |

## Project structure

```
src/
├── components/
│   ├── dashboard/       # Dashboard widgets
│   │   ├── AlertsPanel        — Close-approach alert cards
│   │   ├── CommunityChat      — Socket.io live chat per asteroid
│   │   ├── DashboardHeader    — Date picker + controls
│   │   ├── NeoDetailPanel     — Detailed asteroid info sheet
│   │   ├── NeoFeedTable       — Paginated NEO data table
│   │   ├── OrbitViewer        — 3D Three.js orbit visualization
│   │   ├── RiskAnalysisPanel  — Risk breakdown charts (Recharts)
│   │   ├── Sidebar            — Navigation sidebar
│   │   ├── StatsCards         — Summary stat cards
│   │   └── Watchlist          — Saved asteroids list
│   ├── landingPage/     # Landing page sections
│   ├── profile/         # Profile page sections
│   └── ui/              # Reusable primitives (shadcn/ui)
├── context/
│   └── AuthContext      — Supabase auth state provider
├── lib/
│   ├── supabase         — Supabase client init
│   └── utils            — cn() and helpers
├── pages/               # Route-level page components
└── services/
    └── api              — Backend API client (fetch wrapper with cache + dedup)
```

## Key dependencies

- **React 19** + **React Router 7** — UI and routing
- **Tailwind CSS 4** — Styling (via Vite plugin)
- **React Three Fiber** + **Three.js** — 3D orbit visualization
- **Recharts** — Charts and graphs
- **Framer Motion** — Animations
- **Supabase JS** — Auth (client-side)
- **Socket.io Client** — Real-time chat
- **shadcn/ui** + **Radix** — Accessible UI primitives

## Docker

The Dockerfile is a multi-stage build:

1. `node:22-alpine` — installs deps and runs `vite build`
2. `nginx:alpine` — serves `dist/` with the included `nginx.conf`

Nginx proxies `/api/*` and `/socket.io/*` to the backend container. Vite
build-time env vars (`VITE_*`) are passed as Docker build args from the root
`.env` file via docker-compose.
