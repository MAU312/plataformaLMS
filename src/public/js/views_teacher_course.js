/**
 * Views - Curso asignado a un profesor: edición de contenido (reutiliza
 * views_content_manager.js) y lista de estudiantes inscritos (reutiliza
 * renderStudentsTableHTML de views_admin_course_students.js). Para un
 * curso normal el profesor no puede editar título, descripción, miniatura,
 * estado activo, ni la lista de profesores asignados — eso lo controla
 * únicamente el equipo de LANBA - CeNAT.
 *
 * EXCEPCIÓN: si el curso es HIJO de un módulo (`course.parent_module_id`)
 * y quien lo ve es el profesor principal (de todo el curso) del curso
 * PADRE — el backend ya resolvió ese permiso, ver
 * courseIdFromChildCourseParam en course.routes.js — sí puede editar
 * título/descripción/miniatura/profesores asignados de ESE curso hijo
 * (no su estado activo ni el estilo de certificado, eso sigue siendo
 * admin-only incluso ahí, ver updateCourse en course.controller.js).
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
        // Un curso hijo de un módulo trae parent_module_id poblado (ver
        // Course.findById) — el backend ya solo deja pasar acá a un
        // profesor si es el "principal" (de todo el curso) del padre de
        // ESTE módulo, así que si llegamos hasta acá con parent_module_id
        // seteado, este usuario puede editar la info de este curso hijo.
        const isModuleChild = !!course.parent_module_id;

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
                        ${!isModuleChild && course.description ? `<p class="text-gray-600 mt-1">${escapeHtml(course.description)}</p>` : ''}
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

                ${isModuleChild ? renderModuleChildCourseEditForm(course) : `
                    <div class="bg-blue-50 text-blue-700 text-sm rounded-lg p-3 mb-6">
                        <i class="fas fa-info-circle mr-1"></i>
                        ${t('teacherCourse.edit_notice')}
                    </div>
                `}

                ${renderCourseContentManagerHTML(course, contents)}
            </div>
        `;

        initCourseContentManager(() => renderTeacherCourse({ id: course.id }), course);
        if (isModuleChild) {
            setupModuleChildCourseEditForm(course);
        }

    } catch (error) {
        console.error('Error loading course:', error);
        showToast(t('courseDetail.load_failed'), 'error');
    }
};

/**
 * Formulario reducido (título/descripción/miniatura/profesores) para que
 * el profesor principal del curso padre edite la info de este curso hijo
 * — deliberadamente sin `is_active` ni `certificate_style` (eso sigue
 * siendo admin-only, ver updateCourse). Reusa el mismo dropzone con
 * preview que Crear/Editar Curso (ver setupThumbnailDropZone en utils.js).
 */
function renderModuleChildCourseEditForm(course) {
    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 class="font-semibold text-gray-900 mb-4">
                <i class="fas fa-edit text-cenat-green mr-1"></i>
                ${t('courseDetail.course_info_heading')}
            </h2>
            <form id="module-child-edit-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('contentManager.edit.title_label')}</label>
                    <input type="text" id="module-child-title" required value="${escapeAttr(course.title)}"
                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.editCourse.description_label')}</label>
                    <textarea id="module-child-description" rows="3"
                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition">${escapeHtml(course.description || '')}</textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.editCourse.thumbnail_label')}</label>
                    <div class="file-drop-zone" id="module-child-thumbnail-drop-zone">
                        <i class="fas fa-image text-3xl text-gray-400 mb-2"></i>
                        <p class="text-sm text-gray-500">${t('admin.createCourse.thumbnail_drop_hint')}</p>
                        <p class="text-xs text-gray-400 mt-1">${t('admin.createCourse.thumbnail_formats_hint')}</p>
                        <input type="file" id="module-child-thumbnail" accept="image/*" class="hidden">
                    </div>
                    <div id="module-child-thumbnail-preview" class="mt-3 ${course.thumbnail ? '' : 'hidden'}">
                        <img id="module-child-thumbnail-preview-img" src="${course.thumbnail ? escapeAttr(course.thumbnail) : ''}" class="h-32 rounded-lg object-cover">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.editCourse.teachers_label')}</label>
                    <div id="module-child-teacher-checkboxes" class="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <p class="text-sm text-gray-400">${t('contentManager.modules.loading_teachers')}</p>
                    </div>
                </div>
                <button type="submit" id="module-child-submit-btn" class="btn-cenat">
                    <i class="fas fa-save mr-2"></i> ${t('admin.save_changes')}
                </button>
            </form>
        </div>
    `;
}

async function setupModuleChildCourseEditForm(course) {
    setupThumbnailDropZone({
        dropZoneId: 'module-child-thumbnail-drop-zone',
        inputId: 'module-child-thumbnail',
        previewContainerId: 'module-child-thumbnail-preview',
        previewImgId: 'module-child-thumbnail-preview-img'
    });

    document.getElementById('module-child-edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleUpdateModuleChildCourse(course.id);
    });

    try {
        const teachersResponse = await coursesAPI.getTeachers(course.id);
        const assignedTeachers = teachersResponse.data?.teachers || [];
        const assignedTeacherIds = assignedTeachers.map(t => t.id);
        loadTeacherCheckboxes('module-child-teacher-checkboxes', assignedTeacherIds);
    } catch (error) {
        console.error('Error al cargar los profesores del curso hijo:', error);
    }
}

async function handleUpdateModuleChildCourse(courseId) {
    const submitBtn = document.getElementById('module-child-submit-btn');
    const title = document.getElementById('module-child-title').value.trim();
    const description = document.getElementById('module-child-description').value.trim();
    const thumbnailFile = document.getElementById('module-child-thumbnail').files[0];

    if (!title) {
        showToast(t('contentManager.title_required'), 'error');
        return;
    }
    if (thumbnailFile && !checkFileSize(thumbnailFile, 5 * 1024 * 1024, t('contentManager.modules.thumbnail_field_label'))) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('teacher_ids', JSON.stringify(getSelectedTeacherIds('module-child-teacher-checkboxes')));
    if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${t('contentManager.saving')}`;

        await coursesAPI.update(courseId, formData);
        showToast(t('admin.editCourse.updated'), 'success');

        await renderTeacherCourse({ id: courseId });

    } catch (error) {
        showToast(error.message || t('admin.editCourse.update_failed'), 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i> ${t('admin.save_changes')}`;
    }
}

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
