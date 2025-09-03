const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
    constructor() {
        this.dbPath = process.env.DB_PATH || path.join(__dirname, '../database/geopoll.db');
        this.db = null;
        this.init();
    }

    init() {
        // Créer le dossier database s'il n'existe pas
        const dbDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Erreur lors de la connexion à la base de données:', err.message);
            } else {
                console.log('✅ Connexion à la base de données SQLite établie');
                this.createTables();
            }
        });

        // Activer les clés étrangères
        this.db.run('PRAGMA foreign_keys = ON');
    }

    createTables() {
        const tables = [
            // Table des utilisateurs
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                phone TEXT,
                country TEXT,
                country_code TEXT,
                postal_code TEXT,
                profession TEXT,
                is_active BOOLEAN DEFAULT 0,
                is_admin BOOLEAN DEFAULT 0,
                email_verified BOOLEAN DEFAULT 0,
                admin_approved BOOLEAN DEFAULT 0,
                approved_by INTEGER,
                approved_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                balance DECIMAL(10,2) DEFAULT 0.00,
                unique_id TEXT UNIQUE,
                account_monetized BOOLEAN DEFAULT 0
            )`,

            // Table des abonnements
            `CREATE TABLE IF NOT EXISTS subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('monthly', 'yearly', 'lifetime')),
                status TEXT NOT NULL CHECK(status IN ('active', 'expired', 'cancelled')),
                start_date DATETIME NOT NULL,
                end_date DATETIME,
                amount DECIMAL(10,2) NOT NULL,
                payment_method TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Table des moyens de paiement
            `CREATE TABLE IF NOT EXISTS payment_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('mtn_momo', 'moov_money', 'paypal', 'bank_account')),
                account_number TEXT NOT NULL,
                account_name TEXT,
                is_default BOOLEAN DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Table des thèmes de sondage
            `CREATE TABLE IF NOT EXISTS survey_themes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

            // Table des questions
            `CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                theme_id INTEGER NOT NULL,
                question_text TEXT NOT NULL,
                option_a TEXT NOT NULL,
                option_b TEXT NOT NULL,
                option_c TEXT NOT NULL,
                option_d TEXT NOT NULL,
                correct_answer TEXT NOT NULL CHECK(correct_answer IN ('A', 'B', 'C', 'D')),
                question_order INTEGER NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (theme_id) REFERENCES survey_themes (id) ON DELETE CASCADE
            )`,

            // Table des tentatives de sondage
            `CREATE TABLE IF NOT EXISTS survey_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                theme_id INTEGER NOT NULL,
                score INTEGER NOT NULL DEFAULT 0,
                total_questions INTEGER NOT NULL DEFAULT 10,
                is_completed BOOLEAN DEFAULT 0,
                is_passed BOOLEAN DEFAULT 0,
                reward_amount DECIMAL(10,2) DEFAULT 0.00,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (theme_id) REFERENCES survey_themes (id) ON DELETE CASCADE
            )`,

            // Table des réponses utilisateur
            `CREATE TABLE IF NOT EXISTS user_answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                attempt_id INTEGER NOT NULL,
                question_id INTEGER NOT NULL,
                user_answer TEXT NOT NULL CHECK(user_answer IN ('A', 'B', 'C', 'D')),
                is_correct BOOLEAN NOT NULL,
                answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (attempt_id) REFERENCES survey_attempts (id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
            )`,

            // Table des transactions
            `CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('reward', 'withdrawal', 'subscription')),
                amount DECIMAL(10,2) NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
                payment_method_id INTEGER,
                reference TEXT UNIQUE,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                processed_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (payment_method_id) REFERENCES payment_methods (id)
            )`,

            // Table des sessions utilisateur (pour la sécurité)
            `CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,

            // Table des logs d'activité (anti-fraude)
            `CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                ip_address TEXT,
                user_agent TEXT,
                details TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )`
        ];

        tables.forEach((tableSQL, index) => {
            this.db.run(tableSQL, (err) => {
                if (err) {
                    console.error(`❌ Erreur lors de la création de la table ${index + 1}:`, err.message);
                } else {
                    console.log(`✅ Table ${index + 1} créée avec succès`);
                }
            });
        });
    }

    // Méthode pour exécuter des requêtes
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, changes: this.changes });
                }
            });
        });
    }

    // Méthode pour récupérer une ligne
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Méthode pour récupérer plusieurs lignes
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Fermer la connexion
    close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('🔒 Connexion à la base de données fermée');
                    resolve();
                }
            });
        });
    }
}

module.exports = new Database();
