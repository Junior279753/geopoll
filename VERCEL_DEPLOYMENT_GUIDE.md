# Guide de Déploiement Vercel - GeoPoll

## ⚠️ Limitations Importantes de Vercel

### 🚨 Problèmes avec SQLite sur Vercel
Vercel a des **limitations importantes** pour les applications utilisant SQLite :

1. **Système de fichiers en lecture seule** : Vercel ne permet pas l'écriture persistante de fichiers
2. **Base de données temporaire** : SQLite sera recréée à chaque déploiement
3. **Perte de données** : Toutes les données utilisateur seront perdues entre les déploiements

### 🎯 Solutions Recommandées

#### Option 1 : Railway (Recommandé) ✅
```bash
# Railway supporte parfaitement SQLite
git push origin main
# Puis déployer sur railway.app
```

#### Option 2 : Render ✅
```bash
# Render supporte aussi SQLite nativement
# Configuration dans render.yaml ou dashboard
```

#### Option 3 : Modifier pour PostgreSQL sur Vercel
Si vous voulez absolument utiliser Vercel, il faut migrer vers PostgreSQL.

## 🔧 Configuration Vercel Actuelle

### Fichiers Créés
- ✅ `vercel.json` - Configuration principale
- ✅ `api/index.js` - Point d'entrée pour Vercel
- ✅ Variables d'environnement documentées

### Structure pour Vercel
```
GeoPoll/
├── api/
│   └── index.js          # Point d'entrée Vercel
├── public/               # Fichiers statiques
├── vercel.json          # Configuration Vercel
└── server.js            # Application principale
```

## 📋 Instructions de Déploiement Vercel

### 1. Prérequis
```bash
npm install -g vercel
```

### 2. Configuration des Variables d'Environnement
Dans le dashboard Vercel, ajoutez :

```env
NODE_ENV=production
JWT_SECRET=votre_secret_super_securise_changez_moi
BCRYPT_ROUNDS=12
REWARD_AMOUNT=22500
DB_PATH=/tmp/geopoll.db
```

### 3. Déploiement
```bash
# Dans le dossier du projet
vercel

# Ou via GitHub (recommandé)
# 1. Connecter le repo GitHub à Vercel
# 2. Configurer les variables d'environnement
# 3. Déployer automatiquement
```

### 4. Configuration du Projet Vercel
- **Framework Preset** : Other
- **Root Directory** : `./` (racine du projet)
- **Build Command** : `npm run init-db`
- **Output Directory** : `public`
- **Install Command** : `npm install`

## ⚠️ Problèmes Connus et Solutions

### Problème 1 : Base de Données Temporaire
**Symptôme** : Les données disparaissent après chaque déploiement

**Solution** :
```javascript
// Dans server.js, ajouter une initialisation automatique
if (process.env.VERCEL) {
    // Recréer les données de base à chaque démarrage
    initializeDefaultData();
}
```

### Problème 2 : Fichiers Statiques
**Symptôme** : CSS/JS/Images ne se chargent pas

**Solution** : Vérifier les routes dans `vercel.json`
```json
{
  "src": "/(.*\\.(css|js|png|jpg|jpeg|gif|svg|ico))",
  "dest": "/public/$1"
}
```

### Problème 3 : API Routes
**Symptôme** : Les routes API retournent 404

**Solution** : Vérifier que toutes les routes passent par `/api/index.js`

## 🔄 Migration vers PostgreSQL (Pour Vercel)

Si vous voulez vraiment utiliser Vercel, voici les étapes pour migrer :

### 1. Installer PostgreSQL
```bash
npm install pg
```

### 2. Configurer la Base de Données
```javascript
// Remplacer SQLite par PostgreSQL
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
```

### 3. Utiliser Vercel Postgres
- Ajouter Vercel Postgres dans le dashboard
- Configurer `DATABASE_URL` automatiquement

## 🎯 Recommandation Finale

### ❌ Vercel avec SQLite
- Base de données temporaire
- Perte de données
- Complexité de configuration

### ✅ Railway avec SQLite
- Support natif SQLite
- Données persistantes
- Configuration simple
- Déploiement en 1 clic

### ✅ Render avec SQLite
- Alternative solide à Railway
- Support SQLite complet
- Interface simple

## 🚀 Déploiement Recommandé : Railway

```bash
# 1. Créer un compte sur railway.app
# 2. Connecter le repository GitHub
# 3. Configurer les variables d'environnement :

NODE_ENV=production
JWT_SECRET=votre_secret_securise
BCRYPT_ROUNDS=12
REWARD_AMOUNT=22500

# 4. Railway détecte automatiquement Node.js
# 5. Déploiement automatique !
```

## 📊 Comparaison des Plateformes

| Plateforme | SQLite | Facilité | Performance | Coût |
|------------|--------|----------|-------------|------|
| Railway    | ✅ Oui  | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Gratuit |
| Render     | ✅ Oui  | ⭐⭐⭐⭐   | ⭐⭐⭐⭐   | Gratuit |
| Vercel     | ❌ Non  | ⭐⭐      | ⭐⭐⭐⭐⭐ | Gratuit |
| Heroku     | ✅ Oui  | ⭐⭐⭐    | ⭐⭐⭐    | Payant |

## 🎉 Conclusion

**Pour GeoPoll avec SQLite, utilisez Railway ou Render plutôt que Vercel.**

Le fichier `vercel.json` est fourni au cas où vous souhaiteriez migrer vers PostgreSQL, mais pour une solution simple et efficace, Railway est le meilleur choix.

---

**🔗 Liens Utiles :**
- [Railway](https://railway.app) - Déploiement recommandé
- [Render](https://render.com) - Alternative solide
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) - Si migration nécessaire
