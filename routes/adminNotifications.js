const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const db = require('../models/database');

// Route pour recevoir les notifications de nouvelles inscriptions
router.post('/new-registration', async (req, res) => {
    try {
        const { userId, userEmail, userName, registrationDate, paymentConfirmed } = req.body;

        // Enregistrer la notification dans la base de données
        await db.run(`
            INSERT INTO admin_notifications (
                type, title, message, user_id, data, created_at, is_read
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'NEW_REGISTRATION',
            'Nouvelle inscription',
            `${userName} (${userEmail}) s'est inscrit et a confirmé son paiement`,
            userId,
            JSON.stringify({
                userEmail,
                userName,
                registrationDate,
                paymentConfirmed,
                registrationFee: 2000
            }),
            new Date().toISOString(),
            0
        ]);

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
            [userId, 'REGISTRATION_NOTIFICATION', `Registration notification sent to admin for user ${userName}`]
        );

        console.log(`📧 Notification admin: Nouvelle inscription de ${userName} (${userEmail})`);

        res.json({
            message: 'Notification envoyée à l\'administrateur',
            success: true
        });

    } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification admin:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour récupérer les notifications admin
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const notifications = await db.all(`
            SELECT 
                id, type, title, message, user_id, data, created_at, is_read
            FROM admin_notifications 
            ORDER BY created_at DESC 
            LIMIT 50
        `);

        // Formater les données
        const formattedNotifications = notifications.map(notification => ({
            id: notification.id,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            userId: notification.user_id,
            data: JSON.parse(notification.data || '{}'),
            createdAt: notification.created_at,
            isRead: notification.is_read === 1
        }));

        res.json({
            notifications: formattedNotifications,
            unreadCount: formattedNotifications.filter(n => !n.isRead).length
        });

    } catch (error) {
        console.error('Erreur lors de la récupération des notifications:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour marquer une notification comme lue
router.put('/:id/read', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const notificationId = req.params.id;

        await db.run(
            'UPDATE admin_notifications SET is_read = 1 WHERE id = ?',
            [notificationId]
        );

        res.json({
            message: 'Notification marquée comme lue',
            success: true
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour de la notification:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour marquer toutes les notifications comme lues
router.put('/mark-all-read', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.run('UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0');

        res.json({
            message: 'Toutes les notifications marquées comme lues',
            success: true
        });

    } catch (error) {
        console.error('Erreur lors de la mise à jour des notifications:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
