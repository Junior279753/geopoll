require('dotenv').config();
const { User } = require('../models');

async function createTestAccounts() {
    try {
        console.log('👥 Création des comptes de test...');

        // Créer un compte admin
        console.log('🔑 Création du compte administrateur...');
        try {
            const admin = await User.create({
                email: 'admin@geopoll.com',
                password: 'Admin123!',
                firstName: 'Admin',
                lastName: 'GeoPoll',
                phone: '+33123456789',
                country: 'France',
                countryCode: 'FR',
                profession: 'Administrateur'
            });

            // Marquer comme admin et approuvé
            const DatabaseFactory = require('../models/databaseFactory');
            const db = DatabaseFactory.create();
            await db.update('users', {
                is_admin: true,
                admin_approved: true,
                email_verified: true,
                unique_id: 'ADMIN001'
            }, { id: admin.id });

            console.log('✅ Compte admin créé:', admin.email);
        } catch (error) {
            if (error.message.includes('existe déjà')) {
                console.log('⚠️ Compte admin existe déjà');
            } else {
                console.error('❌ Erreur création admin:', error);
            }
        }

        // Créer deux comptes utilisateurs
        const users = [
            {
                email: 'user1@test.com',
                password: 'User123!',
                firstName: 'Jean',
                lastName: 'Dupont',
                phone: '+33987654321',
                country: 'France',
                countryCode: 'FR',
                profession: 'Développeur'
            },
            {
                email: 'user2@test.com',
                password: 'User123!',
                firstName: 'Marie',
                lastName: 'Martin',
                phone: '+33456789123',
                country: 'Belgique',
                countryCode: 'BE',
                profession: 'Designer'
            }
        ];

        console.log('👤 Création des comptes utilisateurs...');
        for (let i = 0; i < users.length; i++) {
            try {
                const userData = users[i];
                const user = await User.create(userData);

                // Marquer comme vérifié mais non approuvé (pour tester l'approbation admin)
                const DatabaseFactory = require('../models/databaseFactory');
                const db = DatabaseFactory.create();
                await db.update('users', {
                    email_verified: true,
                    unique_id: `USER00${i + 1}`
                }, { id: user.id });

                console.log(`✅ Utilisateur ${i + 1} créé:`, user.email);
            } catch (error) {
                if (error.message.includes('existe déjà')) {
                    console.log(`⚠️ Utilisateur ${i + 1} existe déjà`);
                } else {
                    console.error(`❌ Erreur création utilisateur ${i + 1}:`, error);
                }
            }
        }

        console.log('\n📋 Résumé des comptes créés:');
        console.log('🔑 Admin: admin@geopoll.com / Admin123!');
        console.log('👤 User1: user1@test.com / User123! (non approuvé)');
        console.log('👤 User2: user2@test.com / User123! (non approuvé)');
        console.log('\n💡 Les utilisateurs doivent être approuvés par l\'admin pour se connecter');

    } catch (error) {
        console.error('❌ Erreur lors de la création des comptes:', error);
        throw error;
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    createTestAccounts().then(() => {
        console.log('🎉 Création des comptes terminée');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Échec de la création des comptes:', error);
        process.exit(1);
    });
}

module.exports = createTestAccounts;
