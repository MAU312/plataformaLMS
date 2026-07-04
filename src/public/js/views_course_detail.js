/**
 * Views - Detalle de Curso
 */

window.renderCourseDetail = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await coursesAPI.getById(params.id);
        const course = response.data;

        if (!course) {
            app.innerHTML = `
                <div class="min-h-screen flex items-center justify-center">
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-5xl text-yellow-500 mb-4"></i>
                        <p class="text-xl text-gray-600">Curso no encontrado</p>
                        <a href="#/" class="btn-cenat mt-4 inline-block">Volver al inicio</a>
                    </div>
                </div>
            `;
            return;
        }

        // Si el usuario está logueado, traemos los contenidos con su estado de "completado"
        const isLoggedIn = isAuthenticated();
        const isEnrolled = course.isEnrolled;
        // Solo un admin o un estudiante inscrito puede ver/reproducir/descargar
        // el contenido real. El backend ya no manda las URLs si no corresponde,
        // esto solo controla cómo se dibuja la UI.
        const hasAccess = isLoggedIn && (isEnrolled || isAdmin());
        let contents = course.contents || [];

        if (isLoggedIn) {
            const contentsResponse = await contentsAPI.getByCourse(course.id);
            contents = contentsResponse.data || contents;
        }

        const videos = contents.filter(c => c.type === 'video');
        const files = contents.filter(c => c.type === 'file');
        const completedCount = contents.filter(c => c.completed).length;
        const progressPercent = contents.length > 0 ? Math.round((completedCount / contents.length) * 100) : 0;

        app.innerHTML = `
            <div class="bg-white border-b">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <a href="#/" class="text-cenat-blue hover:underline text-sm">
                        <i class="fas fa-arrow-left mr-1"></i> Volver al catálogo
                    </a>
                </div>
            </div>

            <div class="bg-gradient-to-r from-cenat-blue to-cenat-light py-10 px-4 sm:px-6 lg:px-8">
                <div class="max-w-7xl mx-auto">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(course.title)}</h1>
                            <p class="text-blue-100">${escapeHtml(course.description || '')}</p>
                            <p class="text-blue-200 text-sm mt-2">
                                <i class="fas fa-user-tie mr-1"></i> 
                                ${course.instructor_name ? escapeHtml(course.instructor_name) : 'CeNAT'}
                            </p>
                        </div>
                        <div id="enroll-button-container">
                            ${renderEnrollButton(isLoggedIn, isEnrolled, course.id)}
                        </div>
                    </div>

                    ${isLoggedIn && isEnrolled && contents.length > 0 ? `
                        <div class="mt-6 bg-white/10 rounded-lg p-4">
                            <div class="flex justify-between text-sm text-white mb-1">
                                <span><i class="fas fa-chart-line mr-1"></i> Tu progreso</span>
                                <span id="course-progress-label">${progressPercent}% (${completedCount}/${contents.length})</span>
                            </div>
                            <div class="progress-bar bg-white/20">
                                <div id="course-progress-fill" class="progress-fill" style="width: ${progressPercent}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <!-- Columna principal: Videos -->
                    <div class="lg:col-span-2 space-y-6">
                        <h2 class="text-xl font-bold text-gray-900 flex items-center">
                            <i class="fas fa-play-circle text-cenat-blue mr-2"></i>
                            Videos del curso
                        </h2>

                        ${videos.length > 0 ? `
                            <div class="video-player-container mb-4" id="main-video-container">
                                ${hasAccess ? `
                                <video id="main-video" controls>
                                    <source src="${videos[0].url}" type="video/mp4">
                                    Tu navegador no soporta la reproducción de video.
                                </video>
                                ` : `
                                <div class="flex flex-col items-center justify-center bg-gray-100 rounded-lg py-16 text-center">
                                    <i class="fas fa-lock text-4xl text-gray-400 mb-3"></i>
                                    <p class="text-gray-600 font-medium">Inscríbete en este curso para ver los videos</p>
                                </div>
                                `}
                            </div>
                            <h3 id="current-video-title" class="text-lg font-semibold text-gray-800">${escapeHtml(videos[0].title)}</h3>
                            <p class="text-gray-600 text-sm mb-4">${escapeHtml(videos[0].description || '')}</p>

                            <div class="space-y-2">
                                ${videos.map((video, index) => renderContentRow(video, index === 0, isLoggedIn && isEnrolled, 'video', hasAccess)).join('')}
                            </div>
                        ` : `
                            <div class="empty-state bg-white rounded-xl border border-gray-100">
                                <i class="fas fa-video-slash"></i>
                                <p class="text-gray-600">Este curso aún no tiene videos disponibles</p>
                            </div>
                        `}
                    </div>

                    <!-- Columna lateral: Archivos descargables -->
                    <div class="space-y-6">
                        <h2 class="text-xl font-bold text-gray-900 flex items-center">
                            <i class="fas fa-file-download text-cenat-blue mr-2"></i>
                            Materiales descargables
                        </h2>

                        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                            ${files.length > 0 ? files.map(file => renderContentRow(file, false, isLoggedIn && isEnrolled, 'file', hasAccess)).join('') : `
                                <div class="empty-state">
                                    <i class="fas fa-folder-open"></i>
                                    <p class="text-gray-600 text-sm">No hay archivos disponibles</p>
                                </div>
                            `}
                        </div>

                        <!-- Card de información -->
                        <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <h3 class="font-semibold text-gray-900 mb-2">
                                <i class="fas fa-info-circle text-cenat-blue mr-1"></i>
                                Información del curso
                            </h3>
                            <ul class="text-sm text-gray-600 space-y-1">
                                <li><i class="fas fa-video mr-2 text-gray-400"></i>${videos.length} videos</li>
                                <li><i class="fas fa-file mr-2 text-gray-400"></i>${files.length} archivos</li>
                                <li><i class="fas fa-users mr-2 text-gray-400"></i>${course.enrolled_count || 0} inscritos</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Click en videos de la lista (cambia el reproductor principal)
        document.querySelectorAll('.video-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // Si el click fue en el checkbox, no cambiar el video
                if (e.target.closest('.content-checkbox')) return;

                const url = this.dataset.url;
                const title = this.dataset.title;

                document.getElementById('main-video').querySelector('source').src = url;
                document.getElementById('main-video').load();
                document.getElementById('main-video').play();
                document.getElementById('current-video-title').textContent = title;

                document.querySelectorAll('.video-item').forEach(v => {
                    v.classList.remove('border-cenat-blue', 'bg-blue-50');
                    v.classList.add('border-gray-200');
                });
                this.classList.add('border-cenat-blue', 'bg-blue-50');
                this.classList.remove('border-gray-200');
            });
        });

        // Checkboxes de "completado"
        document.querySelectorAll('.content-checkbox').forEach(checkbox => {
            checkbox.addEventListener('click', async function(e) {
                e.stopPropagation();
                const contentId = this.dataset.contentId;
                // Leer el estado ACTUAL del atributo (siempre como string)
                const isCompleted = this.dataset.completed === 'true';
                // Deshabilitar el botón mientras se procesa para evitar doble click
                this.disabled = true;
                await toggleContentCompleted(contentId, !isCompleted, course.id);
                this.disabled = false;
            });
        });

        // Botón de inscripción
        setupEnrollButton(course.id);

    } catch (error) {
        console.error('Error loading course:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">Error al cargar el curso</p>
                    <a href="#/" class="btn-cenat mt-4 inline-block">Volver al inicio</a>
                </div>
            </div>
        `;
    }
};

function renderContentRow(content, isActiveVideo, canTrackProgress, type, hasAccess) {
    const icon = type === 'video' ? 'fa-play-circle' : getFileIcon(content.url || '');
    const isVideo = type === 'video';
    const completed = content.completed || false;
    // Solo es clickeable (para reproducir) si es video Y hay acceso real
    const clickable = isVideo && hasAccess;

    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border ${isActiveVideo && hasAccess ? 'border-cenat-blue bg-blue-50' : 'border-gray-200'} ${clickable ? 'hover:bg-blue-50 cursor-pointer video-item' : ''} transition"
             ${clickable ? `data-url="${content.url}" data-title="${escapeHtml(content.title)}"` : ''}>
            
            ${canTrackProgress ? `
                <button class="content-checkbox flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-cenat-blue'}"
                    data-content-id="${content.id}" data-completed="${completed == 1 || completed === true ? 'true' : 'false'}" title="${completed ? 'Marcar como pendiente' : 'Marcar como completado'}">
                    ${completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                </button>
            ` : ''}

            <i class="fas ${hasAccess ? icon : 'fa-lock'} text-xl ${hasAccess ? 'text-cenat-blue' : 'text-gray-400'}"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate ${completed ? 'line-through text-gray-400' : ''}">${escapeHtml(content.title)}</p>
                ${content.file_size ? `<p class="text-xs text-gray-500">${formatFileSize(content.file_size)}</p>` : ''}
            </div>
            ${!isVideo ? (hasAccess ? `
                <button onclick="downloadContent(${content.id})" class="text-cenat-blue hover:text-cenat-hover">
                    <i class="fas fa-download"></i>
                </button>
            ` : `
                <span class="text-gray-400 text-xs" title="Inscríbete para descargar">
                    <i class="fas fa-lock"></i>
                </span>
            `) : ''}
        </div>
    `;
}

async function toggleContentCompleted(contentId, markAsCompleted, courseId) {
    try {
        const response = markAsCompleted
            ? await contentsAPI.markCompleted(contentId)
            : await contentsAPI.markIncomplete(contentId);

        const newProgress = response.data.progress;

        // Actualizar UI sin recargar toda la vista: cambiar el checkbox clickeado
        const checkbox = document.querySelector(`.content-checkbox[data-content-id="${contentId}"]`);
        if (checkbox) {
            // Actualizar el atributo PRIMERO para que el conteo posterior sea correcto
            checkbox.dataset.completed = String(markAsCompleted);

            if (markAsCompleted) {
                checkbox.classList.remove('border-gray-300', 'hover:border-cenat-blue');
                checkbox.classList.add('bg-green-500', 'border-green-500');
                checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
                checkbox.title = 'Marcar como pendiente';
                const titleEl = checkbox.closest('div').querySelector('p');
                if (titleEl) titleEl.classList.add('line-through', 'text-gray-400');
            } else {
                checkbox.classList.add('border-gray-300', 'hover:border-cenat-blue');
                checkbox.classList.remove('bg-green-500', 'border-green-500');
                checkbox.innerHTML = '';
                checkbox.title = 'Marcar como completado';
                const titleEl = checkbox.closest('div').querySelector('p');
                if (titleEl) titleEl.classList.remove('line-through', 'text-gray-400');
            }
        }

        // Usar datos del servidor para la barra (evita desfases con el DOM)
        const progressFill = document.getElementById('course-progress-fill');
        const progressLabel = document.getElementById('course-progress-label');
        // Usar total y completados del servidor (fuente de verdad real)
        const totalContents = response.data.total;
        const completedContents = response.data.completed;

        if (progressFill) progressFill.style.width = `${newProgress}%`;
        if (progressLabel) progressLabel.textContent = `${newProgress}% (${completedContents}/${totalContents})`;

        // Toast + celebración si llegó al 100%
        if (markAsCompleted && newProgress === 100) {
            showCourseCompletionModal();
        } else {
            showToast(markAsCompleted ? 'Contenido marcado como completado' : 'Contenido marcado como pendiente', 'success');
        }

    } catch (error) {
        showToast(error.message || 'Error al actualizar el progreso', 'error');
    }
}

function renderEnrollButton(isLoggedIn, isEnrolled, courseId) {
    if (!isLoggedIn) {
        return `
            <a href="#/login" class="btn-cenat">
                <i class="fas fa-sign-in-alt mr-2"></i> Inicia sesión para inscribirte
            </a>
        `;
    }

    if (isStudent() === false && isAdmin()) {
        return ''; // Admin no necesita inscribirse
    }

    if (isEnrolled) {
        return `
            <button id="unenroll-btn" class="bg-white text-cenat-blue px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                <i class="fas fa-check-circle mr-2"></i> Inscrito
            </button>
        `;
    }

    return `
        <button id="enroll-btn" class="bg-white text-cenat-blue px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
            <i class="fas fa-plus-circle mr-2"></i> Inscribirme
        </button>
    `;
}

function setupEnrollButton(courseId) {
    const enrollBtn = document.getElementById('enroll-btn');
    const unenrollBtn = document.getElementById('unenroll-btn');

    if (enrollBtn) {
        enrollBtn.addEventListener('click', async () => {
            try {
                await coursesAPI.enroll(courseId);
                showToast('Te has inscrito exitosamente', 'success');
                renderCourseDetail({ id: courseId });
            } catch (error) {
                showToast(error.message || 'Error al inscribirse', 'error');
            }
        });
    }

    if (unenrollBtn) {
        unenrollBtn.addEventListener('click', async () => {
            if (confirmAction('¿Estás seguro de que deseas desinscribirte de este curso?')) {
                try {
                    await coursesAPI.unenroll(courseId);
                    showToast('Te has desinscrito del curso', 'info');
                    renderCourseDetail({ id: courseId });
                } catch (error) {
                    showToast(error.message || 'Error al desinscribirse', 'error');
                }
            }
        });
    }
}

function getFileIcon(url) {
    const ext = url.split('.').pop().toLowerCase();
    const icons = {
        pdf: 'fa-file-pdf',
        doc: 'fa-file-word',
        docx: 'fa-file-word',
        ppt: 'fa-file-powerpoint',
        pptx: 'fa-file-powerpoint',
        xls: 'fa-file-excel',
        xlsx: 'fa-file-excel',
        zip: 'fa-file-archive',
        rar: 'fa-file-archive',
        txt: 'fa-file-alt'
    };
    return icons[ext] || 'fa-file';
}

async function downloadContent(id) {
    if (!isAuthenticated()) {
        showToast('Debes iniciar sesión para descargar archivos', 'warning');
        navigateTo('/login');
        return;
    }
    await contentsAPI.download(id);
}

window.downloadContent = downloadContent;
window.getFileIcon = getFileIcon;

// =================================
// Celebración al completar el 100%
// =================================

function showCourseCompletionModal() {
    // Eliminar modal previo si existe
    const existing = document.getElementById('completion-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'completion-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center px-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeCompletionModal()"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center fade-in">
            <!-- Confetti animado -->
            <div class="text-6xl mb-4 animate-bounce">🎉</div>

            <h2 class="text-2xl font-extrabold text-gray-900 dark:text-white mb-2">
                ¡Curso completado!
            </h2>
            <p class="text-gray-600 dark:text-slate-400 mb-6">
                Felicidades, has completado todos los contenidos de este curso. ¡Excelente trabajo!
            </p>

            <!-- Barra de progreso al 100% -->
            <div class="progress-bar mb-6">
                <div class="progress-fill" style="width: 100%"></div>
            </div>

            <!-- Badge -->
            <div class="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-4 py-2 rounded-full font-semibold text-sm mb-6">
                <i class="fas fa-award text-lg"></i>
                100% Completado
            </div>

            <div class="flex gap-3 justify-center">
                <button onclick="closeCompletionModal()" class="btn-cenat">
                    <i class="fas fa-check mr-2"></i> ¡Entendido!
                </button>
                <a href="#/" onclick="closeCompletionModal()" class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                    Ver más cursos
                </a>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Lanzar confetti si la librería está disponible, si no solo el modal
    launchConfetti();
}

function closeCompletionModal() {
    const modal = document.getElementById('completion-modal');
    if (modal) modal.remove();
}

function launchConfetti() {
    const colors = ['#1e3a8a', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
    const container = document.getElementById('completion-modal');
    if (!container) return;

    for (let i = 0; i < 60; i++) {
        const confetti = document.createElement('div');
        confetti.style.cssText = `
            position: fixed;
            width: ${Math.random() * 10 + 6}px;
            height: ${Math.random() * 10 + 6}px;
            background: ${colors[Math.floor(Math.random() * colors.length)]};
            border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
            left: ${Math.random() * 100}vw;
            top: -20px;
            opacity: 1;
            pointer-events: none;
            z-index: 9999;
            animation: confettiFall ${Math.random() * 2 + 2}s ease-in forwards;
            animation-delay: ${Math.random() * 0.5}s;
        `;
        document.body.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3500);
    }
}

window.closeCompletionModal = closeCompletionModal;
window.showCourseCompletionModal = showCourseCompletionModal;