# GeoPoll - Plateforme de Sondages Rémunérés

GeoPoll est une plateforme web moderne qui permet aux utilisateurs de participer à des sondages thématiques et de gagner de l'argent. Chaque sondage réussi (10/10 bonnes réponses) rapporte 22 200 FCFA.

## 🚀 Fonctionnalités

### Pour les utilisateurs
- **Inscription et authentification sécurisée**
- **5 thèmes de sondages** : Culture générale, Technologie, Histoire, Environnement, Santé
- **Système de récompenses** : 22 200 FCFA par sondage réussi
- **Gestion des moyens de paiement** : MTN MoMo, Moov Money, PayPal, Compte bancaire
- **Dashboard complet** avec statistiques et historique
- **Interface responsive** optimisée mobile et desktop

### Pour les administrateurs
- **Gestion des utilisateurs** et abonnements
- **Statistiques détaillées** de la plateforme
- **Gestion des demandes de retrait**
- **Logs d'activité** et système anti-fraude

## 🛠️ Technologies utilisées

- **Backend** : Node.js, Express.js
- **Base de données** : SQLite
- **Frontend** : HTML5, CSS3, JavaScript (Vanilla)
- **Authentification** : JWT (JSON Web Tokens)
- **Sécurité** : bcryptjs, helmet, express-rate-limit
- **Validation** : express-validator

## 📋 Prérequis

- Node.js (version 16 ou supérieure)
- npm ou yarn

## 🔧 Installation

1. **Cloner le projet**
```bash
git clone <url-du-repo>
cd GeoPoll
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configurer l'environnement**
```bash
cp .env.example .env
```
Modifiez le fichier `.env` avec vos propres valeurs.

4. **Initialiser la base de données**
```bash
npm run init-db
```

5. **Démarrer le serveur**
```bash
npm start
```

L'application sera accessible sur `http://localhost:3000`

## 🗄️ Structure de la base de données

### Tables principales
- **users** : Informations des utilisateurs
- **subscriptions** : Abonnements des utilisateurs
- **survey_themes** : Thèmes de sondages
- **questions** : Questions par thème
- **survey_attempts** : Tentatives de sondages
- **user_answers** : Réponses des utilisateurs
- **payment_methods** : Moyens de paiement
- **transactions** : Historique des transactions
- **activity_logs** : Logs d'activité

## 🎯 Utilisation

### Inscription et connexion
1. Créer un compte sur la page d'accueil
2. Se connecter avec email et mot de passe
3. Accéder au dashboard

### Participer aux sondages
1. Souscrire un abonnement (mensuel, annuel ou à vie)
2. Choisir un thème de sondage
3. Répondre aux 10 questions
4. Obtenir 22 200 FCFA si 10/10 bonnes réponses

### Retirer ses gains
1. Ajouter un moyen de paiement
2. Demander un retrait (minimum 1000 FCFA)
3. Attendre la validation par l'administrateur

## 🔐 Sécurité

- **Authentification JWT** avec expiration
- **Hashage des mots de passe** avec bcryptjs
- **Limitation du taux de requêtes** pour éviter le spam
- **Validation des données** côté serveur
- **Logs d'activité** pour traçabilité
- **Système anti-fraude** (détection multi-comptes)

## 📱 API Endpoints

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur
- `PUT /api/auth/profile` - Mise à jour profil
- `PUT /api/auth/change-password` - Changement mot de passe

### Sondages
- `GET /api/surveys/themes` - Liste des thèmes
- `POST /api/surveys/themes/:id/start` - Commencer un sondage
- `POST /api/surveys/attempts/:id/answer` - Soumettre une réponse
- `POST /api/surveys/attempts/:id/complete` - Finaliser un sondage

### Paiements
- `POST /api/payments/subscribe` - Créer un abonnement
- `POST /api/payments/withdraw` - Demander un retrait
- `GET /api/payments/history` - Historique des transactions

### Administration
- `GET /api/admin/stats` - Statistiques générales
- `GET /api/admin/users` - Liste des utilisateurs
- `GET /api/admin/withdrawals/pending` - Demandes de retrait

## 🧪 Tests

Tester l'API avec le script fourni :
```bash
node test-api.js
```

## 🚀 Déploiement

### Plateformes recommandées (gratuites)
- **Railway** : Déploiement facile avec base de données
- **Render** : Hébergement gratuit avec SSL
- **Vercel** : Pour le frontend (si séparé)

### Variables d'environnement de production
```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your_super_secure_jwt_secret
DB_PATH=./database/geopoll.db
REWARD_AMOUNT=22500
```

## 📊 Fonctionnalités avancées

### Système d'abonnement
- **Mensuel** : 5 000 FCFA/mois
- **Annuel** : 50 000 FCFA/an (économie de 10 000 FCFA)
- **À vie** : 100 000 FCFA (accès permanent)

### Types de paiement supportés
- MTN Mobile Money
- Moov Money
- PayPal
- Compte bancaire

### Thèmes de sondages
1. **Culture générale** - Questions variées sur la culture mondiale
2. **Technologie et innovation** - Nouvelles technologies et innovations
3. **Histoire mondiale** - Événements historiques marquants
4. **Environnement et climat** - Écologie et changement climatique
5. **Santé et bien-être** - Questions sur la santé

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 Support

Pour toute question ou support :
- Email : support@geopoll.com
- Documentation : [Wiki du projet]
- Issues : [GitHub Issues]

## 🎉 Remerciements

- Équipe de développement GeoPoll
- Communauté open source
- Utilisateurs bêta-testeurs

---

**GeoPoll** - Gagnez de l'argent en partageant vos connaissances ! 🌍💰
