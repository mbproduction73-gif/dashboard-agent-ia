/**
 * Configuration et client Supabase
 * Utilise la clé service_role pour les opérations backend (bypass RLS)
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Variables SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requises');
}

// Client admin (service role) - bypass RLS - à utiliser côté backend uniquement
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
