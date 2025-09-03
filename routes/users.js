const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validatePaymentMethod } = require('../middleware/validation');
const DatabaseFactory = require('../models/databaseFactory');

// Route pour obtenir l'historique des sondages
router.get('/survey-history', authenticateToken, async (req, res) => {
    try {
        const history = await req.user.getSurveyHistory();
        res.json(history);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'historique:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération de l\'historique'
        });
    }
});

// Route pour obtenir les moyens de paiement
router.get('/payment-methods', authenticateToken, async (req, res) => {
    try {
        const paymentMethods = await req.user.getPaymentMethods();
        
        // Masquer partiellement les numéros de compte pour la sécurité
        const maskedMethods = paymentMethods.map(method => ({
            ...method,
            account_number: method.account_number.replace(/(.{4}).*(.{4})/, '$1****$2')
        }));

        res.json(maskedMethods);
    } catch (error) {
        console.error('Erreur lors de la récupération des moyens de paiement:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des moyens de paiement'
        });
    }
});

// Route pour ajouter un moyen de paiement
router.post('/payment-methods', authenticateToken, validatePaymentMethod, async (req, res) => {
    try {
        const { type, accountNumber, accountName, isDefault } = req.body;

        // Si c'est le moyen de paiement par défaut, désactiver les autres
        if (isDefault) {
            await db.run(
                'UPDATE payment_methods SET is_default = 0 WHERE user_id = ?',
                [req.user.id]
            );
        }

        // Ajouter le nouveau moyen de paiement
        const result = await db.run(
            'INSERT INTO payment_methods (user_id, type, account_number, account_name, is_default) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, type, accountNumber, accountName, isDefault ? 1 : 0]
        );

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'PAYMENT_METHOD_ADDED', req.ip, req.get('User-Agent'), `Type: ${type}`]
        );

        res.status(201).json({
            message: 'Moyen de paiement ajouté avec succès',
            id: result.id
        });

    } catch (error) {
        console.error('Erreur lors de l\'ajout du moyen de paiement:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'ajout du moyen de paiement'
        });
    }
});

// Route pour supprimer un moyen de paiement
router.delete('/payment-methods/:id', authenticateToken, async (req, res) => {
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

        // Supprimer le moyen de paiement
        await db.run(
            'UPDATE payment_methods SET is_active = 0 WHERE id = ?',
            [methodId]
        );

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'PAYMENT_METHOD_DELETED', req.ip, req.get('User-Agent'), `Method ID: ${methodId}`]
        );

        res.json({
            message: 'Moyen de paiement supprimé avec succès'
        });

    } catch (error) {
        console.error('Erreur lors de la suppression du moyen de paiement:', error);
        res.status(500).json({
            error: 'Erreur lors de la suppression du moyen de paiement'
        });
    }
});

// Route pour définir un moyen de paiement par défaut
router.put('/payment-methods/:id/default', authenticateToken, async (req, res) => {
    try {
        const methodId = req.params.id;

        // Vérifier que le moyen de paiement appartient à l'utilisateur
        const method = await db.get(
            'SELECT * FROM payment_methods WHERE id = ? AND user_id = ? AND is_active = 1',
            [methodId, req.user.id]
        );

        if (!method) {
            return res.status(404).json({
                error: 'Moyen de paiement non trouvé'
            });
        }

        // Désactiver tous les moyens de paiement par défaut
        await db.run(
            'UPDATE payment_methods SET is_default = 0 WHERE user_id = ?',
            [req.user.id]
        );

        // Activer le nouveau par défaut
        await db.run(
            'UPDATE payment_methods SET is_default = 1 WHERE id = ?',
            [methodId]
        );

        res.json({
            message: 'Moyen de paiement par défaut mis à jour'
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour du moyen de paiement par défaut:', error);
        res.status(500).json({
            error: 'Erreur lors de la mise à jour du moyen de paiement par défaut'
        });
    }
});

// Route pour obtenir les transactions
router.get('/transactions', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE user_id = ?';
        let params = [req.user.id];

        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        const transactions = await db.all(
            `SELECT * FROM transactions 
             ${whereClause}
             ORDER BY created_at DESC 
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const total = await db.get(
            `SELECT COUNT(*) as count FROM transactions ${whereClause}`,
            params
        );

        res.json({
            transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total.count,
                pages: Math.ceil(total.count / limit)
            }
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des transactions:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des transactions'
        });
    }
});

// Route pour obtenir le solde actuel
router.get('/balance', authenticateToken, async (req, res) => {
    try {
        // Récupérer le solde depuis la base de données pour s'assurer qu'il est à jour
        const user = await db.get('SELECT balance FROM users WHERE id = ?', [req.user.id]);
        
        res.json({
            balance: parseFloat(user.balance),
            currency: process.env.CURRENCY || 'FCFA'
        });

    } catch (error) {
        console.error('Erreur lors de la récupération du solde:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération du solde'
        });
    }
});

// Route pour obtenir les statistiques détaillées
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const stats = await req.user.getStats();
        
        // Statistiques par thème
        const themeStats = await db.all(
            `SELECT 
                st.name as theme_name,
                COUNT(sa.id) as attempts,
                SUM(CASE WHEN sa.is_passed = 1 THEN 1 ELSE 0 END) as passed,
                SUM(sa.reward_amount) as earnings
             FROM survey_themes st
             LEFT JOIN survey_attempts sa ON st.id = sa.theme_id AND sa.user_id = ? AND sa.is_completed = 1
             GROUP BY st.id, st.name
             ORDER BY st.name`,
            [req.user.id]
        );

        res.json({
            overall: stats,
            byTheme: themeStats
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des statistiques'
        });
    }
});

module.exports = router;
