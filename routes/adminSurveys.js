const express = require('express');
const router = express.Router();
const DatabaseFactory = require('../models/databaseFactory');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Obtenir tous les thèmes de sondage
router.get('/themes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const themes = await db.all('survey_themes', {}, '*', { column: 'created_at', ascending: false });
        
        // Enrichir avec les statistiques
        for (let theme of themes) {
            const questionCount = await db.count('questions', { theme_id: theme.id, is_active: true });
            const attemptCount = await db.count('survey_attempts', { theme_id: theme.id, is_completed: true });
            
            theme.question_count = questionCount;
            theme.attempt_count = attemptCount;
        }
        
        res.json({ themes });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des thèmes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer un nouveau thème
router.post('/themes', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Le nom du thème est requis' });
        }
        
        const db = DatabaseFactory.create();
        
        // Vérifier que le thème n'existe pas déjà
        const existingTheme = await db.get('survey_themes', { name });
        if (existingTheme) {
            return res.status(409).json({ error: 'Un thème avec ce nom existe déjà' });
        }
        
        const theme = await db.insert('survey_themes', {
            name,
            description: description || '',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        });
        
        // Log de l'activité
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'THEME_CREATED',
            details: `Theme "${name}" created`,
            created_at: new Date().toISOString()
        });
        
        res.status(201).json({
            message: 'Thème créé avec succès',
            theme
        });
        
    } catch (error) {
        console.error('Erreur lors de la création du thème:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mettre à jour un thème
router.put('/themes/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const themeId = req.params.id;
        const { name, description, is_active } = req.body;
        const db = DatabaseFactory.create();
        
        // Vérifier que le thème existe
        const theme = await db.get('survey_themes', { id: themeId });
        if (!theme) {
            return res.status(404).json({ error: 'Thème non trouvé' });
        }
        
        const updateData = {
            updated_at: new Date().toISOString()
        };
        
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (is_active !== undefined) updateData.is_active = is_active;
        
        await db.update('survey_themes', updateData, { id: themeId });
        
        // Log de l'activité
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'THEME_UPDATED',
            details: `Theme "${theme.name}" updated`,
            created_at: new Date().toISOString()
        });
        
        res.json({
            message: 'Thème mis à jour avec succès'
        });
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour du thème:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir les questions d'un thème
router.get('/themes/:id/questions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const themeId = req.params.id;
        const db = DatabaseFactory.create();
        
        const questions = await db.all('questions', 
            { theme_id: themeId }, 
            '*',
            { column: 'question_order', ascending: true }
        );
        
        res.json({ questions });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des questions:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer une nouvelle question
router.post('/themes/:id/questions', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const themeId = req.params.id;
        const { question_text, option_a, option_b, option_c, option_d, correct_answer } = req.body;
        
        if (!question_text || !option_a || !option_b || !option_c || !option_d || !correct_answer) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }
        
        if (!['A', 'B', 'C', 'D'].includes(correct_answer.toUpperCase())) {
            return res.status(400).json({ error: 'La réponse correcte doit être A, B, C ou D' });
        }
        
        const db = DatabaseFactory.create();
        
        // Vérifier que le thème existe
        const theme = await db.get('survey_themes', { id: themeId });
        if (!theme) {
            return res.status(404).json({ error: 'Thème non trouvé' });
        }
        
        // Obtenir le prochain ordre de question
        const questionCount = await db.count('questions', { theme_id: themeId });
        
        const question = await db.insert('questions', {
            theme_id: themeId,
            question_text,
            option_a,
            option_b,
            option_c,
            option_d,
            correct_answer: correct_answer.toUpperCase(),
            question_order: questionCount + 1,
            is_active: true,
            created_at: new Date().toISOString()
        });
        
        // Log de l'activité
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'QUESTION_CREATED',
            details: `Question created for theme "${theme.name}"`,
            created_at: new Date().toISOString()
        });
        
        res.status(201).json({
            message: 'Question créée avec succès',
            question
        });
        
    } catch (error) {
        console.error('Erreur lors de la création de la question:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Mettre à jour une question
router.put('/questions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const questionId = req.params.id;
        const { question_text, option_a, option_b, option_c, option_d, correct_answer, is_active } = req.body;
        const db = DatabaseFactory.create();
        
        // Vérifier que la question existe
        const question = await db.get('questions', { id: questionId });
        if (!question) {
            return res.status(404).json({ error: 'Question non trouvée' });
        }
        
        const updateData = {};
        
        if (question_text !== undefined) updateData.question_text = question_text;
        if (option_a !== undefined) updateData.option_a = option_a;
        if (option_b !== undefined) updateData.option_b = option_b;
        if (option_c !== undefined) updateData.option_c = option_c;
        if (option_d !== undefined) updateData.option_d = option_d;
        if (correct_answer !== undefined) {
            if (!['A', 'B', 'C', 'D'].includes(correct_answer.toUpperCase())) {
                return res.status(400).json({ error: 'La réponse correcte doit être A, B, C ou D' });
            }
            updateData.correct_answer = correct_answer.toUpperCase();
        }
        if (is_active !== undefined) updateData.is_active = is_active;
        
        await db.update('questions', updateData, { id: questionId });
        
        // Log de l'activité
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'QUESTION_UPDATED',
            details: `Question ${questionId} updated`,
            created_at: new Date().toISOString()
        });
        
        res.json({
            message: 'Question mise à jour avec succès'
        });
        
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la question:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer une question
router.delete('/questions/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const questionId = req.params.id;
        const db = DatabaseFactory.create();
        
        // Vérifier que la question existe
        const question = await db.get('questions', { id: questionId });
        if (!question) {
            return res.status(404).json({ error: 'Question non trouvée' });
        }
        
        // Désactiver plutôt que supprimer pour préserver l'intégrité des données
        await db.update('questions', { is_active: false }, { id: questionId });
        
        // Log de l'activité
        await db.insert('activity_logs', {
            user_id: req.user.id,
            action: 'QUESTION_DELETED',
            details: `Question ${questionId} deleted`,
            created_at: new Date().toISOString()
        });
        
        res.json({
            message: 'Question supprimée avec succès'
        });
        
    } catch (error) {
        console.error('Erreur lors de la suppression de la question:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Obtenir les statistiques des sondages
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        
        const totalThemes = await db.count('survey_themes', { is_active: true });
        const totalQuestions = await db.count('questions', { is_active: true });
        const totalAttempts = await db.count('survey_attempts', { is_completed: true });
        const successfulAttempts = await db.count('survey_attempts', { is_completed: true, is_passed: true });
        
        res.json({
            totalThemes,
            totalQuestions,
            totalAttempts,
            successfulAttempts,
            successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts * 100).toFixed(2) : 0
        });
        
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router;
