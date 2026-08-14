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

let contentManagerRerender = () => {};

function initCourseContentManager(rerenderFn) {
    contentManagerRerender = rerenderFn;
}

function scopeId(base, folderId) {
    return `${base}-${folderId || 'root'}`;
}

function renderCourseContentManagerHTML(course, contents) {
    const folders = contents.filter(c => c.type === 'folder');

    return `
        <div class="space-y-6">
            <!-- Sección Carpetas -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-bold text-gray-900">
                        <i class="fas fa-folder text-cenat-green mr-2"></i> Carpetas
                    </h2>
                    <button onclick="showAddFolderForm(${course.id})" class="text-sm bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
                        <i class="fas fa-plus mr-1"></i> Crear carpeta
                    </button>
                </div>
                <div id="add-folder-form-container"></div>
                ${folders.length === 0 ? `
                    <p class="text-gray-500 text-sm text-center py-4">No hay carpetas creadas aún. Crea una para agrupar contenido del curso (ej. varios archivos de un mismo tema).</p>
                ` : ''}
            </div>

            ${folders.map(folder => renderFolderCard(course.id, contents, folder)).join('')}

            <div class="space-y-6">
                ${folders.length > 0 ? `
                    <h2 class="text-xl font-bold text-gray-900 flex items-center gap-2 pt-2">
                        <i class="fas fa-inbox text-gray-400"></i> Contenido sin carpeta
                    </h2>
                ` : ''}
                ${renderContentTypeSections(course.id, contents, null, false)}
            </div>
        </div>
    `;
}

function renderFolderCard(courseId, contents, folder) {
    const itemCount = contents.filter(c => c.folder_id === folder.id).length;
    return `
        <details class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" open>
            <summary class="cursor-pointer list-none p-6 flex items-center justify-between">
                <div class="flex items-center gap-2 min-w-0">
                    <i class="fas fa-chevron-right text-gray-400 text-xs folder-chevron transition-transform"></i>
                    <i class="fas fa-folder-open text-cenat-green"></i>
                    <span class="font-bold text-gray-900 truncate">${escapeHtml(folder.title)}</span>
                    <span class="text-xs text-gray-400 whitespace-nowrap">(${itemCount} ${itemCount === 1 ? 'elemento' : 'elementos'})</span>
                </div>
                <button onclick="event.preventDefault(); deleteContentHandler(${folder.id}, 'folder')" class="text-red-500 hover:text-red-700 px-2 flex-shrink-0" title="Borrar carpeta">
                    <i class="fas fa-trash"></i>
                </button>
            </summary>
            <div class="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
                ${renderContentTypeSections(courseId, contents, folder.id, true)}
            </div>
        </details>
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
    const mixedItems = contents.filter(c => c.type !== 'video' && c.type !== 'folder' && inScope(c));

    const folderArg = folderId === null ? 'null' : folderId;
    const wrap = nested ? '' : 'bg-white rounded-xl shadow-sm border border-gray-100 p-6';
    const headingSize = nested ? 'text-sm' : 'text-lg';

    const videoSection = `
        <div class="${wrap}">
            <div class="flex items-center justify-between mb-3">
                <h3 class="${headingSize} font-bold text-gray-900">
                    <i class="fas fa-video text-cenat-green mr-2"></i> Videos
                </h3>
                <button onclick="showAddVideoForm(${courseId}, ${folderArg})" class="text-xs bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
                    <i class="fas fa-plus mr-1"></i> Agregar video
                </button>
            </div>
            <div id="${scopeId('add-video-form-container', folderId)}"></div>
            <div id="${scopeId('video-list', folderId)}" class="space-y-2 sortable-list" data-course-id="${courseId}">
                ${videos.length > 0 ? videos.map(renderDraggableItem).join('') : `
                    <p class="text-gray-500 text-sm text-center py-4">No hay videos agregados aún</p>
                `}
            </div>
        </div>
    `;

    const addButtons = [
        ['showAddUrlForm', 'fa-link', 'URL'],
        ['showAddFileForm', 'fa-file', 'Archivo'],
        ['showAddTextForm', 'fa-align-left', 'Texto'],
        ['showAddTaskForm', 'fa-tasks', 'Tarea'],
        ['showAddForumForm', 'fa-comments', 'Foro']
    ].map(([fn, icon, label]) => `
        <button onclick="${fn}(${courseId}, ${folderArg})" class="text-xs bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition whitespace-nowrap">
            <i class="fas ${icon} mr-1"></i> ${label}
        </button>
    `).join('');

    const mixedSection = `
        <div class="${wrap}">
            <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h3 class="${headingSize} font-bold text-gray-900">
                    <i class="fas fa-list text-cenat-green mr-2"></i> Contenido
                </h3>
                <div class="flex flex-wrap gap-2">${addButtons}</div>
            </div>
            <div id="${scopeId('add-url-form-container', folderId)}"></div>
            <div id="${scopeId('add-file-form-container', folderId)}"></div>
            <div id="${scopeId('add-text-form-container', folderId)}"></div>
            <div id="${scopeId('add-task-form-container', folderId)}"></div>
            <div id="${scopeId('add-forum-form-container', folderId)}"></div>
            ${mixedItems.length > 1 ? `
                <p class="text-xs text-gray-400 mb-2"><i class="fas fa-arrows-alt-v mr-1"></i> Arrastra para cambiar el orden</p>
            ` : ''}
            <div id="${scopeId('content-list', folderId)}" class="space-y-2 sortable-list" data-course-id="${courseId}">
                ${mixedItems.length > 0 ? mixedItems.map(renderDraggableItem).join('') : `
                    <p class="text-gray-500 text-sm text-center py-4">No hay contenido agregado aún</p>
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
        case 'text': return renderContentItem(content, 'text');
        case 'task': return renderTaskItem(content);
        case 'forum': return renderForumItem(content);
        default: return '';
    }
}

/**
 * Envuelve una fila de contenido con lo necesario para arrastrarla:
 * `draggable="true"`, un mango visual (decorativo — arrastrar desde
 * cualquier parte de la fila funciona igual, salvo desde un botón/link,
 * que el navegador no deja iniciar un drag ahí por default) y
 * `data-content-id` para leer el nuevo orden al soltar.
 */
function renderDraggableItem(content) {
    return `
        <div class="draggable-item flex items-stretch gap-1" draggable="true" data-content-id="${content.id}">
            <span class="drag-handle flex items-center px-1 text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0" title="Arrastrar para reordenar">
                <i class="fas fa-grip-vertical"></i>
            </span>
            <div class="flex-1 min-w-0">${renderManagerContentItem(content)}</div>
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

document.addEventListener('dragover', (e) => {
    if (!draggedItem) return;
    const container = e.target.closest('.sortable-list');
    // Solo se puede reordenar DENTRO de la misma lista (misma carpeta/nivel
    // Y mismo tipo de lista, Videos o Contenido) — arrastrar hacia otra
    // lista no hace nada, a propósito: no se mueve contenido entre
    // carpetas ni entre Videos y Contenido arrastrando.
    if (!container || !container.contains(draggedItem)) return;
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
    if (!container || !container.contains(draggedItem)) return;
    e.preventDefault();
    await persistContentOrder(container);
});

function getDragAfterElement(container, y) {
    const items = [...container.querySelectorAll('.draggable-item:not(.opacity-40)')];
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
    const ids = [...container.querySelectorAll('.draggable-item')].map(el => Number(el.dataset.contentId));

    try {
        await contentsAPI.reorder(courseId, ids);
    } catch (error) {
        showToast(error.message || 'Error al reordenar el contenido', 'error');
        contentManagerRerender();
    }
}

function renderContentItem(content, type) {
    const icons = { video: 'fa-play-circle', url: 'fa-link', text: 'fa-align-left', task: 'fa-tasks' };
    const icon = icons[type] || getFileIcon(content.url);
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            <i class="fas ${icon} text-xl text-cenat-green"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">${escapeHtml(content.title)}</p>
                ${content.file_size ? `<p class="text-xs text-gray-500">${formatFileSize(content.file_size)}</p>` : ''}
                ${type === 'url' ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(content.url)}</p>` : ''}
            </div>
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
                <p class="text-xs text-gray-500">${content.url ? 'Con archivo de instrucciones' : 'Sin archivo adjunto'}</p>
            </div>
            <a href="#/contents/${content.id}/submissions" class="text-cenat-green hover:text-cenat-green-hover text-sm whitespace-nowrap" title="Ver entregas">
                <i class="fas fa-inbox mr-1"></i> Entregas
            </a>
            <button onclick="deleteContentHandler(${content.id}, 'task')" class="text-red-500 hover:text-red-700 px-2">
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
            <a href="#/forum/${content.id}" class="text-cenat-green hover:text-cenat-green-hover text-sm whitespace-nowrap" title="Ver foro">
                <i class="fas fa-comment-dots mr-1"></i> Ver foro
            </a>
            <button onclick="deleteContentHandler(${content.id}, 'forum')" class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

// =================================
// Formulario para crear CARPETA
// =================================

function showAddFolderForm(courseId) {
    const container = document.getElementById('add-folder-form-container');

    container.innerHTML = `
        <form id="add-folder-form" class="bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Nombre de la carpeta *</label>
                <input type="text" id="folder-title" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="Ej: Semana 1 - Introducción">
            </div>
            <div class="flex gap-2">
                <button type="submit" id="submit-folder-btn" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> Crear Carpeta
                </button>
                <button type="button" onclick="document.getElementById('add-folder-form-container').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
                </button>
            </div>
        </form>
    `;

    document.getElementById('add-folder-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = document.getElementById('folder-title').value.trim();
        const submitBtn = document.getElementById('submit-folder-btn');

        if (!title) {
            showToast('El nombre de la carpeta es requerido', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Creando...';

            await contentsAPI.createFolder({ course_id: courseId, title });
            showToast('Carpeta creada exitosamente', 'success');
            contentManagerRerender();

        } catch (error) {
            showToast(error.message || 'Error al crear la carpeta', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Crear Carpeta';
        }
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
                <label class="block text-xs font-medium text-gray-700 mb-1">Título del video *</label>
                <input type="text" class="video-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="Ej: Introducción al curso">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" class="video-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Archivo de video *</label>
                <input type="file" class="video-file w-full text-sm" accept="video/*" required>
                <p class="text-xs text-gray-500 mt-1">Formatos: MP4, AVI, MOV, WEBM (máx. 2GB)</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-video-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-upload mr-1"></i> Subir Video
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-video-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
                </button>
            </div>
        </form>
    `;

    container.querySelector('.add-video-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.video-title').value.trim();
        const description = e.target.querySelector('.video-description').value.trim();
        const videoFile = e.target.querySelector('.video-file').files[0];
        const submitBtn = e.target.querySelector('.submit-video-btn');

        if (!title || !videoFile) {
            showToast('Título y archivo de video son requeridos', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('video', videoFile);
        if (folderId) formData.append('folder_id', folderId);

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

function showAddFileForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-file-form-container', folderId));

    container.innerHTML = `
        <form class="add-file-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Título del archivo *</label>
                <input type="text" class="file-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="Ej: Guía del curso">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" class="file-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Archivo *</label>
                <input type="file" class="file-upload w-full text-sm" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar" required>
                <p class="text-xs text-gray-500 mt-1">PDF, DOCX, PPT, XLS, TXT, ZIP, RAR (máx. 50MB)</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-file-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-upload mr-1"></i> Subir Archivo
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-file-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
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
            showToast('Título y archivo son requeridos', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('file', file);
        if (folderId) formData.append('folder_id', folderId);

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

// =================================
// Formulario para agregar TEXTO
// =================================

function showAddTextForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-text-form-container', folderId));

    container.innerHTML = `
        <form class="add-text-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input type="text" class="text-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="Ej: Lectura complementaria">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Contenido *</label>
                <textarea class="text-content w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required rows="5" placeholder="Escribe el texto que verán los estudiantes..."></textarea>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-text-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> Guardar Texto
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-text-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
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
            showToast('Título y contenido son requeridos', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Guardando...';

            await contentsAPI.createText({ course_id: courseId, title, description, folder_id: folderId || undefined });
            showToast('Texto agregado exitosamente', 'success');
            contentManagerRerender();

        } catch (error) {
            showToast(error.message || 'Error al guardar el texto', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Guardar Texto';
        }
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
                <label class="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input type="text" class="url-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="Ej: Video complementario en YouTube">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" class="url-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">URL del video *</label>
                <input type="url" class="url-value w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="https://www.youtube.com/watch?v=...">
                <p class="text-xs text-gray-500 mt-1">Debe empezar con http:// o https://</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-url-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> Guardar URL
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-url-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
                </button>
            </div>
        </form>
    `;

    container.querySelector('.add-url-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.url-title').value.trim();
        const description = e.target.querySelector('.url-description').value.trim();
        const url = e.target.querySelector('.url-value').value.trim();
        const submitBtn = e.target.querySelector('.submit-url-btn');

        if (!title || !url) {
            showToast('Título y URL son requeridos', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Guardando...';

            await contentsAPI.createUrl({ course_id: courseId, title, description, url, folder_id: folderId || undefined });
            showToast('URL agregada exitosamente', 'success');
            contentManagerRerender();

        } catch (error) {
            showToast(error.message || 'Error al guardar la URL', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Guardar URL';
        }
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
                <label class="block text-xs font-medium text-gray-700 mb-1">Título del tema *</label>
                <input type="text" class="forum-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="Ej: Discusión sobre el capítulo 3">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Texto principal *</label>
                <textarea class="forum-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required rows="4" placeholder="Escribe la pregunta o el tema que los estudiantes van a discutir..."></textarea>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-forum-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> Crear Tema
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-forum-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
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
            showToast('Título y texto principal son requeridos', 'error');
            return;
        }

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Creando...';

            await contentsAPI.createForum({ course_id: courseId, title, description, folder_id: folderId || undefined });
            showToast('Tema de foro creado exitosamente', 'success');
            contentManagerRerender();

        } catch (error) {
            showToast(error.message || 'Error al crear el tema de foro', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Crear Tema';
        }
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
                <label class="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                <input type="text" class="task-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="Ej: Ensayo final">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Instrucciones (opcional)</label>
                <textarea class="task-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" rows="3" placeholder="Describe qué debe entregar el estudiante..."></textarea>
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Archivo de plantilla/instrucciones (opcional)</label>
                <input type="file" class="task-file w-full text-sm" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar">
                <p class="text-xs text-gray-500 mt-1">PDF, DOCX, PPT, XLS, TXT, ZIP, RAR (máx. 50MB)</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-task-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> Guardar Tarea
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-task-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
                </button>
            </div>
        </form>
    `;

    container.querySelector('.add-task-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const title = e.target.querySelector('.task-title').value.trim();
        const description = e.target.querySelector('.task-description').value.trim();
        const file = e.target.querySelector('.task-file').files[0];
        const submitBtn = e.target.querySelector('.submit-task-btn');

        if (!title) {
            showToast('El título es requerido', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        if (file) {
            formData.append('file', file);
        }
        if (folderId) formData.append('folder_id', folderId);

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Guardando...';

            await contentsAPI.createTask(formData);
            showToast('Tarea agregada exitosamente', 'success');
            contentManagerRerender();

        } catch (error) {
            showToast(error.message || 'Error al guardar la tarea', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Guardar Tarea';
        }
    });
}

const CONTENT_TYPE_LABELS = {
    video: 'el video',
    file: 'el archivo',
    text: 'el texto',
    url: 'la URL',
    task: 'la tarea',
    forum: 'el tema de foro (se borran también todas sus respuestas)',
    folder: 'la carpeta'
};

async function deleteContentHandler(id, type) {
    const label = CONTENT_TYPE_LABELS[type] || 'el contenido';
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
window.renderTaskItem = renderTaskItem;
window.renderForumItem = renderForumItem;
window.showAddFolderForm = showAddFolderForm;
window.showAddVideoForm = showAddVideoForm;
window.showAddFileForm = showAddFileForm;
window.showAddTextForm = showAddTextForm;
window.showAddUrlForm = showAddUrlForm;
window.showAddTaskForm = showAddTaskForm;
window.showAddForumForm = showAddForumForm;
window.deleteContentHandler = deleteContentHandler;
