import supabase from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
 * Generic fetch wrapper with error handling.
 */
const request = async (endpoint, options = {}) => {
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

  return data;
};

// ─── NEO Endpoints ──────────────────────────────────────────

/**
 * Fetch NEO feed for a date range (max 7 days).
 * Returns { fetched_at, start_date, end_date, element_count, neo_objects }
 */
export const fetchNeoFeed = (startDate, endDate) => {
  return request(`/neos/feed?start_date=${startDate}&end_date=${endDate}`);
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
