const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Variables d\'environnement Supabase manquantes:');
    console.error('SUPABASE_URL:', supabaseUrl ? 'OK' : 'MANQUANT');
    console.error('SUPABASE_ANON_KEY:', supabaseAnonKey ? 'OK' : 'MANQUANT');
    throw new Error('Les variables d\'environnement Supabase sont manquantes');
}

// Client Supabase pour les opérations publiques (avec RLS)
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client Supabase pour les opérations administratives (bypass RLS)
const supabaseAdmin = supabaseServiceRoleKey 
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

module.exports = {
    supabase,
    supabaseAdmin
};
