/**
 * Views - Editar Curso (datos del curso; la gestión de contenidos vive en
 * views_content_manager.js, compartida con la vista de edición del profesor)
 */

window.renderAdminEditCourse = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getById(params.id);
        const course = response.data;

        if (!course) {
            showToast('Curso no encontrado', 'error');
            navigateTo('/admin/courses');
            return;
        }

        const contents = course.contents || [];
        const videos = contents.filter(c => c.type === 'video');
        const files = contents.filter(c => c.type === 'file');

        app.innerHTML = renderAdminLayout(`
            <a href="#/admin/courses" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                <i class="fas fa-arrow-left mr-1"></i> Volver a cursos
            </a>

            <div class="flex items-center justify-between mb-6">
                <h1 class="text-2xl font-bold text-gray-900">
                    <i class="fas fa-edit text-cenat-green mr-2"></i>
                    Editar Curso
                </h1>
                <a href="#/course/${course.id}" class="text-gray-500 hover:text-cenat-green text-sm">
                    <i class="fas fa-eye mr-1"></i> Ver curso
                </a>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Columna izquierda: Info del curso -->
                <div class="lg:col-span-1">
                    <form id="edit-course-form" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                            <input type="text" id="title" name="title" required value="${escapeHtml(course.title)}"
                                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea id="description" name="description" rows="4"
                                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition">${escapeHtml(course.description || '')}</textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Imagen de portada</label>
                            ${course.thumbnail ? `<img src="${course.thumbnail}" class="h-24 rounded-lg object-cover mb-2">` : ''}
                            <input type="file" id="thumbnail" name="thumbnail" accept="image/*"
                                class="w-full text-sm text-gray-600">
                        </div>

                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="is_active" ${course.is_active ? 'checked' : ''} class="w-4 h-4 text-cenat-green rounded">
                            <label for="is_active" class="text-sm text-gray-700">Curso activo (visible para estudiantes)</label>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Profesores asignados</label>
                            <div id="teacher-checkboxes" class="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                                <p class="text-sm text-gray-400">Cargando profesores...</p>
                            </div>
                        </div>

                        <button type="submit" id="submit-edit-btn" class="btn-cenat w-full">
                            <i class="fas fa-save mr-2"></i> Guardar Cambios
                        </button>
                    </form>

                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                        <h3 class="font-semibold text-gray-900 mb-2">Estadísticas</h3>
                        <ul class="text-sm text-gray-600 space-y-2">
                            <li class="flex justify-between"><span>Inscritos:</span> <strong>${course.enrolled_count || 0}</strong></li>
                            <li class="flex justify-between"><span>Videos:</span> <strong>${videos.length}</strong></li>
                            <li class="flex justify-between"><span>Archivos:</span> <strong>${files.length}</strong></li>
                        </ul>
                    </div>
                </div>

                <!-- Columna derecha: Gestión de contenidos -->
                <div class="lg:col-span-2">
                    ${renderCourseContentManagerHTML(course, contents)}
                </div>
            </div>
        `, 'courses');

        initCourseContentManager(() => renderAdminEditCourse({ id: course.id }));

        // Form de edición de curso
        document.getElementById('edit-course-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleUpdateCourse(course.id);
        });

        const teachersResponse = await coursesAPI.getTeachers(course.id);
        const assignedTeacherIds = (teachersResponse.data?.teachers || []).map(t => t.id);
        loadTeacherCheckboxes('teacher-checkboxes', assignedTeacherIds);

    } catch (error) {
        console.error('Error loading course:', error);
        showToast('Error al cargar el curso', 'error');
    }
};

async function handleUpdateCourse(courseId) {
    const submitBtn = document.getElementById('submit-edit-btn');
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const is_active = document.getElementById('is_active').checked;
    const thumbnailFile = document.getElementById('thumbnail').files[0];

    if (!title) {
        showToast('El título es requerido', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('is_active', is_active);
    formData.append('teacher_ids', JSON.stringify(getSelectedTeacherIds('teacher-checkboxes')));
    if (thumbnailFile) {
        formData.append('thumbnail', thumbnailFile);
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...';

        await coursesAPI.update(courseId, formData);
        showToast('Curso actualizado exitosamente', 'success');

        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Guardar Cambios';

    } catch (error) {
        showToast(error.message || 'Error al actualizar el curso', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Guardar Cambios';
    }
}
