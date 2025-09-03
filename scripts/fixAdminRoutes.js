const fs = require('fs');
const path = require('path');

// Script pour corriger rapidement les routes admin
function fixAdminRoutes() {
    const adminRoutesPath = path.join(__dirname, '../routes/admin.js');
    let content = fs.readFileSync(adminRoutesPath, 'utf8');
    
    // Remplacer toutes les occurrences de "await db." par "await db." avec DatabaseFactory
    const lines = content.split('\n');
    const fixedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Si la ligne contient "await db." et qu'il n'y a pas déjà "const db = DatabaseFactory.create()" dans la fonction
        if (line.includes('await db.') && !line.includes('DatabaseFactory')) {
            // Chercher le début de la fonction
            let functionStart = i;
            while (functionStart > 0 && !lines[functionStart].includes('async (req, res)')) {
                functionStart--;
            }
            
            // Vérifier si DatabaseFactory.create() est déjà présent dans cette fonction
            let hasDbFactory = false;
            for (let j = functionStart; j <= i; j++) {
                if (lines[j].includes('const db = DatabaseFactory.create()')) {
                    hasDbFactory = true;
                    break;
                }
            }
            
            // Si pas de DatabaseFactory, l'ajouter
            if (!hasDbFactory) {
                // Trouver la ligne après "try {"
                let tryLine = functionStart;
                while (tryLine < i && !lines[tryLine].trim().includes('try {')) {
                    tryLine++;
                }
                
                if (tryLine < i) {
                    // Insérer la ligne DatabaseFactory après "try {"
                    fixedLines.push(lines[tryLine]);
                    fixedLines.push('        const db = DatabaseFactory.create();');
                    fixedLines.push('');
                    continue;
                }
            }
        }
        
        fixedLines.push(line);
    }
    
    // Écrire le fichier corrigé
    fs.writeFileSync(adminRoutesPath, fixedLines.join('\n'));
    console.log('✅ Routes admin corrigées');
}

if (require.main === module) {
    fixAdminRoutes();
}

module.exports = fixAdminRoutes;
