/**
 * Gestión de contenidos de un curso (videos/archivos) — compartido entre
 * la vista de edición del admin (views_admin_edit_course.js) y la vista
 * de edición del profesor sobre su curso asignado (views_teacher_course.js).
 * La única diferencia entre ambos contextos es qué función hay que llamar
 * para volver a renderizar la página después de crear/borrar contenido —
 * cada vista la registra con initCourseContentManager() al montarse.
 */

let contentManagerRerender = () => {};

function initCourseContentManager(rerenderFn) {
    contentManagerRerender = rerenderFn;
}

function renderCourseContentManagerHTML(course, contents) {
    const videos = contents.filter(c => c.type === 'video');
    const files = contents.filter(c => c.type === 'file');

    return `
        <div class="space-y-6">
            <!-- Sección Videos -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-gray-900">
                        <i class="fas fa-video text-cenat-green mr-2"></i> Videos
                    </h2>
                    <button onclick="showAddVideoForm(${course.id})" class="text-sm bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
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
                        <i class="fas fa-file text-cenat-green mr-2"></i> Archivos
                    </h2>
                    <button onclick="showAddFileForm(${course.id})" class="text-sm bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
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
    `;
}

function renderContentItem(content, type) {
    const icon = type === 'video' ? 'fa-play-circle' : getFileIcon(content.url);
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            <i class="fas ${icon} text-xl text-cenat-green"></i>
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

// =================================
// Formulario para agregar VIDEO
// =================================

function showAddVideoForm(courseId) {
    const container = document.getElementById('add-video-form-container');

    container.innerHTML = `
        <form id="add-video-form" class="bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Título del video *</label>
                <input type="text" id="video-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="Ej: Introducción al curso">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" id="video-description" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
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
                <button type="submit" id="submit-video-btn" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
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
            contentManagerRerender();

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
        <form id="add-file-form" class="bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Título del archivo *</label>
                <input type="text" id="file-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="Ej: Guía del curso">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" id="file-description" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Archivo *</label>
                <input type="file" id="file-upload" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar" required class="w-full text-sm">
                <p class="text-xs text-gray-500 mt-1">PDF, DOCX, PPT, XLS, TXT, ZIP, RAR (máx. 50MB)</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" id="submit-file-btn" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
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
            contentManagerRerender();

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
        contentManagerRerender();
    } catch (error) {
        showToast(error.message || 'Error al eliminar el contenido', 'error');
    }
}

window.initCourseContentManager = initCourseContentManager;
window.renderCourseContentManagerHTML = renderCourseContentManagerHTML;
window.renderContentItem = renderContentItem;
window.showAddVideoForm = showAddVideoForm;
window.showAddFileForm = showAddFileForm;
window.deleteContentHandler = deleteContentHandler;
