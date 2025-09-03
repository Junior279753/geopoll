const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        console.log('🔍 Auth header:', authHeader ? 'Présent' : 'Absent');
        console.log('🔍 Token:', token ? 'Présent' : 'Absent');

        if (!token) {
            console.log('❌ Token manquant');
            return res.status(401).json({
                error: 'Token d\'accès requis'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('🔍 Token décodé, userId:', decoded.userId);

        const user = await User.findById(decoded.userId);
        console.log('🔍 Utilisateur trouvé:', user ? user.email : 'Non trouvé');

        if (!user) {
            console.log('❌ Utilisateur non trouvé pour ID:', decoded.userId);
            return res.status(401).json({
                error: 'Utilisateur non trouvé'
            });
        }

        if (!user.isActive) {
            console.log('❌ Compte désactivé pour:', user.email);
            return res.status(401).json({
                error: 'Compte désactivé'
            });
        }

        console.log('✅ Authentification réussie pour:', user.email);
        req.user = user;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Token invalide' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expiré' 
            });
        }
        
        console.error('Erreur d\'authentification:', error);
        return res.status(500).json({ 
            error: 'Erreur interne du serveur' 
        });
    }
};

// Middleware pour vérifier l'abonnement actif
const requireActiveSubscription = async (req, res, next) => {
    try {
        const hasSubscription = await req.user.hasActiveSubscription();
        
        if (!hasSubscription) {
            return res.status(403).json({
                error: 'Abonnement actif requis pour accéder aux sondages',
                code: 'SUBSCRIPTION_REQUIRED'
            });
        }

        next();
    } catch (error) {
        console.error('Erreur de vérification d\'abonnement:', error);
        return res.status(500).json({ 
            error: 'Erreur interne du serveur' 
        });
    }
};

// Middleware pour vérifier les droits administrateur
const requireAdmin = (req, res, next) => {
    console.log('🔍 Vérification admin pour:', req.user.email);
    console.log('🔍 isAdmin:', req.user.isAdmin);
    console.log('🔍 is_admin:', req.user.is_admin);

    // Vérifier si l'utilisateur a les droits admin (support des deux formats)
    const isAdmin = req.user.isAdmin || req.user.is_admin;

    if (!isAdmin) {
        console.log('❌ Accès refusé: pas de droits admin');
        return res.status(403).json({
            error: 'Droits administrateur requis'
        });
    }

    console.log('✅ Accès admin autorisé pour:', req.user.email);
    next();
};

// Middleware pour générer un token JWT
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' } // Token valide 7 jours
    );
};

// Middleware pour vérifier le token optionnel (pour les routes publiques avec info utilisateur)
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);
            
            if (user && user.isActive) {
                req.user = user;
            }
        }
        
        next();
    } catch (error) {
        // En cas d'erreur, on continue sans utilisateur authentifié
        next();
    }
};

module.exports = {
    authenticateToken,
    requireActiveSubscription,
    requireAdmin,
    generateToken,
    optionalAuth
};
