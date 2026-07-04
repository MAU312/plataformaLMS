/**
 * Views - Mis Cursos (cursos inscritos del estudiante)
 */

window.renderMyCourses = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getEnrolled();
        const courses = response.data || [];

        app.innerHTML = `
            <div class="bg-white border-b py-8 px-4 sm:px-6 lg:px-8">
                <div class="max-w-7xl mx-auto">
                    <h1 class="text-3xl font-extrabold text-gray-900">
                        <i class="fas fa-book text-cenat-blue mr-2"></i>
                        Mis Cursos
                    </h1>
                    <p class="text-gray-600 mt-1">Aquí están todos los cursos en los que estás inscrito</p>
                </div>
            </div>

            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                ${courses.length > 0 ? `
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${courses.map(course => renderEnrolledCourseCard(course)).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-book-open"></i>
                        <p class="text-xl text-gray-600 font-medium">Aún no estás inscrito en ningún curso</p>
                        <p class="text-gray-500 mb-4">Explora el catálogo y comienza a aprender</p>
                        <a href="#/" class="btn-cenat">
                            <i class="fas fa-search mr-2"></i> Explorar cursos
                        </a>
                    </div>
                `}
            </div>
        `;

    } catch (error) {
        console.error('Error loading enrolled courses:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">Error al cargar tus cursos</p>
                </div>
            </div>
        `;
    }
};

function renderEnrolledCourseCard(course) {
    const progress = course.progress || 0;
    const thumbnailUrl = course.thumbnail || null;

    return `
        <div class="course-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100" onclick="navigateTo('/course/${course.id}')">
            <div class="h-40 bg-gradient-to-br from-cenat-blue to-cenat-light flex items-center justify-center relative overflow-hidden">
                ${thumbnailUrl 
                    ? `<img src="${thumbnailUrl}" alt="${escapeHtml(course.title)}" class="w-full h-full object-cover">` 
                    : `<i class="fas fa-flask text-5xl text-white opacity-80"></i>`
                }
            </div>
            <div class="p-5">
                <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    ${escapeHtml(course.title)}
                </h3>
                <div class="mb-2">
                    <div class="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Progreso</span>
                        <span>${progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                <p class="text-xs text-gray-500 mt-3">
                    <i class="fas fa-calendar-alt mr-1"></i>
                    Inscrito el ${formatDate(course.enrolled_at)}
                </p>
            </div>
        </div>
    `;
}
