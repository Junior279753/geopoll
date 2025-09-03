const { body, validationResult } = require('express-validator');

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Données invalides',
            details: errors.array()
        });
    }
    next();
};

// Validations pour l'inscription
const validateRegistration = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email invalide'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Le mot de passe doit contenir au moins 8 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Le mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
    body('firstName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
    body('lastName')
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('phone')
        .notEmpty()
        .withMessage('Le numéro de téléphone est requis')
        .isLength({ min: 8 })
        .withMessage('Numéro de téléphone invalide'),
    body('country')
        .notEmpty()
        .withMessage('Le pays est requis')
        .trim(),
    body('profession')
        .notEmpty()
        .withMessage('La profession est requise')
        .isIn(['etudiant', 'employe', 'fonctionnaire', 'entrepreneur', 'commercant', 'artisan', 'agriculteur', 'enseignant', 'sante', 'transport', 'retraite', 'sans_emploi', 'autre'])
        .withMessage('Profession invalide')
        .isLength({ min: 2, max: 100 })
        .withMessage('Pays invalide'),
    handleValidationErrors
];

// Validations pour la connexion
const validateLogin = [
    body('email')
        .custom((value) => {
            // Accepter soit un email valide soit un ID unique (format GP + chiffres)
            const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            const isUniqueId = /^GP\d+$/.test(value);

            if (!isEmail && !isUniqueId) {
                throw new Error('Email ou ID unique invalide');
            }

            return true;
        })
        .withMessage('Email ou ID unique invalide'),
    body('password')
        .notEmpty()
        .withMessage('Mot de passe requis'),
    handleValidationErrors
];

// Validations pour la mise à jour du profil
const validateProfileUpdate = [
    body('firstName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Le prénom doit contenir entre 2 et 50 caractères'),
    body('lastName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Le nom doit contenir entre 2 et 50 caractères'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Numéro de téléphone invalide'),
    body('country')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Pays invalide'),
    handleValidationErrors
];

// Validations pour le changement de mot de passe
const validatePasswordChange = [
    body('currentPassword')
        .notEmpty()
        .withMessage('Mot de passe actuel requis'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Le nouveau mot de passe doit contenir au moins 8 caractères')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Le nouveau mot de passe doit contenir au moins une minuscule, une majuscule et un chiffre'),
    handleValidationErrors
];

// Validations pour l'ajout d'un moyen de paiement
const validatePaymentMethod = [
    body('type')
        .isIn(['mtn_momo', 'moov_money', 'paypal', 'bank_account'])
        .withMessage('Type de paiement invalide'),
    body('accountNumber')
        .trim()
        .notEmpty()
        .withMessage('Numéro de compte requis'),
    body('accountName')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nom du titulaire invalide'),
    handleValidationErrors
];

// Validations pour les réponses de sondage
const validateSurveyAnswer = [
    body('questionId')
        .isInt({ min: 1 })
        .withMessage('ID de question invalide'),
    body('answer')
        .isIn(['A', 'B', 'C', 'D'])
        .withMessage('Réponse invalide (doit être A, B, C ou D)'),
    handleValidationErrors
];

// Validations pour la création d'abonnement
const validateSubscription = [
    body('type')
        .isIn(['monthly', 'yearly', 'lifetime'])
        .withMessage('Type d\'abonnement invalide'),
    body('paymentMethodId')
        .isInt({ min: 1 })
        .withMessage('Moyen de paiement invalide'),
    handleValidationErrors
];

// Validations pour les demandes de retrait
const validateWithdrawal = [
    body('amount')
        .isFloat({ min: 1000 }) // Minimum 1000 FCFA
        .withMessage('Montant minimum de retrait: 1000 FCFA'),
    body('paymentMethodId')
        .isInt({ min: 1 })
        .withMessage('Moyen de paiement invalide'),
    handleValidationErrors
];

module.exports = {
    validateRegistration,
    validateLogin,
    validateProfileUpdate,
    validatePasswordChange,
    validatePaymentMethod,
    validateSurveyAnswer,
    validateSubscription,
    validateWithdrawal,
    handleValidationErrors
};
