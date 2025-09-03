const DatabaseFactory = require('./databaseFactory');

class SupabaseSurvey {
    // Obtenir tous les thèmes actifs
    static async getActiveThemes() {
        const db = DatabaseFactory.create();
        return await db.all('survey_themes', { is_active: true }, '*', { column: 'name', ascending: true });
    }

    // Obtenir un thème par ID
    static async getThemeById(id) {
        const db = DatabaseFactory.create();
        return await db.get('survey_themes', { id, is_active: true });
    }

    // Obtenir les questions d'un thème
    static async getQuestionsByTheme(themeId) {
        const db = DatabaseFactory.create();
        return await db.all('questions', 
            { theme_id: themeId, is_active: true }, 
            'id, question_text, option_a, option_b, option_c, option_d, question_order',
            { column: 'question_order', ascending: true }
        );
    }

    // Obtenir une question avec sa réponse correcte (pour validation)
    static async getQuestionWithAnswer(questionId) {
        const db = DatabaseFactory.create();
        return await db.get('questions', { id: questionId });
    }

    // Créer une nouvelle tentative de sondage
    static async createAttempt(userId, themeId, ipAddress = null, userAgent = null) {
        const db = DatabaseFactory.create();
        
        const attemptData = {
            user_id: userId,
            theme_id: themeId,
            ip_address: ipAddress,
            user_agent: userAgent,
            started_at: new Date().toISOString()
        };

        return await db.insert('survey_attempts', attemptData);
    }

    // Obtenir une tentative par ID
    static async getAttemptById(attemptId) {
        const db = DatabaseFactory.create();
        const attempt = await db.get('survey_attempts', { id: attemptId });
        
        if (attempt) {
            // Enrichir avec le nom du thème
            const theme = await db.get('survey_themes', { id: attempt.theme_id });
            attempt.theme_name = theme ? theme.name : 'Thème inconnu';
        }
        
        return attempt;
    }

    // Enregistrer une réponse utilisateur
    static async saveAnswer(attemptId, questionId, userAnswer) {
        const db = DatabaseFactory.create();
        
        // Obtenir la bonne réponse
        const question = await SupabaseSurvey.getQuestionWithAnswer(questionId);
        if (!question) {
            throw new Error('Question non trouvée');
        }

        const isCorrect = userAnswer.toUpperCase() === question.correct_answer;

        // Vérifier si une réponse existe déjà pour cette question dans cette tentative
        const existingAnswer = await db.get('user_answers', { 
            attempt_id: attemptId, 
            question_id: questionId 
        });

        if (existingAnswer) {
            // Mettre à jour la réponse existante
            return await db.update('user_answers', 
                {
                    selected_answer: userAnswer.toUpperCase(),
                    is_correct: isCorrect,
                    answered_at: new Date().toISOString()
                },
                { id: existingAnswer.id }
            );
        } else {
            // Créer une nouvelle réponse
            const answerData = {
                attempt_id: attemptId,
                question_id: questionId,
                selected_answer: userAnswer.toUpperCase(),
                is_correct: isCorrect,
                answered_at: new Date().toISOString()
            };
            
            return await db.insert('user_answers', answerData);
        }
    }

    // Calculer le score d'une tentative
    static async calculateScore(attemptId) {
        const db = DatabaseFactory.create();
        const answers = await db.all('user_answers', { attempt_id: attemptId });
        
        const totalAnswered = answers.length;
        const correctAnswers = answers.filter(answer => answer.is_correct).length;

        return {
            score: correctAnswers,
            totalAnswered,
            totalQuestions: 10
        };
    }

    // Finaliser une tentative de sondage
    static async completeAttempt(attemptId) {
        const db = DatabaseFactory.create();
        
        const scoreData = await SupabaseSurvey.calculateScore(attemptId);
        const isPassed = scoreData.score === 10;
        const rewardAmount = isPassed ? parseFloat(process.env.REWARD_AMOUNT) || 22500 : 0;

        // Mettre à jour la tentative
        await db.update('survey_attempts', 
            {
                score: scoreData.score,
                is_completed: true,
                is_passed: isPassed,
                reward_amount: rewardAmount,
                completed_at: new Date().toISOString()
            },
            { id: attemptId }
        );

        // Si l'utilisateur a réussi, ajouter la récompense à son solde
        if (isPassed) {
            const attempt = await SupabaseSurvey.getAttemptById(attemptId);
            
            // Mettre à jour le solde de l'utilisateur
            const user = await db.get('users', { id: attempt.user_id });
            const newBalance = parseFloat(user.balance) + rewardAmount;
            await db.update('users', { balance: newBalance }, { id: attempt.user_id });

            // Enregistrer la transaction
            const transactionData = {
                user_id: attempt.user_id,
                type: 'reward',
                amount: rewardAmount,
                status: 'completed',
                description: `Récompense pour le thème: ${attempt.theme_name}`,
                reference: `REWARD_${attemptId}_${Date.now()}`,
                created_at: new Date().toISOString(),
                processed_at: new Date().toISOString()
            };
            
            await db.insert('transactions', transactionData);
        }

        return {
            ...scoreData,
            isPassed,
            rewardAmount
        };
    }

    // Vérifier si un utilisateur peut commencer un nouveau sondage pour un thème
    static async canUserStartSurvey(userId, themeId) {
        const db = DatabaseFactory.create();
        
        // Vérifier s'il y a une tentative en cours
        const ongoingAttempt = await db.get('survey_attempts', {
            user_id: userId,
            theme_id: themeId,
            is_completed: false
        });

        if (ongoingAttempt) {
            return { canStart: false, reason: 'Une tentative est déjà en cours pour ce thème' };
        }

        // Vérifier si l'utilisateur a déjà réussi ce thème (optionnel - selon les règles)
        const passedAttempt = await db.get('survey_attempts', {
            user_id: userId,
            theme_id: themeId,
            is_passed: true
        });

        if (passedAttempt) {
            return { canStart: false, reason: 'Vous avez déjà réussi ce thème' };
        }

        return { canStart: true };
    }

    // Obtenir les réponses d'une tentative
    static async getAttemptAnswers(attemptId) {
        const db = DatabaseFactory.create();
        const answers = await db.all('user_answers', { attempt_id: attemptId });
        
        // Enrichir avec les questions
        for (let answer of answers) {
            const question = await db.get('questions', { id: answer.question_id });
            answer.question = question;
        }
        
        return answers;
    }

    // Obtenir le classement des utilisateurs
    static async getLeaderboard(limit = 10) {
        const db = DatabaseFactory.create();
        
        // Pour cette requête complexe, nous devrons faire plusieurs requêtes
        const users = await db.all('users', { is_active: true });
        const leaderboard = [];
        
        for (let user of users) {
            const attempts = await db.all('survey_attempts', { 
                user_id: user.id, 
                is_completed: true 
            });
            
            const totalAttempts = attempts.length;
            const passedAttempts = attempts.filter(a => a.is_passed).length;
            const totalEarnings = attempts.reduce((sum, a) => sum + (parseFloat(a.reward_amount) || 0), 0);
            
            leaderboard.push({
                first_name: user.first_name,
                last_name: user.last_name,
                country: user.country,
                total_attempts: totalAttempts,
                passed_attempts: passedAttempts,
                total_earnings: totalEarnings
            });
        }
        
        // Trier par gains totaux puis par tentatives réussies
        leaderboard.sort((a, b) => {
            if (b.total_earnings !== a.total_earnings) {
                return b.total_earnings - a.total_earnings;
            }
            return b.passed_attempts - a.passed_attempts;
        });
        
        return leaderboard.slice(0, limit);
    }

    // Obtenir les statistiques d'un thème
    static async getThemeStats(themeId) {
        const db = DatabaseFactory.create();

        const attempts = await db.all('survey_attempts', {
            theme_id: themeId,
            is_completed: true
        });

        const totalAttempts = attempts.length;
        const successfulAttempts = attempts.filter(a => a.is_passed).length;
        const totalQuestions = await db.count('questions', {
            theme_id: themeId,
            is_active: true
        });

        return {
            totalAttempts,
            successfulAttempts,
            totalQuestions,
            successRate: totalAttempts > 0 ? (successfulAttempts / totalAttempts * 100).toFixed(2) : 0
        };
    }

    // Obtenir les statistiques générales
    static async getGeneralStats() {
        const db = DatabaseFactory.create();

        const totalUsers = await db.count('users', { is_active: true });
        const totalAttempts = await db.count('survey_attempts', { is_completed: true });
        const totalThemes = await db.count('survey_themes', { is_active: true });
        const totalQuestions = await db.count('questions', { is_active: true });

        return {
            totalUsers,
            totalAttempts,
            totalThemes,
            totalQuestions
        };
    }
}

module.exports = SupabaseSurvey;
