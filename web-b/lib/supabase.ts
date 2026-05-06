import { createClient } from '@supabase/supabase-js';

// Same project as the A site. The publishable key is already shipped publicly
// in /js/config.js — safe to embed here. Row-level security in Supabase
// controls what's actually exposed.
const SUPABASE_URL = 'https://ajjruzolkbzardssopos.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_aAFvyqUjJFYQsuG8GY2KTA_U4SLd545';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});
