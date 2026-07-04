/**
 * Views - Editar Curso (incluye gestión de contenidos: videos y archivos)
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
            <a href="#/admin/courses" class="text-cenat-blue hover:underline text-sm mb-4 inline-block">
                <i class="fas fa-arrow-left mr-1"></i> Volver a cursos
            </a>

            <div class="flex items-center justify-between mb-6">
                <h1 class="text-2xl font-bold text-gray-900">
                    <i class="fas fa-edit text-cenat-blue mr-2"></i>
                    Editar Curso
                </h1>
                <a href="#/course/${course.id}" class="text-gray-500 hover:text-cenat-blue text-sm">
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
                                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition">
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <textarea id="description" name="description" rows="4"
                                class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition">${escapeHtml(course.description || '')}</textarea>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Imagen de portada</label>
                            ${course.thumbnail ? `<img src="${course.thumbnail}" class="h-24 rounded-lg object-cover mb-2">` : ''}
                            <input type="file" id="thumbnail" name="thumbnail" accept="image/*"
                                class="w-full text-sm text-gray-600">
                        </div>

                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="is_active" ${course.is_active ? 'checked' : ''} class="w-4 h-4 text-cenat-blue rounded">
                            <label for="is_active" class="text-sm text-gray-700">Curso activo (visible para estudiantes)</label>
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
                <div class="lg:col-span-2 space-y-6">
                    <!-- Sección Videos -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-bold text-gray-900">
                                <i class="fas fa-video text-cenat-blue mr-2"></i> Videos
                            </h2>
                            <button onclick="showAddVideoForm(${course.id})" class="text-sm bg-blue-50 text-cenat-blue px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                                <i class="fas fa-plus mr-1"></i> Agregar video
                            </button>
                        </div>

                        <div id="add-video-form-container"></div>

                        <div id="videos-list" class="space-y-2">
                            ${videos.length > 0 ? videos.map(video => renderContentItem(video, 'video')).join('') : `
                                <p class="text-gray-500 text-sm text-center py-4">No hay videos agregados aún</p>
                            `}
                        </div>
                    </div>

                    <!-- Sección Archivos -->
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-bold text-gray-900">
                                <i class="fas fa-file text-cenat-blue mr-2"></i> Archivos
                            </h2>
                            <button onclick="showAddFileForm(${course.id})" class="text-sm bg-blue-50 text-cenat-blue px-3 py-1.5 rounded-lg hover:bg-blue-100 transition">
                                <i class="fas fa-plus mr-1"></i> Agregar archivo
                            </button>
                        </div>

                        <div id="add-file-form-container"></div>

                        <div id="files-list" class="space-y-2">
                            ${files.length > 0 ? files.map(file => renderContentItem(file, 'file')).join('') : `
                                <p class="text-gray-500 text-sm text-center py-4">No hay archivos agregados aún</p>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `, 'courses');

        // Form de edición de curso
        document.getElementById('edit-course-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleUpdateCourse(course.id);
        });

    } catch (error) {
        console.error('Error loading course:', error);
        showToast('Error al cargar el curso', 'error');
    }
};

function renderContentItem(content, type) {
    const icon = type === 'video' ? 'fa-play-circle' : getFileIcon(content.url);
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            <i class="fas ${icon} text-xl text-cenat-blue"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">${escapeHtml(content.title)}</p>
                ${content.file_size ? `<p class="text-xs text-gray-500">${formatFileSize(content.file_size)}</p>` : ''}
            </div>
            <button onclick="deleteContentHandler(${content.id}, '${type}')" class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

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

// =================================
// Formulario para agregar VIDEO
// =================================

function showAddVideoForm(courseId) {
    const container = document.getElementById('add-video-form-container');

    container.innerHTML = `
        <form id="add-video-form" class="bg-blue-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Título del video *</label>
                <input type="text" id="video-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-blue" placeholder="Ej: Introducción al curso">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" id="video-description" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-blue">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Archivo de video *</label>
                <input type="file" id="video-file" accept="video/*" required class="w-full text-sm">
                <p class="text-xs text-gray-500 mt-1">Formatos: MP4, AVI, MOV, WEBM (máx. 500MB)</p>
            </div>
            <div id="video-upload-progress" class="hidden">
                <div class="progress-bar"><div id="video-progress-fill" class="progress-fill" style="width: 0%"></div></div>
            </div>
            <div class="flex gap-2">
                <button type="submit" id="submit-video-btn" class="bg-cenat-blue text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-upload mr-1"></i> Subir Video
                </button>
                <button type="button" onclick="document.getElementById('add-video-form-container').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
                </button>
            </div>
        </form>
    `;

    document.getElementById('add-video-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('video-title').value.trim();
        const description = document.getElementById('video-description').value.trim();
        const videoFile = document.getElementById('video-file').files[0];
        const submitBtn = document.getElementById('submit-video-btn');

        if (!title || !videoFile) {
            showToast('Título y archivo de video son requeridos', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('video', videoFile);

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Subiendo...';

            await contentsAPI.createVideo(formData);
            showToast('Video agregado exitosamente', 'success');
            renderAdminEditCourse({ id: courseId });

        } catch (error) {
            showToast(error.message || 'Error al subir el video', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload mr-1"></i> Subir Video';
        }
    });
}

// =================================
// Formulario para agregar ARCHIVO
// =================================

function showAddFileForm(courseId) {
    const container = document.getElementById('add-file-form-container');

    container.innerHTML = `
        <form id="add-file-form" class="bg-blue-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Título del archivo *</label>
                <input type="text" id="file-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-blue" placeholder="Ej: Guía del curso">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" id="file-description" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-blue">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Archivo *</label>
                <input type="file" id="file-upload" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar" required class="w-full text-sm">
                <p class="text-xs text-gray-500 mt-1">PDF, DOCX, PPT, XLS, TXT, ZIP, RAR (máx. 50MB)</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" id="submit-file-btn" class="bg-cenat-blue text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-upload mr-1"></i> Subir Archivo
                </button>
                <button type="button" onclick="document.getElementById('add-file-form-container').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
                </button>
            </div>
        </form>
    `;

    document.getElementById('add-file-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('file-title').value.trim();
        const description = document.getElementById('file-description').value.trim();
        const file = document.getElementById('file-upload').files[0];
        const submitBtn = document.getElementById('submit-file-btn');

        if (!title || !file) {
            showToast('Título y archivo son requeridos', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('file', file);

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Subiendo...';

            await contentsAPI.createFile(formData);
            showToast('Archivo agregado exitosamente', 'success');
            renderAdminEditCourse({ id: courseId });

        } catch (error) {
            showToast(error.message || 'Error al subir el archivo', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload mr-1"></i> Subir Archivo';
        }
    });
}

async function deleteContentHandler(id, type) {
    const label = type === 'video' ? 'el video' : 'el archivo';
    if (!confirmAction(`¿Estás seguro de eliminar ${label}? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        await contentsAPI.delete(id);
        showToast('Contenido eliminado exitosamente', 'success');
        // Recargar la vista actual
        const hash = window.location.hash.slice(1);
        const match = hash.match(/\/admin\/courses\/(\d+)\/edit/);
        if (match) {
            renderAdminEditCourse({ id: match[1] });
        }
    } catch (error) {
        showToast(error.message || 'Error al eliminar el contenido', 'error');
    }
}

window.showAddVideoForm = showAddVideoForm;
window.showAddFileForm = showAddFileForm;
window.deleteContentHandler = deleteContentHandler;
window.renderContentItem = renderContentItem;
