const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de sécurité
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com"
            ],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            connectSrc: ["'self'"]
        }
    }
}));
app.use(compression());

// Configuration CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://votre-domaine.com'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Limitation du taux de requêtes
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        error: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
    }
});
app.use('/api/', limiter);

// Middleware de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
}

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// Routes API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/surveys', require('./routes/surveys'));
app.use('/api/payments', require('./routes/payments'));
// Routes admin spécifiques AVANT la route admin générale
app.use('/api/admin/users', require('./routes/adminUsers'));
app.use('/api/admin/notifications', require('./routes/adminNotifications'));
app.use('/api/admin/surveys', require('./routes/adminSurveys'));
app.use('/api/admin/quizzes', require('./routes/adminQuizzes'));
// Route admin générale EN DERNIER
app.use('/api/admin', require('./routes/admin'));
app.use('/api/quiz-scheduling', require('./routes/quizScheduling'));

// Route principale pour servir l'application frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de gestion d'erreurs
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    if (process.env.NODE_ENV === 'production') {
        res.status(500).json({
            error: 'Une erreur interne s\'est produite'
        });
    } else {
        res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }
});

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée'
    });
});

// Démarrage du serveur
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`🚀 Serveur GeoPoll démarré sur le port ${PORT}`);
        console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
        const dbType = process.env.SUPABASE_URL ? 'Supabase' : 'SQLite';
        console.log(`📊 Base de données: ${dbType}`);
    });
}

module.exports = app;
