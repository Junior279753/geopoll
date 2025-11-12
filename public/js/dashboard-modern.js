/* ===== DASHBOARD UTILISATEUR MODERNE ===== */

// Variables globales
let currentUser = null;
let currentSection = 'dashboard';

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard utilisateur chargé');
    
    // Vérifier lauthentification et rediriger les admins
    checkUserAuth();
    
    // Initialiser la navigation
    setupNavigation();
    
    // Charger les données utilisateur
    loadUserData();

    // --- Attacher l'événement de déconnexion ---
    const logoutButtonSidebar = document.getElementById('logout-link-sidebar');
    if (logoutButtonSidebar) {
        logoutButtonSidebar.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }
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
            
            // IMPORTANT: Rediriger les admins vers linterface admin
            if (data.user.isAdmin || data.user.is_admin) {
                console.log('🔄 Admin détecté, redirection vers interface admin...');
                window.location.href = '/admin-modern.html';
                return;
            }
            
            // Vérifier si lutilisateur est approuvé
            if (!data.user.adminApproved && !data.user.admin_approved) {
                showPendingApprovalMessage();
                return;
            }
            
            // Mettre à jour linterface avec les infos utilisateur
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

    // Mettre à jour le nom dutilisateur
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = `${user.firstName || user.first_name} ${user.lastName || user.last_name}`;
    }

    // Mettre à jour lID unique
    const userUniqueId = document.getElementById('userUniqueId');
    if (userUniqueId) {
        userUniqueId.textContent = `GP${String(user.id).padStart(4, '0')}`;
    }

    // Mettre à jour les initiales dans lavatar
    const userInitials = document.getElementById('userInitials');
    if (userInitials) {
        const firstName = user.firstName || user.first_name || '';
        const lastName = user.lastName || user.last_name || '';
        const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
        userInitials.textContent = initials;
    }

    // Générer une couleur davatar basée sur lID utilisateur
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

    // Mettre à jour lID dans la sidebar
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
                <h2>Compte en attente dapprobation</h2>
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
    // Navigation sidebar - items click
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const section = item.getAttribute('data-section');
            showSection(section);
            // Fermer la sidebar sur mobile après clic
            if (window.innerWidth <= 1024) {
                closeSidebar();
            }
        });
    });
    
    // Mobile menu button (burger)
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });
    }

    // Sidebar close button (X)
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            closeSidebar();
        });
    }

    // Overlay click closes sidebar
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', (e) => {
            e.stopPropagation();
            closeSidebar();
        });
    }

    // Prevent sidebar from closing when clicking inside it
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Fermer la sidebar avec ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSidebar();
        }
    });

    // Fermer la sidebar quand on resize > 1024px
    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) {
            closeSidebar();
        }
    });

    console.log('✅ Navigation setup complete');
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.add('open');
    }
    if (overlay) {
        overlay.classList.add('active');
    }
    document.body.classList.add('no-scroll');
    console.log('📖 Sidebar ouvert');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) {
        sidebar.classList.remove('open');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
    document.body.classList.remove('no-scroll');
    console.log('🔚 Sidebar fermé');
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
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

    // Fermer la sidebar
    closeSidebar();
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
        case 'takeSurvey':
            // Section de passage de sondage - pas de chargement nécessaire
            console.log('📝 Section de passage de sondage active');
            break;
        case 'payments':
            loadPayments();
            break;
        case 'profile':
            loadProfile();
            break;
        case 'help':
            console.log('❓ Section daide');
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
            availableSurveys = Array.isArray(data) ? data : (data.themes || []);
            console.log(`✅ ${availableSurveys.length} sondages chargés`);
            displaySurveys(availableSurveys);
        } else {
            if (response.status === 403) {
                const errorData = await response.json();
                if (errorData.error === 'ACCOUNT_NOT_MONETIZED') {
                    displayMonetizationMessage();
                    return;
                }
            }
            console.error('Erreur lors du chargement des sondages');
            displaySurveysError();
        }
    } catch (error) {
        console.error('❌ Erreur chargement sondages:', error);
        displaySurveysError();
    }
}

function displayMonetizationMessage() {
    const container = document.getElementById('surveysGrid');
    if (!container) return;

    container.innerHTML = `
        <div class="monetization-message">
            <h3>Activation requise</h3>
            <p>Pour accéder aux sondages, vous devez dabord faire monétiser votre compte.</p>
            <p>Veuillez contacter ladministrateur pour connaître les modalités dactivation.</p>
            <button class="btn btn-primary" onclick="showSection('help')">Contacter le support</button>
        </div>
    `;
}

function displaySurveys(surveys) {
    const container = document.getElementById('surveysGrid');
    if (!container) return;

    // Mettre à jour les statistiques des sondages
    updateSurveyStats(surveys);

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

// Mettre à jour les statistiques des sondages
function updateSurveyStats(surveys) {
    // Mettre à jour le nombre total de sondages
    const totalSurveysEl = document.getElementById('totalSurveys');
    if (totalSurveysEl) {
        totalSurveysEl.textContent = surveys.length;
    }

    // Calculer le total des récompenses
    const totalRewards = surveys.reduce((sum, survey) => sum + (survey.reward_amount || 0), 0);
    const totalRewardsEl = document.getElementById('totalRewards');
    if (totalRewardsEl) {
        totalRewardsEl.textContent = totalRewards.toLocaleString();
    }

    // Calculer le temps moyen (estimation basée sur le nombre de questions)
    const avgQuestions = surveys.reduce((sum, survey) => sum + (survey.questions_count || 0), 0) / surveys.length;
    const avgTime = Math.round(avgQuestions * 0.5); // 30 secondes par question
    const avgTimeEl = document.getElementById('avgTime');
    if (avgTimeEl) {
        avgTimeEl.textContent = avgTime;
    }
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
    console.log('🔍 Filtrage des sondages...');

    const difficultyFilterEl = document.getElementById('difficultyFilter');
    const rewardFilterEl = document.getElementById('rewardFilter');

    if (!difficultyFilterEl || !rewardFilterEl) {
        console.error('❌ Éléments de filtre non trouvés');
        return;
    }

    const difficultyFilter = difficultyFilterEl.value;
    const rewardFilter = rewardFilterEl.value;

    console.log('🔍 Filtres:', { difficultyFilter, rewardFilter });
    console.log('🔍 Sondages disponibles:', availableSurveys.length);

    let filteredSurveys = [...availableSurveys];

    if (difficultyFilter) {
        filteredSurveys = filteredSurveys.filter(s => {
            console.log(`🔍 Sondage ${s.name}: difficulté ${s.difficulty} vs filtre ${difficultyFilter}`);
            return s.difficulty === difficultyFilter;
        });
        console.log(`🔍 Après filtre difficulté: ${filteredSurveys.length} sondages`);
    }

    if (rewardFilter) {
        filteredSurveys = filteredSurveys.filter(s => {
            const reward = s.reward_amount;
            let matches = false;
            switch (rewardFilter) {
                case 'low': matches = reward < 2500; break;
                case 'medium': matches = reward >= 2500 && reward <= 3500; break;
                case 'high': matches = reward > 3500; break;
                default: matches = true;
            }
            console.log(`🔍 Sondage ${s.name}: récompense ${reward} vs filtre ${rewardFilter} = ${matches}`);
            return matches;
        });
        console.log(`🔍 Après filtre récompense: ${filteredSurveys.length} sondages`);
    }

    console.log(`🔍 Résultat final: ${filteredSurveys.length} sondages`);
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
            const responseText = await response.text();
            console.log('📊 Réponse brute:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
                console.log('📊 Données parsées:', data);
            } catch (parseError) {
                console.error('❌ Erreur parsing JSON:', parseError);
                console.error('❌ Réponse reçue:', responseText);
                showErrorPopup('Erreur de format de données du serveur');
                return;
            }

            currentSurveyData = {
                id: surveyId,
                theme: availableSurveys.find(s => s.id === surveyId),
                questions: data.questions || data || []
            };

            console.log(`✅ ${currentSurveyData.questions.length} questions chargées`);

            if (currentSurveyData.questions.length === 0) {
                showErrorPopup('Ce sondage n a pas encore de questions. Veuillez réessayer plus tard.');
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

// Initialiser linterface de sondage
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
    console.log('🔄 Affichage question', currentQuestionIndex);

    if (!currentSurveyData || currentQuestionIndex >= currentSurveyData.questions.length) {
        console.error('❌ Pas de données de sondage ou index invalide');
        return;
    }

    const question = currentSurveyData.questions[currentQuestionIndex];
    console.log('📝 Question actuelle:', question);

    const questionText = document.getElementById('questionText');
    const optionsContainer = document.getElementById('optionsContainer');
    const currentQuestionEl = document.getElementById('currentQuestion');
    const progressFill = document.getElementById('progressFill');

    console.log('🎯 Éléments DOM:', {
        questionText: !!questionText,
        optionsContainer: !!optionsContainer,
        currentQuestionEl: !!currentQuestionEl,
        progressFill: !!progressFill
    });

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

        console.log('📋 Options disponibles:', question.options);

        if (!question.options || question.options.length === 0) {
            console.error('❌ Aucune option trouvée pour cette question');
            optionsContainer.innerHTML = '<p style="color: red;">Aucune option disponible pour cette question</p>';
            return;
        }

        question.options.forEach((option, index) => {
            console.log(`➡️ Création option ${index}: ${option}`);

            const optionElement = document.createElement('div');
            optionElement.className = 'option-item';
            optionElement.innerHTML = `
                <input type="radio" id="option_${currentQuestionIndex}_${index}" name="question_${currentQuestionIndex}" value="${index}">
                <label for="option_${currentQuestionIndex}_${index}">
                    <span class="option-text">${option}</span>
                    <span class="option-check"><i class="fas fa-check"></i></span>
                </label>
            `;

            // Ajouter lévénement de sélection
            const radio = optionElement.querySelector('input[type="radio"]');
            radio.addEventListener('change', function() {
                if (this.checked) {
                    console.log(`✅ Option ${index} sélectionnée: ${option}`);
                    selectOption(index);
                }
            });

            optionsContainer.appendChild(optionElement);
        });

        console.log(`✅ ${question.options.length} options créées`);
    } else {
        console.error('❌ Container des options non trouvé');
    }

    // Mettre à jour les boutons
    updateNavigationButtons();
}

// Sélectionner une option
function selectOption(optionIndex) {
    // Enregistrer la réponse
    userAnswers[currentQuestionIndex] = optionIndex;

    // Mettre à jour linterface
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

    console.log('🔄 Mise à jour boutons navigation:', {
        prevBtn: !!prevBtn,
        nextBtn: !!nextBtn,
        submitBtn: !!submitBtn,
        currentQuestionIndex,
        totalQuestions: currentSurveyData?.questions?.length,
        hasAnswer: userAnswers[currentQuestionIndex] !== undefined
    });

    // Bouton précédent
    if (prevBtn) {
        prevBtn.disabled = currentQuestionIndex === 0;
        console.log('⬅️ Bouton précédent:', prevBtn.disabled ? 'désactivé' : 'activé');
    }

    // Bouton suivant / terminer
    const isLastQuestion = currentQuestionIndex === currentSurveyData.questions.length - 1;
    const hasAnswer = userAnswers[currentQuestionIndex] !== undefined;

    console.log('🎯 État navigation:', { isLastQuestion, hasAnswer });

    if (isLastQuestion) {
        if (nextBtn) {
            nextBtn.style.display = 'none';
            console.log('➡️ Bouton suivant masqué (dernière question)');
        }
        if (submitBtn) {
            submitBtn.style.display = 'inline-flex';
            submitBtn.disabled = !hasAnswer;
            console.log('✅ Bouton terminer:', submitBtn.disabled ? 'désactivé' : 'activé');
        }
    } else {
        if (nextBtn) {
            nextBtn.style.display = 'inline-flex';
            nextBtn.disabled = !hasAnswer;
            console.log('➡️ Bouton suivant:', nextBtn.disabled ? 'désactivé' : 'activé');
        }
        if (submitBtn) {
            submitBtn.style.display = 'none';
            console.log('✅ Bouton terminer masqué');
        }
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

        // Préparer les données de soumission selon le format attendu par lAPI
        const submissionData = {
            themeId: currentSurveyData.id,
            answers: userAnswers.map((answer, index) => ({
                questionId: currentSurveyData.questions[index].id,
                answer: answer
            }))
        };

        console.log('📤 Soumission du sondage:', submissionData);

        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch('/api/surveys/submit', {
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
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        
        // Fetch user balance and transaction history
        const [balanceResponse, transactionsResponse] = await Promise.all([
            fetch('/api/user/balance', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/user/transactions', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        // Handle balance
        if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            const balanceEl = document.getElementById('paymentBalance');
            const withdrawnEl = document.getElementById('totalWithdrawn');
            const pendingEl = document.getElementById('pendingAmount');
            
            if (balanceEl) balanceEl.textContent = formatAmount(balanceData.balance || 0);
            if (withdrawnEl) withdrawnEl.textContent = formatAmount(balanceData.totalWithdrawn || 0);
            if (pendingEl) pendingEl.textContent = formatAmount(balanceData.pending || 0);
        } else {
            console.warn('⚠️ Impossible de charger le solde');
        }

        // Handle transactions
        if (transactionsResponse.ok) {
            const transData = await transactionsResponse.json();
            displayTransactions(transData.transactions || []);
        } else {
            console.warn('⚠️ Impossible de charger l\'historique des transactions');
        }

        console.log('💳 Paiements chargés');
    } catch (error) {
        console.error('❌ Erreur chargement paiements:', error);
    }
}

function displayTransactions(transactions) {
    const tbody = document.getElementById('transactionTableBody');
    if (!tbody) return;

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #666;">Aucune transaction</td></tr>';
        return;
    }

    tbody.innerHTML = transactions.map(tx => {
        const date = formatDate(tx.created_at || tx.date);
        const type = tx.type === 'withdrawal' || tx.type === 'withdraw' ? '💸 Retrait' : '✅ Dépôt';
        const amount = formatAmount(Math.abs(tx.amount || 0));
        const method = tx.payment_method || tx.paymentMethod || 'N/A';
        const statusBadge = getTransactionStatusBadge(tx.status);
        
        return `
            <tr>
                <td data-label="Date">${date}</td>
                <td data-label="Type">${type}</td>
                <td data-label="Montant">${amount}</td>
                <td data-label="Moyen">${method}</td>
                <td data-label="Statut">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

function getTransactionStatusBadge(status) {
    const statuses = {
        'pending': '<span class="badge badge-warning">En attente</span>',
        'completed': '<span class="badge badge-success">Complétée</span>',
        'approved': '<span class="badge badge-success">Approuvée</span>',
        'rejected': '<span class="badge badge-danger">Rejetée</span>',
        'failed': '<span class="badge badge-danger">Échouée</span>'
    };
    return statuses[status] || '<span class="badge badge-secondary">Inconnu</span>';
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

    // Mettre à jour lconvénée selon le type
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
    const sidebar = document.getElementById('sidebar');
    if (sidebar && sidebar.classList.contains('open')) {
        closeSidebar();
    } else {
        openSidebar();
    }
}

// Ouvrir la sidebar
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) {
        sidebar.classList.add('open');
    }
    if (overlay) {
        overlay.classList.add('active');
    }
    document.body.classList.add('no-scroll');
    console.log('📖 Sidebar ouvert');
}

// Fermer la sidebar
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) {
        sidebar.classList.remove('open');
    }
    if (overlay) {
        overlay.classList.remove('active');
    }
    document.body.classList.remove('no-scroll');
    console.log('🔚 Sidebar fermé');
}

// Fonction de déconnexion
async function logout() {
    console.log('🚪 Déconnexion...');
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');

    try {
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (error) {
        console.error('Erreur lors de la déconnexion côté serveur:', error);
    } finally {
        // Toujours nettoyer le client même si le serveur échoue
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        window.location.href = '/';
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

// Gestionnaire pour le formulaire de retrait
document.addEventListener('DOMContentLoaded', function() {
    const withdrawalForm = document.getElementById('withdrawalForm');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', handleWithdrawalSubmit);
    }
});

async function handleWithdrawalSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(this);
        const amount = parseFloat(formData.get('amount'));
        const paymentMethod = formData.get('paymentMethod');
        const accountNumber = formData.get('accountNumber');
        
        // Validation
        if (!amount || amount <= 0) {
            showErrorPopup('Veuillez entrer un montant valide');
            return;
        }
        
        if (!paymentMethod) {
            showErrorPopup('Veuillez sélectionner un moyen de paiement');
            return;
        }
        
        if (!accountNumber || accountNumber.trim().length === 0) {
            showErrorPopup('Veuillez entrer un numéro de compte');
            return;
        }
        
        // Soumettre la requête
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch('/api/user/withdraw', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount,
                payment_method: paymentMethod,
                account_number: accountNumber
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showSuccessPopup('Demande de retrait soumise avec succès ! Elle sera traitée dans 2-3 jours ouvrables.', () => {
                // Réinitialiser le formulaire et recharger les données
                this.reset();
                loadPayments();
            });
        } else if (response.status === 400) {
            const error = await response.json();
            showErrorPopup(error.message || 'Erreur lors de la soumission du retrait');
        } else if (response.status === 401) {
            showErrorPopup('Session expirée. Veuillez vous reconnecter.');
            logout();
        } else {
            showErrorPopup('Erreur serveur lors du traitement du retrait');
        }
    } catch (error) {
        console.error('❌ Erreur retrait:', error);
        showErrorPopup('Une erreur s\'est produite. Veuillez réessayer.');
    }
}

// Exposer les fonctions globalement
Object.assign(window, {
    showSection,
    logout,
    startSurvey,
    filterSurveys,
    toggleUserMenu,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    previousQuestion,
    nextQuestion,
    submitSurvey,
    selectOption,
    closePopup
});

console.log('✅ Fonctions de la fenêtre principale exposées.');