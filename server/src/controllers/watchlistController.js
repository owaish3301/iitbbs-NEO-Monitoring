import { getSupabaseClient } from '../lib/supabase.js';
import {
  ValidationError,
  InvalidTokenError,
  UnauthorizedError,
} from '../errors/appError.js';

const WATCHLIST_TABLE = 'user_watchlist';

const getRequiredSupabase = () => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new UnauthorizedError('Supabase is not configured on the server');
  }
  return supabase;
};

/**
 * GET /api/watchlist
 * Returns the authenticated user's full watchlist.
 */
const getWatchlist = async (req, res, next) => {
  try {
    const userId = req.supabaseUser?.id;
    if (!userId) throw new InvalidTokenError();

    const supabase = getRequiredSupabase();
    const { data, error } = await supabase
      .from(WATCHLIST_TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('[getWatchlist] Supabase error:', error.message);
      throw error;
    }

    res.json({
      total: (data || []).length,
      items: (data || []).map((row) => ({
        id: row.id,
        neo_id: row.neo_id,
        neo_name: row.neo_name,
        added_at: row.added_at,
        alert_enabled: !!row.alert_enabled,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/watchlist
 * Add an asteroid to the user's watchlist.
 * Body: { neo_id: string, neo_name: string }
 */
const addToWatchlist = async (req, res, next) => {
  try {
    const userId = req.supabaseUser?.id;
    if (!userId) throw new InvalidTokenError();

    const { neo_id, neo_name } = req.body || {};
    if (!neo_id) throw new ValidationError('neo_id is required');
    if (!neo_name) throw new ValidationError('neo_name is required');

    const supabase = getRequiredSupabase();

    // Upsert to handle duplicates gracefully
    const { data, error } = await supabase
      .from(WATCHLIST_TABLE)
      .upsert(
        {
          user_id: userId,
          neo_id: String(neo_id),
          neo_name: String(neo_name),
          added_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,neo_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('[addToWatchlist] Supabase error:', error.message);
      throw error;
    }

    res.status(201).json({
      success: true,
      item: {
        id: data.id,
        neo_id: data.neo_id,
        neo_name: data.neo_name,
        added_at: data.added_at,
        alert_enabled: !!data.alert_enabled,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/watchlist/:neoId
 * Remove an asteroid from the user's watchlist by NEO ID.
 */
const removeFromWatchlist = async (req, res, next) => {
  try {
    const userId = req.supabaseUser?.id;
    if (!userId) throw new InvalidTokenError();

    const { neoId } = req.params;
    if (!neoId) throw new ValidationError('neoId is required');

    const supabase = getRequiredSupabase();
    const { error } = await supabase
      .from(WATCHLIST_TABLE)
      .delete()
      .eq('user_id', userId)
      .eq('neo_id', String(neoId));

    if (error) {
      console.error('[removeFromWatchlist] Supabase error:', error.message);
      throw error;
    }

    res.json({ success: true, neo_id: neoId, removed: true });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/watchlist/:neoId/alert
 * Toggle alert_enabled for a NEO in the user's watchlist.
 */
const toggleAlert = async (req, res, next) => {
  try {
    const userId = req.supabaseUser?.id;
    if (!userId) throw new InvalidTokenError();

    const { neoId } = req.params;
    if (!neoId) throw new ValidationError('neoId is required');

    const supabase = getRequiredSupabase();

    // Fetch current state
    const { data: existing, error: fetchErr } = await supabase
      .from(WATCHLIST_TABLE)
      .select('id, alert_enabled')
      .eq('user_id', userId)
      .eq('neo_id', String(neoId))
      .single();

    if (fetchErr || !existing) {
      throw new ValidationError('NEO is not in your watchlist');
    }

    const newState = !existing.alert_enabled;

    const { error: updateErr } = await supabase
      .from(WATCHLIST_TABLE)
      .update({ alert_enabled: newState })
      .eq('id', existing.id);

    if (updateErr) {
      console.error('[toggleAlert] Supabase error:', updateErr.message);
      throw updateErr;
    }

    res.json({ success: true, neo_id: neoId, alert_enabled: newState });
  } catch (err) {
    next(err);
  }
};

export { getWatchlist, addToWatchlist, removeFromWatchlist, toggleAlert };
