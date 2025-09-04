require('dotenv').config();
const bcrypt = require('bcryptjs');
const DatabaseFactory = require('../models/databaseFactory');

async function resetAdminPassword() {
    try {
        console.log('🔐 Réinitialisation du mot de passe admin...');

        const db = DatabaseFactory.create();
        
        // Nouveau mot de passe
        const newPassword = 'admin123';
        const saltRounds = 12;
        
        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Mettre à jour le mot de passe admin
        await db.update('users', {
            password_hash: hashedPassword
        }, {
            email: 'admin@geopoll.com',
            is_admin: true
        });
        
        console.log('✅ Mot de passe admin réinitialisé avec succès !');
        console.log('📧 Email: admin@geopoll.com');
        console.log('🔑 Mot de passe: admin123');
        
    } catch (error) {
        console.error('❌ Erreur lors de la réinitialisation:', error);
    }
}

resetAdminPassword();
