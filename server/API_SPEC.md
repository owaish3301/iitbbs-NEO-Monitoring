# Cosmic Watch API Spec (Draft)

Base URL: `/api`

## Auth
Auth is handled via Supabase on the frontend. Protected endpoints expect:
`Authorization: Bearer <supabase_access_token>`

## Endpoints

### Health
`GET /health`
Response:
```
{ "status": "ok", "service": "neo-monitoring-api", "timestamp": "...", "uptime": 123 }
```

### Current User
`GET /me` (protected)
Response:
```
{ "user": { "id": "...", "email": "...", ... } }
```

### NEO Feed
`GET /neos/feed?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
Constraints: date range must be 7 days or less.
Response:
```
{
  "range": { "start_date": "2026-02-01", "end_date": "2026-02-07" },
  "total": 123,
  "neos": [
    {
      "id": "3542519",
      "name": "(2010 PK9)",
      "absolute_magnitude_h": 21.5,
      "is_potentially_hazardous": false,
      "diameter_m": 180.2,
      "close_approach_date": "2026-02-04",
      "miss_distance_km": 1420000.5,
      "relative_velocity_km_s": 12.4,
      "orbiting_body": "Earth",
      "risk": {
        "score": 38,
        "label": "Low",
        "factors": { "hazardous": false, "diameter_m": 180.2, "miss_distance_km": 1420000.5 }
      }
    }
  ]
}
```

### NEO Summary
`GET /neos/summary?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
Response:
```
{
  "range": { "start_date": "2026-02-01", "end_date": "2026-02-07" },
  "total": 123,
  "hazardous": 7,
  "risk_breakdown": { "high": 2, "medium": 15, "low": 106 }
}
```

### NEO Lookup
`GET /neos/lookup/:id`
Response:
```
{
  "neo": { "...normalized fields..." },
  "raw": { "...full NASA NEO payload..." }
}
```

## Error Shape
All errors return:
```
{ "error": "Message", "code": "ERROR_CODE", "details": { ... } }
```

## Alerts

Alerts are **generated on-the-fly** from the NASA NEO feed (not stored). Per-user read/deleted state is persisted in the Supabase `user_alert_states` table.

### Get Alerts
`GET /neos/alerts?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
Auth: optional (if token provided, merges per-user read/deleted state).
Response:
```
{
  "range": { "start_date": "2026-02-01", "end_date": "2026-02-07" },
  "total": 5,
  "alerts": [
    {
      "id": "a1b2c3...",
      "type": "close_approach | hazardous",
      "title": "Close Approach Alert",
      "message": "Asteroid (2010 PK9) will pass within 2.30 LD of Earth",
      "date": "2026-02-04",
      "time": "14:30 UTC",
      "read": false,
      "priority": "high | medium",
      "neo_id": "3542519"
    }
  ]
}
```

### Mark Alert Read
`PATCH /neos/alerts/:id/read` (protected)
Response:
```
{ "id": "a1b2c3...", "read": true }
```

### Mark All Alerts Read
`PATCH /neos/alerts/read-all` (protected)
Body: `{ "alert_ids": ["id1", "id2", ...] }`
Response:
```
{ "updated": 3, "read": true }
```

### Delete Alert
`DELETE /neos/alerts/:id` (protected)
Soft-deletes the alert for the authenticated user.
Response:
```
{ "id": "a1b2c3...", "deleted": true }
```

## Planned (Dashboard)
These are recommended based on the problem statement; not implemented yet:
```
GET /watchlist
POST /watchlist
DELETE /watchlist/:id
```
