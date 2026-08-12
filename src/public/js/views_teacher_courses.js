/**
 * Views - Mis Cursos (como profesor): cursos donde el usuario actual está
 * asignado como profesor.
 */

window.renderTeacherCourses = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getTeaching();
        const courses = response.data || [];

        app.innerHTML = `
            <div class="bg-white border-b py-8 px-4 sm:px-6 lg:px-8">
                <div class="max-w-7xl mx-auto">
                    <h1 class="text-3xl font-extrabold text-gray-900">
                        <i class="fas fa-chalkboard-teacher text-cenat-green mr-2"></i>
                        Mis Cursos (Profesor)
                    </h1>
                    <p class="text-gray-600 mt-1">Cursos donde estás asignado como profesor</p>
                </div>
            </div>

            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                ${courses.length > 0 ? `
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        ${courses.map(course => renderTeacherCourseCard(course)).join('')}
                    </div>
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-chalkboard"></i>
                        <p class="text-xl text-gray-600 font-medium">Aún no tienes cursos asignados</p>
                        <p class="text-gray-500">El administrador te asigna a un curso desde la gestión de cursos</p>
                    </div>
                `}
            </div>
        `;

    } catch (error) {
        console.error('Error loading teaching courses:', error);
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

function renderTeacherCourseCard(course) {
    const thumbnailUrl = course.thumbnail || null;

    return `
        <div class="course-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100" onclick="navigateTo('/teacher/courses/${course.id}/edit')">
            <div class="h-40 bg-gradient-to-br from-cenat-green to-cenat-green-light flex items-center justify-center relative overflow-hidden">
                ${thumbnailUrl
                    ? `<img src="${thumbnailUrl}" alt="${escapeHtml(course.title)}" class="w-full h-full object-cover">`
                    : `<i class="fas fa-flask text-5xl text-white opacity-80"></i>`
                }
                ${!course.is_active ? `<span class="absolute top-2 right-2 badge badge-inactive">Inactivo</span>` : ''}
            </div>
            <div class="p-5">
                <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    ${escapeHtml(course.title)}
                </h3>
                <div class="flex justify-between text-sm text-gray-500">
                    <span><i class="fas fa-users mr-1"></i> ${course.enrolled_count || 0} inscritos</span>
                    <span><i class="fas fa-layer-group mr-1"></i> ${course.content_count || 0} contenidos</span>
                </div>
            </div>
        </div>
    `;
}
