/**
 * Main App - Punto de entrada de la aplicación
 */

// =================================
// Initialize Application
// =================================

async function initApp() {
    try {
        // 1. Verificar autenticación (y en paralelo, cargar la configuración
        // editable del sitio — fondo del login/catálogo, texto del catálogo
        // — son independientes entre sí, no hace falta esperarlas en serie).
        await Promise.all([initAuth(), loadSiteSettings()]);

        // 2. Decidir la ruta final ANTES de inicializar el router (que
        // renderiza inmediatamente el hash actual y recién después empieza
        // a escuchar 'hashchange'). Si se corrigiera el hash DESPUÉS de
        // initRouter(), la app renderizaba dos veces: primero la ruta vieja
        // (ej. el catálogo, con su propio fetch), y al toque la corregida —
        // visible como un flash de la página equivocada para un admin.
        //
        // Si es una carga inicial de la app (sin hash, ej. se acaba de abrir
        // la URL) y no hay sesión, la primera vista es el login en vez del
        // catálogo. Solo aplica al hash vacío, NO a "#/" explícito — así un
        // invitado que ya entró al catálogo (ej. con "Acceder como
        // invitado") no vuelve a login si recarga la página ahí.
        const initialRoute = window.location.hash.slice(1);
        if (!isAuthenticated() && initialRoute === '') {
            window.location.hash = '#/login';
        } else if (isAuthenticated() && (initialRoute === '/login' || initialRoute === '/register' || initialRoute === '')) {
            // Si el usuario está autenticado y está en login/register (o
            // recién abrió la app), redirigir al inicio (o al panel admin).
            // Para el caso contrario — invitado intentando entrar a una
            // ruta protegida — el router ya se encarga solo (ver
            // requireAuth en handleRoute()), no hace falta duplicar esa
            // lista de rutas públicas acá.
            window.location.hash = isAdmin() ? '#/admin' : '#/';
        }

        // 3. Inicializar router — ya con el hash final, renderiza una
        // sola vez la ruta correcta.
        initRouter();

    } catch (error) {
        console.error('Error initializing app:', error);
        showToast(t('errors.app_init_failed'), 'error');
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
