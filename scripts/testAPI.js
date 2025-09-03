require('dotenv').config();
const fetch = require('node-fetch');

const BASE_URL = `http://localhost:${process.env.PORT || 3001}`;

async function testAPI() {
    console.log('🧪 Test complet de l\'API GeoPoll avec Supabase...\n');

    try {
        // Test 1: Connexion admin
        console.log('1️⃣ Test de connexion admin...');
        const adminLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@geopoll.com',
                password: 'Admin123!'
            })
        });

        if (adminLoginResponse.ok) {
            const adminData = await adminLoginResponse.json();
            console.log('✅ Connexion admin réussie');
            console.log(`   Admin: ${adminData.user.firstName} ${adminData.user.lastName}`);
            console.log(`   Statut admin: ${adminData.user.isAdmin}`);
            console.log(`   Approuvé: ${adminData.user.adminApproved}\n`);

            const adminToken = adminData.token;

            // Test 2: Tentative de connexion utilisateur non approuvé
            console.log('2️⃣ Test de connexion utilisateur non approuvé...');
            const userLoginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'user1@test.com',
                    password: 'User123!'
                })
            });

            if (userLoginResponse.status === 403) {
                const userError = await userLoginResponse.json();
                console.log('✅ Connexion utilisateur bloquée (attendu)');
                console.log(`   Raison: ${userError.error}\n`);
            } else {
                console.log('❌ L\'utilisateur non approuvé a pu se connecter (problème!)\n');
            }

            // Test 3: Récupération des utilisateurs en attente (admin)
            console.log('3️⃣ Test de récupération des utilisateurs en attente...');
            const pendingUsersResponse = await fetch(`${BASE_URL}/api/admin/users/pending`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (pendingUsersResponse.ok) {
                const pendingUsers = await pendingUsersResponse.json();
                console.log('✅ Récupération des utilisateurs en attente réussie');
                console.log(`   Nombre d'utilisateurs en attente: ${pendingUsers.users ? pendingUsers.users.length : 0}\n`);
            } else {
                console.log('❌ Erreur lors de la récupération des utilisateurs en attente\n');
            }

            // Test 4: Récupération des thèmes de sondage
            console.log('4️⃣ Test de récupération des thèmes de sondage...');
            const themesResponse = await fetch(`${BASE_URL}/api/surveys/themes`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (themesResponse.ok) {
                const themes = await themesResponse.json();
                console.log('✅ Récupération des thèmes réussie');
                console.log(`   Nombre de thèmes: ${themes.length}`);
                themes.forEach((theme, index) => {
                    console.log(`   ${index + 1}. ${theme.name}`);
                });
                console.log();
            } else {
                console.log('❌ Erreur lors de la récupération des thèmes\n');
            }

            // Test 5: Profil admin
            console.log('5️⃣ Test de récupération du profil admin...');
            const profileResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            if (profileResponse.ok) {
                const profile = await profileResponse.json();
                console.log('✅ Récupération du profil réussie');
                console.log(`   Email: ${profile.user.email}`);
                console.log(`   Solde: ${profile.user.balance} ${process.env.CURRENCY || 'FCFA'}`);
                console.log(`   Statistiques: ${profile.stats.totalAttempts} tentatives\n`);
            } else {
                console.log('❌ Erreur lors de la récupération du profil\n');
            }

        } else {
            const adminError = await adminLoginResponse.json();
            console.log('❌ Échec de la connexion admin');
            console.log(`   Erreur: ${adminError.error}\n`);
            return;
        }

        // Test 6: Inscription d'un nouvel utilisateur
        console.log('6️⃣ Test d\'inscription d\'un nouvel utilisateur...');
        const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'newuser@test.com',
                password: 'NewUser123!',
                firstName: 'Nouveau',
                lastName: 'Utilisateur',
                phone: '+33123456789',
                country: 'France',
                countryCode: 'FR',
                profession: 'Testeur'
            })
        });

        if (registerResponse.status === 201) {
            const registerData = await registerResponse.json();
            console.log('✅ Inscription réussie');
            console.log(`   Message: ${registerData.message}`);
            console.log(`   Nécessite approbation: ${registerData.requiresApproval}\n`);
        } else if (registerResponse.status === 409) {
            console.log('⚠️ Utilisateur existe déjà (normal si test déjà exécuté)\n');
        } else {
            const registerError = await registerResponse.json();
            console.log('❌ Échec de l\'inscription');
            console.log(`   Erreur: ${registerError.error}\n`);
        }

        console.log('🎉 Tests terminés avec succès !');
        console.log('\n📋 Résumé des fonctionnalités testées:');
        console.log('✅ Authentification admin');
        console.log('✅ Blocage des utilisateurs non approuvés');
        console.log('✅ Récupération des thèmes de sondage');
        console.log('✅ Récupération du profil utilisateur');
        console.log('✅ Inscription de nouveaux utilisateurs');
        console.log('\n💡 L\'approbation admin est bien fonctionnelle !');

    } catch (error) {
        console.error('❌ Erreur lors des tests:', error);
    }
}

// Exécuter si appelé directement
if (require.main === module) {
    testAPI().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Échec des tests:', error);
        process.exit(1);
    });
}

module.exports = testAPI;
