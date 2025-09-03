// Fichier de migration pour basculer entre SQLite et Supabase
const User = require('./User');
const Survey = require('./Survey');
const SupabaseUser = require('./SupabaseUser');
const SupabaseSurvey = require('./SupabaseSurvey');

// Vérifier si Supabase est configuré
const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;

// Exporter les modèles appropriés selon la configuration
module.exports = {
    User: useSupabase ? SupabaseUser : User,
    Survey: useSupabase ? SupabaseSurvey : Survey,
    // Exporter aussi les versions spécifiques pour les tests ou migrations
    SQLiteUser: User,
    SQLiteSurvey: Survey,
    SupabaseUser,
    SupabaseSurvey,
    // Indicateur de la base de données utilisée
    isUsingSupabase: useSupabase
};
