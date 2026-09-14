/**
 * Router - Sistema de rutas para SPA
 */

// =================================
// Routes Configuration
// =================================

// `titleKey` (no el texto ya traducido) — se resuelve con t() recién en
// handleRoute(), en cada navegación, no una sola vez acá al cargar el
// script. Si no, cambiar de idioma sin recargar (setLocale() solo vuelve a
// llamar a handleRoute()) dejaba el título de pestaña congelado en el
// idioma que tenía la página al cargar.
const routes = {
    '/': {
        titleKey: 'routes.home',
        render: (params) => window.renderHome(params),
        requireAuth: false
    },
    '/login': {
        titleKey: 'routes.login',
        render: (params) => window.renderLogin(params),
        requireAuth: false
    },
    '/register': {
        titleKey: 'routes.register',
        render: (params) => window.renderRegister(params),
        requireAuth: false
    },
    '/forgot-password': {
        titleKey: 'routes.forgot_password',
        render: (params) => window.renderForgotPassword(params),
        requireAuth: false
    },
    '/reset-password/:token': {
        titleKey: 'routes.reset_password',
        render: (params) => window.renderResetPassword(params),
        requireAuth: false
    },
    '/my-courses': {
        titleKey: 'routes.my_courses',
        render: (params) => window.renderMyCourses(params),
        requireAuth: true
    },
    '/course/:id': {
        titleKey: 'routes.course_detail',
        render: (params) => window.renderCourseDetail(params),
        // Un invitado solo puede explorar el catálogo (/) — para ver el
        // detalle de un curso se le pide iniciar sesión o registrarse.
        requireAuth: true
    },
    '/admin': {
        titleKey: 'routes.admin_dashboard',
        render: (params) => window.renderAdminDashboard(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/courses': {
        titleKey: 'routes.admin_courses',
        render: (params) => window.renderAdminCourses(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/courses/create': {
        titleKey: 'routes.admin_create_course',
        render: (params) => window.renderAdminCreateCourse(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/courses/:id/edit': {
        titleKey: 'routes.admin_edit_course',
        render: (params) => window.renderAdminEditCourse(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/courses/:id/students': {
        titleKey: 'routes.admin_course_students',
        render: (params) => window.renderAdminCourseStudents(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/users': {
        titleKey: 'routes.admin_users',
        render: (params) => window.renderAdminUsers(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/admin/settings': {
        titleKey: 'routes.admin_settings',
        render: (params) => window.renderAdminSettings(params),
        requireAuth: true,
        requireAdmin: true
    },
    '/profile': {
        titleKey: 'routes.profile',
        render: (params) => window.renderProfile(params),
        requireAuth: true
    },
    '/teacher/courses': {
        titleKey: 'routes.teacher_courses',
        render: (params) => window.renderTeacherCourses(params),
        requireAuth: true
    },
    '/teacher/courses/:id/edit': {
        titleKey: 'routes.teacher_course_edit',
        render: (params) => window.renderTeacherCourse(params),
        requireAuth: true
    },
    '/teacher/courses/:id/students': {
        titleKey: 'routes.admin_course_students',
        render: (params) => window.renderTeacherCourseStudents(params),
        requireAuth: true
    },
    '/contents/:id/submissions': {
        titleKey: 'routes.task_submissions',
        render: (params) => window.renderTaskSubmissions(params),
        requireAuth: true
    },
    '/contents/:id/take': {
        titleKey: 'routes.quiz_take',
        render: (params) => window.renderTakeQuiz(params),
        requireAuth: true
    },
    '/contents/:id/results': {
        titleKey: 'routes.quiz_results',
        render: (params) => window.renderQuizResults(params),
        requireAuth: true
    },
    '/forum/:id': {
        titleKey: 'routes.forum',
        render: (params) => window.renderForumThread(params),
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

// Token de navegación: se incrementa en cada handleRoute(). Antes solo 3
// vistas (home, admin_courses, admin_users) se protegían a mano contra
// respuestas de red que llegan fuera de orden (ej. navegar rápido de un
// curso a otro antes de que termine el fetch del primero, que después
// pisa el contenido del segundo) con su propio contador local — ahora hay
// uno solo, centralizado acá, que cualquier vista puede usar:
// `const myToken = getNavToken()` al empezar, y comparar con
// `myToken === getNavToken()` antes de cada escritura al DOM tras un await.
let navToken = 0;
function getNavToken() {
    return navToken;
}

async function handleRoute() {
    navToken++;
    const currentRoute = getRoute();
    const routeData = parseRoute(currentRoute);
    
    if (!routeData) {
        document.title = `${t('routes.not_found')} - LMS LANBA - CeNAT`;
        render404();
        window.scrollTo(0, 0);
        return;
    }
    
    const { route, params } = routeData;
    
    // Check authentication requirements
    if (route.requireAuth && !isAuthenticated()) {
        window.location.hash = '#/login';
        return;
    }
    
    if (route.requireAdmin && !isAdmin()) {
        showToast(t('errors.no_permission'), 'error');
        window.location.hash = '#/';
        return;
    }
    
    // Update page title
    document.title = `${t(route.titleKey)} - LMS LANBA - CeNAT`;
    
    // Render the route
    try {
        await route.render(params);
    } catch (error) {
        console.error('Error rendering route:', error);
        showToast(t('errors.page_load_failed'), 'error');
    }

    // Cada vista es una página nueva para el usuario — sin esto, navegar
    // desde un punto scrolleado deja la vista siguiente igual de scrolleada,
    // ocultando el nav y el título hasta que suba manualmente.
    window.scrollTo(0, 0);
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
                        <i class="fas fa-graduation-cap text-5xl text-cenat-green"></i>
                    </div>
                </div>

                <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    ${t('notFound.heading')}
                </h2>
                <p class="text-gray-500 dark:text-slate-400 mb-8">
                    ${t('notFound.description')}
                </p>

                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <a href="#/" class="btn-cenat">
                        <i class="fas fa-home mr-2"></i> ${t('notFound.back_home')}
                    </a>
                    <button onclick="history.back()"
                        class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                        <i class="fas fa-arrow-left mr-2"></i> ${t('notFound.previous_page')}
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
window.getNavToken = getNavToken;
window.initRouter = initRouter;