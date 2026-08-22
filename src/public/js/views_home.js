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
                    Cursos del LANBA - CeNAT
                </h1>
                <p class="text-lg md:text-xl text-green-100 max-w-2xl mx-auto">
                    Explora nuestros cursos educativos y fortalece tus conocimientos en biotecnología ambiental y ciencia abierta.
                </p>
            </div>
        </div>

        <div class="courses-bg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-th-large mr-2 text-cenat-green"></i>
                        Cursos disponibles
                    </h2>
                    <div class="relative">
                        <input
                            type="text"
                            id="search-courses"
                            placeholder="Buscar curso..."
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
                <p class="text-xl text-gray-600">Error al cargar los cursos</p>
                <button onclick="window.location.reload()" class="btn-cenat mt-4">
                    <i class="fas fa-redo mr-2"></i> Reintentar
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
    const thumbnailUrl = course.thumbnail || null;
    const contentCount = course.content_count || 0;
    const enrolledCount = course.enrolled_count || 0;

    return `
        <div class="course-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100" onclick="navigateTo('/course/${course.id}')">
            <div class="h-44 bg-gradient-to-br from-cenat-green to-cenat-green-light flex items-center justify-center relative overflow-hidden">
                ${thumbnailUrl 
                    ? `<img src="${thumbnailUrl}" alt="${escapeHtml(course.title)}" class="w-full h-full object-cover">` 
                    : `<i class="fas fa-flask text-5xl text-white opacity-80"></i>`
                }
                ${!course.is_active ? '<span class="badge badge-inactive absolute top-3 right-3">Inactivo</span>' : ''}
            </div>
            <div class="p-5">
                <h3 class="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                    ${escapeHtml(course.title)}
                </h3>
                ${course.teacher_names ? `
                    <p class="text-sm text-gray-500 mb-2 truncate">
                        <i class="fas fa-user-tie mr-1"></i>${escapeHtml(course.teacher_names)}
                    </p>
                ` : ''}
                <p class="text-gray-600 text-base mb-4 line-clamp-2">
                    ${escapeHtml(course.description || 'Sin descripción disponible')}
                </p>
                <div class="flex items-center justify-between text-sm text-gray-500 border-t pt-3">
                    <span><i class="fas fa-play-circle mr-1 text-cenat-green"></i> ${contentCount} contenidos</span>
                    <span><i class="fas fa-users mr-1 text-cenat-green"></i> ${enrolledCount} inscritos</span>
                </div>
            </div>
        </div>
    `;
}

function renderEmptyState(searchTerm) {
    if (searchTerm) {
        return `
            <div class="col-span-full empty-state">
                <i class="fas fa-search"></i>
                <p class="text-xl text-gray-600 font-medium">No se encontraron cursos</p>
                <p class="text-gray-500">Intenta con otro término de búsqueda</p>
            </div>
        `;
    }
    return `
        <div class="col-span-full empty-state">
            <i class="fas fa-book-open"></i>
            <p class="text-xl text-gray-600 font-medium">No hay cursos disponibles aún</p>
            <p class="text-gray-500">Vuelve pronto para ver nuevos contenidos</p>
        </div>
    `;
}

// Utilidad para evitar inyección de HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.escapeHtml = escapeHtml;
window.renderCourseCard = renderCourseCard;
