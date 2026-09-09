/**
 * Views - Curso asignado a un profesor: edición de contenido (reutiliza
 * views_content_manager.js) y lista de estudiantes inscritos (reutiliza
 * renderStudentsTableHTML de views_admin_course_students.js). A
 * diferencia de la vista de admin, el profesor no puede editar título,
 * descripción, miniatura, estado activo, ni la lista de profesores
 * asignados — eso lo controla únicamente el equipo de LANBA - CeNAT.
 */

// Mismo valor que STUDENTS_PER_PAGE en views_admin_course_students.js,
// pero con OTRO nombre a propósito: un `const` de nivel superior no es
// local a su <script> — vive en el scope global compartido por todos los
// scripts clásicos de la página (esto no es como un módulo aparte). Dos
// `const STUDENTS_PER_PAGE` en archivos distintos son una redeclaración
// del MISMO nombre y tiran un SyntaxError que mata la ejecución completa
// del script que carga después (confirmado en vivo: rompía por completo
// views_teacher_course.js sin ningún log de error visible a simple vista).
const TEACHER_STUDENTS_PER_PAGE = 20;

window.renderTeacherCourse = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getById(params.id);
        const course = response.data;

        if (!course) {
            showToast(t('courseDetail.not_found'), 'error');
            navigateTo('/teacher/courses');
            return;
        }

        const contents = course.contents || [];

        app.innerHTML = `
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="#/teacher/courses" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> ${t('teacherCourse.back_to_my_courses')}
                </a>

                <div class="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">
                            <i class="fas fa-chalkboard-teacher text-cenat-green mr-2"></i>
                            ${escapeHtml(course.title)}
                        </h1>
                        ${course.description ? `<p class="text-gray-600 mt-1">${escapeHtml(course.description)}</p>` : ''}
                    </div>
                    <div class="flex flex-col sm:flex-row gap-2 shrink-0">
                        <a href="#/teacher/courses/${course.id}/students" class="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition whitespace-nowrap">
                            <i class="fas fa-user-graduate mr-1"></i> ${t('teacherCourse.view_students')}
                        </a>
                        <a href="#/course/${course.id}" class="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition whitespace-nowrap">
                            <i class="fas fa-eye mr-1"></i> ${t('teacherCourse.view_course')}
                        </a>
                    </div>
                </div>

                <div class="bg-blue-50 text-blue-700 text-sm rounded-lg p-3 mb-6">
                    <i class="fas fa-info-circle mr-1"></i>
                    ${t('teacherCourse.edit_notice')}
                </div>

                ${renderCourseContentManagerHTML(course, contents)}
            </div>
        `;

        initCourseContentManager(() => renderTeacherCourse({ id: course.id }), course);

    } catch (error) {
        console.error('Error loading course:', error);
        showToast(t('courseDetail.load_failed'), 'error');
    }
};

let currentTeacherStudentsCourseId = null;

window.renderTeacherCourseStudents = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentTeacherStudentsCourseId = params.id;

    try {
        const response = await coursesAPI.getStudents(params.id, { page: 1, limit: TEACHER_STUDENTS_PER_PAGE });
        const { course, students } = response.data;
        const pagination = response.pagination || { total: students.length, totalPages: 1 };

        app.innerHTML = `
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="#/teacher/courses/${params.id}/edit" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> ${t('forum.back_to_course')}
                </a>

                <div class="flex items-start justify-between gap-4 flex-wrap mb-1">
                    <h1 class="text-2xl font-bold text-gray-900">
                        <i class="fas fa-user-graduate text-cenat-green mr-2"></i> ${t('studentsTable.heading')}
                    </h1>
                    <button onclick="coursesAPI.downloadGrades(${params.id})" class="text-sm border border-cenat-green text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-50 transition">
                        <i class="fas fa-file-csv mr-1"></i> ${t('studentsTable.download_course_grades')}
                    </button>
                </div>
                <p class="text-gray-500 mb-6">${escapeHtml(course.title)}</p>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div id="teacher-students-table-container">${renderStudentsTableHTML(students, params.id)}</div>
                </div>
                <div id="teacher-students-pagination" class="mt-4"></div>
            </div>
        `;

        document.getElementById('teacher-students-pagination').innerHTML = students.length > 0
            ? renderPagination(1, pagination.totalPages, pagination.total, TEACHER_STUDENTS_PER_PAGE, 'goToTeacherStudentsPage')
            : '';

    } catch (error) {
        console.error('Error loading course students:', error);
        showToast(t('studentsTable.load_failed'), 'error');
    }
};

window.goToTeacherStudentsPage = function(page) {
    loadCourseStudentsPage(currentTeacherStudentsCourseId, page, 'teacher-students-table-container', 'teacher-students-pagination', 'goToTeacherStudentsPage');
};
