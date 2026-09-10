/**
 * Views - Detalle de Curso
 */

window.renderCourseDetail = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    // Si se navega rápido (ej. de un curso a otro antes de que termine de
    // cargar el primero), esta llamada a renderCourseDetail queda obsoleta
    // a mitad de sus varios awaits — sin este chequeo, su contenido podía
    // terminar de cargar DESPUÉS y pisar la vista del curso al que se
    // navegó después.
    const myNavToken = getNavToken();

    try {
        const response = await coursesAPI.getById(params.id);
        const course = response.data;

        if (!course) {
            app.innerHTML = `
                <div class="min-h-screen flex items-center justify-center">
                    <div class="text-center">
                        <i class="fas fa-exclamation-triangle text-5xl text-yellow-500 mb-4"></i>
                        <p class="text-xl text-gray-600">${t('courseDetail.not_found')}</p>
                        <a href="#/" class="btn-cenat mt-4 inline-block">${t('courseDetail.back_to_home')}</a>
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

        // Módulos de este curso (cursos hijo completos, con su propia
        // portada/título/profesor) — endpoint público, igual que el resto
        // del detalle del curso, para que hasta un guest los vea antes de
        // registrarse. Un curso hijo nunca tiene sus propios módulos (ver
        // courseModule.controller.js#createModule), así que ahí esto
        // siempre resuelve vacío sin necesitar un chequeo aparte acá.
        let courseModules = [];
        try {
            const modulesResponse = await courseModulesAPI.getByCourse(course.id);
            courseModules = modulesResponse.data || [];
        } catch (error) {
            console.error('Error al cargar los módulos del curso:', error);
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
        const allImagesCount = contents.filter(c => c.type === 'image').length;
        const allUrlsCount = contents.filter(c => c.type === 'url').length;
        const allTextsCount = contents.filter(c => c.type === 'text').length;
        const allTasksCount = contents.filter(c => c.type === 'task').length;
        const allQuizzesCount = contents.filter(c => c.type === 'quiz').length;
        const allSurveysCount = contents.filter(c => c.type === 'survey').length;
        const allForumsCount = contents.filter(c => c.type === 'forum').length;

        // Una carpeta y una imagen no cuentan para el progreso del curso
        // (agrupador / decoración, ninguna tiene estado "completado" real)
        // — igual que en el servidor (Content.recalculateCourseProgress),
        // se excluyen del total para que el % mostrado y la visibilidad
        // del botón de certificado coincidan con lo que realmente evalúa
        // el backend. El foro SÍ cuenta: participar con un post lo marca
        // completado (ver forum.controller.js createPost).
        const progressTrackableContents = contents.filter(c => c.type !== 'folder' && c.type !== 'image');
        const completedCount = progressTrackableContents.filter(c => c.completed).length;
        const progressPercent = progressTrackableContents.length > 0
            ? Math.round((completedCount / progressTrackableContents.length) * 100)
            : 0;

        // La barra de progreso/gating del certificado que se MUESTRA usa el
        // `enrollment` que ya manda el servidor (getCourseById), resuelto
        // en la raíz y combinado con todos los cursos hijo de sus módulos
        // si aplica (ver Course.resolveEnrollmentRoot/Content.calculateGroupProgress)
        // — el cálculo de arriba con SOLO los `contents` de esta página
        // subestimaría el progreso real en un curso padre con módulos, o
        // mostraría 100%/certificado disponible en un curso hijo cuando el
        // certificado real cuelga del padre. Si no hay inscripción (no
        // logueado o no inscrito), no hay `enrollment` y no importa: esa
        // sección ni se muestra.
        const enrollment = course.enrollment || null;
        const displayProgressPercent = enrollment ? enrollment.progress : progressPercent;
        const displayTotal = enrollment && enrollment.total != null ? enrollment.total : progressTrackableContents.length;
        const displayCompleted = enrollment && enrollment.completed != null ? enrollment.completed : completedCount;
        // Curso al que en realidad pertenecen la inscripción/progreso/
        // certificado — el propio curso, salvo que ESTE sea un curso hijo
        // de un módulo (ver getCourseById), en cuyo caso es su padre.
        const enrollmentCourseId = course.parent_course_id || course.id;

        // Estado de entrega de cada tarea: viene incluido directamente en
        // cada content (`my_submission`, ver Content.findByCourseWithProgress)
        // cuando hay sesión — ya no hace falta un GET
        // /contents/:id/submission por cada tarea del curso (antes, un
        // curso con N tareas disparaba N peticiones en paralelo solo para
        // esto).
        const allTasks = contents.filter(c => c.type === 'task');
        const submissionsByTask = {};
        allTasks.forEach(t => { submissionsByTask[t.id] = t.my_submission; });

        // Igual que arriba con las tareas: si ya respondió, se necesita
        // saber para no mostrarle el formulario de nuevo (un solo intento).
        const allQuizzes = contents.filter(c => c.type === 'quiz' || c.type === 'survey');
        let quizStatusById = {};
        if (isLoggedIn && isEnrolled && allQuizzes.length > 0) {
            const quizResponses = await Promise.all(allQuizzes.map(q => contentsAPI.getQuestions(q.id)));
            allQuizzes.forEach((q, i) => { quizStatusById[q.id] = quizResponses[i].data; });
        }

        if (myNavToken !== getNavToken()) return;

        // Si este curso es hijo de un módulo, "volver" debe ir al curso
        // padre (de donde efectivamente se llegó, vía el selector de
        // módulos) en vez del catálogo general — se pierde el contexto si
        // no. `course.parent_course_id`/`parent_course_title` ya vienen
        // poblados por el backend cuando aplica (ver Course.findById).
        const backHref = course.parent_course_id ? `#/course/${course.parent_course_id}` : '#/';
        const backLabel = course.parent_course_id
            ? t('courseDetail.back_to_parent', { title: escapeHtml(course.parent_course_title) })
            : t('courseDetail.back_to_catalog');

        app.innerHTML = `
            <div class="bg-white border-b">
                <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <a href="${backHref}" class="text-cenat-green hover:underline text-sm">
                        <i class="fas fa-arrow-left mr-1"></i> ${backLabel}
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
                            ${renderEnrollButton(isLoggedIn, isEnrolled, course.id, course.parent_course_title)}
                        </div>
                    </div>

                    ${isLoggedIn && isEnrolled && displayTotal > 0 ? `
                        <div class="mt-6 bg-white/10 rounded-lg p-4">
                            <div class="flex justify-between text-sm text-white mb-1">
                                <span><i class="fas fa-chart-line mr-1"></i> ${t('courseDetail.your_progress')}</span>
                                <span id="course-progress-label">${displayProgressPercent}% (${displayCompleted}/${displayTotal})</span>
                            </div>
                            <div class="progress-bar bg-white/20">
                                <div id="course-progress-fill" class="progress-fill" style="width: ${displayProgressPercent}%"></div>
                            </div>
                        </div>
                    ` : ''}

                    ${isLoggedIn && isEnrolled && displayProgressPercent === 100 ? `
                        <button onclick="downloadCertificate(${enrollmentCourseId})" class="btn-cenat w-full mt-4 lg:hidden">
                            <i class="fas fa-certificate mr-2"></i> ${t('courseDetail.download_certificate')}
                        </button>
                    ` : ''}
                </div>
            </div>

            ${renderPublicCourseModulesHTML(courseModules)}

            <div class="courses-bg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <!-- Columna principal: Videos -->
                    <div class="lg:col-span-2 space-y-6">
                        ${allVideos.length > 0 ? `
                            <h2 id="videos-section" class="text-xl font-bold text-gray-900 flex items-center scroll-mt-4">
                                <i class="fas fa-play-circle text-cenat-green mr-2"></i>
                                ${t('courseDetail.videos_of_course')}
                            </h2>

                            <div class="video-player-container mb-4" id="main-video-container">
                                ${hasAccess ? `
                                <video id="main-video" controls>
                                    <source src="${escapeAttr(initialVideo.url)}" type="video/mp4">
                                    ${t('courseDetail.video_not_supported')}
                                </video>
                                ` : `
                                <div class="flex flex-col items-center justify-center bg-gray-100 rounded-lg py-16 text-center">
                                    <i class="fas fa-lock text-4xl text-gray-400 mb-3"></i>
                                    <p class="text-gray-600 font-medium">${t('courseDetail.enroll_to_watch')}</p>
                                </div>
                                `}
                            </div>
                            <div class="bg-white rounded-lg border border-gray-100 p-3 mb-4">
                                <h3 id="current-video-title" class="text-lg font-semibold text-gray-800">${escapeHtml(initialVideo.title)}</h3>
                                <p class="text-gray-600 text-sm">${escapeHtml(initialVideo.description || '')}</p>
                            </div>

                            ${videos.length > 0 ? `
                                <div class="space-y-2">
                                    ${videos.map((video, index) => renderContentRow(video, index === 0, isLoggedIn && isEnrolled, 'video', hasAccess)).join('')}
                                </div>
                            ` : `
                                <div class="bg-white rounded-lg border border-gray-100 p-3">
                                    <p class="text-sm text-gray-500">${t('courseDetail.videos_grouped_notice')}</p>
                                </div>
                            `}
                        ` : ''}

                        ${mixedItems.length > 0 ? `
                            <h2 class="text-xl font-bold text-gray-900 flex items-center ${allVideos.length > 0 ? 'mt-8' : ''}">
                                <i class="fas fa-list text-cenat-green mr-2"></i>
                                ${t('courseDetail.content_heading')}
                            </h2>
                            <div class="space-y-3">
                                ${mixedItems.map(item => `
                                    <div id="content-anchor-${item.id}" class="scroll-mt-4">
                                        ${item.type === 'folder'
                                            ? renderCourseFolderCard(item, contents, hasAccess, isLoggedIn && isEnrolled, submissionsByTask, quizStatusById)
                                            : renderContentItemByType(item, isLoggedIn && isEnrolled, hasAccess, submissionsByTask[item.id], quizStatusById[item.id])
                                        }
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}

                        ${allVideos.length === 0 && mixedItems.length === 0 ? `
                            <div class="empty-state bg-white rounded-xl border border-gray-100">
                                <i class="fas fa-inbox"></i>
                                <p class="text-gray-600">${t('courseDetail.no_content_yet')}</p>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Columna lateral -->
                    <div class="space-y-6">
                        <!-- Card de información -->
                        <div class="bg-green-50 rounded-xl p-4 border border-green-100">
                            <h3 class="font-semibold text-gray-900 mb-2">
                                <i class="fas fa-info-circle text-cenat-green mr-1"></i>
                                ${t('courseDetail.course_info_heading')}
                            </h3>
                            <ul class="text-sm text-gray-600 space-y-1">
                                ${allVideosCount > 0 ? renderCourseInfoLink('fa-video', allVideosCount, t('courseDetail.info_videos'), 'videos-section') : ''}
                                ${allFilesCount > 0 ? renderCourseInfoLink('fa-file', allFilesCount, t('courseDetail.info_files'), anchorForType(contents, 'file')) : ''}
                                ${allImagesCount > 0 ? renderCourseInfoLink('fa-image', allImagesCount, t('courseDetail.info_images'), anchorForType(contents, 'image')) : ''}
                                ${allUrlsCount > 0 ? renderCourseInfoLink('fa-link', allUrlsCount, t('courseDetail.info_external_videos'), anchorForType(contents, 'url')) : ''}
                                ${allTextsCount > 0 ? renderCourseInfoLink('fa-align-left', allTextsCount, t('courseDetail.info_readings'), anchorForType(contents, 'text')) : ''}
                                ${allTasksCount > 0 ? renderCourseInfoLink('fa-tasks', allTasksCount, t('courseDetail.info_tasks'), anchorForType(contents, 'task')) : ''}
                                ${allQuizzesCount > 0 ? renderCourseInfoLink('fa-question-circle', allQuizzesCount, t('courseDetail.info_quizzes'), anchorForType(contents, 'quiz')) : ''}
                                ${allSurveysCount > 0 ? renderCourseInfoLink('fa-poll', allSurveysCount, t('courseDetail.info_surveys'), anchorForType(contents, 'survey')) : ''}
                                ${allForumsCount > 0 ? renderCourseInfoLink('fa-comments', allForumsCount, t('courseDetail.info_forums'), anchorForType(contents, 'forum')) : ''}
                                ${folders.length > 0 ? renderCourseInfoLink('fa-folder', folders.length, t('courseDetail.info_folders'), anchorForType(contents, 'folder')) : ''}
                                <li><i class="fas fa-users mr-2 text-gray-400"></i>${t('home.enrolled_count', { count: course.enrolled_count || 0 })}</li>
                            </ul>
                        </div>

                        ${isLoggedIn && isEnrolled && displayProgressPercent === 100 ? `
                            <button onclick="downloadCertificate(${enrollmentCourseId})" class="btn-cenat w-full hidden lg:block">
                                <i class="fas fa-certificate mr-2"></i> ${t('courseDetail.download_certificate')}
                            </button>
                        ` : ''}
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
                await toggleContentCompleted(contentId, !isCompleted, course.id, enrollmentCourseId);
                this.disabled = false;
            });
        });

        // Botón de inscripción
        setupEnrollButton(enrollmentCourseId, course.id);

        // Formularios de entrega de tareas
        setupTaskSubmitForms(course.id, enrollmentCourseId);

        // Reproductores de video externo (YouTube) con detección de error
        initYoutubeEmbeds();

    } catch (error) {
        console.error('Error loading course:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">${t('courseDetail.load_failed')}</p>
                    <a href="#/" class="btn-cenat mt-4 inline-block">${t('courseDetail.back_to_home')}</a>
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
        <div class="flex items-center gap-3 p-3 rounded-lg border ${isActiveVideo && hasAccess ? 'border-cenat-green bg-green-50' : 'border-gray-200 bg-white'} ${clickable ? 'hover:bg-green-50 cursor-pointer video-item' : ''} transition"
             ${clickable ? `data-url="${escapeAttr(content.url)}" data-title="${escapeAttr(content.title)}"` : ''}>
            
            ${canTrackProgress ? `
                <button class="content-checkbox flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-cenat-green'}"
                    data-content-id="${content.id}" data-completed="${completed == 1 || completed === true ? 'true' : 'false'}" title="${escapeAttr(completed ? t('courseDetail.mark_as_pending') : t('courseDetail.mark_as_completed'))}">
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
                <span class="text-gray-400 text-xs" title="${escapeAttr(t('courseDetail.enroll_to_download'))}">
                    <i class="fas fa-lock"></i>
                </span>
            `) : ''}
        </div>
    `;
}

function renderUrlContentRow(content, canTrackProgress, hasAccess) {
    const completed = content.completed || false;
    // Si es un link de YouTube/Vimeo reconocible, se embebe directo en la
    // tarjeta en vez de solo dejar un link que abre en pestaña nueva. Si el
    // proveedor no se reconoce, se mantiene el comportamiento de antes.
    // YouTube usa la API oficial (ver initYoutubeEmbeds en utils.js) para
    // poder detectar cuándo un video no se puede reproducir ahí (el dueño
    // restringió la incrustación, o fue borrado) y mostrar un mensaje
    // propio en vez del cartel de error de YouTube. Vimeo se deja como
    // iframe plano — no se reportó el mismo problema ahí.
    const youtubeId = hasAccess ? getYoutubeVideoId(content.url) : null;
    const vimeoUrl = hasAccess && !youtubeId ? getVimeoEmbedUrl(content.url) : null;
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white transition">
            ${canTrackProgress ? `
                <button class="content-checkbox flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-cenat-green'}"
                    data-content-id="${content.id}" data-completed="${completed == 1 || completed === true ? 'true' : 'false'}" title="${escapeAttr(completed ? t('courseDetail.mark_as_pending') : t('courseDetail.mark_as_completed'))}">
                    ${completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                </button>
            ` : ''}
            <i class="fas ${hasAccess ? 'fa-link' : 'fa-lock'} text-xl ${hasAccess ? 'text-cenat-green' : 'text-gray-400'}"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate ${completed ? 'line-through text-gray-400' : ''}">${escapeHtml(content.title)}</p>
                ${content.description ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(content.description)}</p>` : ''}
            </div>
            ${hasAccess ? `
                <a href="${escapeAttr(content.url)}" target="_blank" rel="noopener noreferrer" class="text-cenat-green hover:text-cenat-green-hover" title="${escapeAttr(t('courseDetail.open_external_video'))}">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            ` : `
                <span class="text-gray-400 text-xs" title="${escapeAttr(t('courseDetail.enroll_to_watch_short'))}">
                    <i class="fas fa-lock"></i>
                </span>
            `}
        </div>
        ${youtubeId ? `
            <div data-embed-wrapper>
                <div class="video-player-container mt-2 mb-1">
                    <div id="yt-embed-${content.id}" data-yt-embed="${youtubeId}"></div>
                </div>
                <div data-embed-fallback class="hidden text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mt-2 mb-1">
                    <i class="fas fa-triangle-exclamation text-yellow-500 mr-1"></i>
                    ${t('courseDetail.video_cannot_embed')}
                </div>
            </div>
        ` : vimeoUrl ? `
            <div class="video-player-container mt-2 mb-1">
                <iframe src="${vimeoUrl}" title="${escapeAttr(content.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
        ` : ''}
    `;
}

function renderTextContentCard(content, canTrackProgress, hasAccess) {
    const completed = content.completed || false;
    return `
        <div class="bg-white rounded-xl border border-gray-100 p-4">
            <div class="flex items-start gap-3">
                ${canTrackProgress ? `
                    <button class="content-checkbox flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition mt-1 ${completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-cenat-green'}"
                        data-content-id="${content.id}" data-completed="${completed == 1 || completed === true ? 'true' : 'false'}" title="${escapeAttr(completed ? t('courseDetail.mark_as_pending') : t('courseDetail.mark_as_completed'))}">
                        ${completed ? '<i class="fas fa-check text-white text-xs"></i>' : ''}
                    </button>
                ` : ''}
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900 ${completed ? 'line-through text-gray-400' : ''}">${escapeHtml(content.title)}</p>
                    ${hasAccess
                        ? `<p class="text-sm text-gray-600 mt-2 whitespace-pre-line">${escapeHtml(content.description || '')}</p>`
                        : `<p class="text-sm text-gray-400 mt-2"><i class="fas fa-lock mr-1"></i> ${t('courseDetail.enroll_to_view_reading')}</p>`
                    }
                </div>
            </div>
        </div>
    `;
}

function renderImageContentCard(content, hasAccess) {
    if (!hasAccess) {
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center gap-3">
                    <i class="fas fa-lock text-xl text-gray-400"></i>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900">${escapeHtml(content.title)}</p>
                        <p class="text-sm text-gray-400 mt-1">${t('courseDetail.enroll_to_view_image')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    return `
        <div class="bg-white rounded-xl border border-gray-100 p-4">
            <div class="flex items-start gap-3">
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900">${escapeHtml(content.title)}</p>
                    ${content.description ? `<p class="text-sm text-gray-600 mt-1 whitespace-pre-line">${escapeHtml(content.description)}</p>` : ''}
                    <img src="${escapeAttr(content.url)}" alt="${escapeAttr(content.title)}" class="w-full rounded-lg mt-3" loading="lazy">
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
                        <p class="text-sm text-gray-400 mt-1">${t('courseDetail.enroll_to_join_forum')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    // Participar (crear un post propio) marca el foro como completado en
    // el servidor (ver forum.controller.js createPost) — igual que
    // entregar una tarea o responder un cuestionario, cuenta para el
    // progreso del curso.
    const hasParticipated = forum.completed || false;

    return `
        <div class="bg-white rounded-xl border border-gray-100 p-4">
            <div class="flex items-start gap-3">
                <i class="fas fa-comments text-xl text-cenat-green mt-1"></i>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900">${escapeHtml(forum.title)}</p>
                    <p class="text-sm text-gray-600 mt-1 line-clamp-2 whitespace-pre-line">${escapeHtml(forum.description || '')}</p>
                    ${hasParticipated ? `
                        <p class="text-sm text-green-700 font-medium mt-2"><i class="fas fa-check-circle mr-1"></i> ${t('courseDetail.already_participated_forum')}</p>
                    ` : ''}
                    <a href="#/forum/${forum.id}" class="text-sm text-cenat-green hover:text-cenat-green-hover mt-2 inline-block">
                        <i class="fas fa-comment-dots mr-1"></i> ${t('courseDetail.participate_in_forum')}
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
function renderContentItemByType(content, canTrackProgress, hasAccess, submission, quizStatus) {
    switch (content.type) {
        case 'video':
            return renderContentRow(content, false, canTrackProgress, 'video', hasAccess);
        case 'file':
            return renderContentRow(content, false, canTrackProgress, 'file', hasAccess);
        case 'image':
            return renderImageContentCard(content, hasAccess);
        case 'url':
            return renderUrlContentRow(content, canTrackProgress, hasAccess);
        case 'text':
            return renderTextContentCard(content, canTrackProgress, hasAccess);
        case 'task':
            return renderTaskCard(content, submission, hasAccess);
        case 'quiz':
        case 'survey':
            return renderQuizCard(content, quizStatus, hasAccess);
        case 'forum':
            return renderForumCard(content, hasAccess);
        default:
            return '';
    }
}

function renderCourseFolderCard(folder, allContents, hasAccess, canTrackProgress, submissionsByTask, quizStatusById) {
    if (!hasAccess) {
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center gap-3">
                    <i class="fas fa-lock text-xl text-gray-400"></i>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900">${escapeHtml(folder.title)}</p>
                        <p class="text-sm text-gray-400 mt-1">${t('courseDetail.enroll_to_view_folder')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    const items = allContents.filter(c => c.folder_id === folder.id);
    // Una imagen no tiene estado "completado" (ver progressTrackableContents
    // más arriba) — se deja fuera del conteo de la carpeta por la misma
    // razón. Así el badge de "completada" es consistente con el % de
    // progreso general del curso.
    const trackableItems = items.filter(c => c.type !== 'image');
    const completedItems = trackableItems.filter(c => c.completed).length;
    const allCompleted = canTrackProgress && trackableItems.length > 0 && completedItems === trackableItems.length;

    return `
        <details id="folder-details-${folder.id}" data-folder-id="${folder.id}" class="bg-white rounded-xl border ${allCompleted ? 'border-green-200' : 'border-gray-100'} overflow-hidden">
            <summary class="cursor-pointer list-none p-4 flex items-center gap-3">
                <i id="folder-icon-${folder.id}" class="fas ${allCompleted ? 'fa-folder text-green-500' : 'fa-folder-open text-cenat-green'} text-xl"></i>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900">${escapeHtml(folder.title)}</p>
                    <p class="text-xs text-gray-400">
                        ${t(items.length === 1 ? 'courseDetail.item_singular' : 'courseDetail.item_plural', { count: items.length })}
                        ${folder.module_teacher_name ? ` — <i class="fas fa-user-tie"></i> ${escapeHtml(folder.module_teacher_name)}` : ''}
                    </p>
                </div>
                <span id="folder-badge-${folder.id}" class="flex-shrink-0">${renderFolderBadgeContent(canTrackProgress, trackableItems.length, completedItems, allCompleted)}</span>
            </summary>
            <div class="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                ${items.length > 0 ? items.map(item => `
                    <div id="content-anchor-${item.id}" class="scroll-mt-4">
                        ${renderContentItemByType(item, canTrackProgress, hasAccess, submissionsByTask[item.id], quizStatusById[item.id])}
                    </div>
                `).join('') : `
                    <p class="text-gray-500 text-sm text-center py-2">${t('courseDetail.folder_empty')}</p>
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
                <i class="fas fa-check-circle"></i> ${t('courseDetail.folder_completed')}
            </span>
        `;
    }

    return `<span class="text-xs text-gray-400">${t(completedCount === 1 ? 'courseDetail.folder_progress_singular' : 'courseDetail.folder_progress_plural', { completed: completedCount, total: trackableCount })}</span>`;
}

function renderTaskCard(task, submission, hasAccess) {
    if (!hasAccess) {
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center gap-3">
                    <i class="fas fa-lock text-xl text-gray-400"></i>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900">${escapeHtml(task.title)}</p>
                        <p class="text-sm text-gray-400 mt-1">${t('courseDetail.enroll_to_view_submit_task')}</p>
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
                            <i class="fas fa-download mr-1"></i> ${t('courseDetail.download_instructions')}
                        </button>
                    ` : ''}

                    <div class="mt-3">
                        ${isSubmitted ? `
                            <div class="bg-green-50 rounded-lg p-3">
                                <p class="text-sm text-green-700 font-medium">
                                    <i class="fas fa-check-circle mr-1"></i>
                                    ${isReviewed ? t('courseDetail.submission_reviewed') : t('courseDetail.submission_pending_review')}
                                </p>
                                <p class="text-xs text-gray-500 mt-1">${t('courseDetail.submitted_on', { date: formatDateTime(submission.submitted_at) })}</p>
                                ${isReviewed && task.weight_percent && submission.score_earned !== null && submission.score_earned !== undefined ? `
                                    <p class="text-sm text-gray-700 mt-2"><strong>${t('courseDetail.grade_prefix')}</strong> ${submission.score_earned}/${task.weight_percent}</p>
                                ` : ''}
                                ${isReviewed && submission.feedback ? `
                                    <p class="text-sm text-gray-700 mt-2"><strong>${t('courseDetail.teacher_comment_prefix')}</strong> ${escapeHtml(submission.feedback)}</p>
                                ` : ''}
                            </div>
                        ` : `
                            <form class="task-submit-form flex items-center gap-2" data-task-id="${task.id}">
                                <input type="file" class="task-submit-file text-sm flex-1" required>
                                <button type="submit" class="bg-cenat-green text-white px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap">
                                    <i class="fas fa-upload mr-1"></i> ${t('courseDetail.submit_button')}
                                </button>
                            </form>
                            <p class="text-xs text-gray-400 mt-1">${t('courseDetail.submit_once_notice')}</p>
                        `}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * `quizStatus` es lo que devuelve GET /:id/questions (ver
 * contentsAPI.getQuestions, precargado en quizStatusById más arriba):
 * `{ already_answered, questions, my_answers? }`. Cuestionario y encuesta
 * comparten esta misma tarjeta — la única diferencia es si se muestra un
 * puntaje (cuestionario) o solo un agradecimiento (encuesta), ya que una
 * encuesta no tiene respuesta correcta.
 */
function renderQuizCard(content, quizStatus, hasAccess) {
    const isQuiz = content.type === 'quiz';
    const icon = isQuiz ? 'fa-question-circle' : 'fa-poll';

    if (!hasAccess) {
        return `
            <div class="bg-white rounded-xl border border-gray-100 p-4">
                <div class="flex items-center gap-3">
                    <i class="fas fa-lock text-xl text-gray-400"></i>
                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-gray-900">${escapeHtml(content.title)}</p>
                        <p class="text-sm text-gray-400 mt-1">${isQuiz ? t('courseDetail.enroll_to_answer_quiz') : t('courseDetail.enroll_to_answer_survey')}</p>
                    </div>
                </div>
            </div>
        `;
    }

    const alreadyAnswered = quizStatus?.already_answered || false;

    let statusHTML;
    if (alreadyAnswered) {
        if (isQuiz) {
            const myAnswers = quizStatus.my_answers || [];
            const pointsByQuestion = new Map((quizStatus.questions || []).map(q => [q.id, q.points || 1]));
            const maxScore = (quizStatus.questions || []).reduce((sum, q) => sum + (q.points || 1), 0);
            const score = myAnswers
                .filter(a => a.is_correct == 1)
                .reduce((sum, a) => sum + (pointsByQuestion.get(a.question_id) || 1), 0);
            const pending = myAnswers.filter(a => a.is_correct === null).length;
            statusHTML = `
                <div class="bg-green-50 rounded-lg p-3">
                    <p class="text-sm text-green-700 font-medium"><i class="fas fa-check-circle mr-1"></i> ${t('courseDetail.already_answered_quiz')}</p>
                    <p class="text-xs text-gray-500 mt-1">
                        ${t('courseDetail.score_points', { score, max: maxScore })}${pending > 0 ? t(pending === 1 ? 'courseDetail.pending_review_singular' : 'courseDetail.pending_review_plural', { count: pending }) : ''}
                    </p>
                </div>
            `;
        } else {
            statusHTML = `
                <div class="bg-green-50 rounded-lg p-3">
                    <p class="text-sm text-green-700 font-medium"><i class="fas fa-check-circle mr-1"></i> ${t('courseDetail.survey_thanks')}</p>
                </div>
            `;
        }
    } else {
        statusHTML = `
            <a href="#/contents/${content.id}/take" class="inline-block bg-cenat-green text-white px-3 py-1.5 rounded-lg text-sm font-semibold">
                <i class="fas fa-pen mr-1"></i> ${isQuiz ? t('courseDetail.answer_quiz_button') : t('courseDetail.answer_survey_button')}
            </a>
            <p class="text-xs text-gray-400 mt-1">${t('courseDetail.answer_once_notice')}</p>
        `;
    }

    return `
        <div class="bg-white rounded-xl border border-gray-100 p-4">
            <div class="flex items-start gap-3">
                <i class="fas ${icon} text-xl text-cenat-green mt-1"></i>
                <div class="flex-1 min-w-0">
                    <p class="font-medium text-gray-900">${escapeHtml(content.title)}</p>
                    ${content.description ? `<p class="text-sm text-gray-600 mt-1 whitespace-pre-line">${escapeHtml(content.description)}</p>` : ''}
                    <div class="mt-3">${statusHTML}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * `enrollmentCourseId` (por defecto igual a `courseId`) es a quién
 * pertenece el certificado — el propio curso, o su padre si esta página es
 * la de un curso hijo de un módulo. `courseId` sigue siendo la página a
 * volver a renderizar tras entregar (SIEMPRE la que se está viendo).
 */
function setupTaskSubmitForms(courseId, enrollmentCourseId = courseId) {
    document.querySelectorAll('.task-submit-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const taskId = form.dataset.taskId;
            const fileInput = form.querySelector('.task-submit-file');
            const file = fileInput.files[0];

            if (!file) {
                showToast(t('courseDetail.select_file_required'), 'error');
                return;
            }

            const submitBtn = form.querySelector('button[type="submit"]');
            const formData = new FormData();
            formData.append('file', file);

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                const response = await contentsAPI.submit(taskId, formData);
                showToast(t('courseDetail.task_submitted_success'), 'success');
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
                    showCourseCompletionModal(enrollmentCourseId);
                }

            } catch (error) {
                showToast(error.message || t('courseDetail.submit_task_failed'), 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = `<i class="fas fa-upload mr-1"></i> ${t('courseDetail.submit_button')}`;
            }
        });
    });
}

/**
 * `enrollmentCourseId` (por defecto igual a `courseId`) es a quién
 * pertenece el certificado — ver setupTaskSubmitForms. `courseId` sigue
 * siendo la página actual (para refrescar el badge de SU carpeta).
 */
async function toggleContentCompleted(contentId, markAsCompleted, courseId, enrollmentCourseId = courseId) {
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
                checkbox.title = t('courseDetail.mark_as_pending');
                const titleEl = checkbox.closest('div').querySelector('p');
                if (titleEl) titleEl.classList.add('line-through', 'text-gray-400');
            } else {
                checkbox.classList.add('border-gray-300', 'hover:border-cenat-green');
                checkbox.classList.remove('bg-green-500', 'border-green-500');
                checkbox.innerHTML = '';
                checkbox.title = t('courseDetail.mark_as_completed');
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
            showCourseCompletionModal(enrollmentCourseId);
        } else {
            showToast(markAsCompleted ? t('courseDetail.mark_completed_success') : t('courseDetail.mark_pending_success'), 'success');
        }

    } catch (error) {
        showToast(error.message || t('courseDetail.update_progress_failed'), 'error');
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
        const trackableItems = items.filter(c => c.type !== 'image');
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

/**
 * "Módulos de este curso": un selector de módulo + una grilla de tarjetas
 * con los cursos hijo de ese módulo (portada/título/profesor propios) —
 * reusa renderCourseCard/renderCourseCardShell tal cual (views_home.js),
 * la misma tarjeta que usa el catálogo, sin reinventar el markup. Solo un
 * curso PADRE puede tener módulos (un curso hijo nunca los tiene, ver
 * courseModule.controller.js#createModule), así que con `modules` vacío
 * esta sección directamente no se renderiza.
 */
function renderPublicCourseModulesHTML(modules) {
    if (!modules || modules.length === 0) return '';

    return `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 mb-5">
                    <label for="course-module-select" class="text-sm font-semibold text-gray-700 flex-shrink-0">
                        <i class="fas fa-layer-group text-cenat-green mr-1"></i> ${t('courseDetail.module_label')}
                    </label>
                    <select id="course-module-select" onchange="switchCourseModule(this.value)" class="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent w-full sm:w-auto">
                        ${modules.map((m, i) => `<option value="${m.id}" ${i === 0 ? 'selected' : ''}>${escapeHtml(m.title)}</option>`).join('')}
                    </select>
                </div>
                ${modules.map((m, i) => `
                    <div id="module-course-grid-${m.id}" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 ${i === 0 ? '' : 'hidden'}">
                        ${m.courses.length === 0
                            ? `<p class="text-gray-400 text-sm col-span-full text-center py-4">${t('courseDetail.module_empty')}</p>`
                            : m.courses.map(c => renderCourseCard(c)).join('')}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function switchCourseModule(moduleId) {
    document.querySelectorAll('[id^="module-course-grid-"]').forEach((el) => {
        el.classList.toggle('hidden', el.id !== `module-course-grid-${moduleId}`);
    });
}
window.switchCourseModule = switchCourseModule;

/**
 * `parentCourseTitle` solo viene poblado en la página de un curso HIJO de
 * un módulo — ahí la inscripción real es en el curso padre (ver
 * enrollmentCourseId/course.parent_course_id), así que el botón lo aclara
 * en vez de sugerir que este curso hijo tiene inscripción propia.
 */
function renderEnrollButton(isLoggedIn, isEnrolled, courseId, parentCourseTitle) {
    if (!isLoggedIn) {
        return `
            <a href="#/login" class="btn-cenat">
                <i class="fas fa-sign-in-alt mr-2"></i> ${t('courseDetail.login_to_enroll')}
            </a>
        `;
    }

    if (isStudent() === false && isAdmin()) {
        return ''; // Admin no necesita inscribirse
    }

    if (isEnrolled) {
        return `
            <button id="unenroll-btn" class="bg-white text-cenat-green px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
                <i class="fas fa-check-circle mr-2"></i> ${parentCourseTitle ? t('courseDetail.enrolled_via', { title: escapeHtml(parentCourseTitle) }) : t('courseDetail.enrolled_label')}
            </button>
        `;
    }

    return `
        <button id="enroll-btn" class="bg-white text-cenat-green px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition">
            <i class="fas fa-plus-circle mr-2"></i> ${parentCourseTitle ? t('courseDetail.enroll_in_button', { title: escapeHtml(parentCourseTitle) }) : t('courseDetail.enroll_button')}
        </button>
    `;
}

/**
 * `enrollmentCourseId` es a quién realmente se inscribe/desinscribe (el
 * propio curso, o su padre si esta página es la de un curso hijo de un
 * módulo — ver enrollmentCourseId en renderCourseDetail). `displayCourseId`
 * es la página a la que volver después (SIEMPRE la que el usuario está
 * viendo, aunque sea la de un curso hijo) — sin esta distinción, inscribirse
 * desde la página de un curso hijo terminaba mandando al usuario a la
 * página del padre en vez de quedarse donde hizo clic.
 */
function setupEnrollButton(enrollmentCourseId, displayCourseId = enrollmentCourseId) {
    const enrollBtn = document.getElementById('enroll-btn');
    const unenrollBtn = document.getElementById('unenroll-btn');

    if (enrollBtn) {
        enrollBtn.addEventListener('click', async () => {
            try {
                await coursesAPI.enroll(enrollmentCourseId);
                showToast(t('courseDetail.enroll_success'), 'success');
                renderCourseDetail({ id: displayCourseId });
            } catch (error) {
                showToast(error.message || t('courseDetail.enroll_failed'), 'error');
            }
        });
    }

    if (unenrollBtn) {
        unenrollBtn.addEventListener('click', async () => {
            if (await confirmAction(t('courseDetail.unenroll_confirm'))) {
                try {
                    await coursesAPI.unenroll(enrollmentCourseId);
                    showToast(t('courseDetail.unenroll_success'), 'info');
                    renderCourseDetail({ id: displayCourseId });
                } catch (error) {
                    showToast(error.message || t('courseDetail.unenroll_failed'), 'error');
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
        showToast(t('courseDetail.login_required_download'), 'warning');
        navigateTo('/login');
        return;
    }
    await contentsAPI.download(id);
}

async function downloadCertificate(courseId) {
    try {
        await coursesAPI.downloadCertificate(courseId);
    } catch (error) {
        showToast(error.message || t('courseDetail.download_certificate_failed'), 'error');
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
                ${t('courseDetail.completion_title')}
            </h2>
            <p class="text-gray-600 dark:text-slate-400 mb-6">
                ${t('courseDetail.completion_message')}
            </p>

            <!-- Barra de progreso al 100% -->
            <div class="progress-bar mb-6">
                <div class="progress-fill" style="width: 100%"></div>
            </div>

            <!-- Badge -->
            <div class="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-4 py-2 rounded-full font-semibold text-sm mb-6">
                <i class="fas fa-award text-lg"></i>
                ${t('courseDetail.completion_badge')}
            </div>

            <div class="flex flex-col gap-3">
                <button onclick="downloadCertificate(${courseId})" class="btn-cenat">
                    <i class="fas fa-certificate mr-2"></i> ${t('courseDetail.download_certificate')}
                </button>
                <div class="flex gap-3 justify-center">
                    <button onclick="closeCompletionModal()" class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                        <i class="fas fa-check mr-2"></i> ${t('courseDetail.completion_understood')}
                    </button>
                    <a href="#/" onclick="closeCompletionModal()" class="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition">
                        ${t('courseDetail.completion_see_more')}
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