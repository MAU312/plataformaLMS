/**
 * Views - Mi Perfil
 */

window.renderProfile = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    const user = getCurrentUser();

    try {
        let enrolledCourses = [];
        if (isStudent()) {
            const response = await coursesAPI.getEnrolled();
            enrolledCourses = response.data || [];
        }

        let teachingCourses = [];
        if (isTeacher()) {
            const response = await coursesAPI.getTeaching();
            teachingCourses = response.data || [];
        }

        app.innerHTML = `
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
                    <div class="flex items-center gap-4">
                        <div class="relative flex-shrink-0">
                            <div id="profile-avatar" class="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-cenat-green to-cenat-green-light flex items-center justify-center text-white text-2xl font-bold">
                                ${user.avatar_url
                                    ? `<img src="${user.avatar_url}" alt="${escapeHtml(user.name)}" class="w-full h-full object-cover">`
                                    : user.name.charAt(0).toUpperCase()
                                }
                            </div>
                            <button id="edit-avatar-btn" type="button" title="Cambiar foto de perfil" aria-label="Cambiar foto de perfil"
                                class="absolute -bottom-1 -right-1 w-7 h-7 bg-cenat-green text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-cenat-green-hover transition">
                                <i class="fas fa-camera text-xs"></i>
                            </button>
                            <input type="file" id="avatar-file-input" accept="image/*" class="hidden">
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900">${escapeHtml(user.name)}</h1>
                            <p class="text-gray-600">${escapeHtml(user.email)}</p>
                            <span class="badge ${user.role === 'admin' ? 'badge-admin' : user.role === 'teacher' ? 'badge-teacher' : 'badge-student'} mt-2 inline-block">
                                ${user.role === 'admin' ? 'Administrador' : user.role === 'teacher' ? 'Profesor' : 'Estudiante'}
                            </span>
                            ${user.avatar_url ? `
                                <button id="remove-avatar-btn" type="button" class="block text-xs text-gray-400 hover:text-red-500 mt-2">
                                    <i class="fas fa-trash mr-1"></i>Quitar foto
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>

                ${isStudent() ? `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                        <h2 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-chart-line text-cenat-green mr-2"></i>
                            Mi progreso (${enrolledCourses.length} cursos)
                        </h2>
                        ${enrolledCourses.length > 0 ? `
                            <div class="space-y-4">
                                ${enrolledCourses.map(course => `
                                    <div class="border border-gray-100 rounded-lg p-4">
                                        <div class="flex justify-between items-center mb-2">
                                            <a href="#/course/${course.id}" class="font-medium text-gray-900 hover:text-cenat-green">${escapeHtml(course.title)}</a>
                                            <span class="text-sm text-gray-500">${course.progress || 0}%</span>
                                        </div>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${course.progress || 0}%"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-gray-500 text-center py-6">No estás inscrito en ningún curso aún</p>
                        `}
                    </div>
                ` : ''}

                ${isTeacher() ? `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                        <h2 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-chalkboard-teacher text-cenat-green mr-2"></i>
                            Cursos asignados (${teachingCourses.length})
                        </h2>
                        ${teachingCourses.length > 0 ? `
                            <div class="space-y-3">
                                ${teachingCourses.map(course => `
                                    <div class="border border-gray-100 rounded-lg p-4 flex items-center justify-between gap-3">
                                        <a href="#/teacher/courses/${course.id}/edit" class="font-medium text-gray-900 hover:text-cenat-green truncate">${escapeHtml(course.title)}</a>
                                        <div class="flex items-center gap-4 text-sm text-gray-500 flex-shrink-0">
                                            <span><i class="fas fa-users mr-1"></i>${course.enrolled_count || 0} inscritos</span>
                                            <span><i class="fas fa-layer-group mr-1"></i>${course.content_count || 0} contenidos</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-gray-500 text-center py-6">Aún no tienes cursos asignados</p>
                        `}
                    </div>
                ` : ''}
            </div>
        `;

        setupAvatarControls();

    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Error al cargar el perfil', 'error');
    }
};

/**
 * Botón de la cámara abre el input de archivo oculto; el input dispara la
 * subida apenas se elige un archivo (sin paso extra de "confirmar"). El
 * botón "Quitar foto" solo existe en el DOM cuando ya hay una foto puesta
 * (ver el template de arriba).
 */
function setupAvatarControls() {
    const editBtn = document.getElementById('edit-avatar-btn');
    const fileInput = document.getElementById('avatar-file-input');
    const removeBtn = document.getElementById('remove-avatar-btn');

    if (editBtn && fileInput) {
        editBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                editBtn.disabled = true;
                const response = await usersAPI.uploadAvatar(formData);
                updateCurrentUserAvatar(response.data.avatar_url);
                showToast('Foto de perfil actualizada exitosamente', 'success');
                renderProfile();
            } catch (error) {
                showToast(error.message || 'Error al actualizar la foto de perfil', 'error');
                editBtn.disabled = false;
            }
        });
    }

    if (removeBtn) {
        removeBtn.addEventListener('click', async () => {
            if (!(await confirmAction('¿Estás seguro de que deseas quitar tu foto de perfil?'))) return;

            try {
                await usersAPI.removeAvatar();
                updateCurrentUserAvatar(null);
                showToast('Foto de perfil eliminada exitosamente', 'success');
                renderProfile();
            } catch (error) {
                showToast(error.message || 'Error al quitar la foto de perfil', 'error');
            }
        });
    }
}
