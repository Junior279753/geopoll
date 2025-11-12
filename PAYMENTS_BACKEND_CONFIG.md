# 🔧 Configuration Backend - API Paiements

## 🎯 Endpoints à implémenter

Pour que la section Paiements fonctionne complètement, vous devez créer/vérifier les 3 endpoints suivants :

---

## 1️⃣ GET `/api/user/balance`

### Description
Retourne le solde de l'utilisateur, le total retiré et le montant en attente

### Request
```
Method: GET
Path: /api/user/balance
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
```

### Response (200 OK)
```json
{
  "balance": 50000,
  "totalWithdrawn": 150000,
  "pending": 25000
}
```

### Response (401 Unauthorized)
```json
{
  "message": "Non authentifié"
}
```

### Implementation Notes
- `balance` : Solde actuel disponible pour retrait
- `totalWithdrawn` : Montant total retiré par l'utilisateur (historique)
- `pending` : Montant en attente (demandes en cours de traitement)

---

## 2️⃣ GET `/api/user/transactions`

### Description
Retourne l'historique des transactions (dépôts et retraits) de l'utilisateur

### Request
```
Method: GET
Path: /api/user/transactions
Query Parameters (optionnel):
  ?limit=50
  ?offset=0
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
```

### Response (200 OK)
```json
{
  "transactions": [
    {
      "id": 1,
      "type": "withdrawal",
      "amount": -25000,
      "payment_method": "mobileMoneyOrange",
      "account_number": "+221 77 123 45 67",
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:35:00Z"
    },
    {
      "id": 2,
      "type": "deposit",
      "amount": 5000,
      "payment_method": "survey_reward",
      "survey_id": 123,
      "status": "completed",
      "created_at": "2024-01-14T15:45:00Z",
      "updated_at": "2024-01-14T15:45:00Z"
    },
    {
      "id": 3,
      "type": "withdrawal",
      "amount": -10000,
      "payment_method": "mobileMoneyWave",
      "account_number": "+221 77 987 65 43",
      "status": "pending",
      "created_at": "2024-01-16T08:00:00Z",
      "updated_at": "2024-01-16T08:00:00Z"
    }
  ]
}
```

### Response (401 Unauthorized)
```json
{
  "message": "Non authentifié"
}
```

### Implementation Notes
- Retourner transactions les plus récentes en premier
- Champs requis : `id`, `type`, `amount`, `status`, `created_at`
- Champs optionnels mais utiles : `payment_method`, `account_number`, `survey_id`, `updated_at`
- Les deux types valides : `"withdrawal"` ou `"deposit"`
- Les statuts valides : `"pending"`, `"completed"`, `"approved"`, `"rejected"`, `"failed"`

---

## 3️⃣ POST `/api/user/withdraw`

### Description
Crée une nouvelle demande de retrait pour l'utilisateur

### Request
```
Method: POST
Path: /api/user/withdraw
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json

Body:
{
  "amount": 25000,
  "payment_method": "mobileMoneyOrange",
  "account_number": "+221 77 123 45 67"
}
```

### Response (200 OK - Succès)
```json
{
  "message": "Demande de retrait créée avec succès",
  "withdrawalId": 12345,
  "amount": 25000,
  "payment_method": "mobileMoneyOrange",
  "status": "pending",
  "estimatedProcessingTime": "2-3 jours ouvrables"
}
```

### Response (400 Bad Request - Validation failed)
```json
{
  "message": "Solde insuffisant pour ce retrait"
}
```

Ou :
```json
{
  "message": "Montant minimum: 1000 FCFA"
}
```

### Response (401 Unauthorized)
```json
{
  "message": "Non authentifié"
}
```

### Response (409 Conflict - Trop de retraits en attente)
```json
{
  "message": "Vous avez trop de retraits en attente. Veuillez attendre que les précédents soient traités."
}
```

### Implementation Notes
- Validations requises :
  - ✅ Amount > 0
  - ✅ Amount >= 1000 (minimum)
  - ✅ Amount <= solde disponible
  - ✅ payment_method valide (l'une des 4 options)
  - ✅ account_number non-vide et format valide
  
- Business rules :
  - Créer une transaction avec status "pending"
  - Déduire du solde disponible
  - Ajouter au montant "pending"
  - Enregistrer le moyen de paiement
  - Optionnel : Envoyer notification email/SMS

- Types de `payment_method` acceptés :
  - `"mobileMoneyOrange"` - Orange Money
  - `"mobileMoneyWave"` - Wave
  - `"mobileMoneyMTN"` - MTN Mobile Money
  - `"bankTransfer"` - Virement bancaire

---

## 🔍 Vérification des endpoints

### Via cURL

```bash
# 1. Tester GET /api/user/balance
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/user/balance

# 2. Tester GET /api/user/transactions
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/user/transactions

# 3. Tester POST /api/user/withdraw
curl -X POST -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"amount": 5000, "payment_method": "mobileMoneyOrange", "account_number": "+221 77 123 45 67"}' \
     http://localhost:5000/api/user/withdraw
```

### Via navigateur (DevTools)

1. Ouvrir le dashboard
2. Cliquer sur "Paiements"
3. Ouvrir DevTools (F12) → Console
4. Chercher les logs :
   - ✅ `💳 Paiements chargés` → `loadPayments()` réussi
   - ⚠️ `⚠️ Impossible de charger le solde` → Erreur GET `/api/user/balance`
   - ⚠️ `⚠️ Impossible de charger l'historique des transactions` → Erreur GET `/api/user/transactions`

5. Cliquer sur Network tab
6. Soumettre le formulaire de retrait
7. Vérifier les requêtes :
   - `GET /api/user/balance` → 200
   - `GET /api/user/transactions` → 200
   - `POST /api/user/withdraw` → 200

---

## 🗄️ Structure Base de Données suggérée

### Table `transactions`
```sql
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  type ENUM('withdrawal', 'deposit') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  account_number VARCHAR(100),
  survey_id INT,
  status ENUM('pending', 'completed', 'approved', 'rejected', 'failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (survey_id) REFERENCES surveys(id)
);

-- Index pour performance
CREATE INDEX idx_user_id ON transactions(user_id);
CREATE INDEX idx_status ON transactions(status);
CREATE INDEX idx_created_at ON transactions(created_at);
```

### Table `users` (modifications)
```sql
-- Ajouter si absent
ALTER TABLE users ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0 AFTER rewards_earned;
ALTER TABLE users ADD COLUMN total_withdrawn DECIMAL(10, 2) DEFAULT 0 AFTER balance;

-- Index
CREATE INDEX idx_balance ON users(balance);
```

---

## 💻 Implémentation exemple (Node.js/Express)

```javascript
// routes/payments.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');

// GET balance
router.get('/user/balance', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await db.query(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Calculer les montants en attente
        const [pending] = await db.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = "withdrawal" AND status = "pending"',
            [userId]
        );
        
        const [withdrawn] = await db.query(
            'SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = "withdrawal" AND status = "completed"',
            [userId]
        );
        
        res.json({
            balance: user[0].balance,
            totalWithdrawn: Math.abs(withdrawn[0].total),
            pending: Math.abs(pending[0].total)
        });
    } catch (error) {
        console.error('Error fetching balance:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// GET transactions
router.get('/user/transactions', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        
        const transactions = await db.query(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );
        
        res.json({ transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// POST withdraw
router.post('/user/withdraw', verifyToken, async (req, res) => {
    try {
        const { amount, payment_method, account_number } = req.body;
        const userId = req.user.id;
        
        // Validations
        if (!amount || amount <= 0 || amount < 1000) {
            return res.status(400).json({ message: 'Montant minimum: 1000 FCFA' });
        }
        
        if (!['mobileMoneyOrange', 'mobileMoneyWave', 'mobileMoneyMTN', 'bankTransfer'].includes(payment_method)) {
            return res.status(400).json({ message: 'Moyen de paiement invalide' });
        }
        
        if (!account_number || account_number.trim().length === 0) {
            return res.status(400).json({ message: 'Numéro de compte requis' });
        }
        
        // Vérifier le solde
        const user = await db.query('SELECT balance FROM users WHERE id = ?', [userId]);
        if (user[0].balance < amount) {
            return res.status(400).json({ message: 'Solde insuffisant pour ce retrait' });
        }
        
        // Créer la transaction
        const result = await db.query(
            'INSERT INTO transactions (user_id, type, amount, payment_method, account_number, status) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, 'withdrawal', -amount, payment_method, account_number, 'pending']
        );
        
        // Mettre à jour le solde
        await db.query(
            'UPDATE users SET balance = balance - ? WHERE id = ?',
            [amount, userId]
        );
        
        res.json({
            message: 'Demande de retrait créée avec succès',
            withdrawalId: result.insertId,
            amount,
            payment_method,
            status: 'pending',
            estimatedProcessingTime: '2-3 jours ouvrables'
        });
    } catch (error) {
        console.error('Error processing withdrawal:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;

// server.js (ajouter)
app.use('/api', require('./routes/payments'));
```

---

## ✅ Checklist de déploiement

- [ ] Endpoints `/api/user/balance`, `/api/user/transactions`, `/api/user/withdraw` créés
- [ ] Tests unitaires pour chaque endpoint
- [ ] Validations des montants et moyens de paiement
- [ ] Gestion des erreurs appropriée (400, 401, 409, 500)
- [ ] Format JSON correspondant aux spécifications
- [ ] Authentification JWT vérifiée
- [ ] Base de données tables `transactions` et colonnes `users` créées
- [ ] Logs/monitoring configurés
- [ ] Tests d'intégration avec le frontend
- [ ] Documentation API mise à jour

---

## 🐛 Dépannage

### "Aucune transaction" affiché
- Vérifier que l'API retourne un tableau vide `{ transactions: [] }`
- Vérifier les logs du serveur

### Les soldes ne s'actualisent pas
- Vérifier que `/api/user/balance` retourne les valeurs correctes
- Vérifier les calculs sur les transactions "pending" et "completed"
- Vérifier les types de données (doivent être numériques)

### Formulaire ne soumet pas
- Vérifier que `/api/user/withdraw` accepte POST
- Vérifier les headers Content-Type
- Vérifier les validations côté serveur vs. côté client

---

## 📞 Questions ?

Consultez `PAYMENTS_IMPLEMENTATION_COMPLETE.md` pour plus de détails sur le frontend.

