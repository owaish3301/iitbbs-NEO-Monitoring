import { fetchFeed, fetchLookup } from '../services/nasa.js';
import crypto from 'node:crypto';
import {
  ValidationError,
  NotFoundError,
  InvalidTokenError,
  UnauthorizedError,
} from '../errors/appError.js';
import { computeRiskScore, getMinMissDistanceKm, getDiameterMeters } from '../utils/risk.js';
import { getSupabaseClient } from '../lib/supabase.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALERT_STATE_TABLE = 'user_alert_states';

const validateDate = (value, name) => {
  if (!value || !DATE_RE.test(value)) {
    throw new ValidationError(`${name} must be in YYYY-MM-DD format`);
  }
};

const diffDays = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diff = (e - s) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
};

const getRequiredSupabase = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new UnauthorizedError('Supabase is not configured on the server');
  }
  return supabase;
};

const normalizeAlertId = (value) => String(value || '').trim();

const normalizeAlertIds = (ids) => {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map(normalizeAlertId).filter(Boolean))];
};

const getAlertStatesByIds = async (userId, alertIds, { throwOnError = true } = {}) => {
  const normalizedIds = normalizeAlertIds(alertIds);
  if (normalizedIds.length === 0) return new Map();

  const supabase = getRequiredSupabase();
  const { data, error } = await supabase
    .from(ALERT_STATE_TABLE)
    .select('alert_id, is_read, is_deleted')
    .eq('user_id', userId)
    .in('alert_id', normalizedIds);

  if (error) {
    console.error('[getAlertStatesByIds] Supabase error:', error.code, error.message, error.hint || '');
    if (throwOnError) throw error;
    return new Map(); // graceful degradation
  }

  return new Map((data || []).map((row) => [row.alert_id, row]));
};

const upsertAlertStates = async (userId, rows) => {
  const payload = (rows || [])
    .map((row) => {
      const alertId = normalizeAlertId(row.alert_id);
      if (!alertId) return null;

      return {
        user_id: userId,
        alert_id: alertId,
        ...(typeof row.is_read === 'boolean' ? { is_read: row.is_read } : {}),
        ...(typeof row.is_deleted === 'boolean' ? { is_deleted: row.is_deleted } : {}),
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  if (payload.length === 0) return;

  const supabase = getRequiredSupabase();
  const { error } = await supabase
    .from(ALERT_STATE_TABLE)
    .upsert(payload, { onConflict: 'user_id,alert_id' });

  if (error) {
    console.error('[upsertAlertStates] Supabase error:', error.code, error.message, error.hint || '');
    throw error;
  }
};

const getOptionalSupabaseUser = async (req) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) return null;

  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new InvalidTokenError();
  }

  return data.user;
};

const buildAlertId = (type, neoId, approachDate) => {
  const raw = `${type}:${neoId}:${approachDate || 'unknown'}`;
  return crypto.createHash('sha1').update(raw).digest('hex').slice(0, 20);
};

// Flat normalized shape (used by /summary and /lookup)
const normalizeNeo = (neo) => {
  const missKm = getMinMissDistanceKm(neo);
  const diameterM = getDiameterMeters(neo);
  const risk = computeRiskScore(neo);
  const approach = Array.isArray(neo?.close_approach_data) ? neo.close_approach_data[0] : null;

  return {
    id: neo.id,
    name: neo.name,
    absolute_magnitude_h: neo.absolute_magnitude_h,
    is_potentially_hazardous: !!neo.is_potentially_hazardous_asteroid,
    diameter_m: diameterM,
    close_approach_date: approach?.close_approach_date || null,
    miss_distance_km: missKm,
    relative_velocity_km_s: approach?.relative_velocity?.kilometers_per_second
      ? Number(approach.relative_velocity.kilometers_per_second)
      : null,
    orbiting_body: approach?.orbiting_body || null,
    risk,
  };
};

// Dashboard-friendly shape — preserves nested structure the frontend expects
const normalizeNeoForDashboard = (neo) => {
  const risk = computeRiskScore(neo);

  return {
    id: neo.id,
    name: neo.name,
    nasa_jpl_url:
      neo.nasa_jpl_url ||
      `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${neo.id}`,
    absolute_magnitude_h: neo.absolute_magnitude_h,
    is_potentially_hazardous: !!neo.is_potentially_hazardous_asteroid,
    is_sentry_object: !!neo.is_sentry_object,
    estimated_diameter: {
      min_km: neo.estimated_diameter?.kilometers?.estimated_diameter_min || 0,
      max_km: neo.estimated_diameter?.kilometers?.estimated_diameter_max || 0,
      min_m: neo.estimated_diameter?.meters?.estimated_diameter_min || 0,
      max_m: neo.estimated_diameter?.meters?.estimated_diameter_max || 0,
    },
    close_approach_data: (neo.close_approach_data || []).map((ca) => ({
      close_approach_date: ca.close_approach_date,
      close_approach_date_full: ca.close_approach_date_full,
      epoch_date_close_approach: ca.epoch_date_close_approach,
      relative_velocity: {
        km_per_sec: Number(ca.relative_velocity?.kilometers_per_second) || 0,
        km_per_hour: Number(ca.relative_velocity?.kilometers_per_hour) || 0,
      },
      miss_distance: {
        astronomical: Number(ca.miss_distance?.astronomical) || 0,
        lunar: Number(ca.miss_distance?.lunar) || 0,
        kilometers: Number(ca.miss_distance?.kilometers) || 0,
      },
      orbiting_body: ca.orbiting_body || 'Earth',
    })),
    risk,
  };
};

// Generate alerts from real NEO data
const generateAlerts = (neos) => {
  const alerts = [];
  for (const neo of neos) {
    const isHazardous = !!neo.is_potentially_hazardous_asteroid;
    const approach = Array.isArray(neo.close_approach_data)
      ? neo.close_approach_data[0]
      : null;
    const lunarDist = Number(approach?.miss_distance?.lunar) || Infinity;
    const approachDate = approach?.close_approach_date || null;
    const approachTime = approach?.close_approach_date_full
      ? approach.close_approach_date_full.split(' ').pop() + ' UTC'
      : 'Unknown';

    // Close approach alert — within 5 lunar distances
    if (lunarDist < 5) {
      alerts.push({
        id: buildAlertId('close_approach', neo.id, approachDate),
        type: 'close_approach',
        title: 'Close Approach Alert',
        message: `Asteroid ${neo.name} will pass within ${lunarDist.toFixed(2)} LD of Earth`,
        date: approachDate,
        time: approachTime,
        read: false,
        priority: lunarDist < 2 ? 'high' : 'medium',
        neo_id: neo.id,
      });
    }

    // Hazardous object alert
    if (isHazardous) {
      alerts.push({
        id: buildAlertId('hazardous', neo.id, approachDate),
        type: 'hazardous',
        title: 'Hazardous Object Detected',
        message: `Potentially hazardous asteroid ${neo.name} detected`,
        date: approachDate,
        time: approachTime,
        read: false,
        priority: 'high',
        neo_id: neo.id,
      });
    }
  }

  // Sort by priority (high first) then by date
  alerts.sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 };
    return (prio[a.priority] || 2) - (prio[b.priority] || 2);
  });

  return alerts;
};

const getFeed = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    validateDate(start_date, 'start_date');
    validateDate(end_date, 'end_date');

    const range = diffDays(start_date, end_date);
    if (range < 0) {
      throw new ValidationError('end_date must be after start_date');
    }
    if (range > 7) {
      throw new ValidationError('Date range must be 7 days or less');
    }

    // Pagination params (defaults: page 1, 20 items per page)
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

    const data = await fetchFeed({ start_date, end_date });
    const entries = data?.near_earth_objects || {};
    const rawItems = Object.values(entries).flat();
    const allItems = rawItems.map(normalizeNeoForDashboard);

    // Pre-compute aggregate stats from the full dataset
    const totalCount = allItems.length;
    const hazardousCount = allItems.filter((n) => n.is_potentially_hazardous).length;

    let closestLunar = Infinity;
    let closestNeoName = null;
    let velocitySum = 0;

    for (const neo of allItems) {
      const lunar = neo.close_approach_data?.[0]?.miss_distance?.lunar ?? Infinity;
      if (lunar < closestLunar) {
        closestLunar = lunar;
        closestNeoName = neo.name;
      }
      velocitySum += neo.close_approach_data?.[0]?.relative_velocity?.km_per_sec ?? 0;
    }

    const avgVelocity = totalCount > 0 ? +(velocitySum / totalCount).toFixed(2) : 0;

    // Paginate
    const totalPages = Math.ceil(totalCount / limit);
    const startIdx = (page - 1) * limit;
    const paginatedItems = allItems.slice(startIdx, startIdx + limit);

    res.json({
      fetched_at: new Date().toISOString(),
      start_date,
      end_date,
      element_count: totalCount,
      page,
      limit,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
      neo_objects: paginatedItems,
      stats: {
        total: totalCount,
        hazardous: hazardousCount,
        closest_lunar: closestLunar === Infinity ? null : +closestLunar.toFixed(2),
        closest_neo_name: closestNeoName,
        avg_velocity_km_s: avgVelocity,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getLookup = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ValidationError('id is required');
    }

    const neo = await fetchLookup(id);
    if (!neo) {
      throw new NotFoundError('NEO not found');
    }

    res.json({
      neo: normalizeNeo(neo),
      raw: neo,
    });
  } catch (err) {
    next(err);
  }
};

const getSummary = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    validateDate(start_date, 'start_date');
    validateDate(end_date, 'end_date');

    const range = diffDays(start_date, end_date);
    if (range < 0) {
      throw new ValidationError('end_date must be after start_date');
    }
    if (range > 7) {
      throw new ValidationError('Date range must be 7 days or less');
    }

    const data = await fetchFeed({ start_date, end_date });
    const entries = data?.near_earth_objects || {};
    const items = Object.values(entries).flat();

    let hazardous = 0;
    let high = 0;
    let medium = 0;
    let low = 0;

    for (const neo of items) {
      if (neo.is_potentially_hazardous_asteroid) hazardous += 1;
      const { label } = computeRiskScore(neo);
      if (label === 'High') high += 1;
      else if (label === 'Medium') medium += 1;
      else low += 1;
    }

    res.json({
      range: { start_date, end_date },
      total: items.length,
      hazardous,
      risk_breakdown: { high, medium, low },
    });
  } catch (err) {
    next(err);
  }
};

const getAlerts = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    validateDate(start_date, 'start_date');
    validateDate(end_date, 'end_date');

    const range = diffDays(start_date, end_date);
    if (range < 0) {
      throw new ValidationError('end_date must be after start_date');
    }
    if (range > 7) {
      throw new ValidationError('Date range must be 7 days or less');
    }

    const user = await getOptionalSupabaseUser(req);

    const data = await fetchFeed({ start_date, end_date });
    const entries = data?.near_earth_objects || {};
    const rawItems = Object.values(entries).flat();
    let alerts = generateAlerts(rawItems);

    if (user?.id) {
      const stateMap = await getAlertStatesByIds(
        user.id,
        alerts.map((alert) => alert.id),
        { throwOnError: false } // graceful: return alerts even if DB fails
      );

      alerts = alerts
        .filter((alert) => !stateMap.get(alert.id)?.is_deleted)
        .map((alert) => ({
          ...alert,
          read: alert.read || !!stateMap.get(alert.id)?.is_read,
        }));
    }

    res.json({
      range: { start_date, end_date },
      total: alerts.length,
      alerts,
    });
  } catch (err) {
    next(err);
  }
};

const markAlertRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ValidationError('id is required');
    }

    const userId = req.supabaseUser?.id;
    if (!userId) {
      throw new InvalidTokenError();
    }

    await upsertAlertStates(userId, [
      {
        alert_id: id,
        is_read: true,
      },
    ]);

    res.json({
      id: String(id),
      read: true,
    });
  } catch (err) {
    next(err);
  }
};

const markAllAlertsRead = async (req, res, next) => {
  try {
    const alertIds = req.body?.alert_ids;
    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      throw new ValidationError('alert_ids must be a non-empty array');
    }

    const userId = req.supabaseUser?.id;
    if (!userId) {
      throw new InvalidTokenError();
    }

    const normalizedIds = normalizeAlertIds(alertIds);
    await upsertAlertStates(
      userId,
      normalizedIds.map((alertId) => ({
        alert_id: alertId,
        is_read: true,
      }))
    );

    res.json({
      updated: normalizedIds.length,
      read: true,
    });
  } catch (err) {
    next(err);
  }
};

const deleteAlert = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new ValidationError('id is required');
    }

    const userId = req.supabaseUser?.id;
    if (!userId) {
      throw new InvalidTokenError();
    }

    const normalizedId = String(id);

    await upsertAlertStates(userId, [
      {
        alert_id: normalizedId,
        is_deleted: true,
        is_read: true,
      },
    ]);

    res.json({
      id: normalizedId,
      deleted: true,
    });
  } catch (err) {
    next(err);
  }
};

export {
  getFeed,
  getLookup,
  getSummary,
  getAlerts,
  markAlertRead,
  markAllAlertsRead,
  deleteAlert,
};
