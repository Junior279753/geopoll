const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Chemin vers la base de données
const dbPath = path.join(__dirname, 'database', 'geopoll.db');

console.log('🔍 === VÉRIFICATION DU MOT DE PASSE ADMIN ===\n');

// Connexion à la base de données
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Erreur de connexion à la base de données:', err.message);
        return;
    }
    console.log('✅ Connecté à la base de données SQLite\n');
});

// Fonction pour vérifier l'admin
function checkAdmin() {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT id, email, password_hash, first_name, last_name, is_admin, is_active
            FROM users 
            WHERE is_admin = 1
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

// Fonction pour tester le mot de passe
async function testPassword(hash, password) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('Erreur lors de la vérification du mot de passe:', error);
        return false;
    }
}

// Fonction pour mettre à jour le mot de passe admin
function updateAdminPassword(adminId, newPassword) {
    return new Promise(async (resolve, reject) => {
        try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
            
            const query = `
                UPDATE users 
                SET password_hash = ?
                WHERE id = ?
            `;
            
            db.run(query, [hashedPassword, adminId], function(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.changes);
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Exécution principale
async function main() {
    try {
        // Vérifier les admins
        console.log('👤 === ADMINISTRATEURS TROUVÉS ===');
        const admins = await checkAdmin();
        
        if (admins.length === 0) {
            console.log('❌ Aucun administrateur trouvé !');
            return;
        }
        
        for (const admin of admins) {
            console.log(`📧 Email: ${admin.email}`);
            console.log(`👤 Nom: ${admin.first_name} ${admin.last_name}`);
            console.log(`🆔 ID: ${admin.id}`);
            console.log(`✅ Actif: ${admin.is_active ? 'Oui' : 'Non'}`);
            
            // Tester différents mots de passe possibles
            const passwordsToTest = ['admin123', 'admin', 'password', '123456'];
            let passwordFound = false;
            
            console.log('\n🔐 Test des mots de passe...');
            
            for (const passwordToTest of passwordsToTest) {
                const isValid = await testPassword(admin.password_hash, passwordToTest);
                if (isValid) {
                    console.log(`✅ Mot de passe trouvé: "${passwordToTest}"`);
                    passwordFound = true;
                    break;
                } else {
                    console.log(`❌ "${passwordToTest}" - incorrect`);
                }
            }
            
            if (!passwordFound) {
                console.log('\n⚠️  Aucun mot de passe standard ne fonctionne.');
                console.log('🔄 Mise à jour du mot de passe vers "admin123"...');
                
                try {
                    const changes = await updateAdminPassword(admin.id, 'admin123');
                    if (changes > 0) {
                        console.log('✅ Mot de passe mis à jour avec succès !');
                        console.log('📧 Email: admin@geopoll.ci');
                        console.log('🔑 Nouveau mot de passe: admin123');
                    } else {
                        console.log('❌ Échec de la mise à jour du mot de passe');
                    }
                } catch (error) {
                    console.error('❌ Erreur lors de la mise à jour:', error.message);
                }
            }
            
            console.log('\n' + '='.repeat(50) + '\n');
        }
        
        console.log('💡 === INFORMATIONS POUR LES TESTS ===');
        console.log('📧 Email admin: admin@geopoll.ci');
        console.log('🔑 Mot de passe: admin123');
        console.log('🌐 Interface admin: http://localhost:3001/admin-modern.html');
        
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
