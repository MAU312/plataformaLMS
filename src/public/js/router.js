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

// =================================
// Volver a donde se quería ir después de iniciar sesión
// =================================

// Antes, un invitado que tocaba un curso (o cuya sesión expiraba en una
// página) terminaba en el login SIN ninguna explicación, y tras iniciar sesión
// caía en Inicio en vez de en la página que quería. Ahora la ruta se recuerda
// y login() la usa (ver auth.js). sessionStorage (no una variable): la sesión
// expirada recarga la página, y una variable se perdería.
const RETURN_TO_KEY = 'lms_return_to';

function rememberReturnTo(route) {
    if (!route || route === '/login' || route === '/register') return;
    try { sessionStorage.setItem(RETURN_TO_KEY, route); } catch (e) { /* sin sessionStorage: se cae a Inicio, como antes */ }
}

function forgetReturnTo() {
    try { sessionStorage.removeItem(RETURN_TO_KEY); } catch (e) { /* nada que borrar */ }
}

// Devuelve la ruta recordada (y la olvida) solo si sigue siendo una ruta
// válida de la app; si no, null.
function consumeReturnTo() {
    try {
        const route = sessionStorage.getItem(RETURN_TO_KEY);
        sessionStorage.removeItem(RETURN_TO_KEY);
        return route && route.startsWith('/') && parseRoute(route) ? route : null;
    } catch (e) {
        return null;
    }
}

// =================================
// Menú actual y foco al cambiar de página
// =================================

// Marca en el navbar (escritorio y móvil) el enlace de la sección actual:
// lectores de pantalla lo anuncian como "página actual" y el CSS lo resalta.
// Un enlace a una sección (/admin, /teacher/courses) cuenta también para sus
// subrutas (/admin/users, /teacher/courses/17/edit).
function updateNavCurrent(route) {
    document.querySelectorAll('#navbar a[href^="#/"]').forEach((link) => {
        const target = link.getAttribute('href').slice(1);
        const isCurrent = target === route || (target !== '/' && route.startsWith(`${target}/`));
        if (isCurrent) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
}

// Tras cambiar de página el foco se queda donde estaba (un enlace que ya no
// existe): un lector de pantalla no anuncia nada y un usuario de teclado
// tendría que volver a recorrer todo el navbar. Se mueve al título de la
// página nueva (tabindex=-1: enfocable por código, no por Tab).
function focusMainHeading() {
    const heading = document.querySelector('#app h1') || document.querySelector('#app h2');
    if (!heading) return false;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    return true;
}

// "Saltar al contenido" (primer elemento enfocable de la página, ver
// index.html): no puede ser un <a href="#..."> porque el router usa el hash.
function skipToContent() {
    if (focusMainHeading()) return;
    const app = document.getElementById('app');
    if (app) {
        app.setAttribute('tabindex', '-1');
        app.focus();
    }
}

// Última ruta pintada (null hasta la primera): el foco solo se mueve cuando la
// ruta CAMBIA, no en la carga inicial ni al cambiar de idioma (setLocale()
// vuelve a llamar handleRoute() sobre la misma ruta, y robarle el foco al
// selector de idioma sería peor que no moverlo).
let lastRenderedRoute = null;

async function handleRoute() {
    navToken++;
    const currentRoute = getRoute();
    const routeData = parseRoute(currentRoute);

    if (!routeData) {
        document.title = `${t('routes.not_found')} - LMS LANBA - CeNAT`;
        render404();
        updateNavCurrent(currentRoute);
        if (lastRenderedRoute !== null && currentRoute !== lastRenderedRoute) focusMainHeading();
        lastRenderedRoute = currentRoute;
        window.scrollTo(0, 0);
        return;
    }

    const { route, params } = routeData;

    // Check authentication requirements
    if (route.requireAuth && !isAuthenticated()) {
        rememberReturnTo(currentRoute);
        showToast(t('auth.login_required'), 'info');
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

    updateNavCurrent(currentRoute);
    if (lastRenderedRoute !== null && currentRoute !== lastRenderedRoute) focusMainHeading();
    lastRenderedRoute = currentRoute;

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