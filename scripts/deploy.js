const fs = require('fs');
const path = require('path');

console.log('🚀 Script de préparation au déploiement GeoPoll\n');

// Vérifications pré-déploiement
function checkPreDeployment() {
    console.log('📋 Vérifications pré-déploiement...\n');
    
    const checks = [
        {
            name: 'Fichier package.json',
            check: () => fs.existsSync('package.json'),
            fix: 'Assurez-vous que package.json existe'
        },
        {
            name: 'Variables d\'environnement',
            check: () => fs.existsSync('.env'),
            fix: 'Copiez .env.example vers .env et configurez les variables'
        },
        {
            name: 'Base de données',
            check: () => fs.existsSync('database/geopoll.db'),
            fix: 'Exécutez: npm run init-db'
        },
        {
            name: 'Dossier public',
            check: () => fs.existsSync('public'),
            fix: 'Assurez-vous que le dossier public existe'
        },
        {
            name: 'Routes API',
            check: () => fs.existsSync('routes'),
            fix: 'Assurez-vous que le dossier routes existe'
        }
    ];
    
    let allPassed = true;
    
    checks.forEach(check => {
        const passed = check.check();
        console.log(`${passed ? '✅' : '❌'} ${check.name}`);
        if (!passed) {
            console.log(`   💡 ${check.fix}`);
            allPassed = false;
        }
    });
    
    console.log();
    return allPassed;
}

// Générer les instructions de déploiement
function generateDeploymentInstructions() {
    console.log('📝 Instructions de déploiement\n');
    
    console.log('🔧 RAILWAY (Recommandé)');
    console.log('1. Créer un compte sur railway.app');
    console.log('2. Connecter votre repository GitHub');
    console.log('3. Déployer avec les variables d\'environnement :');
    console.log('   - NODE_ENV=production');
    console.log('   - JWT_SECRET=your_secure_secret');
    console.log('   - REWARD_AMOUNT=22500');
    console.log('   - PORT=3000');
    console.log();
    
    console.log('🔧 RENDER');
    console.log('1. Créer un compte sur render.com');
    console.log('2. Créer un nouveau Web Service');
    console.log('3. Connecter votre repository');
    console.log('4. Configurer :');
    console.log('   - Build Command: npm install');
    console.log('   - Start Command: npm start');
    console.log('   - Environment: Node');
    console.log();
    
    console.log('🔧 VERCEL (Frontend uniquement)');
    console.log('1. npm install -g vercel');
    console.log('2. vercel --prod');
    console.log('3. Configurer les variables d\'environnement');
    console.log();
}

// Optimisations pour la production
function optimizeForProduction() {
    console.log('⚡ Optimisations pour la production\n');
    
    // Vérifier NODE_ENV
    const envContent = fs.readFileSync('.env', 'utf8');
    if (!envContent.includes('NODE_ENV=production')) {
        console.log('⚠️  Pensez à définir NODE_ENV=production');
    }
    
    // Vérifier JWT_SECRET
    if (envContent.includes('your_super_secret_jwt_key_here_change_in_production')) {
        console.log('⚠️  Changez JWT_SECRET pour la production !');
    }
    
    console.log('✅ Vérifications terminées');
    console.log();
}

// Créer un fichier de configuration pour Railway
function createRailwayConfig() {
    const railwayConfig = {
        "build": {
            "builder": "NIXPACKS"
        },
        "deploy": {
            "startCommand": "npm start",
            "healthcheckPath": "/",
            "healthcheckTimeout": 100,
            "restartPolicyType": "ON_FAILURE",
            "restartPolicyMaxRetries": 10
        }
    };
    
    fs.writeFileSync('railway.json', JSON.stringify(railwayConfig, null, 2));
    console.log('✅ Fichier railway.json créé');
}

// Créer un Procfile pour Heroku
function createProcfile() {
    const procfileContent = 'web: npm start\n';
    fs.writeFileSync('Procfile', procfileContent);
    console.log('✅ Procfile créé pour Heroku');
}

// Créer un fichier vercel.json
function createVercelConfig() {
    const vercelConfig = {
        "version": 2,
        "builds": [
            {
                "src": "server.js",
                "use": "@vercel/node"
            },
            {
                "src": "public/**/*",
                "use": "@vercel/static"
            }
        ],
        "routes": [
            {
                "src": "/api/(.*)",
                "dest": "/server.js"
            },
            {
                "src": "/(.*)",
                "dest": "/public/$1"
            }
        ],
        "env": {
            "NODE_ENV": "production"
        }
    };
    
    fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
    console.log('✅ Fichier vercel.json créé');
}

// Créer un script de post-déploiement
function createPostDeployScript() {
    const postDeployScript = `#!/bin/bash
echo "🚀 Post-déploiement GeoPoll"

# Initialiser la base de données si elle n'existe pas
if [ ! -f "database/geopoll.db" ]; then
    echo "📊 Initialisation de la base de données..."
    npm run init-db
fi

echo "✅ Post-déploiement terminé"
`;
    
    fs.writeFileSync('scripts/post-deploy.sh', postDeployScript);
    console.log('✅ Script post-deploy.sh créé');
}

// Fonction principale
function main() {
    console.log('🎯 Préparation du déploiement GeoPoll\n');
    
    // Vérifications
    const checksPass = checkPreDeployment();
    
    if (!checksPass) {
        console.log('❌ Certaines vérifications ont échoué. Corrigez les problèmes avant de continuer.\n');
        return;
    }
    
    // Optimisations
    optimizeForProduction();
    
    // Créer les fichiers de configuration
    console.log('📁 Création des fichiers de configuration...\n');
    createRailwayConfig();
    createProcfile();
    createVercelConfig();
    createPostDeployScript();
    
    console.log();
    
    // Instructions
    generateDeploymentInstructions();
    
    console.log('🎉 Préparation terminée !\n');
    console.log('📋 Prochaines étapes :');
    console.log('1. Commitez tous les fichiers');
    console.log('2. Poussez vers votre repository');
    console.log('3. Déployez sur la plateforme de votre choix');
    console.log('4. Configurez les variables d\'environnement');
    console.log('5. Testez votre application déployée');
    console.log();
    console.log('🔗 Liens utiles :');
    console.log('- Railway: https://railway.app');
    console.log('- Render: https://render.com');
    console.log('- Vercel: https://vercel.com');
    console.log();
    console.log('💡 Conseil : Commencez par Railway pour un déploiement fullstack facile !');
}

// Exécuter le script
if (require.main === module) {
    main();
}

module.exports = {
    checkPreDeployment,
    optimizeForProduction,
    createRailwayConfig,
    createProcfile,
    createVercelConfig
};
