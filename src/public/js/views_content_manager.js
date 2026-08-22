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
            <!-- Crear carpeta -->
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
                ` : `
                    <p class="text-gray-400 text-xs">Las carpetas creadas aparecen mezcladas en "Contenido" abajo — arrástralas para ubicarlas donde quieras, incluso antes que un video.</p>
                `}
            </div>

            ${renderContentTypeSections(course.id, contents, null, false)}
        </div>
    `;
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
            <span class="drag-handle flex items-center px-1 text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0" title="Arrastrar para reordenar">
                <i class="fas fa-grip-vertical"></i>
            </span>
            <div class="flex-1 min-w-0">
                <div id="content-display-${folder.id}">
                    <details class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" open>
                        <summary class="cursor-pointer list-none p-4 flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2 min-w-0">
                                <i class="fas fa-chevron-right text-gray-400 text-xs folder-chevron transition-transform"></i>
                                <i class="fas fa-folder-open text-cenat-green"></i>
                                <span class="font-bold text-gray-900 truncate">${escapeHtml(folder.title)}</span>
                                <span class="text-xs text-gray-400 whitespace-nowrap">(${itemCount} ${itemCount === 1 ? 'elemento' : 'elementos'})</span>
                            </div>
                            <div class="flex items-center gap-1 flex-shrink-0">
                                <button onclick="event.preventDefault(); editContentHandler(${folder.id})" class="text-gray-400 hover:text-cenat-green px-2" title="Editar carpeta">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <button onclick="event.preventDefault(); deleteContentHandler(${folder.id}, 'folder')" class="text-red-500 hover:text-red-700 px-2" title="Borrar carpeta">
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
        ['showAddImageForm', 'fa-image', 'Imagen'],
        ['showAddTextForm', 'fa-align-left', 'Texto'],
        ['showAddTaskForm', 'fa-tasks', 'Tarea'],
        ['showAddQuizForm', 'fa-question-circle', 'Cuestionario'],
        ['showAddSurveyForm', 'fa-poll', 'Encuesta'],
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
            <div id="${scopeId('add-image-form-container', folderId)}"></div>
            <div id="${scopeId('add-text-form-container', folderId)}"></div>
            <div id="${scopeId('add-task-form-container', folderId)}"></div>
            <div id="${scopeId('add-quiz-form-container', folderId)}"></div>
            <div id="${scopeId('add-survey-form-container', folderId)}"></div>
            <div id="${scopeId('add-forum-form-container', folderId)}"></div>
            ${mixedItems.length > 1 ? `
                <p class="text-xs text-gray-400 mb-2"><i class="fas fa-arrows-alt-v mr-1"></i> Arrastra para cambiar el orden</p>
            ` : ''}
            <div id="${scopeId('content-list', folderId)}" class="space-y-2 sortable-list" data-course-id="${courseId}">
                ${mixedItems.length > 0 ? mixedItems.map(item => item.type === 'folder'
                    ? renderDraggableFolderItem(courseId, contents, item)
                    : renderDraggableItem(item)
                ).join('') : `
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
 * Envuelve una fila de contenido con lo necesario para arrastrarla:
 * `draggable="true"`, un mango visual (decorativo — arrastrar desde
 * cualquier parte de la fila funciona igual, salvo desde un botón/link,
 * que el navegador no deja iniciar un drag ahí por default), y
 * `data-content-id`/`data-content-json` para leer el nuevo orden al
 * soltar y los datos del contenido al editar. `content-display-{id}` /
 * `content-edit-{id}` son el par que usa editContentHandler para mostrar
 * el formulario de edición en el lugar de la fila, sin tener que
 * reordenar el resto del markup por tipo.
 */
function renderDraggableItem(content) {
    return `
        <div class="draggable-item flex items-stretch gap-1" draggable="true" data-content-id="${content.id}" data-content-json="${encodeDataAttr(content)}">
            <span class="drag-handle flex items-center px-1 text-gray-300 hover:text-gray-500 cursor-grab flex-shrink-0" title="Arrastrar para reordenar">
                <i class="fas fa-grip-vertical"></i>
            </span>
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
        showToast(error.message || 'Error al reordenar el contenido', 'error');
        contentManagerRerender();
    }
}

function renderContentItem(content, type) {
    const icons = { video: 'fa-play-circle', url: 'fa-link', text: 'fa-align-left', task: 'fa-tasks', image: 'fa-image' };
    const icon = icons[type] || getFileIcon(content.url);
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            ${type === 'image'
                ? `<img src="${content.url}" alt="" class="w-10 h-10 rounded object-cover flex-shrink-0">`
                : `<i class="fas ${icon} text-xl text-cenat-green"></i>`
            }
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">${escapeHtml(content.title)}</p>
                ${content.file_size ? `<p class="text-xs text-gray-500">${formatFileSize(content.file_size)}</p>` : ''}
                ${type === 'url' ? `<p class="text-xs text-gray-500 truncate">${escapeHtml(content.url)}</p>` : ''}
            </div>
            <button onclick="editContentHandler(${content.id})" class="text-gray-400 hover:text-cenat-green px-2" title="Editar">
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
                <p class="text-xs text-gray-500">${content.url ? 'Con archivo de instrucciones' : 'Sin archivo adjunto'}</p>
            </div>
            <a href="#/contents/${content.id}/submissions" class="text-cenat-green hover:text-cenat-green-hover text-sm whitespace-nowrap" title="Ver entregas">
                <i class="fas fa-inbox mr-1"></i> Entregas
            </a>
            <button onclick="editContentHandler(${content.id})" class="text-gray-400 hover:text-cenat-green px-2" title="Editar">
                <i class="fas fa-pencil-alt"></i>
            </button>
            <button onclick="deleteContentHandler(${content.id}, 'task')" class="text-red-500 hover:text-red-700 px-2">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
}

const QUESTION_TYPE_LABELS = {
    short_answer: 'Respuesta corta',
    multiple_choice: 'Opción múltiple',
    true_false: 'Verdadero o falso'
};

function renderQuizManagerItem(content) {
    const isQuiz = content.type === 'quiz';
    return `
        <div class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition">
            <i class="fas ${isQuiz ? 'fa-question-circle' : 'fa-poll'} text-xl text-cenat-green"></i>
            <div class="flex-1 min-w-0">
                <p class="font-medium text-gray-900 truncate">${escapeHtml(content.title)}</p>
                <p class="text-xs text-gray-500">${QUESTION_TYPE_LABELS[content.question_type] || ''}</p>
            </div>
            <a href="#/contents/${content.id}/results" class="text-cenat-green hover:text-cenat-green-hover text-sm whitespace-nowrap" title="Ver resultados">
                <i class="fas fa-chart-bar mr-1"></i> Resultados
            </a>
            <button onclick="editContentHandler(${content.id})" class="text-gray-400 hover:text-cenat-green px-2" title="Editar">
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
            <a href="#/forum/${content.id}" class="text-cenat-green hover:text-cenat-green-hover text-sm whitespace-nowrap" title="Ver foro">
                <i class="fas fa-comment-dots mr-1"></i> Ver foro
            </a>
            <button onclick="editContentHandler(${content.id})" class="text-gray-400 hover:text-cenat-green px-2" title="Editar">
                <i class="fas fa-pencil-alt"></i>
            </button>
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
// Formulario para agregar IMAGEN
// =================================

function showAddImageForm(courseId, folderId) {
    const container = document.getElementById(scopeId('add-image-form-container', folderId));

    container.innerHTML = `
        <form class="add-image-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Título de la imagen *</label>
                <input type="text" class="image-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="Ej: Diagrama del proceso">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" class="image-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Imagen *</label>
                <input type="file" class="image-file w-full text-sm" accept="image/*" required>
                <p class="text-xs text-gray-500 mt-1">JPG, PNG, GIF, WEBP (máx. 5MB)</p>
            </div>
            <div class="flex gap-2">
                <button type="submit" class="submit-image-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-upload mr-1"></i> Subir Imagen
                </button>
                <button type="button" onclick="document.getElementById('${scopeId('add-image-form-container', folderId)}').innerHTML = ''" class="text-gray-600 px-4 py-2 text-sm">
                    Cancelar
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
            showToast('Título e imagen son requeridos', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('image', imageFile);
        if (folderId) formData.append('folder_id', folderId);

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Subiendo...';

            await contentsAPI.createImage(formData);
            showToast('Imagen agregada exitosamente', 'success');
            contentManagerRerender();

        } catch (error) {
            showToast(error.message || 'Error al subir la imagen', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-upload mr-1"></i> Subir Imagen';
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
                <p class="text-xs text-gray-500 mt-1">Debe empezar con http:// o https://. Se puede previsualizar video de YouTube o Vimeo.</p>
            </div>
            <div class="url-preview-container"></div>
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
                        Este video no se pudo previsualizar aquí — probá con otra URL.
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

// =================================
// Formulario para agregar CUESTIONARIO o ENCUESTA
// Comparten el mismo formulario dinámico: el tipo de pregunta se elige una
// sola vez para todo el cuestionario/encuesta (no se mezcla por pregunta),
// y la única diferencia visual es que una encuesta no muestra el radio de
// "marcar como correcta" (no tiene sentido, no hay respuesta correcta).
// =================================

function showAddQuestionForm(courseId, folderId, kind) {
    const isQuiz = kind === 'quiz';
    const kindLabel = isQuiz ? 'Cuestionario' : 'Encuesta';
    const apiCall = isQuiz ? contentsAPI.createQuiz : contentsAPI.createSurvey;
    const container = document.getElementById(scopeId(`add-${kind}-form-container`, folderId));

    // question_type aplica a TODAS las preguntas del cuestionario/encuesta
    // (se elige una sola vez), por eso vive acá arriba y no por pregunta.
    let questionType = 'multiple_choice';

    function blankOptions() {
        if (questionType === 'true_false') {
            return [{ text: 'Verdadero', is_correct: true }, { text: 'Falso', is_correct: false }];
        }
        if (questionType === 'multiple_choice') {
            return [{ text: '', is_correct: true }, { text: '', is_correct: false }];
        }
        return null; // short_answer no lleva opciones
    }

    let questions = [{ text: '', options: blankOptions() }];

    // Lee el estado ACTUAL desde el DOM (no desde `questions`) antes de
    // cualquier re-render estructural (agregar/quitar pregunta u opción,
    // cambiar el tipo) — así no se pierde lo que el profesor ya escribió.
    function readCurrentQuestions() {
        return Array.from(listEl.querySelectorAll('.question-row')).map((row) => {
            const text = row.querySelector('.question-text').value;
            const optionRows = row.querySelectorAll('.option-row');
            if (optionRows.length === 0) return { text, options: null };
            const options = Array.from(optionRows).map((optRow) => {
                const textInput = optRow.querySelector('.option-text');
                const radio = optRow.querySelector('.option-correct-radio');
                return {
                    text: textInput ? textInput.value : optRow.dataset.fixedText,
                    is_correct: radio ? radio.checked : false
                };
            });
            return { text, options };
        });
    }

    function optionRowHTML(opt, qIndex, oIndex, options) {
        const isTrueFalse = questionType === 'true_false';
        return `
            <div class="option-row flex items-center gap-2" ${isTrueFalse ? `data-fixed-text="${escapeHtml(opt.text)}"` : ''}>
                ${isQuiz ? `<input type="radio" name="correct-${qIndex}" class="option-correct-radio" ${opt.is_correct ? 'checked' : ''}>` : ''}
                ${isTrueFalse
                    ? `<span class="text-sm text-gray-700 flex-1">${escapeHtml(opt.text)}</span>`
                    : `<input type="text" class="option-text flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="Opción ${oIndex + 1}" value="${escapeHtml(opt.text)}">`
                }
                ${!isTrueFalse && options.length > 2 ? `
                    <button type="button" class="remove-option-btn text-gray-400 hover:text-red-500 px-1" title="Quitar opción">
                        <i class="fas fa-times"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }

    function questionRowHTML(q, qIndex) {
        const showOptions = questionType !== 'short_answer';
        return `
            <div class="question-row border border-gray-200 rounded-lg p-3 space-y-2" data-q-index="${qIndex}">
                <div class="flex items-start gap-2">
                    <span class="text-sm font-semibold text-gray-500 mt-2">${qIndex + 1}.</span>
                    <input type="text" class="question-text flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" placeholder="Escribe la pregunta..." value="${escapeHtml(q.text || '')}">
                    <button type="button" class="remove-question-btn text-red-500 hover:text-red-700 px-2 mt-1" title="Quitar pregunta">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                ${showOptions ? `
                    <div class="pl-6 space-y-1">
                        ${(q.options || []).map((opt, oIndex) => optionRowHTML(opt, qIndex, oIndex, q.options)).join('')}
                        ${questionType === 'multiple_choice' ? `
                            <button type="button" class="add-option-btn text-xs text-cenat-green hover:underline mt-1">
                                <i class="fas fa-plus mr-1"></i> Agregar opción
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
        <form class="add-${kind}-form bg-green-50 rounded-lg p-4 mb-4 space-y-3">
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Título ${isQuiz ? 'del cuestionario' : 'de la encuesta'} *</label>
                <input type="text" class="quiz-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required placeholder="Ej: ${isQuiz ? 'Quiz semana 1' : 'Encuesta de satisfacción'}">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Descripción (opcional)</label>
                <input type="text" class="quiz-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
            </div>
            <div>
                <label class="block text-xs font-medium text-gray-700 mb-1">Tipo de pregunta *</label>
                <select class="quiz-question-type w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">
                    <option value="multiple_choice">Opción múltiple</option>
                    <option value="true_false">Verdadero o falso</option>
                    <option value="short_answer">Respuesta corta</option>
                </select>
                <p class="text-xs text-gray-500 mt-1">Todas las preguntas de ${isQuiz ? 'este cuestionario' : 'esta encuesta'} serán de este tipo.</p>
            </div>
            <div class="questions-list space-y-3"></div>
            <button type="button" class="add-question-btn text-sm text-cenat-green hover:underline">
                <i class="fas fa-plus mr-1"></i> Agregar pregunta
            </button>
            <div class="flex gap-2 pt-2 border-t border-green-100">
                <button type="submit" class="submit-quiz-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> Guardar ${kindLabel}
                </button>
                <button type="button" class="cancel-quiz-btn text-gray-600 px-4 py-2 text-sm">Cancelar</button>
            </div>
        </form>
    `;

    const formEl = container.querySelector('form');
    const listEl = formEl.querySelector('.questions-list');
    const typeSelect = formEl.querySelector('.quiz-question-type');

    rerender();

    formEl.querySelector('.cancel-quiz-btn').addEventListener('click', () => { container.innerHTML = ''; });

    typeSelect.addEventListener('change', () => {
        const currentTexts = readCurrentQuestions().map((q) => q.text);
        questionType = typeSelect.value;
        questions = currentTexts.map((text) => ({ text, options: blankOptions() }));
        rerender();
    });

    formEl.querySelector('.add-question-btn').addEventListener('click', () => {
        questions = readCurrentQuestions();
        questions.push({ text: '', options: blankOptions() });
        rerender();
    });

    // Delegado en listEl (no en cada fila): sigue funcionando después de
    // cada rerender() sin tener que re-enganchar listeners a mano.
    listEl.addEventListener('click', (e) => {
        const removeQBtn = e.target.closest('.remove-question-btn');
        if (removeQBtn) {
            questions = readCurrentQuestions();
            if (questions.length <= 1) {
                showToast('Debe haber al menos una pregunta', 'warning');
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
            showToast('El título es requerido', 'error');
            return;
        }
        if (currentQuestions.some((q) => !q.text.trim())) {
            showToast('Todas las preguntas necesitan un texto', 'error');
            return;
        }
        if (questionType !== 'short_answer') {
            if (currentQuestions.some((q) => (q.options || []).some((o) => !o.text.trim()))) {
                showToast('Todas las opciones necesitan un texto', 'error');
                return;
            }
            if (isQuiz && currentQuestions.some((q) => !(q.options || []).some((o) => o.is_correct))) {
                showToast('Marca la opción correcta de cada pregunta', 'error');
                return;
            }
        }

        const payload = {
            course_id: courseId,
            title,
            description,
            question_type: questionType,
            questions: currentQuestions.map((q) => ({
                text: q.text.trim(),
                options: questionType === 'short_answer'
                    ? undefined
                    : q.options.map((o) => ({ text: o.text.trim(), is_correct: !!o.is_correct }))
            })),
            folder_id: folderId || undefined
        };

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Guardando...';

            await apiCall(payload);
            showToast(`${kindLabel} agregad${isQuiz ? 'o' : 'a'} exitosamente`, 'success');
            contentManagerRerender();

        } catch (error) {
            showToast(error.message || `Error al guardar ${isQuiz ? 'el cuestionario' : 'la encuesta'}`, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-check mr-1"></i> Guardar ${kindLabel}`;
        }
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
 * al servidor, ya llegaron con el resto del contenido del curso.
 */
function editContentHandler(id) {
    const row = document.querySelector(`.draggable-item[data-content-id="${id}"]`);
    if (!row) return;
    const content = JSON.parse(row.dataset.contentJson);

    const display = document.getElementById(`content-display-${id}`);
    const editContainer = document.getElementById(`content-edit-${id}`);
    if (!display || !editContainer) return;

    display.classList.add('hidden');
    editContainer.innerHTML = renderEditForm(content);

    const form = editContainer.querySelector('.edit-content-form');
    form.addEventListener('submit', (e) => submitEditContent(e, content));
    form.querySelector('.cancel-edit-btn').addEventListener('click', () => cancelEditContent(id));
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
 * se puede reemplazar opcionalmente). Un cuestionario/encuesta solo deja
 * editar título/descripción acá — cambiar las preguntas requiere borrar y
 * crear de nuevo, es un formulario mucho más grande (ver showAddQuestionForm).
 */
function renderEditForm(content) {
    const titleField = `
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Título *</label>
            <input type="text" class="edit-title w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required value="${escapeHtml(content.title)}">
        </div>
    `;

    const descriptionField = (label, required = false, rows = null) => `
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">${label}</label>
            ${rows
                ? `<textarea class="edit-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" rows="${rows}" ${required ? 'required' : ''}>${escapeHtml(content.description || '')}</textarea>`
                : `<input type="text" class="edit-description w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" ${required ? 'required' : ''} value="${escapeHtml(content.description || '')}">`
            }
        </div>
    `;

    const fileField = (label, accept, hint) => `
        <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">${label}</label>
            <input type="file" class="edit-file w-full text-sm" accept="${accept}">
            <p class="text-xs text-gray-500 mt-1">${hint} — deja vacío para no cambiarlo</p>
        </div>
    `;

    let body = '';
    switch (content.type) {
        case 'folder':
            body = '';
            break;
        case 'text':
            body = descriptionField('Contenido *', true, 5);
            break;
        case 'forum':
            body = descriptionField('Texto principal *', true, 4);
            break;
        case 'task':
            body = descriptionField('Instrucciones (opcional)', false, 3)
                + fileField('Reemplazar archivo de plantilla/instrucciones (opcional)', '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar', 'PDF, DOCX, PPT, XLS, TXT, ZIP, RAR (máx. 50MB)');
            break;
        case 'url':
            body = descriptionField('Descripción (opcional)')
                + `<div>
                    <label class="block text-xs font-medium text-gray-700 mb-1">URL del video *</label>
                    <input type="url" class="edit-url w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" required value="${escapeHtml(content.url || '')}">
                </div>`;
            break;
        case 'quiz':
        case 'survey':
            body = descriptionField('Descripción (opcional)')
                + `<p class="text-xs text-gray-400">Para cambiar las preguntas hay que borrar ${content.type === 'quiz' ? 'el cuestionario' : 'la encuesta'} y crear ${content.type === 'quiz' ? 'uno' : 'una'} nuev${content.type === 'quiz' ? 'o' : 'a'}.</p>`;
            break;
        case 'video':
            body = descriptionField('Descripción (opcional)')
                + fileField('Reemplazar video (opcional)', 'video/*', 'MP4, AVI, MOV, WEBM (máx. 2GB)');
            break;
        case 'image':
            body = descriptionField('Descripción (opcional)')
                + fileField('Reemplazar imagen (opcional)', 'image/*', 'JPG, PNG, GIF, WEBP (máx. 5MB)');
            break;
        case 'file':
            body = descriptionField('Descripción (opcional)')
                + fileField('Reemplazar archivo (opcional)', '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar', 'PDF, DOCX, PPT, XLS, TXT, ZIP, RAR (máx. 50MB)');
            break;
    }

    return `
        <form class="edit-content-form bg-green-50 rounded-lg p-4 space-y-3 mt-2">
            ${titleField}
            ${body}
            <div class="flex gap-2">
                <button type="submit" class="submit-edit-btn bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                    <i class="fas fa-check mr-1"></i> Guardar
                </button>
                <button type="button" class="cancel-edit-btn text-gray-600 px-4 py-2 text-sm">Cancelar</button>
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
        showToast('El título es requerido', 'error');
        return;
    }

    const descriptionInput = form.querySelector('.edit-description');
    const description = descriptionInput ? descriptionInput.value.trim() : undefined;
    if (descriptionInput && descriptionInput.required && !description) {
        showToast('Este campo es requerido', 'error');
        return;
    }

    const urlInput = form.querySelector('.edit-url');
    if (urlInput && !urlInput.value.trim()) {
        showToast('La URL es requerida', 'error');
        return;
    }

    const fileInput = form.querySelector('.edit-file');
    const file = fileInput ? fileInput.files[0] : null;

    let payload;
    if (file) {
        payload = new FormData();
        payload.append('title', title);
        if (descriptionInput) payload.append('description', description);
        if (content.type === 'video') payload.append('video', file);
        else if (content.type === 'image') payload.append('image', file);
        else payload.append('file', file);
    } else {
        payload = { title };
        if (descriptionInput) payload.description = description;
        if (urlInput) payload.url = urlInput.value.trim();
    }

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Guardando...';

        await contentsAPI.update(content.id, payload);
        showToast('Contenido actualizado exitosamente', 'success');
        contentManagerRerender();
    } catch (error) {
        showToast(error.message || 'Error al actualizar el contenido', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check mr-1"></i> Guardar';
    }
}

const CONTENT_TYPE_LABELS = {
    video: 'el video',
    file: 'el archivo',
    image: 'la imagen',
    text: 'el texto',
    url: 'la URL',
    task: 'la tarea',
    quiz: 'el cuestionario (se borran también todas las respuestas)',
    survey: 'la encuesta (se borran también todas las respuestas)',
    forum: 'el tema de foro (se borran también todas sus respuestas)',
    folder: 'la carpeta'
};

async function deleteContentHandler(id, type) {
    const label = CONTENT_TYPE_LABELS[type] || 'el contenido';
    if (!(await confirmAction(`¿Estás seguro de eliminar ${label}? Esta acción no se puede deshacer.`))) {
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
