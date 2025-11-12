# 🛠️ Step-by-Step Backend Implementation

Si vous n'avez pas encore les endpoints API pour les paiements, voici comment les créer.

---

## 🎯 Objectif

Créer 3 endpoints REST pour gérer les paiements utilisateur :
1. **GET `/api/user/balance`** - Récupérer les soldes
2. **GET `/api/user/transactions`** - Récupérer l'historique
3. **POST `/api/user/withdraw`** - Créer une demande de retrait

---

## 📋 Prerequisites

- Node.js + Express installés
- Base de données (SQLite, MySQL, PostgreSQL)
- Middleware d'authentification JWT
- Routes API déjà en place

---

## 🔧 Step 1: Créer la table `transactions`

### SQL (si n'existe pas)

```sql
-- SQLite
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit')),
  amount REAL NOT NULL,
  payment_method TEXT,
  account_number TEXT,
  survey_id INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'approved', 'rejected', 'failed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (survey_id) REFERENCES surveys(id)
);

CREATE INDEX idx_user_id ON transactions(user_id);
CREATE INDEX idx_status ON transactions(status);
CREATE INDEX idx_created_at ON transactions(created_at);
```

### MySQL

```sql
CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
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
  FOREIGN KEY (survey_id) REFERENCES surveys(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

### Ajouter colonnes à la table `users`

```sql
-- SQLite
ALTER TABLE users ADD COLUMN balance REAL DEFAULT 0;
ALTER TABLE users ADD COLUMN total_withdrawn REAL DEFAULT 0;

-- MySQL
ALTER TABLE users ADD COLUMN balance DECIMAL(10, 2) DEFAULT 0 AFTER rewards_earned;
ALTER TABLE users ADD COLUMN total_withdrawn DECIMAL(10, 2) DEFAULT 0 AFTER balance;
```

---

## 💻 Step 2: Créer les endpoints

### Fichier: `routes/payments.js`

```javascript
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const db = require('../models/database'); // Votre instance DB

// ===== ENDPOINT 1: GET /api/user/balance =====
router.get('/user/balance', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`📊 Fetching balance for user ${userId}`);
        
        // Récupérer les données utilisateur
        const user = await db.query(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );
        
        if (!user || user.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Calculer les montants en attente (withdrawals pending)
        const pending = await db.query(
            'SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = ? AND type = "withdrawal" AND status = "pending"',
            [userId]
        );
        
        // Calculer le total retiré (completed withdrawals)
        const withdrawn = await db.query(
            'SELECT COALESCE(SUM(ABS(amount)), 0) as total FROM transactions WHERE user_id = ? AND type = "withdrawal" AND status = "completed"',
            [userId]
        );
        
        const response = {
            balance: parseFloat(user[0].balance) || 0,
            totalWithdrawn: parseFloat(withdrawn[0][0].total) || 0,
            pending: parseFloat(pending[0][0].total) || 0
        };
        
        console.log(`✅ Balance fetched:`, response);
        res.json(response);
    } catch (error) {
        console.error('❌ Error fetching balance:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===== ENDPOINT 2: GET /api/user/transactions =====
router.get('/user/transactions', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = Math.min(parseInt(req.query.limit) || 50, 100);
        const offset = parseInt(req.query.offset) || 0;
        
        console.log(`📋 Fetching transactions for user ${userId}`);
        
        const transactions = await db.query(
            'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );
        
        console.log(`✅ ${transactions.length} transactions fetched`);
        res.json({ transactions: transactions || [] });
    } catch (error) {
        console.error('❌ Error fetching transactions:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ===== ENDPOINT 3: POST /api/user/withdraw =====
router.post('/user/withdraw', verifyToken, async (req, res) => {
    try {
        const { amount, payment_method, account_number } = req.body;
        const userId = req.user.id;
        
        console.log(`💸 Withdrawal request from user ${userId}: ${amount} FCFA via ${payment_method}`);
        
        // ===== VALIDATIONS =====
        
        // Valider le montant
        if (!amount || typeof amount !== 'number') {
            return res.status(400).json({ message: 'Montant invalide' });
        }
        
        if (amount <= 0) {
            return res.status(400).json({ message: 'Montant doit être positif' });
        }
        
        if (amount < 1000) {
            return res.status(400).json({ message: 'Montant minimum: 1000 FCFA' });
        }
        
        // Valider le moyen de paiement
        const validMethods = ['mobileMoneyOrange', 'mobileMoneyWave', 'mobileMoneyMTN', 'bankTransfer'];
        if (!validMethods.includes(payment_method)) {
            return res.status(400).json({ message: 'Moyen de paiement invalide' });
        }
        
        // Valider le numéro de compte
        if (!account_number || typeof account_number !== 'string' || account_number.trim().length === 0) {
            return res.status(400).json({ message: 'Numéro de compte/téléphone requis' });
        }
        
        // ===== VÉRIFIER LE SOLDE =====
        const userQuery = await db.query(
            'SELECT balance FROM users WHERE id = ?',
            [userId]
        );
        
        if (!userQuery || userQuery.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        const userBalance = parseFloat(userQuery[0].balance) || 0;
        
        if (userBalance < amount) {
            return res.status(400).json({ 
                message: `Solde insuffisant. Solde disponible: ${userBalance} FCFA` 
            });
        }
        
        // ===== CRÉER LA TRANSACTION =====
        const result = await db.query(
            `INSERT INTO transactions 
             (user_id, type, amount, payment_method, account_number, status, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
            [userId, 'withdrawal', -amount, payment_method, account_number, 'pending']
        );
        
        const withdrawalId = result.lastID;
        
        // ===== METTRE À JOUR LE SOLDE =====
        await db.query(
            'UPDATE users SET balance = balance - ? WHERE id = ?',
            [amount, userId]
        );
        
        console.log(`✅ Withdrawal created with ID ${withdrawalId}`);
        
        res.json({
            message: 'Demande de retrait créée avec succès ! Elle sera traitée dans 2-3 jours ouvrables.',
            withdrawalId: withdrawalId,
            amount: amount,
            payment_method: payment_method,
            status: 'pending',
            estimatedProcessingTime: '2-3 jours ouvrables'
        });
    } catch (error) {
        console.error('❌ Error processing withdrawal:', error);
        res.status(500).json({ message: 'Erreur serveur lors du traitement du retrait' });
    }
});

module.exports = router;
```

---

## 🔌 Step 3: Intégrer dans `server.js` ou `app.js`

```javascript
// server.js ou app.js

const express = require('express');
const app = express();

// ... autres imports ...

// Import des routes de paiements
const paymentsRouter = require('./routes/payments');

// Middleware
app.use(express.json());
// ... autres middleware ...

// Routes
app.use('/api', paymentsRouter);
// app.use('/api/auth', authRouter);
// ... autres routes ...

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
```

---

## 🧪 Step 4: Tester avec cURL

### Test 1: GET Balance

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/user/balance
```

**Réponse attendue:**
```json
{
  "balance": 50000,
  "totalWithdrawn": 150000,
  "pending": 25000
}
```

### Test 2: GET Transactions

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/user/transactions
```

**Réponse attendue:**
```json
{
  "transactions": [
    {
      "id": 1,
      "user_id": 123,
      "type": "withdrawal",
      "amount": -25000,
      "payment_method": "mobileMoneyOrange",
      "account_number": "+221 77 123 45 67",
      "status": "completed",
      "created_at": "2024-01-15 10:30:00"
    }
  ]
}
```

### Test 3: POST Withdraw

```bash
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"amount": 5000, "payment_method": "mobileMoneyOrange", "account_number": "+221 77 123 45 67"}' \
     http://localhost:5000/api/user/withdraw
```

**Réponse attendue:**
```json
{
  "message": "Demande de retrait créée avec succès ! Elle sera traitée dans 2-3 jours ouvrables.",
  "withdrawalId": 2,
  "amount": 5000,
  "payment_method": "mobileMoneyOrange",
  "status": "pending",
  "estimatedProcessingTime": "2-3 jours ouvrables"
}
```

---

## ✅ Verification Checklist

- [ ] Table `transactions` créée en BD
- [ ] Colonnes `balance`, `total_withdrawn` ajoutées à `users`
- [ ] Fichier `routes/payments.js` créé
- [ ] Routes importées dans `server.js`
- [ ] Serveur redémarré
- [ ] Test GET `/api/user/balance` OK
- [ ] Test GET `/api/user/transactions` OK
- [ ] Test POST `/api/user/withdraw` OK
- [ ] Dashboard frontend affiche les données
- [ ] Formulaire soumet correctement

---

## 🐛 Dépannage

### Erreur: "User not found"
→ Vérifier que le token JWT contient bien `user.id`

### Erreur: "Table transactions does not exist"
→ Créer la table avec le SQL fourni

### Erreur: "CORS"
→ Vérifier que CORS est configuré côté serveur

### Frontend affiche "Aucune transaction"
→ Vérifier que les données sont bien en BD
→ Vérifier le format de la réponse JSON

### Montants ne s'affichent pas
→ Vérifier que les colonnes `balance` existent
→ Vérifier que les valeurs ne sont pas NULL

---

## 📝 Notes importantes

1. **Sécurité :** Vérifiez toujours que `req.user.id` correspond bien à l'utilisateur du token JWT

2. **Validations :** Toujours valider côté serveur (pas de confiance au client)

3. **Montants :** Utiliser DECIMAL pour les montants (pas float)

4. **Transactions :** Considérer utiliser une transaction BD pour débiter et créer l'entrée atomiquement

5. **Statuts :** Les statuts peuvent être modifiés par un processus batch ou admin pour les approuver/traiter

---

## 🚀 Prochaines étapes

1. ✅ Créer les endpoints
2. ✅ Tester avec cURL
3. ✅ Ouvrir le dashboard
4. ✅ Cliquer sur "Paiements"
5. ✅ Voir les données s'afficher
6. ✅ Tester le formulaire de retrait
7. ✅ Vérifier que tout fonctionne

**Félicitations ! Les paiements sont maintenant opérationnels !** 🎉

