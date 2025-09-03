// ===== VARIABLES GLOBALES =====
const API_BASE_URL = '/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;
let selectedDifficulty = 'medium';

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeScheduler();
});

async function initializeScheduler() {
    // Vérifier l'authentification
    if (!authToken) {
        window.location.href = '/index.html';
        return;
    }
    
    try {
        // Charger les données utilisateur
        await loadUserData();
        
        // Configurer l'interface selon le rôle
        setupUserInterface();
        
        // Charger les quiz disponibles
        await loadAvailableQuizzes();
        
        // Configurer les gestionnaires d'événements
        setupEventHandlers();
        
    } catch (error) {
        console.error('Erreur initialisation:', error);
        showNotification('Erreur de chargement', 'error');
    }
}

// ===== GESTION DES DONNÉES UTILISATEUR =====
async function loadUserData() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
        } else {
            throw new Error('Erreur de chargement du profil');
        }
    } catch (error) {
        console.error('Erreur:', error);
        localStorage.removeItem('authToken');
        window.location.href = '/index.html';
    }
}

function setupUserInterface() {
    // Afficher les onglets admin si l'utilisateur est admin
    if (currentUser && currentUser.isAdmin) {
        document.getElementById('createTab').style.display = 'block';
        document.getElementById('statsTab').style.display = 'block';
        loadSurveyThemes();
    }
}

// ===== GESTION DES ONGLETS =====
function showTab(tabName) {
    // Masquer tous les contenus d'onglets
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Désactiver tous les onglets
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Activer l'onglet et le contenu sélectionnés
    document.getElementById(tabName).classList.add('active');
    event.target.closest('.tab').classList.add('active');
    
    // Charger les données spécifiques à l'onglet
    switch(tabName) {
        case 'available':
            loadAvailableQuizzes();
            break;
        case 'my-registrations':
            loadMyRegistrations();
            break;
        case 'stats':
            loadStatistics();
            break;
    }
}

// ===== CHARGEMENT DES QUIZ DISPONIBLES =====
async function loadAvailableQuizzes() {
    const loadingEl = document.getElementById('quizzesLoading');
    const containerEl = document.getElementById('quizzesContainer');
    
    loadingEl.style.display = 'block';
    containerEl.style.display = 'none';
    
    try {
        const response = await fetch(`${API_BASE_URL}/quiz-scheduling`);
        
        if (response.ok) {
            const data = await response.json();
            displayQuizzes(data.quizzes);
        } else {
            throw new Error('Erreur de chargement des quiz');
        }
    } catch (error) {
        console.error('Erreur:', error);
        containerEl.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray-600);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Erreur de chargement des quiz</p>
            </div>
        `;
    } finally {
        loadingEl.style.display = 'none';
        containerEl.style.display = 'block';
    }
}

function displayQuizzes(quizzes) {
    const container = document.getElementById('quizzesContainer');
    let html = '';
    
    // Quiz mis en avant
    if (quizzes.featured && quizzes.featured.length > 0) {
        html += '<h2 style="margin-bottom: 1.5rem; color: var(--gray-900);"><i class="fas fa-star"></i> Quiz Mis en Avant</h2>';
        html += '<div class="quiz-grid">';
        quizzes.featured.forEach(quiz => {
            html += generateQuizCard(quiz, true);
        });
        html += '</div>';
    }
    
    // Quiz à venir
    if (quizzes.upcoming && quizzes.upcoming.length > 0) {
        html += '<h2 style="margin: 2rem 0 1.5rem; color: var(--gray-900);"><i class="fas fa-clock"></i> Quiz à Venir</h2>';
        html += '<div class="quiz-grid">';
        quizzes.upcoming.forEach(quiz => {
            html += generateQuizCard(quiz);
        });
        html += '</div>';
    }
    
    // Quiz actifs
    if (quizzes.active && quizzes.active.length > 0) {
        html += '<h2 style="margin: 2rem 0 1.5rem; color: var(--gray-900);"><i class="fas fa-play-circle"></i> Quiz Actifs</h2>';
        html += '<div class="quiz-grid">';
        quizzes.active.forEach(quiz => {
            html += generateQuizCard(quiz);
        });
        html += '</div>';
    }
    
    // Quiz terminés récents
    if (quizzes.ended && quizzes.ended.length > 0) {
        html += '<h2 style="margin: 2rem 0 1.5rem; color: var(--gray-900);"><i class="fas fa-history"></i> Quiz Récents Terminés</h2>';
        html += '<div class="quiz-grid">';
        quizzes.ended.forEach(quiz => {
            html += generateQuizCard(quiz);
        });
        html += '</div>';
    }
    
    if (html === '') {
        html = `
            <div style="text-align: center; padding: 3rem; color: var(--gray-600);">
                <i class="fas fa-calendar-times" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Aucun quiz planifié</h3>
                <p>Revenez plus tard pour découvrir de nouveaux quiz !</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

function generateQuizCard(quiz, isFeatured = false) {
    const startDate = new Date(quiz.start_date);
    const endDate = new Date(quiz.end_date);
    const now = new Date();
    
    let statusClass = 'status-upcoming';
    let statusText = 'À venir';
    let actionButton = '';
    
    if (quiz.status === 'active') {
        statusClass = 'status-active';
        statusText = 'En cours';
        actionButton = `<button class="btn-register" onclick="joinQuiz(${quiz.id})">
            <i class="fas fa-play"></i> Participer
        </button>`;
    } else if (quiz.status === 'upcoming') {
        statusClass = 'status-upcoming';
        statusText = 'À venir';
        actionButton = `<button class="btn-register" onclick="registerForQuiz(${quiz.id})">
            <i class="fas fa-user-plus"></i> S'inscrire
        </button>`;
    } else {
        statusClass = 'status-ended';
        statusText = 'Terminé';
        actionButton = `<button class="btn-register" disabled>
            <i class="fas fa-check"></i> Terminé
        </button>`;
    }
    
    const participantsPercentage = quiz.max_participants 
        ? (quiz.current_participants / quiz.max_participants) * 100 
        : 0;
    
    return `
        <div class="quiz-card ${isFeatured ? 'featured' : ''}">
            <div class="quiz-header">
                <div class="quiz-icon" style="background: ${quiz.theme_color || '#6366f1'};">
                    <i class="fas fa-${quiz.theme_icon || 'question-circle'}"></i>
                </div>
                <div>
                    <div class="quiz-title">${quiz.title}</div>
                    <div class="quiz-theme">${quiz.theme_name}</div>
                </div>
            </div>
            
            <div class="quiz-status ${statusClass}">${statusText}</div>
            
            <div class="quiz-info">
                <div class="quiz-description">${quiz.description || 'Aucune description disponible'}</div>
                
                <div class="quiz-meta">
                    <div class="meta-item">
                        <i class="fas fa-clock"></i>
                        <span>${quiz.estimated_duration} min</span>
                    </div>
                    <div class="meta-item">
                        <i class="fas fa-signal"></i>
                        <span>${getDifficultyText(quiz.difficulty_level)}</span>
                    </div>
                </div>
                
                <div class="quiz-schedule">
                    <div class="schedule-item">
                        <span class="schedule-label">Début :</span>
                        <span class="schedule-value">${formatDateTime(startDate)}</span>
                    </div>
                    <div class="schedule-item">
                        <span class="schedule-label">Fin :</span>
                        <span class="schedule-value">${formatDateTime(endDate)}</span>
                    </div>
                </div>
                
                <div class="quiz-rewards">
                    <div class="reward-item">
                        <div class="reward-amount">${quiz.reward_amount.toLocaleString()}</div>
                        <div class="reward-label">FCFA Base</div>
                    </div>
                    ${quiz.bonus_reward > 0 ? `
                        <div class="reward-item">
                            <div class="reward-amount">+${quiz.bonus_reward.toLocaleString()}</div>
                            <div class="reward-label">FCFA Bonus</div>
                        </div>
                    ` : ''}
                </div>
                
                ${quiz.max_participants ? `
                    <div class="participants-info">
                        <span style="font-size: 0.9rem; color: var(--gray-600);">
                            ${quiz.current_participants}/${quiz.max_participants} participants
                        </span>
                        <div class="participants-bar">
                            <div class="participants-fill" style="width: ${participantsPercentage}%"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            <div class="quiz-actions">
                ${actionButton}
                <button class="btn-details" onclick="showQuizDetails(${quiz.id})">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        </div>
    `;
}

// ===== ACTIONS SUR LES QUIZ =====
async function registerForQuiz(quizId) {
    try {
        const response = await fetch(`${API_BASE_URL}/quiz-scheduling/${quizId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Inscription réussie !', 'success');
            loadAvailableQuizzes(); // Recharger pour mettre à jour
        } else {
            showNotification(data.error || 'Erreur lors de l\'inscription', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

async function joinQuiz(quizId) {
    // Rediriger vers la page de quiz
    window.location.href = `/quiz.html?schedule=${quizId}`;
}

async function showQuizDetails(quizId) {
    try {
        const response = await fetch(`${API_BASE_URL}/quiz-scheduling/${quizId}`);
        
        if (response.ok) {
            const data = await response.json();
            displayQuizModal(data.quiz);
        } else {
            showNotification('Erreur de chargement des détails', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

// ===== CHARGEMENT DES INSCRIPTIONS =====
async function loadMyRegistrations() {
    const container = document.getElementById('registrationsContainer');
    container.innerHTML = '<p style="text-align: center; padding: 3rem;">Chargement...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/quiz-scheduling/user/registrations`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayMyRegistrations(data.registrations);
        } else {
            throw new Error('Erreur de chargement');
        }
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray-600);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Erreur de chargement de vos inscriptions</p>
            </div>
        `;
    }
}

function displayMyRegistrations(registrations) {
    const container = document.getElementById('registrationsContainer');
    
    if (registrations.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray-600);">
                <i class="fas fa-calendar-check" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <h3>Aucune inscription</h3>
                <p>Vous n'êtes inscrit à aucun quiz pour le moment.</p>
                <button class="btn btn-primary" onclick="showTab('available')" style="margin-top: 1rem;">
                    Découvrir les Quiz
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="quiz-grid">';
    registrations.forEach(registration => {
        html += generateRegistrationCard(registration);
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function generateRegistrationCard(registration) {
    const startDate = new Date(registration.start_date);
    const registeredDate = new Date(registration.registered_at);
    
    let statusClass = 'status-upcoming';
    let statusText = 'À venir';
    let actionButton = '';
    
    if (registration.status === 'active') {
        statusClass = 'status-active';
        statusText = 'En cours';
        actionButton = `<button class="btn-register" onclick="joinQuiz(${registration.id})">
            <i class="fas fa-play"></i> Participer
        </button>`;
    } else if (registration.status === 'upcoming') {
        statusClass = 'status-upcoming';
        statusText = 'À venir';
        actionButton = `<button class="btn-register" onclick="unregisterFromQuiz(${registration.id})" style="background: var(--error);">
            <i class="fas fa-user-minus"></i> Se désinscrire
        </button>`;
    } else {
        statusClass = 'status-ended';
        statusText = registration.participated ? 'Participé' : 'Manqué';
        actionButton = `<button class="btn-register" disabled>
            <i class="fas fa-${registration.participated ? 'check' : 'times'}"></i> ${statusText}
        </button>`;
    }
    
    return `
        <div class="quiz-card">
            <div class="quiz-header">
                <div class="quiz-icon" style="background: ${registration.theme_color || '#6366f1'};">
                    <i class="fas fa-${registration.theme_icon || 'question-circle'}"></i>
                </div>
                <div>
                    <div class="quiz-title">${registration.title}</div>
                    <div class="quiz-theme">${registration.theme_name}</div>
                </div>
            </div>
            
            <div class="quiz-status ${statusClass}">${statusText}</div>
            
            <div class="quiz-info">
                <div class="quiz-schedule">
                    <div class="schedule-item">
                        <span class="schedule-label">Quiz :</span>
                        <span class="schedule-value">${formatDateTime(startDate)}</span>
                    </div>
                    <div class="schedule-item">
                        <span class="schedule-label">Inscrit le :</span>
                        <span class="schedule-value">${formatDateTime(registeredDate)}</span>
                    </div>
                </div>
                
                <div class="quiz-rewards">
                    <div class="reward-item">
                        <div class="reward-amount">${registration.reward_amount.toLocaleString()}</div>
                        <div class="reward-label">FCFA Récompense</div>
                    </div>
                </div>
            </div>
            
            <div class="quiz-actions">
                ${actionButton}
                <button class="btn-details" onclick="showQuizDetails(${registration.id})">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        </div>
    `;
}

// ===== UTILITAIRES =====
function formatDateTime(date) {
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getDifficultyText(level) {
    const levels = {
        easy: 'Facile',
        medium: 'Moyen',
        hard: 'Difficile'
    };
    return levels[level] || 'Moyen';
}

function showNotification(message, type = 'info') {
    // Implémentation simple des notifications
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ===== GESTIONNAIRES D'ÉVÉNEMENTS =====
function setupEventHandlers() {
    // Gestionnaire pour la sélection de difficulté
    document.querySelectorAll('.difficulty-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.difficulty-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            selectedDifficulty = this.dataset.level;
        });
    });
    
    // Gestionnaire pour le formulaire de création
    const createForm = document.getElementById('createQuizForm');
    if (createForm) {
        createForm.addEventListener('submit', handleCreateQuiz);
    }
}

// ===== CRÉATION DE QUIZ (ADMIN) =====
async function loadSurveyThemes() {
    try {
        const response = await fetch(`${API_BASE_URL}/surveys/themes`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const themes = await response.json();
            const select = document.getElementById('quizTheme');
            
            themes.forEach(theme => {
                const option = document.createElement('option');
                option.value = theme.id;
                option.textContent = theme.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Erreur chargement thèmes:', error);
    }
}

async function handleCreateQuiz(e) {
    e.preventDefault();
    
    const formData = {
        survey_theme_id: parseInt(document.getElementById('quizTheme').value),
        title: document.getElementById('quizTitle').value,
        description: document.getElementById('quizDescription').value,
        start_date: document.getElementById('startDate').value,
        end_date: document.getElementById('endDate').value,
        max_participants: document.getElementById('maxParticipants').value || null,
        reward_amount: parseInt(document.getElementById('rewardAmount').value),
        bonus_reward: parseInt(document.getElementById('bonusReward').value) || 0,
        is_featured: document.getElementById('isFeatured').checked ? 1 : 0,
        difficulty_level: selectedDifficulty,
        estimated_duration: parseInt(document.getElementById('estimatedDuration').value)
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/quiz-scheduling/admin/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Quiz créé avec succès !', 'success');
            document.getElementById('createQuizForm').reset();
            showTab('available');
        } else {
            showNotification(data.error || 'Erreur lors de la création', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

// ===== STATISTIQUES (ADMIN) =====
async function loadStatistics() {
    if (!currentUser || !currentUser.isAdmin) return;
    
    const container = document.getElementById('statsGrid');
    container.innerHTML = '<p style="text-align: center; padding: 3rem;">Chargement des statistiques...</p>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/quiz-scheduling/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayStatistics(data);
        } else {
            throw new Error('Erreur de chargement des statistiques');
        }
    } catch (error) {
        console.error('Erreur:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--gray-600);">
                <p>Erreur de chargement des statistiques</p>
            </div>
        `;
    }
}

function displayStatistics(data) {
    const container = document.getElementById('statsGrid');
    const stats = data.quiz_stats;
    const regStats = data.registration_stats;
    
    container.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${stats.total_quizzes}</div>
            <div class="stat-label">Quiz Total</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.upcoming_quizzes}</div>
            <div class="stat-label">À Venir</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.active_quizzes}</div>
            <div class="stat-label">Actifs</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.ended_quizzes}</div>
            <div class="stat-label">Terminés</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${regStats.total_registrations}</div>
            <div class="stat-label">Inscriptions Total</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${regStats.unique_participants}</div>
            <div class="stat-label">Participants Uniques</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${Math.round(stats.avg_participants_per_quiz || 0)}</div>
            <div class="stat-label">Moy. Participants/Quiz</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${regStats.completed_participations}</div>
            <div class="stat-label">Participations Complétées</div>
        </div>
    `;
}
