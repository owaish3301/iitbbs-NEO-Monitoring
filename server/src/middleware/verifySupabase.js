const { getSupabaseClient } = require('../lib/supabase');
const { InvalidTokenError, UnauthorizedError } = require('../errors/appError');

const verifySupabase = async (req, res, next) => {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return next(new UnauthorizedError('Supabase is not configured on the server'));
    }

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return next(new InvalidTokenError('Missing Authorization bearer token'));
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return next(new InvalidTokenError());
    }

    req.supabaseUser = data.user;
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = verifySupabase;
