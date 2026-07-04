/**
 * Router - Sistema de rutas para SPA
 */

// =================================
// Routes Configuration
// =================================

const routes = {
    '/': {
        title: 'Cursos Disponibles',
        render: (params) => window.renderHome(params),
        requireAuth: false
    },
    '/login': {
        title: 'Iniciar Sesión',
        render: (params) => window.renderLogin(params),
        requireAuth: false
    },
    '/register': {
        title: 'Registrarse',
        render: (params) => window.renderRegister(params),
        requireAuth: false
    },
    '/my-courses': {
        title: 'Mis Cursos',
        render: (params) => window.renderMyCourses(params),
        requireAuth: true
    },
    '/course/:id': {
        title: 'Detalle del Curso',
        render: (params) => window.renderCourseDetail(params),
        requireAuth: false
    },
    '/admin': {
        title: 'Panel Administrativo',
        render: (params) => window.renderAdminDashboard(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/courses': {
        title: 'Administrar Cursos',
        render: (params) => window.renderAdminCourses(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/courses/create': {
        title: 'Crear Curso',
        render: (params) => window.renderAdminCreateCourse(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/courses/:id/edit': {
        title: 'Editar Curso',
        render: (params) => window.renderAdminEditCourse(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/users': {
        title: 'Administrar Usuarios',
        render: (params) => window.renderAdminUsers(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/profile': {
        title: 'Mi Perfil',
        render: (params) => window.renderProfile(params),
        requireAuth: true
    }
};

// =================================
// Router Functions
// =================================

function getRoute() {
    const hash = window.location.hash.slice(1) || '/';
    return hash;
}

function parseRoute(route) {
    for (const pattern in routes) {
        const regex = new RegExp('^' + pattern.replace(/:\w+/g, '([^/]+)') + '$');
        const match = route.match(regex);
        
        if (match) {
            const params = {};
            const paramNames = pattern.match(/:\w+/g);
            
            if (paramNames) {
                paramNames.forEach((name, index) => {
                    params[name.slice(1)] = match[index + 1];
                });
            }
            
            return { route: routes[pattern], params };
        }
    }
    
    return null;
}

async function handleRoute() {
    const currentRoute = getRoute();
    const routeData = parseRoute(currentRoute);
    
    if (!routeData) {
        render404();
        return;
    }
    
    const { route, params } = routeData;
    
    // Check authentication requirements
    if (route.requireAuth && !isAuthenticated()) {
        window.location.hash = '#/login';
        return;
    }
    
    if (route.requireAdmin && !isAdmin()) {
        showToast('No tienes permisos para acceder a esta sección', 'error');
        window.location.hash = '#/';
        return;
    }
    
    // Update page title
    document.title = `${route.title} - LMS CeNAT`;
    
    // Render the route
    try {
        await route.render(params);
    } catch (error) {
        console.error('Error rendering route:', error);
        showToast('Error al cargar la página', 'error');
    }
}

function render404() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4">
            <div class="text-center max-w-lg fade-in">
                <!-- Número 404 grande -->
                <div class="relative mb-6">
                    <h1 class="text-9xl font-extrabold text-gray-200 dark:text-slate-700 select-none">404</h1>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <i class="fas fa-graduation-cap text-5xl text-cenat-blue"></i>
                    </div>
                </div>

                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    ¡Oops! Página no encontrada
                </h2>
                <p class="text-gray-500 dark:text-slate-400 mb-8">
                    La página que buscas no existe o fue movida. No te preocupes, puedes volver al inicio.
                </p>

                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <a href="#/" class="btn-cenat">
                        <i class="fas fa-home mr-2"></i> Volver al inicio
                    </a>
                    <button onclick="history.back()"
                        class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                        <i class="fas fa-arrow-left mr-2"></i> Página anterior
                    </button>
                </div>
            </div>
        </div>
    `;
}

// =================================
// Navigation Helper
// =================================

function navigateTo(path) {
    window.location.hash = `#${path}`;
}

// =================================
// Initialize Router
// =================================

function initRouter() {
    // Handle initial route
    handleRoute();
    
    // Listen for hash changes
    window.addEventListener('hashchange', handleRoute);
}

// =================================
// Export functions
// =================================

window.navigateTo = navigateTo;
window.initRouter = initRouter;