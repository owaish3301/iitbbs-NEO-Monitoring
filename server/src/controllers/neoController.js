import { fetchFeed, fetchLookup } from '../services/nasa.js';
import { ValidationError, NotFoundError } from '../errors/appError.js';
import { computeRiskScore, getMinMissDistanceKm, getDiameterMeters } from '../utils/risk.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
  let alertId = 1;

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
        id: String(alertId++),
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
        id: String(alertId++),
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

    const data = await fetchFeed({ start_date, end_date });
    const entries = data?.near_earth_objects || {};
    const rawItems = Object.values(entries).flat();
    const items = rawItems.map(normalizeNeoForDashboard);

    res.json({
      fetched_at: new Date().toISOString(),
      start_date,
      end_date,
      element_count: items.length,
      neo_objects: items,
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

    const data = await fetchFeed({ start_date, end_date });
    const entries = data?.near_earth_objects || {};
    const rawItems = Object.values(entries).flat();
    const alerts = generateAlerts(rawItems);

    res.json({
      range: { start_date, end_date },
      total: alerts.length,
      alerts,
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
};
