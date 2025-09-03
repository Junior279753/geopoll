const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3001';

const ADMIN_USER = {
    email: 'admin@geopoll.ci',
    password: 'admin123'
};

const REGULAR_USER = {
    email: `regular.${Date.now()}@geopoll.test`,
    password: 'Test123!',
    firstName: 'Regular',
    lastName: 'User',
    phone: '+225123456789',
    country: 'Côte d\'Ivoire',
    countryCode: 'CI',
    profession: 'employe'
};

let adminToken = null;
let userToken = null;
let regularUserId = null;

console.log('🔐 === TEST DE GESTION DES RÔLES ET AUTHENTIFICATION ===\n');

// Fonction utilitaire pour faire des requêtes HTTP
function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => {
                body += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: jsonBody
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Test 1: Connexion admin
async function testAdminLogin() {
    console.log('1️⃣ Test connexion administrateur...');
    
    try {
        const response = await makeRequest('POST', '/api/auth/login', ADMIN_USER);
        
        if (response.statusCode === 200 && response.body.user.isAdmin) {
            adminToken = response.body.token;
            console.log('✅ Connexion admin réussie');
            console.log(`   Email: ${response.body.user.email}`);
            console.log(`   Droits admin: ${response.body.user.isAdmin ? 'Oui' : 'Non'}`);
            return true;
        } else {
            console.log('❌ Échec connexion admin:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur connexion admin:', error.message);
        return false;
    }
}

// Test 2: Accès aux routes admin
async function testAdminRoutes() {
    console.log('\n2️⃣ Test accès routes administrateur...');
    
    const adminRoutes = [
        { path: '/api/admin/stats', name: 'Statistiques' },
        { path: '/api/admin/users', name: 'Liste utilisateurs' },
        { path: '/api/admin/settings', name: 'Paramètres' }
    ];
    
    let successCount = 0;
    
    for (const route of adminRoutes) {
        try {
            const response = await makeRequest('GET', route.path, null, adminToken);
            if (response.statusCode === 200) {
                console.log(`✅ ${route.name}: Accès autorisé`);
                successCount++;
            } else {
                console.log(`❌ ${route.name}: Accès refusé (${response.statusCode})`);
            }
        } catch (error) {
            console.log(`❌ ${route.name}: Erreur (${error.message})`);
        }
    }
    
    return successCount === adminRoutes.length;
}

// Test 3: Création utilisateur régulier
async function testRegularUserCreation() {
    console.log('\n3️⃣ Test création utilisateur régulier...');
    
    try {
        const response = await makeRequest('POST', '/api/auth/register', REGULAR_USER);
        
        if (response.statusCode === 201) {
            regularUserId = response.body.user.id;
            console.log('✅ Utilisateur régulier créé');
            console.log(`   Email: ${REGULAR_USER.email}`);
            console.log(`   ID: ${regularUserId}`);
            console.log(`   Statut: En attente d'approbation`);
            return true;
        } else {
            console.log('❌ Échec création utilisateur:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur création utilisateur:', error.message);
        return false;
    }
}

// Test 4: Tentative d'accès non autorisé (utilisateur non approuvé)
async function testUnauthorizedAccess() {
    console.log('\n4️⃣ Test accès non autorisé (utilisateur non approuvé)...');
    
    try {
        const loginResponse = await makeRequest('POST', '/api/auth/login', REGULAR_USER);
        
        if (loginResponse.statusCode === 403 && loginResponse.body.code === 'PENDING_APPROVAL') {
            console.log('✅ Accès correctement refusé pour utilisateur non approuvé');
            return true;
        } else {
            console.log('❌ L\'accès aurait dû être refusé:', loginResponse.statusCode, loginResponse.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur test accès non autorisé:', error.message);
        return false;
    }
}

// Test 5: Approbation par admin
async function testUserApproval() {
    console.log('\n5️⃣ Test approbation utilisateur par admin...');
    
    try {
        const response = await makeRequest('POST', `/api/admin/users/${regularUserId}/approve`, null, adminToken);
        
        if (response.statusCode === 200) {
            console.log('✅ Utilisateur approuvé par admin');
            console.log(`   Message: ${response.body.message}`);
            return true;
        } else {
            console.log('❌ Échec approbation:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur approbation:', error.message);
        return false;
    }
}

// Test 6: Connexion utilisateur approuvé
async function testApprovedUserLogin() {
    console.log('\n6️⃣ Test connexion utilisateur approuvé...');
    
    try {
        const response = await makeRequest('POST', '/api/auth/login', REGULAR_USER);
        
        if (response.statusCode === 200) {
            userToken = response.body.token;
            console.log('✅ Connexion utilisateur approuvé réussie');
            console.log(`   Email: ${response.body.user.email}`);
            console.log(`   Droits admin: ${response.body.user.isAdmin ? 'Oui' : 'Non'}`);
            console.log(`   Statut approbation: ${response.body.user.adminApproved ? 'Approuvé' : 'En attente'}`);
            return true;
        } else {
            console.log('❌ Échec connexion utilisateur approuvé:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur connexion utilisateur approuvé:', error.message);
        return false;
    }
}

// Test 7: Tentative d'accès aux routes admin par utilisateur régulier
async function testRegularUserAdminAccess() {
    console.log('\n7️⃣ Test accès routes admin par utilisateur régulier...');
    
    const adminRoutes = [
        { path: '/api/admin/stats', name: 'Statistiques' },
        { path: '/api/admin/users', name: 'Liste utilisateurs' }
    ];
    
    let deniedCount = 0;
    
    for (const route of adminRoutes) {
        try {
            const response = await makeRequest('GET', route.path, null, userToken);
            if (response.statusCode === 403) {
                console.log(`✅ ${route.name}: Accès correctement refusé`);
                deniedCount++;
            } else {
                console.log(`❌ ${route.name}: Accès autorisé (ne devrait pas l'être)`);
            }
        } catch (error) {
            console.log(`❌ ${route.name}: Erreur (${error.message})`);
        }
    }
    
    return deniedCount === adminRoutes.length;
}

// Test 8: Accès aux routes utilisateur autorisées
async function testRegularUserAuthorizedAccess() {
    console.log('\n8️⃣ Test accès routes autorisées pour utilisateur régulier...');
    
    const userRoutes = [
        { path: '/api/auth/profile', name: 'Profil utilisateur' },
        { path: '/api/surveys/themes', name: 'Thèmes de sondage' }
    ];
    
    let successCount = 0;
    
    for (const route of userRoutes) {
        try {
            const response = await makeRequest('GET', route.path, null, userToken);
            if (response.statusCode === 200) {
                console.log(`✅ ${route.name}: Accès autorisé`);
                successCount++;
            } else {
                console.log(`❌ ${route.name}: Accès refusé (${response.statusCode})`);
            }
        } catch (error) {
            console.log(`❌ ${route.name}: Erreur (${error.message})`);
        }
    }
    
    return successCount === userRoutes.length;
}

// Test principal
async function runRoleTests() {
    const results = [];
    
    results.push(await testAdminLogin());
    results.push(await testAdminRoutes());
    results.push(await testRegularUserCreation());
    results.push(await testUnauthorizedAccess());
    results.push(await testUserApproval());
    results.push(await testApprovedUserLogin());
    results.push(await testRegularUserAdminAccess());
    results.push(await testRegularUserAuthorizedAccess());
    
    // Résumé
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n📊 === RÉSUMÉ DES TESTS DE RÔLES ===');
    console.log(`✅ Tests réussis: ${passed}/${total}`);
    console.log(`❌ Tests échoués: ${total - passed}/${total}`);
    
    if (passed === total) {
        console.log('\n🎉 Tous les tests de gestion des rôles sont passés !');
        console.log('✅ L\'authentification fonctionne correctement');
        console.log('✅ Les autorisations sont bien appliquées');
        console.log('✅ Le contrôle d\'accès basé sur les rôles fonctionne');
    } else {
        console.log('\n⚠️  Certains tests de rôles ont échoué.');
    }
}

// Lancer les tests
runRoleTests().catch(error => {
    console.error('❌ Erreur lors des tests de rôles:', error);
});
