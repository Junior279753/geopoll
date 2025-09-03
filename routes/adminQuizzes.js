const express = require('express');
const router = express.Router();
const DatabaseFactory = require('../models/databaseFactory');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Obtenir tous les quiz programmés
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const quizzes = await db.all('quiz_schedules', {}, '*', { column: 'created_at', ascending: false });
        
        // Enrichir avec les noms des thèmes
        for (let quiz of quizzes) {
            const theme = await db.get('survey_themes', { id: quiz.survey_theme_id });
            quiz.theme_name = theme ? theme.name : 'Thème inconnu';
            
            // Calculer le statut
            const now = new Date();
            const startDate = new Date(quiz.start_date);
            const endDate = new Date(quiz.end_date);
            
            if (now < startDate) {
                quiz.status = 'upcoming';
            } else if (now >= startDate && now <= endDate) {
                quiz.status = 'active';
            } else {
                quiz.status = 'ended';
            }
        }
        
        res.json({ quizzes });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des quiz:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer un nouveau quiz programmé
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
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
        
        // Validation des champs requis
        if (!survey_theme_id || !title || !start_date || !end_date || !reward_amount) {
            return res.status(400).json({ 
                error: 'Les champs theme_id, title, start_date, end_date et reward_amount sont requis' 
            });
        }
        
        // Validation des dates
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        const now = new Date();
        
        if (startDate <= now) {
            return res.status(400).json({ error: 'La date de début doit être dans le futur' });
        }
        
        if (endDate <= startDate) {
            return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
        }
        
        const db = DatabaseFactory.create();
        
        // Vérifier que le thème existe
        const theme = await db.get('survey_themes', { id: survey_theme_id, is_active: true });
        if (!theme) {
            return res.status(404).json({ error: 'Thème non trouvé ou inactif' });
        }
        
        // Vérifier qu'il y a assez de questions pour le thème
        const questionCount = await db.count('questions', { theme_id: survey_theme_id, is_active: true });
        if (questionCount < 10) {
            return res.status(400).json({ 
                error: `Le thème doit avoir au moins 10 questions actives (actuellement: ${questionCount})` 
            });
        }
        
        const quiz = await db.insert('quiz_schedules', {
            survey_theme_id,
            title,
            description: description || '',
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString(),
            max_participants: max_participants || null,
            reward_amount: parseFloat(reward_amount),
            bonus_reward: bonus_reward ? parseFloat(bonus_reward) : 0,
            is_featured: is_featured || false,
            difficulty_level: difficulty_level || 'medium',
            estimated_duration: estimated_duration || 10,
            created_by: req.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        // Log de l'activité
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'QUIZ_CREATED',
            details: `Quiz "${title}" created for theme "${theme.name}"`,
            created_at: new Date().toISOString()
        });
        
        res.status(201).json({
            message: 'Quiz créé avec succès',
            quiz
        });
        
    } catch (error) {
        console.error('Erreur lors de la création du quiz:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mettre à jour un quiz
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const quizId = req.params.id;
        const {
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
        
        const db = DatabaseFactory.create();
        
        // Vérifier que le quiz existe
        const quiz = await db.get('quiz_schedules', { id: quizId });
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz non trouvé' });
        }
        
        // Vérifier que le quiz n'a pas encore commencé
        const now = new Date();
        const startDate = new Date(quiz.start_date);
        
        if (now >= startDate) {
            return res.status(400).json({ error: 'Impossible de modifier un quiz qui a déjà commencé' });
        }
        
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (start_date !== undefined) {
            const newStartDate = new Date(start_date);
            if (newStartDate <= now) {
                return res.status(400).json({ error: 'La nouvelle date de début doit être dans le futur' });
            }
            updateData.start_date = newStartDate.toISOString();
        }
        if (end_date !== undefined) {
            const newEndDate = new Date(end_date);
            const checkStartDate = start_date ? new Date(start_date) : new Date(quiz.start_date);
            if (newEndDate <= checkStartDate) {
                return res.status(400).json({ error: 'La date de fin doit être après la date de début' });
            }
            updateData.end_date = newEndDate.toISOString();
        }
        if (max_participants !== undefined) updateData.max_participants = max_participants;
        if (reward_amount !== undefined) updateData.reward_amount = parseFloat(reward_amount);
        if (bonus_reward !== undefined) updateData.bonus_reward = parseFloat(bonus_reward);
        if (is_featured !== undefined) updateData.is_featured = is_featured;
        if (difficulty_level !== undefined) updateData.difficulty_level = difficulty_level;
        if (estimated_duration !== undefined) updateData.estimated_duration = estimated_duration;
        
        await db.update('quiz_schedules', updateData, { id: quizId });
        
        // Log de l'activité
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'QUIZ_UPDATED',
            details: `Quiz "${quiz.title}" updated`,
            created_at: new Date().toISOString()
        });
        
        res.json({
            message: 'Quiz mis à jour avec succès'
        });
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour du quiz:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un quiz
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const quizId = req.params.id;
        const db = DatabaseFactory.create();
        
        // Vérifier que le quiz existe
        const quiz = await db.get('quiz_schedules', { id: quizId });
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz non trouvé' });
        }
        
        // Vérifier que le quiz n'a pas encore commencé
        const now = new Date();
        const startDate = new Date(quiz.start_date);
        
        if (now >= startDate) {
            return res.status(400).json({ error: 'Impossible de supprimer un quiz qui a déjà commencé' });
        }
        
        await db.delete('quiz_schedules', { id: quizId });
        
        // Log de l'activité
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'QUIZ_DELETED',
            details: `Quiz "${quiz.title}" deleted`,
            created_at: new Date().toISOString()
        });
        
        res.json({
            message: 'Quiz supprimé avec succès'
        });
        
    } catch (error) {
        console.error('Erreur lors de la suppression du quiz:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir les statistiques d'un quiz
router.get('/:id/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const quizId = req.params.id;
        const db = DatabaseFactory.create();
        
        // Vérifier que le quiz existe
        const quiz = await db.get('quiz_schedules', { id: quizId });
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz non trouvé' });
        }
        
        // Obtenir les tentatives pour ce quiz (basé sur le thème et les dates)
        const attempts = await db.all('survey_attempts', {
            theme_id: quiz.survey_theme_id,
            is_completed: true
        });
        
        // Filtrer par dates du quiz
        const startDate = new Date(quiz.start_date);
        const endDate = new Date(quiz.end_date);
        
        const quizAttempts = attempts.filter(attempt => {
            const attemptDate = new Date(attempt.started_at);
            return attemptDate >= startDate && attemptDate <= endDate;
        });
        
        const totalParticipants = quizAttempts.length;
        const successfulParticipants = quizAttempts.filter(a => a.is_passed).length;
        const totalRewards = quizAttempts.reduce((sum, a) => sum + (parseFloat(a.reward_amount) || 0), 0);
        
        res.json({
            quiz: {
                id: quiz.id,
                title: quiz.title,
                start_date: quiz.start_date,
                end_date: quiz.end_date,
                max_participants: quiz.max_participants
            },
            stats: {
                totalParticipants,
                successfulParticipants,
                successRate: totalParticipants > 0 ? (successfulParticipants / totalParticipants * 100).toFixed(2) : 0,
                totalRewards,
                averageReward: totalParticipants > 0 ? (totalRewards / totalParticipants).toFixed(2) : 0
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques du quiz:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
