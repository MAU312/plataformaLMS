/**
 * Auth Manager - Maneja la autenticación y sesiones del usuario
 */

let currentUser = null;

// =================================
// Initialize Auth
// =================================

async function initAuth() {
    try {
        const response = await authAPI.checkAuth();
        
        if (response.authenticated) {
            currentUser = response.user;
            updateUIForAuthenticatedUser();
            return true;
        } else {
            currentUser = null;
            updateUIForUnauthenticatedUser();
            return false;
        }
    } catch (error) {
        console.error('Error checking auth:', error);
        currentUser = null;
        updateUIForUnauthenticatedUser();
        return false;
    }
}

// =================================
// Login
// =================================

async function login(email, password) {
    try {
        const response = await authAPI.login(email, password);
        
        if (response.success) {
            currentUser = response.data.user;
            updateUIForAuthenticatedUser();
            showToast(t('auth.login.success'), 'success');
            
            // Redirigir según el rol
            if (currentUser.role === 'admin') {
                window.location.hash = '#/admin';
            } else {
                window.location.hash = '#/';
            }
            
            return true;
        }
        return false;
    } catch (error) {
        showToast(error.message || t('errors.login_failed'), 'error');
        return false;
    }
}

// =================================
// Register
// =================================

async function register(name, email, password, username) {
    try {
        // Validar datos
        if (!name || !email || !password) {
            showToast(t('auth.register.fields_required'), 'error');
            return false;
        }

        if (!isValidEmail(email)) {
            showToast(t('auth.register.invalid_email'), 'error');
            return false;
        }

        if (password.length < 6) {
            showToast(t('errors.password_too_short'), 'error');
            return false;
        }

        const response = await authAPI.register(name, email, password, username);

        if (response.success) {
            // Ya probó la contraseña al elegirla — lo logueamos de una vez
            // en lugar de mandarlo de vuelta al login a escribirla otra vez.
            return await login(email, password);
        }
        return false;
    } catch (error) {
        showToast(error.message || t('errors.register_failed'), 'error');
        return false;
    }
}

// =================================
// Logout
// =================================

async function logout() {
    try {
        const response = await authAPI.logout();
        currentUser = null;
        updateUIForUnauthenticatedUser();
        showToast(response.message, 'success');
        window.location.hash = '#/login';
    } catch (error) {
        showToast(error.message || t('errors.logout_failed'), 'error');
    }
}

// =================================
// Get Current User
// =================================

function getCurrentUser() {
    return currentUser;
}

/**
 * Actualiza en caché la foto de perfil del usuario logueado (o la quita
 * con null) después de subirla/borrarla, y refresca el navbar — sin esto,
 * el ícono de arriba se quedaba con el estado viejo hasta el próximo
 * login o recarga completa de la página.
 */
function updateCurrentUserAvatar(avatarUrl) {
    if (!currentUser) return;
    currentUser.avatar_url = avatarUrl;
    updateUIForAuthenticatedUser();
}

function isAuthenticated() {
    return currentUser !== null;
}

function isAdmin() {
    // También es "admin" un profesor con admin_access (doble rol
    // profesor+admin), no solo role === 'admin'.
    return currentUser && (currentUser.role === 'admin' || currentUser.admin_access);
}

function isStudent() {
    return currentUser && currentUser.role === 'student';
}

function isTeacher() {
    return currentUser && currentUser.role === 'teacher';
}

// =================================
// Update UI based on auth state
// =================================

function updateUIForAuthenticatedUser() {
    const navbar = document.getElementById('navbar');
    const userName = document.getElementById('user-name');
    const adminLink = document.getElementById('admin-link');
    const adminLinkMobile = document.getElementById('admin-link-mobile');
    const teacherLink = document.getElementById('teacher-link');
    const teacherLinkMobile = document.getElementById('teacher-link-mobile');
    const myCoursesLink = document.getElementById('my-courses-link');
    const myCoursesLinkMobile = document.getElementById('my-courses-link-mobile');
    const userMenuContainer = document.getElementById('user-menu-container');
    const userMenuContainerMobile = document.getElementById('user-menu-container-mobile');
    const guestActions = document.getElementById('guest-actions');
    const guestActionsMobile = document.getElementById('guest-actions-mobile');

    // Mostrar navbar (con sesión, siempre visible)
    if (navbar) {
        navbar.classList.remove('hidden');
    }

    // Con sesión: menú de usuario visible, acciones de invitado ocultas
    if (userMenuContainer) userMenuContainer.style.display = '';
    if (userMenuContainerMobile) userMenuContainerMobile.style.display = '';
    if (guestActions) guestActions.style.display = 'none';
    if (guestActionsMobile) guestActionsMobile.style.display = 'none';

    // Actualizar nombre de usuario
    if (userName && currentUser) {
        userName.textContent = currentUser.name;
    }

    // Foto de perfil en el navbar (o el ícono genérico si no tiene una)
    const userNavAvatar = document.getElementById('user-nav-avatar');
    if (userNavAvatar && currentUser) {
        userNavAvatar.innerHTML = currentUser.avatar_url
            ? `<img src="${escapeAttr(currentUser.avatar_url)}" alt="" class="w-6 h-6 rounded-full object-cover">`
            : '<i class="fas fa-user-circle text-2xl"></i>';
    }

    // Mostrar link de admin si es administrador (o profesor con doble rol)
    if (currentUser && (currentUser.role === 'admin' || currentUser.admin_access)) {
        if (adminLink) adminLink.style.display = 'block';
        if (adminLinkMobile) adminLinkMobile.style.display = 'block';
    } else {
        if (adminLink) adminLink.style.display = 'none';
        if (adminLinkMobile) adminLinkMobile.style.display = 'none';
    }

    // Mostrar link de "Mis Cursos (Profesor)" si es profesor — y en ese
    // caso ocultar "Mis Cursos" (esa es la vista de inscripciones como
    // estudiante, que a un profesor no le aplica).
    if (currentUser && currentUser.role === 'teacher') {
        if (teacherLink) teacherLink.style.display = 'block';
        if (teacherLinkMobile) teacherLinkMobile.style.display = 'block';
        if (myCoursesLink) myCoursesLink.style.display = 'none';
        if (myCoursesLinkMobile) myCoursesLinkMobile.style.display = 'none';
    } else {
        if (teacherLink) teacherLink.style.display = 'none';
        if (teacherLinkMobile) teacherLinkMobile.style.display = 'none';
        if (myCoursesLink) myCoursesLink.style.display = '';
        if (myCoursesLinkMobile) myCoursesLinkMobile.style.display = '';
    }

    // Agregar event listeners para logout
    setupLogoutListeners();
}

function updateUIForUnauthenticatedUser() {
    const navbar = document.getElementById('navbar');
    const myCoursesLink = document.getElementById('my-courses-link');
    const myCoursesLinkMobile = document.getElementById('my-courses-link-mobile');
    const adminLink = document.getElementById('admin-link');
    const adminLinkMobile = document.getElementById('admin-link-mobile');
    const teacherLink = document.getElementById('teacher-link');
    const teacherLinkMobile = document.getElementById('teacher-link-mobile');
    const userMenuContainer = document.getElementById('user-menu-container');
    const userMenuContainerMobile = document.getElementById('user-menu-container-mobile');
    const guestActions = document.getElementById('guest-actions');
    const guestActionsMobile = document.getElementById('guest-actions-mobile');

    // El navbar se mantiene visible para un invitado (antes se ocultaba
    // por completo, dejando la pantalla sin ninguna forma de navegar a
    // login/registro salvo escribiendo la URL a mano). Se ocultan solo
    // las secciones que requieren sesión, y se muestran los accesos de
    // invitado en su lugar.
    if (navbar) {
        navbar.classList.remove('hidden');
    }

    if (myCoursesLink) myCoursesLink.style.display = 'none';
    if (myCoursesLinkMobile) myCoursesLinkMobile.style.display = 'none';
    if (adminLink) adminLink.style.display = 'none';
    if (adminLinkMobile) adminLinkMobile.style.display = 'none';
    if (teacherLink) teacherLink.style.display = 'none';
    if (teacherLinkMobile) teacherLinkMobile.style.display = 'none';
    if (userMenuContainer) userMenuContainer.style.display = 'none';
    if (userMenuContainerMobile) userMenuContainerMobile.style.display = 'none';
    if (guestActions) guestActions.style.display = 'flex';
    if (guestActionsMobile) guestActionsMobile.style.display = 'block';
}

function setupLogoutListeners() {
    const logoutBtn = document.getElementById('logout-btn');
    const logoutBtnMobile = document.getElementById('logout-btn-mobile');
    
    if (logoutBtn) {
        logoutBtn.onclick = logout;
    }
    
    if (logoutBtnMobile) {
        logoutBtnMobile.onclick = logout;
    }
}

// =================================
// Route Guards
// =================================

function requireAuth() {
    if (!isAuthenticated()) {
        window.location.hash = '#/login';
        return false;
    }
    return true;
}

function requireAdmin() {
    if (!isAuthenticated()) {
        window.location.hash = '#/login';
        return false;
    }
    
    if (!isAdmin()) {
        showToast(t('errors.no_permission'), 'error');
        window.location.hash = '#/';
        return false;
    }
    
    return true;
}

// =================================
// Export functions
// =================================

window.initAuth = initAuth;
window.login = login;
window.register = register;
window.logout = logout;
window.getCurrentUser = getCurrentUser;
window.updateCurrentUserAvatar = updateCurrentUserAvatar;
window.isAuthenticated = isAuthenticated;
window.isAdmin = isAdmin;
window.isStudent = isStudent;
window.isTeacher = isTeacher;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;