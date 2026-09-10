/**
 * Views - Crear Curso
 */

window.renderAdminCreateCourse = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    app.innerHTML = renderAdminLayout(`
        <div class="max-w-2xl">
            <a href="#/admin/courses" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                <i class="fas fa-arrow-left mr-1"></i> ${t('admin.back_to_courses')}
            </a>
            <h1 class="text-2xl font-bold text-gray-900 mb-6">
                <i class="fas fa-plus-circle text-cenat-green mr-2"></i>
                ${t('admin.createCourse.title')}
            </h1>

            <form id="create-course-form" class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.createCourse.title_label')}</label>
                    <input type="text" id="title" name="title" required
                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                        placeholder="${t('admin.createCourse.title_placeholder')}">
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.createCourse.description_label')}</label>
                    <textarea id="description" name="description" rows="4"
                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                        placeholder="${t('admin.createCourse.description_placeholder')}"></textarea>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.createCourse.thumbnail_label')}</label>
                    <div class="file-drop-zone" id="thumbnail-drop-zone">
                        <i class="fas fa-image text-3xl text-gray-400 mb-2"></i>
                        <p class="text-sm text-gray-500">${t('admin.createCourse.thumbnail_drop_hint')}</p>
                        <p class="text-xs text-gray-400 mt-1">${t('admin.createCourse.thumbnail_formats_hint')}</p>
                        <input type="file" id="thumbnail" name="thumbnail" accept="image/*" class="hidden">
                    </div>
                    <div id="thumbnail-preview" class="mt-3 hidden">
                        <img id="thumbnail-preview-img" class="h-32 rounded-lg object-cover">
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.createCourse.certificate_style_label')}</label>
                    <select id="certificate_style"
                        class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition">
                        ${renderCertificateStyleOptions('classic')}
                    </select>
                    <p class="mt-1 text-xs text-gray-500">${t('courseForm.certificate_hint')}</p>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.createCourse.teachers_label')}</label>
                    <div id="teacher-checkboxes" class="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                        <p class="text-sm text-gray-400">${t('contentManager.modules.loading_teachers')}</p>
                    </div>
                    <p class="mt-1 text-xs text-gray-500">${t('admin.createCourse.teachers_hint')}</p>
                </div>

                <div class="flex gap-3 pt-2">
                    <button type="submit" id="submit-btn" class="btn-cenat">
                        <i class="fas fa-save mr-2"></i> ${t('admin.createCourse.submit')}
                    </button>
                    <a href="#/admin/courses" class="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                        ${t('contentManager.cancel')}
                    </a>
                </div>
            </form>
        </div>
    `, 'courses');

    setupThumbnailDropZone();
    loadTeacherCheckboxes('teacher-checkboxes');

    document.getElementById('create-course-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-btn');
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        const thumbnailFile = document.getElementById('thumbnail').files[0];

        if (!title) {
            showToast(t('contentManager.title_required'), 'error');
            return;
        }
        if (thumbnailFile && !checkFileSize(thumbnailFile, 5 * 1024 * 1024, t('contentManager.modules.thumbnail_field_label'))) return;

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('certificate_style', document.getElementById('certificate_style').value);
        formData.append('teacher_ids', JSON.stringify(getSelectedTeacherIds('teacher-checkboxes')));
        if (thumbnailFile) {
            formData.append('thumbnail', thumbnailFile);
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${t('contentManager.creating')}`;

            const response = await coursesAPI.create(formData);
            showToast(t('admin.createCourse.created'), 'success');
            navigateTo(`/admin/courses/${response.data.id}/edit`);

        } catch (error) {
            showToast(error.message || t('admin.createCourse.create_failed'), 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i> ${t('admin.createCourse.submit')}`;
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
