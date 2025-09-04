require('dotenv').config();
const bcrypt = require('bcryptjs');
const DatabaseFactory = require('../models/databaseFactory');

async function createAdmins() {
    try {
        console.log('👥 Création de 3 comptes administrateurs...');

        const db = DatabaseFactory.create();
        
        const admins = [
            {
                email: 'admin1@geopoll.com',
                password: 'admin123',
                firstName: 'Admin',
                lastName: 'Principal',
                phone: '+22501234567'
            },
            {
                email: 'admin2@geopoll.com',
                password: 'admin123',
                firstName: 'Admin',
                lastName: 'Secondaire',
                phone: '+22501234568'
            },
            {
                email: 'admin3@geopoll.com',
                password: 'admin123',
                firstName: 'Admin',
                lastName: 'Support',
                phone: '+22501234569'
            }
        ];

        const saltRounds = 12;

        for (const admin of admins) {
            try {
                // Vérifier si l'admin existe déjà
                const existingAdmin = await db.get('users', { email: admin.email });
                
                if (existingAdmin) {
                    console.log(`⚠️  Admin ${admin.email} existe déjà, mise à jour du mot de passe...`);
                    
                    // Mettre à jour le mot de passe
                    const hashedPassword = await bcrypt.hash(admin.password, saltRounds);
                    await db.update('users', {
                        password_hash: hashedPassword
                    }, { email: admin.email });
                    
                } else {
                    console.log(`➕ Création de l'admin ${admin.email}...`);
                    
                    // Hasher le mot de passe
                    const hashedPassword = await bcrypt.hash(admin.password, saltRounds);
                    
                    // Créer le nouvel admin
                    await db.insert('users', {
                        email: admin.email,
                        password_hash: hashedPassword,
                        first_name: admin.firstName,
                        last_name: admin.lastName,
                        phone: admin.phone,
                        country: 'CI',
                        country_code: 'CI',
                        profession: 'admin',
                        is_active: true,
                        is_admin: true,
                        email_verified: true,
                        admin_approved: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                }
                
                console.log(`✅ Admin ${admin.email} configuré avec succès`);
                
            } catch (error) {
                console.error(`❌ Erreur pour ${admin.email}:`, error.message);
            }
        }
        
        console.log('\n📋 Récapitulatif des comptes administrateurs :');
        console.log('==========================================');
        
        for (const admin of admins) {
            console.log(`📧 Email: ${admin.email}`);
            console.log(`🔑 Mot de passe: ${admin.password}`);
            console.log(`👤 Nom: ${admin.firstName} ${admin.lastName}`);
            console.log('---');
        }
        
        console.log('\n🎉 Tous les administrateurs ont été créés avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors de la création des admins:', error);
    }
}

createAdmins();
