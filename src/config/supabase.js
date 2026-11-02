const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

// Server-side client — uses the service role key, bypasses RLS.
// Only ever used in trusted backend code, never sent to any client.
//
// supabase-js always spins up a realtime client (even though this
// backend never uses realtime subscriptions), and recent versions
// expect a native WebSocket global, which Node 18 — the version
// available on the production host — doesn't have. Passing the `ws`
// package in explicitly avoids a crash at startup.
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: WebSocket },
  }
);

module.exports = { supabaseAdmin };
