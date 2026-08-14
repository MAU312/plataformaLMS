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

        // 2. Si es una carga inicial de la app (sin hash, ej. se acaba de
        // abrir la URL) y no hay sesión, la primera vista es el login en
        // vez del catálogo. Solo aplica al hash vacío, NO a "#/" explícito
        // — así un invitado que ya entró al catálogo (ej. con "Acceder como
        // invitado") no vuelve a login si recarga la página ahí.
        if (!isAuthenticated() && window.location.hash.slice(1) === '') {
            window.location.hash = '#/login';
        }

        // 3. Inicializar router
        initRouter();

        // 4. Si el usuario está autenticado y está en login/register, redirigir
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
