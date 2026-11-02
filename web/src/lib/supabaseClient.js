import { createClient } from '@supabase/supabase-js';

// Publishable/anon key only — safe for the browser. Vite inlines these at
// build time from the environment (see .env.example in /web).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
