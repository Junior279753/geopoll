# ⚠️ MISSING: Payments Section in Dashboard

## Problem
The user dashboard references a "Payments" section (`onclick="showSection('payments')"`) but the HTML section `<section id="payments">` **does not exist** in `public/dashboard.html`.

This causes:
- Page shows blank when user clicks "Paiements" nav item
- No transaction history display
- No withdrawal form visible
- Function `loadPayments()` in JS is empty (just a TODO)

---

## Solution
Insert the following HTML section in `public/dashboard.html` **between the dashboard section closing tag and the surveys section opening tag** (around line 258):

### Find this location:
```html
                </div>
            </section>

            <!-- Surveys Section -->
            <section id="surveys" class="content-section">
```

### Replace with:
```html
                </div>
            </section>

            <!-- Payments Section -->
            <section id="payments" class="content-section">
                <div class="section-header">
                    <h2><i class="fas fa-wallet"></i> Paiements et retraits</h2>
                    <p>Gérez vos moyens de paiement et effectuez vos retraits</p>
                </div>

                <!-- Payment Stats -->
                <div class="stats-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card">
                        <div class="stat-icon primary">
                            <i class="fas fa-wallet"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="paymentBalance">0 FCFA</h3>
                            <p>Solde disponible</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="totalWithdrawn">0 FCFA</h3>
                            <p>Total retiré</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-content">
                            <h3 id="pendingAmount">0 FCFA</h3>
                            <p>En attente de traitement</p>
                        </div>
                    </div>
                </div>

                <!-- Withdrawal Request Form -->
                <div class="content-card" style="margin-bottom: 2rem;">
                    <div class="content-card-header">
                        <h3 class="content-card-title">Nouvelle demande de retrait</h3>
                    </div>
                    <div class="content-card-body">
                        <form id="withdrawalForm" style="max-width: 500px;">
                            <div class="form-group">
                                <label class="form-label">Montant à retirer (FCFA)</label>
                                <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                                    <input type="number" class="form-input" name="amount" id="withdrawAmount" min="5000" step="1000" required placeholder="5000">
                                    <button type="button" class="btn btn-outline" onclick="document.getElementById('withdrawAmount').value = document.getElementById('paymentBalance').textContent.replace(' FCFA', '').replace(' ', '')" style="white-space: nowrap;">Max</button>
                                </div>
                                <small style="color: #666; margin-top: 0.5rem;">Montant minimum: 5 000 FCFA</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Moyen de paiement</label>
                                <select class="form-select" name="paymentMethod" id="paymentMethod" required>
                                    <option value="">Sélectionnez un moyen</option>
                                    <option value="bank">Virement bancaire</option>
                                    <option value="momo">Mobile Money</option>
                                    <option value="wallet">Portefeuille numérique</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Numéro/Compte de réception</label>
                                <input type="text" class="form-input" name="accountNumber" id="accountNumber" placeholder="Ex: +226XXXXXXXXXX ou numéro de compte" required>
                            </div>
                            <button type="submit" class="btn btn-secondary" style="width: 100%;">
                                <i class="fas fa-paper-plane"></i>
                                Demander le retrait
                            </button>
                        </form>
                    </div>
                </div>

                <!-- Transaction History -->
                <div class="content-card">
                    <div class="content-card-header">
                        <h3 class="content-card-title">Historique des transactions</h3>
                    </div>
                    <div class="content-card-body">
                        <div id="transactionList" style="overflow-x: auto;">
                            <table class="admin-table" style="width: 100%; margin: 0; box-shadow: none;">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Montant</th>
                                        <th>Moyen</th>
                                        <th>Statut</th>
                                    </tr>
                                </thead>
                                <tbody id="transactionTableBody">
                                    <tr>
                                        <td colspan="5" style="text-align: center; padding: 2rem; color: #666;">Aucune transaction pour le moment</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Surveys Section -->
```

---

## JavaScript Implementation

The function `loadPayments()` in `public/js/dashboard-modern.js` (line ~900) is empty. Here's what it should do:

```javascript
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

        if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            document.getElementById('paymentBalance').textContent = formatAmount(balanceData.balance || 0);
            document.getElementById('totalWithdrawn').textContent = formatAmount(balanceData.totalWithdrawn || 0);
            document.getElementById('pendingAmount').textContent = formatAmount(balanceData.pending || 0);
        }

        if (transactionsResponse.ok) {
            const transData = await transactionsResponse.json();
            displayTransactions(transData.transactions || []);
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

    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td data-label="Date">${formatDate(tx.created_at)}</td>
            <td data-label="Type">${tx.type === 'deposit' ? '✅ Dépôt' : '💸 Retrait'}</td>
            <td data-label="Montant">${formatAmount(Math.abs(tx.amount))}</td>
            <td data-label="Moyen">${tx.payment_method || 'N/A'}</td>
            <td data-label="Statut">${getTransactionStatus(tx.status)}</td>
        </tr>
    `).join('');
}

function getTransactionStatus(status) {
    const statuses = {
        'pending': '<span class="badge badge-warning">En attente</span>',
        'completed': '<span class="badge badge-success">Complétée</span>',
        'failed': '<span class="badge badge-danger">Échouée</span>'
    };
    return statuses[status] || '<span class="badge badge-secondary">Inconnu</span>';
}

// Handle withdrawal form submission
document.addEventListener('DOMContentLoaded', function() {
    const withdrawalForm = document.getElementById('withdrawalForm');
    if (withdrawalForm) {
        withdrawalForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const amount = document.getElementById('withdrawAmount').value;
            const paymentMethod = document.getElementById('paymentMethod').value;
            const accountNumber = document.getElementById('accountNumber').value;
            const token = localStorage.getItem('token') || localStorage.getItem('authToken');

            try {
                const response = await fetch('/api/user/withdraw', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        amount: parseInt(amount),
                        paymentMethod,
                        accountNumber
                    })
                });

                if (response.ok) {
                    showPopup('Succès', 'Votre demande de retrait a été envoyée avec succès!', 'success');
                    withdrawalForm.reset();
                    loadPayments(); // Refresh
                } else {
                    const error = await response.json();
                    showPopup('Erreur', error.message || 'Erreur lors de la demande', 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showPopup('Erreur', 'Erreur de connexion', 'error');
            }
        });
    }
});
```

---

## Summary

| Item | Status |
|------|--------|
| HTML Section | ❌ Missing - Need to add |
| CSS Styles | ✅ Already available (stats-grid, content-card, etc.) |
| JS Function | ❌ Empty - Need to implement |
| API Endpoints | ❓ Check backend (likely `/api/user/balance`, `/api/user/transactions`, `/api/user/withdraw`) |

