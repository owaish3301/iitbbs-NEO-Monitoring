const { createClient } = require('@supabase/supabase-js');

let client = null;

const getSupabaseClient = () => {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  client = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return client;
};

module.exports = { getSupabaseClient };
