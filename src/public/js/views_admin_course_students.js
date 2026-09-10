/**
 * Views - Estudiantes inscritos en un curso (progreso, vista de instructor)
 */

const STUDENTS_PER_PAGE = 20;
let currentAdminStudentsCourseId = null;

window.renderAdminCourseStudents = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentAdminStudentsCourseId = params.id;

    try {
        const response = await coursesAPI.getStudents(params.id, { page: 1, limit: STUDENTS_PER_PAGE });
        const { course, students } = response.data;
        const pagination = response.pagination || { total: students.length, totalPages: 1 };

        app.innerHTML = renderAdminLayout(`
            <a href="#/admin/courses" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                <i class="fas fa-arrow-left mr-1"></i> ${t('admin.back_to_courses')}
            </a>

            <div class="flex items-start justify-between gap-4 flex-wrap mb-1">
                <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                    <i class="fas fa-user-graduate text-cenat-green mr-2"></i>
                    ${t('studentsTable.heading')}
                </h1>
                <button onclick="coursesAPI.downloadGrades(${params.id})" class="text-sm border border-cenat-green text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-slate-700 transition">
                    <i class="fas fa-file-csv mr-1"></i> ${t('studentsTable.download_course_grades')}
                </button>
            </div>
            <p class="text-gray-500 dark:text-slate-400 mb-6">${escapeHtml(course.title)}</p>

            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div id="admin-students-table-container">${renderStudentsTableHTML(students, params.id)}</div>
            </div>
            <div id="admin-students-pagination" class="mt-4"></div>
        `, 'courses');

        document.getElementById('admin-students-pagination').innerHTML = students.length > 0
            ? renderPagination(1, pagination.totalPages, pagination.total, STUDENTS_PER_PAGE, 'goToAdminStudentsPage')
            : '';

    } catch (error) {
        console.error('Error loading course students:', error);
        showToast(t('studentsTable.load_failed'), 'error');
    }
};

window.goToAdminStudentsPage = function(page) {
    loadCourseStudentsPage(currentAdminStudentsCourseId, page, 'admin-students-table-container', 'admin-students-pagination', 'goToAdminStudentsPage');
};

/**
 * Trae una página de estudiantes inscritos y actualiza los contenedores
 * dados — compartido entre la vista de admin (arriba) y la del profesor
 * sobre su curso asignado (views_teacher_course.js), que solo difieren
 * en el resto del layout alrededor de la tabla/paginación.
 */
async function loadCourseStudentsPage(courseId, page, tableContainerId, paginationContainerId, pageChangeFnName) {
    const tableContainer = document.getElementById(tableContainerId);
    if (!tableContainer) return;

    try {
        const response = await coursesAPI.getStudents(courseId, { page, limit: STUDENTS_PER_PAGE });
        const { students } = response.data;
        const pagination = response.pagination || { total: students.length, totalPages: 1 };

        tableContainer.innerHTML = renderStudentsTableHTML(students, courseId);

        const paginationContainer = document.getElementById(paginationContainerId);
        if (paginationContainer) {
            paginationContainer.innerHTML = students.length > 0
                ? renderPagination(page, pagination.totalPages, pagination.total, STUDENTS_PER_PAGE, pageChangeFnName)
                : '';
        }
    } catch (error) {
        console.error('Error loading course students:', error);
        showToast(t('studentsTable.load_failed'), 'error');
    }
}

/**
 * Tabla de estudiantes inscritos con su progreso — compartida entre la
 * vista de admin (arriba, con el sidebar de administración) y la vista
 * del profesor sobre su curso asignado (views_teacher_course.js, sin
 * ese sidebar, que no le corresponde a un profesor).
 */
function renderStudentsTableHTML(students, courseId) {
    if (students.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <p class="text-xl text-gray-600 dark:text-slate-400 font-medium">${t('studentsTable.empty')}</p>
            </div>
        `;
    }

    return `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-slate-700">
                    <tr class="text-left text-gray-500 dark:text-slate-400">
                        <th class="py-3 px-4">${t('studentsTable.col_name')}</th>
                        <th class="py-3 px-4">${t('studentsTable.col_email')}</th>
                        <th class="py-3 px-4">${t('studentsTable.col_progress')}</th>
                        <th class="py-3 px-4">${t('studentsTable.col_grade')}</th>
                        <th class="py-3 px-4">${t('studentsTable.col_enrolled')}</th>
                        <th class="py-3 px-4">${t('studentsTable.col_last_login')}</th>
                        <th class="py-3 px-4">${t('studentsTable.col_completed')}</th>
                        <th class="py-3 px-4 text-right">${t('studentsTable.col_grades')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(student => `
                        <tr class="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                            <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">${escapeHtml(student.name)}</td>
                            <td class="py-3 px-4 text-gray-600 dark:text-slate-300">${escapeHtml(student.email)}</td>
                            <td class="py-3 px-4">
                                <div class="flex items-center gap-2 w-40">
                                    <div class="progress-bar flex-1">
                                        <div class="progress-fill" style="width: ${student.progress}%"></div>
                                    </div>
                                    <span class="text-xs text-gray-500 dark:text-slate-400 w-9 text-right">${student.progress}%</span>
                                </div>
                            </td>
                            <td class="py-3 px-4 text-gray-700 dark:text-slate-300 font-medium">${student.grade !== null && student.grade !== undefined ? student.grade : '—'}</td>
                            <td class="py-3 px-4 text-gray-500 dark:text-slate-400">${formatDate(student.enrolled_at)}</td>
                            <td class="py-3 px-4 text-gray-500 dark:text-slate-400">${student.last_login ? formatDate(student.last_login) : t('studentsTable.never_logged_in')}</td>
                            <td class="py-3 px-4">
                                ${student.completed_at
                                    ? `<span class="badge badge-active"><i class="fas fa-certificate mr-1"></i> ${formatDate(student.completed_at)}</span>`
                                    : `<span class="badge badge-inactive">${t('studentsTable.in_progress_badge')}</span>`}
                            </td>
                            <td class="py-3 px-4 text-right">
                                <button onclick="coursesAPI.downloadStudentGrades(${courseId}, ${student.id})" class="text-cenat-green hover:text-cenat-green-hover" title="${escapeAttr(t('studentsTable.download_grade_detail_title', { name: student.name }))}">
                                    <i class="fas fa-download"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

window.renderStudentsTableHTML = renderStudentsTableHTML;
window.loadCourseStudentsPage = loadCourseStudentsPage;
