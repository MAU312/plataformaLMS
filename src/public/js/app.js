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
        // al inicio (o al panel admin). Para el caso contrario — invitado
        // intentando entrar a una ruta protegida — el router ya se encarga
        // solo (ver requireAuth en handleRoute()), no hace falta duplicar
        // esa lista de rutas públicas acá.
        if (isAuthenticated()) {
            const currentRoute = window.location.hash.slice(1);
            if (currentRoute === '/login' || currentRoute === '/register' || currentRoute === '') {
                if (isAdmin()) {
                    window.location.hash = '#/admin';
                } else {
                    window.location.hash = '#/';
                }
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
