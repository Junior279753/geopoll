const express = require('express');
const router = express.Router();
const db = require('../models/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Obtenir tous les utilisateurs avec filtres
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, search, page = 1, limit = 20 } = req.query;
        
        let query = `
            SELECT id, email, first_name, last_name, phone, country,
                   is_active, is_admin, admin_approved, email_verified,
                   approved_by, approved_at, created_at, last_login, unique_id, account_monetized
            FROM users
            WHERE 1=1
        `;
        
        const params = [];
        
        // Filtrer par statut
        if (status === 'pending') {
            query += ' AND admin_approved = 0 AND is_admin = 0';
        } else if (status === 'approved') {
            query += ' AND admin_approved = 1';
        } else if (status === 'active') {
            query += ' AND is_active = 1';
        } else if (status === 'inactive') {
            query += ' AND is_active = 0';
        }
        
        // Recherche par nom ou email
        if (search) {
            query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }
        
        // Exclure les admins de la liste normale
        query += ' AND is_admin = 0';
        
        // Pagination
        const offset = (page - 1) * limit;
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(limit), parseInt(offset));
        
        const users = await db.all(query, params);
        
        // Compter le total
        let countQuery = 'SELECT COUNT(*) as total FROM users WHERE is_admin = 0';
        const countParams = [];
        
        if (status === 'pending') {
            countQuery += ' AND admin_approved = 0';
        } else if (status === 'approved') {
            countQuery += ' AND admin_approved = 1';
        } else if (status === 'active') {
            countQuery += ' AND is_active = 1';
        } else if (status === 'inactive') {
            countQuery += ' AND is_active = 0';
        }
        
        if (search) {
            countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            countParams.push(searchTerm, searchTerm, searchTerm);
        }
        
        const { total } = await db.get(countQuery, countParams);
        
        res.json({
            users,
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

// Attribuer un ID unique à un utilisateur
router.post('/:id/assign-id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.user.id;
        const { uniqueId } = req.body;

        if (!uniqueId) {
            return res.status(400).json({ error: 'ID unique requis' });
        }

        // Vérifier que l'utilisateur existe et n'est pas admin
        const user = await db.get('SELECT * FROM users WHERE id = ? AND is_admin = 0', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier que l'ID unique n'est pas déjà utilisé
        const existingUser = await db.get('SELECT id FROM users WHERE unique_id = ?', [uniqueId]);
        if (existingUser) {
            return res.status(409).json({ error: 'Cet ID unique est déjà utilisé' });
        }

        // Attribuer l'ID unique, approuver l'utilisateur et ajouter la subvention
        await db.run(`
            UPDATE users
            SET unique_id = ?, admin_approved = 1, is_active = 1, approved_by = ?, approved_at = CURRENT_TIMESTAMP, balance = balance + 500000
            WHERE id = ?
        `, [uniqueId, adminId, userId]);

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'USER_ID_ASSIGNED', `Unique ID ${uniqueId} assigned by admin ${adminId}`]
        );

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

// Approuver un utilisateur (ancienne méthode, gardée pour compatibilité)
router.post('/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const adminId = req.user.id;

        // Vérifier que l'utilisateur existe et n'est pas admin
        const user = await db.get('SELECT * FROM users WHERE id = ? AND is_admin = 0', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Approuver l'utilisateur
        await db.run(`
            UPDATE users
            SET admin_approved = 1, is_active = 1, approved_by = ?, approved_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [adminId, userId]);

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'USER_APPROVED', `User approved by admin ${adminId}`]
        );

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
        const userId = req.params.id;
        const adminId = req.user.id;

        // Vérifier que l'utilisateur existe et n'est pas admin
        const user = await db.get('SELECT * FROM users WHERE id = ? AND is_admin = 0', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Vérifier que l'utilisateur est approuvé
        if (!user.admin_approved) {
            return res.status(400).json({ error: 'L\'utilisateur doit d\'abord être approuvé' });
        }

        // Monétiser le compte
        await db.run(`
            UPDATE users
            SET account_monetized = 1
            WHERE id = ?
        `, [userId]);

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'ACCOUNT_MONETIZED', `Account monetized by admin ${adminId}`]
        );

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
        const userId = req.params.id;
        const adminId = req.user.id;

        // Vérifier que l'utilisateur existe et n'est pas admin
        const user = await db.get('SELECT * FROM users WHERE id = ? AND is_admin = 0', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Démonétiser le compte
        await db.run(`
            UPDATE users
            SET account_monetized = 0
            WHERE id = ?
        `, [userId]);

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'ACCOUNT_DEMONETIZED', `Account demonetized by admin ${adminId}`]
        );

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
        const userId = req.params.id;
        const adminId = req.user.id;
        const { reason } = req.body;
        
        // Vérifier que l'utilisateur existe et n'est pas admin
        const user = await db.get('SELECT * FROM users WHERE id = ? AND is_admin = 0', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Rejeter l'utilisateur
        await db.run(`
            UPDATE users 
            SET admin_approved = 0, is_active = 0, approved_by = NULL, approved_at = NULL 
            WHERE id = ?
        `, [userId]);
        
        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'USER_REJECTED', `User rejected by admin ${adminId}. Reason: ${reason || 'No reason provided'}`]
        );
        
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
        const userId = req.params.id;
        const adminId = req.user.id;
        
        // Vérifier que l'utilisateur existe et n'est pas admin
        const user = await db.get('SELECT * FROM users WHERE id = ? AND is_admin = 0', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        const newStatus = user.is_active ? 0 : 1;
        
        // Changer le statut
        await db.run('UPDATE users SET is_active = ? WHERE id = ?', [newStatus, userId]);
        
        // Log de l'activité
        const action = newStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED';
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, action, `User ${newStatus ? 'activated' : 'deactivated'} by admin ${adminId}`]
        );
        
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
        const userId = req.params.id;
        const adminId = req.user.id;
        
        // Vérifier que l'utilisateur existe et n'est pas admin
        const user = await db.get('SELECT * FROM users WHERE id = ? AND is_admin = 0', [userId]);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Log de l'activité avant suppression
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'USER_DELETED', `User ${user.email} deleted by admin ${adminId}`]
        );
        
        // Supprimer l'utilisateur et toutes ses données associées
        await db.run('DELETE FROM survey_attempts WHERE user_id = ?', [userId]);
        await db.run('DELETE FROM subscriptions WHERE user_id = ?', [userId]);
        await db.run('DELETE FROM payment_methods WHERE user_id = ?', [userId]);
        await db.run('DELETE FROM transactions WHERE user_id = ?', [userId]);
        await db.run('DELETE FROM users WHERE id = ?', [userId]);
        
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
        const stats = await Promise.all([
            db.get('SELECT COUNT(*) as total FROM users WHERE is_admin = 0'),
            db.get('SELECT COUNT(*) as pending FROM users WHERE admin_approved = 0 AND is_admin = 0'),
            db.get('SELECT COUNT(*) as approved FROM users WHERE admin_approved = 1 AND is_admin = 0'),
            db.get('SELECT COUNT(*) as active FROM users WHERE is_active = 1 AND is_admin = 0'),
            db.get('SELECT COUNT(*) as inactive FROM users WHERE is_active = 0 AND is_admin = 0')
        ]);
        
        res.json({
            total: stats[0].total,
            pending: stats[1].pending,
            approved: stats[2].approved,
            active: stats[3].active,
            inactive: stats[4].inactive
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
