/**
 * Views - Estudiantes inscritos en un curso (progreso, vista de instructor)
 */

window.renderAdminCourseStudents = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getStudents(params.id);
        const { course, students } = response.data;

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
                ${students.length > 0 ? `
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead class="bg-gray-50 dark:bg-slate-700">
                                <tr class="text-left text-gray-500 dark:text-slate-400">
                                    <th class="py-3 px-4">Nombre</th>
                                    <th class="py-3 px-4">Email</th>
                                    <th class="py-3 px-4">Progreso</th>
                                    <th class="py-3 px-4">Inscrito</th>
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
                                        <td class="py-3 px-4 text-gray-500 dark:text-slate-400">${formatDate(student.enrolled_at)}</td>
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
                ` : `
                    <div class="empty-state">
                        <i class="fas fa-user-graduate"></i>
                        <p class="text-xl text-gray-600 dark:text-slate-400 font-medium">Nadie se ha inscrito todavía</p>
                    </div>
                `}
            </div>
        `, 'courses');

    } catch (error) {
        console.error('Error loading course students:', error);
        showToast('Error al cargar los estudiantes del curso', 'error');
    }
};
