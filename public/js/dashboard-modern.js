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
    // Mettre à jour le nom d'utilisateur
    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = `${user.firstName || user.first_name} ${user.lastName || user.last_name}`;
    }
    
    // Mettre à jour l'ID unique
    const userUniqueId = document.getElementById('userUniqueId');
    if (userUniqueId) {
        userUniqueId.textContent = user.uniqueId || user.unique_id || 'GP------';
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
    
    // Afficher la section demandée
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
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
async function loadUserData() {
    if (!currentUser) return;
    
    try {
        // Charger les données du dashboard
        await loadDashboardStats();
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
            loadSurveys();
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

async function loadSurveys() {
    console.log('📋 Chargement des sondages...');
    // TODO: Implémenter le chargement des sondages
}

async function loadPayments() {
    console.log('💳 Chargement des paiements...');
    // TODO: Implémenter le chargement des paiements
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

// Exposer les fonctions globalement
window.showSection = showSection;
window.logout = logout;
