const express = require('express');
const router = express.Router();
const DatabaseFactory = require('../models/databaseFactory');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Obtenir tous les utilisateurs avec filtres
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        const db = DatabaseFactory.create();

        // Construire les filtres
        let filters = {};

        // Filtrer par statut
        if (status === 'pending') {
            filters.admin_approved = false;
            filters.is_admin = false;
        } else if (status === 'approved') {
            filters.admin_approved = true;
        } else if (status === 'active') {
            filters.is_active = true;
        } else if (status === 'inactive') {
            filters.is_active = false;
        }

        // Exclure les admins de la liste normale
        filters.is_admin = false;

        // Récupérer tous les utilisateurs avec les filtres
        let users = await db.all('users', filters,
            'id, email, first_name, last_name, phone, country, is_active, is_admin, admin_approved, email_verified, approved_by, approved_at, created_at, last_login, unique_id, account_monetized',
            { column: 'created_at', ascending: false }
        );

        // Filtrer par recherche si nécessaire (côté client pour Supabase)
        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(user =>
                user.first_name?.toLowerCase().includes(searchLower) ||
                user.last_name?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower)
            );
        }

        // Pagination côté client
        const total = users.length;
        const offset = (page - 1) * limit;
        const paginatedUsers = users.slice(offset, offset + parseInt(limit));

        res.json({
            users: paginatedUsers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route spécifique pour les utilisateurs en attente d\'approbation
router.get('/pending', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();

        const pendingUsers = await db.all('users', {
            admin_approved: false,
            is_admin: false
        }, 'id, email, first_name, last_name, phone, country, profession, created_at',
        { column: 'created_at', ascending: false });

        res.json({
            users: pendingUsers,
            count: pendingUsers.length
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs en attente:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Attribuer un ID unique à un utilisateur
router.post('/:id/assign-id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const userId = req.params.id;
        const adminId = req.user.id;
        const { uniqueId } = req.body;

        if (!uniqueId) {
            return res.status(400).json({ error: 'ID unique requis' });
        }

        // Vérifier que l\'utilisateur existe et n\'est pas admin
        const user = await db.get('users', { id: userId, is_admin: false });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier que l\'ID unique n\'est pas déjà utilisé
        const existingUser = await db.get('users', { unique_id: uniqueId });
        if (existingUser) {
            return res.status(409).json({ error: 'Cet ID unique est déjà utilisé' });
        }

        // Attribuer l\'ID unique, approuver l\'utilisateur et ajouter la subvention
        await db.update('users', {
            unique_id: uniqueId,
            admin_approved: true,
            is_active: true,
            approved_by: adminId,
            approved_at: new Date().toISOString(),
            balance: user.balance + 500000
        }, { id: userId });

        // Log de l\'activité
        await db.insert('activity_logs', {
            user_id: userId,
            action: 'USER_ID_ASSIGNED',
            details: `Unique ID ${uniqueId} assigned by admin ${adminId}`,
            created_at: new Date().toISOString()
        });

        res.json({
            message: 'ID unique attribué avec succès',
            user: { id: userId, uniqueId: uniqueId, approved: true },
            redirectUrl: `/payment-confirmation.html?id=${uniqueId}`
        });

    } catch (error) {
        console.error('Erreur lors de l\'attribution d\'ID:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Approuver un utilisateur
router.post('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.user.id;
        const db = DatabaseFactory.create();

        // Vérifier que l\'utilisateur existe et n\'est pas admin
        const user = await db.get('users', { id: userId, is_admin: false });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Approuver l\'utilisateur
        await db.update('users', {
            admin_approved: true,
            is_active: true,
            approved_by: adminId,
            approved_at: new Date().toISOString()
        }, { id: userId });

        // Log de l\'activité
        await db.insert('activity_logs', {
            user_id: userId,
            action: 'USER_APPROVED',
            details: `User approved by admin ${adminId}`,
            created_at: new Date().toISOString()
        });

        res.json({
            message: 'Utilisateur approuvé avec succès',
            user: { id: userId, approved: true }
        });

    } catch (error) {
        console.error('Erreur lors de l\'approbation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Monétiser un compte utilisateur
router.post('/:id/monetize', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const userId = req.params.id;
        const adminId = req.user.id;

        // Vérifier que l\'utilisateur existe et n\'est pas admin
        const user = await db.get('users', { id: userId, is_admin: false });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier que l\'utilisateur est approuvé
        if (!user.admin_approved) {
            return res.status(400).json({ error: 'L\'utilisateur doit d\'abord être approuvé' });
        }

        // Monétiser le compte
        await db.update('users', { account_monetized: true }, { id: userId });

        // Log de l\'activité
        await db.insert('activity_logs', {
            user_id: userId,
            action: 'ACCOUNT_MONETIZED',
            details: `Account monetized by admin ${adminId}`,
            created_at: new Date().toISOString()
        });

        res.json({
            message: 'Compte monétisé avec succès',
            user: { id: userId, monetized: true }
        });

    } catch (error) {
        console.error('Erreur lors de la monétisation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Démonétiser un compte utilisateur
router.post('/:id/demonetize', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const userId = req.params.id;
        const adminId = req.user.id;

        // Vérifier que l\'utilisateur existe et n\'est pas admin
        const user = await db.get('users', { id: userId, is_admin: false });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Démonétiser le compte
        await db.update('users', { account_monetized: false }, { id: userId });

        // Log de l\'activité
        await db.insert('activity_logs', {
            user_id: userId,
            action: 'ACCOUNT_DEMONETIZED',
            details: `Account demonetized by admin ${adminId}`,
            created_at: new Date().toISOString()
        });

        res.json({
            message: 'Compte démonétisé avec succès',
            user: { id: userId, monetized: false }
        });

    } catch (error) {
        console.error('Erreur lors de la démonétisation:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Rejeter/désapprouver un utilisateur
router.post('/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const userId = req.params.id;
        const adminId = req.user.id;
        const { reason } = req.body;
        
        // Vérifier que l\'utilisateur existe et n\'est pas admin
        const user = await db.get('users', { id: userId, is_admin: false });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Rejeter l\'utilisateur
        await db.update('users', {
            admin_approved: false,
            is_active: false,
            approved_by: null,
            approved_at: null
        }, { id: userId });
        
        // Log de l\'activité
        await db.insert('activity_logs', {
            user_id: userId,
            action: 'USER_REJECTED',
            details: `User rejected by admin ${adminId}. Reason: ${reason || 'No reason provided'}`,
            created_at: new Date().toISOString()
        });
        
        res.json({
            message: 'Utilisateur rejeté avec succès',
            user: { id: userId, approved: false }
        });
        
    } catch (error) {
        console.error('Erreur lors du rejet:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Activer/désactiver un utilisateur
router.post('/:id/toggle-status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const userId = req.params.id;
        const adminId = req.user.id;
        
        // Vérifier que l\'utilisateur existe et n\'est pas admin
        const user = await db.get('users', { id: userId, is_admin: false });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const newStatus = !user.is_active;
        
        // Changer le statut
        await db.update('users', { is_active: newStatus }, { id: userId });
        
        // Log de l\'activité
        const action = newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
        await db.insert('activity_logs', {
            user_id: userId,
            action: action,
            details: `User ${newStatus ? 'activated' : 'deactivated'} by admin ${adminId}`,
            created_at: new Date().toISOString()
        });
        
        res.json({
            message: `Utilisateur ${newStatus ? 'activé' : 'désactivé'} avec succès`,
            user: { id: userId, isActive: newStatus }
        });
        
    } catch (error) {
        console.error('Erreur lors du changement de statut:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un utilisateur
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const userId = req.params.id;
        const adminId = req.user.id;
        
        // Vérifier que l\'utilisateur existe et n\'est pas admin
        const user = await db.get('users', { id: userId, is_admin: false });
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Log de l\'activité avant suppression
        await db.insert('activity_logs', {
            user_id: userId,
            action: 'USER_DELETED',
            details: `User ${user.email} deleted by admin ${adminId}`,
            created_at: new Date().toISOString()
        });
        
        // Supprimer l\'utilisateur et toutes ses données associées
        await db.delete('survey_attempts', { user_id: userId });
        await db.delete('subscriptions', { user_id: userId });
        await db.delete('payment_methods', { user_id: userId });
        await db.delete('transactions', { user_id: userId });
        await db.delete('users', { id: userId });
        
        res.json({
            message: 'Utilisateur supprimé avec succès',
            user: { id: userId, deleted: true }
        });
        
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir les statistiques des utilisateurs
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();

        // Récupérer tous les utilisateurs non-admin
        const allUsers = await db.all('users', { is_admin: false });

        const total = allUsers.length;
        const pending = allUsers.filter(u => !u.admin_approved).length;
        const approved = allUsers.filter(u => u.admin_approved).length;
        const active = allUsers.filter(u => u.is_active).length;
        const inactive = allUsers.filter(u => !u.is_active).length;

        res.json({
            total,
            pending,
            approved,
            active,
            inactive
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;