const DatabaseFactory = require('./databaseFactory');
const bcrypt = require('bcryptjs');

class SupabaseUser {
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
        const db = DatabaseFactory.create();
        const { email, password, firstName, lastName, phone, country, countryCode, profession } = userData;

        // Vérifier si l'email existe déjà
        const existingUser = await db.get('users', { email });
        if (existingUser) {
            throw new Error('Un utilisateur avec cet email existe déjà');
        }

        // Hasher le mot de passe
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Insérer l'utilisateur (non approuvé par défaut)
        const userData_insert = {
            email,
            password_hash: passwordHash,
            first_name: firstName,
            last_name: lastName,
            phone,
            country,
            country_code: countryCode,
            profession,
            admin_approved: false,
            is_active: true
        };

        const result = await db.insert('users', userData_insert);
        return await SupabaseUser.findById(result.id);
    }

    // Trouver un utilisateur par ID
    static async findById(id) {
        const db = DatabaseFactory.create();
        const userData = await db.get('users', { id });
        return userData ? new SupabaseUser(userData) : null;
    }

    // Trouver un utilisateur par email
    static async findByEmail(email) {
        const db = DatabaseFactory.create();
        const userData = await db.get('users', { email });
        return userData ? new SupabaseUser(userData) : null;
    }

    // Trouver un utilisateur par ID unique
    static async findByUniqueId(uniqueId) {
        const db = DatabaseFactory.create();
        const userData = await db.get('users', { unique_id: uniqueId });
        return userData ? new SupabaseUser(userData) : null;
    }

    // Trouver un utilisateur par email ou ID unique
    static async findByEmailOrUniqueId(identifier) {
        const db = DatabaseFactory.create();
        
        // D'abord essayer par email
        let userData = await db.get('users', { email: identifier });

        // Si pas trouvé, essayer par ID unique
        if (!userData) {
            userData = await db.get('users', { unique_id: identifier });
        }

        return userData ? new SupabaseUser(userData) : null;
    }

    // Vérifier le mot de passe
    async verifyPassword(password) {
        const db = DatabaseFactory.create();
        const userData = await db.get('users', { id: this.id }, 'password_hash');
        return await bcrypt.compare(password, userData.password_hash);
    }

    // Mettre à jour la dernière connexion
    async updateLastLogin() {
        const db = DatabaseFactory.create();
        await db.update('users', 
            { last_login: new Date().toISOString() }, 
            { id: this.id }
        );
        this.lastLogin = new Date().toISOString();
    }

    // Mettre à jour le solde
    async updateBalance(amount) {
        const db = DatabaseFactory.create();
        const newBalance = parseFloat(this.balance) + parseFloat(amount);
        await db.update('users', 
            { balance: newBalance }, 
            { id: this.id }
        );
        this.balance = newBalance;
    }

    // Vérifier si l'utilisateur a un abonnement actif
    async hasActiveSubscription() {
        const db = DatabaseFactory.create();
        const subscription = await db.get('subscriptions', {
            user_id: this.id,
            status: 'active'
        });
        
        // Vérifier aussi la date d'expiration si elle existe
        if (subscription && subscription.end_date) {
            const endDate = new Date(subscription.end_date);
            const now = new Date();
            return endDate > now;
        }
        
        return !!subscription;
    }

    // Obtenir l'historique des tentatives de sondage
    async getSurveyHistory() {
        const db = DatabaseFactory.create();
        // Pour les requêtes complexes avec JOIN, nous devrons utiliser des requêtes SQL brutes
        // ou faire plusieurs requêtes séparées
        const attempts = await db.all('survey_attempts', { user_id: this.id });
        
        // Enrichir avec les noms des thèmes
        for (let attempt of attempts) {
            const theme = await db.get('survey_themes', { id: attempt.theme_id });
            attempt.theme_name = theme ? theme.name : 'Thème inconnu';
        }
        
        return attempts.sort((a, b) => new Date(b.started_at) - new Date(a.started_at));
    }

    // Obtenir les moyens de paiement
    async getPaymentMethods() {
        const db = DatabaseFactory.create();
        return await db.all('payment_methods', { 
            user_id: this.id, 
            is_active: true 
        });
    }

    // Obtenir le moyen de paiement par défaut
    async getDefaultPaymentMethod() {
        const db = DatabaseFactory.create();
        return await db.get('payment_methods', { 
            user_id: this.id, 
            is_default: true, 
            is_active: true 
        });
    }

    // Mettre à jour les informations du profil
    async updateProfile(data) {
        const db = DatabaseFactory.create();
        const { firstName, lastName, phone, country } = data;
        
        const updateData = {
            first_name: firstName,
            last_name: lastName,
            phone,
            country,
            updated_at: new Date().toISOString()
        };
        
        await db.update('users', updateData, { id: this.id });
        
        this.firstName = firstName;
        this.lastName = lastName;
        this.phone = phone;
        this.country = country;
        this.updatedAt = new Date().toISOString();
    }

    // Changer le mot de passe
    async changePassword(newPassword) {
        const db = DatabaseFactory.create();
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        const passwordHash = await bcrypt.hash(newPassword, saltRounds);
        
        await db.update('users', 
            { 
                password_hash: passwordHash, 
                updated_at: new Date().toISOString() 
            }, 
            { id: this.id }
        );
    }

    // Désactiver le compte
    async deactivate() {
        const db = DatabaseFactory.create();
        await db.update('users', 
            { 
                is_active: false, 
                updated_at: new Date().toISOString() 
            }, 
            { id: this.id }
        );
        this.isActive = false;
    }

    // Obtenir les statistiques de l'utilisateur
    async getStats() {
        const db = DatabaseFactory.create();
        const attempts = await db.all('survey_attempts', { user_id: this.id });
        
        const totalAttempts = attempts.length;
        const passedAttempts = attempts.filter(a => a.is_passed).length;
        const totalEarnings = attempts.reduce((sum, a) => sum + (parseFloat(a.reward_amount) || 0), 0);
        
        return {
            totalAttempts,
            passedAttempts,
            totalEarnings,
            successRate: totalAttempts > 0 ? (passedAttempts / totalAttempts * 100).toFixed(2) : 0
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

module.exports = SupabaseUser;
