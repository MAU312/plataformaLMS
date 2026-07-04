/**
 * Views - Home (Catálogo de Cursos)
 */

window.renderHome = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getAll();
        const courses = response.data || [];

        app.innerHTML = `
            <div class="bg-gradient-to-br from-cenat-blue to-cenat-light py-16 px-4 sm:px-6 lg:px-8">
                <div class="max-w-7xl mx-auto text-center">
                    <h1 class="text-4xl md:text-5xl font-extrabold text-white mb-4">
                        Cursos del LANBA - CeNAT
                    </h1>
                    <p class="text-lg md:text-xl text-blue-100 max-w-2xl mx-auto">
                        Explora nuestros cursos educativos y fortalece tus conocimientos en biotecnología ambiental y ciencia abierta.
                    </p>
                </div>
            </div>

            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div class="flex items-center justify-between mb-8">
                    <h2 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-th-large mr-2 text-cenat-blue"></i>
                        Cursos disponibles
                    </h2>
                    <div class="relative">
                        <input 
                            type="text" 
                            id="search-courses" 
                            placeholder="Buscar curso..." 
                            class="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition w-64"
                        >
                        <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    </div>
                </div>

                <div id="courses-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${courses.length > 0 ? courses.map(course => renderCourseCard(course)).join('') : renderEmptyState()}
                </div>
            </div>
        `;

        // Búsqueda en tiempo real
        const searchInput = document.getElementById('search-courses');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                filterCourses(courses, e.target.value);
            }, 300));
        }

    } catch (error) {
        console.error('Error loading courses:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">Error al cargar los cursos</p>
                    <button onclick="window.location.reload()" class="btn-cenat mt-4">
                        <i class="fas fa-redo mr-2"></i> Reintentar
                    </button>
                </div>
            </div>
        `;
    }
};

function renderCourseCard(course) {
    const thumbnailUrl = course.thumbnail || null;
    const contentCount = course.content_count || 0;
    const enrolledCount = course.enrolled_count || 0;

    return `
        <div class="course-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100" onclick="navigateTo('/course/${course.id}')">
            <div class="h-44 bg-gradient-to-br from-cenat-blue to-cenat-light flex items-center justify-center relative overflow-hidden">
                ${thumbnailUrl 
                    ? `<img src="${thumbnailUrl}" alt="${escapeHtml(course.title)}" class="w-full h-full object-cover">` 
                    : `<i class="fas fa-flask text-5xl text-white opacity-80"></i>`
                }
                ${!course.is_active ? '<span class="badge badge-inactive absolute top-3 right-3">Inactivo</span>' : ''}
            </div>
            <div class="p-5">
                <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    ${escapeHtml(course.title)}
                </h3>
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                    ${escapeHtml(course.description || 'Sin descripción disponible')}
                </p>
                <div class="flex items-center justify-between text-sm text-gray-500 border-t pt-3">
                    <span><i class="fas fa-play-circle mr-1 text-cenat-blue"></i> ${contentCount} contenidos</span>
                    <span><i class="fas fa-users mr-1 text-cenat-blue"></i> ${enrolledCount} inscritos</span>
                </div>
            </div>
        </div>
    `;
}

function renderEmptyState() {
    return `
        <div class="col-span-full empty-state">
            <i class="fas fa-book-open"></i>
            <p class="text-xl text-gray-600 font-medium">No hay cursos disponibles aún</p>
            <p class="text-gray-500">Vuelve pronto para ver nuevos contenidos</p>
        </div>
    `;
}

function filterCourses(allCourses, searchTerm) {
    const grid = document.getElementById('courses-grid');
    const filtered = allCourses.filter(course => 
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    grid.innerHTML = filtered.length > 0 
        ? filtered.map(course => renderCourseCard(course)).join('') 
        : `<div class="col-span-full empty-state">
             <i class="fas fa-search"></i>
             <p class="text-xl text-gray-600 font-medium">No se encontraron cursos</p>
             <p class="text-gray-500">Intenta con otro término de búsqueda</p>
           </div>`;
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
