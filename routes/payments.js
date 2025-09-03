const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateSubscription, validateWithdrawal } = require('../middleware/validation');
const DatabaseFactory = require('../models/databaseFactory');

// Routes pour les moyens de paiement

// Récupérer les moyens de paiement de l'utilisateur
router.get('/methods', authenticateToken, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const methods = await db.all('payment_methods',
            { user_id: req.user.id, is_active: true },
            'id, type, account_number, account_name, is_active, created_at',
            { column: 'created_at', ascending: false }
        );

        // Formater les données pour le frontend
        const formattedMethods = methods.map(method => ({
            id: method.id,
            type: method.type,
            details: JSON.parse(method.account_number || '{}'),
            isActive: method.is_active,
            createdAt: method.created_at
        }));

        res.json({
            methods: formattedMethods
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des moyens de paiement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Ajouter un nouveau moyen de paiement
router.post('/methods', authenticateToken, async (req, res) => {
    try {
        const { type, details } = req.body;

        if (!type || !details) {
            return res.status(400).json({
                error: 'Type et détails requis'
            });
        }

        // Valider le type de paiement
        const validTypes = ['mtn', 'moov', 'orange', 'paypal', 'crypto', 'bank'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: 'Type de paiement invalide'
            });
        }

        // Insérer le moyen de paiement
        const result = await db.run(
            'INSERT INTO payment_methods (user_id, type, account_number, account_name, is_active) VALUES (?, ?, ?, ?, 1)',
            [
                req.user.id,
                type,
                JSON.stringify(details),
                details.accountName || details.accountHolder || details.email || 'N/A'
            ]
        );

        res.status(201).json({
            message: 'Moyen de paiement ajouté avec succès',
            method: {
                id: result.id,
                type,
                details
            }
        });
    } catch (error) {
        console.error('Erreur lors de l\'ajout du moyen de paiement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un moyen de paiement
router.delete('/methods/:id', authenticateToken, async (req, res) => {
    try {
        const methodId = req.params.id;

        // Vérifier que le moyen de paiement appartient à l'utilisateur
        const method = await db.get(
            'SELECT * FROM payment_methods WHERE id = ? AND user_id = ?',
            [methodId, req.user.id]
        );

        if (!method) {
            return res.status(404).json({
                error: 'Moyen de paiement non trouvé'
            });
        }

        // Marquer comme inactif au lieu de supprimer
        await db.run(
            'UPDATE payment_methods SET is_active = 0 WHERE id = ?',
            [methodId]
        );

        res.json({
            message: 'Moyen de paiement supprimé avec succès'
        });
    } catch (error) {
        console.error('Erreur lors de la suppression du moyen de paiement:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour créer un abonnement
router.post('/subscribe', authenticateToken, validateSubscription, async (req, res) => {
    try {
        const { type, paymentMethodId } = req.body;

        // Vérifier que le moyen de paiement appartient à l'utilisateur
        const paymentMethod = await db.get(
            'SELECT * FROM payment_methods WHERE id = ? AND user_id = ? AND is_active = 1',
            [paymentMethodId, req.user.id]
        );

        if (!paymentMethod) {
            return res.status(404).json({
                error: 'Moyen de paiement non trouvé'
            });
        }

        // Vérifier si l'utilisateur a déjà un abonnement actif
        const existingSubscription = await db.get(
            'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP)',
            [req.user.id]
        );

        if (existingSubscription) {
            return res.status(400).json({
                error: 'Vous avez déjà un abonnement actif'
            });
        }

        // Définir les prix et durées selon le type
        const subscriptionConfig = {
            monthly: { amount: 5000, duration: 30 }, // 30 jours
            yearly: { amount: 50000, duration: 365 }, // 365 jours
            lifetime: { amount: 100000, duration: null } // Illimité
        };

        const config = subscriptionConfig[type];
        if (!config) {
            return res.status(400).json({
                error: 'Type d\'abonnement invalide'
            });
        }

        // Calculer la date de fin
        const startDate = new Date();
        const endDate = config.duration ? new Date(startDate.getTime() + config.duration * 24 * 60 * 60 * 1000) : null;

        // Créer l'abonnement
        const subscriptionResult = await db.run(
            'INSERT INTO subscriptions (user_id, type, status, start_date, end_date, amount, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [req.user.id, type, 'active', startDate.toISOString(), endDate?.toISOString(), config.amount, paymentMethod.type]
        );

        // Créer la transaction
        await db.run(
            'INSERT INTO transactions (user_id, type, amount, status, payment_method_id, description, reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                req.user.id,
                'subscription',
                -config.amount, // Montant négatif car c'est un paiement
                'completed',
                paymentMethodId,
                `Abonnement ${type}`,
                `SUB_${subscriptionResult.id}_${Date.now()}`
            ]
        );

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'SUBSCRIPTION_CREATED', req.ip, req.get('User-Agent'), `Type: ${type}, Amount: ${config.amount}`]
        );

        res.status(201).json({
            message: 'Abonnement créé avec succès',
            subscription: {
                id: subscriptionResult.id,
                type,
                status: 'active',
                startDate,
                endDate,
                amount: config.amount
            }
        });

    } catch (error) {
        console.error('Erreur lors de la création de l\'abonnement:', error);
        res.status(500).json({
            error: 'Erreur lors de la création de l\'abonnement'
        });
    }
});

// Route pour obtenir l'abonnement actuel
router.get('/subscription', authenticateToken, async (req, res) => {
    try {
        const subscription = await db.get(
            'SELECT * FROM subscriptions WHERE user_id = ? AND status = "active" AND (end_date IS NULL OR end_date > CURRENT_TIMESTAMP) ORDER BY created_at DESC LIMIT 1',
            [req.user.id]
        );

        if (!subscription) {
            return res.json({
                hasActiveSubscription: false,
                subscription: null
            });
        }

        res.json({
            hasActiveSubscription: true,
            subscription: {
                ...subscription,
                daysRemaining: subscription.end_date ? 
                    Math.ceil((new Date(subscription.end_date) - new Date()) / (1000 * 60 * 60 * 24)) : 
                    null
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'abonnement:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération de l\'abonnement'
        });
    }
});

// Route pour demander un retrait
router.post('/withdraw', authenticateToken, validateWithdrawal, async (req, res) => {
    try {
        const { amount, paymentMethodId } = req.body;

        // Vérifier le statut du compte utilisateur
        const user = await db.get('SELECT balance, account_monetized FROM users WHERE id = ?', [req.user.id]);

        // Vérifier si le compte est monétisé
        if (!user.account_monetized) {
            return res.status(400).json({
                error: 'Échec, veuillez élargir votre compte.',
                code: 'ACCOUNT_NOT_MONETIZED',
                message: 'Votre compte doit être monétisé par votre leader GeoPoll avant de pouvoir effectuer des retraits.'
            });
        }

        // Vérifier que l'utilisateur a suffisamment de fonds
        if (parseFloat(user.balance) < amount) {
            return res.status(400).json({
                error: 'Solde insuffisant'
            });
        }

        // Vérifier que le moyen de paiement appartient à l'utilisateur
        const paymentMethod = await db.get(
            'SELECT * FROM payment_methods WHERE id = ? AND user_id = ? AND is_active = 1',
            [paymentMethodId, req.user.id]
        );

        if (!paymentMethod) {
            return res.status(404).json({
                error: 'Moyen de paiement non trouvé'
            });
        }

        // Créer la transaction de retrait
        const reference = `WITHDRAW_${req.user.id}_${Date.now()}`;
        const transactionResult = await db.run(
            'INSERT INTO transactions (user_id, type, amount, status, payment_method_id, description, reference) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                req.user.id,
                'withdrawal',
                -amount, // Montant négatif car c'est un retrait
                'pending',
                paymentMethodId,
                `Retrait vers ${paymentMethod.type}`,
                reference
            ]
        );

        // Déduire le montant du solde de l'utilisateur
        await db.run(
            'UPDATE users SET balance = balance - ? WHERE id = ?',
            [amount, req.user.id]
        );

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'WITHDRAWAL_REQUESTED', req.ip, req.get('User-Agent'), `Amount: ${amount}, Method: ${paymentMethod.type}`]
        );

        res.status(201).json({
            message: 'Demande de retrait créée avec succès',
            transaction: {
                id: transactionResult.id,
                reference,
                amount,
                status: 'pending',
                paymentMethod: {
                    type: paymentMethod.type,
                    accountNumber: paymentMethod.account_number.replace(/(.{4}).*(.{4})/, '$1****$2')
                }
            }
        });

    } catch (error) {
        console.error('Erreur lors de la demande de retrait:', error);
        res.status(500).json({
            error: 'Erreur lors de la demande de retrait'
        });
    }
});

// Route pour obtenir l'historique des paiements
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE t.user_id = ?';
        let params = [req.user.id];

        if (type) {
            whereClause += ' AND t.type = ?';
            params.push(type);
        }

        const transactions = await db.all(
            `SELECT 
                t.*,
                pm.type as payment_method_type,
                pm.account_number
             FROM transactions t
             LEFT JOIN payment_methods pm ON t.payment_method_id = pm.id
             ${whereClause}
             ORDER BY t.created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Masquer les numéros de compte
        const maskedTransactions = transactions.map(transaction => ({
            ...transaction,
            account_number: transaction.account_number ? 
                transaction.account_number.replace(/(.{4}).*(.{4})/, '$1****$2') : 
                null
        }));

        const total = await db.get(
            `SELECT COUNT(*) as count FROM transactions t ${whereClause}`,
            params
        );

        res.json({
            transactions: maskedTransactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique des paiements:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération de l\'historique des paiements'
        });
    }
});

// Route pour obtenir les statistiques de paiement
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await db.get(
            `SELECT 
                SUM(CASE WHEN type = 'reward' THEN amount ELSE 0 END) as total_earned,
                SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN ABS(amount) ELSE 0 END) as total_withdrawn,
                SUM(CASE WHEN type = 'withdrawal' AND status = 'pending' THEN ABS(amount) ELSE 0 END) as pending_withdrawals,
                SUM(CASE WHEN type = 'subscription' THEN ABS(amount) ELSE 0 END) as total_spent_subscriptions
             FROM transactions 
             WHERE user_id = ?`,
            [req.user.id]
        );

        res.json({
            totalEarned: stats.total_earned || 0,
            totalWithdrawn: stats.total_withdrawn || 0,
            pendingWithdrawals: stats.pending_withdrawals || 0,
            totalSpentSubscriptions: stats.total_spent_subscriptions || 0,
            currentBalance: parseFloat((await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id])).balance)
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques de paiement:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des statistiques de paiement'
        });
    }
});

module.exports = router;
