const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configuration de la base de données
const dbPath = path.join(__dirname, '../database/geopoll.db');
const db = {
    all: (query, params = []) => {
        return new Promise((resolve, reject) => {
            const database = new sqlite3.Database(dbPath);
            database.all(query, params, (err, rows) => {
                database.close();
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },
    get: (query, params = []) => {
        return new Promise((resolve, reject) => {
            const database = new sqlite3.Database(dbPath);
            database.get(query, params, (err, row) => {
                database.close();
                if (err) reject(err);
                else resolve(row);
            });
        });
    },
    run: (query, params = []) => {
        return new Promise((resolve, reject) => {
            const database = new sqlite3.Database(dbPath);
            database.run(query, params, function(err) {
                database.close();
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    }
};

// ===== ROUTES PUBLIQUES (UTILISATEURS) =====

// Obtenir tous les quiz planifiés disponibles
router.get('/', async (req, res) => {
    try {
        const now = new Date().toISOString();
        
        const quizzes = await db.all(`
            SELECT 
                qs.*,
                st.name as theme_name,
                st.icon as theme_icon,
                st.color as theme_color,
                (qs.max_participants - qs.current_participants) as available_spots,
                CASE 
                    WHEN qs.start_date > ? THEN 'upcoming'
                    WHEN qs.start_date <= ? AND qs.end_date > ? THEN 'active'
                    ELSE 'ended'
                END as status
            FROM quiz_schedules qs
            JOIN survey_themes st ON qs.survey_theme_id = st.id
            WHERE qs.is_active = 1
            ORDER BY 
                qs.is_featured DESC,
                qs.start_date ASC
        `, [now, now, now]);

        // Grouper par statut
        const groupedQuizzes = {
            featured: quizzes.filter(q => q.is_featured && q.status !== 'ended'),
            upcoming: quizzes.filter(q => q.status === 'upcoming' && !q.is_featured),
            active: quizzes.filter(q => q.status === 'active' && !q.is_featured),
            ended: quizzes.filter(q => q.status === 'ended').slice(0, 5) // Derniers 5 terminés
        };

        res.json({
            quizzes: groupedQuizzes,
            total: quizzes.length,
            message: 'Quiz planifiés récupérés avec succès'
        });

    } catch (error) {
        console.error('Erreur récupération quiz planifiés:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir les détails d'un quiz spécifique
router.get('/:id', async (req, res) => {
    try {
        const quizId = req.params.id;
        const now = new Date().toISOString();

        const quiz = await db.get(`
            SELECT 
                qs.*,
                st.name as theme_name,
                st.description as theme_description,
                st.icon as theme_icon,
                st.color as theme_color,
                st.questions,
                (qs.max_participants - qs.current_participants) as available_spots,
                CASE 
                    WHEN qs.start_date > ? THEN 'upcoming'
                    WHEN qs.start_date <= ? AND qs.end_date > ? THEN 'active'
                    ELSE 'ended'
                END as status
            FROM quiz_schedules qs
            JOIN survey_themes st ON qs.survey_theme_id = st.id
            WHERE qs.id = ? AND qs.is_active = 1
        `, [now, now, now, quizId]);

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz non trouvé' });
        }

        // Obtenir les participants inscrits (sans données sensibles)
        const participants = await db.all(`
            SELECT 
                u.first_name,
                u.last_name,
                qr.registered_at,
                qr.participated
            FROM quiz_registrations qr
            JOIN users u ON qr.user_id = u.id
            WHERE qr.quiz_schedule_id = ?
            ORDER BY qr.registered_at ASC
        `, [quizId]);

        quiz.participants = participants;
        quiz.questions = JSON.parse(quiz.questions || '[]');

        res.json({
            quiz,
            message: 'Détails du quiz récupérés avec succès'
        });

    } catch (error) {
        console.error('Erreur récupération détails quiz:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// S'inscrire à un quiz planifié
router.post('/:id/register', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const userId = req.user.id;
        const now = new Date().toISOString();

        // Vérifier que le quiz existe et est disponible
        const quiz = await db.get(`
            SELECT * FROM quiz_schedules 
            WHERE id = ? AND is_active = 1 AND start_date > ?
        `, [quizId, now]);

        if (!quiz) {
            return res.status(404).json({ error: 'Quiz non trouvé ou déjà commencé' });
        }

        // Vérifier s'il reste de la place
        if (quiz.max_participants && quiz.current_participants >= quiz.max_participants) {
            return res.status(400).json({ error: 'Quiz complet, plus de places disponibles' });
        }

        // Vérifier si l'utilisateur n'est pas déjà inscrit
        const existingRegistration = await db.get(`
            SELECT id FROM quiz_registrations 
            WHERE quiz_schedule_id = ? AND user_id = ?
        `, [quizId, userId]);

        if (existingRegistration) {
            return res.status(400).json({ error: 'Vous êtes déjà inscrit à ce quiz' });
        }

        // Inscrire l'utilisateur
        await db.run(`
            INSERT INTO quiz_registrations (quiz_schedule_id, user_id, registered_at)
            VALUES (?, ?, ?)
        `, [quizId, userId, now]);

        // Mettre à jour le nombre de participants
        await db.run(`
            UPDATE quiz_schedules 
            SET current_participants = current_participants + 1
            WHERE id = ?
        `, [quizId]);

        // Créer une notification pour l'utilisateur
        await db.run(`
            INSERT INTO quiz_notifications (quiz_schedule_id, user_id, type, title, message)
            VALUES (?, ?, 'registration', ?, ?)
        `, [
            quizId,
            userId,
            'Inscription confirmée',
            `Vous êtes inscrit au quiz "${quiz.title}". Rendez-vous le ${new Date(quiz.start_date).toLocaleDateString('fr-FR')} à ${new Date(quiz.start_date).toLocaleTimeString('fr-FR')}.`
        ]);

        res.json({
            message: 'Inscription au quiz réussie !',
            quiz: {
                id: quiz.id,
                title: quiz.title,
                start_date: quiz.start_date,
                reward_amount: quiz.reward_amount
            }
        });

    } catch (error) {
        console.error('Erreur inscription quiz:', error);
        res.status(500).json({ error: 'Erreur lors de l\'inscription' });
    }
});

// Se désinscrire d'un quiz
router.delete('/:id/unregister', authenticateToken, async (req, res) => {
    try {
        const quizId = req.params.id;
        const userId = req.user.id;
        const now = new Date().toISOString();

        // Vérifier que le quiz n'a pas encore commencé
        const quiz = await db.get(`
            SELECT * FROM quiz_schedules 
            WHERE id = ? AND start_date > ?
        `, [quizId, now]);

        if (!quiz) {
            return res.status(400).json({ error: 'Impossible de se désinscrire, le quiz a déjà commencé ou n\'existe pas' });
        }

        // Supprimer l'inscription
        const result = await db.run(`
            DELETE FROM quiz_registrations 
            WHERE quiz_schedule_id = ? AND user_id = ?
        `, [quizId, userId]);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Inscription non trouvée' });
        }

        // Mettre à jour le nombre de participants
        await db.run(`
            UPDATE quiz_schedules 
            SET current_participants = current_participants - 1
            WHERE id = ?
        `, [quizId]);

        res.json({
            message: 'Désinscription réussie'
        });

    } catch (error) {
        console.error('Erreur désinscription quiz:', error);
        res.status(500).json({ error: 'Erreur lors de la désinscription' });
    }
});

// Obtenir les quiz auxquels l'utilisateur est inscrit
router.get('/user/registrations', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date().toISOString();

        const registrations = await db.all(`
            SELECT 
                qs.*,
                st.name as theme_name,
                st.icon as theme_icon,
                qr.registered_at,
                qr.participated,
                qr.participation_date,
                CASE 
                    WHEN qs.start_date > ? THEN 'upcoming'
                    WHEN qs.start_date <= ? AND qs.end_date > ? THEN 'active'
                    ELSE 'ended'
                END as status
            FROM quiz_registrations qr
            JOIN quiz_schedules qs ON qr.quiz_schedule_id = qs.id
            JOIN survey_themes st ON qs.survey_theme_id = st.id
            WHERE qr.user_id = ?
            ORDER BY qs.start_date DESC
        `, [now, now, now, userId]);

        res.json({
            registrations,
            total: registrations.length,
            message: 'Inscriptions récupérées avec succès'
        });

    } catch (error) {
        console.error('Erreur récupération inscriptions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ===== ROUTES ADMIN =====

// Créer un nouveau quiz planifié
router.post('/admin/create', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            survey_theme_id,
            title,
            description,
            start_date,
            end_date,
            max_participants,
            reward_amount,
            bonus_reward,
            is_featured,
            difficulty_level,
            estimated_duration
        } = req.body;

        const createdBy = req.user.id;

        const result = await db.run(`
            INSERT INTO quiz_schedules (
                survey_theme_id, title, description, start_date, end_date,
                max_participants, reward_amount, bonus_reward, is_featured,
                difficulty_level, estimated_duration, created_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            survey_theme_id, title, description, start_date, end_date,
            max_participants, reward_amount, bonus_reward || 0, is_featured || 0,
            difficulty_level || 'medium', estimated_duration || 10, createdBy,
            new Date().toISOString()
        ]);

        res.status(201).json({
            message: 'Quiz planifié créé avec succès',
            quiz_id: result.lastID
        });

    } catch (error) {
        console.error('Erreur création quiz planifié:', error);
        res.status(500).json({ error: 'Erreur lors de la création du quiz' });
    }
});

// Obtenir les statistiques des quiz (admin)
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const now = new Date().toISOString();

        const stats = await db.get(`
            SELECT 
                COUNT(*) as total_quizzes,
                SUM(CASE WHEN start_date > ? THEN 1 ELSE 0 END) as upcoming_quizzes,
                SUM(CASE WHEN start_date <= ? AND end_date > ? THEN 1 ELSE 0 END) as active_quizzes,
                SUM(CASE WHEN end_date <= ? THEN 1 ELSE 0 END) as ended_quizzes,
                SUM(current_participants) as total_participants,
                AVG(current_participants) as avg_participants_per_quiz
            FROM quiz_schedules
            WHERE is_active = 1
        `, [now, now, now, now]);

        const registrationStats = await db.get(`
            SELECT 
                COUNT(*) as total_registrations,
                COUNT(DISTINCT user_id) as unique_participants,
                SUM(CASE WHEN participated = 1 THEN 1 ELSE 0 END) as completed_participations
            FROM quiz_registrations
        `);

        res.json({
            quiz_stats: stats,
            registration_stats: registrationStats,
            message: 'Statistiques récupérées avec succès'
        });

    } catch (error) {
        console.error('Erreur récupération statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
