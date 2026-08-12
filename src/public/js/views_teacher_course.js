/**
 * Views - Curso asignado a un profesor: edición de contenido (reutiliza
 * views_content_manager.js) y lista de estudiantes inscritos (reutiliza
 * renderStudentsTableHTML de views_admin_course_students.js). A
 * diferencia de la vista de admin, el profesor no puede editar título,
 * descripción, miniatura, estado activo, ni la lista de profesores
 * asignados — eso lo controla únicamente el equipo de LANBA - CeNAT.
 */

window.renderTeacherCourse = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getById(params.id);
        const course = response.data;

        if (!course) {
            showToast('Curso no encontrado', 'error');
            navigateTo('/teacher/courses');
            return;
        }

        const contents = course.contents || [];

        app.innerHTML = `
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="#/teacher/courses" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> Volver a mis cursos
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
                            <i class="fas fa-user-graduate mr-1"></i> Ver estudiantes
                        </a>
                        <a href="#/course/${course.id}" class="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition whitespace-nowrap">
                            <i class="fas fa-eye mr-1"></i> Ver curso
                        </a>
                    </div>
                </div>

                <div class="bg-blue-50 text-blue-700 text-sm rounded-lg p-3 mb-6">
                    <i class="fas fa-info-circle mr-1"></i>
                    Puedes agregar y editar el contenido de este curso. El título, la descripción, la miniatura y los profesores asignados los administra el equipo de LANBA - CeNAT.
                </div>

                ${renderCourseContentManagerHTML(course, contents)}
            </div>
        `;

        initCourseContentManager(() => renderTeacherCourse({ id: course.id }));

    } catch (error) {
        console.error('Error loading course:', error);
        showToast('Error al cargar el curso', 'error');
    }
};

window.renderTeacherCourseStudents = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getStudents(params.id);
        const { course, students } = response.data;

        app.innerHTML = `
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="#/teacher/courses/${params.id}/edit" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> Volver al curso
                </a>

                <h1 class="text-2xl font-bold text-gray-900 mb-1">
                    <i class="fas fa-user-graduate text-cenat-green mr-2"></i> Estudiantes inscritos
                </h1>
                <p class="text-gray-500 mb-6">${escapeHtml(course.title)}</p>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    ${renderStudentsTableHTML(students)}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading course students:', error);
        showToast('Error al cargar los estudiantes del curso', 'error');
    }
};
