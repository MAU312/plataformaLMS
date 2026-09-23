/**
 * Utilidades generales para el frontend
 */

// =================================
// Toast Notifications
// =================================

// Si dos toasts se muestran en menos de 3s (frecuente: un error de red
// seguido de un segundo error), sin esto el setTimeout del primero ocultaba
// el del segundo antes de que cumpliera sus propios 3 segundos.
let toastHideTimer = null;

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMessage = document.getElementById('toast-message');

    const config = {
        success: { icon: 'fa-check-circle text-green-500', class: 'toast-success' },
        error:   { icon: 'fa-times-circle text-red-500',   class: 'toast-error' },
        warning: { icon: 'fa-exclamation-circle text-yellow-500', class: 'toast-warning' },
        info:    { icon: 'fa-info-circle text-blue-500',   class: 'toast-info' }
    };

    const { icon, class: toastClass } = config[type] || config.info;

    toastIcon.className = `fas ${icon} text-2xl`;
    toastMessage.textContent = message;

    toast.className = `fixed top-4 right-4 z-50 max-w-sm ${toastClass}`;
    toast.classList.remove('hidden');
    toast.classList.add('fade-in');

    if (toastHideTimer) clearTimeout(toastHideTimer);
    toastHideTimer = setTimeout(() => { hideToast(); }, 3000);
}

function hideToast() {
    const toast = document.getElementById('toast');
    toast.classList.add('hidden');
}

// =================================
// Loading Spinner
// =================================

function showLoading(elementId = 'app') {
    const element = document.getElementById(elementId);
    if (!element) return;
    element.innerHTML = `
        <div class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <div class="spinner mx-auto"></div>
                <p class="mt-4 text-gray-600 dark:text-slate-400">${t('common.loading')}</p>
            </div>
        </div>
    `;
}

// =================================
// Format Utilities
// =================================

// 'es-ES'/'en-US' nada más — no hay una variante por país que importe acá,
// solo separa el formato de fecha/hora según el idioma elegido (ver
// i18n.js).
function dateLocaleTag() {
    return getLocale() === 'en' ? 'en-US' : 'es-ES';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(dateLocaleTag(), options);
}

/**
 * Igual que formatDate pero agregando la hora — para casos donde saber
 * solo el día no alcanza (ej. a qué hora entregó una tarea un estudiante).
 */
function formatDateTime(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleString(dateLocaleTag(), options);
}

/**
 * Chequea el tamaño de un archivo ANTES de subirlo. Sin esto, un archivo
 * que excede el límite del servidor (ver upload.middleware.js) empezaba a
 * subirse igual — a veces varios minutos, si es un video grande en una
 * red lenta — y recién fallaba al terminar, cuando Multer lo rechazaba.
 * Devuelve true si está dentro del límite; si no, muestra un toast con el
 * límite en un formato legible y devuelve false (el caller debe cancelar
 * el envío).
 */
function checkFileSize(file, maxBytes, label = 'El archivo') {
    if (file.size <= maxBytes) return true;
    showToast(t('errors.file_too_large', { label, size: formatFileSize(maxBytes) }), 'error');
    return false;
}

/**
 * Zona de drag&drop + preview en vivo (antes de subir) para un campo de
 * imagen de portada — compartida por Crear Curso, Editar Curso, y crear un
 * curso dentro de un módulo (ver showAddModuleCourseForm en
 * views_content_manager.js). Los defaults son los IDs que ya usaba Crear
 * Curso antes de generalizar esta función (así su llamada sin argumentos
 * sigue funcionando igual); Editar Curso y el formulario de módulo pasan
 * sus propios IDs (este último escopeados por moduleId, para no chocar si
 * hubiera más de un formulario de este tipo en la misma página).
 */
function setupThumbnailDropZone({ dropZoneId = 'thumbnail-drop-zone', inputId = 'thumbnail', previewContainerId = 'thumbnail-preview', previewImgId = 'thumbnail-preview-img' } = {}) {
    const dropZone = document.getElementById(dropZoneId);
    const fileInput = document.getElementById(inputId);
    const preview = document.getElementById(previewContainerId);
    const previewImg = document.getElementById(previewImgId);

    if (!dropZone || !fileInput) return;

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

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// =================================
// Validation
// =================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;
    inputs.forEach(input => {
        if (!input.value.trim()) {
            input.classList.add('border-red-500');
            isValid = false;
        } else {
            input.classList.remove('border-red-500');
        }
    });
    return isValid;
}

// =================================
// DOM Utilities
// =================================

function createElementFromHTML(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString.trim();
    return div.firstChild;
}

function scrollToElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const EXPANDABLE_TEXT_CLAMP_CLASSES = ['truncate', 'line-clamp-1', 'line-clamp-2', 'line-clamp-3', 'line-clamp-4'];
// Margen de tolerancia al comparar scrollHeight/clientHeight (o scrollWidth/
// clientWidth) — con el tamaño de letra aumentado (ver darkmode.js, clases
// text-boost-N del botón "A+" del navbar) el redondeo de line-height puede
// dejar 1-3px de diferencia aunque el texto entre completo, mostrando un
// "Leer más" que no revela nada nuevo al abrirlo. Un desborde real (una
// línea de más) es mucho mayor que esto, así que no oculta casos genuinos.
const EXPANDABLE_TEXT_OVERFLOW_TOLERANCE_PX = 4;

/**
 * Agrega un toggle "Leer más"/"Leer menos" a cada `.expandable-text` que el
 * navegador esté recortando de verdad (line-clamp-N o `truncate`) — si el
 * texto entra completo, no agrega nada (evita un link muerto). Se llama una
 * vez después de pintar cualquier lista de descripciones (ver
 * views_home.js/views_course_detail.js/views_content_manager.js).
 *
 * Un elemento oculto en el momento de llamar (ej. la tarjeta de un curso
 * dentro de un módulo que todavía no está seleccionado en el dropdown, ver
 * switchCourseModule) mide scrollHeight/clientHeight en 0 y no se puede
 * evaluar todavía — se deja SIN marcar como listo para que una llamada
 * posterior (cuando ya esté visible) lo vuelva a intentar.
 */
function setupExpandableText(root = document) {
    root.querySelectorAll('.expandable-text').forEach((el) => {
        if (el.dataset.expandableReady) return;
        if (el.offsetParent === null) return;
        el.dataset.expandableReady = 'true';

        const clampClass = EXPANDABLE_TEXT_CLAMP_CLASSES.find((c) => el.classList.contains(c));
        if (!clampClass) return;

        const evaluateOverflow = () => {
            const isOverflowing = clampClass === 'truncate'
                ? el.scrollWidth > el.clientWidth + EXPANDABLE_TEXT_OVERFLOW_TOLERANCE_PX
                : el.scrollHeight > el.clientHeight + EXPANDABLE_TEXT_OVERFLOW_TOLERANCE_PX;
            if (!isOverflowing) return;

            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'expandable-text-toggle text-cenat-green text-xs font-medium hover:underline mt-1 block';
            toggle.textContent = t('common.read_more');
            toggle.addEventListener('click', (e) => {
                // El texto suele vivir dentro de una tarjeta clickeable
                // entera (ver renderCourseCardShell) — sin esto, el click
                // en el botón también navegaría al curso antes de que se
                // alcance a ver el texto expandido.
                e.stopPropagation();
                const stillClamped = el.classList.toggle(clampClass);
                toggle.textContent = stillClamped ? t('common.read_more') : t('common.read_less');
            });
            el.insertAdjacentElement('afterend', toggle);
        };

        // Con la pestaña oculta (ej. se abrió en segundo plano) el navegador
        // no corre requestAnimationFrame — y una medición tomada igual en
        // ese estado puede dar un ancho/alto transitorio incorrecto. Se
        // espera a que la pestaña esté visible antes de medir nada.
        if (document.hidden) {
            document.addEventListener('visibilitychange', function onVisible() {
                if (document.hidden) return;
                document.removeEventListener('visibilitychange', onVisible);
                requestAnimationFrame(evaluateOverflow);
            });
        } else {
            requestAnimationFrame(evaluateOverflow);
        }
    });
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// escapeHtml() escapa &, < y > (vía textContent/innerHTML) pero NO comillas —
// insuficiente cuando el valor va dentro de un atributo `="..."` (href, src,
// alt, title, value, data-*). Usar esta función en esos casos.
function escapeAttr(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// =================================
// Dropdown Toggle
// =================================

function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) dropdown.classList.toggle('hidden');
}

document.addEventListener('click', function(event) {
    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    if (userMenuButton && userDropdown) {
        if (!userMenuButton.contains(event.target) && !userDropdown.contains(event.target)) {
            userDropdown.classList.add('hidden');
        }
    }
});

// =================================
// Mobile Menu Toggle
// =================================

document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    const userMenuButton = document.getElementById('user-menu-button');
    const userDropdown = document.getElementById('user-dropdown');
    if (userMenuButton && userDropdown) {
        userMenuButton.addEventListener('click', function(e) {
            e.stopPropagation();
            userDropdown.classList.toggle('hidden');
        });
    }
});

// =================================
// Password Visibility Toggle
// =================================

document.addEventListener('click', function(event) {
    const btn = event.target.closest('.toggle-password-btn');
    if (!btn) return;

    const input = document.getElementById(btn.dataset.target);
    if (!input) return;

    const icon = btn.querySelector('i');
    const show = input.type === 'password';

    input.type = show ? 'text' : 'password';
    icon.classList.toggle('fa-eye', !show);
    icon.classList.toggle('fa-eye-slash', show);
    btn.setAttribute('aria-label', show ? t('common.hide_password') : t('common.show_password'));
});

// =================================
// Progress Bar
// =================================

function updateProgressBar(elementId, progress) {
    const progressFill = document.getElementById(elementId);
    if (progressFill) progressFill.style.width = `${progress}%`;
}

// =================================
// Confirmation Dialog
// =================================

/**
 * Modal de confirmación propio, en vez del confirm() nativo del navegador
 * (el feo "localhost:3000 dice..." que no se puede estilizar). Se usa
 * igual que antes en cada punto donde ya se llamaba — la única diferencia
 * es que ahora hay que esperarlo: `if (await confirmAction('¿Seguro?'))`.
 * `danger: false` es para confirmaciones que no son destructivas (hoy
 * todas las que existen sí lo son, pero queda listo por si hace falta).
 */
function confirmAction(message, { confirmLabel = t('common.confirm'), cancelLabel = t('common.cancel'), danger = true } = {}) {
    return new Promise((resolve) => {
        const existing = document.getElementById('confirm-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'confirm-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center px-4';
        modal.innerHTML = `
            <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" data-confirm-backdrop></div>
            <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full fade-in" role="alertdialog" aria-modal="true" aria-labelledby="confirm-modal-message">
                <div class="flex items-start gap-3">
                    <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-100 dark:bg-red-900/40 text-red-500' : 'bg-green-100 dark:bg-green-900/40 text-cenat-green'}">
                        <i class="fas ${danger ? 'fa-exclamation-triangle' : 'fa-question-circle'}"></i>
                    </div>
                    <p id="confirm-modal-message" class="text-gray-700 dark:text-slate-200 mt-1.5 leading-snug">${escapeHtml(message)}</p>
                </div>
                <div class="flex gap-3 justify-end mt-6">
                    <button type="button" data-confirm-cancel class="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition">${escapeHtml(cancelLabel)}</button>
                    <button type="button" data-confirm-ok class="px-4 py-2 rounded-lg text-sm font-semibold text-white transition ${danger ? 'bg-red-500 hover:bg-red-600' : 'btn-cenat'}">${escapeHtml(confirmLabel)}</button>
                </div>
            </div>
        `;

        // Único mecanismo de confirmación de acciones destructivas de toda
        // la app — sin esto, un usuario de teclado que lo abría quedaba con
        // el foco en el botón que lo disparó, y Escape no hacía nada.
        const onKeydown = (e) => {
            if (e.key === 'Escape') close(false);
        };

        const close = (result) => {
            document.removeEventListener('keydown', onKeydown);
            modal.remove();
            resolve(result);
        };

        modal.querySelector('[data-confirm-cancel]').addEventListener('click', () => close(false));
        modal.querySelector('[data-confirm-ok]').addEventListener('click', () => close(true));
        modal.querySelector('[data-confirm-backdrop]').addEventListener('click', () => close(false));
        document.addEventListener('keydown', onKeydown);

        document.body.appendChild(modal);
        // Foco inicial en "Cancelar" — el default más seguro para una
        // confirmación (Enter/Space sin querer no dispara la acción).
        modal.querySelector('[data-confirm-cancel]').focus();
    });
}

// =================================
// Debounce
// =================================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// =================================
// Guardián de respuestas obsoletas
// =================================

/**
 * Si el usuario dispara varias peticiones seguidas (tipeando rápido en un
 * buscador, cambiando de página rápido), una respuesta que llega tarde no
 * debe pisar el resultado de una petición más nueva. Este mismo patrón de
 * "requestToken" manual se repetía copiado en varias vistas con listas
 * paginadas/buscables (home, mis cursos, admin de cursos, admin de
 * usuarios) — queda acá en un solo lugar.
 *
 * Uso:
 *   const guard = createStaleResponseGuard();
 *   async function loadX(page) {
 *       const isStale = guard.start();
 *       try {
 *           const response = await api.getAll(...);
 *           if (isStale()) return;
 *           ...
 *       } catch (error) {
 *           if (isStale()) return;
 *           ...
 *       }
 *   }
 */
function createStaleResponseGuard() {
    let currentToken = 0;
    return {
        start() {
            const token = ++currentToken;
            return () => token !== currentToken;
        }
    };
}

// =================================
// Local Storage Helpers
// =================================

function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error saving to localStorage:', error);
        return false;
    }
}

function getFromLocalStorage(key) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        return null;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (error) {
        return false;
    }
}

// =================================
// Copy to Clipboard
// =================================

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast(t('common.copied'), 'success');
        return true;
    } catch (error) {
        showToast(t('errors.copy_failed'), 'error');
        return false;
    }
}

// =================================
// Paginación reutilizable
// =================================

function renderPagination(currentPage, totalPages, totalItems, perPage, callbackFn) {
    if (totalPages <= 1) return '';

    const start = (currentPage - 1) * perPage + 1;
    const end = Math.min(currentPage * perPage, totalItems);

    let pages = [];
    if (totalPages <= 5) {
        pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    } else if (currentPage <= 3) {
        pages = [1, 2, 3, 4, 5];
    } else if (currentPage >= totalPages - 2) {
        pages = [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
        pages = [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
    }

    return `
        <div class="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
            <span>${t('common.showing_range', { start, end, total: totalItems })}</span>
            <div class="flex items-center gap-1">
                <button onclick="${callbackFn}(${currentPage - 1})"
                    class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                ${pages.map(p => `
                    <button onclick="${callbackFn}(${p})"
                        class="px-3 py-1 rounded font-medium transition ${p === currentPage
                            ? 'bg-cenat-green text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}">
                        ${p}
                    </button>
                `).join('')}
                <button onclick="${callbackFn}(${currentPage + 1})"
                    class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                    <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        </div>
    `;
}

// =================================
// Tarjeta de curso (home, mis-cursos, cursos del profesor)
// =================================

/**
 * Cascarón compartido por las 3 tarjetas de curso de la app (catálogo,
 * "mis cursos" del estudiante, "mis cursos" del profesor) — miniatura o
 * ícono de respaldo, badge de inactivo opcional, y el cuerpo (título +
 * lo que sea específico de cada vista: progreso, conteos, profesor...)
 * que arma cada caller y pasa ya renderizado en `bodyHtml`.
 */
function renderCourseCardShell({ course, navigateToPath, heightClass = 'h-40', showInactiveBadge = false, bodyHtml }) {
    const thumbnailUrl = course.thumbnail || null;
    return `
        <div class="course-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-100" onclick="navigateTo('${navigateToPath}')">
            <div class="${heightClass} bg-gradient-to-br from-cenat-green to-cenat-green-light flex items-center justify-center relative overflow-hidden">
                ${thumbnailUrl
                    ? `<img src="${escapeAttr(thumbnailUrl)}" alt="${escapeAttr(course.title)}" class="w-full h-full object-cover">`
                    : `<i class="fas fa-flask text-5xl text-white opacity-80"></i>`
                }
                ${showInactiveBadge && !course.is_active ? '<span class="badge badge-inactive absolute top-3 right-3">Inactivo</span>' : ''}
            </div>
            <div class="p-5">
                ${bodyHtml}
            </div>
        </div>
    `;
}

// =================================
// Selector de profesores (crear/editar curso)
// =================================

/**
 * El checkbox marcado asigna a ese profesor como profesor principal (de
 * todo el curso) — el escopeo por carpeta (course_teachers.module_id)
 * existió acá antes, pero se sacó de esta lista a pedido de Mauricio: en
 * la práctica nadie lo usaba (confirmado: 0 filas con module_id no-nulo en
 * la base real), y con el editor rápido de profesores por curso hijo de
 * módulo (ver views_content_manager.js) ya no hacía falta. El mecanismo de
 * permisos por carpeta (Course.canManageContent, requireCourseManager) se
 * deja intacto en el backend por si se necesita reactivar más adelante —
 * simplemente ya no hay forma de asignarlo desde acá.
 */
function renderTeacherCheckboxesHTML(teachers, selectedIds = []) {
    if (teachers.length === 0) {
        return `<p class="text-sm text-gray-400 dark:text-slate-500">${t('courseForm.no_teachers_yet')}</p>`;
    }
    return teachers.map(teacher => {
        const checked = selectedIds.includes(teacher.id);
        return `
        <div class="teacher-row flex items-center gap-3 py-2 flex-wrap">
            <label class="flex items-center gap-3 text-base text-gray-700 dark:text-slate-300">
                <input type="checkbox" name="teacher_ids" value="${teacher.id}" data-teacher-id="${teacher.id}"
                    class="teacher-checkbox w-4 h-4 rounded border-gray-300 text-cenat-green focus:ring-cenat-green" ${checked ? 'checked' : ''}>
                ${escapeHtml(teacher.name)} <span class="text-sm text-gray-400 dark:text-slate-500">(${escapeHtml(teacher.email)})</span>
            </label>
        </div>
        `;
    }).join('');
}

async function loadTeacherCheckboxes(containerId, selectedIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
        const response = await usersAPI.getByRole('teacher');
        container.innerHTML = renderTeacherCheckboxesHTML(response.data || [], selectedIds);
    } catch (error) {
        container.innerHTML = `<p class="text-sm text-red-500">${t('courseForm.load_teachers_failed')}</p>`;
    }
}

function getSelectedTeacherIds(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[name="teacher_ids"]:checked')).map(el => parseInt(el.value, 10));
}

// Mismos ids/orden que CERTIFICATE_STYLES en src/utils/certificate.js — se
// mantiene esta copia acá en vez de pedirlos al backend porque son estilos
// fijos del código (no algo que el admin pueda crear/editar), igual que
// "Tipo de pregunta" en el editor de cuestionarios.
function getCertificateStyles() {
    return [
        { id: 'classic', label: t('courseForm.certificate_classic') },
        { id: 'modern', label: t('courseForm.certificate_modern') },
        { id: 'minimal', label: t('courseForm.certificate_minimal') }
    ];
}

function renderCertificateStyleOptions(selectedId) {
    return getCertificateStyles().map(s => `
        <option value="${s.id}" ${s.id === selectedId ? 'selected' : ''}>${escapeHtml(s.label)}</option>
    `).join('');
}

// =================================
// Embed de video externo (YouTube/Vimeo)
// =================================

/**
 * Extrae el ID de un video de YouTube de cualquier formato de link común
 * (watch?v=, youtu.be/, /shorts/, /embed/). `null` si la URL no es de
 * YouTube o no se pudo extraer el ID.
 */
function getYoutubeVideoId(url) {
    const match = String(url || '').match(
        /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return match ? match[1] : null;
}

/**
 * URL de embed simple (iframe plano, sin la API de YouTube) — se usa
 * únicamente en el preview del formulario del profesor: ahí SÍ conviene
 * que se vea el error de YouTube tal cual si el video no se puede
 * embeber, como pista de que probó una URL que no va a funcionar para
 * los estudiantes.
 */
function getYoutubeEmbedUrl(url) {
    const id = getYoutubeVideoId(url);
    if (!id) return null;
    // El parámetro "origin" es lo que recomienda YouTube para que el
    // reproductor valide desde dónde se está embebiendo.
    const origin = encodeURIComponent(window.location.origin);
    return `https://www.youtube.com/embed/${id}?origin=${origin}`;
}

/**
 * Igual que getYoutubeEmbedUrl pero para Vimeo (vimeo.com/{id}).
 */
function getVimeoEmbedUrl(url) {
    const match = String(url || '').match(/vimeo\.com\/(\d+)/);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

/**
 * Intenta YouTube primero, luego Vimeo. `null` si el proveedor no se
 * reconoce — en ese caso el contenido de tipo 'url' se queda con el
 * comportamiento de antes (solo un link para abrir en pestaña nueva).
 */
function getVideoEmbedUrl(url) {
    return getYoutubeEmbedUrl(url) || getVimeoEmbedUrl(url) || null;
}

// =================================
// Reproductor de YouTube con detección de error
// =================================
// Un <iframe src="youtube.com/embed/ID"> plano no avisa cuando el video
// no se puede reproducir ahí (el dueño lo restringió, fue borrado, etc.)
// — YouTube simplemente dibuja SU propio cartel de error DENTRO del
// iframe, y no hay forma de detectarlo desde afuera. La única manera de
// enterarse es con la API oficial de YouTube (que sí avisa por
// postMessage), para poder ocultar el reproductor roto y mostrar en su
// lugar el link de "ver en YouTube" que ya está arriba de la tarjeta.

let ytApiReady = false;
let ytApiLoading = false;
const ytPendingEmbeds = [];

function loadYoutubeApi() {
    if (ytApiReady || ytApiLoading) return;
    ytApiLoading = true;
    window.onYouTubeIframeAPIReady = function () {
        ytApiReady = true;
        ytPendingEmbeds.forEach((fn) => fn());
        ytPendingEmbeds.length = 0;
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
}

/**
 * Reemplaza el div `containerId` (vacío) por el reproductor real de
 * YouTube. Si el video no se puede reproducir ahí (códigos 101/150: el
 * dueño no permite incrustarlo en otros sitios; 100: no existe o es
 * privado), oculta el reproductor y muestra el mensaje de
 * `data-embed-fallback` que esté al lado, en vez de dejar ver el cartel
 * de error de YouTube.
 */
function createYoutubeEmbed(containerId, videoId) {
    const create = () => {
        const el = document.getElementById(containerId);
        // El elemento puede ya no existir si el usuario navegó a otra
        // vista mientras se cargaba la API (es asíncrona).
        if (!el || typeof YT === 'undefined') return;

        // Hay que guardar esta referencia ANTES de crear el YT.Player:
        // el constructor reemplaza `el` por el iframe real de YouTube de
        // forma síncrona, así que buscar por containerId de nuevo DENTRO
        // de onError (que se dispara después, de forma asíncrona) ya no
        // encontraría nada.
        const wrapper = el.closest('[data-embed-wrapper]');

        new YT.Player(containerId, {
            videoId,
            playerVars: { origin: window.location.origin },
            events: {
                onError: () => {
                    if (!wrapper) return;
                    wrapper.querySelector('.video-player-container')?.remove();
                    wrapper.querySelector('[data-embed-fallback]')?.classList.remove('hidden');
                }
            }
        });
    };

    if (ytApiReady) {
        create();
    } else {
        ytPendingEmbeds.push(create);
        loadYoutubeApi();
    }
}

/**
 * Busca todos los `[data-yt-embed]` ya insertados en el DOM (ver
 * renderUrlContentRow en views_course_detail.js) y crea su reproductor.
 * Se llama una sola vez después de pintar la página — el checkbox de
 * progreso y el reordenamiento no vuelven a tocar estos nodos, así que no
 * hace falta re-inicializar en cada interacción.
 */
function initYoutubeEmbeds() {
    document.querySelectorAll('[data-yt-embed]').forEach((el) => {
        createYoutubeEmbed(el.id, el.dataset.ytEmbed);
    });
}

// =================================
// Export al objeto window
// =================================

window.showToast = showToast;
window.hideToast = hideToast;
window.showLoading = showLoading;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.formatFileSize = formatFileSize;
window.checkFileSize = checkFileSize;
window.formatDuration = formatDuration;
window.isValidEmail = isValidEmail;
window.validateForm = validateForm;
window.createElementFromHTML = createElementFromHTML;
window.scrollToElement = scrollToElement;
window.setupExpandableText = setupExpandableText;
window.escapeHtml = escapeHtml;
window.toggleDropdown = toggleDropdown;
window.updateProgressBar = updateProgressBar;
window.confirmAction = confirmAction;
window.debounce = debounce;
window.createStaleResponseGuard = createStaleResponseGuard;
window.saveToLocalStorage = saveToLocalStorage;
window.getFromLocalStorage = getFromLocalStorage;
window.removeFromLocalStorage = removeFromLocalStorage;
window.copyToClipboard = copyToClipboard;
window.renderPagination = renderPagination;
window.renderTeacherCheckboxesHTML = renderTeacherCheckboxesHTML;
window.loadTeacherCheckboxes = loadTeacherCheckboxes;
window.getSelectedTeacherIds = getSelectedTeacherIds;
window.getYoutubeVideoId = getYoutubeVideoId;
window.getYoutubeEmbedUrl = getYoutubeEmbedUrl;
window.getVimeoEmbedUrl = getVimeoEmbedUrl;
window.getVideoEmbedUrl = getVideoEmbedUrl;
window.initYoutubeEmbeds = initYoutubeEmbeds;