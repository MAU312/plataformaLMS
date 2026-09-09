/**
 * Views - Home (Catálogo de Cursos)
 */

const HOME_COURSES_PER_PAGE = 12;
let homeCurrentPage = 1;
let homeSearchTerm = '';
// Se incrementa en cada fetch; si llega una respuesta que ya no es la más
// reciente (petición anterior que tardó más que una posterior, por typing
// rápido en la búsqueda), se descarta en vez de pisar el resultado nuevo.
let homeRequestToken = 0;

window.renderHome = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    homeCurrentPage = 1;
    homeSearchTerm = '';

    app.innerHTML = `
        <div class="bg-gradient-to-br from-cenat-green to-cenat-green-light py-16 px-4 sm:px-6 lg:px-8">
            <div class="max-w-7xl mx-auto text-center">
                <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">
                    ${escapeHtml(getSiteSetting('catalog_title', t('home.title_default')))}
                </h1>
                <p class="text-lg md:text-xl text-green-100 max-w-2xl mx-auto">
                    ${escapeHtml(getSiteSetting('catalog_subtitle', t('home.subtitle_default')))}
                </p>
            </div>
        </div>

        <div class="courses-bg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-th-large mr-2 text-cenat-green"></i>
                        ${t('home.available_courses')}
                    </h2>
                    <div class="relative">
                        <input
                            type="text"
                            id="search-courses"
                            placeholder="${escapeAttr(t('home.search_placeholder'))}"
                            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition w-64"
                        >
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>

                <div id="courses-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"></div>
                <div id="courses-pagination" class="mt-8"></div>
            </div>
        </div>
    `;

    document.getElementById('search-courses').addEventListener('input', debounce((e) => {
        homeSearchTerm = e.target.value.trim();
        loadHomeCourses(1);
    }, 300));

    await loadHomeCourses(1);
};

async function loadHomeCourses(page) {
    const grid = document.getElementById('courses-grid');
    const pagination = document.getElementById('courses-pagination');
    if (!grid) return;

    const token = ++homeRequestToken;

    try {
        const response = await coursesAPI.getAll({ page, limit: HOME_COURSES_PER_PAGE, search: homeSearchTerm });
        if (token !== homeRequestToken) return; // llegó una respuesta obsoleta

        const courses = response.data || [];
        homeCurrentPage = page;

        grid.innerHTML = courses.length > 0
            ? courses.map(course => renderCourseCard(course)).join('')
            : renderEmptyState(homeSearchTerm);

        const { totalPages, total } = response.pagination || { totalPages: 1, total: courses.length };
        pagination.innerHTML = renderPagination(page, totalPages, total, HOME_COURSES_PER_PAGE, 'goToHomeCoursePage');
    } catch (error) {
        if (token !== homeRequestToken) return;
        console.error('Error loading courses:', error);
        grid.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                <p class="text-xl text-gray-600">${t('errors.load_courses_failed')}</p>
                <button onclick="window.location.reload()" class="btn-cenat mt-4">
                    <i class="fas fa-redo mr-2"></i> ${t('home.retry')}
                </button>
            </div>
        `;
        pagination.innerHTML = '';
    }
}

window.goToHomeCoursePage = function(page) {
    loadHomeCourses(page);
    scrollToElement('courses-grid');
};

function renderCourseCard(course) {
    const contentCount = course.content_count || 0;
    const enrolledCount = course.enrolled_count || 0;

    const bodyHtml = `
        <h3 class="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
            ${escapeHtml(course.title)}
        </h3>
        ${course.teacher_names ? `
            <p class="text-sm text-gray-500 mb-2 truncate">
                <i class="fas fa-user-tie mr-1"></i>${escapeHtml(course.teacher_names)}
            </p>
        ` : ''}
        <p class="text-gray-600 text-base mb-4 line-clamp-2">
            ${escapeHtml(course.description || t('home.no_description'))}
        </p>
        <div class="flex items-center justify-between text-sm text-gray-500 border-t pt-3">
            <span><i class="fas fa-play-circle mr-1 text-cenat-green"></i> ${t('home.contents_count', { count: contentCount })}</span>
            <span><i class="fas fa-users mr-1 text-cenat-green"></i> ${t('home.enrolled_count', { count: enrolledCount })}</span>
        </div>
    `;

    return renderCourseCardShell({ course, navigateToPath: `/course/${course.id}`, heightClass: 'h-44', showInactiveBadge: true, bodyHtml });
}

function renderEmptyState(searchTerm) {
    if (searchTerm) {
        return `
            <div class="col-span-full empty-state">
                <i class="fas fa-search"></i>
                <p class="text-xl text-gray-600 font-medium">${t('home.empty_search_title')}</p>
                <p class="text-gray-500">${t('home.empty_search_subtitle')}</p>
            </div>
        `;
    }
    return `
        <div class="col-span-full empty-state">
            <i class="fas fa-book-open"></i>
            <p class="text-xl text-gray-600 font-medium">${t('home.empty_title')}</p>
            <p class="text-gray-500">${t('home.empty_subtitle')}</p>
        </div>
    `;
}

// escapeHtml ya se define en utils.js (que carga antes que este archivo) —
// no redeclarar acá: dos funciones globales del mismo nombre en archivos
// distintos es la misma clase de bug que ya causó el choque de
// `renderFolderCard` (la última en cargar gana silenciosamente).
window.renderCourseCard = renderCourseCard;
