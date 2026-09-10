/**
 * Views - Administración de Cursos (con toggle activo en lugar de eliminar)
 */

const COURSES_PER_PAGE = 8;
let currentCoursePage = 1;
let currentCourseSearch = '';
let currentPageCourses = [];
let currentCoursesPagination = { total: 0, totalPages: 1 };
// Igual que en el catálogo público: descarta respuestas que ya no son
// la última petición (por búsqueda rápida con varias teclas seguidas).
let adminCoursesRequestToken = 0;

window.renderAdminCourses = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentCoursePage = 1;
    currentCourseSearch = '';

    app.innerHTML = renderAdminLayout(`
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                <i class="fas fa-book text-cenat-green mr-2"></i>
                ${t('admin.courses.title')}
            </h1>
            <a href="#/admin/courses/create" class="btn-cenat">
                <i class="fas fa-plus mr-2"></i> ${t('admin.courses.new_course')}
            </a>
        </div>

        <div class="relative mb-4">
            <input type="text" id="search-admin-courses" placeholder="${t('home.search_placeholder')}"
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div id="courses-table-container"></div>
            <div id="courses-pagination" class="px-4 py-3 border-t border-gray-100 dark:border-slate-700"></div>
        </div>
    `, 'courses');

    document.getElementById('search-admin-courses').addEventListener('input', debounce((e) => {
        currentCourseSearch = e.target.value.trim();
        loadAdminCourses(1);
    }, 300));

    await loadAdminCourses(1);
};

async function loadAdminCourses(page) {
    const container = document.getElementById('courses-table-container');
    const pagination = document.getElementById('courses-pagination');
    if (!container) return;

    const token = ++adminCoursesRequestToken;

    try {
        const response = await coursesAPI.getAll({ page, limit: COURSES_PER_PAGE, search: currentCourseSearch });
        if (token !== adminCoursesRequestToken) return;

        currentCoursePage = page;
        currentPageCourses = response.data || [];
        currentCoursesPagination = response.pagination || { total: currentPageCourses.length, totalPages: 1 };
        renderCoursesTable(currentPageCourses, page, currentCoursesPagination);
    } catch (error) {
        if (token !== adminCoursesRequestToken) return;
        console.error('Error loading courses:', error);
        showToast(t('admin.courses.load_failed'), 'error');
    }
}

function renderCoursesTable(courses, page, pagination) {
    const container = document.getElementById('courses-table-container');
    const paginationContainer = document.getElementById('courses-pagination');
    if (!container) return;

    if (courses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-book-open"></i>
                <p class="text-xl text-gray-600 dark:text-slate-400 font-medium">${t('admin.courses.empty')}</p>
                <a href="#/admin/courses/create" class="btn-cenat mt-4">
                    <i class="fas fa-plus mr-2"></i> ${t('admin.courses.create_first')}
                </a>
            </div>`;
        paginationContainer.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-slate-700">
                    <tr class="text-left text-gray-500 dark:text-slate-400">
                        <th class="py-3 px-4">${t('admin.courses.col_title')}</th>
                        <th class="py-3 px-4">${t('admin.courses.col_status')}</th>
                        <th class="py-3 px-4">${t('admin.courses.col_contents')}</th>
                        <th class="py-3 px-4">${t('admin.courses.col_enrolled')}</th>
                        <th class="py-3 px-4">${t('admin.courses.col_created')}</th>
                        <th class="py-3 px-4 text-right">${t('admin.courses.col_actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${courses.map(course => {
                        const isActive = course.is_active == 1 || course.is_active === true;
                        return `
                        <tr class="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 ${!isActive ? 'opacity-60' : ''}">
                            <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">${escapeHtml(course.title)}</td>
                            <td class="py-3 px-4">
                                <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                                    ${isActive ? t('admin.status_active') : t('admin.status_inactive')}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-gray-600 dark:text-slate-300">${course.content_count || 0}</td>
                            <td class="py-3 px-4 text-gray-600 dark:text-slate-300">${course.enrolled_count || 0}</td>
                            <td class="py-3 px-4 text-gray-500 dark:text-slate-400">${formatDate(course.created_at)}</td>
                            <td class="py-3 px-4 text-right space-x-3 whitespace-nowrap">
                                <a href="#/course/${course.id}" class="text-gray-500 hover:text-cenat-green" title="${t('admin.courses.view_course')}">
                                    <i class="fas fa-eye"></i>
                                </a>
                                <a href="#/admin/courses/${course.id}/edit" class="text-cenat-green hover:text-cenat-green-hover" title="${t('admin.courses.edit')}">
                                    <i class="fas fa-edit"></i>
                                </a>
                                <a href="#/admin/courses/${course.id}/students" class="text-gray-500 hover:text-cenat-green" title="${t('admin.courses.view_students')}">
                                    <i class="fas fa-user-graduate"></i>
                                </a>
                                <button onclick="toggleCourseActive(${course.id})"
                                    title="${isActive ? t('admin.courses.deactivate') : t('admin.courses.activate')}"
                                    class="hover:opacity-80 transition">
                                    <i class="fas ${isActive ? 'fa-eye-slash text-yellow-500' : 'fa-eye text-green-500'} text-lg"></i>
                                </button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;

    const { totalPages = 1, total = courses.length } = pagination || {};
    paginationContainer.innerHTML = renderPagination(page, totalPages, total, COURSES_PER_PAGE, 'goToCoursePage');
}

window.goToCoursePage = function(page) {
    loadAdminCourses(page);
};

async function toggleCourseActive(id) {
    try {
        const course = currentPageCourses.find(c => c.id === id);
        if (!course) return;

        const newState = !(course.is_active == 1 || course.is_active === true);

        // Llamar al endpoint de actualización con el nuevo estado
        const formData = new FormData();
        formData.append('title', course.title);
        formData.append('description', course.description || '');
        formData.append('is_active', newState);

        await coursesAPI.update(id, formData);

        // Actualizar en la página actual sin volver a pedirla al servidor
        course.is_active = newState;

        showToast(newState ? t('admin.courses.activated') : t('admin.courses.deactivated'), newState ? 'success' : 'warning');
        renderCoursesTable(currentPageCourses, currentCoursePage, currentCoursesPagination);
    } catch (error) {
        showToast(error.message || t('admin.courses.toggle_failed'), 'error');
    }
}

window.toggleCourseActive = toggleCourseActive;
