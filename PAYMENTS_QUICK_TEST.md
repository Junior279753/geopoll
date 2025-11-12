# 🧪 Quick Test Guide - Section Paiements

## ✨ Test rapide du frontend (sans API)

Avant de configurer les endpoints backend, vous pouvez tester la UI avec les étapes suivantes :

### 1️⃣ Vérifier que la section existe

Ouvrez le fichier `public/dashboard.html` et cherchez :
```
<section id="payments" class="content-section">
```

**Résultat attendu :** ✅ Trouvé (section présente)

---

### 2️⃣ Tester la navigation vers Paiements

1. Ouvrir `http://localhost:5000/dashboard.html` (ou le port de votre serveur)
2. Cliquer sur le menu de navigation (hamburger menu sur mobile)
3. Cliquer sur **"Paiements"** ou **"💳 Paiements"**

**Résultat attendu :**
- ✅ Page montre la section avec titre "Mes paiements"
- ✅ 3 cartes de stats visibles (mais vides : "0 FCFA")
- ✅ Formulaire de retrait visible
- ✅ Tableau des transactions visible avec "Aucune transaction"

---

### 3️⃣ Tester le responsive

#### Sur Desktop
```
Affichage attendu:
[Solde]  [Retiré]  [En attente]  (3 colonnes)
[Formulaire] (full width)
[Tableau] (avec colonnes visibles)
```

#### Sur Mobile (F12 → Mode responsive)
```
Affichage attendu:
[Solde]
[Retiré]
[En attente]
(empilés en une colonne)

[Formulaire] (full width)

[Tableau converti en cartes]
Date: 15 Jan 2024
Type: Retrait
Montant: 25,000 FCFA
...
```

**Résultat attendu :** ✅ Layout réactif et lisible

---

### 4️⃣ Tester le formulaire

#### Validation côté client

1. Cliquer sur "Demander un retrait"
2. Laisser le champ montant vide → Cliquer soumettre
   - **Résultat :** Navigateur affiche "Veuillez remplir ce champ"

3. Entrer montant `500` (< 1000)
   - **Résultat :** Input refuse de laisser soumettir (min="1000")

4. Entrer montant `2500`, laisser moyen de paiement vide
   - **Résultat :** Erreur popup "Veuillez sélectionner un moyen de paiement"

5. Entrer tous les champs valides :
   - Montant: `5000`
   - Moyen: `Orange Money`
   - Compte: `+221 77 123 45 67`
   - Cliquer soumettre
   - **Résultat :** Formulaire tentative l'envoi (regarde Network tab)

---

### 5️⃣ Vérifier les logs (DevTools)

Ouvrir F12 → Console et chercher ces logs :

```
✅ Fonctions de la fenêtre principale exposées.
💳 Chargement des paiements...
```

Après clic sur "Paiements" :
```
✅ Section payments affichée
💳 Paiements chargés  ← OU ⚠️ Erreur de chargement (API non configurée)
```

---

### 6️⃣ Tester avec une API de test

Si vous avez Postman ou un serveur test, vous pouvez simuler les réponses :

#### Créer un petit serveur de test (Node.js)

```javascript
// test-api-server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock: GET /api/user/balance
app.get('/api/user/balance', (req, res) => {
    res.json({
        balance: 50000,
        totalWithdrawn: 150000,
        pending: 25000
    });
});

// Mock: GET /api/user/transactions
app.get('/api/user/transactions', (req, res) => {
    res.json({
        transactions: [
            {
                id: 1,
                type: 'withdrawal',
                amount: -25000,
                payment_method: 'mobileMoneyOrange',
                status: 'completed',
                created_at: '2024-01-15T10:30:00Z'
            },
            {
                id: 2,
                type: 'deposit',
                amount: 5000,
                payment_method: 'survey_reward',
                status: 'completed',
                created_at: '2024-01-14T15:45:00Z'
            }
        ]
    });
});

// Mock: POST /api/user/withdraw
app.post('/api/user/withdraw', (req, res) => {
    const { amount, payment_method, account_number } = req.body;
    
    // Validation simple
    if (!amount || amount < 1000) {
        return res.status(400).json({ message: 'Montant minimum: 1000 FCFA' });
    }
    
    res.json({
        message: 'Demande de retrait créée avec succès',
        withdrawalId: 12345,
        amount,
        payment_method,
        status: 'pending',
        estimatedProcessingTime: '2-3 jours ouvrables'
    });
});

app.listen(3001, () => {
    console.log('Mock API server running on http://localhost:3001');
});
```

Lancer avec :
```bash
node test-api-server.js
```

Puis modifier les appels fetch dans `dashboard-modern.js` pour utiliser `http://localhost:3001` au lieu de `/api`

---

### 7️⃣ Checklist de test

- [ ] Section "Paiements" apparaît dans le menu
- [ ] Clic sur "Paiements" affiche la section
- [ ] 3 cartes de stats visibles
- [ ] Formulaire visible avec tous les champs
- [ ] Tableau d'historique visible
- [ ] **Desktop :** Layout sur 3 colonnes / 1 colonne
- [ ] **Mobile :** Layout empilé / table en cards
- [ ] Console affiche ✅ ou ⚠️ messages
- [ ] Validation du montant (min 1000)
- [ ] Validation du moyen de paiement
- [ ] Validation du numéro de compte
- [ ] Formulaire se soumet sans erreur (Network tab)
- [ ] Réponse API affichée dans console

---

### 8️⃣ Dépannage

#### "Aucune transaction" même après API réussie
→ Vérifier que la réponse contient un objet `{ transactions: [...] }`

#### Formulaire ne soumet pas
→ Vérifier que le champ `name` du form existe :
```html
<form id="withdrawalForm">
  <input name="amount" ...>
  <select name="paymentMethod" ...>
  <input name="accountNumber" ...>
</form>
```

#### Styles manquants sur mobile
→ Vérifier que le CSS media query est présent :
```css
@media (max-width: 768px) {
    #transactionTable {
        display: block;
    }
    ...
}
```

#### Statuts des transactions mal affichés
→ Vérifier que les statuts correspondent à une des valeurs :
- `pending`, `completed`, `approved`, `rejected`, `failed`

---

## 📊 Structure d'une réponse complète

Pour comprendre ce que devrait retourner votre API :

```json
{
  "user": {
    "id": 123,
    "balance": 50000,
    "totalWithdrawn": 150000
  },
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
      "survey_id": 456,
      "status": "completed",
      "created_at": "2024-01-14T15:45:00Z",
      "updated_at": "2024-01-14T15:45:00Z"
    }
  ]
}
```

---

## 🎬 Scénario de test complet

1. **Chargement initial :** Ouvrir dashboard.html
2. **Navigation :** Cliquer sur Paiements
3. **Chargement données :** Vérifier les soldes s'affichent
4. **Visualisation :** Vérifier l'historique des transactions
5. **Formulaire :** Soumettre un retrait
6. **Confirmation :** Message de succès ou d'erreur
7. **Responsive :** Basculer en vue mobile, revérifier le layout

---

## 📱 Points clés à valider

```
┌─────────────────────────────────────┐
│  Paiements - Section Checklist      │
├─────────────────────────────────────┤
│ ✓ HTML section exists               │
│ ✓ CSS styles appliquées             │
│ ✓ JS functions déclarées            │
│ ✓ Navigation liens mises à jour     │
│ ✓ Responsive mobile (768px)         │
│ ✓ Validation formulaire             │
│ ✓ Appels API corrects               │
│ ✓ Gestion erreurs                   │
│ ✓ Affichage données                 │
│ ✓ Formatage FCFA                    │
└─────────────────────────────────────┘
```

---

## ✅ Quand tout fonctionne

Vous devriez voir :

```
Dashboard
├─ Menu: Paiements ✓
│  └─ Solde: 50,000 FCFA
│  └─ Retiré: 150,000 FCFA
│  └─ En attente: 25,000 FCFA
│
├─ Formulaire: Retrait ✓
│  └─ Montant: input validé
│  └─ Moyen: select dropdown
│  └─ Compte: input texte
│  └─ Bouton: soumettre
│
└─ Historique: Transactions ✓
   ├─ 15 Jan | Retrait | 25,000 | Orange Money | Complétée
   ├─ 14 Jan | Dépôt | 5,000 | Sondage | Complétée
   └─ ...
```

Félicitations ! 🎉 La section Paiements fonctionne !

