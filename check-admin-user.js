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

// Fonction pour vérifier les utilisateurs admin
function checkAdminUsers() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, email, first_name, last_name, is_admin, is_active, admin_approved, created_at
            FROM users 
            WHERE is_admin = 1
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

// Fonction pour vérifier tous les utilisateurs
function checkAllUsers() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, email, first_name, last_name, is_admin, is_active, admin_approved, created_at
            FROM users 
            ORDER BY created_at DESC
            LIMIT 10
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

// Fonction pour créer un utilisateur admin si nécessaire
function createAdminUser() {
    return new Promise((resolve, reject) => {
        const bcrypt = require('bcryptjs');
        const email = 'admin@geopoll.com';
        const password = 'admin123'; // Mot de passe par défaut
        
        // Vérifier si l'admin existe déjà
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row) {
                console.log('✅ Utilisateur admin existe déjà avec l\'ID:', row.id);
                resolve(row);
                return;
            }
            
            // Créer l'utilisateur admin
            try {
                const passwordHash = await bcrypt.hash(password, 10);
                
                const query = `
                    INSERT INTO users (
                        email, password_hash, first_name, last_name, 
                        is_admin, is_active, admin_approved, created_at
                    ) VALUES (?, ?, ?, ?, 1, 1, 1, CURRENT_TIMESTAMP)
                `;
                
                db.run(query, [email, passwordHash, 'Super', 'Admin'], function(err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    console.log('✅ Utilisateur admin créé avec l\'ID:', this.lastID);
                    resolve({ id: this.lastID });
                });
                
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Exécution principale
async function main() {
    try {
        console.log('\n🔍 === VÉRIFICATION DES UTILISATEURS ADMIN ===\n');
        
        // Vérifier les utilisateurs admin existants
        const adminUsers = await checkAdminUsers();
        
        if (adminUsers.length === 0) {
            console.log('⚠️  Aucun utilisateur admin trouvé !');
            console.log('🔄 Création d\'un utilisateur admin par défaut...\n');
            
            await createAdminUser();
            
            // Revérifier après création
            const newAdminUsers = await checkAdminUsers();
            console.log('\n📋 Utilisateurs admin après création:');
            newAdminUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
                console.log(`   📧 Email: ${user.email}`);
                console.log(`   🆔 ID: ${user.id}`);
                console.log(`   🛡️  Admin: ${user.is_admin ? 'Oui' : 'Non'}`);
                console.log(`   ✅ Actif: ${user.is_active ? 'Oui' : 'Non'}`);
                console.log(`   ✅ Approuvé: ${user.admin_approved ? 'Oui' : 'Non'}`);
                console.log(`   📅 Créé: ${new Date(user.created_at).toLocaleDateString('fr-FR')}`);
                console.log('');
            });
        } else {
            console.log(`✅ ${adminUsers.length} utilisateur(s) admin trouvé(s):\n`);
            
            adminUsers.forEach((user, index) => {
                console.log(`${index + 1}. ${user.first_name} ${user.last_name}`);
                console.log(`   📧 Email: ${user.email}`);
                console.log(`   🆔 ID: ${user.id}`);
                console.log(`   🛡️  Admin: ${user.is_admin ? 'Oui' : 'Non'}`);
                console.log(`   ✅ Actif: ${user.is_active ? 'Oui' : 'Non'}`);
                console.log(`   ✅ Approuvé: ${user.admin_approved ? 'Oui' : 'Non'}`);
                console.log(`   📅 Créé: ${new Date(user.created_at).toLocaleDateString('fr-FR')}`);
                console.log('');
            });
        }
        
        // Afficher tous les utilisateurs pour référence
        console.log('📋 === TOUS LES UTILISATEURS (10 derniers) ===\n');
        const allUsers = await checkAllUsers();
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.first_name} ${user.last_name} (${user.email})`);
            console.log(`   🛡️  Admin: ${user.is_admin ? 'Oui' : 'Non'} | Actif: ${user.is_active ? 'Oui' : 'Non'} | Approuvé: ${user.admin_approved ? 'Oui' : 'Non'}`);
        });
        
        console.log('\n💡 Pour vous connecter en tant qu\'admin:');
        console.log('   Email: admin@geopoll.com');
        console.log('   Mot de passe: admin123');
        
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
