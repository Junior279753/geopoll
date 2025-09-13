// Variables globales
let currentPage = 1;
let currentStatus = '';
let currentSearch = '';
let users = [];

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    checkAdminAuth();
    loadUserStats();
    loadUsers();
    
    // Événements
    document.getElementById('searchInput').addEventListener('input', debounce(handleSearch, 300));
    document.getElementById('statusFilter').addEventListener('change', handleStatusFilter);
});

// Vérifier l'authentification admin
function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token || !user.isAdmin) {
        window.location.href = '/';
        return;
    }
    
    document.getElementById('adminName').textContent = `${user.firstName} ${user.lastName}`;
}

// Charger les statistiques
async function loadUserStats() {
    try {
        const response = await fetch('/api/admin/users/stats', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalUsers').textContent = stats.total;
            document.getElementById('pendingUsers').textContent = stats.pending;
            document.getElementById('approvedUsers').textContent = stats.approved;
            document.getElementById('activeUsers').textContent = stats.active;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

// Charger les utilisateurs
async function loadUsers(page = 1) {
    try {
        const params = new URLSearchParams({
            page: page,
            limit: 20
        });
        
        if (currentStatus) params.append('status', currentStatus);
        if (currentSearch) params.append('search', currentSearch);
        
        const response = await fetch(`/api/admin/users?${params}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            users = data.users;
            displayUsers(data.users);
            displayPagination(data.pagination);
            currentPage = page;
        } else {
            showError('Erreur lors du chargement des utilisateurs');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

// Afficher les utilisateurs
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="empty-state">
                        <i class="fas fa-users"></i>
                        <p>Aucun utilisateur trouvé</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="user-info">
                    <div class="user-avatar">
                        ${user.first_name.charAt(0)}${user.last_name.charAt(0)}
                    </div>
                    <div>
                        <strong>${user.first_name} ${user.last_name}</strong>
                        <small>${user.phone || 'Pas de téléphone'}</small>
                    </div>
                </div>
            </td>
            <td>${user.email}</td>
            <td>${user.country || 'Non spécifié'}</td>
            <td>
                <div class="status-badges">
                    ${getStatusBadge(user)}
                </div>
            </td>
            <td>
                <small>${formatDate(user.created_at)}</small>
                ${user.approved_at ? `<br><small class="text-success">Approuvé le ${formatDate(user.approved_at)}</small>` : ''}
            </td>
            <td>
                <div class="action-buttons">
                    ${getActionButtons(user)}
                </div>
            </td>
        </tr>
    `).join('');
}

// Obtenir le badge de statut
function getStatusBadge(user) {
    let badges = [];
    
    if (!user.admin_approved) {
        badges.push('<span class="badge badge-warning">En attente</span>');
    } else {
        badges.push('<span class="badge badge-success">Approuvé</span>');
    }
    
    if (user.is_active) {
        badges.push('<span class="badge badge-primary">Actif</span>');
    } else {
        badges.push('<span class="badge badge-secondary">Inactif</span>');
    }

    if (user.account_monetized) {
        badges.push('<span class="badge badge-info">Monétisé</span>');
    }
    
    return badges.join(' ');
}

// Obtenir les boutons d'action
function getActionButtons(user) {
    let buttons = [];
    
    if (!user.admin_approved) {
        buttons.push(`
            <button onclick="approveUser(${user.id})" class="btn btn-sm btn-success" title="Approuver">
                <i class="fas fa-check"></i>
            </button>
        `);
        buttons.push(`
            <button onclick="rejectUser(${user.id})" class="btn btn-sm btn-danger" title="Rejeter">
                <i class="fas fa-times"></i>
            </button>
        `);
    } else {
        const statusAction = user.is_active ? 'désactiver' : 'activer';
        const statusIcon = user.is_active ? 'fa-ban' : 'fa-check-circle';
        const statusClass = user.is_active ? 'btn-warning' : 'btn-success';
        
        buttons.push(`
            <button onclick="toggleUserStatus(${user.id})" class="btn btn-sm ${statusClass}" title="${statusAction}">
                <i class="fas ${statusIcon}"></i>
            </button>
        `);

        if (user.account_monetized) {
            buttons.push(`
                <button onclick="demonetizeUser(${user.id})" class="btn btn-sm btn-warning" title="Démonétiser">
                    <i class="fas fa-dollar-sign"></i>
                </button>
            `);
        } else {
            buttons.push(`
                <button onclick="monetizeUser(${user.id})" class="btn btn-sm btn-info" title="Monétiser">
                    <i class="fas fa-dollar-sign"></i>
                </button>
            `);
        }
    }
    
    buttons.push(`
        <button onclick="deleteUser(${user.id})" class="btn btn-sm btn-danger" title="Supprimer">
            <i class="fas fa-trash"></i>
        </button>
    `);
    
    return buttons.join(' ');
}

// Approuver un utilisateur
async function approveUser(userId) {
    if (!confirm('Approuver cet utilisateur ?')) return; 
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess('Utilisateur approuvé avec succès');
            loadUsers(currentPage);
            loadUserStats();
        } else {
            showError('Erreur lors de l\'approbation');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

// Monétiser un utilisateur
async function monetizeUser(userId) {
    if (!confirm('Monétiser ce compte utilisateur ?')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/monetize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess('Compte utilisateur monétisé avec succès');
            loadUsers(currentPage);
        } else {
            const error = await response.json();
            showError(error.message || 'Erreur lors de la monétisation du compte.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

// Démonétiser un utilisateur
async function demonetizeUser(userId) {
    if (!confirm('Démonétiser ce compte utilisateur ?')) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/demonetize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess('Compte utilisateur démonétisé avec succès');
            loadUsers(currentPage);
        } else {
            const error = await response.json();
            showError(error.message || 'Erreur lors de la démonétisation du compte.');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}


// Rejeter un utilisateur
function rejectUser(userId) {
    showConfirmModal(
        'Rejeter l\'utilisateur',
        'Êtes-vous sûr de vouloir rejeter cet utilisateur ?',
        async (reason) => {
            try {
                const response = await fetch(`/api/admin/users/${userId}/reject`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ reason })
                });
                
                if (response.ok) {
                    showSuccess('Utilisateur rejeté');
                    loadUsers(currentPage);
                    loadUserStats();
                } else {
                    showError('Erreur lors du rejet');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showError('Erreur de connexion');
            }
        },
        true // Afficher le champ raison
    );
}

// Changer le statut d'un utilisateur
async function toggleUserStatus(userId) {
    const user = users.find(u => u.id === userId);
    const action = user.is_active ? 'désactiver' : 'activer';
    
    if (!confirm(`${action} cet utilisateur ?`)) return;
    
    try {
        const response = await fetch(`/api/admin/users/${userId}/toggle-status`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (response.ok) {
            showSuccess(`Utilisateur ${action === 'activer' ? 'activé' : 'désactivé'}`);
            loadUsers(currentPage);
            loadUserStats();
        } else {
            showError(`Erreur lors de la ${action === 'activer' ? 'activation' : 'désactivation'}`);
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Erreur de connexion');
    }
}

// Supprimer un utilisateur
function deleteUser(userId) {
    showConfirmModal(
        'Supprimer l\'utilisateur',
        'Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ? Cette action est irréversible.',
        async () => {
            try {
                const response = await fetch(`/api/admin/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    showSuccess('Utilisateur supprimé');
                    loadUsers(currentPage);
                    loadUserStats();
                } else {
                    showError('Erreur lors de la suppression');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showError('Erreur de connexion');
            }
        }
    );
}

// Gestion de la recherche
function handleSearch(event) {
    currentSearch = event.target.value;
    currentPage = 1;
    loadUsers(1);
}

// Gestion du filtre de statut
function handleStatusFilter(event) {
    currentStatus = event.target.value;
    currentPage = 1;
    loadUsers(1);
}

// Actualiser les utilisateurs
function refreshUsers() {
    loadUsers(currentPage);
    loadUserStats();
}

// Afficher la pagination
function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    
    if (pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    
    // Bouton précédent
    if (pagination.page > 1) {
        html += `<button onclick="loadUsers(${pagination.page - 1})" class="btn btn-outline">Précédent</button>`;
    }
    
    // Numéros de page
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.pages, pagination.page + 2); i++) {
        const active = i === pagination.page ? 'btn-primary' : 'btn-outline';
        html += `<button onclick="loadUsers(${i})" class="btn ${active}">${i}</button>`;
    }
    
    // Bouton suivant
    if (pagination.page < pagination.pages) {
        html += `<button onclick="loadUsers(${pagination.page + 1})" class="btn btn-outline">Suivant</button>`;
    }
    
    container.innerHTML = html;
}

// Utilitaires
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Modal de confirmation
function showConfirmModal(title, message, onConfirm, showReason = false) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('reasonContainer').style.display = showReason ? 'block' : 'none';
    
    const modal = document.getElementById('confirmModal');
    modal.style.display = 'block';
    
    document.getElementById('confirmButton').onclick = () => {
        const reason = showReason ? document.getElementById('rejectionReason').value : null;
        onConfirm(reason);
        closeConfirmModal();
    };
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    document.getElementById('rejectionReason').value = '';
}

// Notifications
function showSuccess(message) {
    // Implémentation simple - peut être améliorée avec une bibliothèque de notifications
    alert('✅ ' + message);
}

function showError(message) {
    alert('❌ ' + message);
}

// Déconnexion
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/';
}
