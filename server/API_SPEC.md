# Cosmic Watch — API Specification

Base URL: `/api`

All responses are JSON. Dates use `YYYY-MM-DD` format. Timestamps are ISO 8601.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Error Handling](#error-handling)
3. [Endpoints](#endpoints)
   - [Health Check](#get-apihealth)
   - [Current User](#get-apime)
   - [NEO Feed](#get-apineosfeed)
   - [NEO Summary](#get-apineossummary)
   - [NEO Lookup](#get-apineoslookupid)
   - [Alerts — List](#get-apineosalerts)
   - [Alerts — Mark Read](#patch-apineosalertsidread)
   - [Alerts — Mark All Read](#patch-apineosalertsread-all)
   - [Alerts — Delete](#delete-apineosalertsid)
   - [Watchlist — List](#get-apiwatchlist)
   - [Watchlist — Add](#post-apiwatchlist)
   - [Watchlist — Toggle Alert](#patch-apiwatchlistneoidalert)
   - [Watchlist — Remove](#delete-apiwatchlistneoid)
4. [Data Models](#data-models)
5. [Risk Scoring Algorithm](#risk-scoring-algorithm)
6. [Caching](#caching)
7. [Supabase Tables](#supabase-tables)

---

## Authentication

Protected endpoints require a **Supabase access token** in the `Authorization` header:

```
Authorization: Bearer <supabase_access_token>
```

The server validates the token by calling `supabase.auth.getUser(token)`. If the
token is missing, invalid, or expired, the server returns a `401` error.

Some endpoints (like `/api/neos/alerts`) **optionally** accept a token. If
provided, the response is personalized (e.g., alert read/deleted states are
applied). If omitted, the endpoint still works but returns default data.

---

## Error Handling

All errors follow this shape:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

The `details` field is optional and only present when there's extra context.

### Error Codes

| HTTP Status | Code                       | When                                           |
| ----------- | -------------------------- | ---------------------------------------------- |
| 400         | `VALIDATION_ERROR`         | Missing/invalid query params or body fields    |
| 401         | `INVALID_TOKEN`            | Missing, invalid, or expired auth token        |
| 401         | `UNAUTHORIZED`             | Supabase not configured on server              |
| 403         | `FORBIDDEN`                | Insufficient permissions                       |
| 404         | `NOT_FOUND`                | Route or resource doesn't exist                |
| 409         | `DB_UNIQUE_VIOLATION`      | Duplicate value for a unique field             |
| 502         | `EXTERNAL_API_ERROR`       | NASA API call failed (timeout, rate limit, etc)|
| 500         | `DB_ERROR`                 | Unhandled database error                       |
| 500         | `DB_TABLE_MISSING`         | Required Supabase table doesn't exist          |
| 500         | `DB_INSUFFICIENT_PRIVILEGE`| Table missing proper GRANTs                    |
| 500         | `INTERNAL_SERVER_ERROR`    | Unhandled server error                         |

---

## Endpoints

---

### `GET /api/health`

Health check. No authentication required.

**Response `200`**

```json
{
  "status": "ok",
  "service": "neo-monitoring-api",
  "timestamp": "2026-02-08T12:00:00.000Z",
  "uptime": 3600.123
}
```

| Field       | Type   | Description                              |
| ----------- | ------ | ---------------------------------------- |
| `status`    | string | Always `"ok"`                            |
| `service`   | string | Service identifier                       |
| `timestamp` | string | Current server time (ISO 8601)           |
| `uptime`    | number | Seconds since server started             |

---

### `GET /api/me`

Returns the authenticated user's Supabase profile.

**Auth:** Required

**Response `200`**

```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "app_metadata": {},
    "user_metadata": {},
    "created_at": "2026-01-01T00:00:00.000Z"
  }
}
```

The `user` object is the full Supabase user object returned by `getUser()`.

**Errors:** `401 INVALID_TOKEN`

---

### `GET /api/neos/feed`

Fetches the NEO feed from NASA for a date range, normalized and paginated.

**Auth:** None

**Query Parameters**

| Param        | Type   | Required | Default | Constraints                |
| ------------ | ------ | -------- | ------- | -------------------------- |
| `start_date` | string | Yes      | —       | `YYYY-MM-DD`              |
| `end_date`   | string | Yes      | —       | `YYYY-MM-DD`              |
| `page`       | number | No       | `1`     | ≥ 1                       |
| `limit`      | number | No       | `20`    | 1–100                     |

**Validation Rules**
- Both dates must be valid `YYYY-MM-DD`
- `end_date` must be on or after `start_date`
- Date range must be **7 days or less**

**Response `200`**

```json
{
  "fetched_at": "2026-02-08T12:00:00.000Z",
  "start_date": "2026-02-08",
  "end_date": "2026-02-15",
  "element_count": 42,
  "page": 1,
  "limit": 20,
  "total_pages": 3,
  "has_next": true,
  "has_prev": false,
  "neo_objects": [],
  "stats": {
    "total": 42,
    "hazardous": 5,
    "closest_lunar": 1.23,
    "closest_neo_name": "(2024 AB)",
    "avg_velocity_km_s": 12.45
  }
}
```

| Field                    | Type    | Description                                         |
| ------------------------ | ------- | --------------------------------------------------- |
| `fetched_at`             | string  | When the response was generated                     |
| `start_date`             | string  | Requested start date                                |
| `end_date`               | string  | Requested end date                                  |
| `element_count`          | number  | Total NEOs in the date range (before pagination)    |
| `page`                   | number  | Current page                                        |
| `limit`                  | number  | Items per page                                      |
| `total_pages`            | number  | Total number of pages                               |
| `has_next`               | boolean | Whether there's a next page                         |
| `has_prev`               | boolean | Whether there's a previous page                     |
| `neo_objects`            | array   | Paginated array of [DashboardNeo](#dashboardneo) objects |
| `stats.total`            | number  | Total NEO count                                     |
| `stats.hazardous`        | number  | Count of potentially hazardous asteroids            |
| `stats.closest_lunar`    | number  | Closest approach in lunar distances (`null` if none)|
| `stats.closest_neo_name` | string  | Name of the closest NEO (`null` if none)            |
| `stats.avg_velocity_km_s`| number  | Average relative velocity across all NEOs           |

**Errors:** `400 VALIDATION_ERROR`, `502 EXTERNAL_API_ERROR`

**Example**

```
GET /api/neos/feed?start_date=2026-02-08&end_date=2026-02-15&page=1&limit=20
```

---

### `GET /api/neos/summary`

Returns aggregate stats for a date range without the full NEO list. Lighter
than `/feed` when you only need numbers.

**Auth:** None

**Query Parameters**

| Param        | Type   | Required | Constraints               |
| ------------ | ------ | -------- | ------------------------- |
| `start_date` | string | Yes      | `YYYY-MM-DD`             |
| `end_date`   | string | Yes      | `YYYY-MM-DD`, max 7 days |

**Response `200`**

```json
{
  "range": {
    "start_date": "2026-02-08",
    "end_date": "2026-02-15"
  },
  "total": 42,
  "hazardous": 5,
  "risk_breakdown": {
    "high": 3,
    "medium": 12,
    "low": 27
  }
}
```

| Field                    | Type   | Description                                   |
| ------------------------ | ------ | --------------------------------------------- |
| `range`                  | object | The requested date range                      |
| `total`                  | number | Total NEOs in the range                       |
| `hazardous`              | number | Count marked as potentially hazardous by NASA |
| `risk_breakdown.high`    | number | NEOs with risk score ≥ 75                     |
| `risk_breakdown.medium`  | number | NEOs with risk score 45–74                    |
| `risk_breakdown.low`     | number | NEOs with risk score < 45                     |

**Errors:** `400 VALIDATION_ERROR`, `502 EXTERNAL_API_ERROR`

---

### `GET /api/neos/lookup/:id`

Fetches full details for a single asteroid by its NASA SPK-ID. Returns both a
normalized summary and the raw NASA response (which includes orbital data needed
for the 3D orbit viewer).

**Auth:** None

**Path Parameters**

| Param | Type   | Description            |
| ----- | ------ | ---------------------- |
| `id`  | string | NASA SPK-ID of the NEO |

**Response `200`**

```json
{
  "neo": {
    "id": "3449121",
    "name": "(2009 BE)",
    "absolute_magnitude_h": 24.5,
    "is_potentially_hazardous": false,
    "diameter_m": 45.3,
    "close_approach_date": "2026-02-10",
    "miss_distance_km": 5234567.89,
    "relative_velocity_km_s": 12.34,
    "orbiting_body": "Earth",
    "risk": {
      "score": 35,
      "label": "Low",
      "factors": {
        "hazardous": false,
        "diameter_m": 45.3,
        "miss_distance_km": 5234567.89
      }
    }
  },
  "raw": {}
}
```

The `neo` field is a flat [NormalizedNeo](#normalizedneo) object. The `raw`
field is the unmodified NASA response, which includes `orbital_data` with
semi-major axis, eccentricity, inclination, etc. — used by the frontend's 3D
orbit viewer.

**Errors:** `400 VALIDATION_ERROR`, `404 NOT_FOUND`, `502 EXTERNAL_API_ERROR`

**Example**

```
GET /api/neos/lookup/3449121
```

---

### `GET /api/neos/alerts`

Generates alerts from real NEO data for a date range. Alerts are created
server-side on every request based on two triggers:

1. **Close approach** — asteroid passes within 5 lunar distances of Earth
2. **Hazardous object** — asteroid is flagged as potentially hazardous by NASA

If an auth token is provided, per-user read/deleted states are applied from the
`user_alert_states` table in Supabase. Deleted alerts are filtered out and read
states are merged in.

**Auth:** Optional (personalizes read/deleted states)

**Query Parameters**

| Param        | Type   | Required | Constraints               |
| ------------ | ------ | -------- | ------------------------- |
| `start_date` | string | Yes      | `YYYY-MM-DD`             |
| `end_date`   | string | Yes      | `YYYY-MM-DD`, max 7 days |

**Response `200`**

```json
{
  "range": {
    "start_date": "2026-02-08",
    "end_date": "2026-02-15"
  },
  "total": 8,
  "alerts": [
    {
      "id": "a1b2c3d4e5f6g7h8i9j0",
      "type": "close_approach",
      "title": "Close Approach Alert",
      "message": "Asteroid (2024 AB) will pass within 1.23 LD of Earth",
      "date": "2026-02-10",
      "time": "14:30 UTC",
      "read": false,
      "priority": "high",
      "neo_id": "3449121"
    }
  ]
}
```

| Field              | Type    | Description                                                |
| ------------------ | ------- | ---------------------------------------------------------- |
| `range`            | object  | Requested date range                                       |
| `total`            | number  | Total alerts returned (after filtering deleted)            |
| `alerts[].id`      | string  | Deterministic alert ID (SHA-1 hash of type + NEO ID + date)|
| `alerts[].type`    | string  | `"close_approach"` or `"hazardous"`                        |
| `alerts[].title`   | string  | Human-readable alert title                                 |
| `alerts[].message` | string  | Descriptive message with asteroid name and distance        |
| `alerts[].date`    | string  | Close approach date (`YYYY-MM-DD`)                         |
| `alerts[].time`    | string  | Close approach time (e.g., `"14:30 UTC"` or `"Unknown"`)  |
| `alerts[].read`    | boolean | Whether the user has read this alert                       |
| `alerts[].priority`| string  | `"high"` (< 2 LD or hazardous) or `"medium"` (2–5 LD)     |
| `alerts[].neo_id`  | string  | NASA SPK-ID of the related asteroid                        |

Alerts are sorted by priority (high first), then by date.

**Errors:** `400 VALIDATION_ERROR`, `502 EXTERNAL_API_ERROR`

---

### `PATCH /api/neos/alerts/:id/read`

Marks a single alert as read for the authenticated user.

**Auth:** Required

**Path Parameters**

| Param | Type   | Description                |
| ----- | ------ | -------------------------- |
| `id`  | string | Alert ID (SHA-1 hash)      |

**Response `200`**

```json
{
  "id": "a1b2c3d4e5f6g7h8i9j0",
  "read": true
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_TOKEN`

---

### `PATCH /api/neos/alerts/read-all`

Marks multiple alerts as read in one request.

**Auth:** Required

**Request Body**

```json
{
  "alert_ids": ["a1b2c3d4e5f6g7h8i9j0", "b2c3d4e5f6g7h8i9j0k1"]
}
```

| Field       | Type     | Required | Description                    |
| ----------- | -------- | -------- | ------------------------------ |
| `alert_ids` | string[] | Yes      | Non-empty array of alert IDs  |

**Response `200`**

```json
{
  "updated": 2,
  "read": true
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_TOKEN`

---

### `DELETE /api/neos/alerts/:id`

Soft-deletes an alert for the authenticated user. The alert won't appear in
future `/alerts` responses for this user. Other users are unaffected.

**Auth:** Required

**Path Parameters**

| Param | Type   | Description                |
| ----- | ------ | -------------------------- |
| `id`  | string | Alert ID (SHA-1 hash)      |

**Response `200`**

```json
{
  "id": "a1b2c3d4e5f6g7h8i9j0",
  "deleted": true
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_TOKEN`

---

### `GET /api/watchlist`

Returns all asteroids the authenticated user is watching.

**Auth:** Required

**Response `200`**

```json
{
  "total": 3,
  "items": [
    {
      "id": "uuid-of-row",
      "neo_id": "3449121",
      "neo_name": "(2009 BE)",
      "added_at": "2026-02-07T10:30:00.000Z",
      "alert_enabled": true
    }
  ]
}
```

| Field                   | Type    | Description                              |
| ----------------------- | ------- | ---------------------------------------- |
| `total`                 | number  | Number of items in the watchlist         |
| `items[].id`            | string  | Database row UUID                        |
| `items[].neo_id`        | string  | NASA SPK-ID of the asteroid             |
| `items[].neo_name`      | string  | Asteroid name                           |
| `items[].added_at`      | string  | When the user added it (ISO 8601)       |
| `items[].alert_enabled` | boolean | Whether alerts are on for this asteroid |

Items are ordered newest first (`added_at` descending).

**Errors:** `401 INVALID_TOKEN`

---

### `POST /api/watchlist`

Adds an asteroid to the user's watchlist. If the asteroid is already in the
watchlist, the existing entry is updated (upsert on `user_id` + `neo_id`).

**Auth:** Required

**Request Body**

```json
{
  "neo_id": "3449121",
  "neo_name": "(2009 BE)"
}
```

| Field      | Type   | Required | Description            |
| ---------- | ------ | -------- | ---------------------- |
| `neo_id`   | string | Yes      | NASA SPK-ID            |
| `neo_name` | string | Yes      | Asteroid display name  |

**Response `201`**

```json
{
  "success": true,
  "item": {
    "id": "uuid-of-row",
    "neo_id": "3449121",
    "neo_name": "(2009 BE)",
    "added_at": "2026-02-08T12:00:00.000Z",
    "alert_enabled": false
  }
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_TOKEN`

---

### `PATCH /api/watchlist/:neoId/alert`

Toggles the `alert_enabled` flag for an asteroid in the user's watchlist. If
currently `true`, sets to `false`, and vice versa.

**Auth:** Required

**Path Parameters**

| Param   | Type   | Description            |
| ------- | ------ | ---------------------- |
| `neoId` | string | NASA SPK-ID            |

**Response `200`**

```json
{
  "success": true,
  "neo_id": "3449121",
  "alert_enabled": true
}
```

**Errors:** `400 VALIDATION_ERROR` (NEO not in watchlist), `401 INVALID_TOKEN`

---

### `DELETE /api/watchlist/:neoId`

Removes an asteroid from the user's watchlist.

**Auth:** Required

**Path Parameters**

| Param   | Type   | Description            |
| ------- | ------ | ---------------------- |
| `neoId` | string | NASA SPK-ID            |

**Response `200`**

```json
{
  "success": true,
  "neo_id": "3449121",
  "removed": true
}
```

**Errors:** `400 VALIDATION_ERROR`, `401 INVALID_TOKEN`

---

## Data Models

### DashboardNeo

The shape returned by `/api/neos/feed` in the `neo_objects` array. Preserves
nested structure for the dashboard UI.

```json
{
  "id": "3449121",
  "name": "(2009 BE)",
  "nasa_jpl_url": "https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=3449121",
  "absolute_magnitude_h": 24.5,
  "is_potentially_hazardous": false,
  "is_sentry_object": false,
  "estimated_diameter": {
    "min_km": 0.03,
    "max_km": 0.07,
    "min_m": 30.0,
    "max_m": 70.0
  },
  "close_approach_data": [
    {
      "close_approach_date": "2026-02-10",
      "close_approach_date_full": "2026-Feb-10 14:30",
      "epoch_date_close_approach": 1770768600000,
      "relative_velocity": {
        "km_per_sec": 12.34,
        "km_per_hour": 44424.0
      },
      "miss_distance": {
        "astronomical": 0.035,
        "lunar": 13.6,
        "kilometers": 5234567.89
      },
      "orbiting_body": "Earth"
    }
  ],
  "risk": {
    "score": 35,
    "label": "Low",
    "factors": {
      "hazardous": false,
      "diameter_m": 45.3,
      "miss_distance_km": 5234567.89
    }
  }
}
```

### NormalizedNeo

The flat shape returned by `/api/neos/lookup` in the `neo` field. Simpler to
work with for detail views.

```json
{
  "id": "3449121",
  "name": "(2009 BE)",
  "absolute_magnitude_h": 24.5,
  "is_potentially_hazardous": false,
  "diameter_m": 45.3,
  "close_approach_date": "2026-02-10",
  "miss_distance_km": 5234567.89,
  "relative_velocity_km_s": 12.34,
  "orbiting_body": "Earth",
  "risk": {
    "score": 35,
    "label": "Low",
    "factors": {
      "hazardous": false,
      "diameter_m": 45.3,
      "miss_distance_km": 5234567.89
    }
  }
}
```

### Risk

Computed server-side for every NEO.

```json
{
  "score": 35,
  "label": "Low",
  "factors": {
    "hazardous": false,
    "diameter_m": 45.3,
    "miss_distance_km": 5234567.89
  }
}
```

| Field                    | Type    | Description                                        |
| ------------------------ | ------- | -------------------------------------------------- |
| `score`                  | number  | 0–100 risk score                                   |
| `label`                  | string  | `"High"` (≥ 75), `"Medium"` (45–74), `"Low"` (< 45) |
| `factors.hazardous`      | boolean | NASA's potentially hazardous flag                  |
| `factors.diameter_m`     | number  | Average estimated diameter in meters (or `null`)   |
| `factors.miss_distance_km` | number | Minimum miss distance in km (or `null`)          |

---

## Risk Scoring Algorithm

The risk score is a 0–100 value computed from three factors:

### 1. Base Score

| Condition                                    | Points |
| -------------------------------------------- | ------ |
| `is_potentially_hazardous_asteroid = true`   | 60     |
| `is_potentially_hazardous_asteroid = false`  | 20     |

### 2. Diameter Factor (0–20 points)

```
diameter_factor = min(diameter_meters / 1000 × 20, 20)
```

A 1 km asteroid gets the full 20 points. Smaller ones get proportionally less.
If diameter is unknown, this factor is 0.

### 3. Miss Distance Factor (0–20 points)

| Miss Distance              | Points |
| -------------------------- | ------ |
| < 750,000 km               | 20     |
| 750,000 km – 2,000,000 km | 10     |
| > 2,000,000 km             | 0      |

If miss distance is unknown, this factor is 0.

### Final Calculation

```
raw   = base + diameter_factor + miss_distance_factor
score = clamp(round(raw), 0, 100)
```

### Label Thresholds

| Score Range | Label    |
| ----------- | -------- |
| 75–100      | High     |
| 45–74       | Medium   |
| 0–44        | Low      |

---

## Caching

All NASA API calls are cached in Redis to avoid rate limits and speed up
responses.

| Cache Key Pattern            | TTL    | Description                     |
| ---------------------------- | ------ | ------------------------------- |
| `neo:feed:<start>:<end>`     | 1 hour | Full feed response for a range  |
| `neo:lookup:<id>`            | 1 hour | Single NEO lookup response      |

On cache miss, the server calls NASA with **retry logic** (up to 3 retries with
exponential backoff: 1s → 2s → 4s). Retries are triggered on:
- `ETIMEDOUT`, `ECONNABORTED`, `ECONNRESET`, `ENOTFOUND`, `EAI_AGAIN`
- HTTP 429 (rate limited)
- HTTP 5xx (server error)

On cache hit, NASA is never called.

---

## Supabase Tables

The server expects two tables in your Supabase project:

### `user_alert_states`

Per-user alert read/deleted flags. Alerts themselves are generated on the fly
from NASA data — only the user's interaction state is stored.

| Column       | Type      | Description                             |
| ------------ | --------- | --------------------------------------- |
| `user_id`    | uuid      | Supabase auth user ID                   |
| `alert_id`   | text      | Deterministic SHA-1 hash of the alert   |
| `is_read`    | boolean   | Whether the user has read this alert    |
| `is_deleted` | boolean   | Whether the user soft-deleted this alert|
| `updated_at` | timestamp | Last modification time                  |

**Unique constraint:** `(user_id, alert_id)`

### `user_watchlist`

The user's saved asteroids.

| Column          | Type      | Description                             |
| --------------- | --------- | --------------------------------------- |
| `id`            | uuid      | Row ID (auto-generated)                 |
| `user_id`       | uuid      | Supabase auth user ID                   |
| `neo_id`        | text      | NASA SPK-ID                             |
| `neo_name`      | text      | Asteroid display name                   |
| `added_at`      | timestamp | When the user added it                  |
| `alert_enabled` | boolean   | Whether alerts are enabled for this NEO |

**Unique constraint:** `(user_id, neo_id)`
