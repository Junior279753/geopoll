/* ===== DASHBOARD UTILISATEUR - FONCTIONS COMPLÉMENTAIRES ===== */

// Ce fichier contient des fonctions complémentaires pour le dashboard utilisateur
// Le fichier principal est dashboard-modern.js

console.log('📄 Dashboard.js chargé - Fonctions complémentaires disponibles');

// Fonctions utilitaires pour le dashboard
function showNotification(message, type = 'info') {
    // Créer une notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Supprimer automatiquement après 5 secondes
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Fonction pour formater les montants
function formatAmount(amount) {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
}

// Fonction pour formater les dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Fonction pour formater les dates avec heure
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Exposer les fonctions globalement
window.showNotification = showNotification;
window.formatAmount = formatAmount;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
