/**
 * Views - Mis Cursos (como profesor): cursos donde el usuario actual está
 * asignado como profesor. Paginado igual que "Mis cursos" del estudiante
 * (ver views_my_courses.js) — un profesor asignado a cientos de cursos
 * (o un admin con acceso de profesor) recibía y dibujaba TODAS las
 * tarjetas de una vez.
 */

const TEACHER_COURSES_PER_PAGE = 12;
let currentTeacherCoursesPage = 1;
const teacherCoursesRequestGuard = createStaleResponseGuard();

window.renderTeacherCourses = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentTeacherCoursesPage = 1;

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
            <div id="teacher-courses-container"></div>
            <div id="teacher-courses-pagination" class="mt-6"></div>
        </div>
    `;

    await loadTeacherCourses(1);
};

async function loadTeacherCourses(page) {
    const container = document.getElementById('teacher-courses-container');
    const paginationContainer = document.getElementById('teacher-courses-pagination');
    if (!container) return;

    const isStale = teacherCoursesRequestGuard.start();

    try {
        const response = await coursesAPI.getTeaching({ page, limit: TEACHER_COURSES_PER_PAGE });
        if (isStale()) return;
        currentTeacherCoursesPage = page;
        const courses = response.data || [];
        const pagination = response.pagination || { total: courses.length, totalPages: 1 };

        container.innerHTML = courses.length > 0 ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                ${courses.map(course => renderTeacherCourseCard(course)).join('')}
            </div>
        ` : `
            <div class="empty-state">
                <i class="fas fa-chalkboard"></i>
                <p class="text-xl text-gray-600 font-medium">${t('teacherCourses.empty_title')}</p>
                <p class="text-gray-500">${t('teacherCourses.empty_subtitle')}</p>
            </div>
        `;

        paginationContainer.innerHTML = courses.length > 0
            ? renderPagination(page, pagination.totalPages, pagination.total, TEACHER_COURSES_PER_PAGE, 'goToTeacherCoursesPage')
            : '';

    } catch (error) {
        if (isStale()) return;
        console.error('Error loading teaching courses:', error);
        container.innerHTML = `
            <div class="text-center py-12">
                <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                <p class="text-xl text-gray-600">${t('teacherCourses.load_failed')}</p>
            </div>
        `;
        paginationContainer.innerHTML = '';
    }
}

window.goToTeacherCoursesPage = function(page) {
    loadTeacherCourses(page);
    scrollToElement('teacher-courses-container');
};

function renderTeacherCourseCard(course) {
    const bodyHtml = `
        <h2 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
            ${escapeHtml(course.title)}
        </h2>
        <div class="flex justify-between text-sm text-gray-500">
            <span><i class="fas fa-users mr-1"></i> ${tPlural('home.enrolled_count', course.enrolled_count || 0)}</span>
            <span><i class="fas fa-layer-group mr-1"></i> ${tPlural('home.contents_count', course.content_count || 0)}</span>
        </div>
    `;

    return renderCourseCardShell({ course, navigateToPath: `/teacher/courses/${course.id}/edit`, heightClass: 'h-40', showInactiveBadge: true, bodyHtml });
}
