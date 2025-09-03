/* ===== DASHBOARD UTILISATEUR MODERNE ===== */

// Variables globales
let currentUser = null;
let currentSection = 'dashboard';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard utilisateur chargé');
    
    // Vérifier l'authentification et rediriger les admins
    checkUserAuth();
    
    // Initialiser la navigation
    setupNavigation();
    
    // Charger les données utilisateur
    loadUserData();
});

// ===== AUTHENTIFICATION =====
async function checkUserAuth() {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    if (!token) {
        window.location.href = '/';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            
            // IMPORTANT: Rediriger les admins vers l'interface admin
            if (data.user.isAdmin || data.user.is_admin) {
                console.log('🔄 Admin détecté, redirection vers interface admin...');
                window.location.href = '/admin-modern.html';
                return;
            }
            
            // Vérifier si l'utilisateur est approuvé
            if (!data.user.adminApproved && !data.user.admin_approved) {
                showPendingApprovalMessage();
                return;
            }
            
            // Mettre à jour l'interface avec les infos utilisateur
            updateUserInfo(data.user);
        } else {
            throw new Error('Token invalide');
        }
    } catch (error) {
        console.error('❌ Erreur authentification:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/';
    }
}

function updateUserInfo(user) {
    if (!user) return;

    // Mettre à jour le nom d'utilisateur
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = `${user.firstName || user.first_name} ${user.lastName || user.last_name}`;
    }

    // Mettre à jour l'ID unique
    const userUniqueId = document.getElementById('userUniqueId');
    if (userUniqueId) {
        userUniqueId.textContent = `GP${String(user.id).padStart(4, '0')}`;
    }

    // Mettre à jour les initiales dans l'avatar
    const userInitials = document.getElementById('userInitials');
    if (userInitials) {
        const firstName = user.firstName || user.first_name || '';
        const lastName = user.lastName || user.last_name || '';
        const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
        userInitials.textContent = initials;
    }

    // Générer une couleur d'avatar basée sur l'ID utilisateur
    const userAvatar = document.getElementById('userAvatar');
    if (userAvatar) {
        const colors = [
            'linear-gradient(135deg, #667eea, #764ba2)',
            'linear-gradient(135deg, #f093fb, #f5576c)',
            'linear-gradient(135deg, #4facfe, #00f2fe)',
            'linear-gradient(135deg, #43e97b, #38f9d7)',
            'linear-gradient(135deg, #fa709a, #fee140)',
            'linear-gradient(135deg, #a8edea, #fed6e3)',
            'linear-gradient(135deg, #ffecd2, #fcb69f)',
            'linear-gradient(135deg, #ff9a9e, #fecfef)'
        ];
        const colorIndex = user.id % colors.length;
        userAvatar.style.background = colors[colorIndex];
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Mettre à jour la sidebar
    updateSidebarUserInfo(user);
}

function updateSidebarUserInfo(user) {
    // Mettre à jour le nom dans la sidebar
    const sidebarUserName = document.getElementById('sidebarUserName');
    if (sidebarUserName) {
        sidebarUserName.textContent = `${user.firstName || user.first_name} ${user.lastName || user.last_name}`;
    }

    // Mettre à jour l'ID dans la sidebar
    const sidebarUserId = document.getElementById('sidebarUserId');
    if (sidebarUserId) {
        sidebarUserId.textContent = user.uniqueId || user.unique_id || 'GP------';
    }
}

function showPendingApprovalMessage() {
    const contentWrapper = document.querySelector('.content-wrapper');
    if (contentWrapper) {
        contentWrapper.innerHTML = `
            <div class="pending-approval-message">
                <div class="pending-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <h2>Compte en attente d'approbation</h2>
                <p>Votre compte est en cours de vérification par notre équipe.</p>
                <p>Vous recevrez une notification par email dès que votre compte sera approuvé.</p>
                <button onclick="logout()" class="btn btn-outline">
                    <i class="fas fa-sign-out-alt"></i>
                    Se déconnecter
                </button>
            </div>
        `;
    }
}

// ===== NAVIGATION =====
function setupNavigation() {
    // Navigation sidebar
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            showSection(section);
        });
    });
    
    // Toggle sidebar mobile
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    
    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

function showSection(sectionName) {
    // Masquer toutes les sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Afficher la section demandée (ID sans suffixe)
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
        console.log(`✅ Section ${sectionName} affichée`);
    } else {
        console.error(`❌ Section ${sectionName} non trouvée`);
    }
    
    // Mettre à jour la navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Mettre à jour le titre de la page
    const pageTitle = document.querySelector('.page-title');
    const titles = {
        'dashboard': 'Tableau de bord',
        'surveys': 'Sondages',
        'payments': 'Paiements',
        'profile': 'Profil',
        'help': 'Aide'
    };
    
    if (pageTitle && titles[sectionName]) {
        pageTitle.textContent = titles[sectionName];
    }
    
    currentSection = sectionName;
    
    // Charger les données spécifiques à la section
    loadSectionData(sectionName);
}

// ===== CHARGEMENT DES DONNÉES =====
// Variables globales pour les sondages
let availableSurveys = [];
let currentSurveyData = null;
let currentQuestionIndex = 0;
let userAnswers = [];

async function loadUserData() {
    if (!currentUser) return;

    try {
        // Charger les données du dashboard
        await loadDashboardStats();

        // Charger les sondages disponibles
        await loadAvailableSurveys();
    } catch (error) {
        console.error('❌ Erreur chargement données utilisateur:', error);
    }
}

async function loadDashboardStats() {
    // TODO: Implémenter le chargement des statistiques utilisateur
    console.log('📊 Chargement des statistiques utilisateur...');
}

function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'dashboard':
            loadDashboardStats();
            break;
        case 'surveys':
            loadAvailableSurveys();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'profile':
            loadProfile();
            break;
        default:
            console.log(`Section ${sectionName} non implémentée`);
    }
}

// ===== GESTION DES SONDAGES =====
async function loadAvailableSurveys() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch('/api/surveys/themes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            // L'API retourne directement un tableau de sondages
            availableSurveys = Array.isArray(data) ? data : (data.themes || []);
            console.log(`✅ ${availableSurveys.length} sondages chargés`);
            displaySurveys(availableSurveys);
        } else {
            console.error('Erreur lors du chargement des sondages');
            displaySurveysError();
        }
    } catch (error) {
        console.error('❌ Erreur chargement sondages:', error);
        displaySurveysError();
    }
}

function displaySurveys(surveys) {
    const container = document.getElementById('surveysGrid');
    if (!container) return;

    if (!surveys || surveys.length === 0) {
        container.innerHTML = `
            <div class="no-surveys">
                <i class="fas fa-poll" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <h3>Aucun sondage disponible</h3>
                <p>De nouveaux sondages seront bientôt disponibles !</p>
            </div>
        `;
        return;
    }

    const surveysHTML = surveys.map(survey => `
        <div class="survey-card" data-difficulty="${survey.difficulty}" data-reward="${survey.reward_amount}">
            <div class="survey-header">
                <div class="survey-icon">
                    ${getSurveyIcon(survey.name)}
                </div>
                <div class="survey-badge ${survey.difficulty}">
                    ${survey.difficulty}
                </div>
            </div>
            <div class="survey-content">
                <h3>${survey.name}</h3>
                <p>${survey.description}</p>
                <div class="survey-stats">
                    <div class="stat">
                        <i class="fas fa-question-circle"></i>
                        <span>${survey.questions_count} questions</span>
                    </div>
                    <div class="stat">
                        <i class="fas fa-clock"></i>
                        <span>${getEstimatedTime(survey.questions_count)} min</span>
                    </div>
                </div>
            </div>
            <div class="survey-footer">
                <div class="survey-reward">
                    <i class="fas fa-coins"></i>
                    <span>${survey.reward_amount} FCFA</span>
                </div>
                <button class="btn btn-primary" onclick="startSurvey(${survey.id})">
                    <i class="fas fa-play"></i>
                    Commencer
                </button>
            </div>
        </div>
    `).join('');

    container.innerHTML = surveysHTML;
}

function displaySurveysError() {
    const container = document.getElementById('surveysGrid');
    if (!container) return;

    container.innerHTML = `
        <div class="surveys-error">
            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff6b6b; margin-bottom: 1rem;"></i>
            <h3>Erreur de chargement</h3>
            <p>Impossible de charger les sondages. Veuillez réessayer.</p>
            <button class="btn btn-primary" onclick="loadAvailableSurveys()">
                <i class="fas fa-refresh"></i>
                Réessayer
            </button>
        </div>
    `;
}

function getSurveyIcon(surveyName) {
    const icons = {
        'Habitudes Alimentaires': '<i class="fas fa-utensils"></i>',
        'Technologie et Internet': '<i class="fas fa-laptop"></i>',
        'Santé et Bien-être': '<i class="fas fa-heartbeat"></i>',
        'Environnement et Écologie': '<i class="fas fa-leaf"></i>',
        'Éducation et Formation': '<i class="fas fa-graduation-cap"></i>',
        'Transport et Mobilité': '<i class="fas fa-car"></i>',
        'Loisirs et Divertissement': '<i class="fas fa-gamepad"></i>',
        'Économie et Finance': '<i class="fas fa-chart-line"></i>'
    };
    return icons[surveyName] || '<i class="fas fa-poll"></i>';
}

function getEstimatedTime(questionsCount) {
    return Math.ceil(questionsCount * 0.5); // 30 secondes par question
}

// Filtrage des sondages
function filterSurveys() {
    const difficultyFilter = document.getElementById('difficultyFilter').value;
    const rewardFilter = document.getElementById('rewardFilter').value;

    let filteredSurveys = [...availableSurveys];

    if (difficultyFilter) {
        filteredSurveys = filteredSurveys.filter(s => s.difficulty === difficultyFilter);
    }

    if (rewardFilter) {
        filteredSurveys = filteredSurveys.filter(s => {
            const reward = s.reward_amount;
            switch (rewardFilter) {
                case 'low': return reward < 2500;
                case 'medium': return reward >= 2500 && reward <= 3500;
                case 'high': return reward > 3500;
                default: return true;
            }
        });
    }

    displaySurveys(filteredSurveys);
}

// Démarrer un sondage
async function startSurvey(surveyId) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch(`/api/surveys/${surveyId}/questions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('📊 Données reçues:', data);

            currentSurveyData = {
                id: surveyId,
                theme: availableSurveys.find(s => s.id === surveyId),
                questions: data.questions || data || []
            };

            console.log(`✅ ${currentSurveyData.questions.length} questions chargées`);

            if (currentSurveyData.questions.length === 0) {
                showErrorPopup('Ce sondage n\'a pas encore de questions. Veuillez réessayer plus tard.');
                return;
            }

            // Initialiser le sondage
            currentQuestionIndex = 0;
            userAnswers = [];

            // Afficher la section de sondage
            showSection('takeSurvey');
            initializeSurveyInterface();
            displayCurrentQuestion();

        } else {
            showErrorPopup('Erreur lors du chargement du sondage');
        }
    } catch (error) {
        console.error('❌ Erreur démarrage sondage:', error);
        showErrorPopup('Erreur lors du démarrage du sondage');
    }
}

// Initialiser l'interface de sondage
function initializeSurveyInterface() {
    if (!currentSurveyData) return;

    // Mettre à jour les informations du sondage
    const surveyTitle = document.getElementById('surveyTitle');
    const totalQuestions = document.getElementById('totalQuestions');
    const surveyReward = document.getElementById('surveyReward');

    if (surveyTitle) {
        surveyTitle.textContent = currentSurveyData.theme.name;
    }

    if (totalQuestions) {
        totalQuestions.textContent = currentSurveyData.questions.length;
    }

    if (surveyReward) {
        surveyReward.textContent = currentSurveyData.theme.reward_amount;
    }

    // Réinitialiser les boutons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (submitBtn) submitBtn.style.display = 'none';
}

// Afficher la question actuelle
function displayCurrentQuestion() {
    if (!currentSurveyData || currentQuestionIndex >= currentSurveyData.questions.length) return;

    const question = currentSurveyData.questions[currentQuestionIndex];
    const questionText = document.getElementById('questionText');
    const optionsContainer = document.getElementById('optionsContainer');
    const currentQuestionEl = document.getElementById('currentQuestion');
    const progressFill = document.getElementById('progressFill');

    // Mettre à jour le texte de la question
    if (questionText) {
        questionText.textContent = question.question_text;
    }

    // Mettre à jour le numéro de question
    if (currentQuestionEl) {
        currentQuestionEl.textContent = currentQuestionIndex + 1;
    }

    // Mettre à jour la barre de progression
    if (progressFill) {
        const progress = ((currentQuestionIndex + 1) / currentSurveyData.questions.length) * 100;
        progressFill.style.width = `${progress}%`;
    }

    // Générer les options
    if (optionsContainer) {
        optionsContainer.innerHTML = '';

        question.options.forEach((option, index) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option-item';
            optionElement.innerHTML = `
                <input type="radio" id="option_${index}" name="question_${currentQuestionIndex}" value="${index}">
                <label for="option_${index}">
                    <span class="option-text">${option}</span>
                    <span class="option-check"><i class="fas fa-check"></i></span>
                </label>
            `;

            // Ajouter l'événement de sélection
            const radio = optionElement.querySelector('input[type="radio"]');
            radio.addEventListener('change', function() {
                if (this.checked) {
                    selectOption(index);
                }
            });

            optionsContainer.appendChild(optionElement);
        });
    }

    // Mettre à jour les boutons
    updateNavigationButtons();
}

// Sélectionner une option
function selectOption(optionIndex) {
    // Enregistrer la réponse
    userAnswers[currentQuestionIndex] = optionIndex;

    // Mettre à jour l'interface
    const options = document.querySelectorAll('.option-item');
    options.forEach((option, index) => {
        if (index === optionIndex) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });

    // Activer le bouton suivant
    updateNavigationButtons();
}

// Mettre à jour les boutons de navigation
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Bouton précédent
    if (prevBtn) {
        prevBtn.disabled = currentQuestionIndex === 0;
    }

    // Bouton suivant / terminer
    const isLastQuestion = currentQuestionIndex === currentSurveyData.questions.length - 1;
    const hasAnswer = userAnswers[currentQuestionIndex] !== undefined;

    if (isLastQuestion) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) {
            submitBtn.style.display = 'inline-flex';
            submitBtn.disabled = !hasAnswer;
        }
    } else {
        if (nextBtn) {
            nextBtn.style.display = 'inline-flex';
            nextBtn.disabled = !hasAnswer;
        }
        if (submitBtn) submitBtn.style.display = 'none';
    }
}

// Question précédente
function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentQuestion();

        // Restaurer la réponse précédente si elle existe
        const previousAnswer = userAnswers[currentQuestionIndex];
        if (previousAnswer !== undefined) {
            const radio = document.querySelector(`input[name="question_${currentQuestionIndex}"][value="${previousAnswer}"]`);
            if (radio) {
                radio.checked = true;
                selectOption(previousAnswer);
            }
        }
    }
}

// Question suivante
function nextQuestion() {
    if (currentQuestionIndex < currentSurveyData.questions.length - 1) {
        currentQuestionIndex++;
        displayCurrentQuestion();

        // Restaurer la réponse précédente si elle existe
        const previousAnswer = userAnswers[currentQuestionIndex];
        if (previousAnswer !== undefined) {
            const radio = document.querySelector(`input[name="question_${currentQuestionIndex}"][value="${previousAnswer}"]`);
            if (radio) {
                radio.checked = true;
                selectOption(previousAnswer);
            }
        }
    }
}

// Soumettre le sondage
async function submitSurvey() {
    try {
        // Vérifier que toutes les questions ont une réponse
        if (userAnswers.length !== currentSurveyData.questions.length) {
            showWarningPopup('Veuillez répondre à toutes les questions avant de soumettre.');
            return;
        }

        // Calculer le score
        const score = (userAnswers.length / currentSurveyData.questions.length) * 100;

        // Préparer les données de soumission
        const submissionData = {
            survey_id: currentSurveyData.id,
            answers: userAnswers.map((answer, index) => ({
                question_id: currentSurveyData.questions[index].id,
                selected_option: answer,
                option_text: currentSurveyData.questions[index].options[answer]
            })),
            score: score,
            completed_at: new Date().toISOString()
        };

        console.log('📤 Soumission du sondage:', submissionData);

        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch(`/api/surveys/${currentSurveyData.id}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(submissionData)
        });

        if (response.ok) {
            const result = await response.json();
            showSuccessPopup(
                `Félicitations ! Vous avez terminé le sondage avec un score de ${score.toFixed(1)}%. Vous avez gagné ${currentSurveyData.theme.reward_amount} FCFA !`,
                () => {
                    showSection('surveys');
                    loadAvailableSurveys(); // Recharger les sondages
                }
            );
        } else {
            const error = await response.json();
            showErrorPopup(error.message || 'Erreur lors de la soumission du sondage');
        }

    } catch (error) {
        console.error('❌ Erreur soumission sondage:', error);
        showErrorPopup('Erreur lors de la soumission du sondage');
    }
}

async function loadPayments() {
    console.log('💳 Chargement des paiements...');
    // TODO: Implémenter le chargement des paiements
}

// ===== INTERFACE DE SONDAGE =====
function initializeSurveyInterface() {
    if (!currentSurveyData) return;

    // Mettre à jour les informations du sondage
    document.getElementById('surveyTitle').textContent = currentSurveyData.theme.name;
    document.getElementById('totalQuestions').textContent = currentSurveyData.questions.length;
    document.getElementById('surveyReward').textContent = currentSurveyData.theme.reward_amount;

    // Afficher la première question
    displayCurrentQuestion();
}

function displayCurrentQuestion() {
    if (!currentSurveyData || currentQuestionIndex >= currentSurveyData.questions.length) return;

    const question = currentSurveyData.questions[currentQuestionIndex];
    const questionNumber = currentQuestionIndex + 1;
    const totalQuestions = currentSurveyData.questions.length;

    // Mettre à jour les éléments de l'interface
    document.getElementById('currentQuestion').textContent = questionNumber;
    document.getElementById('questionText').textContent = question.question_text;

    // Mettre à jour la barre de progression
    const progressPercent = (questionNumber / totalQuestions) * 100;
    document.getElementById('progressFill').style.width = `${progressPercent}%`;

    // Générer les options
    const optionsContainer = document.getElementById('optionsContainer');
    const options = JSON.parse(question.options || '[]');

    optionsContainer.innerHTML = options.map((option, index) => `
        <div class="option-item" onclick="selectOption(${index})">
            <input type="radio" name="question_${currentQuestionIndex}" value="${option}" id="option_${index}">
            <label for="option_${index}">${option}</label>
        </div>
    `).join('');

    // Mettre à jour les boutons
    updateNavigationButtons();
}

function selectOption(optionIndex) {
    // Désélectionner toutes les options
    document.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));

    // Sélectionner l'option cliquée
    const selectedOption = document.querySelectorAll('.option-item')[optionIndex];
    selectedOption.classList.add('selected');

    // Cocher le radio button
    const radio = selectedOption.querySelector('input[type="radio"]');
    radio.checked = true;

    // Activer le bouton suivant
    document.getElementById('nextBtn').disabled = false;
}

function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const submitBtn = document.getElementById('submitBtn');

    // Bouton précédent
    prevBtn.disabled = currentQuestionIndex === 0;

    // Bouton suivant / terminer
    const isLastQuestion = currentQuestionIndex === currentSurveyData.questions.length - 1;

    if (isLastQuestion) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'inline-block';
    } else {
        nextBtn.style.display = 'inline-block';
        submitBtn.style.display = 'none';
    }

    // Désactiver le bouton suivant jusqu'à ce qu'une option soit sélectionnée
    nextBtn.disabled = true;
}

function previousQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        displayCurrentQuestion();

        // Restaurer la réponse précédente si elle existe
        if (userAnswers[currentQuestionIndex]) {
            const savedAnswer = userAnswers[currentQuestionIndex];
            const options = document.querySelectorAll('.option-item');
            options.forEach((option, index) => {
                const radio = option.querySelector('input[type="radio"]');
                if (radio.value === savedAnswer) {
                    option.classList.add('selected');
                    radio.checked = true;
                    document.getElementById('nextBtn').disabled = false;
                }
            });
        }
    }
}

function nextQuestion() {
    // Sauvegarder la réponse actuelle
    const selectedOption = document.querySelector('input[name="question_' + currentQuestionIndex + '"]:checked');
    if (!selectedOption) {
        alert('Veuillez sélectionner une réponse');
        return;
    }

    userAnswers[currentQuestionIndex] = selectedOption.value;

    // Passer à la question suivante
    if (currentQuestionIndex < currentSurveyData.questions.length - 1) {
        currentQuestionIndex++;
        displayCurrentQuestion();
    }
}

async function submitSurvey() {
    // Sauvegarder la dernière réponse
    const selectedOption = document.querySelector('input[name="question_' + currentQuestionIndex + '"]:checked');
    if (!selectedOption) {
        alert('Veuillez sélectionner une réponse');
        return;
    }

    userAnswers[currentQuestionIndex] = selectedOption.value;

    // Vérifier que toutes les questions ont une réponse
    if (userAnswers.length !== currentSurveyData.questions.length) {
        alert('Veuillez répondre à toutes les questions');
        return;
    }

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch('/api/surveys/submit', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                themeId: currentSurveyData.id,
                answers: userAnswers.map((answer, index) => ({
                    questionId: currentSurveyData.questions[index].id,
                    answer: answer
                }))
            })
        });

        if (response.ok) {
            const result = await response.json();
            showSurveyResults(result);
        } else {
            alert('Erreur lors de la soumission du sondage');
        }
    } catch (error) {
        console.error('❌ Erreur soumission sondage:', error);
        alert('Erreur lors de la soumission du sondage');
    }
}

function showSurveyResults(result) {
    // TODO: Afficher les résultats du sondage
    alert(`Sondage terminé ! Score: ${result.score || 0}/${result.maxScore || 0}. Récompense: ${result.reward || 0} FCFA`);

    // Retourner à la liste des sondages
    showSection('surveys');

    // Recharger les données utilisateur
    loadUserData();
}

async function loadProfile() {
    console.log('👤 Chargement du profil...');
    // TODO: Implémenter le chargement du profil
}

// ===== UTILITAIRES =====
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    window.location.href = '/';
}

// Fonction de déconnexion
function logout() {
    // Supprimer les tokens
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    // Rediriger vers la page d'accueil
    window.location.href = '/';
}

// ===== SYSTÈME DE POPUP MODERNE =====
function showPopup(title, message, type = 'info', confirmCallback = null) {
    const overlay = document.getElementById('popupOverlay');
    const titleEl = document.getElementById('popupTitle');
    const messageEl = document.getElementById('popupMessage');
    const iconEl = document.getElementById('popupIcon');
    const confirmBtn = document.getElementById('popupConfirm');
    const cancelBtn = document.getElementById('popupCancel');

    if (!overlay) return;

    // Mettre à jour le contenu
    titleEl.textContent = title;
    messageEl.textContent = message;

    // Mettre à jour l'icône selon le type
    iconEl.className = `popup-icon ${type}`;
    const icons = {
        success: 'fas fa-check',
        error: 'fas fa-exclamation-triangle',
        warning: 'fas fa-exclamation-circle',
        info: 'fas fa-info-circle'
    };
    iconEl.innerHTML = `<i class="${icons[type] || icons.info}"></i>`;

    // Gérer les boutons
    if (confirmCallback) {
        confirmBtn.onclick = () => {
            closePopup();
            confirmCallback();
        };
        cancelBtn.style.display = 'inline-flex';
    } else {
        confirmBtn.onclick = closePopup;
        cancelBtn.style.display = 'none';
    }

    // Afficher le popup
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function showSuccessPopup(message, callback = null) {
    showPopup('Succès', message, 'success', callback);
}

function showErrorPopup(message, callback = null) {
    showPopup('Erreur', message, 'error', callback);
}

function showWarningPopup(message, callback = null) {
    showPopup('Attention', message, 'warning', callback);
}

function showInfoPopup(message, callback = null) {
    showPopup('Information', message, 'info', callback);
}

function closePopup() {
    const overlay = document.getElementById('popupOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Fermer popup avec Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closePopup();
    }
});

// Fonction pour toggle le menu utilisateur
function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (userMenu) {
        userMenu.classList.toggle('active');
    }
}

// Fonction pour toggle la sidebar sur mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
}

// Fermer le menu utilisateur en cliquant ailleurs
document.addEventListener('click', function(event) {
    const userMenu = document.getElementById('userMenu');
    const userInfo = document.querySelector('.user-info');

    if (userMenu && userInfo && !userInfo.contains(event.target)) {
        userMenu.classList.remove('active');
    }
});

// Gestion du responsive
document.addEventListener('DOMContentLoaded', function() {
    // Toggle sidebar sur mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Fermer la sidebar en cliquant sur le contenu principal sur mobile
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.addEventListener('click', function() {
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                if (sidebar && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    }
});

// Exposer les fonctions globalement
window.showSection = showSection;
window.logout = logout;
window.startSurvey = startSurvey;
window.filterSurveys = filterSurveys;
window.toggleUserMenu = toggleUserMenu;
window.toggleSidebar = toggleSidebar;
window.previousQuestion = previousQuestion;
window.nextQuestion = nextQuestion;
window.submitSurvey = submitSurvey;
window.selectOption = selectOption;
window.closePopup = closePopup;
window.showSection = showSection;
window.logout = logout;
