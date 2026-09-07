/**
 * Configuración editable del sitio (fondo del login, fondo de la grilla de
 * cursos, título/subtítulo del catálogo) — se carga UNA vez al iniciar la
 * app (ver app.js) y queda cacheada acá; las páginas que la usan
 * (views_home.js, y el fondo .auth-bg/.courses-bg vía CSS inyectado más
 * abajo) la leen de forma síncrona con getSiteSetting().
 */
let siteSettings = {};

async function loadSiteSettings() {
    try {
        const response = await settingsAPI.getAll();
        siteSettings = response.data || {};
    } catch (error) {
        // Si falla (ej. sin conexión un instante), la app sigue con los
        // valores por defecto ya definidos en el CSS/HTML — no es un error
        // que deba bloquear nada.
        console.error('Error al cargar la configuración del sitio:', error);
        siteSettings = {};
    }
    applySiteSettingsStyles();
}

/**
 * `key` uno de: catalog_title, catalog_subtitle, login_bg_image,
 * courses_bg_image. `fallback` es lo que ya había hardcodeado antes de
 * esta función existir — así una instalación recién migrada (sin filas en
 * site_settings todavía) se ve exactamente igual que siempre.
 */
function getSiteSetting(key, fallback = '') {
    return (siteSettings && siteSettings[key]) || fallback;
}

/**
 * Las imágenes de fondo viven como `background-image` en .auth-bg/
 * .courses-bg (styles.css) para que seguir funcionando sin JS si algo
 * fallara. Si el admin subió una imagen propia, se inyecta un <style> que
 * la sobreescribe con !important — un solo lugar, en vez de tocar el
 * markup de cada vista que use esas clases (login, registro, olvidé/
 * restablecer contraseña, catálogo, "Mis Cursos", detalle de curso).
 * Se llama de nuevo después de guardar cambios en Apariencia del Sitio,
 * para que se vea el resultado sin recargar la página.
 */
function applySiteSettingsStyles() {
    let styleEl = document.getElementById('site-settings-overrides');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'site-settings-overrides';
        document.head.appendChild(styleEl);
    }

    const loginBg = getSiteSetting('login_bg_image');
    const coursesBg = getSiteSetting('courses_bg_image');

    let css = '';
    if (loginBg) css += `.auth-bg { background-image: url('${loginBg}') !important; }\n`;
    if (coursesBg) css += `.courses-bg { background-image: url('${coursesBg}') !important; }\n`;
    styleEl.textContent = css;
}

window.loadSiteSettings = loadSiteSettings;
window.getSiteSetting = getSiteSetting;
window.applySiteSettingsStyles = applySiteSettingsStyles;
