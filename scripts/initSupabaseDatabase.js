require('dotenv').config();
const DatabaseFactory = require('../models/databaseFactory');

async function initializeSupabaseDatabase() {
    try {
        console.log('🚀 Initialisation de la base de données Supabase...');

        const db = DatabaseFactory.create();

        // Vérifier si nous utilisons bien Supabase
        if (!process.env.SUPABASE_URL) {
            throw new Error('Configuration Supabase manquante. Veuillez configurer SUPABASE_URL et SUPABASE_ANON_KEY dans votre fichier .env');
        }

        // Attendre un peu pour s'assurer que la connexion est établie
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Insérer les thèmes de sondage
        const themes = [
            {
                name: 'Culture générale',
                description: 'Questions sur la culture générale mondiale'
            },
            {
                name: 'Technologie et innovation',
                description: 'Questions sur les nouvelles technologies et innovations'
            },
            {
                name: 'Histoire mondiale',
                description: 'Questions sur les événements historiques marquants'
            },
            {
                name: 'Environnement et climat',
                description: 'Questions sur l\'écologie et le changement climatique'
            },
            {
                name: 'Santé et bien-être',
                description: 'Questions sur la santé et le bien-être'
            }
        ];

        console.log('📚 Insertion des thèmes de sondage...');
        for (const theme of themes) {
            try {
                // Vérifier si le thème existe déjà
                const existingTheme = await db.get('survey_themes', { name: theme.name });
                if (!existingTheme) {
                    await db.insert('survey_themes', {
                        ...theme,
                        is_active: true,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });
                    console.log(`✅ Thème "${theme.name}" ajouté`);
                } else {
                    console.log(`⚠️ Thème "${theme.name}" existe déjà`);
                }
            } catch (error) {
                console.error(`❌ Erreur lors de l'insertion du thème "${theme.name}":`, error);
            }
        }

        // Questions de culture générale
        const cultureQuestions = [
            {
                question: "Quelle est la capitale de l'Australie ?",
                options: ["Sydney", "Canberra", "Melbourne", "Perth"],
                correct: "B"
            },
            {
                question: "Qui a peint la Joconde ?",
                options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Claude Monet"],
                correct: "C"
            },
            {
                question: "Quel est le plus grand océan du monde ?",
                options: ["Atlantique", "Indien", "Arctique", "Pacifique"],
                correct: "D"
            },
            {
                question: "En quelle année l'homme a-t-il marché sur la Lune pour la première fois ?",
                options: ["1967", "1969", "1971", "1973"],
                correct: "B"
            },
            {
                question: "Quel est l'élément chimique le plus abondant dans l'univers ?",
                options: ["Oxygène", "Hydrogène", "Carbone", "Hélium"],
                correct: "B"
            },
            {
                question: "Combien de continents y a-t-il sur Terre ?",
                options: ["5", "6", "7", "8"],
                correct: "C"
            },
            {
                question: "Quelle est la langue la plus parlée au monde ?",
                options: ["Anglais", "Espagnol", "Mandarin", "Hindi"],
                correct: "C"
            },
            {
                question: "Quel pays a inventé le papier ?",
                options: ["Égypte", "Chine", "Inde", "Grèce"],
                correct: "B"
            },
            {
                question: "Quelle est la plus haute montagne du monde ?",
                options: ["K2", "Mont Everest", "Kangchenjunga", "Lhotse"],
                correct: "B"
            },
            {
                question: "Combien d'os y a-t-il dans le corps humain adulte ?",
                options: ["206", "208", "210", "212"],
                correct: "A"
            }
        ];

        console.log('🧠 Insertion des questions de culture générale...');
        const cultureTheme = await db.get('survey_themes', { name: 'Culture générale' });
        if (cultureTheme) {
            for (let i = 0; i < cultureQuestions.length; i++) {
                const q = cultureQuestions[i];
                try {
                    // Vérifier si la question existe déjà
                    const existingQuestion = await db.get('questions', { 
                        theme_id: cultureTheme.id, 
                        question_text: q.question 
                    });
                    
                    if (!existingQuestion) {
                        await db.insert('questions', {
                            theme_id: cultureTheme.id,
                            question_text: q.question,
                            option_a: q.options[0],
                            option_b: q.options[1],
                            option_c: q.options[2],
                            option_d: q.options[3],
                            correct_answer: q.correct,
                            question_order: i + 1,
                            is_active: true,
                            created_at: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error(`❌ Erreur lors de l'insertion de la question ${i + 1}:`, error);
                }
            }
        }

        // Questions de technologie
        const techQuestions = [
            {
                question: "Que signifie 'CPU' en informatique ?",
                options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Unit", "Computer Processing Unit"],
                correct: "A"
            },
            {
                question: "Qui a fondé Microsoft ?",
                options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Larry Page"],
                correct: "B"
            },
            {
                question: "Quelle est la résolution 4K ?",
                options: ["1920x1080", "2560x1440", "3840x2160", "4096x2304"],
                correct: "C"
            },
            {
                question: "Que signifie 'AI' en technologie ?",
                options: ["Automatic Intelligence", "Artificial Intelligence", "Advanced Intelligence", "Algorithmic Intelligence"],
                correct: "B"
            },
            {
                question: "Quel langage de programmation est principalement utilisé pour le développement web côté client ?",
                options: ["Python", "Java", "JavaScript", "C++"],
                correct: "C"
            },
            {
                question: "Quelle entreprise a développé le système d'exploitation Android ?",
                options: ["Apple", "Microsoft", "Google", "Samsung"],
                correct: "C"
            },
            {
                question: "Que signifie 'URL' ?",
                options: ["Universal Resource Locator", "Uniform Resource Locator", "Universal Reference Link", "Uniform Reference Locator"],
                correct: "B"
            },
            {
                question: "Combien d'octets y a-t-il dans un kilooctet ?",
                options: ["1000", "1024", "1048", "1056"],
                correct: "B"
            },
            {
                question: "Quel est le nom du fondateur de Tesla ?",
                options: ["Jeff Bezos", "Elon Musk", "Tim Cook", "Sundar Pichai"],
                correct: "B"
            },
            {
                question: "Quel protocole est utilisé pour sécuriser les communications web ?",
                options: ["HTTP", "HTTPS", "FTP", "SMTP"],
                correct: "B"
            }
        ];

        console.log('💻 Insertion des questions de technologie...');
        const techTheme = await db.get('survey_themes', { name: 'Technologie et innovation' });
        if (techTheme) {
            for (let i = 0; i < techQuestions.length; i++) {
                const q = techQuestions[i];
                try {
                    // Vérifier si la question existe déjà
                    const existingQuestion = await db.get('questions', { 
                        theme_id: techTheme.id, 
                        question_text: q.question 
                    });
                    
                    if (!existingQuestion) {
                        await db.insert('questions', {
                            theme_id: techTheme.id,
                            question_text: q.question,
                            option_a: q.options[0],
                            option_b: q.options[1],
                            option_c: q.options[2],
                            option_d: q.options[3],
                            correct_answer: q.correct,
                            question_order: i + 1,
                            is_active: true,
                            created_at: new Date().toISOString()
                        });
                    }
                } catch (error) {
                    console.error(`❌ Erreur lors de l'insertion de la question ${i + 1}:`, error);
                }
            }
        }

        console.log('✅ Base de données Supabase initialisée avec succès !');
        console.log('📊 Données insérées :');
        console.log('   - 5 thèmes de sondage');
        console.log('   - 20 questions (10 par thème pour les 2 premiers thèmes)');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation :', error);
        throw error;
    }
}

// Exécuter l'initialisation si le script est appelé directement
if (require.main === module) {
    initializeSupabaseDatabase().then(() => {
        console.log('🎉 Initialisation terminée avec succès');
        process.exit(0);
    }).catch((error) => {
        console.error('💥 Échec de l\'initialisation:', error);
        process.exit(1);
    });
}

// Fonction pour migrer les données existantes de SQLite vers Supabase
async function migrateFromSQLiteToSupabase() {
    try {
        console.log('🔄 Migration des données de SQLite vers Supabase...');

        // Temporairement forcer l'utilisation de SQLite pour lire les données
        const oldSupabaseUrl = process.env.SUPABASE_URL;
        delete process.env.SUPABASE_URL;

        const SQLiteDatabase = require('../models/database');
        const sqliteDb = new SQLiteDatabase();

        // Restaurer la configuration Supabase
        process.env.SUPABASE_URL = oldSupabaseUrl;
        const supabaseDb = DatabaseFactory.create();

        // Migrer les utilisateurs
        console.log('👥 Migration des utilisateurs...');
        const users = await new Promise((resolve, reject) => {
            sqliteDb.db.all('SELECT * FROM users', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        for (const user of users) {
            try {
                const existingUser = await supabaseDb.get('users', { email: user.email });
                if (!existingUser) {
                    await supabaseDb.insert('users', {
                        email: user.email,
                        password_hash: user.password_hash,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        phone: user.phone,
                        country: user.country,
                        country_code: user.country_code,
                        postal_code: user.postal_code,
                        profession: user.profession,
                        is_active: user.is_active,
                        is_admin: user.is_admin,
                        email_verified: user.email_verified,
                        admin_approved: user.admin_approved,
                        approved_by: user.approved_by,
                        approved_at: user.approved_at,
                        created_at: user.created_at,
                        updated_at: user.updated_at,
                        last_login: user.last_login,
                        balance: user.balance,
                        unique_id: user.unique_id,
                        account_monetized: user.account_monetized
                    });
                    console.log(`✅ Utilisateur ${user.email} migré`);
                }
            } catch (error) {
                console.error(`❌ Erreur migration utilisateur ${user.email}:`, error);
            }
        }

        console.log('✅ Migration terminée avec succès !');
        sqliteDb.close();

    } catch (error) {
        console.error('❌ Erreur lors de la migration :', error);
        throw error;
    }
}

module.exports = { initializeSupabaseDatabase, migrateFromSQLiteToSupabase };
