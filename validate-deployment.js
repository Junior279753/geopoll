const fs = require('fs');
const path = require('path');

console.log('🔍 === VALIDATION FINALE POUR LE DÉPLOIEMENT ===\n');

// Vérifications des fichiers requis
function checkRequiredFiles() {
    console.log('📁 Vérification des fichiers requis...\n');
    
    const requiredFiles = [
        { file: 'package.json', description: 'Configuration npm' },
        { file: 'server.js', description: 'Serveur principal' },
        { file: 'vercel.json', description: 'Configuration Vercel' },
        { file: 'railway.json', description: 'Configuration Railway' },
        { file: 'Procfile', description: 'Configuration Heroku' },
        { file: '.env.example', description: 'Variables d\'environnement exemple' },
        { file: 'DEPLOYMENT.md', description: 'Guide de déploiement' },
        { file: 'RAPPORT_TESTS.md', description: 'Rapport de tests' }
    ];
    
    let allPresent = true;
    
    requiredFiles.forEach(({ file, description }) => {
        const exists = fs.existsSync(file);
        console.log(`${exists ? '✅' : '❌'} ${file} - ${description}`);
        if (!exists) allPresent = false;
    });
    
    console.log();
    return allPresent;
}

// Vérification de la structure des dossiers
function checkDirectoryStructure() {
    console.log('📂 Vérification de la structure des dossiers...\n');
    
    const requiredDirs = [
        { dir: 'public', description: 'Fichiers statiques' },
        { dir: 'routes', description: 'Routes API' },
        { dir: 'models', description: 'Modèles de données' },
        { dir: 'middleware', description: 'Middleware' },
        { dir: 'scripts', description: 'Scripts utilitaires' },
        { dir: 'database', description: 'Base de données' }
    ];
    
    let allPresent = true;
    
    requiredDirs.forEach(({ dir, description }) => {
        const exists = fs.existsSync(dir);
        console.log(`${exists ? '✅' : '❌'} ${dir}/ - ${description}`);
        if (!exists) allPresent = false;
    });
    
    console.log();
    return allPresent;
}

// Vérification du package.json
function checkPackageJson() {
    console.log('📦 Vérification du package.json...\n');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        
        const checks = [
            { key: 'name', expected: 'geopoll', description: 'Nom du projet' },
            { key: 'main', expected: 'server.js', description: 'Point d\'entrée' },
            { key: 'scripts.start', expected: 'node server.js', description: 'Script de démarrage' },
            { key: 'scripts.init-db', exists: true, description: 'Script d\'initialisation DB' }
        ];
        
        let allValid = true;
        
        checks.forEach(({ key, expected, exists, description }) => {
            const keys = key.split('.');
            let value = packageJson;
            
            for (const k of keys) {
                value = value?.[k];
            }
            
            let isValid;
            if (exists) {
                isValid = value !== undefined;
            } else {
                isValid = value === expected;
            }
            
            console.log(`${isValid ? '✅' : '❌'} ${description}: ${value || 'Non défini'}`);
            if (!isValid) allValid = false;
        });
        
        console.log();
        return allValid;
    } catch (error) {
        console.log('❌ Erreur lors de la lecture du package.json:', error.message);
        return false;
    }
}

// Vérification des dépendances critiques
function checkDependencies() {
    console.log('🔗 Vérification des dépendances critiques...\n');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        
        const criticalDeps = [
            'express',
            'sqlite3',
            'bcryptjs',
            'jsonwebtoken',
            'helmet',
            'cors',
            'express-rate-limit'
        ];
        
        let allPresent = true;
        
        criticalDeps.forEach(dep => {
            const exists = deps[dep] !== undefined;
            console.log(`${exists ? '✅' : '❌'} ${dep}: ${deps[dep] || 'Non installé'}`);
            if (!exists) allPresent = false;
        });
        
        console.log();
        return allPresent;
    } catch (error) {
        console.log('❌ Erreur lors de la vérification des dépendances:', error.message);
        return false;
    }
}

// Vérification de la base de données
function checkDatabase() {
    console.log('🗄️ Vérification de la base de données...\n');
    
    const dbPath = 'database/geopoll.db';
    const dbExists = fs.existsSync(dbPath);
    
    console.log(`${dbExists ? '✅' : '⚠️'} Base de données: ${dbExists ? 'Présente' : 'Sera créée au démarrage'}`);
    
    // Vérifier le script d'initialisation
    const initScript = fs.existsSync('scripts/initDatabase.js');
    console.log(`${initScript ? '✅' : '❌'} Script d'initialisation: ${initScript ? 'Présent' : 'Manquant'}`);
    
    console.log();
    return initScript; // La DB peut ne pas exister, mais le script doit être là
}

// Vérification des configurations de déploiement
function checkDeploymentConfigs() {
    console.log('🚀 Vérification des configurations de déploiement...\n');
    
    const configs = [
        { file: 'vercel.json', platform: 'Vercel' },
        { file: 'railway.json', platform: 'Railway' },
        { file: 'Procfile', platform: 'Heroku' }
    ];
    
    let validConfigs = 0;
    
    configs.forEach(({ file, platform }) => {
        const exists = fs.existsSync(file);
        console.log(`${exists ? '✅' : '❌'} ${platform}: ${exists ? 'Configuré' : 'Non configuré'}`);
        if (exists) validConfigs++;
    });
    
    console.log();
    return validConfigs > 0;
}

// Fonction principale de validation
function validateDeployment() {
    const checks = [
        { name: 'Fichiers requis', fn: checkRequiredFiles },
        { name: 'Structure des dossiers', fn: checkDirectoryStructure },
        { name: 'Package.json', fn: checkPackageJson },
        { name: 'Dépendances', fn: checkDependencies },
        { name: 'Base de données', fn: checkDatabase },
        { name: 'Configurations de déploiement', fn: checkDeploymentConfigs }
    ];
    
    let passedChecks = 0;
    const totalChecks = checks.length;
    
    checks.forEach(({ name, fn }) => {
        const result = fn();
        if (result) passedChecks++;
    });
    
    // Résumé final
    console.log('📊 === RÉSUMÉ DE LA VALIDATION ===\n');
    console.log(`✅ Vérifications réussies: ${passedChecks}/${totalChecks}`);
    console.log(`❌ Vérifications échouées: ${totalChecks - passedChecks}/${totalChecks}`);
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 VALIDATION RÉUSSIE !');
        console.log('✅ Le projet est prêt pour le déploiement');
        console.log('\n📋 Prochaines étapes:');
        console.log('1. Choisir une plateforme de déploiement (Railway recommandé)');
        console.log('2. Configurer les variables d\'environnement');
        console.log('3. Déployer l\'application');
        console.log('4. Tester l\'application déployée');
        console.log('\n📖 Consultez DEPLOYMENT.md pour les instructions détaillées');
    } else {
        console.log('\n⚠️ VALIDATION INCOMPLÈTE');
        console.log('❌ Certaines vérifications ont échoué');
        console.log('🔧 Corrigez les problèmes avant le déploiement');
    }
    
    return passedChecks === totalChecks;
}

// Exécuter la validation
if (require.main === module) {
    validateDeployment();
}

module.exports = { validateDeployment };
