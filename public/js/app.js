/* ===== JAVASCRIPT AMÉLIORÉ POUR GEOPOLL ===== */

// Configuration de base (utilise la variable globale définie dans modern-app.js)
// const API_BASE_URL est défini dans modern-app.js

// Variables globales pour les améliorations
let countryRegistrationData = {};
let currentRegistrationStep = 1;

// ===== INITIALISATION ===== 
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de GeoPoll');
    
    // Initialiser les composants
    initializeCountrySelector();
    initializePhoneInput();
    setupFormHandlers();
    setupModalHandlers();
    
    console.log('✅ GeoPoll initialisé avec succès');
});

// ===== GESTION DES PAYS ===== 
function initializeCountrySelector() {
    const countrySelect = document.getElementById('country');
    if (!countrySelect) return;
    
    console.log('🌍 Initialisation du sélecteur de pays');
    
    // Vider les options existantes (sauf la première)
    while (countrySelect.children.length > 1) {
        countrySelect.removeChild(countrySelect.lastChild);
    }
    
    // Charger tous les pays depuis countries.js
    if (typeof getCountriesList === 'function') {
        const countries = getCountriesList();
        
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country.code;
            option.textContent = `${getCountryFlag(country.code)} ${country.name}`;
            countrySelect.appendChild(option);
        });
        
        console.log(`✅ ${countries.length} pays chargés`);
    } else {
        console.warn('⚠️ countries.js non trouvé, utilisation de la liste par défaut');
        addDefaultCountries(countrySelect);
    }
    
    // Écouter les changements de pays
    countrySelect.addEventListener('change', handleCountryChange);
}

function addDefaultCountries(select) {
    const defaultCountries = [
        { code: 'CI', name: 'Côte d\'Ivoire' },
        { code: 'SN', name: 'Sénégal' },
        { code: 'ML', name: 'Mali' },
        { code: 'BF', name: 'Burkina Faso' },
        { code: 'FR', name: 'France' },
        { code: 'BJ', name: 'Bénin' },
        { code: 'TG', name: 'Togo' },
        { code: 'GH', name: 'Ghana' },
        { code: 'NG', name: 'Nigeria' }
    ];
    
    defaultCountries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.code;
        option.textContent = `${getCountryFlag(country.code)} ${country.name}`;
        select.appendChild(option);
    });
}

function getCountryFlag(countryCode) {
    const flags = {
        'CI': '🇨🇮', 'SN': '🇸🇳', 'ML': '🇲🇱', 'BF': '🇧🇫', 'FR': '🇫🇷',
        'BJ': '🇧🇯', 'TG': '🇹🇬', 'GH': '🇬🇭', 'NG': '🇳🇬', 'CM': '🇨🇲',
        'GA': '🇬🇦', 'CG': '🇨🇬', 'CD': '🇨🇩', 'CF': '🇨🇫', 'TD': '🇹🇩',
        'NE': '🇳🇪', 'MR': '🇲🇷', 'GN': '🇬🇳', 'SL': '🇸🇱', 'LR': '🇱🇷'
    };
    return flags[countryCode] || '🌍';
}

function handleCountryChange(event) {
    const countryCode = event.target.value;
    console.log(`🌍 Pays sélectionné: ${countryCode}`);
    
    if (countryCode) {
        updatePhoneCode(countryCode);
        updatePostalCodeHint(countryCode);
    }
}

// ===== GESTION DU TÉLÉPHONE ===== 
function initializePhoneInput() {
    const phoneInput = document.getElementById('phone');
    const phoneCodeDisplay = document.getElementById('phoneCodeDisplay');
    
    if (!phoneInput || !phoneCodeDisplay) return;
    
    console.log('📱 Initialisation de l\'input téléphone');
    
    // Formater le numéro pendant la saisie
    phoneInput.addEventListener('input', handlePhoneInput);
    phoneInput.addEventListener('keydown', handlePhoneKeydown);
}

function updatePhoneCode(countryCode) {
    const phoneCodeDisplay = document.getElementById('phoneCodeDisplay');
    const phoneFormatHint = document.getElementById('phoneFormatHint');
    
    if (!phoneCodeDisplay) return;
    
    let countryData = null;
    if (typeof getCountryData === 'function') {
        countryData = getCountryData(countryCode);
    }
    
    if (countryData) {
        // Mettre à jour l'affichage du code
        const flagIcon = phoneCodeDisplay.querySelector('.flag-icon');
        const phoneCode = phoneCodeDisplay.querySelector('.phone-code');
        
        if (flagIcon) flagIcon.textContent = getCountryFlag(countryCode);
        if (phoneCode) phoneCode.textContent = countryData.phoneCode;
        
        // Mettre à jour l'indice de format
        if (phoneFormatHint && countryData.phoneFormat) {
            phoneFormatHint.textContent = `Format: ${countryData.phoneFormat} (ex: ${countryData.phoneExample})`;
        }
        
        console.log(`📱 Code téléphone mis à jour: ${countryData.phoneCode}`);
    } else {
        // Valeurs par défaut
        const flagIcon = phoneCodeDisplay.querySelector('.flag-icon');
        const phoneCode = phoneCodeDisplay.querySelector('.phone-code');
        
        if (flagIcon) flagIcon.textContent = getCountryFlag(countryCode);
        if (phoneCode) phoneCode.textContent = '+000';
        
        if (phoneFormatHint) {
            phoneFormatHint.textContent = 'Format: XX XX XX XX XX';
        }
    }
}

function handlePhoneInput(event) {
    const input = event.target;
    const countrySelect = document.getElementById('country');
    const countryCode = countrySelect ? countrySelect.value : null;

    if (countryCode && typeof formatPhoneNumber === 'function') {
        const originalValue = input.value;
        const originalCursor = input.selectionStart;
        const digitsBeforeCursor = (originalValue.slice(0, originalCursor).match(/\d/g) || []).length;

        const formatted = formatPhoneNumber(originalValue, countryCode);

        if (formatted !== originalValue) {
            let newCursor = 0;
            let digitsCounted = 0;
            while (digitsCounted < digitsBeforeCursor && newCursor < formatted.length) {
                if (/\d/.test(formatted[newCursor])) {
                    digitsCounted++;
                }
                newCursor++;
            }
            
            while (newCursor < formatted.length && !/\d/.test(formatted[newCursor])) {
                newCursor++;
            }

            input.value = formatted;
            input.setSelectionRange(newCursor, newCursor);
        }
    }
}

function handlePhoneKeydown(event) {
    // Permettre seulement les chiffres, espaces, et touches de contrôle
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    
    if (allowedKeys.includes(event.key) || 
        (event.key >= '0' && event.key <= '9') || 
        event.key === ' ' || 
        (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase()))) {
        return;
    }
    
    event.preventDefault();
}

function updatePostalCodeHint(countryCode) {
    const postalCodeInput = document.getElementById('postalCode');
    if (!postalCodeInput) return;
    
    let countryData = null;
    if (typeof getCountryData === 'function') {
        countryData = getCountryData(countryCode);
    }
    
    if (countryData && countryData.postalCodeExample) {
        postalCodeInput.placeholder = `Ex: ${countryData.postalCodeExample}`;
    } else {
        postalCodeInput.placeholder = 'Code postal ou ville';
    }
}

// ===== GESTION DES MODALS ===== 
function setupModalHandlers() {
    // Fermer modal en cliquant à l'extérieur
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            const modalId = e.target.id;
            closeModal(modalId);
        }
    });
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function showLoginModal() {
    showModal('loginModal');
}

function showRegisterModal() {
    showModal('registerModal');
}

// ===== GESTION DES FORMULAIRES ===== 
function setupFormHandlers() {
    // Formulaire de connexion
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Formulaires d'inscription par étapes
    const step1Form = document.getElementById('step1Form');
    const step2Form = document.getElementById('step2Form');
    const step3Form = document.getElementById('step3Form');
    
    if (step3Form) {
        step3Form.addEventListener('submit', handleRegistration);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    const submitButton = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true);
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showNotification('Connexion réussie !', 'success');
            
            // Rediriger selon le rôle
            if (data.user.is_admin) {
                window.location.href = '/admin-modern.html';
            } else {
                window.location.href = '/dashboard.html';
            }
        } else {
            showNotification(data.error || 'Erreur de connexion', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion', 'error');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// ===== GESTION DES ÉTAPES D'INSCRIPTION ===== 
function nextStep(step) {
    if (validateCurrentStep()) {
        saveCurrentStepData();
        showStep(step);
    }
}

function previousStep(step) {
    showStep(step);
}

function showStep(step) {
    // Masquer toutes les étapes
    const steps = document.querySelectorAll('.registration-step');
    steps.forEach(s => s.classList.remove('active'));

    // Afficher l'étape demandée
    let targetStep;
    if (step === 'Final') {
        targetStep = document.getElementById('stepFinal');
    } else {
        targetStep = document.getElementById(`step${step}`);
    }

    if (targetStep) {
        targetStep.classList.add('active');
        if (step !== 'Final') {
            currentStep = step;
            updateStepIndicators(step);
        }
    }
}

function updateStepIndicators(step) {
    const indicators = document.querySelectorAll('.step-indicator');
    indicators.forEach((indicator, index) => {
        indicator.classList.remove('active', 'completed');
        if (index + 1 < step) {
            indicator.classList.add('completed');
        } else if (index + 1 === step) {
            indicator.classList.add('active');
        }
    });
}

function validateCurrentStep() {
    const currentStepElement = document.querySelector('.registration-step.active');
    if (!currentStepElement) return false;

    const inputs = currentStepElement.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        clearFieldError(input);

        if (!input.value.trim()) {
            showFieldError(input, 'Ce champ est requis');
            isValid = false;
        } else if (input.type === 'email' && !isValidEmail(input.value)) {
            showFieldError(input, 'Email invalide');
            isValid = false;
        } else if (input.id === 'phone' && !isValidPhone(input.value)) {
            showFieldError(input, 'Numéro de téléphone invalide');
            isValid = false;
        }
    });

    // Validation spéciale pour l'étape 3 (mots de passe)
    if (currentStepElement.id === 'step3') {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;

        // Vérifier la force du mot de passe
        if (!isStrongPassword(password)) {
            showFieldError(document.getElementById('password'), 'Le mot de passe ne respecte pas les critères');
            isValid = false;
        }

        // Vérifier la correspondance des mots de passe
        if (password !== confirmPassword) {
            showFieldError(document.getElementById('confirmPassword'), 'Les mots de passe ne correspondent pas');
            isValid = false;
        }

        // Vérifier l'acceptation des conditions
        if (!acceptTerms) {
            showFieldError(document.getElementById('acceptTerms'), 'Vous devez accepter les conditions d\'utilisation');
            isValid = false;
        }
    }

    return isValid;
}

function isValidPhone(phone) {
    // Validation basique du téléphone (au moins 8 chiffres)
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.length >= 8;
}

function isStrongPassword(password) {
    return password.length >= 8 &&
           /[A-Z]/.test(password) &&
           /[a-z]/.test(password) &&
           /[0-9]/.test(password);
}

function saveCurrentStepData() {
    const currentStepElement = document.querySelector('.registration-step.active');
    if (!currentStepElement) return;

    const inputs = currentStepElement.querySelectorAll('input, select');
    inputs.forEach(input => {
        // Utiliser la variable globale de modern-app.js
        if (typeof registrationData !== 'undefined') {
            registrationData[input.name] = input.value;
        } else {
            countryRegistrationData[input.name] = input.value;
        }
    });
}

// ===== UTILITAIRES ===== 
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showFieldError(input, message) {
    clearFieldError(input);
    
    input.classList.add('error');
    
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    
    input.parentNode.appendChild(errorElement);
}

function clearFieldError(input) {
    input.classList.remove('error');
    
    const existingError = input.parentNode.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
}

function setButtonLoading(button, loading) {
    if (loading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Chargement...';
    } else {
        button.disabled = false;
        button.innerHTML = button.getAttribute('data-original-text') || 'Valider';
    }
}

function showNotification(message, type = 'info') {
    // Créer la notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Afficher avec animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Fermer automatiquement après 5 secondes
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Fermer manuellement
    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    });
}

async function handleRegistration(e) {
    e.preventDefault();

    if (!validateCurrentStep()) return;

    saveCurrentStepData();

    // Préparer les données complètes
    const completeData = {
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        email: registrationData.email,
        phone: registrationData.phone,
        country: registrationData.country,
        countryCode: getCountryCode(registrationData.country),
        profession: registrationData.profession,
        password: registrationData.password
    };

    console.log('📝 Données d\'inscription:', completeData);

    const submitButton = e.target.querySelector('button[type="submit"]');
    setButtonLoading(submitButton, true);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(completeData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('🎉 Compte créé avec succès ! En attente d\'approbation par un administrateur.', 'success');
            showStep('Final');

            // Réinitialiser le formulaire après un délai
            setTimeout(() => {
                closeModal('registerModal');
                registrationData = {};
                showStep(1);
                document.getElementById('step1Form').reset();
                document.getElementById('step2Form').reset();
                document.getElementById('step3Form').reset();
            }, 3000);
        } else {
            showNotification(data.error || 'Erreur lors de la création du compte', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

function getCountryCode(country) {
    const countryCodes = {
        'CI': 'CI',
        'SN': 'SN',
        'ML': 'ML',
        'BF': 'BF',
        'FR': 'FR',
        'BJ': 'BJ',
        'TG': 'TG',
        'GH': 'GH',
        'NG': 'NG'
    };
    return countryCodes[country] || 'FR';
}

// ===== GESTION DES MOTS DE PASSE =====
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'ToggleIcon');

    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function setupPasswordValidation() {
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    if (passwordInput) {
        passwordInput.addEventListener('input', validatePassword);
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordMatch);
    }
}

function validatePassword() {
    const password = document.getElementById('password').value;

    // Vérifier la longueur
    const lengthReq = document.getElementById('req-length');
    if (password.length >= 8) {
        lengthReq.classList.add('valid');
        lengthReq.querySelector('i').className = 'fas fa-check';
    } else {
        lengthReq.classList.remove('valid');
        lengthReq.querySelector('i').className = 'fas fa-times';
    }

    // Vérifier la majuscule
    const uppercaseReq = document.getElementById('req-uppercase');
    if (/[A-Z]/.test(password)) {
        uppercaseReq.classList.add('valid');
        uppercaseReq.querySelector('i').className = 'fas fa-check';
    } else {
        uppercaseReq.classList.remove('valid');
        uppercaseReq.querySelector('i').className = 'fas fa-times';
    }

    // Vérifier la minuscule
    const lowercaseReq = document.getElementById('req-lowercase');
    if (/[a-z]/.test(password)) {
        lowercaseReq.classList.add('valid');
        lowercaseReq.querySelector('i').className = 'fas fa-check';
    } else {
        lowercaseReq.classList.remove('valid');
        lowercaseReq.querySelector('i').className = 'fas fa-times';
    }

    // Vérifier le chiffre
    const numberReq = document.getElementById('req-number');
    if (/[0-9]/.test(password)) {
        numberReq.classList.add('valid');
        numberReq.querySelector('i').className = 'fas fa-check';
    } else {
        numberReq.classList.remove('valid');
        numberReq.querySelector('i').className = 'fas fa-times';
    }

    // Valider la correspondance si le champ de confirmation est rempli
    validatePasswordMatch();
}

function validatePasswordMatch() {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const matchHint = document.getElementById('passwordMatch');

    if (confirmPassword === '') {
        matchHint.textContent = '🔄 Retapez le même mot de passe';
        matchHint.className = 'form-hint';
        return;
    }

    if (password === confirmPassword) {
        matchHint.textContent = '✅ Les mots de passe correspondent';
        matchHint.className = 'form-hint success';
    } else {
        matchHint.textContent = '❌ Les mots de passe ne correspondent pas';
        matchHint.className = 'form-hint error';
    }
}

function showTerms() {
    alert('Conditions d\'utilisation de GeoPoll\n\nEn vous inscrivant, vous acceptez de participer aux sondages de manière honnête et de respecter les règles de la plateforme.');
}

function showPrivacy() {
    alert('Politique de confidentialité\n\nVos données personnelles sont protégées et utilisées uniquement pour le fonctionnement de la plateforme GeoPoll.');
}

// Mettre à jour la fonction d'initialisation
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation de GeoPoll');

    // Initialiser les composants
    initializeCountrySelector();
    initializePhoneInput();
    setupFormHandlers();
    setupModalHandlers();
    setupPasswordValidation();

    console.log('✅ GeoPoll initialisé avec succès');
});

// Rendre les fonctions globales
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeModal = closeModal;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.handleRegistration = handleRegistration;
window.togglePassword = togglePassword;
window.showTerms = showTerms;
window.showPrivacy = showPrivacy;
