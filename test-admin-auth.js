const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:3001';
const ADMIN_EMAIL = 'admin@geopoll.ci';
const ADMIN_PASSWORD = 'admin123'; // Mot de passe par défaut

async function testAdminAuth() {
    try {
        console.log('🔐 === TEST D\'AUTHENTIFICATION ADMIN ===\n');
        
        // 1. Test de connexion admin
        console.log('1️⃣ Test de connexion admin...');
        const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD
            })
        });
        
        if (!loginResponse.ok) {
            const errorData = await loginResponse.json();
            console.log('❌ Échec de la connexion:', errorData);
            return;
        }
        
        const loginData = await loginResponse.json();
        console.log('✅ Connexion réussie !');
        console.log('👤 Utilisateur:', loginData.user.firstName, loginData.user.lastName);
        console.log('🛡️  Admin:', loginData.user.isAdmin ? 'Oui' : 'Non');
        console.log('🎫 Token reçu:', loginData.token ? 'Oui' : 'Non');
        
        const token = loginData.token;
        
        // 2. Test d'accès au profil
        console.log('\n2️⃣ Test d\'accès au profil...');
        const profileResponse = await fetch(`${BASE_URL}/api/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (profileResponse.ok) {
            const profileData = await profileResponse.json();
            console.log('✅ Profil récupéré avec succès');
            console.log('👤 Nom:', profileData.user.firstName, profileData.user.lastName);
            console.log('📧 Email:', profileData.user.email);
            console.log('🛡️  Admin:', profileData.user.isAdmin ? 'Oui' : 'Non');
        } else {
            console.log('❌ Échec récupération profil:', await profileResponse.json());
        }
        
        // 3. Test d'accès aux stats admin
        console.log('\n3️⃣ Test d\'accès aux statistiques admin...');
        const statsResponse = await fetch(`${BASE_URL}/api/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            console.log('✅ Statistiques admin récupérées avec succès');
            console.log('📊 Données:', Object.keys(statsData));
        } else {
            const errorData = await statsResponse.json();
            console.log('❌ Échec accès stats admin:', statsResponse.status, errorData);
        }
        
        // 4. Test d'accès aux utilisateurs admin
        console.log('\n4️⃣ Test d\'accès aux utilisateurs admin...');
        const usersResponse = await fetch(`${BASE_URL}/api/admin/users`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (usersResponse.ok) {
            const usersData = await usersResponse.json();
            console.log('✅ Utilisateurs admin récupérés avec succès');
            console.log('👥 Nombre d\'utilisateurs:', usersData.users ? usersData.users.length : 'N/A');
        } else {
            const errorData = await usersResponse.json();
            console.log('❌ Échec accès utilisateurs admin:', usersResponse.status, errorData);
        }
        
        // 5. Test d'accès aux logs admin
        console.log('\n5️⃣ Test d\'accès aux logs admin...');
        const logsResponse = await fetch(`${BASE_URL}/api/admin/logs?limit=5`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (logsResponse.ok) {
            const logsData = await logsResponse.json();
            console.log('✅ Logs admin récupérés avec succès');
            console.log('📋 Nombre de logs:', logsData.logs ? logsData.logs.length : 'N/A');
        } else {
            const errorData = await logsResponse.json();
            console.log('❌ Échec accès logs admin:', logsResponse.status, errorData);
        }
        
        console.log('\n🎉 Tests terminés !');
        
    } catch (error) {
        console.error('❌ Erreur lors des tests:', error.message);
    }
}

// Lancer les tests
testAdminAuth();
