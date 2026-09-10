/**
 * Views - Apariencia del Sitio (admin): texto del catálogo y las dos
 * imágenes de fondo (login, catálogo/cursos) — ver site_settings.js para
 * cómo se aplican estos valores en el resto de la app.
 */

const SETTINGS_DEFAULT_LOGIN_BG = '/images/imagenfondo.png';
const SETTINGS_DEFAULT_COURSES_BG = '/images/imagenambiente.png';

window.renderAdminSettings = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await settingsAPI.getAll();
        const settings = response.data || {};

        app.innerHTML = renderAdminLayout(`
            <h1 class="text-2xl font-bold text-gray-900 mb-1">
                <i class="fas fa-paint-brush text-cenat-green mr-2"></i>
                ${t('admin.settings.title')}
            </h1>
            <p class="text-gray-500 mb-6">${t('admin.settings.subtitle')}</p>

            <form id="site-settings-form" class="max-w-2xl space-y-6">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                    <h2 class="font-semibold text-gray-900">${t('admin.settings.catalog_text_heading')}</h2>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.settings.title_label')}</label>
                        <input type="text" id="catalog_title" maxlength="300"
                            value="${escapeAttr(settings.catalog_title || t('home.title_default'))}"
                            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">${t('admin.settings.subtitle_label')}</label>
                        <textarea id="catalog_subtitle" maxlength="300" rows="2"
                            class="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition">${escapeHtml(settings.catalog_subtitle || t('home.subtitle_default'))}</textarea>
                    </div>
                </div>

                ${renderImageSettingCard({
                    key: 'login_bg_image',
                    label: t('admin.settings.login_bg_label'),
                    hint: t('admin.settings.login_bg_hint'),
                    currentUrl: settings.login_bg_image || SETTINGS_DEFAULT_LOGIN_BG,
                    isCustom: !!settings.login_bg_image
                })}

                ${renderImageSettingCard({
                    key: 'courses_bg_image',
                    label: t('admin.settings.courses_bg_label'),
                    hint: t('admin.settings.courses_bg_hint'),
                    currentUrl: settings.courses_bg_image || SETTINGS_DEFAULT_COURSES_BG,
                    isCustom: !!settings.courses_bg_image
                })}

                <button type="submit" id="settings-submit-btn" class="btn-cenat">
                    <i class="fas fa-save mr-2"></i> ${t('admin.save_changes')}
                </button>
            </form>
        `, 'settings');

        setupImagePreview('login_bg_image');
        setupImagePreview('courses_bg_image');

        document.getElementById('site-settings-form').addEventListener('submit', handleUpdateSiteSettings);

    } catch (error) {
        console.error('Error loading site settings:', error);
        showToast(t('admin.settings.load_failed'), 'error');
    }
};

function renderImageSettingCard({ key, label, hint, currentUrl, isCustom }) {
    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-3">
            <h2 class="font-semibold text-gray-900">${escapeHtml(label)}</h2>
            <p class="text-xs text-gray-500">${escapeHtml(hint)}</p>
            <img id="${key}-preview" src="${escapeAttr(currentUrl)}" class="h-32 rounded-lg object-cover border border-gray-100">
            <div>
                <input type="file" id="${key}" accept="image/*" class="w-full text-sm text-gray-600">
                <p class="text-xs text-gray-400 mt-1">${t('admin.settings.image_formats_hint')}</p>
            </div>
            ${isCustom ? `
                <label class="flex items-center gap-2 text-sm text-gray-600">
                    <input type="checkbox" id="${key}_clear" class="rounded border-gray-300 text-cenat-green focus:ring-cenat-green">
                    ${t('admin.settings.restore_default')}
                </label>
            ` : ''}
        </div>
    `;
}

function setupImagePreview(key) {
    const fileInput = document.getElementById(key);
    const preview = document.getElementById(`${key}-preview`);
    const clearCheckbox = document.getElementById(`${key}_clear`);

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        if (clearCheckbox) clearCheckbox.checked = false;
        const reader = new FileReader();
        reader.onload = (e) => { preview.src = e.target.result; };
        reader.readAsDataURL(file);
    });

    if (clearCheckbox) {
        clearCheckbox.addEventListener('change', () => {
            if (clearCheckbox.checked) fileInput.value = '';
        });
    }
}

async function handleUpdateSiteSettings(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('settings-submit-btn');

    const catalogTitle = document.getElementById('catalog_title').value.trim();
    const catalogSubtitle = document.getElementById('catalog_subtitle').value.trim();

    const loginBgFile = document.getElementById('login_bg_image').files[0];
    const coursesBgFile = document.getElementById('courses_bg_image').files[0];
    if (loginBgFile && !checkFileSize(loginBgFile, 5 * 1024 * 1024, t('admin.settings.login_bg_field_label'))) return;
    if (coursesBgFile && !checkFileSize(coursesBgFile, 5 * 1024 * 1024, t('admin.settings.courses_bg_field_label'))) return;

    const formData = new FormData();
    formData.append('catalog_title', catalogTitle);
    formData.append('catalog_subtitle', catalogSubtitle);
    if (loginBgFile) formData.append('login_bg_image', loginBgFile);
    if (coursesBgFile) formData.append('courses_bg_image', coursesBgFile);

    const loginClear = document.getElementById('login_bg_image_clear');
    const coursesClear = document.getElementById('courses_bg_image_clear');
    if (loginClear?.checked) formData.append('login_bg_image_clear', 'true');
    if (coursesClear?.checked) formData.append('courses_bg_image_clear', 'true');

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${t('contentManager.saving')}`;

        await settingsAPI.update(formData);
        showToast(t('admin.settings.updated'), 'success');

        // Trae los valores frescos del servidor (URLs reales de las
        // imágenes recién subidas) y refresca el .auth-bg/.courses-bg de
        // toda la app sin recargar la página.
        await loadSiteSettings();
        await renderAdminSettings({});

    } catch (error) {
        showToast(error.message || t('admin.settings.update_failed'), 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-save mr-2"></i> ${t('admin.save_changes')}`;
    }
}
