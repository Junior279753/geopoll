// ===== VARIABLES GLOBALES =====
const API_BASE_URL = '/api';
let currentStep = 1;
let registrationData = {};

// Détecter le port du serveur automatiquement
const SERVER_PORT = window.location.port || '3001';
console.log(`🌐 Serveur détecté sur le port: ${SERVER_PORT}`);

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Navigation mobile
    setupMobileNavigation();
    
    // Smooth scrolling
    setupSmoothScrolling();
    
    // Formulaires
    setupForms();
    
    // Animations au scroll
    setupScrollAnimations();
}

// ===== NAVIGATION =====
function setupMobileNavigation() {
    console.log('🍔 Initialisation du menu hamburger...');

    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');

    console.log('🔍 navToggle:', navToggle);
    console.log('🔍 navMenu:', navMenu);

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🍔 Clic sur menu hamburger');
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
            console.log('🔍 Menu actif:', navMenu.classList.contains('active'));
        });

        // Fermer le menu en cliquant sur un lien
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });

        // Fermer le menu en cliquant en dehors
        document.addEventListener('click', (e) => {
            if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            }
        });

        console.log('✅ Menu hamburger initialisé avec succès');
    } else {
        console.error('❌ Éléments du menu hamburger non trouvés');
        console.error('- navToggle:', !!navToggle);
        console.error('- navMenu:', !!navMenu);
    }
}

function setupSmoothScrolling() {
    // Liens de navigation
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            scrollToSection(targetId);
        });
    });
}

function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        const offsetTop = section.offsetTop - 80; // Hauteur de la navbar
        window.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });
    }
}

// ===== MODALS =====
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        console.log('Modal ouvert:', modalId);
    } else {
        console.error('Modal non trouvé:', modalId);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';

        // Reset des formulaires
        if (modalId === 'registerModal') {
            resetRegistrationForm();
        }
        console.log('Modal fermé:', modalId);
    }
}

function showLoginModal() {
    console.log('Tentative d\'ouverture du modal de connexion');
    showModal('loginModal');
}

function showRegisterModal() {
    console.log('Tentative d\'ouverture du modal d\'inscription');
    showModal('registerModal');
}

// Rendre les fonctions globales
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeModal = closeModal;
window.nextStep = nextStep;
window.previousStep = previousStep;
window.processPaymentAndRegister = processPaymentAndRegister;

// Fermer modal en cliquant à l'extérieur
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        const modalId = e.target.id;
        closeModal(modalId);
    }
});

// ===== INSCRIPTION PAR ÉTAPES =====
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
    document.querySelectorAll('.registration-step').forEach(stepEl => {
        stepEl.classList.remove('active');
    });

    // Afficher l'étape courante
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        stepElement.classList.add('active');
        currentStep = step;

        // Initialiser les gestionnaires spécifiques à l'étape
        if (step === 4) {
            setupPaymentMethodHandlers();
        }
    }
}

function validateCurrentStep() {
    const currentStepForm = document.querySelector(`#step${currentStep}Form`);
    if (!currentStepForm) return true;
    
    const inputs = currentStepForm.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value.trim()) {
            showFieldError(input, 'Ce champ est requis');
            isValid = false;
        } else {
            clearFieldError(input);
        }
    });
    
    // Validation spécifique pour l'email
    if (currentStep === 1) {
        const emailInput = document.getElementById('email');
        if (emailInput && !isValidEmail(emailInput.value)) {
            showFieldError(emailInput, 'Email invalide');
            isValid = false;
        }
    }
    
    // Validation des mots de passe
    if (currentStep === 3) {
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password.length < 6) {
            showFieldError(document.getElementById('password'), 'Le mot de passe doit contenir au moins 6 caractères');
            isValid = false;
        }

        if (password !== confirmPassword) {
            showFieldError(document.getElementById('confirmPassword'), 'Les mots de passe ne correspondent pas');
            isValid = false;
        }
    }

    // Validation du paiement
    if (currentStep === 4) {
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
        if (!paymentMethod) {
            showNotification('Veuillez sélectionner un moyen de paiement', 'error');
            isValid = false;
        }

        // Vérifier le numéro de téléphone pour mobile money
        if (paymentMethod && ['mtn', 'moov', 'orange'].includes(paymentMethod.value)) {
            const paymentPhone = document.getElementById('paymentPhone').value;
            if (!paymentPhone.trim()) {
                showFieldError(document.getElementById('paymentPhone'), 'Numéro de téléphone requis');
                isValid = false;
            }
        }
    }
    
    return isValid;
}

function saveCurrentStepData() {
    const currentStepForm = document.querySelector(`#step${currentStep}Form`);
    if (!currentStepForm) return;
    
    const formData = new FormData(currentStepForm);
    for (let [key, value] of formData.entries()) {
        registrationData[key] = value;
    }
}

function resetRegistrationForm() {
    currentStep = 1;
    registrationData = {};
    showStep(1);
    
    // Reset tous les formulaires
    document.querySelectorAll('.registration-step form').forEach(form => {
        form.reset();
    });
    
    // Reset les erreurs
    document.querySelectorAll('.form-error').forEach(error => {
        error.remove();
    });
    
    document.querySelectorAll('.form-input.error').forEach(input => {
        input.classList.remove('error');
    });
}

// ===== FORMULAIRES =====
function setupForms() {
    // Formulaire de connexion
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Formulaire d'inscription étape 3
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

        // Vérifier si la réponse est du JSON valide
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Réponse serveur invalide. Vérifiez la configuration API.');
        }

        const data = await response.json();

        if (response.ok) {
            showNotification('Connexion réussie ! Redirection...', 'success');
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Fermer le modal
            closeModal('loginModal');

            setTimeout(() => {
                // Vérifier si l'utilisateur est admin pour rediriger vers la bonne interface
                if (data.user.is_admin || data.user.isAdmin) {
                    window.location.href = '/admin-modern.html';
                } else {
                    window.location.href = '/dashboard.html';
                }
            }, 1500);
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

// Gestion des moyens de paiement
function setupPaymentMethodHandlers() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const phoneSection = document.getElementById('paymentPhoneSection');

    paymentMethods.forEach(method => {
        method.addEventListener('change', () => {
            if (['mtn', 'moov', 'orange'].includes(method.value)) {
                phoneSection.style.display = 'block';
                document.getElementById('paymentPhone').required = true;
            } else {
                phoneSection.style.display = 'none';
                document.getElementById('paymentPhone').required = false;
            }
        });
    });
}

// Traitement du paiement et inscription
async function processPaymentAndRegister() {
    if (!validateCurrentStep()) return;

    saveCurrentStepData();

    // Récupérer les données de paiement
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    const paymentPhone = document.getElementById('paymentPhone').value;

    // Préparer les données complètes
    const completeData = {
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        email: registrationData.email,
        phone: registrationData.phone,
        country: registrationData.country,
        countryCode: getCountryCode(registrationData.country),
        postalCode: registrationData.postalCode,
        password: registrationData.password,
        paymentMethod: paymentMethod,
        paymentPhone: paymentPhone,
        registrationFee: 2000
    };

    const submitButton = event.target;
    setButtonLoading(submitButton, true);

    try {
        // 1. Simuler le traitement du paiement
        showNotification('Traitement du paiement en cours...', 'info');
        await new Promise(resolve => setTimeout(resolve, 2000)); // Simulation

        // 2. Créer le compte utilisateur
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(completeData)
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Paiement confirmé ! Création du compte...', 'success');

            // 3. Notifier l'admin de la nouvelle inscription
            await notifyAdminNewRegistration(data.user);

            // 4. Afficher la page de succès
            showStep('Final');
        } else {
            showNotification(data.error || 'Erreur lors de la création du compte', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion', 'error');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

// Notifier l'admin d'une nouvelle inscription
async function notifyAdminNewRegistration(user) {
    try {
        await fetch(`${API_BASE_URL}/admin/notifications/new-registration`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: user.id,
                userEmail: user.email,
                userName: `${user.firstName} ${user.lastName}`,
                registrationDate: new Date().toISOString(),
                paymentConfirmed: true
            })
        });
        console.log('Notification admin envoyée');
    } catch (error) {
        console.error('Erreur notification admin:', error);
    }
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
        postalCode: registrationData.postalCode,
        profession: registrationData.profession,
        password: registrationData.password
    };
    
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

        // Vérifier si la réponse est du JSON valide
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Réponse serveur invalide. Vérifiez la configuration API.');
        }

        const data = await response.json();
        
        if (response.ok) {
            showRegistrationSuccess();
            showStep('Final');
        } else {
            // Afficher les erreurs de validation détaillées
            if (data.details && Array.isArray(data.details)) {
                const errorMessages = data.details.map(detail => detail.msg).join(', ');
                showNotification(`Erreur de validation: ${errorMessages}`, 'error');
            } else {
                showNotification(data.error || 'Erreur lors de la création du compte', 'error');
            }
        }
    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur de connexion', 'error');
    } finally {
        setButtonLoading(submitButton, false);
    }
}

function showRegistrationSuccess() {
    // Créer une notification de succès personnalisée
    const successModal = document.createElement('div');
    successModal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;

    successModal.innerHTML = `
        <div style="
            background: white;
            padding: 2rem;
            border-radius: 1rem;
            text-align: center;
            max-width: 400px;
            margin: 1rem;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        ">
            <div style="
                width: 60px;
                height: 60px;
                background: #10b981;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 1rem;
            ">
                <i class="fas fa-check" style="color: white; font-size: 1.5rem;"></i>
            </div>
            <h3 style="color: #065f46; margin-bottom: 1rem; font-size: 1.5rem;">
                Compte créé avec succès !
            </h3>
            <p style="color: #6b7280; margin-bottom: 1.5rem; line-height: 1.6;">
                Votre compte a été créé et est en attente d'approbation par un administrateur.
                Vous recevrez une notification par email une fois approuvé.
            </p>
            <button onclick="this.parentElement.parentElement.remove(); showLoginForm();" style="
                background: #3b82f6;
                color: white;
                border: none;
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                transition: background 0.3s;
            " onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">
                <i class="fas fa-sign-in-alt"></i> Se connecter
            </button>
        </div>
    `;

    document.body.appendChild(successModal);
}

function showLoginForm() {
    // Fermer le modal d'inscription et afficher le formulaire de connexion
    const registrationModal = document.getElementById('registrationModal');
    const loginModal = document.getElementById('loginModal');

    if (registrationModal) {
        registrationModal.style.display = 'none';
    }

    if (loginModal) {
        loginModal.style.display = 'flex';
    }
}

// ===== UTILITAIRES =====
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function getCountryCode(country) {
    const countryCodes = {
        'CI': 'CI',
        'SN': 'SN',
        'ML': 'ML',
        'BF': 'BF',
        'FR': 'FR'
    };
    return countryCodes[country] || 'FR';
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
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// ===== ANIMATIONS AU SCROLL =====
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);

    // Observer les cartes de fonctionnalités
    document.querySelectorAll('.feature-card, .step-card, .testimonial-card').forEach(card => {
        observer.observe(card);
    });
}

// ===== TÉMOIGNAGES =====
const testimonials = [
    {
        name: "Aminata Diallo",
        role: "Étudiante en Informatique",
        company: "UAC Cotonou",
        image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?auto=format&fit=crop&q=80&w=200&h=200",
        rating: 5,
        testimonial: "Grâce à GeoPoll, j'ai pu générer un revenu complémentaire significatif. La plateforme est intuitive et les paiements sont rapides."
    },
    {
        name: "Kouame Yves",
        role: "Entrepreneur",
        company: "Abidjan",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200",
        rating: 5,
        testimonial: "La subvention de démarrage m'a vraiment aidé à commencer mon entreprise. Maintenant je gagne régulièrement avec les sondages."
    },
    {
        name: "Fatou Ndiaye",
        role: "Consultante Marketing",
        company: "Bamako",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200&h=200",
        rating: 5,
        testimonial: "Interface moderne et facile à utiliser. Je recommande GeoPoll à tous ceux qui veulent gagner de l'argent en ligne."
    },
    {
        name: "Marie Kouassi",
        role: "Étudiante en Gestion",
        company: "Université de Cocody",
        image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200",
        rating: 5,
        testimonial: "J'ai trouvé un stage parfait chez Orange Bénin grâce aux connexions que j'ai faites sur GeoPoll. Le processus était simple et efficace."
    },
    {
        name: "Ibrahim Traoré",
        role: "Enseignant",
        company: "Ouagadougou",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200",
        rating: 5,
        testimonial: "En tant qu'enseignant, GeoPoll me permet d'arrondir mes fins de mois. Les sondages sont pertinents et bien rémunérés."
    },
    {
        name: "Dr. Aisha Camara",
        role: "Médecin",
        company: "Conakry",
        image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200&h=200",
        rating: 5,
        testimonial: "La flexibilité de GeoPoll me permet de participer aux sondages entre mes consultations. Parfait pour les professionnels de santé."
    }
];

const starSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
</svg>
`;

function createTestimonialCard(testimonial) {
    const card = document.createElement('div');
    card.className = 'testimonial-card';

    const img = document.createElement('img');
    img.src = testimonial.image;
    img.alt = testimonial.name;
    img.className = 'testimonial-image';

    const name = document.createElement('h3');
    name.className = 'testimonial-name';
    name.textContent = testimonial.name;

    const role = document.createElement('p');
    role.className = 'testimonial-role';
    role.textContent = `${testimonial.role} @${testimonial.company}`;

    const text = document.createElement('p');
    text.className = 'testimonial-text';
    text.textContent = `${testimonial.testimonial}`;

    const rating = document.createElement('div');
    rating.className = 'rating';

    for (let i = 0; i < 5; i++) {
        const star = document.createElement('div');
        star.className = `star ${i < testimonial.rating ? 'filled' : 'empty'}`;
        star.innerHTML = starSVG;
        rating.appendChild(star);
    }

    card.append(img, name, role, text, rating);
    return card;
}

function initTestimonials() {
    const container = document.getElementById('testimonialsGrid');
    if (!container) return;

    // Dupliquer les témoignages 3 fois pour créer un effet de défilement infini horizontal
    const allTestimonials = [...testimonials, ...testimonials, ...testimonials];

    allTestimonials.forEach(testimonial => {
        container.appendChild(createTestimonialCard(testimonial));
    });
}

// Initialiser les témoignages quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initTestimonials, 100);
});
