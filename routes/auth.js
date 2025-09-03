const express = require('express');
const router = express.Router();
const { User } = require('../models');
const DatabaseFactory = require('../models/databaseFactory');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validateRegistration, validateLogin, validatePasswordChange } = require('../middleware/validation');

// Route d'inscription
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const { email, password, firstName, lastName, phone, country, countryCode, profession } = req.body;

        console.log('📝 Données reçues pour inscription:', {
            email,
            firstName,
            lastName,
            phone,
            country,
            countryCode,
            profession
        });

        // Créer l'utilisateur
        const user = await User.create({
            email,
            password,
            firstName,
            lastName,
            phone,
            country,
            countryCode,
            profession
        });

        // Générer le token JWT
        const token = generateToken(user.id);

        // Log de l'activité
        const db = DatabaseFactory.create();
        await db.insert('activity_logs', {
            user_id: user.id,
            action: 'USER_REGISTERED',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            created_at: new Date().toISOString()
        });

        console.log('✅ Utilisateur créé avec succès:', user.toJSON());

        res.status(201).json({
            message: 'Inscription soumise avec succès. Votre compte est en attente d\'approbation par un administrateur.',
            user: user.toJSON(),
            requiresApproval: true,
            note: 'Vous recevrez une notification une fois votre compte approuvé.'
        });

    } catch (error) {
        console.error('❌ Erreur lors de l\'inscription:', error);

        if (error.message.includes('existe déjà')) {
            return res.status(409).json({
                error: error.message
            });
        }

        res.status(500).json({
            error: 'Erreur lors de la création du compte'
        });
    }
});

// Route de connexion
router.post('/login', validateLogin, async (req, res) => {
    try {
        const { email, password } = req.body;

        // Trouver l'utilisateur par email ou ID unique
        const user = await User.findByEmailOrUniqueId(email);
        if (!user) {
            return res.status(401).json({
                error: 'Identifiant ou mot de passe incorrect'
            });
        }

        // Vérifier si le compte est actif
        if (!user.isActive) {
            return res.status(401).json({
                error: 'Compte désactivé par un administrateur'
            });
        }

        // Vérifier si l'utilisateur est approuvé (sauf pour les admins)
        if (!user.isAdmin && !user.adminApproved) {
            return res.status(403).json({
                error: 'Votre compte est en attente d\'approbation par un administrateur',
                code: 'PENDING_APPROVAL'
            });
        }

        // Vérifier le mot de passe
        const isValidPassword = await user.verifyPassword(password);
        if (!isValidPassword) {
            // Log de tentative de connexion échouée
            const db = DatabaseFactory.create();
            await db.insert('activity_logs', {
                user_id: user.id,
                action: 'LOGIN_FAILED',
                ip_address: req.ip,
                user_agent: req.get('User-Agent'),
                details: 'Invalid password',
                created_at: new Date().toISOString()
            });

            return res.status(401).json({
                error: 'Identifiant ou mot de passe incorrect'
            });
        }

        // Mettre à jour la dernière connexion
        await user.updateLastLogin();

        // Générer le token JWT
        const token = generateToken(user.id);

        // Log de connexion réussie
        const db = DatabaseFactory.create();
        await db.insert('activity_logs', {
            user_id: user.id,
            action: 'LOGIN_SUCCESS',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            created_at: new Date().toISOString()
        });

        res.json({
            message: 'Connexion réussie',
            user: user.toJSON(),
            token
        });

    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({
            error: 'Erreur lors de la connexion'
        });
    }
});

// Route pour obtenir le profil utilisateur
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // Obtenir les statistiques de l'utilisateur
        const stats = await req.user.getStats();

        res.json({
            user: req.user.toJSON(),
            stats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération du profil'
        });
    }
});

// Route pour mettre à jour le profil
router.put('/profile', authenticateToken, async (req, res) => {
    try {
        const { firstName, lastName, phone, country } = req.body;

        await req.user.updateProfile({
            firstName,
            lastName,
            phone,
            country
        });

        // Log de l'activité
        const db = DatabaseFactory.create();
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'PROFILE_UPDATED',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            created_at: new Date().toISOString()
        });

        res.json({
            message: 'Profil mis à jour avec succès',
            user: req.user.toJSON()
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        res.status(500).json({
            error: 'Erreur lors de la mise à jour du profil'
        });
    }
});

// Route pour changer le mot de passe
router.put('/change-password', authenticateToken, validatePasswordChange, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Vérifier le mot de passe actuel
        const isValidPassword = await req.user.verifyPassword(currentPassword);
        if (!isValidPassword) {
            return res.status(400).json({
                error: 'Mot de passe actuel incorrect'
            });
        }

        // Changer le mot de passe
        await req.user.changePassword(newPassword);

        // Log de l'activité
        const db = DatabaseFactory.create();
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'PASSWORD_CHANGED',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            created_at: new Date().toISOString()
        });

        res.json({
            message: 'Mot de passe changé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors du changement de mot de passe:', error);
        res.status(500).json({
            error: 'Erreur lors du changement de mot de passe'
        });
    }
});

// Route pour vérifier la validité du token
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        valid: true,
        user: req.user.toJSON()
    });
});

// Route de déconnexion (côté client, suppression du token)
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        // Log de déconnexion
        const db = DatabaseFactory.create();
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'LOGOUT',
            ip_address: req.ip,
            user_agent: req.get('User-Agent'),
            created_at: new Date().toISOString()
        });

        res.json({
            message: 'Déconnexion réussie'
        });

    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        res.status(500).json({
            error: 'Erreur lors de la déconnexion'
        });
    }
});

module.exports = router;
