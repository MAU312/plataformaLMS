/**
 * Views - Administración de Cursos (con toggle activo en lugar de eliminar)
 *
 * Dos tablas independientes en la misma página: "Cursos" (top-level,
 * scope='top') y "Módulos" (cursos hijo de un módulo de otro curso,
 * scope='children') — antes vivían mezclados en una sola tabla sin forma
 * de distinguirlos. Cada sección tiene su propio estado (búsqueda, página,
 * token de request) para que una búsqueda lenta en una no pueda pisar el
 * resultado de la otra (mismo motivo que homeRequestToken/adminUsersRequestToken
 * en el resto de la app). Los cursos hijo no tienen botón "Nuevo Curso" acá
 * — se crean desde dentro de un módulo, en views_content_manager.js.
 */

const COURSES_PER_PAGE = 8;

function createCoursesSectionState() {
    return { page: 1, search: '', courses: [], pagination: { total: 0, totalPages: 1 }, requestToken: 0 };
}

const coursesSections = {
    top: createCoursesSectionState(),
    children: createCoursesSectionState()
};

window.renderAdminCourses = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    coursesSections.top = createCoursesSectionState();
    coursesSections.children = createCoursesSectionState();

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

        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-3">${t('admin.courses.courses_section_heading')}</h2>
        <div class="relative mb-4">
            <input type="text" id="search-admin-courses-top" placeholder="${t('home.search_placeholder')}"
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-10">
            <div id="courses-table-container-top"></div>
            <div id="courses-pagination-top" class="px-4 py-3 border-t border-gray-100 dark:border-slate-700"></div>
        </div>

        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-1">${t('admin.courses.modules_section_heading')}</h2>
        <p class="text-sm text-gray-500 dark:text-slate-400 mb-3">${t('admin.courses.modules_section_hint')}</p>
        <div class="relative mb-4">
            <input type="text" id="search-admin-courses-children" placeholder="${t('home.search_placeholder')}"
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div id="courses-table-container-children"></div>
            <div id="courses-pagination-children" class="px-4 py-3 border-t border-gray-100 dark:border-slate-700"></div>
        </div>
    `, 'courses');

    document.getElementById('search-admin-courses-top').addEventListener('input', debounce((e) => {
        coursesSections.top.search = e.target.value.trim();
        loadAdminCoursesSection('top', 1);
    }, 300));
    document.getElementById('search-admin-courses-children').addEventListener('input', debounce((e) => {
        coursesSections.children.search = e.target.value.trim();
        loadAdminCoursesSection('children', 1);
    }, 300));

    await Promise.all([
        loadAdminCoursesSection('top', 1),
        loadAdminCoursesSection('children', 1)
    ]);
};

async function loadAdminCoursesSection(scope, page) {
    const section = coursesSections[scope];
    const container = document.getElementById(`courses-table-container-${scope}`);
    if (!container) return;

    const token = ++section.requestToken;

    try {
        const response = await coursesAPI.getAll({ page, limit: COURSES_PER_PAGE, search: section.search, scope });
        if (token !== section.requestToken) return;

        section.page = page;
        section.courses = response.data || [];
        section.pagination = response.pagination || { total: section.courses.length, totalPages: 1 };
        renderCoursesTable(scope);
    } catch (error) {
        if (token !== section.requestToken) return;
        console.error('Error loading courses:', error);
        showToast(t('admin.courses.load_failed'), 'error');
    }
}

function renderCoursesTable(scope) {
    const section = coursesSections[scope];
    const container = document.getElementById(`courses-table-container-${scope}`);
    const paginationContainer = document.getElementById(`courses-pagination-${scope}`);
    if (!container) return;

    const { courses, page, pagination } = section;
    const isChildren = scope === 'children';

    if (courses.length === 0) {
        container.innerHTML = isChildren ? `
            <div class="empty-state">
                <i class="fas fa-layer-group"></i>
                <p class="text-xl text-gray-600 dark:text-slate-400 font-medium">${t('admin.courses.modules_empty')}</p>
            </div>` : `
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
                        ${isChildren ? `<th class="py-3 px-4">${t('admin.courses.col_parent')}</th>` : ''}
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
                            ${isChildren ? `
                                <td class="py-3 px-4 text-gray-600 dark:text-slate-300">
                                    ${course.parent_course_id ? `
                                        <a href="#/admin/courses/${course.parent_course_id}/edit" class="hover:text-cenat-green hover:underline">
                                            ${escapeHtml(course.parent_course_title || '')} — ${escapeHtml(course.module_title || '')}
                                        </a>
                                    ` : '—'}
                                </td>
                            ` : ''}
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
    const pageChangeFnName = isChildren ? 'goToModuleCoursePage' : 'goToCoursePage';
    paginationContainer.innerHTML = renderPagination(page, totalPages, total, COURSES_PER_PAGE, pageChangeFnName);
}

window.goToCoursePage = function(page) {
    loadAdminCoursesSection('top', page);
};
window.goToModuleCoursePage = function(page) {
    loadAdminCoursesSection('children', page);
};

async function toggleCourseActive(id) {
    try {
        const scope = coursesSections.top.courses.some(c => c.id === id) ? 'top' : 'children';
        const course = coursesSections[scope].courses.find(c => c.id === id);
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
        renderCoursesTable(scope);
    } catch (error) {
        showToast(error.message || t('admin.courses.toggle_failed'), 'error');
    }
}

window.toggleCourseActive = toggleCourseActive;
