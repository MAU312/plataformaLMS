/**
 * Control de tamaño de letra (accesibilidad) — botones "A-"/"A+" en la
 * barra de navegación. Mismo mecanismo que el modo oscuro: una clase en
 * <html> (text-boost-1 o text-boost-2, ver styles.css) que cubre todo el
 * sitio, persistida en localStorage.
 */

const MAX_TEXT_SIZE_LEVEL = 2;

function getTextSizeLevel() {
    const saved = parseInt(localStorage.getItem('textSizeLevel'), 10);
    if (Number.isNaN(saved) || saved < 0) return 0;
    return Math.min(saved, MAX_TEXT_SIZE_LEVEL);
}

function applyTextSizeLevel(level) {
    for (let i = 1; i <= MAX_TEXT_SIZE_LEVEL; i++) {
        document.documentElement.classList.remove(`text-boost-${i}`);
    }
    if (level > 0) {
        document.documentElement.classList.add(`text-boost-${level}`);
    }
    updateTextSizeButtonsUI(level);
}

function initTextSize() {
    applyTextSizeLevel(getTextSizeLevel());
}

function increaseTextSize() {
    const level = Math.min(getTextSizeLevel() + 1, MAX_TEXT_SIZE_LEVEL);
    localStorage.setItem('textSizeLevel', level);
    applyTextSizeLevel(level);
}

function decreaseTextSize() {
    const level = Math.max(getTextSizeLevel() - 1, 0);
    localStorage.setItem('textSizeLevel', level);
    applyTextSizeLevel(level);
}

function updateTextSizeButtonsUI(level) {
    document.querySelectorAll('.text-size-decrease-btn').forEach((btn) => { btn.disabled = level === 0; });
    document.querySelectorAll('.text-size-increase-btn').forEach((btn) => { btn.disabled = level === MAX_TEXT_SIZE_LEVEL; });
}

window.initTextSize = initTextSize;
window.increaseTextSize = increaseTextSize;
window.decreaseTextSize = decreaseTextSize;
