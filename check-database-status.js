const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database', 'geopoll.db');

console.log('🔍 === VÉRIFICATION DE LA BASE DE DONNÉES GEOPOLL ===\n');

// Connexion à la base de données
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données:', err.message);
        return;
    }
    console.log('✅ Connecté à la base de données SQLite\n');
});

// Fonction pour vérifier les tables
function checkTables() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT name FROM sqlite_master 
            WHERE type='table' 
            ORDER BY name
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

// Fonction pour compter les utilisateurs
function countUsers() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN admin_approved = 1 THEN 1 ELSE 0 END) as approved,
                SUM(CASE WHEN admin_approved = 0 THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN is_admin = 1 THEN 1 ELSE 0 END) as admins
            FROM users
        `;
        
        db.get(query, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

// Fonction pour lister les derniers utilisateurs
function getRecentUsers() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                id, email, first_name, last_name, 
                admin_approved, is_admin, is_active, created_at
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        `;
        
        db.all(query, (err, rows) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(rows);
        });
    });
}

// Fonction pour vérifier les sondages
function checkSurveys() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT COUNT(*) as total_surveys
            FROM surveys
        `;
        
        db.get(query, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

// Fonction pour vérifier les logs d'activité
function checkActivityLogs() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT COUNT(*) as total_logs
            FROM activity_logs
        `;
        
        db.get(query, (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(row);
        });
    });
}

// Exécution principale
async function main() {
    try {
        // Vérifier les tables
        console.log('📋 === TABLES DISPONIBLES ===');
        const tables = await checkTables();
        tables.forEach((table, index) => {
            console.log(`${index + 1}. ${table.name}`);
        });
        console.log('');
        
        // Statistiques des utilisateurs
        console.log('👥 === STATISTIQUES UTILISATEURS ===');
        const userStats = await countUsers();
        console.log(`📊 Total utilisateurs: ${userStats.total}`);
        console.log(`✅ Utilisateurs approuvés: ${userStats.approved}`);
        console.log(`⏳ Utilisateurs en attente: ${userStats.pending}`);
        console.log(`🛡️  Administrateurs: ${userStats.admins}`);
        console.log('');
        
        // Derniers utilisateurs
        console.log('👤 === DERNIERS UTILISATEURS INSCRITS ===');
        const recentUsers = await getRecentUsers();
        if (recentUsers.length > 0) {
            recentUsers.forEach((user, index) => {
                const status = user.admin_approved ? '✅ Approuvé' : '⏳ En attente';
                const admin = user.is_admin ? ' 🛡️ Admin' : '';
                console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
                console.log(`   Status: ${status}${admin} | Créé: ${new Date(user.created_at).toLocaleDateString('fr-FR')}`);
            });
        } else {
            console.log('Aucun utilisateur trouvé');
        }
        console.log('');
        
        // Statistiques des sondages
        console.log('📊 === STATISTIQUES SONDAGES ===');
        try {
            const surveyStats = await checkSurveys();
            console.log(`📋 Total sondages: ${surveyStats.total_surveys}`);
        } catch (error) {
            console.log('❌ Table surveys non trouvée ou erreur');
        }
        console.log('');
        
        // Statistiques des logs
        console.log('📝 === STATISTIQUES LOGS ===');
        try {
            const logStats = await checkActivityLogs();
            console.log(`📋 Total logs d'activité: ${logStats.total_logs}`);
        } catch (error) {
            console.log('❌ Table activity_logs non trouvée ou erreur');
        }
        console.log('');
        
        // Recommandations
        console.log('💡 === RECOMMANDATIONS POUR LES TESTS ===');
        
        if (userStats.total === 0) {
            console.log('⚠️  Aucun utilisateur dans la base - Créez un compte de test');
        } else if (userStats.pending > 0) {
            console.log(`✅ ${userStats.pending} utilisateur(s) en attente - Parfait pour tester l'approbation admin`);
        } else {
            console.log('✅ Tous les utilisateurs sont approuvés');
        }
        
        if (userStats.admins === 0) {
            console.log('⚠️  Aucun administrateur - Utilisez admin@geopoll.ci / admin123');
        } else {
            console.log(`✅ ${userStats.admins} administrateur(s) disponible(s)`);
        }
        
        console.log('\n🚀 === ÉTAPES DE TEST RECOMMANDÉES ===');
        console.log('1. Créer un nouvel utilisateur via /register.html');
        console.log('2. Se connecter en tant qu\'admin via /admin-modern.html');
        console.log('3. Approuver le nouvel utilisateur');
        console.log('4. Tester le cycle complet utilisateur → admin → approbation');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error.message);
    } finally {
        // Fermer la connexion
        db.close((err) => {
            if (err) {
                console.error('❌ Erreur lors de la fermeture:', err.message);
            } else {
                console.log('\n✅ Vérification terminée - Connexion fermée');
            }
        });
    }
}

// Lancer la vérification
main();
