/**
 * i18n (es/en) — diccionarios + t()/setLocale(), sin bundler: script
 * clásico igual que el resto de la app, todo expuesto en window.
 *
 * Cobertura actual: navbar/footer (data-i18n en index.html), utils.js
 * (helpers compartidos), catálogo público (views_home.js) y las 4 páginas
 * de auth (views_auth.js) — el resto de las vistas todavía tiene español
 * fijo y se va migrando vista por vista en sesiones futuras, reusando este
 * mismo mecanismo. Portugués no está traducido todavía, pero agregar un
 * tercer diccionario acá es lo único que haría falta.
 */

const SUPPORTED_LOCALES = ['es', 'en'];
const DEFAULT_LOCALE = 'es';

const TRANSLATIONS = {
    es: {
        common: {
            loading: 'Cargando...',
            confirm: 'Confirmar',
            cancel: 'Cancelar',
            copied: 'Copiado al portapapeles',
            showing_range: 'Mostrando {{start}}–{{end}} de {{total}}',
            show_password: 'Mostrar contraseña',
            hide_password: 'Ocultar contraseña'
        },
        nav: {
            home: 'Inicio',
            my_courses: 'Mis Cursos',
            admin: 'Administración',
            teacher_courses: 'Mis Cursos (Profesor)',
            login: 'Iniciar sesión',
            register: 'Regístrate',
            profile: 'Mi Perfil',
            logout: 'Cerrar Sesión',
            font_size: 'Tamaño de letra',
            decrease_font: 'Reducir tamaño de letra',
            increase_font: 'Aumentar tamaño de letra',
            toggle_dark_mode: 'Cambiar modo oscuro/claro',
            switch_to_light: 'Cambiar a modo claro',
            switch_to_dark: 'Cambiar a modo oscuro',
            language: 'Idioma'
        },
        footer: {
            copyright: '© 2026 LANBA - Centro Nacional de Alta Tecnología (CeNAT)',
            developed_by: 'Desarrollado por Mauricio Hidalgo Garzón - TCU UFIDE'
        },
        errors: {
            generic: 'Error en la petición',
            session_expired: 'Sesión expirada',
            session_expired_toast: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
            passwords_dont_match: 'Las contraseñas no coinciden',
            login_failed: 'Error al iniciar sesión',
            register_failed: 'Error al registrar usuario',
            logout_failed: 'Error al cerrar sesión',
            forgot_password_failed: 'Error al procesar la solicitud',
            reset_password_failed: 'El enlace es inválido o ya expiró',
            load_courses_failed: 'Error al cargar los cursos',
            no_permission: 'No tienes permisos para acceder a esta sección',
            file_too_large: '{{label}} supera el máximo permitido ({{size}})',
            copy_failed: 'Error al copiar',
            app_init_failed: 'Error al inicializar la aplicación',
            password_too_short: 'La contraseña debe tener al menos 6 caracteres'
        },
        auth: {
            login: {
                title: 'Bienvenido a LMS LANBA - CeNAT',
                subtitle: 'Inicia sesión para acceder a tus cursos',
                identifier_label: 'Correo o nombre de usuario',
                identifier_placeholder: 'tu@email.com o tu usuario',
                password_label: 'Contraseña',
                forgot_password: '¿Olvidaste tu contraseña?',
                submit: 'Iniciar Sesión',
                submitting: 'Ingresando...',
                success: 'Inicio de sesión exitoso',
                no_account: '¿No tienes una cuenta?',
                register_link: 'Regístrate aquí',
                or_separator: 'o',
                guest_button: 'Acceder como invitado',
                guest_hint: 'Como invitado solo podés explorar el catálogo de cursos'
            },
            register: {
                title: 'Crear Cuenta',
                subtitle: 'Únete a la comunidad educativa de LANBA - CeNAT',
                name_label: 'Nombre Completo',
                name_placeholder: 'Juan Pérez',
                email_label: 'Correo Electrónico',
                email_placeholder: 'tu@email.com',
                username_label: 'Nombre de usuario (opcional)',
                username_placeholder: 'Para iniciar sesión sin tu correo',
                password_label: 'Contraseña',
                password_hint: 'Mínimo 6 caracteres',
                password_confirm_label: 'Confirmar contraseña',
                submit: 'Registrarse',
                submitting: 'Registrando...',
                has_account: '¿Ya tienes una cuenta?',
                login_link: 'Inicia sesión aquí',
                fields_required: 'Todos los campos son requeridos',
                invalid_email: 'Email inválido'
            },
            forgotPassword: {
                title: 'Recuperar contraseña',
                subtitle: 'Escribe tu correo y te enviaremos un enlace para restablecerla',
                email_label: 'Correo Electrónico',
                email_placeholder: 'tu@email.com',
                submit: 'Enviar enlace de recuperación',
                submitting: 'Enviando...',
                back_to_login: 'Volver a iniciar sesión'
            },
            resetPassword: {
                title: 'Nueva contraseña',
                subtitle: 'Elige una nueva contraseña para tu cuenta',
                password_label: 'Nueva contraseña',
                password_hint: 'Mínimo 6 caracteres',
                password_confirm_label: 'Confirmar contraseña',
                submit: 'Restablecer contraseña',
                submitting: 'Guardando...'
            }
        },
        home: {
            title_default: 'Cursos del LANBA - CeNAT',
            subtitle_default: 'Explora nuestros cursos educativos y fortalece tus conocimientos en biotecnología ambiental y ciencia abierta.',
            available_courses: 'Cursos disponibles',
            search_placeholder: 'Buscar curso...',
            retry: 'Reintentar',
            no_description: 'Sin descripción disponible',
            contents_count: '{{count}} contenidos',
            enrolled_count: '{{count}} inscritos',
            empty_search_title: 'No se encontraron cursos',
            empty_search_subtitle: 'Intenta con otro término de búsqueda',
            empty_title: 'No hay cursos disponibles aún',
            empty_subtitle: 'Vuelve pronto para ver nuevos contenidos'
        }
    },
    en: {
        common: {
            loading: 'Loading...',
            confirm: 'Confirm',
            cancel: 'Cancel',
            copied: 'Copied to clipboard',
            showing_range: 'Showing {{start}}–{{end}} of {{total}}',
            show_password: 'Show password',
            hide_password: 'Hide password'
        },
        nav: {
            home: 'Home',
            my_courses: 'My Courses',
            admin: 'Administration',
            teacher_courses: 'My Courses (Teacher)',
            login: 'Log in',
            register: 'Sign up',
            profile: 'My Profile',
            logout: 'Log Out',
            font_size: 'Text size',
            decrease_font: 'Decrease text size',
            increase_font: 'Increase text size',
            toggle_dark_mode: 'Toggle dark/light mode',
            switch_to_light: 'Switch to light mode',
            switch_to_dark: 'Switch to dark mode',
            language: 'Language'
        },
        footer: {
            copyright: '© 2026 LANBA - Centro Nacional de Alta Tecnología (CeNAT)',
            developed_by: 'Developed by Mauricio Hidalgo Garzón - TCU UFIDE'
        },
        errors: {
            generic: 'Request error',
            session_expired: 'Session expired',
            session_expired_toast: 'Your session has expired. Please log in again.',
            passwords_dont_match: 'Passwords do not match',
            login_failed: 'Error logging in',
            register_failed: 'Error registering user',
            logout_failed: 'Error logging out',
            forgot_password_failed: 'Error processing the request',
            reset_password_failed: 'The link is invalid or has expired',
            load_courses_failed: 'Error loading courses',
            no_permission: 'You do not have permission to access this section',
            file_too_large: '{{label}} exceeds the maximum allowed size ({{size}})',
            copy_failed: 'Error copying',
            app_init_failed: 'Error initializing the application',
            password_too_short: 'Password must be at least 6 characters'
        },
        auth: {
            login: {
                title: 'Welcome to LMS LANBA - CeNAT',
                subtitle: 'Log in to access your courses',
                identifier_label: 'Email or username',
                identifier_placeholder: 'you@email.com or your username',
                password_label: 'Password',
                forgot_password: 'Forgot your password?',
                submit: 'Log In',
                submitting: 'Logging in...',
                success: 'Login successful',
                no_account: "Don't have an account?",
                register_link: 'Sign up here',
                or_separator: 'or',
                guest_button: 'Continue as guest',
                guest_hint: 'As a guest you can only browse the course catalog'
            },
            register: {
                title: 'Create Account',
                subtitle: 'Join the LANBA - CeNAT learning community',
                name_label: 'Full Name',
                name_placeholder: 'John Smith',
                email_label: 'Email',
                email_placeholder: 'you@email.com',
                username_label: 'Username (optional)',
                username_placeholder: 'To log in without your email',
                password_label: 'Password',
                password_hint: 'At least 6 characters',
                password_confirm_label: 'Confirm password',
                submit: 'Sign Up',
                submitting: 'Signing up...',
                has_account: 'Already have an account?',
                login_link: 'Log in here',
                fields_required: 'All fields are required',
                invalid_email: 'Invalid email'
            },
            forgotPassword: {
                title: 'Recover password',
                subtitle: "Enter your email and we'll send you a link to reset it",
                email_label: 'Email',
                email_placeholder: 'you@email.com',
                submit: 'Send recovery link',
                submitting: 'Sending...',
                back_to_login: 'Back to login'
            },
            resetPassword: {
                title: 'New password',
                subtitle: 'Choose a new password for your account',
                password_label: 'New password',
                password_hint: 'At least 6 characters',
                password_confirm_label: 'Confirm password',
                submit: 'Reset password',
                submitting: 'Saving...'
            }
        },
        home: {
            title_default: 'LANBA - CeNAT Courses',
            subtitle_default: 'Explore our educational courses and strengthen your knowledge in environmental biotechnology and open science.',
            available_courses: 'Available courses',
            search_placeholder: 'Search course...',
            retry: 'Retry',
            no_description: 'No description available',
            contents_count: '{{count}} contents',
            enrolled_count: '{{count}} enrolled',
            empty_search_title: 'No courses found',
            empty_search_subtitle: 'Try a different search term',
            empty_title: 'No courses available yet',
            empty_subtitle: 'Check back soon for new content'
        }
    }
};

function detectInitialLocale() {
    try {
        const saved = localStorage.getItem('locale');
        if (SUPPORTED_LOCALES.includes(saved)) return saved;
    } catch (error) { /* localStorage puede fallar (modo privado, etc.) */ }

    const browserLang = String(navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang;

    return DEFAULT_LOCALE;
}

let currentLocale = detectInitialLocale();

function getLocale() {
    return currentLocale;
}

function resolveKey(dict, key) {
    return key.split('.').reduce((obj, part) => (obj && typeof obj === 'object') ? obj[part] : undefined, dict);
}

/**
 * Nunca revienta ni devuelve "undefined" visible: si falta en el locale
 * actual cae al español, si falta en los dos devuelve la propia key (señal
 * clara, en desarrollo, de que falta agregarla al diccionario).
 */
function t(key, vars) {
    let value = resolveKey(TRANSLATIONS[currentLocale], key);
    if (value === undefined) value = resolveKey(TRANSLATIONS[DEFAULT_LOCALE], key);
    if (value === undefined) return key;

    if (vars) {
        Object.keys(vars).forEach((varKey) => {
            value = value.replace(new RegExp(`{{${varKey}}}`, 'g'), vars[varKey]);
        });
    }
    return value;
}

/**
 * Para el HTML estático (navbar/footer en index.html) que no pasa por un
 * template de JS — cada elemento marcado con data-i18n(-placeholder/-title/
 * -aria-label) se actualiza in-place, sin tocar su estructura ni perder
 * los listeners ya enganchados (auth.js hace toggles de display sobre
 * estos mismos elementos, por id).
 */
function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
}

/**
 * Recorre la ruta actual otra vez para que las vistas ya traducidas (las
 * que llaman a t() en su propio render) se vuelvan a pintar en el idioma
 * nuevo — no depende de cambiar el hash, handleRoute() ya soporta
 * llamarse de nuevo directamente (ver router.js).
 */
/**
 * Hay dos <select> de idioma (uno para desktop, uno para el menú mobile,
 * ver index.html) — deben quedar sincronizados entre sí sin importar cuál
 * disparó el cambio.
 */
function syncLanguageSelects() {
    document.querySelectorAll('#language-select, #language-select-mobile').forEach((el) => {
        el.value = currentLocale;
    });
}

function setLocale(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) return;

    currentLocale = locale;
    try { localStorage.setItem('locale', locale); } catch (error) { /* ok, queda solo para esta carga */ }
    document.documentElement.lang = locale;

    applyStaticTranslations();
    syncLanguageSelects();
    // El título del toggle de modo oscuro no es un data-i18n simple: su
    // texto depende del estado actual (claro/oscuro), lo arma
    // updateToggleUI en darkmode.js — hay que volver a llamarlo acá.
    if (typeof updateToggleUI === 'function') {
        updateToggleUI(document.documentElement.classList.contains('dark'));
    }
    if (typeof handleRoute === 'function') handleRoute();
}

// Aplicado ya en la carga de este script (no en DOMContentLoaded): para
// cuando este <script> se ejecuta, el <body> ya está parseado (va después
// de utils.js, cerca del final del documento), así que el navbar/footer y
// el select de idioma ya existen en el DOM.
document.documentElement.lang = currentLocale;
applyStaticTranslations();
syncLanguageSelects();

window.t = t;
window.getLocale = getLocale;
window.setLocale = setLocale;
window.applyStaticTranslations = applyStaticTranslations;
window.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
