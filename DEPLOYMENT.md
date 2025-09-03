# Guide de Déploiement GeoPoll

Ce guide vous explique comment déployer l'application GeoPoll sur différentes plateformes.

## 📋 Prérequis

- Node.js 16+ installé
- Compte sur la plateforme de déploiement choisie
- Variables d'environnement configurées

## 🚀 Plateformes de Déploiement Recommandées

### 1. Railway (Recommandé pour fullstack)

Railway est la plateforme recommandée car elle supporte parfaitement SQLite et Node.js.

**Étapes :**
1. Créer un compte sur [railway.app](https://railway.app)
2. Connecter votre repository GitHub
3. Cliquer sur "Deploy from GitHub repo"
4. Sélectionner votre repository GeoPoll
5. Configurer les variables d'environnement :

```env
NODE_ENV=production
JWT_SECRET=votre_secret_jwt_super_securise_ici
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
REWARD_AMOUNT=22500
PORT=3000
```

6. Railway détectera automatiquement le projet Node.js et le déploiera

### 2. Render

**Étapes :**
1. Créer un compte sur [render.com](https://render.com)
2. Créer un nouveau "Web Service"
3. Connecter votre repository GitHub
4. Configurer :
   - **Build Command:** `npm install && npm run init-db`
   - **Start Command:** `npm start`
   - **Environment:** Node
5. Ajouter les variables d'environnement (mêmes que Railway)

### 3. Vercel (Limitations)

⚠️ **Note:** Vercel a des limitations pour les applications fullstack avec base de données persistante.

**Étapes :**
1. Installer Vercel CLI : `npm install -g vercel`
2. Dans le dossier du projet : `vercel`
3. Suivre les instructions
4. Configurer les variables d'environnement via le dashboard Vercel

## 🔧 Configuration des Variables d'Environnement

### Variables Obligatoires

| Variable | Description | Exemple |
|----------|-------------|---------|
| `NODE_ENV` | Environnement d'exécution | `production` |
| `JWT_SECRET` | Clé secrète pour JWT | `votre_secret_super_securise` |
| `BCRYPT_ROUNDS` | Rounds de hachage bcrypt | `12` |
| `REWARD_AMOUNT` | Montant de récompense en FCFA | `22500` |

### Variables Optionnelles

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `3001` |
| `RATE_LIMIT_WINDOW_MS` | Fenêtre de limitation (ms) | `900000` |
| `RATE_LIMIT_MAX_REQUESTS` | Requêtes max par fenêtre | `100` |
| `DB_PATH` | Chemin de la base de données | `./database/geopoll.db` |

## 📊 Initialisation de la Base de Données

La base de données SQLite sera automatiquement initialisée au premier démarrage grâce au script `npm run init-db`.

**Contenu initialisé :**
- 5 thèmes de sondage
- 20 questions (10 par thème pour les 2 premiers thèmes)
- Structure complète des tables

## 🔐 Sécurité en Production

### Variables Sensibles
- **JWT_SECRET** : Utilisez un secret fort et unique
- **BCRYPT_ROUNDS** : Minimum 12 pour la production

### Headers de Sécurité
L'application inclut automatiquement :
- Helmet.js pour les headers de sécurité
- CORS configuré
- Rate limiting
- Validation des données

## 🧪 Tests Post-Déploiement

Après le déploiement, testez ces endpoints :

1. **Santé de l'application :**
   ```bash
   curl https://votre-app.com/
   ```

2. **API de base :**
   ```bash
   curl https://votre-app.com/api/auth/verify
   ```

3. **Interface admin :**
   - Accédez à `https://votre-app.com/admin.html`
   - Connectez-vous avec les identifiants admin

## 🐛 Dépannage

### Erreurs Communes

**1. "Cannot find module"**
- Vérifiez que `npm install` s'exécute correctement
- Assurez-vous que `package.json` est présent

**2. "Database not found"**
- Vérifiez que `npm run init-db` s'exécute au build
- Contrôlez les permissions d'écriture

**3. "JWT Secret not defined"**
- Vérifiez que `JWT_SECRET` est défini dans les variables d'environnement

**4. "Port already in use"**
- Utilisez la variable `PORT` fournie par la plateforme
- Ne forcez pas un port spécifique en production

### Logs de Débogage

Pour activer les logs détaillés :
```env
NODE_ENV=development
```

## 📈 Monitoring

### Métriques à Surveiller
- Temps de réponse des API
- Utilisation mémoire
- Erreurs 500
- Taux de connexions réussies

### Endpoints de Santé
- `GET /` - Page d'accueil
- `GET /api/auth/verify` - Vérification API

## 🔄 Mises à Jour

Pour mettre à jour l'application :
1. Poussez vos changements sur GitHub
2. La plateforme redéploiera automatiquement
3. Testez les nouvelles fonctionnalités

## 📞 Support

En cas de problème :
1. Vérifiez les logs de la plateforme
2. Consultez la documentation de la plateforme
3. Vérifiez les variables d'environnement
4. Testez localement avec `NODE_ENV=production`
