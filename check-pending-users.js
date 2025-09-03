const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database', 'geopoll.db');

// Connexion à la base de données
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données:', err.message);
        return;
    }
    console.log('✅ Connecté à la base de données SQLite');
});

// Fonction pour obtenir les statistiques des utilisateurs
function getUserStats() {
    return new Promise((resolve, reject) => {
        const queries = {
            total: "SELECT COUNT(*) as count FROM users WHERE is_admin = 0",
            pending: "SELECT COUNT(*) as count FROM users WHERE admin_approved = 0 AND is_admin = 0",
            approved: "SELECT COUNT(*) as count FROM users WHERE admin_approved = 1 AND is_admin = 0",
            active: "SELECT COUNT(*) as count FROM users WHERE is_active = 1 AND is_admin = 0",
            admins: "SELECT COUNT(*) as count FROM users WHERE is_admin = 1"
        };

        const results = {};
        let completed = 0;
        const totalQueries = Object.keys(queries).length;

        Object.entries(queries).forEach(([key, query]) => {
            db.get(query, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                results[key] = row.count;
                completed++;
                
                if (completed === totalQueries) {
                    resolve(results);
                }
            });
        });
    });
}

// Fonction pour obtenir la liste des utilisateurs en attente
function getPendingUsers() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, email, first_name, last_name, country, created_at 
            FROM users 
            WHERE admin_approved = 0 AND is_admin = 0 
            ORDER BY created_at DESC
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

// Exécution principale
async function main() {
    try {
        console.log('\n📊 === STATISTIQUES DES UTILISATEURS ===\n');
        
        // Obtenir les statistiques
        const stats = await getUserStats();
        
        console.log(`👥 Total utilisateurs (non-admin): ${stats.total}`);
        console.log(`⏳ En attente d'approbation: ${stats.pending}`);
        console.log(`✅ Approuvés: ${stats.approved}`);
        console.log(`🟢 Actifs: ${stats.active}`);
        console.log(`🛡️  Administrateurs: ${stats.admins}`);
        
        // Si il y a des utilisateurs en attente, les afficher
        if (stats.pending > 0) {
            console.log('\n📋 === UTILISATEURS EN ATTENTE ===\n');
            
            const pendingUsers = await getPendingUsers();
            
            pendingUsers.forEach((user, index) => {
                const date = new Date(user.created_at).toLocaleDateString('fr-FR');
                console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
                console.log(`   📧 Email: ${user.email}`);
                console.log(`   🌍 Pays: ${user.country || 'Non spécifié'}`);
                console.log(`   📅 Inscription: ${date}`);
                console.log(`   🆔 ID: ${user.id}`);
                console.log('');
            });
        } else {
            console.log('\n✨ Aucun utilisateur en attente d\'approbation !');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error.message);
    } finally {
        // Fermer la connexion
        db.close((err) => {
            if (err) {
                console.error('❌ Erreur lors de la fermeture:', err.message);
            } else {
                console.log('\n✅ Connexion fermée');
            }
        });
    }
}

// Lancer le script
main();
