/**
 * Dark Mode Manager
 */

function initDarkMode() {
    // Leer preferencia guardada, o preferencia del sistema operativo
    const saved = localStorage.getItem('darkMode');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved !== null ? saved === 'true' : prefersDark;

    if (isDark) {
        document.documentElement.classList.add('dark');
    }

    updateToggleUI(isDark);
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark);
    updateToggleUI(isDark);
}

function updateToggleUI(isDark) {
    const toggleBtn = document.getElementById('dark-mode-toggle');
    if (!toggleBtn) return;

    if (isDark) {
        toggleBtn.innerHTML = '<i class="fas fa-sun text-yellow-400"></i>';
        toggleBtn.title = 'Cambiar a modo claro';
    } else {
        toggleBtn.innerHTML = '<i class="fas fa-moon text-gray-600"></i>';
        toggleBtn.title = 'Cambiar a modo oscuro';
    }
}

window.initDarkMode = initDarkMode;
window.toggleDarkMode = toggleDarkMode;