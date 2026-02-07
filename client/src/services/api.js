import supabase from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ─── In-flight request deduplication + short-lived cache ──
const inflightRequests = new Map();
const responseCache = new Map();
const CACHE_TTL_MS = 60_000; // 1 minute

/**
 * Helper — builds headers with optional Supabase auth token.
 */
const getHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  return headers;
};

/**
 * Generic fetch wrapper with error handling, dedup, and cache.
 */
const request = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const cacheKey = `${method}:${endpoint}`;

  // Only cache GET requests
  if (method === 'GET') {
    // Return cached response if still fresh
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
      return cached.data;
    }

    // Deduplicate identical in-flight requests
    if (inflightRequests.has(cacheKey)) {
      return inflightRequests.get(cacheKey);
    }
  }

  const promise = (async () => {
    const headers = await getHeaders();
    const url = `${API_BASE}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    const data = await res.json();

    if (!res.ok) {
      const message = data?.error || `Request failed with status ${res.status}`;
      throw new Error(message);
    }

    // Store in cache for GET requests
    if (method === 'GET') {
      responseCache.set(cacheKey, { data, ts: Date.now() });
    }

    return data;
  })();

  if (method === 'GET') {
    inflightRequests.set(cacheKey, promise);
    promise.finally(() => inflightRequests.delete(cacheKey));
  }

  return promise;
};

/** Manually invalidate cached entries matching a prefix. */
export const invalidateCache = (prefix) => {
  for (const key of responseCache.keys()) {
    if (key.includes(prefix)) responseCache.delete(key);
  }
};

// ─── NEO Endpoints ──────────────────────────────────────────

/**
 * Fetch NEO feed for a date range (max 7 days) with pagination.
 * Returns { fetched_at, start_date, end_date, element_count, page, limit, total_pages, has_next, has_prev, neo_objects, stats }
 */
export const fetchNeoFeed = (startDate, endDate, { page = 1, limit = 20 } = {}) => {
  return request(`/neos/feed?start_date=${startDate}&end_date=${endDate}&page=${page}&limit=${limit}`);
};

/**
 * Fetch NEO summary stats for a date range.
 * Returns { range, total, hazardous, risk_breakdown }
 */
export const fetchNeoSummary = (startDate, endDate) => {
  return request(`/neos/summary?start_date=${startDate}&end_date=${endDate}`);
};

/**
 * Fetch full details for a single NEO by ID.
 * Returns { neo, raw }
 */
export const fetchNeoLookup = (id) => {
  return request(`/neos/lookup/${id}`);
};

/**
 * Fetch generated alerts for a date range.
 * Returns { range, total, alerts }
 */
export const fetchAlerts = (startDate, endDate) => {
  return request(`/neos/alerts?start_date=${startDate}&end_date=${endDate}`);
};

/**
 * Mark one alert as read for current user.
 * Returns { id, read }
 */
export const markAlertAsRead = async (alertId) => {
  const data = await request(`/neos/alerts/${alertId}/read`, {
    method: 'PATCH',
  });
  invalidateCache('/neos/alerts');
  return data;
};

/**
 * Mark many alerts as read for current user.
 * Returns { updated, read }
 */
export const markAllAlertsAsRead = async (alertIds) => {
  const data = await request('/neos/alerts/read-all', {
    method: 'PATCH',
    body: JSON.stringify({ alert_ids: alertIds }),
  });
  invalidateCache('/neos/alerts');
  return data;
};

/**
 * Delete one alert for current user.
 * Returns { id, deleted }
 */
export const deleteAlertById = async (alertId) => {
  const data = await request(`/neos/alerts/${alertId}`, {
    method: 'DELETE',
  });
  invalidateCache('/neos/alerts');
  return data;
};

// ─── Auth / User ────────────────────────────────────────────

/**
 * Get the current authenticated user profile from the backend.
 * Returns { user }
 */
export const fetchCurrentUser = () => {
  return request('/me');
};

/**
 * Health check.
 */
export const fetchHealth = () => {
  return request('/health');
};
