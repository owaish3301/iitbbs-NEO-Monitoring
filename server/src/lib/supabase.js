import { createClient } from '@supabase/supabase-js';

let client = null;

const getSupabaseClient = () => {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const key = serviceKey || anonKey;

  if (!serviceKey && anonKey) {
    console.warn(
      '[supabase] WARNING: SUPABASE_SERVICE_ROLE_KEY is not set — falling back to anon key. ' +
      'DB writes may fail with 42501 insufficient_privilege. ' +
      'Set SUPABASE_SERVICE_ROLE_KEY in your .env file.'
    );
  }

  if (!url || !key) return null;

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        Authorization: `Bearer ${key}`,
      },
    },
  });

  return client;
};

export { getSupabaseClient };
