/* ===== ADMIN MODERNE JAVASCRIPT ===== */

// Variables globales
let currentSection = 'dashboard';
let users = [];
let stats = {};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Interface admin moderne chargée');
    
    // Vérifier l'authentification admin
    checkAdminAuth();
    
    // Initialiser la navigation
    setupNavigation();
    
    // Charger les données initiales
    loadDashboardData();
    
    // Configurer les événements
    setupEventListeners();
});

// ===== AUTHENTIFICATION =====
async function checkAdminAuth() {
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
            if (!data.user.isAdmin && !data.user.is_admin) {
                alert('❌ Accès refusé : droits administrateur requis');
                window.location.href = '/dashboard.html';
                return;
            }
            
            // Mettre à jour l'interface avec les infos admin
            updateAdminInfo(data.user);
        } else {
            throw new Error('Token invalide');
        }
    } catch (error) {
        console.error('❌ Erreur authentification admin:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        window.location.href = '/';
    }
}

function updateAdminInfo(user) {
    const adminName = document.getElementById('adminName');
    const dropdownUserName = document.getElementById('dropdownUserName');
    const dropdownUserEmail = document.getElementById('dropdownUserEmail');

    const fullName = `${user.firstName || user.first_name} ${user.lastName || user.last_name}`;

    if (adminName) {
        adminName.textContent = fullName;
    }

    if (dropdownUserName) {
        dropdownUserName.textContent = fullName;
    }

    if (dropdownUserEmail) {
        dropdownUserEmail.textContent = user.email;
    }

    console.log('✅ Admin connecté:', user.email);

    // Notification de bienvenue
    setTimeout(() => {
        showNotification(`Bienvenue ${user.firstName || user.first_name} ! Interface admin chargée avec succès.`, 'success');
    }, 1500);
}

// ===== NAVIGATION =====
function setupNavigation() {
    // Navigation sidebar
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            if (section) {
                showSection(section);
            }
        });
    });
    
    // Toggle sidebar mobile
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('adminSidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });
    }
}

function showSection(sectionName) {
    // Masquer toutes les sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Afficher la section demandée
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Mettre à jour la navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }
    
    // Mettre à jour le titre
    const pageTitle = document.getElementById('pageTitle');
    const titles = {
        'dashboard': 'Dashboard',
        'users': 'Gestion des utilisateurs',
        'surveys': 'Gestion des sondages',
        'quiz': 'Gestion des quiz',
        'withdrawals': 'Demandes de retrait',
        'transactions': 'Transactions',
        'logs': 'Logs d\'activité',
        'settings': 'Paramètres'
    };
    
    if (pageTitle && titles[sectionName]) {
        pageTitle.textContent = titles[sectionName];
    }
    
    currentSection = sectionName;
    
    // Charger les données spécifiques à la section
    loadSectionData(sectionName);
}

// ===== CHARGEMENT DES DONNÉES =====
async function loadDashboardData() {
    try {
        await Promise.all([
            loadStats(),
            loadRecentActivity(),
            loadPendingCounts(),
            loadPendingApprovals()
        ]);
    } catch (error) {
        console.error('❌ Erreur chargement dashboard:', error);
    }
}

// Fonction pour charger et afficher les demandes d'approbation en priorité
async function loadPendingApprovals() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');

        const response = await fetch('/api/admin/users?limit=10', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const pendingUsers = data.users.filter(u => !u.admin_approved);

            // Afficher la carte dans le dashboard
            displayPendingApprovalsCard(pendingUsers);

            // Afficher aussi l'alerte flottante si nécessaire
            if (pendingUsers.length > 0) {
                setTimeout(() => {
                    displayPendingApprovalsAlert(pendingUsers);
                }, 3000); // Après 3 secondes
            }
        }
    } catch (error) {
        console.error('❌ Erreur chargement demandes d\'approbation:', error);
    }
}

function displayPendingApprovalsCard(pendingUsers) {
    const card = document.getElementById('pendingApprovalsCard');
    const text = document.getElementById('pendingApprovalsText');

    if (card && text) {
        if (pendingUsers.length > 0) {
            card.style.display = 'block';
            text.textContent = `${pendingUsers.length} utilisateur(s) en attente d'approbation. Cliquez pour les gérer.`;
        } else {
            card.style.display = 'none';
        }
    }
}

// Fonction pour mettre à jour la carte avec juste le nombre
function updatePendingApprovalsCard(pendingCount) {
    const card = document.getElementById('pendingApprovalsCard');
    const text = document.getElementById('pendingApprovalsText');

    console.log('🔄 Mise à jour carte approbations:', pendingCount);

    if (card && text) {
        if (pendingCount > 0) {
            card.style.display = 'block';
            text.textContent = `${pendingCount} utilisateur(s) en attente d'approbation. Cliquez pour les gérer.`;

            // Ajouter une animation pour attirer l'attention
            card.style.animation = 'pulse 2s infinite';
        } else {
            card.style.display = 'none';
            card.style.animation = 'none';
        }
    }
}

function displayPendingApprovalsAlert(pendingUsers) {
    // Créer ou mettre à jour l'alerte des demandes en attente
    let alertContainer = document.getElementById('pendingApprovalsAlert');

    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'pendingApprovalsAlert';
        alertContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-left: 4px solid #ffc107;
            border-radius: 8px;
            padding: 1rem;
            max-width: 400px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        `;

        document.body.appendChild(alertContainer);
    }

    alertContainer.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
            <i class="fas fa-exclamation-triangle" style="color: #856404;"></i>
            <strong style="color: #856404;">Demandes d'approbation en attente</strong>
            <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; margin-left: auto; cursor: pointer; opacity: 0.7;">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <p style="margin: 0.5rem 0; color: #856404; font-size: 0.9rem;">
            ${pendingUsers.length} utilisateur(s) en attente d'approbation
        </p>
        <div style="margin-top: 1rem;">
            <button onclick="showSection('users'); this.parentElement.parentElement.parentElement.remove();" style="background: #ffc107; color: #000; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">
                <i class="fas fa-users"></i> Gérer les demandes
            </button>
        </div>
    `;

    // Supprimer automatiquement après 10 secondes
    setTimeout(() => {
        if (alertContainer.parentElement) {
            alertContainer.remove();
        }
    }, 10000);
}

async function loadStats() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');

        // Charger les statistiques générales
        const statsResponse = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Charger les statistiques des utilisateurs
        const userStatsResponse = await fetch('/api/admin/users/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (statsResponse.ok && userStatsResponse.ok) {
            const generalStats = await statsResponse.json();
            const userStats = await userStatsResponse.json();

            // Combiner les statistiques
            stats = {
                ...generalStats,
                userStats: userStats
            };

            updateStatsDisplay();
        }
    } catch (error) {
        console.error('❌ Erreur chargement statistiques:', error);
    }
}

function updateStatsDisplay() {
    // Mettre à jour les cartes de statistiques avec les bonnes données
    const elements = {
        'totalUsers': stats.userStats?.total || stats.users?.total_users || 0,
        'pendingUsers': stats.userStats?.pending || 0,
        'activeUsers': stats.userStats?.active || stats.users?.active_users || 0,
        'approvedUsers': stats.userStats?.approved || 0,
        'totalRevenue': `${(stats.subscriptions?.total_revenue || 0).toLocaleString()} FCFA`,
        'totalAttempts': stats.surveys?.total_attempts || 0,
        'passedAttempts': stats.surveys?.passed_attempts || 0,
        'pendingWithdrawals': stats.transactions?.pending_withdrawal_count || 0
    };

    Object.entries(elements).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    });

    // Mettre à jour les badges de navigation
    updateNavigationBadges();

    // Mettre à jour la carte des demandes d'approbation
    updatePendingApprovalsCard(stats.userStats?.pending || 0);

    console.log('📊 Statistiques mises à jour:', elements);
}

function updateNavigationBadges() {
    const pendingCount = stats.userStats?.pending || 0;

    // Mettre à jour le badge des utilisateurs en attente dans la navigation
    const pendingBadge = document.getElementById('pendingUsersBadge');
    if (pendingBadge) {
        pendingBadge.textContent = pendingCount;
        pendingBadge.style.display = pendingCount > 0 ? 'inline' : 'none';
    }

    // Mettre à jour le badge sur la carte des statistiques
    const pendingBadgeCard = document.getElementById('pendingUsersBadgeCard');
    if (pendingBadgeCard) {
        pendingBadgeCard.textContent = pendingCount;
        pendingBadgeCard.style.display = pendingCount > 0 ? 'flex' : 'none';
    }

    // Mettre à jour le badge des retraits en attente
    const withdrawalsBadge = document.getElementById('pendingWithdrawalsBadge');
    if (withdrawalsBadge && stats.transactions) {
        withdrawalsBadge.textContent = stats.transactions.pending_withdrawal_count || 0;
        withdrawalsBadge.style.display = stats.transactions.pending_withdrawal_count > 0 ? 'inline' : 'none';
    }

    console.log(`🔔 Badges mis à jour: ${pendingCount} utilisateurs en attente`);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function updateNavigationBadges() {
    const pendingUsersBadge = document.getElementById('pendingUsersBadge');
    if (pendingUsersBadge) {
        const pendingCount = stats.users?.pending || 0;
        pendingUsersBadge.textContent = pendingCount;
        pendingUsersBadge.style.display = pendingCount > 0 ? 'block' : 'none';
    }
    
    const pendingWithdrawalsBadge = document.getElementById('pendingWithdrawalsBadge');
    if (pendingWithdrawalsBadge) {
        const withdrawalCount = stats.transactions?.pending_withdrawal_count || 0;
        pendingWithdrawalsBadge.textContent = withdrawalCount;
        pendingWithdrawalsBadge.style.display = withdrawalCount > 0 ? 'block' : 'none';
    }
}

async function loadRecentActivity() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch('/api/admin/logs?limit=5', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            displayRecentActivity(data.logs || []);
        }
    } catch (error) {
        console.error('❌ Erreur chargement activité récente:', error);
        document.getElementById('recentActivity').innerHTML = '<p>❌ Erreur de chargement</p>';
    }
}

function displayRecentActivity(logs) {
    const container = document.getElementById('recentActivity');
    
    if (!logs || logs.length === 0) {
        container.innerHTML = '<p>Aucune activité récente</p>';
        return;
    }
    
    const html = logs.map(log => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="fas ${getActivityIcon(log.action)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-text">${getActivityText(log)}</div>
                <div class="activity-time">${formatDate(log.created_at)}</div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = html;
}

function getActivityIcon(action) {
    const icons = {
        'USER_REGISTERED': 'fa-user-plus',
        'USER_APPROVED': 'fa-check-circle',
        'LOGIN_SUCCESS': 'fa-sign-in-alt',
        'WITHDRAWAL_REQUESTED': 'fa-money-bill-wave',
        'SURVEY_COMPLETED': 'fa-poll'
    };
    return icons[action] || 'fa-info-circle';
}

function getActivityText(log) {
    const texts = {
        'USER_REGISTERED': 'Nouvel utilisateur inscrit',
        'USER_APPROVED': 'Utilisateur approuvé',
        'LOGIN_SUCCESS': 'Connexion utilisateur',
        'WITHDRAWAL_REQUESTED': 'Demande de retrait',
        'SURVEY_COMPLETED': 'Sondage terminé'
    };
    return texts[log.action] || log.action;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
    });
}

async function loadPendingCounts() {
    // Cette fonction charge les compteurs pour les badges
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');

        // Charger les statistiques des utilisateurs pour les badges
        const response = await fetch('/api/admin/users/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();

            // Mettre à jour le badge des utilisateurs en attente
            const pendingBadge = document.getElementById('pendingUsersBadge');
            if (pendingBadge) {
                pendingBadge.textContent = data.pending || 0;
                pendingBadge.style.display = data.pending > 0 ? 'inline' : 'none';
            }

            console.log(`📊 Badge mis à jour: ${data.pending} utilisateurs en attente`);
        }
    } catch (error) {
        console.error('❌ Erreur chargement compteurs:', error);
    }
}

// ===== GESTION DES SECTIONS =====
function loadSectionData(sectionName) {
    switch (sectionName) {
        case 'users':
            console.log('🔄 Chargement de la section utilisateurs...');
            loadUsers();
            break;
        case 'withdrawals':
            console.log('🔄 Chargement de la section retraits...');
            loadWithdrawals();
            break;
        case 'surveys':
            console.log('🔄 Chargement de la section sondages...');
            loadSurveys();
            break;
        case 'logs':
            console.log('🔄 Chargement de la section logs...');
            loadLogs();
            break;
        case 'settings':
            console.log('🔄 Chargement de la section paramètres...');
            loadSettings();
            break;
        default:
            console.log(`Section ${sectionName} non implémentée`);
            break;
    }
}

// ===== GESTION DES UTILISATEURS =====
async function loadUsers() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');

        // Charger tous les utilisateurs avec plus de détails
        const response = await fetch('/api/admin/users?limit=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            users = data.users || [];
            displayUsers(users);

            console.log(`📋 ${users.length} utilisateurs chargés`);

            // Afficher spécialement les utilisateurs en attente
            const pendingUsers = users.filter(u => !u.admin_approved);
            if (pendingUsers.length > 0) {
                console.log(`⏳ ${pendingUsers.length} utilisateurs en attente d'approbation:`, pendingUsers);
            }
        }
    } catch (error) {
        console.error('❌ Erreur chargement utilisateurs:', error);
        const usersTable = document.getElementById('usersTable');
        if (usersTable) {
            usersTable.innerHTML = '<p>❌ Erreur de chargement</p>';
        }
    }
}

function displayUsers(usersList) {
    const container = document.getElementById('usersTable');

    if (!usersList || usersList.length === 0) {
        container.innerHTML = '<p>Aucun utilisateur trouvé</p>';
        return;
    }

    // Séparer les utilisateurs en attente et approuvés
    const pendingUsers = usersList.filter(u => !u.admin_approved);
    const approvedUsers = usersList.filter(u => u.admin_approved);

    console.log(`👥 Affichage: ${pendingUsers.length} en attente, ${approvedUsers.length} approuvés`);

    const html = `
        <div class="table-header" style="margin-bottom: 2rem;">
            <h3>Gestion des Utilisateurs (${usersList.length} total)</h3>
            <div class="table-actions">
                <button class="btn btn-primary" onclick="refreshUsers()">
                    <i class="fas fa-sync"></i> Actualiser
                </button>
                <button class="btn btn-outline" onclick="exportUsers()">
                    <i class="fas fa-download"></i> Exporter
                </button>
            </div>
        </div>

        ${pendingUsers.length > 0 ? `
            <div class="section-header" style="background: #fff3cd; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0; color: #856404;"><i class="fas fa-clock"></i> Utilisateurs en attente d'approbation (${pendingUsers.length})</h3>
                <p style="margin: 0.5rem 0 0 0; color: #856404; font-size: 0.9rem;">Ces utilisateurs nécessitent votre approbation pour accéder à la plateforme</p>
            </div>
            ${generateUserTable(pendingUsers, true)}
        ` : ''}

        ${approvedUsers.length > 0 ? `
            <div class="section-header" style="background: #d1edff; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #0d6efd;">
                <h3 style="margin: 0; color: #084298;"><i class="fas fa-check-circle"></i> Utilisateurs approuvés (${approvedUsers.length})</h3>
                <p style="margin: 0.5rem 0 0 0; color: #084298; font-size: 0.9rem;">Utilisateurs actifs avec accès complet à la plateforme</p>
            </div>
            ${generateUserTable(approvedUsers, false)}
        ` : ''}
    `;

    container.innerHTML = html;
}

function generateUserCards(users, isPending) {
    return `
        <div class="users-grid" style="display: grid; gap: 1.5rem;">
            ${users.map(user => `
                <div class="user-card" style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border-left: 4px solid ${isPending ? '#ffc107' : '#28a745'};">
                    <div class="user-card-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem;">
                        <div class="user-avatar" style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.4rem;">
                            ${(user.first_name?.[0] || '').toUpperCase()}${(user.last_name?.[0] || '').toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0; font-size: 1.2rem; color: #333;">${user.first_name} ${user.last_name}</h4>
                            <p style="margin: 0.25rem 0 0 0; color: #666; font-size: 0.9rem;">ID: ${user.id} • ${user.profession || 'Non spécifié'}</p>
                            ${isPending ? '<span style="background: #fff3cd; color: #856404; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold;"><i class="fas fa-clock"></i> En attente</span>' : '<span style="background: #d4edda; color: #155724; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.8rem; font-weight: bold;"><i class="fas fa-check"></i> Approuvé</span>'}
                        </div>
                    </div>

                    <div class="user-details" style="display: grid; gap: 0.75rem; margin-bottom: 1.5rem;">
                        <div class="detail-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-envelope" style="color: #6c757d; width: 16px;"></i>
                            <span style="font-size: 0.9rem; color: #495057; font-family: monospace; background: #f8f9fa; padding: 0.25rem 0.5rem; border-radius: 4px; flex: 1;">${user.email}</span>
                            <button onclick="copyToClipboard('${user.email}')" style="background: #17a2b8; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" title="Copier email">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>

                        ${user.phone ? `
                        <div class="detail-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-phone" style="color: #6c757d; width: 16px;"></i>
                            <span style="font-size: 0.9rem; color: #495057; font-family: monospace; background: #f8f9fa; padding: 0.25rem 0.5rem; border-radius: 4px; flex: 1;">${user.phone}</span>
                            <button onclick="copyToClipboard('${user.phone}')" style="background: #17a2b8; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" title="Copier téléphone">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                        ` : ''}

                        ${user.country ? `
                        <div class="detail-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-globe" style="color: #6c757d; width: 16px;"></i>
                            <span style="font-size: 0.9rem; color: #495057;">${user.country}</span>
                        </div>
                        ` : ''}

                        <div class="detail-item" style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-calendar" style="color: #6c757d; width: 16px;"></i>
                            <span style="font-size: 0.9rem; color: #495057;">Inscrit le ${new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                    </div>

                    <div class="user-actions" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        ${isPending ? `
                            <button onclick="approveUser(${user.id})" style="background: #28a745; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; flex: 1; min-width: 120px;">
                                <i class="fas fa-check"></i> Approuver
                            </button>
                            <button onclick="rejectUser(${user.id})" style="background: #dc3545; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; flex: 1; min-width: 120px;">
                                <i class="fas fa-times"></i> Rejeter
                            </button>
                        ` : `
                            <button onclick="viewUserDetails(${user.id})" style="background: #17a2b8; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; flex: 1;">
                                <i class="fas fa-eye"></i> Détails
                            </button>
                            <button onclick="toggleUserStatus(${user.id})" style="background: #6c757d; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem; flex: 1;">
                                <i class="fas fa-toggle-on"></i> ${user.is_active ? 'Désactiver' : 'Activer'}
                            </button>
                        `}
                        <button onclick="copyAllUserInfo(${user.id}, '${user.first_name}', '${user.last_name}', '${user.email}', '${user.phone || ''}', '${user.country || ''}', '${user.profession || ''}')"
                                style="background: #fd7e14; color: white; border: none; padding: 0.5rem; border-radius: 6px; cursor: pointer; font-size: 0.9rem;"
                                title="Copier toutes les infos">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Fonction originale pour le tableau (gardée pour compatibilité)
function generateUserTable(users, isPending) {
    return `
        <table class="admin-table" style="margin-bottom: 2rem;">
            <thead>
                <tr ${isPending ? 'style="background: #fff3cd;"' : ''}>
                    <th style="width: 50%;">Coordonnées Complètes</th>
                    <th style="width: 20%;">Statut & Activité</th>
                    <th style="width: 15%;">Inscription</th>
                    <th style="width: 15%;">Actions</th>
                </tr>
            </thead>
            <tbody>
                ${users.map(user => `
                    <tr ${isPending ? 'style="background: #fffbf0;"' : ''}>
                        <td>
                            <div class="user-full-details">
                                <div class="user-header" style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #e9ecef;">
                                    <div class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 1.2rem;">
                                        ${(user.first_name?.[0] || '').toUpperCase()}${(user.last_name?.[0] || '').toUpperCase()}
                                    </div>
                                    <div style="flex: 1;">
                                        <div style="font-size: 1.1rem; font-weight: bold; color: #333;">${user.first_name} ${user.last_name}</div>
                                        <div style="font-size: 0.9rem; color: #666;">ID: ${user.id}</div>
                                    </div>
                                    <button class="copy-all-btn" onclick="copyAllUserInfo(${user.id}, '${user.first_name}', '${user.last_name}', '${user.email}', '${user.phone || ''}', '${user.country || ''}', '${user.profession || ''}')"
                                            style="background: #17a2b8; color: white; border: none; padding: 0.5rem; border-radius: 4px; cursor: pointer;"
                                            title="Copier toutes les informations">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>

                                <div class="contact-details" style="display: grid; gap: 0.75rem;">
                                    <div class="detail-row" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-weight: 500; color: #495057; min-width: 100px;">📧 Email :</span>
                                        <span style="flex: 1; font-family: monospace; background: #f8f9fa; padding: 0.25rem 0.5rem; border-radius: 4px;">${user.email}</span>
                                        <button onclick="copyToClipboard('${user.email}')" style="background: #28a745; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" title="Copier email">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>

                                    ${user.phone ? `
                                    <div class="detail-row" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-weight: 500; color: #495057; min-width: 100px;">📱 Téléphone :</span>
                                        <span style="flex: 1; font-family: monospace; background: #f8f9fa; padding: 0.25rem 0.5rem; border-radius: 4px;">${user.phone}</span>
                                        <button onclick="copyToClipboard('${user.phone}')" style="background: #28a745; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem;" title="Copier téléphone">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                    </div>
                                    ` : `
                                    <div class="detail-row" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-weight: 500; color: #495057; min-width: 100px;">📱 Téléphone :</span>
                                        <span style="flex: 1; color: #6c757d; font-style: italic;">Non renseigné</span>
                                    </div>
                                    `}

                                    <div class="detail-row" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-weight: 500; color: #495057; min-width: 100px;">🌍 Pays :</span>
                                        <span style="flex: 1;">${user.country || 'Non renseigné'} ${user.country_code ? `(${user.country_code})` : ''}</span>
                                    </div>

                                    <div class="detail-row" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-weight: 500; color: #495057; min-width: 100px;">💼 Profession :</span>
                                        <span style="flex: 1;">${formatProfession(user.profession)}</span>
                                    </div>

                                    ${user.postal_code ? `
                                    <div class="detail-row" style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-weight: 500; color: #495057; min-width: 100px;">📮 Code postal :</span>
                                        <span style="flex: 1;">${user.postal_code}</span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </td>
                        <td>
                            <div class="status-info" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${getUserStatusBadge(user)}
                                <div style="font-size: 0.8rem; color: ${user.is_active ? '#28a745' : '#dc3545'};">
                                    <i class="fas fa-circle" style="font-size: 0.6rem;"></i> ${user.is_active ? 'Actif' : 'Inactif'}
                                </div>
                                <div style="font-size: 0.8rem; color: ${user.email_verified ? '#28a745' : '#ffc107'};">
                                    <i class="fas fa-${user.email_verified ? 'check' : 'exclamation-triangle'}" style="font-size: 0.6rem;"></i> Email ${user.email_verified ? 'vérifié' : 'non vérifié'}
                                </div>
                                ${user.last_login ? `
                                <div style="font-size: 0.8rem; color: #6c757d;">
                                    <i class="fas fa-clock" style="font-size: 0.6rem;"></i> Dernière connexion: ${formatDate(user.last_login)}
                                </div>
                                ` : `
                                <div style="font-size: 0.8rem; color: #6c757d;">
                                    <i class="fas fa-clock" style="font-size: 0.6rem;"></i> Jamais connecté
                                </div>
                                `}
                            </div>
                        </td>
                        <td>
                            <div style="font-size: 0.9rem; color: #495057;">${formatDate(user.created_at)}</div>
                            <div style="font-size: 0.8rem; color: #6c757d;">${getRelativeTime(user.created_at)}</div>
                        </td>
                        <td>
                            <div class="action-buttons" style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${getUserActions(user)}
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ===== GESTION DES SONDAGES =====
async function loadSurveys() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');

        // Charger les sondages et leurs statistiques
        const [surveysResponse, statsResponse] = await Promise.all([
            fetch('/api/admin/surveys?limit=20', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/admin/surveys/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        if (surveysResponse.ok && statsResponse.ok) {
            const surveysData = await surveysResponse.json();
            const statsData = await statsResponse.json();

            displaySurveys(surveysData.surveys, statsData);
            console.log(`📋 ${surveysData.surveys.length} sondages chargés`);
        }
    } catch (error) {
        console.error('❌ Erreur chargement sondages:', error);
        const container = document.getElementById('surveysTable') || document.querySelector('.content-section.active .table-container');
        if (container) {
            container.innerHTML = '<p>❌ Erreur de chargement des sondages</p>';
        }
    }
}

function displaySurveys(surveys, stats) {
    const container = document.getElementById('surveysTable') || document.querySelector('.content-section.active .table-container');
    if (!container) return;

    if (!surveys || surveys.length === 0) {
        container.innerHTML = '<p>Aucun sondage trouvé</p>';
        return;
    }

    const html = `
        <!-- Statistiques des sondages -->
        <div class="stats-grid" style="margin-bottom: 2rem;">
            <div class="stat-card">
                <div class="stat-icon primary">
                    <i class="fas fa-poll"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.total}</div>
                    <div class="stat-label">Total tentatives</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon success">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.completed}</div>
                    <div class="stat-label">Terminés</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon warning">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${stats.passed}</div>
                    <div class="stat-label">Réussis</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon info">
                    <i class="fas fa-coins"></i>
                </div>
                <div class="stat-content">
                    <div class="stat-value">${formatAmount(stats.totalRewards)}</div>
                    <div class="stat-label">Récompenses payées</div>
                </div>
            </div>
        </div>

        <!-- Table des sondages -->
        <table class="admin-table">
            <thead>
                <tr>
                    <th>Utilisateur</th>
                    <th>Thème</th>
                    <th>Score</th>
                    <th>Statut</th>
                    <th>Récompense</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${surveys.map(survey => `
                    <tr>
                        <td>
                            <div class="user-info">
                                <strong>${survey.first_name} ${survey.last_name}</strong>
                                <br><small>${survey.email}</small>
                            </div>
                        </td>
                        <td>${survey.theme_name || 'N/A'}</td>
                        <td>
                            <span class="score-badge ${survey.score >= 8 ? 'high' : survey.score >= 6 ? 'medium' : 'low'}">
                                ${survey.score || 0}/10
                            </span>
                        </td>
                        <td>${getSurveyStatusBadge(survey)}</td>
                        <td>${survey.reward_amount ? formatAmount(survey.reward_amount) : '-'}</td>
                        <td>${formatDate(survey.started_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function getSurveyStatusBadge(survey) {
    if (!survey.is_completed) {
        return '<span class="badge badge-warning">En cours</span>';
    } else if (survey.is_passed) {
        return '<span class="badge badge-success">Réussi</span>';
    } else {
        return '<span class="badge badge-danger">Échoué</span>';
    }
}

function formatAmount(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

// ===== GESTION DES RETRAITS =====
async function loadWithdrawals() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');

        const response = await fetch('/api/admin/withdrawals?limit=20', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayWithdrawals(data.withdrawals);
            console.log(`💰 ${data.withdrawals.length} demandes de retrait chargées`);
        }
    } catch (error) {
        console.error('❌ Erreur chargement retraits:', error);
        const container = document.getElementById('withdrawalsTable') || document.querySelector('.content-section.active .table-container');
        if (container) {
            container.innerHTML = '<p>❌ Erreur de chargement des retraits</p>';
        }
    }
}

function displayWithdrawals(withdrawals) {
    const container = document.getElementById('withdrawalsTable') || document.querySelector('.content-section.active .table-container');
    if (!container) return;

    if (!withdrawals || withdrawals.length === 0) {
        container.innerHTML = '<p>Aucune demande de retrait trouvée</p>';
        return;
    }

    // Séparer les demandes en attente et traitées
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
    const processedWithdrawals = withdrawals.filter(w => w.status !== 'pending');

    const html = `
        ${pendingWithdrawals.length > 0 ? `
            <div class="section-header" style="background: #fff3cd; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h3 style="margin: 0; color: #856404;"><i class="fas fa-clock"></i> Demandes en attente (${pendingWithdrawals.length})</h3>
            </div>
            <table class="admin-table" style="margin-bottom: 2rem;">
                <thead>
                    <tr style="background: #fff3cd;">
                        <th>Utilisateur</th>
                        <th>Montant</th>
                        <th>Méthode</th>
                        <th>Date demande</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${pendingWithdrawals.map(withdrawal => `
                        <tr style="background: #fffbf0;">
                            <td>
                                <div class="user-info">
                                    <strong>${withdrawal.first_name} ${withdrawal.last_name}</strong>
                                    <br><small>${withdrawal.email}</small>
                                    <br><small>Solde: ${formatAmount(withdrawal.balance)}</small>
                                </div>
                            </td>
                            <td>
                                <strong style="color: #dc3545;">${formatAmount(Math.abs(withdrawal.amount))}</strong>
                            </td>
                            <td>${withdrawal.payment_method || 'N/A'}</td>
                            <td>${formatDate(withdrawal.created_at)}</td>
                            <td>
                                <div class="actions">
                                    <button class="btn btn-sm btn-success" onclick="processWithdrawal(${withdrawal.id}, 'approve')" title="Approuver">
                                        <i class="fas fa-check"></i> Approuver
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="processWithdrawal(${withdrawal.id}, 'reject')" title="Rejeter">
                                        <i class="fas fa-times"></i> Rejeter
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}

        ${processedWithdrawals.length > 0 ? `
            <div class="section-header" style="background: #d1edff; padding: 1rem; margin-bottom: 1rem; border-radius: 8px; border-left: 4px solid #0d6efd;">
                <h3 style="margin: 0; color: #084298;"><i class="fas fa-history"></i> Demandes traitées (${processedWithdrawals.length})</h3>
            </div>
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Utilisateur</th>
                        <th>Montant</th>
                        <th>Statut</th>
                        <th>Date demande</th>
                        <th>Date traitement</th>
                    </tr>
                </thead>
                <tbody>
                    ${processedWithdrawals.map(withdrawal => `
                        <tr>
                            <td>
                                <div class="user-info">
                                    <strong>${withdrawal.first_name} ${withdrawal.last_name}</strong>
                                    <br><small>${withdrawal.email}</small>
                                </div>
                            </td>
                            <td>${formatAmount(Math.abs(withdrawal.amount))}</td>
                            <td>${getWithdrawalStatusBadge(withdrawal.status)}</td>
                            <td>${formatDate(withdrawal.created_at)}</td>
                            <td>${withdrawal.processed_at ? formatDate(withdrawal.processed_at) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : ''}
    `;

    container.innerHTML = html;
}

function getWithdrawalStatusBadge(status) {
    switch (status) {
        case 'pending':
            return '<span class="badge badge-warning">En attente</span>';
        case 'completed':
            return '<span class="badge badge-success">Approuvé</span>';
        case 'rejected':
            return '<span class="badge badge-danger">Rejeté</span>';
        default:
            return '<span class="badge badge-secondary">Inconnu</span>';
    }
}

async function processWithdrawal(withdrawalId, action) {
    const actionText = action === 'approve' ? 'approuver' : 'rejeter';
    let reason = '';

    if (action === 'reject') {
        reason = prompt('Raison du rejet (optionnel):');
        if (reason === null) return; // Utilisateur a annulé
    }

    if (!confirm(`Êtes-vous sûr de vouloir ${actionText} cette demande de retrait ?`)) {
        return;
    }

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/withdrawals/${withdrawalId}/process`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ action, reason })
        });

        if (response.ok) {
            showNotification(`Demande de retrait ${actionText === 'approuver' ? 'approuvée' : 'rejetée'} avec succès`, 'success');
            loadWithdrawals(); // Recharger la liste
            loadStats(); // Mettre à jour les statistiques
        } else {
            const data = await response.json();
            showNotification(data.error || 'Erreur lors du traitement', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur traitement retrait:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

// ===== GESTION DES LOGS =====
async function loadLogs() {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');

        const response = await fetch('/api/admin/logs?limit=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            displayLogs(data.logs);
            console.log(`📋 ${data.logs.length} logs chargés`);
        }
    } catch (error) {
        console.error('❌ Erreur chargement logs:', error);
        const container = document.getElementById('logsTable') || document.querySelector('.content-section.active .table-container');
        if (container) {
            container.innerHTML = '<p>❌ Erreur de chargement des logs</p>';
        }
    }
}

function displayLogs(logs) {
    const container = document.getElementById('logsTable') || document.querySelector('.content-section.active .table-container');
    if (!container) return;

    if (!logs || logs.length === 0) {
        container.innerHTML = '<p>Aucun log trouvé</p>';
        return;
    }

    const html = `
        <div style="margin-bottom: 1rem;">
            <h3><i class="fas fa-list-alt"></i> Logs d'activité (${logs.length})</h3>
            <p style="color: #666;">Historique des actions effectuées sur la plateforme</p>
        </div>

        <table class="admin-table">
            <thead>
                <tr>
                    <th>Utilisateur</th>
                    <th>Action</th>
                    <th>Détails</th>
                    <th>IP</th>
                    <th>Date</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(log => `
                    <tr>
                        <td>
                            ${log.first_name && log.last_name ? `
                                <div class="user-info">
                                    <strong>${log.first_name} ${log.last_name}</strong>
                                    <br><small>${log.email}</small>
                                </div>
                            ` : `
                                <span style="color: #666;">ID: ${log.user_id}</span>
                            `}
                        </td>
                        <td>
                            <span class="action-badge ${getActionBadgeClass(log.action)}">
                                ${getActionText(log.action)}
                            </span>
                        </td>
                        <td>
                            <small style="color: #666;">${log.details || '-'}</small>
                        </td>
                        <td>
                            <code style="font-size: 0.8rem;">${log.ip_address || '-'}</code>
                        </td>
                        <td>${formatDateTime(log.created_at)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

function getActionBadgeClass(action) {
    const actionClasses = {
        'LOGIN_SUCCESS': 'success',
        'LOGIN_FAILED': 'danger',
        'USER_REGISTERED': 'info',
        'USER_APPROVED': 'success',
        'USER_REJECTED': 'danger',
        'WITHDRAWAL_REQUESTED': 'warning',
        'WITHDRAWAL_APPROVED': 'success',
        'WITHDRAWAL_REJECTED': 'danger',
        'SURVEY_COMPLETED': 'info',
        'SURVEY_PASSED': 'success'
    };
    return actionClasses[action] || 'secondary';
}

function getActionText(action) {
    const actionTexts = {
        'LOGIN_SUCCESS': 'Connexion réussie',
        'LOGIN_FAILED': 'Échec connexion',
        'USER_REGISTERED': 'Inscription',
        'USER_APPROVED': 'Utilisateur approuvé',
        'USER_REJECTED': 'Utilisateur rejeté',
        'USER_ACTIVATED': 'Utilisateur activé',
        'USER_DEACTIVATED': 'Utilisateur désactivé',
        'USER_DELETED': 'Utilisateur supprimé',
        'WITHDRAWAL_REQUESTED': 'Demande retrait',
        'WITHDRAWAL_APPROVED': 'Retrait approuvé',
        'WITHDRAWAL_REJECTED': 'Retrait rejeté',
        'SURVEY_COMPLETED': 'Sondage terminé',
        'SURVEY_PASSED': 'Sondage réussi',
        'SETTINGS_UPDATED': 'Paramètres modifiés'
    };
    return actionTexts[action] || action;
}

function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ===== GESTION DES PARAMÈTRES =====
async function loadSettings() {
    console.log('🔄 Début chargement des paramètres...');

    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        console.log('🔍 Token trouvé:', token ? 'Oui' : 'Non');

        if (!token) {
            throw new Error('Aucun token d\'authentification trouvé');
        }

        console.log('📡 Appel API /api/admin/settings...');
        const response = await fetch('/api/admin/settings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log('📡 Réponse API:', response.status, response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log('📊 Données reçues:', data);

            console.log('🎨 Appel displaySettings...');
            displaySettings(data.settings);
            console.log('✅ Paramètres chargés avec succès');
        } else {
            const errorData = await response.json();
            console.error('❌ Erreur API:', response.status, errorData);
            throw new Error(`Erreur API ${response.status}: ${errorData.error || 'Erreur inconnue'}`);
        }
    } catch (error) {
        console.error('❌ Erreur chargement paramètres:', error);
        const container = document.getElementById('settingsContainer') || document.querySelector('.content-section.active .table-container');
        console.log('🔍 Container trouvé:', container ? 'Oui' : 'Non');

        if (container) {
            container.innerHTML = `
                <div style="padding: 2rem; text-align: center; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3>Erreur de chargement des paramètres</h3>
                    <p>${error.message}</p>
                    <button onclick="loadSettings()" style="background: #667eea; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; cursor: pointer; margin-top: 1rem;">
                        <i class="fas fa-sync"></i> Réessayer
                    </button>
                </div>
            `;
        } else {
            console.error('❌ Container settingsContainer non trouvé !');
        }
    }
}

function displaySettings(settings) {
    console.log('🎨 Début displaySettings avec:', settings);

    const container = document.getElementById('settingsContainer') || document.querySelector('.content-section.active .table-container');
    console.log('🔍 Container displaySettings:', container ? 'Trouvé' : 'Non trouvé');

    if (!container) {
        console.error('❌ Container settingsContainer non trouvé dans displaySettings !');
        return;
    }

    const html = `
        <div style="margin-bottom: 2rem;">
            <h3><i class="fas fa-cog"></i> Paramètres système</h3>
            <p style="color: #666;">Configuration de la plateforme GeoPoll</p>
        </div>

        <div class="settings-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
            <!-- Paramètres de la plateforme -->
            <div class="settings-card" style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e9ecef;">
                <h4 style="margin-bottom: 1rem; color: #333;"><i class="fas fa-globe"></i> Plateforme</h4>
                <div class="setting-item">
                    <label>Nom de la plateforme:</label>
                    <input type="text" value="${settings.platform.name}" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
                </div>
                <div class="setting-item" style="margin-top: 1rem;">
                    <label>Version:</label>
                    <input type="text" value="${settings.platform.version}" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
                </div>
                <div class="setting-item" style="margin-top: 1rem;">
                    <label>Environnement:</label>
                    <span class="badge badge-${settings.platform.environment === 'production' ? 'success' : 'warning'}">${settings.platform.environment}</span>
                </div>
            </div>

            <!-- Paramètres des récompenses -->
            <div class="settings-card" style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e9ecef;">
                <h4 style="margin-bottom: 1rem; color: #333;"><i class="fas fa-coins"></i> Récompenses</h4>
                <div class="setting-item">
                    <label>Récompense par sondage:</label>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="number" value="${settings.rewards.surveyReward}" id="surveyReward" style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <span>${settings.rewards.currency}</span>
                        <button onclick="updateSetting('rewards', 'surveyReward', document.getElementById('surveyReward').value)" class="btn btn-sm btn-primary">
                            <i class="fas fa-save"></i>
                        </button>
                    </div>
                </div>
                <div class="setting-item" style="margin-top: 1rem;">
                    <label>Retrait minimum:</label>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="number" value="${settings.rewards.minimumWithdrawal}" id="minimumWithdrawal" style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
                        <span>${settings.rewards.currency}</span>
                        <button onclick="updateSetting('rewards', 'minimumWithdrawal', document.getElementById('minimumWithdrawal').value)" class="btn btn-sm btn-primary">
                            <i class="fas fa-save"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Paramètres de sécurité -->
            <div class="settings-card" style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e9ecef;">
                <h4 style="margin-bottom: 1rem; color: #333;"><i class="fas fa-shield-alt"></i> Sécurité</h4>
                <div class="setting-item">
                    <label>Expiration JWT:</label>
                    <input type="text" value="${settings.security.jwtExpiration}" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
                </div>
                <div class="setting-item" style="margin-top: 1rem;">
                    <label>Tentatives de connexion max:</label>
                    <input type="number" value="${settings.security.maxLoginAttempts}" readonly style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; background: #f8f9fa;">
                </div>
            </div>

            <!-- Fonctionnalités -->
            <div class="settings-card" style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e9ecef;">
                <h4 style="margin-bottom: 1rem; color: #333;"><i class="fas fa-toggle-on"></i> Fonctionnalités</h4>
                <div class="setting-item">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" ${settings.features.emailVerification ? 'checked' : ''} onchange="updateSetting('features', 'emailVerification', this.checked)">
                        Vérification email
                    </label>
                </div>
                <div class="setting-item" style="margin-top: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" ${settings.features.adminApproval ? 'checked' : ''} onchange="updateSetting('features', 'adminApproval', this.checked)">
                        Approbation admin requise
                    </label>
                </div>
                <div class="setting-item" style="margin-top: 1rem;">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" ${settings.features.autoRewards ? 'checked' : ''} onchange="updateSetting('features', 'autoRewards', this.checked)">
                        Récompenses automatiques
                    </label>
                </div>
            </div>
        </div>

        <!-- Actions système -->
        <div style="margin-top: 2rem; padding: 1.5rem; background: #f8f9fa; border-radius: 8px;">
            <h4 style="margin-bottom: 1rem;"><i class="fas fa-tools"></i> Actions système</h4>
            <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
                <button onclick="exportData()" class="btn btn-outline">
                    <i class="fas fa-download"></i> Exporter les données
                </button>
                <button onclick="clearLogs()" class="btn btn-outline">
                    <i class="fas fa-trash"></i> Vider les logs
                </button>
                <button onclick="sendTestNotification()" class="btn btn-outline">
                    <i class="fas fa-bell"></i> Test notification
                </button>
                <button onclick="refreshCache()" class="btn btn-outline">
                    <i class="fas fa-sync"></i> Actualiser cache
                </button>
            </div>
        </div>
    `;

    container.innerHTML = html;
    console.log('✅ displaySettings terminé - HTML injecté dans le container');
}

async function updateSetting(category, key, value) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch('/api/admin/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ category, key, value })
        });

        if (response.ok) {
            showNotification(`Paramètre ${category}.${key} mis à jour`, 'success');
        } else {
            showNotification('Erreur lors de la mise à jour', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur mise à jour paramètre:', error);
        showNotification('Erreur de connexion', 'error');
    }
}

// Actions système
function exportData() {
    showNotification('Export des données - Fonctionnalité à venir', 'info');
}

function clearLogs() {
    if (confirm('Êtes-vous sûr de vouloir vider tous les logs ?')) {
        showNotification('Logs vidés - Fonctionnalité à venir', 'info');
    }
}

function sendTestNotification() {
    showNotification('Notification de test envoyée !', 'success');
}

function refreshCache() {
    showNotification('Cache actualisé', 'success');
    // Recharger les statistiques
    loadStats();
}

function getUserStatusBadge(user) {
    if (user.admin_approved) {
        return '<span class="badge badge-success">Approuvé</span>';
    } else {
        return '<span class="badge badge-warning">En attente</span>';
    }
}

function getUserActions(user) {
    const actions = [];
    
    if (!user.admin_approved) {
        actions.push(`
            <button class="btn btn-sm btn-success" onclick="approveUser(${user.id})">
                <i class="fas fa-check"></i> Approuver
            </button>
        `);
        actions.push(`
            <button class="btn btn-sm btn-danger" onclick="rejectUser(${user.id})">
                <i class="fas fa-times"></i> Rejeter
            </button>
        `);
    }
    
    return actions.join(' ');
}

// ===== ACTIONS UTILISATEURS =====
async function approveUser(userId) {
    if (!confirm('Approuver cet utilisateur ?')) return;
    
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/users/${userId}/approve`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showNotification('✅ Utilisateur approuvé avec succès', 'success');
            loadUsers();
            loadStats();
        } else {
            showNotification('❌ Erreur lors de l\'approbation', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur approbation:', error);
        showNotification('❌ Erreur de connexion', 'error');
    }
}

async function rejectUser(userId) {
    if (!confirm('Rejeter cet utilisateur ?')) return;
    
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const response = await fetch(`/api/admin/users/${userId}/reject`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            showNotification('✅ Utilisateur rejeté', 'success');
            loadUsers();
            loadStats();
        } else {
            showNotification('❌ Erreur lors du rejet', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur rejet:', error);
        showNotification('❌ Erreur de connexion', 'error');
    }
}

// ===== UTILITAIRES =====
function setupEventListeners() {
    // Actualisation automatique toutes les 30 secondes
    setInterval(() => {
        console.log('🔄 Actualisation automatique...');
        if (currentSection === 'dashboard') {
            loadStats();
            loadRecentActivity();
        } else if (currentSection === 'users') {
            loadUsers();
            loadStats(); // Pour mettre à jour les compteurs
        }
    }, 30000);

    // Actualisation manuelle au clic
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            console.log('🔄 Actualisation manuelle...');
            loadSectionData(currentSection);
            loadStats();
        });
    }
}

function refreshUsers() {
    loadUsers();
}

function refreshSurveys() {
    loadSurveys();
}

function refreshWithdrawals() {
    loadWithdrawals();
}

function refreshQuiz() {
    // TODO: Implémenter le chargement des quiz
    showNotification('Fonctionnalité quiz en développement', 'info');
}

function createSurvey() {
    // TODO: Implémenter la création de sondage
    showNotification('Fonctionnalité création de sondage en développement', 'info');
}

function createQuiz() {
    // TODO: Implémenter la création de quiz
    showNotification('Fonctionnalité création de quiz en développement', 'info');
}

function exportWithdrawals() {
    // TODO: Implémenter l'export des retraits
    showNotification('Fonctionnalité export en développement', 'info');
}

// Fonction supprimée - pas utilisée dans la version tableau

// Nouvelle fonction pour voir les détails d'un utilisateur
function viewUserDetails(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 1000; display: flex;
        align-items: center; justify-content: center;
    `;

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0;">Détails de ${user.first_name} ${user.last_name}</h3>
                <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #999;">×</button>
            </div>

            <div style="display: grid; gap: 1rem;">
                <div><strong>Email:</strong> ${user.email}</div>
                <div><strong>Téléphone:</strong> ${user.phone || 'Non renseigné'}</div>
                <div><strong>Pays:</strong> ${user.country || 'Non renseigné'}</div>
                <div><strong>Profession:</strong> ${user.profession || 'Non renseignée'}</div>
                <div><strong>Statut:</strong> ${user.admin_approved ? 'Approuvé' : 'En attente'}</div>
                <div><strong>Actif:</strong> ${user.is_active ? 'Oui' : 'Non'}</div>
                <div><strong>Solde:</strong> ${user.balance || 0} FCFA</div>
                <div><strong>Inscription:</strong> ${new Date(user.created_at).toLocaleString('fr-FR')}</div>
                <div><strong>Dernière connexion:</strong> ${user.last_login ? new Date(user.last_login).toLocaleString('fr-FR') : 'Jamais'}</div>
            </div>

            <div style="margin-top: 1.5rem; display: flex; gap: 0.5rem;">
                <button onclick="copyAllUserInfo(${user.id}, '${user.first_name}', '${user.last_name}', '${user.email}', '${user.phone || ''}', '${user.country || ''}', '${user.profession || ''}')"
                        style="background: #17a2b8; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-copy"></i> Copier infos
                </button>
                <button onclick="this.closest('.modal').remove()" style="background: #6c757d; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
                    Fermer
                </button>
            </div>
        </div>
    `;

    modal.className = 'modal';
    document.body.appendChild(modal);

    // Fermer en cliquant à l'extérieur
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

// Fonction pour activer/désactiver un utilisateur
async function toggleUserStatus(userId) {
    try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const user = users.find(u => u.id === userId);

        const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ isActive: !user.is_active })
        });

        if (response.ok) {
            showNotification(`✅ Utilisateur ${user.is_active ? 'désactivé' : 'activé'} avec succès`, 'success');
            loadUsers();
        } else {
            showNotification('❌ Erreur lors de la modification du statut', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('❌ Erreur lors de la modification du statut', 'error');
    }
}

function filterUsers() {
    // Implémentation du filtrage
    const status = document.getElementById('userStatusFilter').value;
    // TODO: Implémenter le filtrage
}

function searchUsers() {
    // Implémentation de la recherche
    const search = document.getElementById('userSearchInput').value;
    // TODO: Implémenter la recherche
}

// ===== MENU DÉROULANT UTILISATEUR =====
function toggleUserDropdown() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Fermer le menu si on clique ailleurs
document.addEventListener('click', function(event) {
    const adminUser = document.getElementById('adminUser');
    const dropdown = document.getElementById('userDropdown');

    if (adminUser && dropdown && !adminUser.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Fonctions du menu utilisateur
function showProfile() {
    console.log('🔄 Affichage du profil admin...');

    // Obtenir les informations de l'utilisateur connecté
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Créer une modal pour le profil
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 2rem; border-radius: 12px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0;"><i class="fas fa-user-shield"></i> Profil Administrateur</h3>
                <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; margin-left: auto;">&times;</button>
            </div>

            <div class="profile-info">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; color: white; font-size: 2rem;">
                        <i class="fas fa-user-shield"></i>
                    </div>
                    <h4 style="margin: 0;">${user.firstName || user.first_name} ${user.lastName || user.last_name}</h4>
                    <p style="color: #666; margin: 0.5rem 0;">Super Administrateur</p>
                </div>

                <div class="profile-details">
                    <div style="margin-bottom: 1rem;">
                        <label style="font-weight: 500; color: #333;">Email:</label>
                        <p style="margin: 0.25rem 0; color: #666;">${user.email}</p>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="font-weight: 500; color: #333;">ID Utilisateur:</label>
                        <p style="margin: 0.25rem 0; color: #666;">${user.id}</p>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="font-weight: 500; color: #333;">Statut:</label>
                        <span class="badge badge-success">Administrateur Actif</span>
                    </div>

                    <div style="margin-bottom: 1rem;">
                        <label style="font-weight: 500; color: #333;">Dernière connexion:</label>
                        <p style="margin: 0.25rem 0; color: #666;">${new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                </div>

                <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e9ecef;">
                    <h5 style="margin-bottom: 1rem;">Permissions</h5>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-check-circle" style="color: #28a745;"></i>
                            <span>Gestion des utilisateurs</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-check-circle" style="color: #28a745;"></i>
                            <span>Gestion des sondages</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-check-circle" style="color: #28a745;"></i>
                            <span>Gestion des retraits</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-check-circle" style="color: #28a745;"></i>
                            <span>Accès aux logs</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-check-circle" style="color: #28a745;"></i>
                            <span>Configuration système</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <i class="fas fa-check-circle" style="color: #28a745;"></i>
                            <span>Accès complet</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 2rem; text-align: center;">
                <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-primary">
                    Fermer
                </button>
            </div>
        </div>
    `;

    // Fermer en cliquant sur l'overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
    toggleUserDropdown();
}

function showSettings() {
    console.log('⚙️ Affichage des paramètres...');
    // TODO: Implémenter les paramètres
    showNotification('Paramètres - Fonctionnalité à venir', 'info');
    toggleUserDropdown();
}

function showHelp() {
    console.log('❓ Affichage de l\'aide...');

    // Créer une modal pour l'aide
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    modal.innerHTML = `
        <div class="modal-content" style="background: white; padding: 2rem; border-radius: 12px; max-width: 800px; width: 90%; max-height: 80vh; overflow-y: auto;">
            <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0;"><i class="fas fa-question-circle"></i> Guide d'utilisation - Interface Admin</h3>
                <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; margin-left: auto;">&times;</button>
            </div>

            <div class="help-content">
                <div style="margin-bottom: 2rem;">
                    <h4><i class="fas fa-tachometer-alt"></i> Dashboard</h4>
                    <p>Le tableau de bord affiche les statistiques en temps réel de la plateforme :</p>
                    <ul>
                        <li>Nombre d'utilisateurs total, en attente et actifs</li>
                        <li>Revenus générés et transactions</li>
                        <li>Activité récente des utilisateurs</li>
                        <li>Actualisation automatique toutes les 30 secondes</li>
                    </ul>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h4><i class="fas fa-users"></i> Gestion des Utilisateurs</h4>
                    <p>Cette section permet de gérer tous les utilisateurs :</p>
                    <ul>
                        <li><strong>Utilisateurs en attente :</strong> Approuver ou rejeter les nouvelles inscriptions</li>
                        <li><strong>Utilisateurs approuvés :</strong> Activer, désactiver ou supprimer des comptes</li>
                        <li><strong>Actions disponibles :</strong> Approuver, Rejeter, Activer, Désactiver, Supprimer</li>
                    </ul>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h4><i class="fas fa-poll"></i> Sondages</h4>
                    <p>Suivi des tentatives de sondages :</p>
                    <ul>
                        <li>Visualiser toutes les tentatives de sondages</li>
                        <li>Voir les scores obtenus par thème</li>
                        <li>Suivre les récompenses distribuées</li>
                        <li>Statistiques de réussite par utilisateur</li>
                    </ul>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h4><i class="fas fa-money-bill-wave"></i> Retraits</h4>
                    <p>Gestion des demandes de retrait :</p>
                    <ul>
                        <li><strong>Demandes en attente :</strong> Approuver ou rejeter les retraits</li>
                        <li><strong>Historique :</strong> Voir toutes les transactions traitées</li>
                        <li><strong>Vérifications :</strong> Contrôler les soldes avant approbation</li>
                    </ul>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h4><i class="fas fa-list-alt"></i> Logs d'Activité</h4>
                    <p>Suivi de toutes les actions sur la plateforme :</p>
                    <ul>
                        <li>Connexions et déconnexions</li>
                        <li>Actions administratives</li>
                        <li>Tentatives de sondages</li>
                        <li>Demandes de retrait</li>
                    </ul>
                </div>

                <div style="margin-bottom: 2rem;">
                    <h4><i class="fas fa-cog"></i> Paramètres</h4>
                    <p>Configuration de la plateforme :</p>
                    <ul>
                        <li>Modifier les montants de récompenses</li>
                        <li>Configurer les seuils de retrait</li>
                        <li>Activer/désactiver les fonctionnalités</li>
                        <li>Actions système (export, nettoyage)</li>
                    </ul>
                </div>

                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-top: 2rem;">
                    <h5><i class="fas fa-lightbulb"></i> Conseils d'utilisation</h5>
                    <ul style="margin: 0.5rem 0;">
                        <li>Vérifiez régulièrement les utilisateurs en attente d'approbation</li>
                        <li>Surveillez les demandes de retrait pour éviter les fraudes</li>
                        <li>Consultez les logs en cas de problème</li>
                        <li>Les données se mettent à jour automatiquement</li>
                    </ul>
                </div>

                <div style="background: #d1ecf1; padding: 1rem; border-radius: 8px; margin-top: 1rem;">
                    <h5><i class="fas fa-phone"></i> Support</h5>
                    <p style="margin: 0;">En cas de problème technique, contactez l'équipe de développement ou consultez les logs pour plus de détails.</p>
                </div>
            </div>

            <div style="margin-top: 2rem; text-align: center;">
                <button onclick="this.closest('.modal-overlay').remove()" class="btn btn-primary">
                    Fermer
                </button>
            </div>
        </div>
    `;

    // Fermer en cliquant sur l'overlay
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    document.body.appendChild(modal);
    toggleUserDropdown();
}

function showAbout() {
    console.log('ℹ️ Affichage des informations...');
    // TODO: Implémenter à propos
    showNotification('À propos de GeoPoll Admin v1.0', 'info');
    toggleUserDropdown();
}

function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
        console.log('🚪 Déconnexion admin...');

        // Supprimer les données de session
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // Afficher notification
        showNotification('Déconnexion réussie', 'success');

        // Rediriger vers la page d'accueil
        setTimeout(() => {
            window.location.href = '/';
        }, 1000);
    }
    toggleUserDropdown();
}

// Fonction pour afficher les notifications
function showNotification(message, type = 'info') {
    console.log(`📢 Notification ${type}: ${message}`);

    // Créer ou obtenir le container des notifications
    let container = document.querySelector('.notifications-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notifications-container';
        document.body.appendChild(container);
    }

    // Créer l'élément notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;

    // Icônes selon le type
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };

    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="removeNotification(this.parentElement)">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Ajouter au container
    container.appendChild(notification);

    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
        removeNotification(notification);
    }, 5000);

    // Limiter le nombre de notifications affichées
    const notifications = container.querySelectorAll('.notification');
    if (notifications.length > 5) {
        removeNotification(notifications[0]);
    }
}

// Fonction pour supprimer une notification avec animation
function removeNotification(notification) {
    if (!notification || !notification.parentElement) return;

    notification.classList.add('slide-out');

    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }

        // Supprimer le container s'il est vide
        const container = document.querySelector('.notifications-container');
        if (container && container.children.length === 0) {
            container.remove();
        }
    }, 300);
}

// Exposer les fonctions globalement
window.toggleUserDropdown = toggleUserDropdown;
window.showProfile = showProfile;
window.showSettings = showSettings;
window.showHelp = showHelp;
window.showAbout = showAbout;
window.logout = logout;
window.processWithdrawal = processWithdrawal;
window.updateSetting = updateSetting;
window.exportData = exportData;
window.clearLogs = clearLogs;
window.sendTestNotification = sendTestNotification;
window.refreshCache = refreshCache;
window.showNotification = showNotification;
window.removeNotification = removeNotification;

// Fonction de test pour les notifications
window.testNotifications = function() {
    showNotification('Test notification de succès !', 'success');
    setTimeout(() => showNotification('Test notification d\'information', 'info'), 500);
    setTimeout(() => showNotification('Test notification d\'avertissement', 'warning'), 1000);
    setTimeout(() => showNotification('Test notification d\'erreur', 'error'), 1500);
};

function showNotification(message, type = 'info') {
    // Créer une notification toast
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Styles inline pour la notification
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease'
    });
    
    // Couleurs selon le type
    const colors = {
        'success': '#10b981',
        'error': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(notification);
    
    // Animer l'entrée
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Fonctions utilitaires pour les utilisateurs
function formatProfession(profession) {
    const professions = {
        'etudiant': 'Étudiant',
        'employe': 'Employé',
        'fonctionnaire': 'Fonctionnaire',
        'entrepreneur': 'Entrepreneur',
        'commercant': 'Commerçant',
        'artisan': 'Artisan',
        'agriculteur': 'Agriculteur',
        'enseignant': 'Enseignant',
        'sante': 'Secteur de la santé',
        'transport': 'Transport',
        'retraite': 'Retraité',
        'sans_emploi': 'Sans emploi',
        'autre': 'Autre'
    };
    return professions[profession] || profession || 'Non renseigné';
}

function getRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Il y a moins d\'une minute';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} minute(s)`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} heure(s)`;
    if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)} jour(s)`;
    return `Il y a ${Math.floor(diffInSeconds / 2592000)} mois`;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification(`Copié: ${text}`, 'success');
    }).catch(err => {
        console.error('Erreur lors de la copie:', err);
        showNotification('Erreur lors de la copie', 'error');
    });
}

function copyAllUserInfo(id, firstName, lastName, email, phone, country, profession) {
    const userInfo = `
=== INFORMATIONS UTILISATEUR ===
ID: ${id}
Nom: ${firstName} ${lastName}
Email: ${email}
Téléphone: ${phone || 'Non renseigné'}
Pays: ${country || 'Non renseigné'}
Profession: ${formatProfession(profession)}
Date de copie: ${new Date().toLocaleString('fr-FR')}
    `.trim();

    navigator.clipboard.writeText(userInfo).then(() => {
        showNotification(`Informations complètes de ${firstName} ${lastName} copiées`, 'success');
    }).catch(err => {
        console.error('Erreur lors de la copie:', err);
        showNotification('Erreur lors de la copie', 'error');
    });
}

function exportUsers() {
    showNotification('Export des utilisateurs - Fonctionnalité à venir', 'info');
}

// Rendre les fonctions globales
window.showSection = showSection;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.refreshUsers = refreshUsers;
window.filterUsers = filterUsers;
window.searchUsers = searchUsers;
window.copyToClipboard = copyToClipboard;
window.copyAllUserInfo = copyAllUserInfo;
window.exportUsers = exportUsers;
