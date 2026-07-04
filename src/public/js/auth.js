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
            showToast('Inicio de sesión exitoso', 'success');
            
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
        showToast(error.message || 'Error al iniciar sesión', 'error');
        return false;
    }
}

// =================================
// Register
// =================================

async function register(name, email, password) {
    try {
        // Validar datos
        if (!name || !email || !password) {
            showToast('Todos los campos son requeridos', 'error');
            return false;
        }

        if (!isValidEmail(email)) {
            showToast('Email inválido', 'error');
            return false;
        }

        if (password.length < 6) {
            showToast('La contraseña debe tener al menos 6 caracteres', 'error');
            return false;
        }

        const response = await authAPI.register(name, email, password);
        
        if (response.success) {
            showToast('Registro exitoso. Por favor inicia sesión', 'success');
            return true;
        }
        return false;
    } catch (error) {
        showToast(error.message || 'Error al registrar usuario', 'error');
        return false;
    }
}

// =================================
// Logout
// =================================

async function logout() {
    try {
        await authAPI.logout();
        currentUser = null;
        updateUIForUnauthenticatedUser();
        showToast('Sesión cerrada exitosamente', 'success');
        window.location.hash = '#/login';
    } catch (error) {
        showToast('Error al cerrar sesión', 'error');
    }
}

// =================================
// Get Current User
// =================================

function getCurrentUser() {
    return currentUser;
}

function isAuthenticated() {
    return currentUser !== null;
}

function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

function isStudent() {
    return currentUser && currentUser.role === 'student';
}

// =================================
// Update UI based on auth state
// =================================

function updateUIForAuthenticatedUser() {
    const navbar = document.getElementById('navbar');
    const userName = document.getElementById('user-name');
    const adminLink = document.getElementById('admin-link');
    const adminLinkMobile = document.getElementById('admin-link-mobile');
    
    // Mostrar navbar
    if (navbar) {
        navbar.classList.remove('hidden');
    }
    
    // Actualizar nombre de usuario
    if (userName && currentUser) {
        userName.textContent = currentUser.name;
    }
    
    // Mostrar link de admin si es administrador
    if (currentUser && currentUser.role === 'admin') {
        if (adminLink) adminLink.style.display = 'block';
        if (adminLinkMobile) adminLinkMobile.style.display = 'block';
    } else {
        if (adminLink) adminLink.style.display = 'none';
        if (adminLinkMobile) adminLinkMobile.style.display = 'none';
    }
    
    // Agregar event listeners para logout
    setupLogoutListeners();
}

function updateUIForUnauthenticatedUser() {
    const navbar = document.getElementById('navbar');
    
    // Ocultar navbar
    if (navbar) {
        navbar.classList.add('hidden');
    }
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
        showToast('No tienes permisos para acceder a esta sección', 'error');
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
window.isAuthenticated = isAuthenticated;
window.isAdmin = isAdmin;
window.isStudent = isStudent;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;