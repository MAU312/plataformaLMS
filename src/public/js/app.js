/**
 * Main App - Punto de entrada de la aplicación
 */

// =================================
// Initialize Application
// =================================

async function initApp() {
    try {
        // 1. Verificar autenticación
        await initAuth();
        
        // 2. Inicializar router
        initRouter();
        
        // 3. Si el usuario está autenticado y está en login/register, redirigir
        if (isAuthenticated()) {
            const currentRoute = window.location.hash.slice(1);
            if (currentRoute === '/login' || currentRoute === '/register' || currentRoute === '') {
                if (isAdmin()) {
                    window.location.hash = '#/admin';
                } else {
                    window.location.hash = '#/';
                }
            }
        } else {
            // Si no está autenticado y no está en login/register, redirigir a login
            const currentRoute = window.location.hash.slice(1);
            const publicRoutes = ['/login', '/register', '/forgot-password', '/'];

            if (!publicRoutes.includes(currentRoute) && !currentRoute.startsWith('/course/') && !currentRoute.startsWith('/reset-password/')) {
                window.location.hash = '#/login';
            }
        }
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error al inicializar la aplicación', 'error');
    }
}

// =================================
// Wait for DOM to be ready
// =================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// =================================
// Global Error Handler
// =================================

window.addEventListener('error', function(event) {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});
