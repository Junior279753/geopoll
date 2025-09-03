const db = require('./database');
const bcrypt = require('bcryptjs');

class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.uniqueId = data.unique_id;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.phone = data.phone;
        this.country = data.country;
        this.countryCode = data.country_code;
        this.postalCode = data.postal_code;
        this.profession = data.profession;
        this.isActive = data.is_active;
        this.isAdmin = data.is_admin;
        this.emailVerified = data.email_verified;
        this.adminApproved = data.admin_approved;
        this.approvedBy = data.approved_by;
        this.approvedAt = data.approved_at;
        this.balance = data.balance;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.lastLogin = data.last_login;
        this.accountMonetized = data.account_monetized;
    }

    // Créer un nouvel utilisateur
    static async create(userData) {
        const { email, password, firstName, lastName, phone, country, countryCode, profession } = userData;

        // Vérifier si l'email existe déjà
        const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            throw new Error('Un utilisateur avec cet email existe déjà');
        }

        // Hasher le mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insérer l'utilisateur (non approuvé par défaut)
        const result = await db.run(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, country, country_code, profession, admin_approved, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
            [email, passwordHash, firstName, lastName, phone, country, countryCode, profession]
        );

        return await User.findById(result.id);
    }

    // Trouver un utilisateur par ID
    static async findById(id) {
        const userData = await db.get('SELECT * FROM users WHERE id = ?', [id]);
        return userData ? new User(userData) : null;
    }

    // Trouver un utilisateur par email
    static async findByEmail(email) {
        const userData = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        return userData ? new User(userData) : null;
    }

    // Trouver un utilisateur par ID unique
    static async findByUniqueId(uniqueId) {
        const userData = await db.get('SELECT * FROM users WHERE unique_id = ?', [uniqueId]);
        return userData ? new User(userData) : null;
    }

    // Trouver un utilisateur par email ou ID unique
    static async findByEmailOrUniqueId(identifier) {
        // D'abord essayer par email
        let userData = await db.get('SELECT * FROM users WHERE email = ?', [identifier]);

        // Si pas trouvé, essayer par ID unique
        if (!userData) {
            userData = await db.get('SELECT * FROM users WHERE unique_id = ?', [identifier]);
        }

        return userData ? new User(userData) : null;
    }

    // Vérifier le mot de passe
    async verifyPassword(password) {
        const userData = await db.get('SELECT password_hash FROM users WHERE id = ?', [this.id]);
        return await bcrypt.compare(password, userData.password_hash);
    }

    // Mettre à jour la dernière connexion
    async updateLastLogin() {
        await db.run(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
            [this.id]
        );
        this.lastLogin = new Date().toISOString();
    }

    // Mettre à jour le solde
    async updateBalance(amount) {
        await db.run(
            'UPDATE users SET balance = balance + ? WHERE id = ?',
            [amount, this.id]
        );
        this.balance = parseFloat(this.balance) + parseFloat(amount);
    }

    // Vérifier si l'utilisateur a un abonnement actif
    async hasActiveSubscription() {
        const subscription = await db.get(
            `SELECT * FROM subscriptions 
             WHERE user_id = ? AND status = 'active' AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)`,
            [this.id]
        );
        return !!subscription;
    }

    // Obtenir l'historique des tentatives de sondage
    async getSurveyHistory() {
        return await db.all(
            `SELECT sa.*, st.name as theme_name 
             FROM survey_attempts sa
             JOIN survey_themes st ON sa.theme_id = st.id
             WHERE sa.user_id = ?
             ORDER BY sa.started_at DESC`,
            [this.id]
        );
    }

    // Obtenir les moyens de paiement
    async getPaymentMethods() {
        return await db.all(
            'SELECT * FROM payment_methods WHERE user_id = ? AND is_active = 1',
            [this.id]
        );
    }

    // Obtenir le moyen de paiement par défaut
    async getDefaultPaymentMethod() {
        return await db.get(
            'SELECT * FROM payment_methods WHERE user_id = ? AND is_default = 1 AND is_active = 1',
            [this.id]
        );
    }

    // Mettre à jour les informations du profil
    async updateProfile(data) {
        const { firstName, lastName, phone, country } = data;
        await db.run(
            `UPDATE users SET 
             first_name = ?, last_name = ?, phone = ?, country = ?, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [firstName, lastName, phone, country, this.id]
        );
        
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.country = country;
        this.updatedAt = new Date().toISOString();
    }

    // Changer le mot de passe
    async changePassword(newPassword) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        await db.run(
            'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [passwordHash, this.id]
        );
    }

    // Désactiver le compte
    async deactivate() {
        await db.run(
            'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [this.id]
        );
        this.isActive = false;
    }

    // Obtenir les statistiques de l'utilisateur
    async getStats() {
        const stats = await db.get(
            `SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) as passed_attempts,
                SUM(reward_amount) as total_earnings
             FROM survey_attempts 
             WHERE user_id = ?`,
            [this.id]
        );
        
        return {
            totalAttempts: stats.total_attempts || 0,
            passedAttempts: stats.passed_attempts || 0,
            totalEarnings: stats.total_earnings || 0,
            successRate: stats.total_attempts > 0 ? (stats.passed_attempts / stats.total_attempts * 100).toFixed(2) : 0
        };
    }

    // Convertir en objet JSON (sans données sensibles)
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            firstName: this.firstName,
            lastName: this.lastName,
            phone: this.phone,
            country: this.country,
            profession: this.profession,
            isActive: this.isActive,
            isAdmin: this.isAdmin,
            emailVerified: this.emailVerified,
            balance: this.balance,
            createdAt: this.createdAt,
            lastLogin: this.lastLogin,
            uniqueId: this.uniqueId,
            adminApproved: this.adminApproved,
            accountMonetized: this.accountMonetized
        };
    }
}

module.exports = User;
