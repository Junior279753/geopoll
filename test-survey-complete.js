const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USER = {
    email: `survey.test.${Date.now()}@geopoll.test`,
    password: 'Test123!',
    firstName: 'Survey',
    lastName: 'Tester',
    phone: '+225123456789',
    country: 'Côte d\'Ivoire',
    countryCode: 'CI',
    profession: 'employe'
};

const ADMIN_USER = {
    email: 'admin@geopoll.ci',
    password: 'admin123'
};

let userToken = null;
let adminToken = null;
let attemptId = null;

console.log('🧪 === TEST COMPLET DU SYSTÈME DE SONDAGE ===\n');

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

// Étape 1: Créer et approuver un utilisateur
async function setupUser() {
    console.log('1️⃣ Configuration utilisateur...');
    
    // Inscription
    const registerResponse = await makeRequest('POST', '/api/auth/register', TEST_USER);
    if (registerResponse.statusCode !== 201) {
        throw new Error('Échec inscription');
    }
    console.log('✅ Inscription réussie');
    
    // Connexion admin
    const adminLoginResponse = await makeRequest('POST', '/api/auth/login', ADMIN_USER);
    if (adminLoginResponse.statusCode !== 200) {
        throw new Error('Échec connexion admin');
    }
    adminToken = adminLoginResponse.body.token;
    console.log('✅ Connexion admin réussie');
    
    // Obtenir l'ID utilisateur
    const usersResponse = await makeRequest('GET', '/api/admin/users', null, adminToken);
    const testUser = usersResponse.body.users.find(u => u.email === TEST_USER.email);
    
    // Approuver l'utilisateur
    await makeRequest('POST', `/api/admin/users/${testUser.id}/approve`, null, adminToken);
    console.log('✅ Utilisateur approuvé');
    
    // Connexion utilisateur
    const userLoginResponse = await makeRequest('POST', '/api/auth/login', TEST_USER);
    if (userLoginResponse.statusCode !== 200) {
        throw new Error('Échec connexion utilisateur');
    }
    userToken = userLoginResponse.body.token;
    console.log('✅ Connexion utilisateur réussie');
}

// Étape 2: Démarrer un sondage
async function startSurvey() {
    console.log('\n2️⃣ Démarrage du sondage...');
    
    const response = await makeRequest('POST', '/api/surveys/themes/1/start', null, userToken);
    if (response.statusCode !== 200) {
        throw new Error('Échec démarrage sondage');
    }
    
    attemptId = response.body.attemptId;
    console.log('✅ Sondage démarré');
    console.log(`   ID tentative: ${attemptId}`);
    console.log(`   Thème: ${response.body.theme.name}`);
    console.log(`   Questions: ${response.body.questions.length}`);
    
    return response.body.questions;
}

// Étape 3: Répondre aux questions
async function answerQuestions(questions) {
    console.log('\n3️⃣ Réponse aux questions...');
    
    // Réponses correctes pour les 10 premières questions de culture générale
    const correctAnswers = ['C', 'B', 'D', 'B', 'B', 'C', 'C', 'C', 'B', 'A'];
    
    for (let i = 0; i < Math.min(10, questions.length); i++) {
        const question = questions[i];
        const answer = correctAnswers[i];
        
        const response = await makeRequest('POST', `/api/surveys/attempts/${attemptId}/answer`, {
            questionId: question.id,
            answer: answer
        }, userToken);
        
        if (response.statusCode === 200) {
            console.log(`✅ Question ${i + 1}: ${response.body.isCorrect ? 'Correcte' : 'Incorrecte'}`);
        } else {
            console.log(`❌ Erreur question ${i + 1}:`, response.body);
        }
    }
    
    console.log('✅ Toutes les questions répondues');
}

// Étape 4: Finaliser le sondage
async function completeSurvey() {
    console.log('\n4️⃣ Finalisation du sondage...');
    
    const response = await makeRequest('POST', `/api/surveys/attempts/${attemptId}/complete`, null, userToken);
    if (response.statusCode !== 200) {
        throw new Error('Échec finalisation sondage');
    }
    
    console.log('✅ Sondage finalisé');
    console.log(`   Score: ${response.body.result.score}/${response.body.result.totalQuestions}`);
    console.log(`   Réussi: ${response.body.result.isPassed ? 'Oui' : 'Non'}`);
    console.log(`   Récompense: ${response.body.result.rewardAmount} FCFA`);
    console.log(`   Taux de réussite: ${response.body.result.successRate}%`);
    
    return response.body.result;
}

// Étape 5: Vérifier le solde utilisateur
async function checkUserBalance() {
    console.log('\n5️⃣ Vérification du solde...');
    
    const response = await makeRequest('GET', '/api/auth/profile', null, userToken);
    if (response.statusCode !== 200) {
        throw new Error('Échec récupération profil');
    }
    
    console.log('✅ Solde vérifié');
    console.log(`   Solde actuel: ${response.body.user.balance} FCFA`);
    console.log(`   Tentatives totales: ${response.body.stats.totalAttempts}`);
    console.log(`   Tentatives réussies: ${response.body.stats.passedAttempts}`);
    console.log(`   Gains totaux: ${response.body.stats.totalEarnings} FCFA`);
    
    return response.body.user.balance;
}

// Test principal
async function runCompleteTest() {
    try {
        await setupUser();
        const questions = await startSurvey();
        await answerQuestions(questions);
        const result = await completeSurvey();
        const balance = await checkUserBalance();
        
        console.log('\n🎉 === TEST COMPLET RÉUSSI ===');
        console.log(`✅ Utilisateur créé et approuvé`);
        console.log(`✅ Sondage démarré et complété`);
        console.log(`✅ Score obtenu: ${result.score}/10`);
        console.log(`✅ Récompense: ${result.rewardAmount} FCFA`);
        console.log(`✅ Solde final: ${balance} FCFA`);
        
        if (result.isPassed) {
            console.log('\n🏆 L\'utilisateur a réussi le sondage et reçu sa récompense !');
        } else {
            console.log('\n📚 L\'utilisateur n\'a pas réussi le sondage, aucune récompense.');
        }
        
    } catch (error) {
        console.error('\n❌ Erreur lors du test:', error.message);
    }
}

// Lancer le test
runCompleteTest();
