const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateSurveyAnswer } = require('../middleware/validation');
const { Survey } = require('../models');
const DatabaseFactory = require('../models/databaseFactory');

// Route pour obtenir tous les thèmes disponibles
router.get('/themes', authenticateToken, async (req, res) => {
    try {
        const db = DatabaseFactory.create();
        const user = await db.get('users', { id: req.user.id });

        if (!user.account_monetized) {
            return res.status(403).json({
                error: 'ACCOUNT_NOT_MONETIZED',
                message: 'Veuillez monétiser votre compte pour accéder aux sondages.'
            });
        }

        // Obtenir tous les thèmes actifs
        const allThemes = await db.all('survey_themes', { is_active: true });

        // Filtrer seulement ceux qui ont des questions
        const themesWithQuestions = [];
        for (const theme of allThemes) {
            const questions = await db.all('survey_questions', { theme_id: theme.id });
            if (questions && questions.length > 0) {
                themesWithQuestions.push(theme);
            }
        }

        const themes = themesWithQuestions;
        
        // Pour chaque thème, ajouter des informations sur le statut de l'utilisateur
        const themesWithStatus = await Promise.all(themes.map(async (theme) => {
            // Vérifier si l'utilisateur peut commencer ce thème
            const canStart = await Survey.canUserStartSurvey(req.user.id, theme.id);
            
            // Obtenir les statistiques du thème
            const stats = await Survey.getThemeStats(theme.id);
            
            // Vérifier si l'utilisateur a une tentative en cours
            const db = DatabaseFactory.create();
            const ongoingAttempt = await db.get('survey_attempts', {
                user_id: req.user.id,
                theme_id: theme.id,
                is_completed: false
            });

            // Obtenir la meilleure tentative de l'utilisateur
            const userAttempts = await db.all('survey_attempts', {
                user_id: req.user.id,
                theme_id: theme.id,
                is_completed: true
            });

            const bestAttempt = userAttempts.length > 0
                ? userAttempts.reduce((best, current) =>
                    current.score > best.score ? current : best
                  )
                : null;

            return {
                ...theme,
                canStart: canStart.canStart,
                reason: canStart.reason,
                hasOngoingAttempt: !!ongoingAttempt,
                ongoingAttemptId: ongoingAttempt?.id,
                bestScore: bestAttempt?.score || 0,
                hasPassed: !!bestAttempt?.is_passed,
                earnedAmount: bestAttempt?.reward_amount || 0,
                stats
            };
        }));

        res.json(themesWithStatus);

    } catch (error) {
        console.error('Erreur lors de la récupération des thèmes:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des thèmes'
        });
    }
});

// Route pour obtenir les questions d'un thème
router.get('/:themeId/questions', authenticateToken, async (req, res) => {
    try {
        const themeId = parseInt(req.params.themeId);
        const db = DatabaseFactory.create();

        // Vérifier que le thème existe
        const theme = await db.get('survey_themes', { id: themeId });
        if (!theme) {
            return res.status(404).json({
                error: 'Thème non trouvé'
            });
        }

        // Récupérer les questions du thème
        const questions = await db.all('survey_questions',
            { theme_id: themeId },
            'id, question_text, question_type, options, points, order_index',
            { column: 'order_index', ascending: true }
        );

        res.json({
            success: true,
            questions: questions
        });

    } catch (error) {
        console.error('❌ Erreur récupération questions:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération des questions'
        });
    }
});

// Route pour commencer un nouveau sondage
router.post('/themes/:themeId/start', authenticateToken, async (req, res) => {
    try {
        const themeId = parseInt(req.params.themeId);

        // Vérifier que le thème existe
        const theme = await Survey.getThemeById(themeId);
        if (!theme) {
            return res.status(404).json({
                error: 'Thème non trouvé'
            });
        }

        // Vérifier si l'utilisateur peut commencer ce sondage
        const canStart = await Survey.canUserStartSurvey(req.user.id, themeId);
        if (!canStart.canStart) {
            return res.status(400).json({
                error: canStart.reason
            });
        }

        // Créer une nouvelle tentative
        const attemptId = await Survey.createAttempt(req.user.id, themeId);

        // Obtenir les questions du thème
        const questions = await Survey.getQuestionsByTheme(themeId);

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'SURVEY_STARTED', req.ip, req.get('User-Agent'), `Theme: ${theme.name}`]
        );

        res.json({
            message: 'Sondage commencé avec succès',
            attemptId,
            theme,
            questions,
            totalQuestions: questions.length
        });

    } catch (error) {
        console.error('Erreur lors du démarrage du sondage:', error);
        res.status(500).json({
            error: 'Erreur lors du démarrage du sondage'
        });
    }
});

// Route pour reprendre un sondage en cours
router.get('/attempts/:attemptId', authenticateToken, async (req, res) => {
    try {
        const attemptId = parseInt(req.params.attemptId);

        // Obtenir la tentative
        const attempt = await Survey.getAttemptById(attemptId);
        if (!attempt) {
            return res.status(404).json({
                error: 'Tentative non trouvée'
            });
        }

        // Vérifier que la tentative appartient à l'utilisateur
        if (attempt.user_id !== req.user.id) {
            return res.status(403).json({
                error: 'Accès non autorisé'
            });
        }

        // Si la tentative est déjà terminée
        if (attempt.is_completed) {
            return res.status(400).json({
                error: 'Cette tentative est déjà terminée'
            });
        }

        // Obtenir les questions du thème
        const questions = await Survey.getQuestionsByTheme(attempt.theme_id);

        // Obtenir les réponses déjà données
        const answers = await db.all(
            'SELECT question_id, user_answer FROM user_answers WHERE attempt_id = ?',
            [attemptId]
        );

        res.json({
            attempt,
            questions,
            answers,
            totalQuestions: questions.length,
            answeredQuestions: answers.length
        });

    } catch (error) {
        console.error('Erreur lors de la récupération de la tentative:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération de la tentative'
        });
    }
});

// Route pour soumettre une réponse
router.post('/attempts/:attemptId/answer', authenticateToken, validateSurveyAnswer, async (req, res) => {
    try {
        const attemptId = parseInt(req.params.attemptId);
        const { questionId, answer } = req.body;

        // Vérifier que la tentative existe et appartient à l'utilisateur
        const attempt = await Survey.getAttemptById(attemptId);
        if (!attempt || attempt.user_id !== req.user.id) {
            return res.status(404).json({
                error: 'Tentative non trouvée'
            });
        }

        // Vérifier que la tentative n'est pas terminée
        if (attempt.is_completed) {
            return res.status(400).json({
                error: 'Cette tentative est déjà terminée'
            });
        }

        // Vérifier que la question appartient au bon thème
        const question = await db.get(
            'SELECT * FROM questions WHERE id = ? AND theme_id = ?',
            [questionId, attempt.theme_id]
        );

        if (!question) {
            return res.status(400).json({
                error: 'Question invalide pour ce thème'
            });
        }

        // Enregistrer la réponse
        const isCorrect = await Survey.saveAnswer(attemptId, questionId, answer);

        // Calculer le score actuel
        const scoreData = await Survey.calculateScore(attemptId);

        res.json({
            message: 'Réponse enregistrée',
            isCorrect,
            currentScore: scoreData.score,
            totalAnswered: scoreData.totalAnswered,
            totalQuestions: scoreData.totalQuestions
        });

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement de la réponse:', error);
        res.status(500).json({
            error: 'Erreur lors de l\'enregistrement de la réponse'
        });
    }
});

// Route pour finaliser un sondage
router.post('/attempts/:attemptId/complete', authenticateToken, async (req, res) => {
    try {
        const attemptId = parseInt(req.params.attemptId);

        // Vérifier que la tentative existe et appartient à l'utilisateur
        const attempt = await Survey.getAttemptById(attemptId);
        if (!attempt || attempt.user_id !== req.user.id) {
            return res.status(404).json({
                error: 'Tentative non trouvée'
            });
        }

        // Vérifier que la tentative n'est pas déjà terminée
        if (attempt.is_completed) {
            return res.status(400).json({
                error: 'Cette tentative est déjà terminée'
            });
        }

        // Vérifier que toutes les questions ont été répondues
        const scoreData = await Survey.calculateScore(attemptId);
        if (scoreData.totalAnswered < 10) {
            return res.status(400).json({
                error: 'Toutes les questions doivent être répondues avant de finaliser'
            });
        }

        // Finaliser la tentative
        const result = await Survey.completeAttempt(attemptId);

        // Obtenir les réponses détaillées
        const answers = await Survey.getAttemptAnswers(attemptId);

        // Log de l'activité
        await db.run(
            'INSERT INTO activity_logs (user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?)',
            [req.user.id, 'SURVEY_COMPLETED', req.ip, req.get('User-Agent'), 
             `Theme: ${attempt.theme_name}, Score: ${result.score}/10, Passed: ${result.isPassed}`]
        );

        res.json({
            message: 'Sondage terminé avec succès',
            result: {
                score: result.score,
                totalQuestions: result.totalQuestions,
                isPassed: result.isPassed,
                rewardAmount: result.rewardAmount,
                successRate: ((result.score / result.totalQuestions) * 100).toFixed(2)
            },
            answers
        });

    } catch (error) {
        console.error('Erreur lors de la finalisation du sondage:', error);
        res.status(500).json({
            error: 'Erreur lors de la finalisation du sondage'
        });
    }
});

// Route pour obtenir le classement
router.get('/leaderboard', authenticateToken, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const leaderboard = await Survey.getLeaderboard(parseInt(limit));

        res.json(leaderboard);

    } catch (error) {
        console.error('Erreur lors de la récupération du classement:', error);
        res.status(500).json({
            error: 'Erreur lors de la récupération du classement'
        });
    }
});

// Route pour soumettre un sondage complet
router.post('/submit', authenticateToken, async (req, res) => {
    try {
        const { themeId, answers } = req.body;
        const db = DatabaseFactory.create();

        // Vérifier que le thème existe
        const theme = await db.get('survey_themes', { id: themeId });
        if (!theme) {
            return res.status(404).json({
                error: 'Thème non trouvé'
            });
        }

        // Récupérer les questions avec les bonnes réponses
        const questions = await db.all('survey_questions',
            { theme_id: themeId },
            'id, correct_answer, points'
        );

        // Calculer le score
        let score = 0;
        let maxScore = 0;
        let correctAnswers = 0;

        for (const question of questions) {
            maxScore += question.points;
            const userAnswer = answers.find(a => a.questionId === question.id);

            if (userAnswer && userAnswer.answer === question.correct_answer) {
                score += question.points;
                correctAnswers++;
            }
        }

        // Déterminer si le sondage est réussi (70% minimum)
        const successRate = (score / maxScore) * 100;
        const isPassed = successRate >= 70;
        const rewardAmount = isPassed ? theme.reward_amount : 0;

        // Créer une tentative de sondage
        const attemptData = {
            user_id: req.user.id,
            theme_id: themeId,
            is_completed: true,
            is_passed: isPassed,
            score: score,
            reward_amount: rewardAmount,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString()
        };

        const attempt = await db.insert('survey_attempts', attemptData);

        // Si réussi, ajouter la récompense au solde de l'utilisateur
        if (isPassed && rewardAmount > 0) {
            const user = await db.get('users', { id: req.user.id });
            const newBalance = (user.balance || 0) + rewardAmount;

            await db.update('users', { id: req.user.id }, { balance: newBalance });

            // Créer une transaction
            await db.create('transactions', {
                user_id: req.user.id,
                type: 'survey_reward',
                amount: rewardAmount,
                status: 'completed',
                description: `Récompense sondage: ${theme.name}`,
                created_at: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            score: score,
            maxScore: maxScore,
            correctAnswers: correctAnswers,
            totalQuestions: questions.length,
            successRate: Math.round(successRate),
            isPassed: isPassed,
            reward: rewardAmount,
            message: isPassed ?
                `Félicitations ! Vous avez réussi le sondage et gagné ${rewardAmount} FCFA !` :
                `Sondage terminé. Score: ${score}/${maxScore}. Essayez d'obtenir au moins 70% pour gagner la récompense.`
        });

    } catch (error) {
        console.error('❌ Erreur soumission sondage:', error);
        res.status(500).json({
            error: 'Erreur lors de la soumission du sondage'
        });
    }
});

module.exports = router;
