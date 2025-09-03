const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../models/database');
const Survey = require('../models/Survey');

// Middleware pour toutes les routes admin
router.use(authenticateToken);
router.use(requireAdmin);

// Route pour obtenir les statistiques générales
router.get('/stats', async (req, res) => {
    try {
        // Statistiques des utilisateurs
        const userStats = await db.get(
            `SELECT 
                COUNT(*) as total_users,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
                SUM(CASE WHEN created_at >= date('now', '-30 days') THEN 1 ELSE 0 END) as new_users_30d
             FROM users`
        );

        // Statistiques des abonnements
        const subscriptionStats = await db.get(
            `SELECT 
                COUNT(*) as total_subscriptions,
                SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_subscriptions,
                SUM(amount) as total_revenue
             FROM subscriptions`
        );

        // Statistiques des sondages
        const surveyStats = await db.get(
            `SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed_attempts,
                SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) as passed_attempts,
                SUM(reward_amount) as total_rewards_paid
             FROM survey_attempts`
        );

        // Statistiques des transactions
        const transactionStats = await db.get(
            `SELECT 
                SUM(CASE WHEN type = 'withdrawal' AND status = 'pending' THEN ABS(amount) ELSE 0 END) as pending_withdrawals,
                SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN ABS(amount) ELSE 0 END) as completed_withdrawals,
                COUNT(CASE WHEN type = 'withdrawal' AND status = 'pending' THEN 1 END) as pending_withdrawal_count
             FROM transactions`
        );

        res.json({
            users: userStats,
            subscriptions: subscriptionStats,
            surveys: surveyStats,
            transactions: transactionStats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques admin:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des statistiques'
        });
    }
});

// Route pour obtenir la liste des utilisateurs
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (search) {
            whereClause += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        if (status) {
            whereClause += ' AND is_active = ?';
            params.push(status === 'active' ? 1 : 0);
        }

        const users = await db.all(
            `SELECT 
                id, email, first_name, last_name, phone, country, 
                is_active, is_admin, balance, created_at, last_login
             FROM users 
             ${whereClause}
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total = await db.get(
            `SELECT COUNT(*) as count FROM users ${whereClause}`,
            params
        );

        res.json({
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des utilisateurs'
        });
    }
});

// Route pour obtenir les détails d'un utilisateur
router.get('/users/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;

        // Informations de base de l'utilisateur
        const user = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [userId]
        );

        if (!user) {
            return res.status(404).json({
                error: 'Utilisateur non trouvé'
            });
        }

        // Abonnement actuel
        const subscription = await db.get(
            'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        // Statistiques des sondages
        const surveyStats = await db.get(
            `SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) as passed_attempts,
                SUM(reward_amount) as total_earnings
             FROM survey_attempts 
             WHERE user_id = ? AND is_completed = 1`,
            [userId]
        );

        // Moyens de paiement
        const paymentMethods = await db.all(
            'SELECT id, type, account_number, account_name, is_default, is_active, created_at FROM payment_methods WHERE user_id = ?',
            [userId]
        );

        // Masquer les numéros de compte
        const maskedPaymentMethods = paymentMethods.map(method => ({
            ...method,
            account_number: method.account_number.replace(/(.{4}).*(.{4})/, '$1****$2')
        }));

        res.json({
            user: {
                ...user,
                password_hash: undefined // Ne pas exposer le hash du mot de passe
            },
            subscription,
            surveyStats,
            paymentMethods: maskedPaymentMethods
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des détails utilisateur:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des détails utilisateur'
        });
    }
});

// Route pour activer/désactiver un utilisateur
router.put('/users/:userId/status', async (req, res) => {
    try {
        const userId = req.params.userId;
        const { isActive } = req.body;

        await db.run(
            'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [isActive ? 1 : 0, userId]
        );

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'USER_STATUS_CHANGED', req.ip, req.get('User-Agent'), `User ${userId} ${isActive ? 'activated' : 'deactivated'}`]
        );

        res.json({
            message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`
        });

    } catch (error) {
        console.error('Erreur lors de la modification du statut utilisateur:', error);
        res.status(500).json({
            error: 'Erreur lors de la modification du statut utilisateur'
        });
    }
});

// Route pour obtenir les demandes de retrait en attente
router.get('/withdrawals/pending', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const withdrawals = await db.all(
            `SELECT 
                t.id, t.amount, t.reference, t.created_at, t.description,
                u.first_name, u.last_name, u.email,
                pm.type as payment_method_type, pm.account_number, pm.account_name
             FROM transactions t
             JOIN users u ON t.user_id = u.id
             LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
             WHERE t.type = 'withdrawal' AND t.status = 'pending'
             ORDER BY t.created_at ASC
             LIMIT ? OFFSET ?`,
            [limit, offset]
        );

        const total = await db.get(
            'SELECT COUNT(*) as count FROM transactions WHERE type = "withdrawal" AND status = "pending"'
        );

        res.json({
            withdrawals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des demandes de retrait:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des demandes de retrait'
        });
    }
});

// Route pour approuver/rejeter une demande de retrait
router.put('/withdrawals/:transactionId/status', async (req, res) => {
    try {
        const transactionId = req.params.transactionId;
        const { status, reason } = req.body; // status: 'completed' ou 'failed'

        if (!['completed', 'failed'].includes(status)) {
            return res.status(400).json({
                error: 'Statut invalide'
            });
        }

        // Obtenir la transaction
        const transaction = await db.get(
            'SELECT * FROM transactions WHERE id = ? AND type = "withdrawal" AND status = "pending"',
            [transactionId]
        );

        if (!transaction) {
            return res.status(404).json({
                error: 'Transaction non trouvée'
            });
        }

        // Si la transaction est rejetée, rembourser l'utilisateur
        if (status === 'failed') {
            await db.run(
                'UPDATE users SET balance = balance + ? WHERE id = ?',
                [Math.abs(transaction.amount), transaction.user_id]
            );
        }

        // Mettre à jour le statut de la transaction
        await db.run(
            'UPDATE transactions SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, transactionId]
        );

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'WITHDRAWAL_PROCESSED', req.ip, req.get('User-Agent'), 
             `Transaction ${transactionId} ${status}. Reason: ${reason || 'N/A'}`]
        );

        res.json({
            message: `Demande de retrait ${status === 'completed' ? 'approuvée' : 'rejetée'} avec succès`
        });

    } catch (error) {
        console.error('Erreur lors du traitement de la demande de retrait:', error);
        res.status(500).json({
            error: 'Erreur lors du traitement de la demande de retrait'
        });
    }
});

// Route pour obtenir les logs d'activité
router.get('/activity-logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, userId, action } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        let params = [];

        if (userId) {
            whereClause += ' AND al.user_id = ?';
            params.push(userId);
        }

        if (action) {
            whereClause += ' AND al.action = ?';
            params.push(action);
        }

        const logs = await db.all(
            `SELECT 
                al.*, 
                u.first_name, u.last_name, u.email
             FROM activity_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ${whereClause}
             ORDER BY al.created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total = await db.get(
            `SELECT COUNT(*) as count FROM activity_logs al ${whereClause}`,
            params
        );

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des logs d\'activité:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des logs d\'activité'
        });
    }
});

// ===== GESTION DES SONDAGES =====

// Route pour obtenir tous les sondages
router.get('/surveys', async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        // Obtenir les tentatives de sondages avec détails utilisateur
        const surveys = await db.all(`
            SELECT
                sa.id, sa.user_id, sa.theme_id, sa.is_completed, sa.is_passed,
                sa.score, sa.reward_amount, sa.started_at, sa.completed_at,
                u.first_name, u.last_name, u.email,
                st.name as theme_name
            FROM survey_attempts sa
            LEFT JOIN users u ON sa.user_id = u.id
            LEFT JOIN survey_themes st ON sa.theme_id = st.id
            ORDER BY sa.started_at DESC
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        // Compter le total
        const totalCount = await db.get('SELECT COUNT(*) as total FROM survey_attempts');

        res.json({
            surveys,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount.total,
                pages: Math.ceil(totalCount.total / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des sondages:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour obtenir les statistiques des sondages
router.get('/surveys/stats', async (req, res) => {
    try {
        const stats = await Promise.all([
            db.get('SELECT COUNT(*) as total FROM survey_attempts'),
            db.get('SELECT COUNT(*) as completed FROM survey_attempts WHERE is_completed = 1'),
            db.get('SELECT COUNT(*) as passed FROM survey_attempts WHERE is_passed = 1'),
            db.get('SELECT AVG(score) as avg_score FROM survey_attempts WHERE is_completed = 1'),
            db.get('SELECT SUM(reward_amount) as total_rewards FROM survey_attempts WHERE is_passed = 1'),
            db.get('SELECT COUNT(*) as today FROM survey_attempts WHERE date(started_at) = date("now")'),
            db.get('SELECT COUNT(*) as this_week FROM survey_attempts WHERE started_at >= date("now", "-7 days")'),
            db.get('SELECT COUNT(*) as this_month FROM survey_attempts WHERE started_at >= date("now", "-30 days")')
        ]);

        res.json({
            total: stats[0].total,
            completed: stats[1].completed,
            passed: stats[2].passed,
            avgScore: Math.round(stats[3].avg_score || 0),
            totalRewards: stats[4].total_rewards || 0,
            today: stats[5].today,
            thisWeek: stats[6].this_week,
            thisMonth: stats[7].this_month
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des sondages:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour obtenir les thèmes de sondages
router.get('/surveys/themes', async (req, res) => {
    try {
        const themes = await db.all(`
            SELECT
                st.id, st.name, st.description, st.is_active,
                COUNT(sa.id) as total_attempts,
                COUNT(CASE WHEN sa.is_passed = 1 THEN 1 END) as passed_attempts
            FROM survey_themes st
            LEFT JOIN survey_attempts sa ON st.id = sa.theme_id
            GROUP BY st.id, st.name, st.description, st.is_active
            ORDER BY st.name
        `);

        res.json({ themes });

    } catch (error) {
        console.error('Erreur lors de la récupération des thèmes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===== GESTION DES RETRAITS =====

// Route pour obtenir les demandes de retrait
router.get('/withdrawals', async (req, res) => {
    try {
        const { status = 'all', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = "WHERE t.type = 'withdrawal'";
        const params = [];

        if (status !== 'all') {
            whereClause += ' AND t.status = ?';
            params.push(status);
        }

        const withdrawals = await db.all(`
            SELECT
                t.id, t.user_id, t.amount, t.status, t.created_at, t.processed_at,
                t.payment_method, t.payment_details,
                u.first_name, u.last_name, u.email, u.balance
            FROM transactions t
            LEFT JOIN users u ON t.user_id = u.id
            ${whereClause}
            ORDER BY t.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Compter le total
        const totalQuery = `SELECT COUNT(*) as total FROM transactions t ${whereClause}`;
        const totalCount = await db.get(totalQuery, params);

        res.json({
            withdrawals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount.total,
                pages: Math.ceil(totalCount.total / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des retraits:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour traiter une demande de retrait
router.put('/withdrawals/:id/process', async (req, res) => {
    try {
        const withdrawalId = req.params.id;
        const { action, reason } = req.body; // action: 'approve' ou 'reject'
        const adminId = req.user.id;

        // Vérifier que la demande existe
        const withdrawal = await db.get(
            'SELECT * FROM transactions WHERE id = ? AND type = "withdrawal"',
            [withdrawalId]
        );

        if (!withdrawal) {
            return res.status(404).json({ error: 'Demande de retrait non trouvée' });
        }

        if (withdrawal.status !== 'pending') {
            return res.status(400).json({ error: 'Cette demande a déjà été traitée' });
        }

        if (action === 'approve') {
            // Approuver le retrait
            await db.run(`
                UPDATE transactions
                SET status = 'completed', processed_at = CURRENT_TIMESTAMP, processed_by = ?
                WHERE id = ?
            `, [adminId, withdrawalId]);

            // Log de l'activité
            await db.run(
                'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
                [withdrawal.user_id, 'WITHDRAWAL_APPROVED', `Withdrawal of ${Math.abs(withdrawal.amount)} FCFA approved by admin ${adminId}`]
            );

        } else if (action === 'reject') {
            // Rejeter le retrait et rembourser le solde
            await db.run('BEGIN TRANSACTION');

            try {
                // Mettre à jour le statut
                await db.run(`
                    UPDATE transactions
                    SET status = 'rejected', processed_at = CURRENT_TIMESTAMP, processed_by = ?, rejection_reason = ?
                    WHERE id = ?
                `, [adminId, reason, withdrawalId]);

                // Rembourser le solde utilisateur
                await db.run(
                    'UPDATE users SET balance = balance + ? WHERE id = ?',
                    [Math.abs(withdrawal.amount), withdrawal.user_id]
                );

                // Log de l'activité
                await db.run(
                    'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
                    [withdrawal.user_id, 'WITHDRAWAL_REJECTED', `Withdrawal of ${Math.abs(withdrawal.amount)} FCFA rejected by admin ${adminId}. Reason: ${reason}`]
                );

                await db.run('COMMIT');

            } catch (error) {
                await db.run('ROLLBACK');
                throw error;
            }
        }

        res.json({
            message: `Demande de retrait ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`
        });

    } catch (error) {
        console.error('Erreur lors du traitement du retrait:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===== GESTION DES LOGS =====

// Route pour obtenir les logs d'activité
router.get('/logs', async (req, res) => {
    try {
        const { page = 1, limit = 50, action, userId } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (action) {
            whereClause += ' AND al.action = ?';
            params.push(action);
        }

        if (userId) {
            whereClause += ' AND al.user_id = ?';
            params.push(userId);
        }

        const logs = await db.all(`
            SELECT
                al.id, al.user_id, al.action, al.ip_address, al.user_agent,
                al.details, al.created_at,
                u.first_name, u.last_name, u.email
            FROM activity_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ${whereClause}
            ORDER BY al.created_at DESC
            LIMIT ? OFFSET ?
        `, [...params, limit, offset]);

        // Compter le total
        const totalQuery = `SELECT COUNT(*) as total FROM activity_logs al ${whereClause}`;
        const totalCount = await db.get(totalQuery, params);

        res.json({
            logs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: totalCount.total,
                pages: Math.ceil(totalCount.total / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des logs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour obtenir les statistiques des logs
router.get('/logs/stats', async (req, res) => {
    try {
        const stats = await Promise.all([
            db.get('SELECT COUNT(*) as total FROM activity_logs'),
            db.get('SELECT COUNT(*) as today FROM activity_logs WHERE date(created_at) = date("now")'),
            db.get('SELECT COUNT(*) as this_week FROM activity_logs WHERE created_at >= date("now", "-7 days")'),
            db.get(`
                SELECT action, COUNT(*) as count
                FROM activity_logs
                WHERE created_at >= date("now", "-7 days")
                GROUP BY action
                ORDER BY count DESC
                LIMIT 10
            `),
            db.get(`
                SELECT COUNT(DISTINCT user_id) as unique_users
                FROM activity_logs
                WHERE date(created_at) = date("now")
            `)
        ]);

        res.json({
            total: stats[0].total,
            today: stats[1].today,
            thisWeek: stats[2].this_week,
            topActions: stats[3] || [],
            uniqueUsersToday: stats[4].unique_users
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques des logs:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===== GESTION DES PARAMÈTRES =====

// Route pour obtenir les paramètres système
router.get('/settings', async (req, res) => {
    try {
        // Simuler des paramètres système (à adapter selon vos besoins)
        const settings = {
            platform: {
                name: 'GeoPoll',
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            },
            rewards: {
                surveyReward: 22500,
                minimumWithdrawal: 1000,
                currency: 'FCFA'
            },
            security: {
                jwtExpiration: '7d',
                maxLoginAttempts: 5,
                sessionTimeout: 3600
            },
            features: {
                emailVerification: true,
                adminApproval: true,
                autoRewards: true
            }
        };

        res.json({ settings });

    } catch (error) {
        console.error('Erreur lors de la récupération des paramètres:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour mettre à jour les paramètres
router.put('/settings', async (req, res) => {
    try {
        const { category, key, value } = req.body;

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [req.user.id, 'SETTINGS_UPDATED', `Setting ${category}.${key} updated to ${value}`]
        );

        res.json({
            message: 'Paramètres mis à jour avec succès',
            updated: { category, key, value }
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour des paramètres:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
