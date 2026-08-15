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
        // Solo un admin, un estudiante inscrito, o un profesor puede
        // ver/reproducir/descargar el contenido real. El backend ya no
        // manda las URLs si no corresponde (incluye la verificación fina
        // de que el profesor esté asignado a ESTE curso); esto solo
        // controla cómo se dibuja la UI.
        const hasAccess = isLoggedIn && (isEnrolled || isAdmin() || isTeacher());
        let contents = course.contents || [];

        if (isLoggedIn) {
            const contentsResponse = await contentsAPI.getByCourse(course.id);
            contents = contentsResponse.data || contents;
        }

        const folders = contents.filter(c => c.type === 'folder');
        const isTopLevel = c => !c.folder_id;

        // Videos de nivel superior: sección propia con el reproductor
        // grande, igual que antes. El resto de tipos (URL/Archivo/Texto/
        // Tarea/Foro) de nivel superior se muestran en UNA sola lista
        // mezclada, en el orden exacto que definió el profesor (ver
        // renderContentItemByType) — el mismo patrón que ya usa cada
        // carpeta para su propio contenido.
        const videos = contents.filter(c => c.type === 'video' && isTopLevel(c));
        // El reproductor grande debe existir si hay CUALQUIER video en el
        // curso, esté o no dentro de una carpeta — si no, un curso cuyos
        // videos están todos agrupados en una carpeta no tenía dónde
        // reproducirlos (el click en la fila del video de la carpeta no
        // hacía nada porque #main-video ni existía). Se prioriza un video
        // de nivel superior como el que carga primero; si no hay ninguno,
        // se usa el primer video que aparezca (de alguna carpeta).
        const allVideos = contents.filter(c => c.type === 'video');
        const initialVideo = videos[0] || allVideos[0];
        // Una carpeta (folder_id siempre null, sin subcarpetas) se mezcla
        // en la misma lista que URL/Archivo/Texto/Tarea/Foro, en el orden
        // exacto que definió el profesor — así puede aparecer antes o
        // después de una tarea puntual (ver renderContentItemByType).
        const mixedItems = contents.filter(c => c.type !== 'video' && isTopLevel(c));

        // Conteos de la tarjeta de información: sobre TODO el curso,
        // incluyendo lo que está dentro de una carpeta.
        const allVideosCount = contents.filter(c => c.type === 'video').length;
        const allFilesCount = contents.filter(c => c.type === 'file').length;
        const allUrlsCount = contents.filter(c => c.type === 'url').length;
        const allTextsCount = contents.filter(c => c.type === 'text').length;
        const allTasksCount = contents.filter(c => c.type === 'task').length;
        const allForumsCount = contents.filter(c => c.type === 'forum').length;

        // El foro y una carpeta no cuentan para el progreso del curso (una
        // discusión abierta y un simple agrupador no tienen estado
        // "completado") — igual que en el servidor
        // (Content.recalculateCourseProgress), se excluyen del total para
        // que el % mostrado y la visibilidad del botón de certificado
        // coincidan con lo que realmente evalúa el backend.
        const progressTrackableContents = contents.filter(c => c.type !== 'forum' && c.type !== 'folder');
        const completedCount = progressTrackableContents.filter(c => c.completed).length;
        const progressPercent = progressTrackableContents.length > 0
            ? Math.round((completedCount / progressTrackableContents.length) * 100)
            : 0;

        // Estado de entrega de cada tarea (solo tiene sentido para un
        // estudiante inscrito — para admin/profesor/no-inscrito no se
        // pide, ya que no pueden entregar). Se pide para TODAS las tareas
        // del curso, estén o no dentro de una carpeta.
        const allTasks = contents.filter(c => c.type === 'task');
        let submissionsByTask = {};
        if (isLoggedIn && isEnrolled && allTasks.length > 0) {
            const submissionResponses = await Promise.all(allTasks.map(t => contentsAPI.getMySubmission(t.id)));
            allTasks.forEach((t, i) => { submissionsByTask[t.id] = submissionResponses[i].data; });
        }

        app.innerHTML = `
            <div class="bg-white border-b">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <a href="#/" class="text-cenat-green hover:underline text-sm">
                        <i class="fas fa-arrow-left mr-1"></i> Volver al catálogo
                    </a>
                </div>
            </div>

            <div class="bg-gradient-to-r from-cenat-green to-cenat-green-light py-10 px-4 sm:px-6 lg:px-8">
                <div class="max-w-7xl mx-auto">
                    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 class="text-3xl font-extrabold text-white mb-2">${escapeHtml(course.title)}</h1>
                            <p class="text-green-100">${escapeHtml(course.description || '')}</p>
                            <p class="text-green-200 text-sm mt-2">
                                <i class="fas fa-user-tie mr-1"></i> 
                                ${course.teacher_names ? escapeHtml(course.teacher_names) : 'LANBA - CeNAT'}
                            </p>
                        </div>
                        <div id="enroll-button-container">
                            ${renderEnrollButton(isLoggedIn, isEnrolled, course.id)}
                        </div>
                    </div>

                    ${isLoggedIn && isEnrolled && progressTrackableContents.length > 0 ? `
                        <div class="mt-6 bg-white/10 rounded-lg p-4">
                            <div class="flex justify-between text-sm text-white mb-1">
                                <span><i class="fas fa-chart-line mr-1"></i> Tu progreso</span>
                                <span id="course-progress-label">${progressPercent}% (${completedCount}/${progressTrackableContents.length})</span>
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
                        <h2 id="videos-section" class="text-xl font-bold text-gray-900 flex items-center scroll-mt-4">
                            <i class="fas fa-play-circle text-cenat-green mr-2"></i>
                            Videos del curso
                        </h2>

                        ${allVideos.length > 0 ? `
                            <div class="video-player-container mb-4" id="main-video-container">
                                ${hasAccess ? `
                                <video id="main-video" controls>
                                    <source src="${initialVideo.url}" type="video/mp4">
                                    Tu navegador no soporta la reproducción de video.
                                </video>
                                ` : `
                                <div class="flex flex-col items-center justify-center bg-gray-100 rounded-lg py-16 text-center">
                                    <i class="fas fa-lock text-4xl text-gray-400 mb-3"></i>
                                    <p class="text-gray-600 font-medium">Inscríbete en este curso para ver los videos</p>
                                </div>
                                `}
                            </div>
                            <h3 id="current-video-title" class="text-lg font-semibold text-gray-800">${escapeHtml(initialVideo.title)}</h3>
                            <p class="text-gray-600 text-sm mb-4">${escapeHtml(initialVideo.description || '')}</p>

                            ${videos.length > 0 ? `
                                <div class="space-y-2">
                                    ${videos.map((video, index) => renderContentRow(video, index === 0, isLoggedIn && isEnrolled, 'video', hasAccess)).join('')}
                                </div>
                            ` : `
                                <p class="text-sm text-gray-400">Los videos de este curso están agrupados en una carpeta — bajá hasta "Contenido" para verlos y elegir cuál reproducir.</p>
                            `}
                        ` : `
                            <div class="empty-state bg-white rounded-xl border border-gray-100">
                                <i class="fas fa-video-slash"></i>
                                <p class="text-gray-600">Este curso aún no tiene videos disponibles</p>
                            </div>
                        `}

                        ${mixedItems.length > 0 ? `
                            <h2 class="text-xl font-bold text-gray-900 flex items-center mt-8">
                                <i class="fas fa-list text-cenat-green mr-2"></i>
                                Contenido
                            </h2>
                            <div class="space-y-3">
                                ${mixedItems.map(item => `
                                    <div id="content-anchor-${item.id}" class="scroll-mt-4">
                                        ${item.type === 'folder'
                                            ? renderCourseFolderCard(item, contents, hasAccess, isLoggedIn && isEnrolled, submissionsByTask)
                                            : renderContentItemByType(item, isLoggedIn && isEnrolled, hasAccess, submissionsByTask[item.id])
                                        }
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Columna lateral -->
                    <div class="space-y-6">
                        <!-- Card de información -->
                        <div class="bg-green-50 rounded-xl p-4 border border-green-100">
                            <h3 class="font-semibold text-gray-900 mb-2">
                                <i class="fas fa-info-circle text-cenat-green mr-1"></i>
                                Información del curso
                            </h3>
                            <ul class="text-sm text-gray-600 space-y-1">
                                ${renderCourseInfoLink('fa-video', allVideosCount, 'videos', 'videos-section')}
                                ${renderCourseInfoLink('fa-file', allFilesCount, 'archivos', anchorForType(contents, 'file'))}
                                ${allUrlsCount > 0 ? renderCourseInfoLink('fa-link', allUrlsCount, 'videos externos', anchorForType(contents, 'url')) : ''}
                                ${allTextsCount > 0 ? renderCourseInfoLink('fa-align-left', allTextsCount, 'lecturas', anchorForType(contents, 'text')) : ''}
                                ${allTasksCount > 0 ? renderCourseInfoLink('fa-tasks', allTasksCount, 'tareas', anchorForType(contents, 'task')) : ''}
                                ${allForumsCount > 0 ? renderCourseInfoLink('fa-comments', allForumsCount, 'foros', anchorForType(contents, 'forum')) : ''}
                                ${folders.length > 0 ? renderCourseInfoLink('fa-folder', folders.length, 'carpetas', anchorForType(contents, 'folder')) : ''}
                                <li><i class="fas fa-users mr-2 text-gray-400"></i>${course.enrolled_count || 0} inscritos</li>
                            </ul>
                        </div>

                        ${isLoggedIn && isEnrolled && progressPercent === 100 ? `
                            <button onclick="downloadCertificate(${course.id})" class="btn-cenat w-full">
                                <i class="fas fa-certificate mr-2"></i> Descargar certificado
                            </button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        // Click en videos de la lista (cambia el reproductor principal)
        document.querySelectorAll('.video-item').forEach(item => {
            item.addEventListener('click', function(e) {
                // Si el click fue en el checkbox, no cambiar el video
                if (e.target.closest('.content-checkbox')) return;

                // Un video dentro de una carpeta también tiene esta clase
                // (ver renderContentItemByType) y ahora comparte el mismo
                // reproductor grande de arriba (ver allVideos/initialVideo
                // más arriba) — este chequeo solo protege el caso de un
                // curso sin ningún video (ni sin acceso), donde #main-video
                // ni se dibuja.
                const mainVideo = document.getElementById('main-video');
                if (!mainVideo) return;

                const url = this.dataset.url;
                const title = this.dataset.title;

                mainVideo.querySelector('source').src = url;
                mainVideo.load();
                mainVideo.play();
                document.getElementById('current-video-title').textContent = title;

                document.querySelectorAll('.video-item').forEach(v => {
                    v.classList.remove('border-cenat-green', 'bg-green-50');
                    v.classList.add('border-gray-200');
                });
                this.classList.add('border-cenat-green', 'bg-green-50');
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

        // Formularios de entrega de tareas
        setupTaskSubmitForms(course.id);

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

/**
 * Id del anchor (ver "content-anchor-${id}" en el renderizado de
 * mixedItems y de renderCourseFolderCard) del PRIMER contenido de un tipo
 * dado, en cualquier lugar del curso (a nivel superior o dentro de una
 * carpeta). Es lo que hace clickeable la tarjeta "Información del curso":
 * clickear "3 foros" baja hasta el primer foro, sin importar si está
 * suelto o adentro de una carpeta.
 */
function anchorForType(contents, type) {
    const found = contents.find(c => c.type === type);
    return found ? `content-anchor-${found.id}` : null;
}

/**
 * Un renglón de la tarjeta "Información del curso": clickeable (baja hasta
 * targetId con scroll suave) solo cuando efectivamente hay algo a dónde
 * bajar — si targetId viene null (ej. 0 archivos) se muestra como texto
 * plano, igual que antes.
 */
function renderCourseInfoLink(icon, count, label, targetId) {
    if (!targetId) {
        return `<li><i class="fas ${icon} mr-2 text-gray-400"></i>${count} ${label}</li>`;
    }
    return `
        <li>
            <button onclick="scrollToElement('${targetId}')" class="text-left hover:text-cenat-green hover:underline transition">
                <i class="fas ${icon} mr-2 text-gray-400"></i>${count} ${label}
            </button>
        </li>
    `;
}

function renderContentRow(content, isActiveVideo, canTrackProgress, type, hasAccess) {
    const icon = type === 'video' ? 'fa-play-circle' : getFileIcon(content.url || '');
    const isVideo = type === 'video';
    const completed = content.completed || false;
    // Solo es clickeable (para reproducir) si es video Y hay acceso real
    const clickable = isVideo && hasAccess;

    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border ${isActiveVideo && hasAccess ? 'border-cenat-green bg-green-50' : 'border-gray-200'} ${clickable ? 'hover:bg-green-50 cursor-pointer video-item' : ''} transition"
             ${clickable ? `data-url="${content.url}" data-title="${escapeHtml(content.title)}"` : ''}>
            
            ${canTrackProgress ? `
                <button class="content-checkbox flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-cenat-green'}"
                    data-content-id="${content.id}" data-completed="${completed == 1 || completed === true ? 'true' : 'false'}" title="${completed ? 'Marcar como pendiente' : 'Marcar como completado'}">
                    ${completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                </button>
            ` : ''}

            <i class="fas ${hasAccess ? icon : 'fa-lock'} text-xl ${hasAccess ? 'text-cenat-green' : 'text-gray-400'}"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate ${completed ? 'line-through text-gray-400' : ''}">${escapeHtml(content.title)}</p>
                ${content.file_size ? `<p class="text-xs text-gray-500">${formatFileSize(content.file_size)}</p>` : ''}
            </div>
            ${!isVideo ? (hasAccess ? `
                <button onclick="downloadContent(${content.id})" class="text-cenat-green hover:text-cenat-green-hover">
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

function renderUrlContentRow(content, canTrackProgress, hasAccess) {
    const completed = content.completed || false;
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 transition">
            ${canTrackProgress ? `
                <button class="content-checkbox flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-cenat-green'}"
                    data-content-id="${content.id}" data-completed="${completed == 1 || completed === true ? 'true' : 'false'}" title="${completed ? 'Marcar como pendiente' : 'Marcar como completado'}">
                    ${completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                </button>
            ` : ''}
            <i class="fas ${hasAccess ? 'fa-link' : 'fa-lock'} text-xl ${hasAccess ? 'text-cenat-green' : 'text-gray-400'}"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate ${completed ? 'line-through text-gray-400' : ''}">${escapeHtml(content.title)}</p>
                ${content.description ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(content.description)}</p>` : ''}
            </div>
            ${hasAccess ? `
                <a href="${content.url}" target="_blank" rel="noopener noreferrer" class="text-cenat-green hover:text-cenat-green-hover" title="Abrir video externo">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            ` : `
                <span class="text-gray-400 text-xs" title="Inscríbete para ver">
                    <i class="fas fa-lock"></i>
                </span>
            `}
        </div>
    `;
}

function renderTextContentCard(content, canTrackProgress, hasAccess) {
    const completed = content.completed || false;
    return `
        <div class="bg-white rounded-xl border border-gray-100 p-4">
            <div class="flex items-start gap-3">
                ${canTrackProgress ? `
                    <button class="content-checkbox flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition mt-1 ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-cenat-green'}"
                        data-content-id="${content.id}" data-completed="${completed == 1 || completed === true ? 'true' : 'false'}" title="${completed ? 'Marcar como pendiente' : 'Marcar como completado'}">
                        ${completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                    </button>
                ` : ''}
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 ${completed ? 'line-through text-gray-400' : ''}">${escapeHtml(content.title)}</p>
                    ${hasAccess
                        ? `<p class="text-sm text-gray-600 mt-2 whitespace-pre-line">${escapeHtml(content.description || '')}</p>`
                        : `<p class="text-sm text-gray-400 mt-2"><i class="fas fa-lock mr-1"></i> Inscríbete en este curso para ver esta lectura</p>`
                    }
                </div>
            </div>
        </div>
    `;
}

function renderForumCard(forum, hasAccess) {
    if (!hasAccess) {
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center gap-3">
                    <i class="fas fa-lock text-xl text-gray-400"></i>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900">${escapeHtml(forum.title)}</p>
                        <p class="text-sm text-gray-400 mt-1">Inscríbete en este curso para participar en este foro</p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="bg-white rounded-xl border border-gray-100 p-4">
            <div class="flex items-start gap-3">
                <i class="fas fa-comments text-xl text-cenat-green mt-1"></i>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900">${escapeHtml(forum.title)}</p>
                    <p class="text-sm text-gray-600 mt-1 line-clamp-2 whitespace-pre-line">${escapeHtml(forum.description || '')}</p>
                    <a href="#/forum/${forum.id}" class="text-sm text-cenat-green hover:text-cenat-green-hover mt-2 inline-block">
                        <i class="fas fa-comment-dots mr-1"></i> Participar en el foro
                    </a>
                </div>
            </div>
        </div>
    `;
}

/**
 * Dispatcher: cada tipo de contenido dentro de una carpeta se dibuja con
 * el mismo renderer que ya se usa fuera de carpetas — reutilizarlos evita
 * duplicar el marcado, y los listeners globales (checkbox de progreso,
 * click para reproducir video, formulario de entrega de tarea) ya
 * funcionan solos porque se enganchan por clase/atributo en todo el
 * documento, no por contenedor.
 */
function renderContentItemByType(content, canTrackProgress, hasAccess, submission) {
    switch (content.type) {
        case 'video':
            return renderContentRow(content, false, canTrackProgress, 'video', hasAccess);
        case 'file':
            return renderContentRow(content, false, canTrackProgress, 'file', hasAccess);
        case 'url':
            return renderUrlContentRow(content, canTrackProgress, hasAccess);
        case 'text':
            return renderTextContentCard(content, canTrackProgress, hasAccess);
        case 'task':
            return renderTaskCard(content, submission, hasAccess);
        case 'forum':
            return renderForumCard(content, hasAccess);
        default:
            return '';
    }
}

function renderCourseFolderCard(folder, allContents, hasAccess, canTrackProgress, submissionsByTask) {
    if (!hasAccess) {
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center gap-3">
                    <i class="fas fa-lock text-xl text-gray-400"></i>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900">${escapeHtml(folder.title)}</p>
                        <p class="text-sm text-gray-400 mt-1">Inscríbete en este curso para ver el contenido de esta carpeta</p>
                    </div>
                </div>
            </div>
        `;
    }

    const items = allContents.filter(c => c.folder_id === folder.id);
    // El foro no tiene estado "completado" (ver progressTrackableContents
    // más arriba) — se deja fuera del conteo de la carpeta por la misma
    // razón. Así el badge de "completada" es consistente con el % de
    // progreso general del curso.
    const trackableItems = items.filter(c => c.type !== 'forum');
    const completedItems = trackableItems.filter(c => c.completed).length;
    const allCompleted = canTrackProgress && trackableItems.length > 0 && completedItems === trackableItems.length;

    return `
        <details id="folder-details-${folder.id}" data-folder-id="${folder.id}" class="bg-white rounded-xl border ${allCompleted ? 'border-green-200' : 'border-gray-100'} overflow-hidden" open>
            <summary class="cursor-pointer list-none p-4 flex items-center gap-3">
                <i id="folder-icon-${folder.id}" class="fas ${allCompleted ? 'fa-folder text-green-500' : 'fa-folder-open text-cenat-green'} text-xl"></i>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900">${escapeHtml(folder.title)}</p>
                    <p class="text-xs text-gray-400">${items.length} ${items.length === 1 ? 'elemento' : 'elementos'}</p>
                </div>
                <span id="folder-badge-${folder.id}" class="flex-shrink-0">${renderFolderBadgeContent(canTrackProgress, trackableItems.length, completedItems, allCompleted)}</span>
            </summary>
            <div class="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                ${items.length > 0 ? items.map(item => `
                    <div id="content-anchor-${item.id}" class="scroll-mt-4">
                        ${renderContentItemByType(item, canTrackProgress, hasAccess, submissionsByTask[item.id])}
                    </div>
                `).join('') : `
                    <p class="text-gray-500 text-sm text-center py-2">Esta carpeta todavía no tiene contenido</p>
                `}
            </div>
        </details>
    `;
}

/**
 * El contenido del badge de "completada"/"X de Y" en el encabezado de una
 * carpeta — factorizado porque se necesita tanto al renderizar la página
 * como al refrescarlo en el sitio después de tildar un checkbox (ver
 * refreshFolderBadge), sin duplicar el markup en los dos lugares.
 */
function renderFolderBadgeContent(canTrackProgress, trackableCount, completedCount, allCompleted) {
    if (!canTrackProgress || trackableCount === 0) return '';

    if (allCompleted) {
        return `
            <span class="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                <i class="fas fa-check-circle"></i> Completada
            </span>
        `;
    }

    return `<span class="text-xs text-gray-400">${completedCount}/${trackableCount} completado${completedCount === 1 ? '' : 's'}</span>`;
}

function renderTaskCard(task, submission, hasAccess) {
    if (!hasAccess) {
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center gap-3">
                    <i class="fas fa-lock text-xl text-gray-400"></i>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900">${escapeHtml(task.title)}</p>
                        <p class="text-sm text-gray-400 mt-1">Inscríbete en este curso para ver y entregar esta tarea</p>
                    </div>
                </div>
            </div>
        `;
    }

    const hasInstructionsFile = !!task.url;
    const isSubmitted = !!submission;
    const isReviewed = isSubmitted && !!submission.reviewed_at;

    return `
        <div class="bg-white rounded-xl border border-gray-100 p-4">
            <div class="flex items-start gap-3">
                <i class="fas fa-tasks text-xl text-cenat-green mt-1"></i>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900">${escapeHtml(task.title)}</p>
                    ${task.description ? `<p class="text-sm text-gray-600 mt-1 whitespace-pre-line">${escapeHtml(task.description)}</p>` : ''}
                    ${hasInstructionsFile ? `
                        <button onclick="downloadContent(${task.id})" class="text-sm text-cenat-green hover:text-cenat-green-hover mt-2 inline-block">
                            <i class="fas fa-download mr-1"></i> Descargar instrucciones
                        </button>
                    ` : ''}

                    <div class="mt-3">
                        ${isSubmitted ? `
                            <div class="bg-green-50 rounded-lg p-3">
                                <p class="text-sm text-green-700 font-medium">
                                    <i class="fas fa-check-circle mr-1"></i>
                                    ${isReviewed ? 'Entrega revisada' : 'Entregado — pendiente de revisión'}
                                </p>
                                <p class="text-xs text-gray-500 mt-1">Entregado el ${formatDateTime(submission.submitted_at)}</p>
                                ${isReviewed && submission.feedback ? `
                                    <p class="text-sm text-gray-700 mt-2"><strong>Comentario del profesor:</strong> ${escapeHtml(submission.feedback)}</p>
                                ` : ''}
                            </div>
                        ` : `
                            <form class="task-submit-form flex items-center gap-2" data-task-id="${task.id}">
                                <input type="file" class="task-submit-file text-sm flex-1" required>
                                <button type="submit" class="bg-cenat-green text-white px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap">
                                    <i class="fas fa-upload mr-1"></i> Entregar
                                </button>
                            </form>
                            <p class="text-xs text-gray-400 mt-1">Solo puedes entregar una vez — revisa el archivo antes de subirlo.</p>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function setupTaskSubmitForms(courseId) {
    document.querySelectorAll('.task-submit-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const taskId = form.dataset.taskId;
            const fileInput = form.querySelector('.task-submit-file');
            const file = fileInput.files[0];

            if (!file) {
                showToast('Selecciona un archivo para entregar', 'error');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const formData = new FormData();
            formData.append('file', file);

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                const response = await contentsAPI.submit(taskId, formData);
                showToast('Tarea entregada exitosamente', 'success');
                await renderCourseDetail({ id: courseId });

                // Igual que al tildar un checkbox (ver toggleContentCompleted):
                // si esta entrega era lo último que faltaba para el 100%, debe
                // salir la misma celebración. El backend ya devuelve el
                // progreso recalculado en la respuesta de /submit (ver
                // submission.controller.js), pero acá se estaba ignorando —
                // por eso completar el curso entregando una tarea (en vez de
                // tildar un checkbox) se quedaba sin el anuncio, aunque la
                // barra de progreso y el botón de certificado sí se
                // actualizaban bien.
                if (response.data.progress === 100) {
                    showCourseCompletionModal(courseId);
                }

            } catch (error) {
                showToast(error.message || 'Error al entregar la tarea', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-upload mr-1"></i> Entregar';
            }
        });
    });
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
                checkbox.classList.remove('border-gray-300', 'hover:border-cenat-green');
                checkbox.classList.add('bg-green-500', 'border-green-500');
                checkbox.innerHTML = '<i class="fas fa-check text-white text-xs"></i>';
                checkbox.title = 'Marcar como pendiente';
                const titleEl = checkbox.closest('div').querySelector('p');
                if (titleEl) titleEl.classList.add('line-through', 'text-gray-400');
            } else {
                checkbox.classList.add('border-gray-300', 'hover:border-cenat-green');
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

        // Si este contenido vive dentro de una carpeta, su badge de
        // "completada"/"X de Y" no se actualiza solo con lo de arriba (se
        // calculó una sola vez al renderizar la página) — hay que
        // recalcularlo. No sabemos el folder_id de antemano acá, así que
        // se resuelve subiendo desde el checkbox hasta su <details>.
        const folderDetails = checkbox ? checkbox.closest('details[data-folder-id]') : null;
        if (folderDetails) {
            await refreshFolderBadge(folderDetails.dataset.folderId, courseId);
        }

        // Toast + celebración si llegó al 100%
        if (markAsCompleted && newProgress === 100) {
            showCourseCompletionModal(courseId);
        } else {
            showToast(markAsCompleted ? 'Contenido marcado como completado' : 'Contenido marcado como pendiente', 'success');
        }

    } catch (error) {
        showToast(error.message || 'Error al actualizar el progreso', 'error');
    }
}

/**
 * Recalcula el badge de una carpeta (X/Y completados, o "Completada")
 * pidiendo el contenido fresco del curso — el checkbox recién tildado ya
 * actualizó su propio estado visual, pero el conteo de la carpeta necesita
 * mirar TODOS sus items (incluye tareas, que no tienen checkbox propio:
 * se completan al entregar, no clickeando acá).
 */
async function refreshFolderBadge(folderId, courseId) {
    try {
        const contentsResponse = await contentsAPI.getByCourse(courseId);
        const contents = contentsResponse.data || [];
        const items = contents.filter(c => String(c.folder_id) === String(folderId));
        const trackableItems = items.filter(c => c.type !== 'forum');
        const completedItems = trackableItems.filter(c => c.completed).length;
        const allCompleted = trackableItems.length > 0 && completedItems === trackableItems.length;

        const badgeEl = document.getElementById(`folder-badge-${folderId}`);
        if (badgeEl) badgeEl.innerHTML = renderFolderBadgeContent(true, trackableItems.length, completedItems, allCompleted);

        const detailsEl = document.getElementById(`folder-details-${folderId}`);
        if (detailsEl) {
            detailsEl.classList.toggle('border-green-200', allCompleted);
            detailsEl.classList.toggle('border-gray-100', !allCompleted);
        }

        const iconEl = document.getElementById(`folder-icon-${folderId}`);
        if (iconEl) {
            iconEl.classList.toggle('fa-folder', allCompleted);
            iconEl.classList.toggle('fa-folder-open', !allCompleted);
            iconEl.classList.toggle('text-green-500', allCompleted);
            iconEl.classList.toggle('text-cenat-green', !allCompleted);
        }
    } catch (error) {
        // No crítico: el checkbox y la barra general ya quedaron
        // actualizados. Si esto falla, el badge de la carpeta queda
        // desactualizado hasta la próxima recarga, sin romper el resto.
        console.error('Error al refrescar el estado de la carpeta:', error);
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
            <button id="unenroll-btn" class="bg-white text-cenat-green px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                <i class="fas fa-check-circle mr-2"></i> Inscrito
            </button>
        `;
    }

    return `
        <button id="enroll-btn" class="bg-white text-cenat-green px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
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

async function downloadCertificate(courseId) {
    try {
        await coursesAPI.downloadCertificate(courseId);
    } catch (error) {
        showToast(error.message || 'Error al descargar el certificado', 'error');
    }
}

window.downloadContent = downloadContent;
window.downloadCertificate = downloadCertificate;
window.getFileIcon = getFileIcon;

// =================================
// Celebración al completar el 100%
// =================================

function showCourseCompletionModal(courseId) {
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

            <div class="flex flex-col gap-3">
                <button onclick="downloadCertificate(${courseId})" class="btn-cenat">
                    <i class="fas fa-certificate mr-2"></i> Descargar certificado
                </button>
                <div class="flex gap-3 justify-center">
                    <button onclick="closeCompletionModal()" class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                        <i class="fas fa-check mr-2"></i> ¡Entendido!
                    </button>
                    <a href="#/" onclick="closeCompletionModal()" class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                        Ver más cursos
                    </a>
                </div>
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
    const colors = ['#007031', '#22c55e', '#84cc16', '#f59e0b', '#ef4444'];
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