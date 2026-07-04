/**
 * Views - Crear Curso
 */

window.renderAdminCreateCourse = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    app.innerHTML = renderAdminLayout(`
        <div class="max-w-2xl">
            <a href="#/admin/courses" class="text-cenat-blue hover:underline text-sm mb-4 inline-block">
                <i class="fas fa-arrow-left mr-1"></i> Volver a cursos
            </a>
            <h1 class="text-2xl font-bold text-gray-900 mb-6">
                <i class="fas fa-plus-circle text-cenat-blue mr-2"></i>
                Crear Nuevo Curso
            </h1>

            <form id="create-course-form" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Título del curso *</label>
                    <input type="text" id="title" name="title" required 
                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition"
                        placeholder="Ej: Introducción a la Biotecnología Ambiental">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea id="description" name="description" rows="4"
                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition"
                        placeholder="Describe brevemente de qué trata el curso..."></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">Imagen de portada (opcional)</label>
                    <div class="file-drop-zone" id="thumbnail-drop-zone">
                        <i class="fas fa-image text-3xl text-gray-400 mb-2"></i>
                        <p class="text-sm text-gray-500">Click para seleccionar una imagen o arrástrala aquí</p>
                        <p class="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WEBP (máx. 5MB)</p>
                        <input type="file" id="thumbnail" name="thumbnail" accept="image/*" class="hidden">
                    </div>
                    <div id="thumbnail-preview" class="mt-3 hidden">
                        <img id="thumbnail-preview-img" class="h-32 rounded-lg object-cover">
                    </div>
                </div>

                <div class="flex gap-3 pt-2">
                    <button type="submit" id="submit-btn" class="btn-cenat">
                        <i class="fas fa-save mr-2"></i> Crear Curso
                    </button>
                    <a href="#/admin/courses" class="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                        Cancelar
                    </a>
                </div>
            </form>
        </div>
    `, 'courses');

    setupThumbnailDropZone();

    document.getElementById('create-course-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const thumbnailFile = document.getElementById('thumbnail').files[0];

        if (!title) {
            showToast('El título es requerido', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        if (thumbnailFile) {
            formData.append('thumbnail', thumbnailFile);
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Creando...';

            const response = await coursesAPI.create(formData);
            showToast('Curso creado exitosamente', 'success');
            navigateTo(`/admin/courses/${response.data.id}/edit`);

        } catch (error) {
            showToast(error.message || 'Error al crear el curso', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i> Crear Curso';
        }
    });
};

function setupThumbnailDropZone() {
    const dropZone = document.getElementById('thumbnail-drop-zone');
    const fileInput = document.getElementById('thumbnail');
    const preview = document.getElementById('thumbnail-preview');
    const previewImg = document.getElementById('thumbnail-preview-img');

    if (!dropZone) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragging');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragging');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragging');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files;
            showThumbnailPreview(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            showThumbnailPreview(e.target.files[0]);
        }
    });

    function showThumbnailPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            preview.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

window.setupThumbnailDropZone = setupThumbnailDropZone;
