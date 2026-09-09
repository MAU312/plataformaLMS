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
                        ${t('nav.teacher_courses')}
                    </h1>
                    <p class="text-gray-600 mt-1">${t('teacherCourses.subtitle')}</p>
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
                        <p class="text-xl text-gray-600 font-medium">${t('teacherCourses.empty_title')}</p>
                        <p class="text-gray-500">${t('teacherCourses.empty_subtitle')}</p>
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
                    <p class="text-xl text-gray-600">${t('teacherCourses.load_failed')}</p>
                </div>
            </div>
        `;
    }
};

function renderTeacherCourseCard(course) {
    const bodyHtml = `
        <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
            ${escapeHtml(course.title)}
        </h3>
        <div class="flex justify-between text-sm text-gray-500">
            <span><i class="fas fa-users mr-1"></i> ${t('home.enrolled_count', { count: course.enrolled_count || 0 })}</span>
            <span><i class="fas fa-layer-group mr-1"></i> ${t('home.contents_count', { count: course.content_count || 0 })}</span>
        </div>
    `;

    return renderCourseCardShell({ course, navigateToPath: `/teacher/courses/${course.id}/edit`, heightClass: 'h-40', showInactiveBadge: true, bodyHtml });
}
