const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
    email: `test.${Date.now()}@geopoll.test`,
    password: 'Test123!',
    firstName: 'Test',
    lastName: 'User',
    phone: '+225123456789',
    country: 'Côte d\'Ivoire',
    countryCode: 'CI',
    profession: 'employe'  // Profession valide selon la validation
};

const ADMIN_USER = {
    email: 'admin@geopoll.ci',
    password: 'admin123'
};

let userToken = null;
let adminToken = null;
let testUserId = null;

console.log('🧪 === TEST AUTOMATISÉ DES APIS GEOPOLL ===\n');

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

// Test 1: Inscription utilisateur
async function testUserRegistration() {
    console.log('1️⃣ Test inscription utilisateur...');
    
    try {
        const response = await makeRequest('POST', '/api/auth/register', TEST_USER);
        
        if (response.statusCode === 201) {
            console.log('✅ Inscription réussie');
            console.log(`   Email: ${TEST_USER.email}`);
            testUserId = response.body.user?.id;
            return true;
        } else {
            console.log('❌ Échec inscription:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur inscription:', error.message);
        return false;
    }
}

// Test 2: Connexion utilisateur
async function testUserLogin() {
    console.log('\n2️⃣ Test connexion utilisateur...');
    
    try {
        const response = await makeRequest('POST', '/api/auth/login', {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        
        if (response.statusCode === 200) {
            console.log('✅ Connexion utilisateur réussie');
            userToken = response.body.token;
            console.log(`   Token reçu: ${userToken ? 'Oui' : 'Non'}`);
            console.log(`   Statut approbation: ${response.body.user.adminApproved ? 'Approuvé' : 'En attente'}`);
            return true;
        } else {
            console.log('❌ Échec connexion utilisateur:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur connexion utilisateur:', error.message);
        return false;
    }
}

// Test 3: Accès au profil utilisateur
async function testUserProfile() {
    console.log('\n3️⃣ Test accès profil utilisateur...');
    
    try {
        const response = await makeRequest('GET', '/api/auth/profile', null, userToken);
        
        if (response.statusCode === 200) {
            console.log('✅ Accès profil réussi');
            console.log(`   Nom: ${response.body.user.firstName} ${response.body.user.lastName}`);
            console.log(`   Email: ${response.body.user.email}`);
            return true;
        } else {
            console.log('❌ Échec accès profil:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur accès profil:', error.message);
        return false;
    }
}

// Test 4: Connexion admin
async function testAdminLogin() {
    console.log('\n4️⃣ Test connexion admin...');
    
    try {
        const response = await makeRequest('POST', '/api/auth/login', ADMIN_USER);
        
        if (response.statusCode === 200) {
            console.log('✅ Connexion admin réussie');
            adminToken = response.body.token;
            console.log(`   Admin: ${response.body.user.isAdmin ? 'Oui' : 'Non'}`);
            console.log(`   Email: ${response.body.user.email}`);
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

// Test 5: Accès aux statistiques admin
async function testAdminStats() {
    console.log('\n5️⃣ Test statistiques admin...');
    
    try {
        const response = await makeRequest('GET', '/api/admin/stats', null, adminToken);
        
        if (response.statusCode === 200) {
            console.log('✅ Accès statistiques réussi');
            console.log(`   Utilisateurs totaux: ${response.body.users?.total_users || 'N/A'}`);
            console.log(`   Utilisateurs actifs: ${response.body.users?.active_users || 'N/A'}`);
            return true;
        } else {
            console.log('❌ Échec accès statistiques:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur accès statistiques:', error.message);
        return false;
    }
}

// Test 6: Liste des utilisateurs admin
async function testAdminUsers() {
    console.log('\n6️⃣ Test liste utilisateurs admin...');
    
    try {
        const response = await makeRequest('GET', '/api/admin/users', null, adminToken);
        
        if (response.statusCode === 200) {
            console.log('✅ Accès liste utilisateurs réussi');
            console.log(`   Nombre d'utilisateurs: ${response.body.users?.length || 0}`);
            
            // Chercher notre utilisateur de test
            const testUser = response.body.users?.find(u => u.email === TEST_USER.email);
            if (testUser) {
                console.log(`   Utilisateur de test trouvé: ${testUser.first_name} ${testUser.last_name}`);
                console.log(`   Statut: ${testUser.admin_approved ? 'Approuvé' : 'En attente'}`);
                testUserId = testUser.id;
            }
            return true;
        } else {
            console.log('❌ Échec accès liste utilisateurs:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur accès liste utilisateurs:', error.message);
        return false;
    }
}

// Test 7: Approbation utilisateur
async function testUserApproval() {
    console.log('\n7️⃣ Test approbation utilisateur...');
    
    if (!testUserId) {
        console.log('❌ ID utilisateur de test non trouvé');
        return false;
    }
    
    try {
        const response = await makeRequest('POST', `/api/admin/users/${testUserId}/approve`, null, adminToken);
        
        if (response.statusCode === 200) {
            console.log('✅ Approbation utilisateur réussie');
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

// Test 8: Reconnexion après approbation
async function testUserReloginAfterApproval() {
    console.log('\n8️⃣ Test reconnexion après approbation...');

    try {
        const response = await makeRequest('POST', '/api/auth/login', {
            email: TEST_USER.email,
            password: TEST_USER.password
        });

        if (response.statusCode === 200) {
            console.log('✅ Reconnexion après approbation réussie');
            userToken = response.body.token;
            console.log(`   Statut approbation: ${response.body.user.adminApproved ? 'Approuvé' : 'En attente'}`);
            return response.body.user.adminApproved;
        } else {
            console.log('❌ Échec reconnexion:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur reconnexion:', error.message);
        return false;
    }
}

// Test 9: Accès aux thèmes de sondage
async function testSurveyThemes() {
    console.log('\n9️⃣ Test accès thèmes de sondage...');

    try {
        const response = await makeRequest('GET', '/api/surveys/themes', null, userToken);

        if (response.statusCode === 200) {
            console.log('✅ Accès thèmes réussi');
            console.log(`   Nombre de thèmes: ${response.body.length}`);
            if (response.body.length > 0) {
                console.log(`   Premier thème: ${response.body[0].name}`);
                console.log(`   Peut commencer: ${response.body[0].canStart ? 'Oui' : 'Non'}`);
            }
            return true;
        } else {
            console.log('❌ Échec accès thèmes:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur accès thèmes:', error.message);
        return false;
    }
}

// Test 10: Démarrage d'un sondage
async function testStartSurvey() {
    console.log('\n🔟 Test démarrage sondage...');

    try {
        const response = await makeRequest('POST', '/api/surveys/themes/1/start', null, userToken);

        if (response.statusCode === 200) {
            console.log('✅ Démarrage sondage réussi');
            console.log(`   ID tentative: ${response.body.attemptId}`);
            console.log(`   Thème: ${response.body.theme.name}`);
            console.log(`   Nombre de questions: ${response.body.totalQuestions}`);
            return response.body.attemptId;
        } else {
            console.log('❌ Échec démarrage sondage:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur démarrage sondage:', error.message);
        return false;
    }
}

// Test 11: Paramètres admin
async function testAdminSettings() {
    console.log('\n1️⃣1️⃣ Test paramètres admin...');

    try {
        const response = await makeRequest('GET', '/api/admin/settings', null, adminToken);

        if (response.statusCode === 200) {
            console.log('✅ Accès paramètres réussi');
            console.log(`   Plateforme: ${response.body.settings?.platform?.name || 'N/A'}`);
            console.log(`   Version: ${response.body.settings?.platform?.version || 'N/A'}`);
            return true;
        } else {
            console.log('❌ Échec accès paramètres:', response.statusCode, response.body);
            return false;
        }
    } catch (error) {
        console.log('❌ Erreur accès paramètres:', error.message);
        return false;
    }
}

// Exécution de tous les tests
async function runAllTests() {
    console.log(`📧 Email de test: ${TEST_USER.email}\n`);
    
    const results = [];
    
    results.push(await testUserRegistration());
    results.push(await testUserLogin());
    results.push(await testUserProfile());
    results.push(await testAdminLogin());
    results.push(await testAdminStats());
    results.push(await testAdminUsers());
    results.push(await testUserApproval());
    results.push(await testUserReloginAfterApproval());
    results.push(await testSurveyThemes());
    results.push(await testStartSurvey());
    results.push(await testAdminSettings());
    
    // Résumé
    const passed = results.filter(r => r).length;
    const total = results.length;
    
    console.log('\n📊 === RÉSUMÉ DES TESTS ===');
    console.log(`✅ Tests réussis: ${passed}/${total}`);
    console.log(`❌ Tests échoués: ${total - passed}/${total}`);
    
    if (passed === total) {
        console.log('\n🎉 Tous les tests sont passés ! L\'application fonctionne correctement.');
    } else {
        console.log('\n⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.');
    }
    
    console.log('\n💡 Prochaines étapes:');
    console.log('1. Testez l\'interface web manuellement');
    console.log('2. Vérifiez les notifications dans l\'interface admin');
    console.log('3. Testez le cycle complet utilisateur → admin → approbation');
}

// Lancer tous les tests
runAllTests().catch(error => {
    console.error('❌ Erreur lors de l\'exécution des tests:', error);
});
