import { createClient } from '@supabase/supabase-js';

// Publishable/anon key only — safe for the browser. Vite inlines these at
// build time from the environment (see .env.example / .env.production in
// /web). If they're missing, fail with a visible message instead of
// throwing during module load and white-screening the whole app.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  document.body.innerHTML =
    '<div style="padding:40px;font-family:sans-serif;max-width:480px;margin:0 auto;">' +
    '<h2>Configuration error</h2>' +
    '<p>This app is missing its Supabase configuration (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). ' +
    'It was likely built without a .env.production file in /web.</p>' +
    '</div>';
  throw new Error('Missing Supabase env vars at build time');
}

export const supabase = createClient(url, anonKey);
