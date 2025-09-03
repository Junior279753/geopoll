const db = require('./database');

class Survey {
    // Obtenir tous les thèmes actifs
    static async getActiveThemes() {
        return await db.all(
            'SELECT * FROM survey_themes WHERE is_active = 1 ORDER BY name'
        );
    }

    // Obtenir un thème par ID
    static async getThemeById(id) {
        return await db.get(
            'SELECT * FROM survey_themes WHERE id = ? AND is_active = 1',
            [id]
        );
    }

    // Obtenir les questions d'un thème
    static async getQuestionsByTheme(themeId) {
        return await db.all(
            `SELECT id, question_text, option_a, option_b, option_c, option_d, question_order 
             FROM questions 
             WHERE theme_id = ? AND is_active = 1 
             ORDER BY question_order`,
            [themeId]
        );
    }

    // Obtenir une question spécifique avec la bonne réponse
    static async getQuestionWithAnswer(questionId) {
        return await db.get(
            'SELECT * FROM questions WHERE id = ? AND is_active = 1',
            [questionId]
        );
    }

    // Créer une nouvelle tentative de sondage
    static async createAttempt(userId, themeId) {
        // Vérifier si l'utilisateur a déjà une tentative en cours pour ce thème
        const existingAttempt = await db.get(
            'SELECT id FROM survey_attempts WHERE user_id = ? AND theme_id = ? AND is_completed = 0',
            [userId, themeId]
        );

        if (existingAttempt) {
            return existingAttempt.id;
        }

        // Créer une nouvelle tentative
        const result = await db.run(
            'INSERT INTO survey_attempts (user_id, theme_id) VALUES (?, ?)',
            [userId, themeId]
        );

        return result.id;
    }

    // Obtenir une tentative par ID
    static async getAttemptById(attemptId) {
        return await db.get(
            `SELECT sa.*, st.name as theme_name 
             FROM survey_attempts sa
             JOIN survey_themes st ON sa.theme_id = st.id
             WHERE sa.id = ?`,
            [attemptId]
        );
    }

    // Enregistrer une réponse utilisateur
    static async saveAnswer(attemptId, questionId, userAnswer) {
        // Obtenir la bonne réponse
        const question = await Survey.getQuestionWithAnswer(questionId);
        if (!question) {
            throw new Error('Question non trouvée');
        }

        const isCorrect = userAnswer.toUpperCase() === question.correct_answer;

        // Vérifier si une réponse existe déjà pour cette question dans cette tentative
        const existingAnswer = await db.get(
            'SELECT id FROM user_answers WHERE attempt_id = ? AND question_id = ?',
            [attemptId, questionId]
        );

        if (existingAnswer) {
            // Mettre à jour la réponse existante
            await db.run(
                'UPDATE user_answers SET user_answer = ?, is_correct = ? WHERE id = ?',
                [userAnswer.toUpperCase(), isCorrect, existingAnswer.id]
            );
        } else {
            // Insérer une nouvelle réponse
            await db.run(
                'INSERT INTO user_answers (attempt_id, question_id, user_answer, is_correct) VALUES (?, ?, ?, ?)',
                [attemptId, questionId, userAnswer.toUpperCase(), isCorrect]
            );
        }

        return isCorrect;
    }

    // Calculer le score d'une tentative
    static async calculateScore(attemptId) {
        const result = await db.get(
            `SELECT 
                COUNT(*) as total_answered,
                SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
             FROM user_answers 
             WHERE attempt_id = ?`,
            [attemptId]
        );

        return {
            score: result.correct_answers || 0,
            totalAnswered: result.total_answered || 0,
            totalQuestions: 10
        };
    }

    // Finaliser une tentative de sondage
    static async completeAttempt(attemptId) {
        const scoreData = await Survey.calculateScore(attemptId);
        const isPassed = scoreData.score === 10;
        const rewardAmount = isPassed ? parseFloat(process.env.REWARD_AMOUNT) || 22500 : 0;

        // Mettre à jour la tentative
        await db.run(
            `UPDATE survey_attempts 
             SET score = ?, is_completed = 1, is_passed = ?, reward_amount = ?, completed_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [scoreData.score, isPassed, rewardAmount, attemptId]
        );

        // Si l'utilisateur a réussi, ajouter la récompense à son solde
        if (isPassed) {
            const attempt = await Survey.getAttemptById(attemptId);
            await db.run(
                'UPDATE users SET balance = balance + ? WHERE id = ?',
                [rewardAmount, attempt.user_id]
            );

            // Enregistrer la transaction
            await db.run(
                `INSERT INTO transactions (user_id, type, amount, status, description, reference) 
                 VALUES (?, 'reward', ?, 'completed', ?, ?)`,
                [
                    attempt.user_id, 
                    rewardAmount, 
                    `Récompense pour le thème: ${attempt.theme_name}`,
                    `REWARD_${attemptId}_${Date.now()}`
                ]
            );
        }

        return {
            ...scoreData,
            isPassed,
            rewardAmount
        };
    }

    // Obtenir les réponses d'une tentative
    static async getAttemptAnswers(attemptId) {
        return await db.all(
            `SELECT ua.*, q.question_text, q.correct_answer 
             FROM user_answers ua
             JOIN questions q ON ua.question_id = q.id
             WHERE ua.attempt_id = ?
             ORDER BY q.question_order`,
            [attemptId]
        );
    }

    // Vérifier si un utilisateur peut commencer un nouveau sondage pour un thème
    static async canUserStartSurvey(userId, themeId) {
        // Vérifier s'il y a une tentative en cours
        const ongoingAttempt = await db.get(
            'SELECT id FROM survey_attempts WHERE user_id = ? AND theme_id = ? AND is_completed = 0',
            [userId, themeId]
        );

        if (ongoingAttempt) {
            return { canStart: false, reason: 'Une tentative est déjà en cours pour ce thème' };
        }

        // Vérifier si l'utilisateur a déjà réussi ce thème (optionnel - selon les règles)
        const passedAttempt = await db.get(
            'SELECT id FROM survey_attempts WHERE user_id = ? AND theme_id = ? AND is_passed = 1',
            [userId, themeId]
        );

        if (passedAttempt) {
            return { canStart: false, reason: 'Vous avez déjà réussi ce thème' };
        }

        return { canStart: true };
    }

    // Obtenir les statistiques d'un thème
    static async getThemeStats(themeId) {
        const stats = await db.get(
            `SELECT 
                COUNT(*) as total_attempts,
                SUM(CASE WHEN is_passed = 1 THEN 1 ELSE 0 END) as passed_attempts,
                AVG(score) as average_score
             FROM survey_attempts 
             WHERE theme_id = ? AND is_completed = 1`,
            [themeId]
        );

        return {
            totalAttempts: stats.total_attempts || 0,
            passedAttempts: stats.passed_attempts || 0,
            averageScore: stats.average_score ? parseFloat(stats.average_score).toFixed(2) : 0,
            successRate: stats.total_attempts > 0 ? (stats.passed_attempts / stats.total_attempts * 100).toFixed(2) : 0
        };
    }

    // Obtenir le classement des utilisateurs
    static async getLeaderboard(limit = 10) {
        return await db.all(
            `SELECT 
                u.first_name, u.last_name, u.country,
                COUNT(sa.id) as total_attempts,
                SUM(CASE WHEN sa.is_passed = 1 THEN 1 ELSE 0 END) as passed_attempts,
                SUM(sa.reward_amount) as total_earnings
             FROM users u
             LEFT JOIN survey_attempts sa ON u.id = sa.user_id AND sa.is_completed = 1
             WHERE u.is_active = 1
             GROUP BY u.id
             ORDER BY total_earnings DESC, passed_attempts DESC
             LIMIT ?`,
            [limit]
        );
    }
}

module.exports = Survey;
