const Database = require('./database');
const SupabaseDatabase = require('./supabaseDatabase');

class DatabaseFactory {
    static create() {
        // Vérifier si Supabase est configuré
        const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
        
        if (useSupabase) {
            console.log('🚀 Utilisation de Supabase comme base de données');
            return new SupabaseDatabase();
        } else {
            console.log('📁 Utilisation de SQLite comme base de données');
            return new Database();
        }
    }
}

module.exports = DatabaseFactory;
