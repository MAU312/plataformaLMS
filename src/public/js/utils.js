/**
 * Utilidades generales para el frontend
 */

// =================================
// Toast Notifications
// =================================

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

    setTimeout(() => { hideToast(); }, 3000);
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
                <p class="mt-4 text-gray-600 dark:text-slate-400">Cargando...</p>
            </div>
        </div>
    `;
}

// =================================
// Format Utilities
// =================================

function formatDate(dateString) {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}

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

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
// Progress Bar
// =================================

function updateProgressBar(elementId, progress) {
    const progressFill = document.getElementById(elementId);
    if (progressFill) progressFill.style.width = `${progress}%`;
}

// =================================
// Confirmation Dialog
// =================================

function confirmAction(message) {
    return confirm(message);
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
        showToast('Copiado al portapapeles', 'success');
        return true;
    } catch (error) {
        showToast('Error al copiar', 'error');
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
            <span>Mostrando ${start}–${end} de ${totalItems}</span>
            <div class="flex items-center gap-1">
                <button onclick="${callbackFn}(${currentPage - 1})"
                    class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
                    ${currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i>
                </button>
                ${pages.map(p => `
                    <button onclick="${callbackFn}(${p})"
                        class="px-3 py-1 rounded font-medium transition ${p === currentPage
                            ? 'bg-cenat-blue text-white'
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
// Export al objeto window
// =================================

window.showToast = showToast;
window.hideToast = hideToast;
window.showLoading = showLoading;
window.formatDate = formatDate;
window.formatFileSize = formatFileSize;
window.formatDuration = formatDuration;
window.isValidEmail = isValidEmail;
window.validateForm = validateForm;
window.createElementFromHTML = createElementFromHTML;
window.scrollToElement = scrollToElement;
window.escapeHtml = escapeHtml;
window.toggleDropdown = toggleDropdown;
window.updateProgressBar = updateProgressBar;
window.confirmAction = confirmAction;
window.debounce = debounce;
window.saveToLocalStorage = saveToLocalStorage;
window.getFromLocalStorage = getFromLocalStorage;
window.removeFromLocalStorage = removeFromLocalStorage;
window.copyToClipboard = copyToClipboard;
window.renderPagination = renderPagination;