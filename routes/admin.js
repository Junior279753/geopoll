const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const DatabaseFactory = require('../models/databaseFactory');
const { Survey } = require('../models');

// Middleware pour toutes les routes admin
router.use(authenticateToken);
router.use(requireAdmin);

// Route pour obtenir les statistiques générales
router.get('/stats', async (req, res) => {
    try {
        const db = DatabaseFactory.create();

        // Statistiques des utilisateurs avec Supabase
        const allUsers = await db.all('users');
        const activeUsers = allUsers.filter(u => u.is_active);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newUsers = allUsers.filter(u => new Date(u.created_at) >= thirtyDaysAgo);

        const userStats = {
            total_users: allUsers.length,
            active_users: activeUsers.length,
            new_users_30d: newUsers.length
        };

        // Statistiques des abonnements
        const allSubscriptions = await db.all('subscriptions');
        const activeSubscriptions = allSubscriptions.filter(s => s.status === 'active');
        const totalRevenue = allSubscriptions.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

        const subscriptionStats = {
            total_subscriptions: allSubscriptions.length,
            active_subscriptions: activeSubscriptions.length,
            total_revenue: totalRevenue
        };

        // Statistiques des sondages
        const allAttempts = await db.all('survey_attempts');
        const completedAttempts = allAttempts.filter(a => a.is_completed);
        const passedAttempts = allAttempts.filter(a => a.is_passed);
        const totalRewards = allAttempts.reduce((sum, a) => sum + (parseFloat(a.reward_amount) || 0), 0);

        const surveyStats = {
            total_attempts: allAttempts.length,
            completed_attempts: completedAttempts.length,
            passed_attempts: passedAttempts.length,
            total_rewards_paid: totalRewards
        };

        // Statistiques des transactions
        const allTransactions = await db.all('transactions');
        const pendingTransactions = allTransactions.filter(t => t.status === 'pending');
        const completedTransactions = allTransactions.filter(t => t.status === 'completed');
        const totalTransactionAmount = completedTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

        const transactionStats = {
            pending_withdrawals: allTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0),
            completed_withdrawals: allTransactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0),
            pending_withdrawal_count: allTransactions.filter(t => t.type === 'withdrawal' && t.status === 'pending').length,
            total_transactions: allTransactions.length
        };

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
        const db = DatabaseFactory.create();

        // Récupérer tous les utilisateurs
        let users = await db.all('users', {},
            'id, email, first_name, last_name, phone, country, is_active, is_admin, balance, created_at, last_login, admin_approved',
            { column: 'created_at', ascending: false }
        );

        // Filtrer par recherche
        if (search) {
            const searchLower = search.toLowerCase();
            users = users.filter(user =>
                user.first_name?.toLowerCase().includes(searchLower) ||
                user.last_name?.toLowerCase().includes(searchLower) ||
                user.email?.toLowerCase().includes(searchLower)
            );
        }

        // Filtrer par statut
        if (status === 'active') {
            users = users.filter(user => user.is_active);
        } else if (status === 'inactive') {
            users = users.filter(user => !user.is_active);
        }

        // Pagination
        const total = users.length;
        const offset = (page - 1) * limit;
        const paginatedUsers = users.slice(offset, offset + parseInt(limit));

        res.json({
            users: paginatedUsers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des utilisateurs'
        });
    }
});

// Route pour obtenir les détails d'un utilisateur - DÉPLACÉE vers adminUsers.js

// Route pour activer/désactiver un utilisateur - DÉPLACÉE vers adminUsers.js

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
        const db = DatabaseFactory.create();
        const { page = 1, limit = 20 } = req.query;

        // Récupérer les tentatives de sondages
        const allAttempts = await db.all('survey_attempts', {},
            'id, user_id, theme_id, is_completed, is_passed, score, reward_amount, started_at, completed_at',
            { column: 'started_at', ascending: false }
        );

        // Récupérer les utilisateurs et thèmes pour enrichir les données
        const users = await db.all('users', {}, 'id, first_name, last_name, email');
        const themes = await db.all('survey_themes', {}, 'id, name');

        // Enrichir les tentatives avec les infos utilisateur et thème
        const enrichedAttempts = allAttempts.map(attempt => {
            const user = users.find(u => u.id === attempt.user_id);
            const theme = themes.find(t => t.id === attempt.theme_id);
            return {
                ...attempt,
                first_name: user?.first_name || null,
                last_name: user?.last_name || null,
                email: user?.email || null,
                theme_name: theme?.name || null
            };
        });

        // Pagination
        const total = enrichedAttempts.length;
        const offset = (page - 1) * limit;
        const surveys = enrichedAttempts.slice(offset, offset + parseInt(limit));

        res.json({
            surveys,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
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
        const db = DatabaseFactory.create();
        const { status = 'all', page = 1, limit = 20 } = req.query;

        // Récupérer toutes les transactions de type withdrawal
        const allTransactions = await db.all('transactions', { type: 'withdrawal' },
            'id, user_id, amount, status, created_at, processed_at',
            { column: 'created_at', ascending: false }
        );

        // Filtrer par statut si spécifié
        let filteredTransactions = allTransactions;
        if (status !== 'all') {
            filteredTransactions = filteredTransactions.filter(t => t.status === status);
        }

        // Récupérer les utilisateurs pour enrichir les données
        const users = await db.all('users', {}, 'id, first_name, last_name, email, balance');

        // Enrichir les transactions avec les infos utilisateur
        const enrichedTransactions = filteredTransactions.map(transaction => {
            const user = users.find(u => u.id === transaction.user_id);
            return {
                ...transaction,
                first_name: user?.first_name || null,
                last_name: user?.last_name || null,
                email: user?.email || null,
                balance: user?.balance || 0
            };
        });

        // Pagination
        const total = enrichedTransactions.length;
        const offset = (page - 1) * limit;
        const withdrawals = enrichedTransactions.slice(offset, offset + parseInt(limit));

        res.json({
            withdrawals,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
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
        const db = DatabaseFactory.create();
        const { page = 1, limit = 50, action, userId } = req.query;

        // Pour Supabase, on récupère tous les logs et on filtre côté client
        const allLogs = await db.all('activity_logs', {},
            'id, user_id, action, ip_address, user_agent, details, created_at',
            { column: 'created_at', ascending: false }
        );

        // Filtrer par action si spécifié
        let filteredLogs = allLogs;
        if (action) {
            filteredLogs = filteredLogs.filter(log => log.action === action);
        }
        if (userId) {
            filteredLogs = filteredLogs.filter(log => log.user_id === parseInt(userId));
        }

        // Pagination
        const total = filteredLogs.length;
        const offset = (page - 1) * limit;
        const paginatedLogs = filteredLogs.slice(offset, offset + parseInt(limit));

        // Enrichir avec les infos utilisateur
        const users = await db.all('users', {}, 'id, first_name, last_name, email');
        const enrichedLogs = paginatedLogs.map(log => {
            const user = users.find(u => u.id === log.user_id);
            return {
                ...log,
                first_name: user?.first_name || null,
                last_name: user?.last_name || null,
                email: user?.email || null
            };
        });

        res.json({
            logs: enrichedLogs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                pages: Math.ceil(total / limit)
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
