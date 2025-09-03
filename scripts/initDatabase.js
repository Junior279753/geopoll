const db = require('../models/database');

async function initializeDatabase() {
    try {
        console.log('🚀 Initialisation de la base de données...');

        // Attendre que les tables soient créées
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

        console.log('📝 Insertion des thèmes...');
        for (const theme of themes) {
            await db.run(
                'INSERT OR IGNORE INTO survey_themes (name, description) VALUES (?, ?)',
                [theme.name, theme.description]
            );
        }

        // Insérer des questions pour le thème "Culture générale" (ID: 1)
        const cultureQuestions = [
            {
                question: "Quelle est la capitale de l'Australie ?",
                options: ["Sydney", "Melbourne", "Canberra", "Perth"],
                correct: "C"
            },
            {
                question: "Qui a peint la Joconde ?",
                options: ["Pablo Picasso", "Leonardo da Vinci", "Vincent van Gogh", "Claude Monet"],
                correct: "B"
            },
            {
                question: "Quel est le plus grand océan du monde ?",
                options: ["Océan Atlantique", "Océan Indien", "Océan Arctique", "Océan Pacifique"],
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
                options: ["Anglais", "Espagnol", "Chinois mandarin", "Hindi"],
                correct: "C"
            },
            {
                question: "Quel pays a inventé le papier ?",
                options: ["Égypte", "Grèce", "Chine", "Inde"],
                correct: "C"
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

        console.log('❓ Insertion des questions de culture générale...');
        for (let i = 0; i < cultureQuestions.length; i++) {
            const q = cultureQuestions[i];
            await db.run(
                `INSERT OR IGNORE INTO questions 
                (theme_id, question_text, option_a, option_b, option_c, option_d, correct_answer, question_order) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [1, q.question, q.options[0], q.options[1], q.options[2], q.options[3], q.correct, i + 1]
            );
        }

        // Insérer des questions pour le thème "Technologie et innovation" (ID: 2)
        const techQuestions = [
            {
                question: "Qui a fondé Microsoft ?",
                options: ["Steve Jobs", "Bill Gates", "Mark Zuckerberg", "Larry Page"],
                correct: "B"
            },
            {
                question: "Que signifie 'AI' en informatique ?",
                options: ["Advanced Internet", "Artificial Intelligence", "Automated Interface", "Application Integration"],
                correct: "B"
            },
            {
                question: "Quelle entreprise a créé l'iPhone ?",
                options: ["Samsung", "Google", "Apple", "Nokia"],
                correct: "C"
            },
            {
                question: "Qu'est-ce que la blockchain ?",
                options: ["Un type de virus", "Une technologie de base de données", "Un langage de programmation", "Un réseau social"],
                correct: "B"
            },
            {
                question: "Quel langage de programmation est principalement utilisé pour le développement web frontend ?",
                options: ["Python", "Java", "JavaScript", "C++"],
                correct: "C"
            },
            {
                question: "Que signifie 'IoT' ?",
                options: ["Internet of Things", "Input Output Technology", "Integrated Online Tools", "International Online Trading"],
                correct: "A"
            },
            {
                question: "Quelle entreprise a développé Android ?",
                options: ["Apple", "Microsoft", "Google", "Samsung"],
                correct: "C"
            },
            {
                question: "Qu'est-ce que le cloud computing ?",
                options: ["Stockage local", "Calcul météorologique", "Services informatiques via internet", "Programmation en nuage"],
                correct: "C"
            },
            {
                question: "Combien de bits y a-t-il dans un octet ?",
                options: ["4", "8", "16", "32"],
                correct: "B"
            },
            {
                question: "Quel protocole est utilisé pour sécuriser les communications web ?",
                options: ["HTTP", "HTTPS", "FTP", "SMTP"],
                correct: "B"
            }
        ];

        console.log('💻 Insertion des questions de technologie...');
        for (let i = 0; i < techQuestions.length; i++) {
            const q = techQuestions[i];
            await db.run(
                `INSERT OR IGNORE INTO questions 
                (theme_id, question_text, option_a, option_b, option_c, option_d, correct_answer, question_order) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [2, q.question, q.options[0], q.options[1], q.options[2], q.options[3], q.correct, i + 1]
            );
        }

        console.log('✅ Base de données initialisée avec succès !');
        console.log('📊 Données insérées :');
        console.log('   - 5 thèmes de sondage');
        console.log('   - 20 questions (10 par thème pour les 2 premiers thèmes)');
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation :', error);
    }
}

// Exécuter l'initialisation si le script est appelé directement
if (require.main === module) {
    initializeDatabase().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error(error);
        process.exit(1);
    });
}

module.exports = initializeDatabase;
