/**
 * Gestión de contenidos de un curso (videos/archivos) — compartido entre
 * la vista de edición del admin (views_admin_edit_course.js) y la vista
 * de edición del profesor sobre su curso asignado (views_teacher_course.js).
 * La única diferencia entre ambos contextos es qué función hay que llamar
 * para volver a renderizar la página después de crear/borrar contenido —
 * cada vista la registra con initCourseContentManager() al montarse.
 *
 * Carpetas: un solo nivel (no hay subcarpetas). Cada carpeta muestra su
 * propio set de las 6 secciones de contenido (Videos/URL/Archivos/Texto/
 * Tareas/Foro), igual que el contenido "sin carpeta" — para no repetir
 * ids de DOM cuando hay varias carpetas, cada contenedor/lista se
 * identifica con scopeId(base, folderId).
 */

// Mismos límites que sus contrapartes en src/middlewares/upload.middleware.js
// — chequeados en el cliente (ver checkFileSize en utils.js) antes de
// subir, para no esperar a que Multer rechace un archivo demasiado grande
// recién al terminar la subida.
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_DOC_BYTES = 50 * 1024 * 1024; // 50MB (archivo / instrucciones de tarea)
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

let contentManagerRerender = () => {};

/**
 * `course` es opcional (por compatibilidad con cualquier otro llamador
 * viejo) — cuando se pasa y el curso no es en sí un curso hijo de un
 * módulo, dispara la carga async de la lista de módulos (ver
 * renderCourseModulesSectionHTML/loadCourseModulesList): el HTML de esa
 * sección ya está en el DOM en este punto (ambas vistas llaman a esto
 * después de setear app.innerHTML), así que el contenedor #course-modules-list
 * existe y puede rellenarse.
 */
function initCourseContentManager(rerenderFn, course) {
    contentManagerRerender = rerenderFn;
    if (course && !course.parent_module_id) {
        loadCourseModulesList(course.id);
    }
}

function scopeId(base, folderId) {
    return `${base}-${folderId || 'root'}`;
}

function renderCourseContentManagerHTML(course, contents) {
    const folders = contents.filter(c => c.type === 'folder');

    return `
        <div class="space-y-6">
            <!-- Crear carpeta -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-gray-900">
                        <i class="fas fa-folder text-cenat-green mr-2"></i> ${t('contentManager.folders.heading')}
                    </h2>
                    <button onclick="showAddFolderForm(${course.id})" class="text-sm bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
                        <i class="fas fa-plus mr-1"></i> ${t('contentManager.folders.create')}
                    </button>
                </div>
                <div id="add-folder-form-container"></div>
                ${folders.length === 0 ? `
                    <p class="text-gray-500 text-sm text-center py-4">${t('contentManager.folders.empty')}</p>
                ` : `
                    <p class="text-gray-400 text-xs">${t('contentManager.folders.hint')}</p>
                `}
            </div>

            ${renderCourseModulesSectionHTML(course)}

            ${renderContentTypeSections(course.id, contents, null, false)}
        </div>
    `;
}

// =================================
// Módulos (cursos anidados dentro de un curso)
//
// Distinto de las "carpetas" de arriba: acá cada módulo agrupa CURSOS
// COMPLETOS (portada/título/profesor propios), no contenido. Nesting de un
// solo nivel — un curso que ya es hijo de un módulo (course.parent_module_id)
// no puede alojar sus propios módulos, así que esta sección directamente no
// se muestra en ese caso (el backend también lo rechaza, ver
// courseModule.controller.js#createModule — esto es solo la UI).
// =================================

function renderCourseModulesSectionHTML(course) {
    if (course.parent_module_id) return '';

    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold text-gray-900">
                    <i class="fas fa-layer-group text-cenat-green mr-2"></i> ${t('contentManager.modules.heading')}
                </h2>
                <button onclick="showAddModuleForm(${course.id})" class="text-sm bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
                    <i class="fas fa-plus mr-1"></i> ${t('contentManager.modules.create')}
                </button>
            </div>
            <p class="text-gray-400 text-xs mb-3">${t('contentManager.modules.hint')}</p>
            <div id="add-module-form-container"></div>
            <div id="course-modules-list">
                <p class="text-gray-400 text-sm text-center py-4"><i class="fas fa-spinner fa-spin mr-1"></i> ${t('contentManager.modules.loading')}</p>
            </div>
        </div>
    `;
}

async function loadCourseModulesList(courseId) {
    const container = document.getElementById('course-modules-list');
    if (!container) return;
    try {
        const response = await courseModulesAPI.getByCourse(courseId);
        const modules = response.data || [];
        container.innerHTML = modules.length === 0
            ? `<p class="text-gray-500 text-sm text-center py-4">${t('contentManager.modules.empty')}</p>`
            : modules.map(m => renderModuleCard(courseId, m)).join('');
    } catch (error) {
        container.innerHTML = `<p class="text-sm text-red-500 text-center py-4">${t('contentManager.modules.load_failed')}</p>`;
    }
}

function renderModuleCard(courseId, module) {
    const courseCount = module.courses.length;
    return `
        <details class="border border-gray-100 rounded-lg mb-3" open data-module-id="${module.id}">
            <summary class="cursor-pointer list-none p-3 flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                    <i class="fas fa-chevron-right text-gray-400 text-xs module-chevron transition-transform"></i>
                    <i class="fas fa-layer-group text-cenat-green"></i>
                    <span class="font-semibold text-gray-900 truncate">${escapeHtml(module.title)}</span>
                    <span class="text-xs text-gray-400 whitespace-nowrap">(${t(courseCount === 1 ? 'contentManager.modules.course_count_singular' : 'contentManager.modules.course_count_plural', { count: courseCount })})</span>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button onclick="event.preventDefault(); showAddModuleCourseForm(${courseId}, ${module.id})" class="text-xs bg-green-50 text-cenat-green px-2 py-1 rounded hover:bg-green-100 whitespace-nowrap" title="${t('contentManager.modules.create_course_title')}">
                        <i class="fas fa-plus mr-1"></i>${t('contentManager.modules.create_course_short')}
                    </button>
                    <button onclick="event.preventDefault(); renameModuleHandler(${courseId}, ${module.id})" class="text-gray-400 hover:text-cenat-green px-2" title="${t('contentManager.modules.rename_title')}">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button onclick="event.preventDefault(); deleteModuleHandler(${courseId}, ${module.id})" class="text-red-500 hover:text-red-700 px-2" title="${t('contentManager.modules.delete_title')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </summary>
            <div class="px-3 pb-3 border-t border-gray-100 pt-3 space-y-2">
                <div id="${scopeId('add-module-course-form-container', module.id)}"></div>
                ${courseCount === 0
                    ? `<p class="text-gray-400 text-xs text-center py-2">${t('contentManager.modules.no_courses_yet')}</p>`
                    : module.courses.map(c => renderModuleChildCourseRow(courseId, module.id, c)).join('')}
            </div>
        </details>
    `;
}

function renderModuleChildCourseRow(courseId, moduleId, childCourse) {
    const manageHref = (typeof isAdmin === 'function' && isAdmin())
        ? `#/admin/courses/${childCourse.id}/edit`
        : `#/teacher/courses/${childCourse.id}/edit`;
    return `
        <div class="flex items-center justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
            <div class="flex items-center gap-2 min-w-0">
                <div class="w-10 h-10 rounded bg-gradient-to-br from-cenat-green to-cenat-green-light flex items-center justify-center overflow-hidden flex-shrink-0">
                    ${childCourse.thumbnail
                        ? `<img src="${escapeAttr(childCourse.thumbnail)}" alt="${escapeAttr(childCourse.title)}" class="w-full h-full object-cover">`
                        : `<i class="fas fa-flask text-white text-sm"></i>`}
                </div>
                <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${escapeHtml(childCourse.title)}</p>
                    <p class="text-xs text-gray-400 truncate">${childCourse.teacher_names ? escapeHtml(childCourse.teacher_names) : t('contentManager.modules.no_teacher_assigned')}</p>
                </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <a href="${manageHref}" class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200" title="${t('contentManager.modules.manage_content_title')}">
                    <i class="fas fa-cog"></i>
                </a>
                <button onclick="unnestModuleCourseHandler(${courseId}, ${moduleId}, ${childCourse.id})" class="text-xs text-gray-400 hover:text-red-600 px-2" title="${t('contentManager.modules.unlink_title')}">
                    <i class="fas fa-unlink"></i>
                </button>
            </div>
        </div>
    `;
}

function showAddModuleForm(courseId) {
    const container = document.getElementById('add-module-form-container');
    if (!container) return;

    container.innerHTML = `
        <form id="add-module-form" class="bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.modules.name_label')}</label>
                <input type="text" id="module-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="${t('contentManager.modules.name_placeholder')}">
            </div>
            <div class="flex gap-2">
                <button type="submit" id="submit-module-btn" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> ${t('contentManager.modules.create_button')}
                </button>
                <button type="button" onclick="document.getElementById('add-module-form-container').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    document.getElementById('add-module-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('module-title').value.trim();
        const submitBtn = document.getElementById('submit-module-btn');

        if (!title) {
            showToast(t('contentManager.modules.name_required'), 'error');
            return;
        }

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.creating'),
            idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.modules.create_button')}`,
            apiCall: () => courseModulesAPI.create(courseId, title),
            successMessage: t('contentManager.modules.created'),
            errorMessage: t('contentManager.modules.create_failed')
        });
    });
}

async function renameModuleHandler(courseId, moduleId) {
    // El título actual se lee del propio DOM (en vez de pasarlo como
    // argumento del onclick) para no tener que escapar un string arbitrario
    // dentro de un atributo HTML inline — más simple y sin riesgo de romper
    // el markup si el título tiene comillas.
    const titleEl = document.querySelector(`details[data-module-id="${moduleId}"] .font-semibold`);
    const currentTitle = titleEl ? titleEl.textContent : '';
    const title = prompt(t('contentManager.modules.rename_prompt'), currentTitle);
    if (title === null) return;
    if (!title.trim()) {
        showToast(t('contentManager.modules.name_required'), 'error');
        return;
    }
    try {
        await courseModulesAPI.update(moduleId, { title: title.trim() });
        showToast(t('contentManager.modules.updated'), 'success');
        contentManagerRerender();
    } catch (error) {
        showToast(error.message || t('contentManager.modules.update_failed'), 'error');
    }
}

async function deleteModuleHandler(courseId, moduleId) {
    const confirmed = await confirmAction(t('contentManager.modules.delete_confirm'));
    if (!confirmed) return;
    try {
        await courseModulesAPI.delete(moduleId);
        showToast(t('contentManager.modules.deleted'), 'success');
        contentManagerRerender();
    } catch (error) {
        showToast(error.message || t('contentManager.modules.delete_failed'), 'error');
    }
}

async function unnestModuleCourseHandler(courseId, moduleId, childId) {
    const confirmed = await confirmAction(t('contentManager.modules.unlink_confirm'));
    if (!confirmed) return;
    try {
        await courseModulesAPI.removeCourse(moduleId, childId);
        showToast(t('contentManager.modules.unlinked'), 'success');
        contentManagerRerender();
    } catch (error) {
        showToast(error.message || t('contentManager.modules.unlink_failed'), 'error');
    }
}

function showAddModuleCourseForm(courseId, moduleId) {
    const containerId = scopeId('add-module-course-form-container', moduleId);
    const container = document.getElementById(containerId);
    if (!container) return;

    const teacherCheckboxesId = scopeId('module-course-teachers', moduleId);

    container.innerHTML = `
        <form id="add-module-course-form-${moduleId}" class="bg-green-50 rounded-lg p-4 mb-3 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.modules.course_title_label')}</label>
                <input type="text" id="module-course-title-${moduleId}" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="${t('contentManager.modules.course_title_placeholder')}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.modules.description_label')}</label>
                <textarea id="module-course-description-${moduleId}" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green"></textarea>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.modules.thumbnail_label')}</label>
                <div class="file-drop-zone" id="module-course-thumbnail-drop-zone-${moduleId}">
                    <i class="fas fa-image text-2xl text-gray-400 mb-1"></i>
                    <p class="text-xs text-gray-500">${t('admin.createCourse.thumbnail_drop_hint')}</p>
                    <p class="text-xs text-gray-400 mt-1">${t('admin.createCourse.thumbnail_formats_hint')}</p>
                    <input type="file" id="module-course-thumbnail-${moduleId}" accept="image/*" class="hidden">
                </div>
                <div id="module-course-thumbnail-preview-${moduleId}" class="mt-2 hidden">
                    <img id="module-course-thumbnail-preview-img-${moduleId}" class="h-20 rounded-lg object-cover">
                </div>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.modules.teacher_label')}</label>
                <div id="${teacherCheckboxesId}" class="border border-gray-300 rounded-lg p-2 max-h-40 overflow-y-auto bg-white">
                    <p class="text-sm text-gray-400"><i class="fas fa-spinner fa-spin mr-1"></i> ${t('contentManager.modules.loading_teachers')}</p>
                </div>
            </div>
            <div class="flex gap-2">
                <button type="submit" id="submit-module-course-btn-${moduleId}" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> ${t('contentManager.modules.create_course_button')}
                </button>
                <button type="button" onclick="document.getElementById('${containerId}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    loadTeacherCheckboxes(teacherCheckboxesId);
    setupThumbnailDropZone({
        dropZoneId: `module-course-thumbnail-drop-zone-${moduleId}`,
        inputId: `module-course-thumbnail-${moduleId}`,
        previewContainerId: `module-course-thumbnail-preview-${moduleId}`,
        previewImgId: `module-course-thumbnail-preview-img-${moduleId}`
    });

    document.getElementById(`add-module-course-form-${moduleId}`).addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById(`module-course-title-${moduleId}`).value.trim();
        const description = document.getElementById(`module-course-description-${moduleId}`).value.trim();
        const thumbnailFile = document.getElementById(`module-course-thumbnail-${moduleId}`).files[0];
        const submitBtn = document.getElementById(`submit-module-course-btn-${moduleId}`);

        if (!title) {
            showToast(t('contentManager.modules.course_title_required'), 'error');
            return;
        }
        if (thumbnailFile && !checkFileSize(thumbnailFile, MAX_IMAGE_BYTES, t('contentManager.modules.thumbnail_field_label'))) return;

        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('teacher_ids', JSON.stringify(getSelectedTeacherIds(teacherCheckboxesId)));
        if (thumbnailFile) formData.append('thumbnail', thumbnailFile);

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.creating'),
            idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.modules.create_course_button')}`,
            apiCall: () => courseModulesAPI.createCourse(moduleId, formData),
            successMessage: t('contentManager.modules.course_created'),
            errorMessage: t('contentManager.modules.create_course_failed')
        });
    });
}

/**
 * Una carpeta se dibuja como un ítem arrastrable más dentro de la lista
 * "Contenido" (ver mixedSection en renderContentTypeSections), no como
 * sección aparte — así se puede reordenar respecto a una tarea o un foro,
 * o incluso subirla por encima de Videos. Por dentro sigue siendo un
 * <details> con sus propias secciones de contenido (renderContentTypeSections
 * recursivo, folderId = el id de esta carpeta).
 */
function renderDraggableFolderItem(courseId, contents, folder) {
    const itemCount = contents.filter(c => c.folder_id === folder.id).length;
    return `
        <div class="draggable-item flex items-stretch gap-1" draggable="true" data-content-id="${folder.id}" data-content-json="${encodeDataAttr(folder)}">
            <span class="drag-handle flex items-center px-1 text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0" title="${t('contentManager.drag_handle_title')}">
                <i class="fas fa-grip-vertical"></i>
            </span>
            ${renderReorderButtons(folder.id)}
            <div class="flex-1 min-w-0">
                <div id="content-display-${folder.id}">
                    <details class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" open>
                        <summary class="cursor-pointer list-none p-4 flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 min-w-0">
                                <i class="fas fa-chevron-right text-gray-400 text-xs folder-chevron transition-transform"></i>
                                <i class="fas fa-folder-open text-cenat-green"></i>
                                <span class="font-bold text-gray-900 truncate">${escapeHtml(folder.title)}</span>
                                <span class="text-xs text-gray-400 whitespace-nowrap">(${t(itemCount === 1 ? 'contentManager.item_count_singular' : 'contentManager.item_count_plural', { count: itemCount })})</span>
                                ${folder.module_teacher_name ? `
                                    <span class="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap" title="${t('contentManager.folders.assigned_teacher_title')}">
                                        <i class="fas fa-user-tie mr-1"></i>${escapeHtml(folder.module_teacher_name)}
                                    </span>
                                ` : ''}
                            </div>
                            <div class="flex items-center gap-1 flex-shrink-0">
                                <button onclick="event.preventDefault(); editContentHandler(${folder.id})" class="text-gray-400 hover:text-cenat-green px-2" title="${t('contentManager.folders.edit_title')}">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <button onclick="event.preventDefault(); deleteContentHandler(${folder.id}, 'folder')" class="text-red-500 hover:text-red-700 px-2" title="${t('contentManager.folders.delete_title')}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </summary>
                        <div class="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
                            ${renderContentTypeSections(courseId, contents, folder.id, true)}
                        </div>
                    </details>
                </div>
                <div id="content-edit-${folder.id}"></div>
            </div>
        </div>
    `;
}

/**
 * Videos con su propia sección (a nivel superior comparten reproductor
 * con la vista del estudiante), y el resto de tipos (URL/Archivo/Texto/
 * Tarea/Foro) en UNA lista única arrastrable, ordenada por order_index —
 * así el profesor puede, por ejemplo, poner un foro arriba de una tarea.
 * `folderId` (null = sin carpeta) escopa tanto qué contenido entra en
 * cada lista como qué ids se reordenan juntos al soltar (ver
 * persistContentOrder más abajo): mezclar ids de carpetas distintas en
 * un mismo POST /reorder rompería el orden de la otra carpeta, así que
 * cada lista es su propio ".sortable-list" independiente. `nested` cambia
 * el estilo: cards completas con sombra a nivel superior, bloques simples
 * sin repetir el borde cuando ya están dentro de la card de una carpeta.
 */
function renderContentTypeSections(courseId, contents, folderId, nested) {
    const inScope = c => (c.folder_id || null) === folderId;
    const videos = contents.filter(c => c.type === 'video' && inScope(c));
    // Una carpeta siempre tiene folder_id null (no hay subcarpetas), así
    // que solo puede aparecer en la lista de nivel superior (folderId ===
    // null) — la llamada recursiva para dibujar el contenido DENTRO de una
    // carpeta nunca la vuelve a incluir, sin necesidad de excluirla a mano.
    const mixedItems = contents.filter(c => c.type !== 'video' && inScope(c));

    const folderArg = folderId === null ? 'null' : folderId;
    const wrap = nested ? '' : 'bg-white rounded-xl shadow-sm border border-gray-100 p-6';
    const headingSize = nested ? 'text-sm' : 'text-lg';

    const videoSection = `
        <div class="${wrap}">
            <div class="flex items-center justify-between mb-3">
                <h3 class="${headingSize} font-bold text-gray-900">
                    <i class="fas fa-video text-cenat-green mr-2"></i> ${t('contentManager.videos.heading')}
                </h3>
                <button onclick="showAddVideoForm(${courseId}, ${folderArg})" class="text-xs bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
                    <i class="fas fa-plus mr-1"></i> ${t('contentManager.videos.add')}
                </button>
            </div>
            <div id="${scopeId('add-video-form-container', folderId)}"></div>
            <div id="${scopeId('video-list', folderId)}" class="space-y-2 sortable-list" data-course-id="${courseId}">
                ${videos.length > 0 ? videos.map(renderDraggableItem).join('') : `
                    <p class="text-gray-500 text-sm text-center py-4">${t('contentManager.videos.empty')}</p>
                `}
            </div>
        </div>
    `;

    const addButtons = [
        ['showAddUrlForm', 'fa-link', t('contentManager.addButtons.url')],
        ['showAddFileForm', 'fa-file', t('contentManager.addButtons.file')],
        ['showAddImageForm', 'fa-image', t('contentManager.addButtons.image')],
        ['showAddTextForm', 'fa-align-left', t('contentManager.addButtons.text')],
        ['showAddTaskForm', 'fa-tasks', t('contentManager.addButtons.task')],
        ['showAddQuizForm', 'fa-question-circle', t('contentManager.addButtons.quiz')],
        ['showAddSurveyForm', 'fa-poll', t('contentManager.addButtons.survey')],
        ['showAddForumForm', 'fa-comments', t('contentManager.addButtons.forum')]
    ].map(([fn, icon, label]) => `
        <button onclick="${fn}(${courseId}, ${folderArg})" class="text-xs bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition whitespace-nowrap">
            <i class="fas ${icon} mr-1"></i> ${label}
        </button>
    `).join('');

    const mixedSection = `
        <div class="${wrap}">
            <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 class="${headingSize} font-bold text-gray-900">
                    <i class="fas fa-list text-cenat-green mr-2"></i> ${t('contentManager.content.heading')}
                </h3>
                <div class="flex flex-wrap gap-2">${addButtons}</div>
            </div>
            <div id="${scopeId('add-url-form-container', folderId)}"></div>
            <div id="${scopeId('add-file-form-container', folderId)}"></div>
            <div id="${scopeId('add-image-form-container', folderId)}"></div>
            <div id="${scopeId('add-text-form-container', folderId)}"></div>
            <div id="${scopeId('add-task-form-container', folderId)}"></div>
            <div id="${scopeId('add-quiz-form-container', folderId)}"></div>
            <div id="${scopeId('add-survey-form-container', folderId)}"></div>
            <div id="${scopeId('add-forum-form-container', folderId)}"></div>
            ${mixedItems.length > 1 ? `
                <p class="text-xs text-gray-400 mb-2"><i class="fas fa-arrows-alt-v mr-1"></i> ${t('contentManager.drag_to_reorder')}</p>
            ` : ''}
            <div id="${scopeId('content-list', folderId)}" class="space-y-2 sortable-list" data-course-id="${courseId}">
                ${mixedItems.length > 0 ? mixedItems.map(item => item.type === 'folder'
                    ? renderDraggableFolderItem(courseId, contents, item)
                    : renderDraggableItem(item)
                ).join('') : `
                    <p class="text-gray-500 text-sm text-center py-4">${t('contentManager.content.empty')}</p>
                `}
            </div>
        </div>
    `;

    return videoSection + mixedSection;
}

/**
 * Dispatcher: cada tipo de contenido se dibuja con el mismo renderer de
 * fila que ya existía por tipo — reutilizarlos evita duplicar el markup.
 */
function renderManagerContentItem(content) {
    switch (content.type) {
        case 'video': return renderContentItem(content, 'video');
        case 'url': return renderContentItem(content, 'url');
        case 'file': return renderContentItem(content, 'file');
        case 'image': return renderContentItem(content, 'image');
        case 'text': return renderContentItem(content, 'text');
        case 'task': return renderTaskItem(content);
        case 'quiz': return renderQuizManagerItem(content);
        case 'survey': return renderQuizManagerItem(content);
        case 'forum': return renderForumItem(content);
        default: return '';
    }
}

/**
 * Mete un objeto como JSON dentro de un atributo HTML de forma segura —
 * usado para guardar el contenido completo (título/descripción/url/tipo)
 * en cada fila, así editContentHandler no necesita volver a pedirlo al
 * servidor. escapeHtml() no alcanza acá: está pensado para texto DENTRO
 * de un tag, no escapa comillas — y un JSON.stringify está lleno de `"`.
 */
function encodeDataAttr(obj) {
    return JSON.stringify(obj).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

/**
 * Botones de subir/bajar — alternativa por teclado/lector de pantalla al
 * arrastre con mouse, que por su naturaleza no es operable de otra forma.
 * Reutilizan exactamente el mismo persistContentOrder() que usa soltar un
 * drag, así que quedan sujetos a las mismas reglas (solo se mueve dentro
 * de la misma lista/carpeta).
 */
function renderReorderButtons(contentId) {
    return `
        <span class="reorder-buttons flex flex-col justify-center flex-shrink-0">
            <button type="button" onclick="moveContentItem(${contentId}, -1)" class="text-gray-300 hover:text-cenat-green leading-none px-1" title="${t('contentManager.move_up')}" aria-label="${t('contentManager.move_up')}">
                <i class="fas fa-chevron-up text-xs"></i>
            </button>
            <button type="button" onclick="moveContentItem(${contentId}, 1)" class="text-gray-300 hover:text-cenat-green leading-none px-1" title="${t('contentManager.move_down')}" aria-label="${t('contentManager.move_down')}">
                <i class="fas fa-chevron-down text-xs"></i>
            </button>
        </span>
    `;
}

/**
 * Intercambia un .draggable-item con su vecino directo (arriba si
 * direction=-1, abajo si direction=1) dentro de su propio .sortable-list,
 * y persiste el nuevo orden — mismo criterio de "hijos directos
 * solamente" que getDragAfterElement/persistContentOrder: un item nunca
 * tiene como previousElementSibling/nextElementSibling algo de OTRA
 * lista, porque las listas anidadas de una carpeta viven más adentro en
 * el DOM, no como hermanas.
 */
async function moveContentItem(contentId, direction) {
    const item = document.querySelector(`.draggable-item[data-content-id="${contentId}"]`);
    if (!item) return;
    const container = item.closest('.sortable-list');
    if (!container) return;

    const target = direction < 0 ? item.previousElementSibling : item.nextElementSibling;
    if (!target || !target.classList.contains('draggable-item')) return;

    if (direction < 0) {
        container.insertBefore(item, target);
    } else {
        container.insertBefore(target, item);
    }

    await persistContentOrder(container);
}

/**
 * Envuelve una fila de contenido con lo necesario para arrastrarla:
 * `draggable="true"`, un mango visual (decorativo — arrastrar desde
 * cualquier parte de la fila funciona igual, salvo desde un botón/link,
 * que el navegador no deja iniciar un drag ahí por default), botones de
 * subir/bajar (ver renderReorderButtons), y `data-content-id`/
 * `data-content-json` para leer el nuevo orden al soltar y los datos del
 * contenido al editar. `content-display-{id}` / `content-edit-{id}` son
 * el par que usa editContentHandler para mostrar el formulario de
 * edición en el lugar de la fila, sin tener que reordenar el resto del
 * markup por tipo.
 */
function renderDraggableItem(content) {
    return `
        <div class="draggable-item flex items-stretch gap-1" draggable="true" data-content-id="${content.id}" data-content-json="${encodeDataAttr(content)}">
            <span class="drag-handle flex items-center px-1 text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0" title="${t('contentManager.drag_handle_title')}">
                <i class="fas fa-grip-vertical"></i>
            </span>
            ${renderReorderButtons(content.id)}
            <div class="flex-1 min-w-0">
                <div id="content-display-${content.id}">${renderManagerContentItem(content)}</div>
                <div id="content-edit-${content.id}"></div>
            </div>
        </div>
    `;
}

// =================================
// Drag-and-drop para reordenar contenido
// =================================
// Delegado en document (no en cada lista): las listas se reconstruyen
// por completo en cada re-render, así que un listener por documento no
// necesita re-engancharse cada vez que se agrega/borra/reordena algo.

let draggedItem = null;

document.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.draggable-item');
    if (!item) return;
    draggedItem = item;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => item.classList.add('opacity-40'), 0);
});

document.addEventListener('dragend', () => {
    if (draggedItem) draggedItem.classList.remove('opacity-40');
    draggedItem = null;
});

/**
 * true si `container` es la lista de la que salió `draggedItem` — NO
 * alcanza con `container.contains(draggedItem)`: desde que una carpeta es
 * un ítem arrastrable más de la lista de nivel superior (ver
 * renderDraggableFolderItem), la lista interna de esa carpeta queda
 * anidada DENTRO del DOM de la lista externa, así que "contains" da true
 * aunque sean listas distintas — eso dejaba sacar un contenido de adentro
 * de una carpeta arrastrándolo hacia afuera (o viceversa). Comparando
 * contra el ".sortable-list" ancestro más cercano del propio ítem
 * arrastrado nos aseguramos de que sea EXACTAMENTE la misma lista.
 */
function isSameSortableList(container, item) {
    return !!container && item.closest('.sortable-list') === container;
}

document.addEventListener('dragover', (e) => {
    if (!draggedItem) return;
    const container = e.target.closest('.sortable-list');
    // Solo se puede reordenar DENTRO de la misma lista (misma carpeta/nivel
    // Y mismo tipo de lista, Videos o Contenido) — arrastrar hacia otra
    // lista no hace nada, a propósito: no se mueve contenido entre
    // carpetas ni entre Videos y Contenido arrastrando.
    if (!isSameSortableList(container, draggedItem)) return;
    e.preventDefault();

    const afterElement = getDragAfterElement(container, e.clientY);
    if (afterElement == null) {
        container.appendChild(draggedItem);
    } else {
        container.insertBefore(draggedItem, afterElement);
    }
});

document.addEventListener('drop', async (e) => {
    if (!draggedItem) return;
    const container = e.target.closest('.sortable-list');
    if (!isSameSortableList(container, draggedItem)) return;
    e.preventDefault();
    await persistContentOrder(container);
});

function getDragAfterElement(container, y) {
    // ":scope >" limita a los hijos DIRECTOS de esta lista — necesario
    // ahora que una carpeta puede contener su propia lista arrastrable
    // anidada (ver renderDraggableFolderItem); sin el ":scope >", un
    // querySelectorAll normal también trae los ítems de DENTRO de una
    // carpeta expandida y rompe el cálculo de posición.
    const items = [...container.querySelectorAll(':scope > .draggable-item:not(.opacity-40)')];
    return items.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset, element: child };
        }
        return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
}

/**
 * Persiste el orden visual actual de una lista contra el servidor. Si
 * falla, se vuelve a renderizar todo el panel para recuperar el orden
 * real (el UPDATE no llegó a aplicarse, así que el servidor sigue
 * teniendo el orden de antes de arrastrar).
 */
async function persistContentOrder(container) {
    const courseId = container.dataset.courseId;
    // Mismo motivo que en getDragAfterElement: solo los hijos directos son
    // los que pertenecen a ESTA lista/carpeta — los de una carpeta anidada
    // expandida adentro se reordenan con su propio POST /reorder aparte.
    const ids = [...container.querySelectorAll(':scope > .draggable-item')].map(el => Number(el.dataset.contentId));

    try {
        await contentsAPI.reorder(courseId, ids);
    } catch (error) {
        showToast(error.message || t('contentManager.reorder_failed'), 'error');
        contentManagerRerender();
    }
}

function renderContentItem(content, type) {
    const icons = { video: 'fa-play-circle', url: 'fa-link', text: 'fa-align-left', task: 'fa-tasks', image: 'fa-image' };
    const icon = icons[type] || getFileIcon(content.url);
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            ${type === 'image'
                ? `<img src="${escapeAttr(content.url)}" alt="" class="w-10 h-10 rounded object-cover flex-shrink-0">`
                : `<i class="fas ${icon} text-xl text-cenat-green"></i>`
            }
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">${escapeHtml(content.title)}</p>
                ${content.file_size ? `<p class="text-xs text-gray-500">${formatFileSize(content.file_size)}</p>` : ''}
                ${type === 'url' ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(content.url)}</p>` : ''}
            </div>
            <button onclick="editContentHandler(${content.id})" class="text-gray-400 hover:text-cenat-green px-2" title="${t('contentManager.edit_title')}">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button onclick="deleteContentHandler(${content.id}, '${type}')" class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

function renderTaskItem(content) {
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            <i class="fas fa-tasks text-xl text-cenat-green"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">${escapeHtml(content.title)}</p>
                <p class="text-xs text-gray-500">${content.url ? t('contentManager.task.with_instructions_file') : t('contentManager.task.no_attached_file')}</p>
            </div>
            <a href="#/contents/${content.id}/submissions" class="text-cenat-green hover:text-cenat-green-hover text-sm whitespace-nowrap" title="${t('contentManager.task.view_submissions_title')}">
                <i class="fas fa-inbox mr-1"></i> ${t('contentManager.task.view_submissions')}
            </a>
            <button onclick="editContentHandler(${content.id})" class="text-gray-400 hover:text-cenat-green px-2" title="${t('contentManager.edit_title')}">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button onclick="deleteContentHandler(${content.id}, 'task')" class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

function renderQuizManagerItem(content) {
    const isQuiz = content.type === 'quiz';
    const questionCount = content.question_count || 0;
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            <i class="fas ${isQuiz ? 'fa-question-circle' : 'fa-poll'} text-xl text-cenat-green"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">${escapeHtml(content.title)}</p>
                <p class="text-xs text-gray-500">${t(questionCount === 1 ? 'contentManager.quiz.question_count_singular' : 'contentManager.quiz.question_count_plural', { count: questionCount })}</p>
            </div>
            <a href="#/contents/${content.id}/results" class="text-cenat-green hover:text-cenat-green-hover text-sm whitespace-nowrap" title="${t('contentManager.quiz.view_results_title')}">
                <i class="fas fa-chart-bar mr-1"></i> ${t('contentManager.quiz.view_results')}
            </a>
            <button onclick="editContentHandler(${content.id})" class="text-gray-400 hover:text-cenat-green px-2" title="${t('contentManager.edit_title')}">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button onclick="deleteContentHandler(${content.id}, '${content.type}')" class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

function renderForumItem(content) {
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            <i class="fas fa-comments text-xl text-cenat-green"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">${escapeHtml(content.title)}</p>
                <p class="text-xs text-gray-500 truncate">${escapeHtml(content.description || '')}</p>
            </div>
            <a href="#/forum/${content.id}" class="text-cenat-green hover:text-cenat-green-hover text-sm whitespace-nowrap" title="${t('contentManager.forum.view')}">
                <i class="fas fa-comment-dots mr-1"></i> ${t('contentManager.forum.view')}
            </a>
            <button onclick="editContentHandler(${content.id})" class="text-gray-400 hover:text-cenat-green px-2" title="${t('contentManager.edit_title')}">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button onclick="deleteContentHandler(${content.id}, 'forum')" class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

/**
 * Boilerplate compartido por el submit de cada formulario "Agregar X"
 * (carpeta/video/archivo/imagen/texto/url/foro/tarea/quiz/encuesta):
 * deshabilita el botón con un spinner, llama la API, muestra el toast de
 * éxito y re-renderiza el panel — o restaura el botón a su texto normal
 * si falló. Lo específico de cada formulario (qué campos leer, validarlos,
 * armar el payload/FormData, y qué endpoint llamar) sigue viviendo en
 * cada showAddXForm — solo este tramo final, idéntico en los 9, se
 * comparte acá.
 */
async function submitContentForm(submitBtn, { loadingLabel, idleLabel, apiCall, successMessage, errorMessage }) {
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-1"></i> ${loadingLabel}`;

        await apiCall();
        showToast(successMessage, 'success');
        contentManagerRerender();

    } catch (error) {
        showToast(error.message || errorMessage, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = idleLabel;
    }
}

// =================================
// Formulario para crear CARPETA
// =================================

function showAddFolderForm(courseId) {
    const container = document.getElementById('add-folder-form-container');

    container.innerHTML = `
        <form id="add-folder-form" class="bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.folders.name_label')}</label>
                <input type="text" id="folder-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="${t('contentManager.folders.name_placeholder')}">
            </div>
            <div class="flex gap-2">
                <button type="submit" id="submit-folder-btn" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> ${t('contentManager.folders.create_button')}
                </button>
                <button type="button" onclick="document.getElementById('add-folder-form-container').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    document.getElementById('add-folder-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('folder-title').value.trim();
        const submitBtn = document.getElementById('submit-folder-btn');

        if (!title) {
            showToast(t('contentManager.folders.name_required'), 'error');
            return;
        }

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.creating'),
            idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.folders.create_button')}`,
            apiCall: () => contentsAPI.createFolder({ course_id: courseId, title }),
            successMessage: t('contentManager.folders.created'),
            errorMessage: t('contentManager.folders.create_failed')
        });
    });
}

// =================================
// Formulario para agregar VIDEO
// =================================

function showAddVideoForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-video-form-container', folderId));

    container.innerHTML = `
        <form class="add-video-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.videos.title_label')}</label>
                <input type="text" class="video-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t('contentManager.videos.title_placeholder')}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.videos.description_label')}</label>
                <input type="text" class="video-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.videos.file_label')}</label>
                <input type="file" class="video-file w-full text-sm" accept="video/*" required>
                <p class="text-xs text-gray-500 mt-1">${t('contentManager.videos.formats_hint')}</p>
                <video class="video-preview hidden w-full rounded-lg mt-2 max-h-64" controls></video>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-video-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-upload mr-1"></i> ${t('contentManager.videos.submit')}
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-video-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    // Previsualización local del video elegido, antes de subirlo — solo
    // usa createObjectURL (no toca el servidor), así el profesor puede
    // confirmar que seleccionó el archivo correcto.
    const videoFileInput = container.querySelector('.video-file');
    const videoPreview = container.querySelector('.video-preview');
    let previewObjectUrl = null;
    videoFileInput.addEventListener('change', () => {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        const file = videoFileInput.files[0];
        if (!file) {
            videoPreview.classList.add('hidden');
            videoPreview.removeAttribute('src');
            return;
        }
        previewObjectUrl = URL.createObjectURL(file);
        videoPreview.src = previewObjectUrl;
        videoPreview.classList.remove('hidden');
    });

    container.querySelector('.add-video-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.video-title').value.trim();
        const description = e.target.querySelector('.video-description').value.trim();
        const videoFile = e.target.querySelector('.video-file').files[0];
        const submitBtn = e.target.querySelector('.submit-video-btn');

        if (!title || !videoFile) {
            showToast(t('contentManager.videos.required'), 'error');
            return;
        }
        if (!checkFileSize(videoFile, MAX_VIDEO_BYTES, t('contentManager.videos.field_label'))) return;

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('video', videoFile);
        if (folderId) formData.append('folder_id', folderId);

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.uploading'),
            idleLabel: `<i class="fas fa-upload mr-1"></i> ${t('contentManager.videos.submit')}`,
            apiCall: () => contentsAPI.createVideo(formData),
            successMessage: t('contentManager.videos.added'),
            errorMessage: t('contentManager.videos.add_failed')
        });
    });
}

// =================================
// Formulario para agregar ARCHIVO
// =================================

function showAddFileForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-file-form-container', folderId));

    container.innerHTML = `
        <form class="add-file-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.file.title_label')}</label>
                <input type="text" class="file-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t('contentManager.file.title_placeholder')}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.file.description_label')}</label>
                <input type="text" class="file-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.file.file_label')}</label>
                <input type="file" class="file-upload w-full text-sm" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar" required>
                <p class="text-xs text-gray-500 mt-1">${t('contentManager.file.formats_hint')}</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-file-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-upload mr-1"></i> ${t('contentManager.file.submit')}
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-file-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    container.querySelector('.add-file-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.file-title').value.trim();
        const description = e.target.querySelector('.file-description').value.trim();
        const file = e.target.querySelector('.file-upload').files[0];
        const submitBtn = e.target.querySelector('.submit-file-btn');

        if (!title || !file) {
            showToast(t('contentManager.file.required'), 'error');
            return;
        }
        if (!checkFileSize(file, MAX_DOC_BYTES, t('contentManager.file.field_label'))) return;

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.uploading'),
            idleLabel: `<i class="fas fa-upload mr-1"></i> ${t('contentManager.file.submit')}`,
            apiCall: () => contentsAPI.createFile(formData),
            successMessage: t('contentManager.file.added'),
            errorMessage: t('contentManager.file.add_failed')
        });
    });
}

// =================================
// Formulario para agregar IMAGEN
// =================================

function showAddImageForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-image-form-container', folderId));

    container.innerHTML = `
        <form class="add-image-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.image.title_label')}</label>
                <input type="text" class="image-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t('contentManager.image.title_placeholder')}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.image.description_label')}</label>
                <input type="text" class="image-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.image.file_label')}</label>
                <input type="file" class="image-file w-full text-sm" accept="image/*" required>
                <p class="text-xs text-gray-500 mt-1">${t('contentManager.image.formats_hint')}</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-image-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-upload mr-1"></i> ${t('contentManager.image.submit')}
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-image-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    container.querySelector('.add-image-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.image-title').value.trim();
        const description = e.target.querySelector('.image-description').value.trim();
        const imageFile = e.target.querySelector('.image-file').files[0];
        const submitBtn = e.target.querySelector('.submit-image-btn');

        if (!title || !imageFile) {
            showToast(t('contentManager.image.required'), 'error');
            return;
        }
        if (!checkFileSize(imageFile, MAX_IMAGE_BYTES, t('contentManager.image.field_label'))) return;

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('image', imageFile);
        if (folderId) formData.append('folder_id', folderId);

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.uploading'),
            idleLabel: `<i class="fas fa-upload mr-1"></i> ${t('contentManager.image.submit')}`,
            apiCall: () => contentsAPI.createImage(formData),
            successMessage: t('contentManager.image.added'),
            errorMessage: t('contentManager.image.add_failed')
        });
    });
}

// =================================
// Formulario para agregar TEXTO
// =================================

function showAddTextForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-text-form-container', folderId));

    container.innerHTML = `
        <form class="add-text-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.text.title_label')}</label>
                <input type="text" class="text-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t('contentManager.text.title_placeholder')}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.text.content_label')}</label>
                <textarea class="text-content w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required rows="5" placeholder="${t('contentManager.text.content_placeholder')}"></textarea>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-text-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> ${t('contentManager.text.submit')}
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-text-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    container.querySelector('.add-text-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.text-title').value.trim();
        const description = e.target.querySelector('.text-content').value.trim();
        const submitBtn = e.target.querySelector('.submit-text-btn');

        if (!title || !description) {
            showToast(t('contentManager.text.required'), 'error');
            return;
        }

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.saving'),
            idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.text.submit')}`,
            apiCall: () => contentsAPI.createText({ course_id: courseId, title, description, folder_id: folderId || undefined }),
            successMessage: t('contentManager.text.added'),
            errorMessage: t('contentManager.text.add_failed')
        });
    });
}

// =================================
// Formulario para agregar URL de video externo
// =================================

function showAddUrlForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-url-form-container', folderId));

    container.innerHTML = `
        <form class="add-url-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.url.title_label')}</label>
                <input type="text" class="url-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t('contentManager.url.title_placeholder')}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.url.description_label')}</label>
                <input type="text" class="url-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.url.url_label')}</label>
                <input type="url" class="url-value w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t('contentManager.url.url_placeholder')}">
                <p class="text-xs text-gray-500 mt-1">${t('contentManager.url.url_hint')}</p>
            </div>
            <div class="url-preview-container"></div>
            <div class="flex gap-2">
                <button type="submit" class="submit-url-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> ${t('contentManager.url.submit')}
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-url-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    // Previsualización en vivo: al pegar/escribir la URL, si se reconoce
    // como YouTube/Vimeo se embebe ahí mismo para que el profesor confirme
    // que es el video correcto antes de guardar. YouTube usa la misma API
    // oficial que la vista del estudiante (ver createYoutubeEmbed en
    // utils.js) — un <iframe src="..."> simple resultó fallar en algunos
    // navegadores/redes (cookies de terceros bloqueadas), mientras que el
    // embed armado por la API sí funciona ahí.
    const previewContainer = container.querySelector('.url-preview-container');
    const previewEmbedId = scopeId('url-preview-embed', folderId);
    container.querySelector('.url-value').addEventListener('input', debounce((e) => {
        const url = e.target.value.trim();
        const youtubeId = getYoutubeVideoId(url);
        const vimeoUrl = !youtubeId ? getVimeoEmbedUrl(url) : null;

        if (youtubeId) {
            previewContainer.innerHTML = `
                <div data-embed-wrapper>
                    <div class="video-player-container">
                        <div id="${previewEmbedId}"></div>
                    </div>
                    <div data-embed-fallback class="hidden text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mt-2">
                        <i class="fas fa-triangle-exclamation text-yellow-500 mr-1"></i>
                        ${t('contentManager.url.preview_failed')}
                    </div>
                </div>
            `;
            createYoutubeEmbed(previewEmbedId, youtubeId);
        } else if (vimeoUrl) {
            previewContainer.innerHTML = `
                <div class="video-player-container">
                    <iframe src="${vimeoUrl}" frameborder="0" allowfullscreen></iframe>
                </div>
            `;
        } else {
            previewContainer.innerHTML = '';
        }
    }, 400));

    container.querySelector('.add-url-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.url-title').value.trim();
        const description = e.target.querySelector('.url-description').value.trim();
        const url = e.target.querySelector('.url-value').value.trim();
        const submitBtn = e.target.querySelector('.submit-url-btn');

        if (!title || !url) {
            showToast(t('contentManager.url.required'), 'error');
            return;
        }

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.saving'),
            idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.url.submit')}`,
            apiCall: () => contentsAPI.createUrl({ course_id: courseId, title, description, url, folder_id: folderId || undefined }),
            successMessage: t('contentManager.url.added'),
            errorMessage: t('contentManager.url.add_failed')
        });
    });
}

// =================================
// Formulario para agregar TEMA DE FORO
// =================================

function showAddForumForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-forum-form-container', folderId));

    container.innerHTML = `
        <form class="add-forum-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.forum.title_label')}</label>
                <input type="text" class="forum-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t('contentManager.forum.title_placeholder')}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.forum.body_label')}</label>
                <textarea class="forum-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required rows="4" placeholder="${t('contentManager.forum.body_placeholder')}"></textarea>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-forum-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> ${t('contentManager.forum.submit')}
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-forum-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    container.querySelector('.add-forum-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.forum-title').value.trim();
        const description = e.target.querySelector('.forum-description').value.trim();
        const submitBtn = e.target.querySelector('.submit-forum-btn');

        if (!title || !description) {
            showToast(t('contentManager.forum.required'), 'error');
            return;
        }

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.creating'),
            idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.forum.submit')}`,
            apiCall: () => contentsAPI.createForum({ course_id: courseId, title, description, folder_id: folderId || undefined }),
            successMessage: t('contentManager.forum.created'),
            errorMessage: t('contentManager.forum.create_failed')
        });
    });
}

// =================================
// Formulario para agregar TAREA
// =================================

function showAddTaskForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-task-form-container', folderId));

    container.innerHTML = `
        <form class="add-task-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.task.title_label')}</label>
                <input type="text" class="task-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t('contentManager.task.title_placeholder')}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.task.instructions_label')}</label>
                <textarea class="task-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" rows="3" placeholder="${t('contentManager.task.instructions_placeholder')}"></textarea>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.task.file_label')}</label>
                <input type="file" class="task-file w-full text-sm" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar">
                <p class="text-xs text-gray-500 mt-1">${t('contentManager.task.formats_hint')}</p>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.task.weight_label')}</label>
                <input type="number" class="task-weight w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" min="0" max="100" step="0.01" placeholder="${t('contentManager.task.weight_placeholder')}">
                <p class="text-xs text-gray-500 mt-1">${t('contentManager.task.weight_hint')}</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-task-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> ${t('contentManager.task.submit')}
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-task-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    ${t('contentManager.cancel')}
                </button>
            </div>
        </form>
    `;

    container.querySelector('.add-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.task-title').value.trim();
        const description = e.target.querySelector('.task-description').value.trim();
        const file = e.target.querySelector('.task-file').files[0];
        const weight = e.target.querySelector('.task-weight').value.trim();
        const submitBtn = e.target.querySelector('.submit-task-btn');

        if (!title) {
            showToast(t('contentManager.title_required'), 'error');
            return;
        }
        // El archivo de instrucciones es opcional en una tarea (a
        // diferencia de video/archivo/imagen) — solo se chequea el
        // tamaño si efectivamente se adjuntó uno.
        if (file && !checkFileSize(file, MAX_DOC_BYTES, t('contentManager.task.field_label'))) return;

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        if (file) {
            formData.append('file', file);
        }
        if (weight) formData.append('weight_percent', weight);
        if (folderId) formData.append('folder_id', folderId);

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.saving'),
            idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.task.submit')}`,
            apiCall: () => contentsAPI.createTask(formData),
            successMessage: t('contentManager.task.added'),
            errorMessage: t('contentManager.task.add_failed')
        });
    });
}

// =================================
// Formulario para CUESTIONARIO o ENCUESTA (crear y editar preguntas)
// Comparten el mismo formulario dinámico: el tipo de pregunta se elige una
// sola vez para todo el cuestionario/encuesta (no se mezcla por pregunta),
// y la única diferencia visual es que una encuesta no muestra el radio de
// "marcar como correcta" (no tiene sentido, no hay respuesta correcta).
// `renderQuestionForm` es compartido entre crear (showAddQuizForm/
// showAddSurveyForm más abajo) y editar (editQuestionContentHandler, ver
// sección "Editar contenido existente") — la única diferencia real es si
// arranca vacío o precargado con datos existentes, y a qué endpoint apunta
// el submit (eso lo decide quien llama, vía `apiCall`).
// =================================

function getQuestionTypeOptions() {
    return [
        { value: 'multiple_choice', label: t('contentManager.quiz.type_multiple_choice') },
        { value: 'true_false', label: t('contentManager.quiz.type_true_false') },
        { value: 'short_answer', label: t('contentManager.quiz.type_short_answer') }
    ];
}

// El tipo de pregunta se elige por pregunta, no una sola vez para todo el
// cuestionario/encuesta — cada fila puede ser de un tipo distinto (ej. una
// opción múltiple, otra verdadero/falso, otra respuesta corta).
function blankOptionsForType(questionType) {
    if (questionType === 'true_false') {
        return [{ text: t('contentManager.quiz.option_true'), is_correct: true }, { text: t('contentManager.quiz.option_false'), is_correct: false }];
    }
    if (questionType === 'multiple_choice') {
        return [{ text: '', is_correct: true }, { text: '', is_correct: false }];
    }
    return null; // short_answer no lleva opciones
}

function renderQuestionForm(container, {
    kind,
    initialTitle = '',
    initialDescription = '',
    initialQuestions = null,
    initialWeightPercent = null,
    idleLabel,
    apiCall,
    successMessage,
    errorMessage,
    onCancel
}) {
    const isQuiz = kind === 'quiz';

    let questions = (initialQuestions && initialQuestions.length > 0)
        ? initialQuestions
        : [{ text: '', question_type: 'multiple_choice', options: blankOptionsForType('multiple_choice'), points: 1 }];

    // Lee el estado ACTUAL desde el DOM (no desde `questions`) antes de
    // cualquier re-render estructural (agregar/quitar pregunta u opción,
    // cambiar el tipo) — así no se pierde lo que el profesor ya escribió.
    function readCurrentQuestions() {
        return Array.from(listEl.querySelectorAll('.question-row')).map((row) => {
            const text = row.querySelector('.question-text').value;
            const question_type = row.querySelector('.question-type-select').value;
            const pointsInput = row.querySelector('.question-points');
            const points = pointsInput ? Math.max(1, parseInt(pointsInput.value, 10) || 1) : 1;
            const optionRows = row.querySelectorAll('.option-row');
            if (optionRows.length === 0) return { text, question_type, options: null, points };
            const options = Array.from(optionRows).map((optRow) => {
                const textInput = optRow.querySelector('.option-text');
                const radio = optRow.querySelector('.option-correct-radio');
                return {
                    text: textInput ? textInput.value : optRow.dataset.fixedText,
                    is_correct: radio ? radio.checked : false
                };
            });
            return { text, question_type, options, points };
        });
    }

    function optionRowHTML(opt, qIndex, oIndex, options, questionType) {
        const isTrueFalse = questionType === 'true_false';
        return `
            <div class="option-row flex items-center gap-2" ${isTrueFalse ? `data-fixed-text="${escapeAttr(opt.text)}"` : ''}>
                ${isQuiz ? `<input type="radio" name="correct-${qIndex}" class="option-correct-radio" ${opt.is_correct ? 'checked' : ''}>` : ''}
                ${isTrueFalse
                    ? `<span class="text-sm text-gray-700 flex-1">${escapeHtml(opt.text)}</span>`
                    : `<input type="text" class="option-text flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="${t('contentManager.quiz.option_placeholder', { n: oIndex + 1 })}" value="${escapeAttr(opt.text)}">`
                }
                ${!isTrueFalse && options.length > 2 ? `
                    <button type="button" class="remove-option-btn text-gray-400 hover:text-red-500 px-1" title="${t('contentManager.quiz.remove_option_title')}">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }

    function questionRowHTML(q, qIndex) {
        const questionType = q.question_type;
        const showOptions = questionType !== 'short_answer';
        return `
            <div class="question-row border border-gray-200 rounded-lg p-3 space-y-2" data-q-index="${qIndex}">
                <div class="flex items-start gap-2 flex-wrap">
                    <span class="text-sm font-semibold text-gray-500 mt-2">${qIndex + 1}.</span>
                    <input type="text" class="question-text flex-1 min-w-[10rem] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="${t('contentManager.quiz.question_placeholder')}" value="${escapeAttr(q.text || '')}">
                    <select class="question-type-select px-2 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" title="${t('contentManager.quiz.question_type_title')}">
                        ${getQuestionTypeOptions().map((opt) => `<option value="${opt.value}" ${questionType === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                    </select>
                    ${isQuiz ? `
                        <input type="number" class="question-points w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-cenat-green" min="1" step="1" title="${t('contentManager.quiz.points_title')}" value="${q.points || 1}">
                    ` : ''}
                    <button type="button" class="remove-question-btn text-red-500 hover:text-red-700 px-2 mt-1" title="${t('contentManager.quiz.remove_question_title')}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${showOptions ? `
                    <div class="pl-6 space-y-1">
                        ${(q.options || []).map((opt, oIndex) => optionRowHTML(opt, qIndex, oIndex, q.options, questionType)).join('')}
                        ${questionType === 'multiple_choice' ? `
                            <button type="button" class="add-option-btn text-xs text-cenat-green hover:underline mt-1">
                                <i class="fas fa-plus mr-1"></i> ${t('contentManager.quiz.add_option')}
                            </button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    function rerender() {
        listEl.innerHTML = questions.map(questionRowHTML).join('');
    }

    container.innerHTML = `
        <form class="question-content-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t(isQuiz ? 'contentManager.quiz.title_label_quiz' : 'contentManager.quiz.title_label_survey')}</label>
                <input type="text" class="quiz-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="${t(isQuiz ? 'contentManager.quiz.title_placeholder_quiz' : 'contentManager.quiz.title_placeholder_survey')}" value="${escapeAttr(initialTitle)}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.quiz.description_label')}</label>
                <input type="text" class="quiz-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" value="${escapeAttr(initialDescription)}">
            </div>
            ${isQuiz ? `
                <div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.quiz.weight_label')}</label>
                    <input type="number" class="quiz-weight w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" min="0" max="100" step="0.01" placeholder="${t('contentManager.quiz.weight_placeholder')}" value="${initialWeightPercent ?? ''}">
                    <p class="text-xs text-gray-500 mt-1">${t('contentManager.quiz.weight_hint')}</p>
                </div>
            ` : ''}
            <div class="questions-list space-y-3"></div>
            <button type="button" class="add-question-btn text-sm text-cenat-green hover:underline">
                <i class="fas fa-plus mr-1"></i> ${t('contentManager.quiz.add_question')}
            </button>
            <div class="flex gap-2 pt-2 border-t border-green-100">
                <button type="submit" class="submit-quiz-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    ${idleLabel}
                </button>
                <button type="button" class="cancel-quiz-btn text-gray-600 px-4 py-2 text-sm">${t('contentManager.cancel')}</button>
            </div>
        </form>
    `;

    const formEl = container.querySelector('form');
    const listEl = formEl.querySelector('.questions-list');

    rerender();

    formEl.querySelector('.cancel-quiz-btn').addEventListener('click', onCancel);

    formEl.querySelector('.add-question-btn').addEventListener('click', () => {
        questions = readCurrentQuestions();
        questions.push({ text: '', question_type: 'multiple_choice', options: blankOptionsForType('multiple_choice'), points: 1 });
        rerender();
    });

    // Cambiar el tipo de UNA pregunta reinicia solo sus opciones (el resto
    // de preguntas del formulario no se toca) — delegado en listEl por el
    // mismo motivo que el resto de listeners de esta lista.
    listEl.addEventListener('change', (e) => {
        const typeSelect = e.target.closest('.question-type-select');
        if (!typeSelect) return;
        questions = readCurrentQuestions();
        const qIndex = Number(typeSelect.closest('.question-row').dataset.qIndex);
        questions[qIndex].question_type = typeSelect.value;
        questions[qIndex].options = blankOptionsForType(typeSelect.value);
        rerender();
    });

    // Delegado en listEl (no en cada fila): sigue funcionando después de
    // cada rerender() sin tener que re-enganchar listeners a mano.
    listEl.addEventListener('click', (e) => {
        const removeQBtn = e.target.closest('.remove-question-btn');
        if (removeQBtn) {
            questions = readCurrentQuestions();
            if (questions.length <= 1) {
                showToast(t('contentManager.quiz.at_least_one_question'), 'warning');
                return;
            }
            const qIndex = Number(removeQBtn.closest('.question-row').dataset.qIndex);
            questions.splice(qIndex, 1);
            rerender();
            return;
        }

        const addOptBtn = e.target.closest('.add-option-btn');
        if (addOptBtn) {
            questions = readCurrentQuestions();
            const qIndex = Number(addOptBtn.closest('.question-row').dataset.qIndex);
            questions[qIndex].options.push({ text: '', is_correct: false });
            rerender();
            return;
        }

        const removeOptBtn = e.target.closest('.remove-option-btn');
        if (removeOptBtn) {
            questions = readCurrentQuestions();
            const row = removeOptBtn.closest('.question-row');
            const qIndex = Number(row.dataset.qIndex);
            const oIndex = Array.from(row.querySelectorAll('.option-row')).indexOf(removeOptBtn.closest('.option-row'));
            questions[qIndex].options.splice(oIndex, 1);
            if (isQuiz && !questions[qIndex].options.some((o) => o.is_correct)) {
                questions[qIndex].options[0].is_correct = true;
            }
            rerender();
        }
    });

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = formEl.querySelector('.quiz-title').value.trim();
        const description = formEl.querySelector('.quiz-description').value.trim();
        const submitBtn = formEl.querySelector('.submit-quiz-btn');
        const currentQuestions = readCurrentQuestions();

        if (!title) {
            showToast(t('contentManager.title_required'), 'error');
            return;
        }
        if (currentQuestions.some((q) => !q.text.trim())) {
            showToast(t('contentManager.quiz.all_questions_need_text'), 'error');
            return;
        }
        const withOptions = currentQuestions.filter((q) => q.question_type !== 'short_answer');
        if (withOptions.some((q) => (q.options || []).some((o) => !o.text.trim()))) {
            showToast(t('contentManager.quiz.all_options_need_text'), 'error');
            return;
        }
        if (isQuiz && withOptions.some((q) => !(q.options || []).some((o) => o.is_correct))) {
            showToast(t('contentManager.quiz.mark_correct_option'), 'error');
            return;
        }

        const weightInput = formEl.querySelector('.quiz-weight');
        const payload = {
            title,
            description,
            weight_percent: (isQuiz && weightInput && weightInput.value.trim()) ? weightInput.value.trim() : undefined,
            questions: currentQuestions.map((q) => ({
                text: q.text.trim(),
                question_type: q.question_type,
                points: isQuiz ? (q.points || 1) : 1,
                options: q.question_type === 'short_answer'
                    ? undefined
                    : q.options.map((o) => ({ text: o.text.trim(), is_correct: !!o.is_correct }))
            }))
        };

        await submitContentForm(submitBtn, {
            loadingLabel: t('contentManager.saving'),
            idleLabel,
            apiCall: () => apiCall(payload),
            successMessage,
            errorMessage
        });
    });
}

function showAddQuestionForm(courseId, folderId, kind) {
    const isQuiz = kind === 'quiz';
    const create = isQuiz ? contentsAPI.createQuiz : contentsAPI.createSurvey;
    const container = document.getElementById(scopeId(`add-${kind}-form-container`, folderId));

    renderQuestionForm(container, {
        kind,
        idleLabel: `<i class="fas fa-check mr-1"></i> ${t(isQuiz ? 'contentManager.quiz.save_quiz' : 'contentManager.quiz.save_survey')}`,
        apiCall: (payload) => create({ ...payload, course_id: courseId, folder_id: folderId || undefined }),
        successMessage: t(isQuiz ? 'contentManager.quiz.added_quiz' : 'contentManager.quiz.added_survey'),
        errorMessage: t(isQuiz ? 'contentManager.quiz.add_failed_quiz' : 'contentManager.quiz.add_failed_survey'),
        onCancel: () => { container.innerHTML = ''; }
    });
}

function showAddQuizForm(courseId, folderId) {
    showAddQuestionForm(courseId, folderId, 'quiz');
}

function showAddSurveyForm(courseId, folderId) {
    showAddQuestionForm(courseId, folderId, 'survey');
}

// =================================
// Editar contenido existente (sin borrar y recrear)
// =================================
// Mismo par content-display-{id}/content-edit-{id} para cualquier tipo
// (ver renderDraggableItem/renderDraggableFolderItem): editar oculta la
// fila normal y muestra el formulario en su lugar; cancelar o guardar la
// vuelve a mostrar (guardar además dispara un re-render completo del
// panel vía contentManagerRerender, que ya refresca todo).

/**
 * Los datos del contenido salen del propio DOM (data-content-json en el
 * .draggable-item, ver encodeDataAttr) — no hace falta pedirlos de nuevo
 * al servidor, ya llegaron con el resto del contenido del curso. Un quiz/
 * survey es la excepción (ver editQuestionContentHandler): sus preguntas
 * no viajan en esa fila, hay que pedirlas aparte.
 */
function editContentHandler(id) {
    const row = document.querySelector(`.draggable-item[data-content-id="${id}"]`);
    if (!row) return;
    const content = JSON.parse(row.dataset.contentJson);

    const display = document.getElementById(`content-display-${id}`);
    const editContainer = document.getElementById(`content-edit-${id}`);
    if (!display || !editContainer) return;

    if (['quiz', 'survey'].includes(content.type)) {
        editQuestionContentHandler(content, display, editContainer);
        return;
    }

    display.classList.add('hidden');
    editContainer.innerHTML = renderEditForm(content);

    const form = editContainer.querySelector('.edit-content-form');
    form.addEventListener('submit', (e) => submitEditContent(e, content));
    form.querySelector('.cancel-edit-btn').addEventListener('click', () => cancelEditContent(id));
}

/**
 * Editar un quiz/survey pide primero las preguntas actuales al servidor
 * (con is_correct, y el conteo de respondentes) — eso no viene en
 * data-content-json. Si ya hay respuestas, se cae al formulario simple de
 * título/descripción (con el aviso de por qué no se puede tocar la
 * estructura); si nadie respondió todavía, se ofrece el editor completo de
 * preguntas (mismo formulario que crear, precargado con lo existente).
 */
async function editQuestionContentHandler(content, display, editContainer) {
    editContainer.innerHTML = `<p class="text-xs text-gray-400 mt-2 px-1">${t('contentManager.quiz.loading_questions')}</p>`;

    let data;
    try {
        ({ data } = await contentsAPI.getQuestionsForManage(content.id));
    } catch (error) {
        editContainer.innerHTML = '';
        showToast(error.message || t('contentManager.quiz.load_questions_failed'), 'error');
        return;
    }

    display.classList.add('hidden');

    if (data.respondent_count > 0) {
        editContainer.innerHTML = renderEditForm(content, data.respondent_count);
        const form = editContainer.querySelector('.edit-content-form');
        form.addEventListener('submit', (e) => submitEditContent(e, content));
        form.querySelector('.cancel-edit-btn').addEventListener('click', () => cancelEditContent(content.id));
        return;
    }

    const isQuiz = content.type === 'quiz';
    renderQuestionForm(editContainer, {
        kind: content.type,
        initialTitle: content.title,
        initialDescription: content.description || '',
        initialWeightPercent: data.weight_percent,
        initialQuestions: data.questions.map((q) => ({
            text: q.question_text,
            question_type: q.question_type,
            points: q.points || 1,
            options: (q.options || []).length > 0
                ? q.options.map((o) => ({ text: o.option_text, is_correct: !!o.is_correct }))
                : null
        })),
        idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.save')}`,
        apiCall: (payload) => contentsAPI.updateQuestions(content.id, payload),
        successMessage: t(isQuiz ? 'contentManager.quiz.updated_quiz' : 'contentManager.quiz.updated_survey'),
        errorMessage: t(isQuiz ? 'contentManager.quiz.update_failed_quiz' : 'contentManager.quiz.update_failed_survey'),
        onCancel: () => cancelEditContent(content.id)
    });
}

function cancelEditContent(id) {
    const editContainer = document.getElementById(`content-edit-${id}`);
    if (editContainer) editContainer.innerHTML = '';
    const display = document.getElementById(`content-display-${id}`);
    if (display) display.classList.remove('hidden');
}

/**
 * Campos según el tipo — todos comparten título; el resto varía porque
 * cada tipo guarda su "contenido real" en un lugar distinto (texto/foro en
 * description, url en url, video/imagen/archivo/tarea en un archivo que
 * se puede reemplazar opcionalmente). Un cuestionario/encuesta solo llega
 * acá cuando ya tiene respuestas (ver editQuestionContentHandler) — sin
 * respuestas se usa el editor completo de preguntas (renderQuestionForm),
 * y con respuestas cambiar la estructura implicaría borrarlas.
 */
function renderEditForm(content, respondentCount = 0) {
    const titleField = `
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.edit.title_label')}</label>
            <input type="text" class="edit-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required value="${escapeAttr(content.title)}">
        </div>
    `;

    const descriptionField = (label, required = false, rows = null) => `
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">${label}</label>
            ${rows
                ? `<textarea class="edit-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" rows="${rows}" ${required ? 'required' : ''}>${escapeHtml(content.description || '')}</textarea>`
                : `<input type="text" class="edit-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" ${required ? 'required' : ''} value="${escapeAttr(content.description || '')}">`
            }
        </div>
    `;

    const fileField = (label, accept, hint) => `
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">${label}</label>
            <input type="file" class="edit-file w-full text-sm" accept="${accept}">
            <p class="text-xs text-gray-500 mt-1">${hint} — ${t('contentManager.videos.keep_unchanged_hint')}</p>
        </div>
    `;

    const weightField = () => `
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.edit.weight_label')}</label>
            <input type="number" class="edit-weight w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" min="0" max="100" step="0.01" placeholder="${t('contentManager.edit.weight_placeholder')}" value="${content.weight_percent ?? ''}">
            <p class="text-xs text-gray-500 mt-1">${t('contentManager.edit.weight_hint')}</p>
        </div>
    `;

    let body = '';
    switch (content.type) {
        case 'folder':
            body = '';
            break;
        case 'text':
            body = descriptionField(t('contentManager.edit.content_label'), true, 5);
            break;
        case 'forum':
            body = descriptionField(t('contentManager.edit.main_text_label'), true, 4);
            break;
        case 'task':
            body = descriptionField(t('contentManager.edit.instructions_label'), false, 3)
                + fileField(t('contentManager.task.replace_file_label'), '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar', t('contentManager.task.formats_hint'))
                + weightField();
            break;
        case 'url':
            body = descriptionField(t('contentManager.edit.description_label'))
                + `<div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">${t('contentManager.edit.url_label')}</label>
                    <input type="url" class="edit-url w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required value="${escapeAttr(content.url || '')}">
                </div>`;
            break;
        case 'quiz':
        case 'survey': {
            const isQuizType = content.type === 'quiz';
            const noteKey = respondentCount === 1
                ? (isQuizType ? 'contentManager.quiz.respondent_note_quiz_singular' : 'contentManager.quiz.respondent_note_survey_singular')
                : (isQuizType ? 'contentManager.quiz.respondent_note_quiz_plural' : 'contentManager.quiz.respondent_note_survey_plural');
            body = descriptionField(t('contentManager.edit.description_label'))
                + (isQuizType ? weightField() : '')
                + `<p class="text-xs text-gray-400">${t(noteKey, { count: respondentCount })}</p>`;
            break;
        }
        case 'video':
            body = descriptionField(t('contentManager.edit.description_label'))
                + fileField(t('contentManager.videos.replace_label'), 'video/*', t('contentManager.videos.formats_hint'));
            break;
        case 'image':
            body = descriptionField(t('contentManager.edit.description_label'))
                + fileField(t('contentManager.image.replace_label'), 'image/*', t('contentManager.image.formats_hint'));
            break;
        case 'file':
            body = descriptionField(t('contentManager.edit.description_label'))
                + fileField(t('contentManager.file.replace_label'), '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar', t('contentManager.file.formats_hint'));
            break;
    }

    return `
        <form class="edit-content-form bg-green-50 rounded-lg p-4 space-y-3 mt-2">
            ${titleField}
            ${body}
            <div class="flex gap-2">
                <button type="submit" class="submit-edit-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> ${t('contentManager.save')}
                </button>
                <button type="button" class="cancel-edit-btn text-gray-600 px-4 py-2 text-sm">${t('contentManager.cancel')}</button>
            </div>
        </form>
    `;
}

async function submitEditContent(e, content) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('.submit-edit-btn');

    const title = form.querySelector('.edit-title').value.trim();
    if (!title) {
        showToast(t('contentManager.title_required'), 'error');
        return;
    }

    const descriptionInput = form.querySelector('.edit-description');
    const description = descriptionInput ? descriptionInput.value.trim() : undefined;
    if (descriptionInput && descriptionInput.required && !description) {
        showToast(t('contentManager.field_required'), 'error');
        return;
    }

    const urlInput = form.querySelector('.edit-url');
    if (urlInput && !urlInput.value.trim()) {
        showToast(t('contentManager.url.required_edit'), 'error');
        return;
    }

    const fileInput = form.querySelector('.edit-file');
    const file = fileInput ? fileInput.files[0] : null;
    if (file) {
        const maxBytes = content.type === 'video' ? MAX_VIDEO_BYTES : content.type === 'image' ? MAX_IMAGE_BYTES : MAX_DOC_BYTES;
        if (!checkFileSize(file, maxBytes, t('contentManager.file.field_label'))) return;
    }

    const weightInput = form.querySelector('.edit-weight');
    const weight = weightInput ? weightInput.value.trim() : undefined;

    let payload;
    if (file) {
        payload = new FormData();
        payload.append('title', title);
        if (descriptionInput) payload.append('description', description);
        if (weightInput) payload.append('weight_percent', weight);
        if (content.type === 'video') payload.append('video', file);
        else if (content.type === 'image') payload.append('image', file);
        else payload.append('file', file);
    } else {
        payload = { title };
        if (descriptionInput) payload.description = description;
        if (urlInput) payload.url = urlInput.value.trim();
        if (weightInput) payload.weight_percent = weight;
    }

    await submitContentForm(submitBtn, {
        loadingLabel: t('contentManager.saving'),
        idleLabel: `<i class="fas fa-check mr-1"></i> ${t('contentManager.save')}`,
        apiCall: () => contentsAPI.update(content.id, payload),
        successMessage: t('contentManager.content_updated'),
        errorMessage: t('contentManager.content_update_failed')
    });
}

function getDeleteContentTypeLabel(type) {
    const map = {
        video: t('contentManager.delete_type_video'),
        file: t('contentManager.delete_type_file'),
        image: t('contentManager.delete_type_image'),
        text: t('contentManager.delete_type_text'),
        url: t('contentManager.delete_type_url'),
        task: t('contentManager.delete_type_task'),
        quiz: t('contentManager.delete_type_quiz'),
        survey: t('contentManager.delete_type_survey'),
        forum: t('contentManager.delete_type_forum'),
        folder: t('contentManager.delete_type_folder')
    };
    return map[type] || t('contentManager.delete_type_default');
}

async function deleteContentHandler(id, type) {
    const label = getDeleteContentTypeLabel(type);
    if (!(await confirmAction(t('contentManager.delete_confirm', { label })))) {
        return;
    }

    try {
        await contentsAPI.delete(id);
        showToast(t('contentManager.content_deleted'), 'success');
        contentManagerRerender();
    } catch (error) {
        showToast(error.message || t('contentManager.content_delete_failed'), 'error');
    }
}

window.initCourseContentManager = initCourseContentManager;
window.renderCourseContentManagerHTML = renderCourseContentManagerHTML;
window.renderContentItem = renderContentItem;
window.renderTaskItem = renderTaskItem;
window.renderForumItem = renderForumItem;
window.showAddFolderForm = showAddFolderForm;
window.showAddVideoForm = showAddVideoForm;
window.showAddFileForm = showAddFileForm;
window.showAddImageForm = showAddImageForm;
window.showAddTextForm = showAddTextForm;
window.showAddUrlForm = showAddUrlForm;
window.showAddTaskForm = showAddTaskForm;
window.showAddQuizForm = showAddQuizForm;
window.showAddSurveyForm = showAddSurveyForm;
window.showAddForumForm = showAddForumForm;
window.deleteContentHandler = deleteContentHandler;
window.editContentHandler = editContentHandler;
window.cancelEditContent = cancelEditContent;
window.moveContentItem = moveContentItem;
