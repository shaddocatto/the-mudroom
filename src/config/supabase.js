const { createClient } = require('@supabase/supabase-js');

// Server-side client — uses the service role key, bypasses RLS.
// Only ever used in trusted backend code, never sent to any client.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

module.exports = { supabaseAdmin };
