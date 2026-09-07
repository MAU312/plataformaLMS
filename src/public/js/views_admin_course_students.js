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
                <i class="fas fa-arrow-left mr-1"></i> Volver a cursos
            </a>

            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                <i class="fas fa-user-graduate text-cenat-green mr-2"></i>
                Estudiantes inscritos
            </h1>
            <p class="text-gray-500 dark:text-slate-400 mb-6">${escapeHtml(course.title)}</p>

            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div id="admin-students-table-container">${renderStudentsTableHTML(students)}</div>
            </div>
            <div id="admin-students-pagination" class="mt-4"></div>
        `, 'courses');

        document.getElementById('admin-students-pagination').innerHTML = students.length > 0
            ? renderPagination(1, pagination.totalPages, pagination.total, STUDENTS_PER_PAGE, 'goToAdminStudentsPage')
            : '';

    } catch (error) {
        console.error('Error loading course students:', error);
        showToast('Error al cargar los estudiantes del curso', 'error');
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

        tableContainer.innerHTML = renderStudentsTableHTML(students);

        const paginationContainer = document.getElementById(paginationContainerId);
        if (paginationContainer) {
            paginationContainer.innerHTML = students.length > 0
                ? renderPagination(page, pagination.totalPages, pagination.total, STUDENTS_PER_PAGE, pageChangeFnName)
                : '';
        }
    } catch (error) {
        console.error('Error loading course students:', error);
        showToast('Error al cargar los estudiantes del curso', 'error');
    }
}

/**
 * Tabla de estudiantes inscritos con su progreso — compartida entre la
 * vista de admin (arriba, con el sidebar de administración) y la vista
 * del profesor sobre su curso asignado (views_teacher_course.js, sin
 * ese sidebar, que no le corresponde a un profesor).
 */
function renderStudentsTableHTML(students) {
    if (students.length === 0) {
        return `
            <div class="empty-state">
                <i class="fas fa-user-graduate"></i>
                <p class="text-xl text-gray-600 dark:text-slate-400 font-medium">Nadie se ha inscrito todavía</p>
            </div>
        `;
    }

    return `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-slate-700">
                    <tr class="text-left text-gray-500 dark:text-slate-400">
                        <th class="py-3 px-4">Nombre</th>
                        <th class="py-3 px-4">Email</th>
                        <th class="py-3 px-4">Progreso</th>
                        <th class="py-3 px-4">Nota</th>
                        <th class="py-3 px-4">Inscrito</th>
                        <th class="py-3 px-4">Último ingreso</th>
                        <th class="py-3 px-4">Completado</th>
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
                            <td class="py-3 px-4 text-gray-500 dark:text-slate-400">${student.last_login ? formatDate(student.last_login) : 'Nunca'}</td>
                            <td class="py-3 px-4">
                                ${student.completed_at
                                    ? `<span class="badge badge-active"><i class="fas fa-certificate mr-1"></i> ${formatDate(student.completed_at)}</span>`
                                    : `<span class="badge badge-inactive">En curso</span>`}
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
