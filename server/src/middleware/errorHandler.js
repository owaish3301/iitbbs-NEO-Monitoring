import { AppError } from '../errors/appError.js';

/**
 * Maps Supabase/PostgreSQL error codes to AppError instances
 */
const mapSupabaseError = (err) => {
  // PostgreSQL error codes commonly returned by Supabase
  const code = err.code || err.details?.code;

  switch (code) {
    case '23505': // unique_violation
      return new AppError('Duplicate value for unique field', 409, 'DB_UNIQUE_VIOLATION', {
        detail: err.details || err.message,
      });
    case '23503': // foreign_key_violation
      return new AppError('Invalid relation reference', 400, 'DB_FOREIGN_KEY', {
        detail: err.details || err.message,
      });
    case '23502': // not_null_violation
      return new AppError('Required field is missing', 400, 'DB_NOT_NULL');
    case '42P01': // undefined_table
      return new AppError('Table does not exist', 500, 'DB_TABLE_MISSING');
    case '42703': // undefined_column
      return new AppError('Column does not exist', 500, 'DB_COLUMN_MISSING');
    case '42501': // insufficient_privilege
      return new AppError(
        'Insufficient database privileges. Ensure tables have proper GRANTs for the service_role.',
        500,
        'DB_INSUFFICIENT_PRIVILEGE',
        { code, hint: 'Run: GRANT ALL ON public.user_alert_states TO service_role, authenticated; GRANT ALL ON public.user_watchlist TO service_role, authenticated;' },
      );
    case 'PGRST116': // Supabase: no rows returned
      return new AppError('Record not found', 404, 'DB_NOT_FOUND');
    case 'PGRST204': // no table found
    case 'PGRST205': // could not find the table
      return new AppError(
        'Required table does not exist. Please create the user_alert_states table in Supabase.',
        500,
        'DB_TABLE_MISSING',
      );
    default:
      return null;
  }
};

const errorHandler = (err, req, res, next) => {
  let finalError = err;

  // Handle Axios errors (from external API calls like NASA)
  if (err.isAxiosError || err.constructor?.name === 'AxiosError') {
    const status = err.response?.status || 502;
    const msg = err.response?.data?.error_message || err.response?.data?.error || err.message || 'External API request failed';
    finalError = new AppError(
      `NASA API error: ${msg}`,
      status >= 500 ? 502 : status,
      'EXTERNAL_API_ERROR',
      { url: err.config?.url, status: err.response?.status }
    );
  }
  // Handle Supabase/PostgreSQL errors (have numeric-like codes, not Axios string codes)
  else if (err.code && !err.statusCode && /^[0-9A-Z]{5}$|^PGRST/.test(err.code)) {
    const mappedError = mapSupabaseError(err);
    if (mappedError) {
      finalError = mappedError;
    } else {
      finalError = new AppError('Database error', 500, 'DB_ERROR', {
        code: err.code,
      });
    }
  } else if (!(err instanceof AppError)) {
    finalError = new AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR');
  }

  const payload = {
    error: finalError.message,
    code: finalError.code,
  };

  if (finalError.details) {
    payload.details = finalError.details;
  }

  res.status(finalError.statusCode || 500).json(payload);
};

export default errorHandler;
