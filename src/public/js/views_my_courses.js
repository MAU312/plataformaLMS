/**
 * Views - Mis Cursos (cursos inscritos del estudiante)
 */

const MY_COURSES_PER_PAGE = 12;
let currentMyCoursesPage = 1;

window.renderMyCourses = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentMyCoursesPage = 1;

    app.innerHTML = `
        <div class="bg-white border-b py-8 px-4 sm:px-6 lg:px-8">
            <div class="max-w-7xl mx-auto">
                <h1 class="text-3xl font-extrabold text-gray-900">
                    <i class="fas fa-book text-cenat-green mr-2"></i>
                    ${t('myCourses.title')}
                </h1>
                <p class="text-gray-600 mt-1">${t('myCourses.subtitle')}</p>
            </div>
        </div>

        <div class="courses-bg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div id="my-courses-container"></div>
                <div id="my-courses-pagination" class="mt-6"></div>
            </div>
        </div>
    `;

    await loadMyCourses(1);
};

async function loadMyCourses(page) {
    const container = document.getElementById('my-courses-container');
    const paginationContainer = document.getElementById('my-courses-pagination');
    if (!container) return;

    try {
        const response = await coursesAPI.getEnrolled({ page, limit: MY_COURSES_PER_PAGE });
        currentMyCoursesPage = page;
        const courses = response.data || [];
        const pagination = response.pagination || { total: courses.length, totalPages: 1 };

        container.innerHTML = courses.length > 0 ? `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                ${courses.map(course => renderEnrolledCourseCard(course)).join('')}
            </div>
        ` : `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p class="text-xl text-gray-600 font-medium">${t('myCourses.empty_title')}</p>
                <p class="text-gray-500 mb-4">${t('myCourses.empty_subtitle')}</p>
                <a href="#/" class="btn-cenat">
                    <i class="fas fa-search mr-2"></i> ${t('myCourses.explore_courses')}
                </a>
            </div>
        `;

        paginationContainer.innerHTML = courses.length > 0
            ? renderPagination(page, pagination.totalPages, pagination.total, MY_COURSES_PER_PAGE, 'goToMyCoursesPage')
            : '';

    } catch (error) {
        console.error('Error loading enrolled courses:', error);
        showToast(t('myCourses.load_failed'), 'error');
    }
}

window.goToMyCoursesPage = function(page) {
    loadMyCourses(page);
};

function renderEnrolledCourseCard(course) {
    const progress = course.progress || 0;

    const bodyHtml = `
        <h3 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
            ${escapeHtml(course.title)}
        </h3>
        <div class="mb-2">
            <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>${t('myCourses.progress_label')}</span>
                <span>${progress}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        <p class="text-xs text-gray-500 mt-3">
            <i class="fas fa-calendar-alt mr-1"></i>
            ${t('myCourses.enrolled_on', { date: formatDate(course.enrolled_at) })}
        </p>
    `;

    return renderCourseCardShell({ course, navigateToPath: `/course/${course.id}`, heightClass: 'h-40', showInactiveBadge: false, bodyHtml });
}
