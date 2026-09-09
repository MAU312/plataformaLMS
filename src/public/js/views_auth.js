/**
 * Views - Renderizado de todas las páginas de la aplicación
 * Parte 1: Autenticación (Login y Registro)
 */

// =================================
// LOGIN PAGE
// =================================

window.renderLogin = async function(params) {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center auth-bg py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl fade-in">
                <!-- Logo y Header -->
                <div class="text-center">
                    <img src="/images/logo-lanba.png" alt="LANBA" class="mx-auto h-16 w-auto object-contain mb-4">
                    <h2 class="text-3xl font-extrabold text-gray-900 mb-2">
                        ${t('auth.login.title')}
                    </h2>
                    <p class="text-gray-600">
                        ${t('auth.login.subtitle')}
                    </p>
                </div>

                <!-- Formulario de Login -->
                <form id="login-form" class="mt-8 space-y-6">
                    <div class="space-y-4">
                        <!-- Correo o usuario -->
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                                ${t('auth.login.identifier_label')}
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i class="fas fa-user text-gray-400"></i>
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="text"
                                    required
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                    placeholder="${escapeAttr(t('auth.login.identifier_placeholder'))}"
                                >
                            </div>
                        </div>

                        <!-- Password -->
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                                ${t('auth.login.password_label')}
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i class="fas fa-lock text-gray-400"></i>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    class="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                    placeholder="••••••••"
                                >
                                <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password" aria-label="${escapeAttr(t('common.show_password'))}">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <div class="text-right mt-1">
                                <a href="#/forgot-password" class="text-xs font-medium text-cenat-green hover:text-cenat-green-hover transition">
                                    ${t('auth.login.forgot_password')}
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <div>
                        <button
                            type="submit"
                            id="login-submit-btn"
                            class="btn-cenat w-full py-3 text-lg"
                        >
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            ${t('auth.login.submit')}
                        </button>
                    </div>

                    <!-- Register Link -->
                    <div class="text-center">
                        <p class="text-sm text-gray-600">
                            ${t('auth.login.no_account')}
                            <a href="#/register" class="font-medium text-cenat-green hover:text-cenat-green-hover transition">
                                ${t('auth.login.register_link')}
                            </a>
                        </p>
                    </div>

                    <!-- Separador -->
                    <div class="relative py-2">
                        <div class="absolute inset-0 flex items-center">
                            <div class="w-full border-t border-gray-200"></div>
                        </div>
                        <div class="relative flex justify-center text-xs">
                            <span class="bg-white px-3 text-gray-400">${t('auth.login.or_separator')}</span>
                        </div>
                    </div>

                    <!-- Acceder como invitado -->
                    <button type="button" onclick="navigateTo('/')" class="w-full py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
                        <i class="fas fa-eye mr-2"></i>
                        ${t('auth.login.guest_button')}
                    </button>
                    <p class="text-xs text-gray-400 text-center">
                        ${t('auth.login.guest_hint')}
                    </p>
                </form>
            </div>
        </div>
    `;

    // Event listener para el formulario
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const submitBtn = document.getElementById('login-submit-btn');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${t('auth.login.submitting')}`;

        const success = await login(email, password);

        // En éxito, login() ya redirige (la página se re-renderiza) — no
        // hace falta restaurar el botón. En error, el usuario se queda acá
        // y sí necesita poder reintentar.
        if (!success) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    });
};

// =================================
// REGISTER PAGE
// =================================

window.renderRegister = async function(params) {
    const app = document.getElementById('app');
    
    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center auth-bg py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl fade-in">
                <!-- Logo y Header -->
                <div class="text-center">
                    <img src="/images/logo-lanba.png" alt="LANBA" class="mx-auto h-16 w-auto object-contain mb-4">
                    <h2 class="text-3xl font-extrabold text-gray-900 mb-2">
                        ${t('auth.register.title')}
                    </h2>
                    <p class="text-gray-600">
                        ${t('auth.register.subtitle')}
                    </p>
                </div>

                <!-- Formulario de Registro -->
                <form id="register-form" class="mt-8 space-y-6">
                    <div class="space-y-4">
                        <!-- Nombre -->
                        <div>
                            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                                ${t('auth.register.name_label')}
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i class="fas fa-user text-gray-400"></i>
                                </div>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    required
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                    placeholder="${escapeAttr(t('auth.register.name_placeholder'))}"
                                >
                            </div>
                        </div>

                        <!-- Email -->
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                                ${t('auth.register.email_label')}
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i class="fas fa-envelope text-gray-400"></i>
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                    placeholder="${escapeAttr(t('auth.register.email_placeholder'))}"
                                >
                            </div>
                        </div>

                        <!-- Username (opcional) -->
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
                                ${t('auth.register.username_label')}
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i class="fas fa-at text-gray-400"></i>
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    minlength="3"
                                    maxlength="50"
                                    pattern="[a-zA-Z0-9_.-]+"
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                    placeholder="${escapeAttr(t('auth.register.username_placeholder'))}"
                                >
                            </div>
                        </div>

                        <!-- Password -->
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                                ${t('auth.register.password_label')}
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i class="fas fa-lock text-gray-400"></i>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    minlength="6"
                                    class="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                    placeholder="••••••••"
                                >
                                <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password" aria-label="${escapeAttr(t('common.show_password'))}">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <p class="mt-1 text-xs text-gray-500">
                                ${t('auth.register.password_hint')}
                            </p>
                        </div>

                        <!-- Confirmar contraseña -->
                        <div>
                            <label for="password-confirm" class="block text-sm font-medium text-gray-700 mb-1">
                                ${t('auth.register.password_confirm_label')}
                            </label>
                            <div class="relative">
                                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <i class="fas fa-lock text-gray-400"></i>
                                </div>
                                <input
                                    id="password-confirm"
                                    name="password-confirm"
                                    type="password"
                                    required
                                    minlength="6"
                                    class="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                    placeholder="••••••••"
                                >
                                <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password-confirm" aria-label="${escapeAttr(t('common.show_password'))}">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <div>
                        <button
                            type="submit"
                            id="register-submit-btn"
                            class="btn-cenat w-full py-3 text-lg"
                        >
                            <i class="fas fa-user-plus mr-2"></i>
                            ${t('auth.register.submit')}
                        </button>
                    </div>

                    <!-- Login Link -->
                    <div class="text-center">
                        <p class="text-sm text-gray-600">
                            ${t('auth.register.has_account')}
                            <a href="#/login" class="font-medium text-cenat-green hover:text-cenat-green-hover transition">
                                ${t('auth.register.login_link')}
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Event listener para el formulario
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;

        if (password !== passwordConfirm) {
            showToast(t('errors.passwords_dont_match'), 'error');
            return;
        }

        const submitBtn = document.getElementById('register-submit-btn');
        const originalHtml = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${t('auth.register.submitting')}`;

        const success = await register(name, email, password, username || undefined);

        // En éxito, register() ya inició sesión y redirigió (la página se
        // re-renderiza) — no hace falta restaurar el botón. En error, el
        // usuario se queda acá y sí necesita poder reintentar.
        if (!success) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHtml;
        }
    });
};

// =================================
// FORGOT PASSWORD PAGE
// =================================

window.renderForgotPassword = async function(params) {
    const app = document.getElementById('app');

    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center auth-bg py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl fade-in">
                <div class="text-center">
                    <img src="/images/logo-lanba.png" alt="LANBA" class="mx-auto h-16 w-auto object-contain mb-4">
                    <h2 class="text-3xl font-extrabold text-gray-900 mb-2">
                        ${t('auth.forgotPassword.title')}
                    </h2>
                    <p class="text-gray-600">
                        ${t('auth.forgotPassword.subtitle')}
                    </p>
                </div>

                <form id="forgot-password-form" class="mt-8 space-y-6">
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                            ${t('auth.forgotPassword.email_label')}
                        </label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i class="fas fa-envelope text-gray-400"></i>
                            </div>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                placeholder="${escapeAttr(t('auth.forgotPassword.email_placeholder'))}"
                            >
                        </div>
                    </div>

                    <div>
                        <button id="forgot-password-submit" type="submit" class="btn-cenat w-full py-3 text-lg">
                            <i class="fas fa-paper-plane mr-2"></i>
                            ${t('auth.forgotPassword.submit')}
                        </button>
                    </div>

                    <div class="text-center">
                        <a href="#/login" class="text-sm font-medium text-cenat-green hover:text-cenat-green-hover transition">
                            <i class="fas fa-arrow-left mr-1"></i> ${t('auth.forgotPassword.back_to_login')}
                        </a>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const submitBtn = document.getElementById('forgot-password-submit');

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${t('auth.forgotPassword.submitting')}`;

        try {
            const response = await authAPI.forgotPassword(email);
            showToast(response.message, 'success');
            e.target.reset();
        } catch (error) {
            showToast(error.message || t('errors.forgot_password_failed'), 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-paper-plane mr-2"></i> ${t('auth.forgotPassword.submit')}`;
        }
    });
};

// =================================
// RESET PASSWORD PAGE
// =================================

window.renderResetPassword = async function(params) {
    const app = document.getElementById('app');
    const token = params.token;

    app.innerHTML = `
        <div class="min-h-screen flex items-center justify-center auth-bg py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl fade-in">
                <div class="text-center">
                    <img src="/images/logo-lanba.png" alt="LANBA" class="mx-auto h-16 w-auto object-contain mb-4">
                    <h2 class="text-3xl font-extrabold text-gray-900 mb-2">
                        ${t('auth.resetPassword.title')}
                    </h2>
                    <p class="text-gray-600">
                        ${t('auth.resetPassword.subtitle')}
                    </p>
                </div>

                <form id="reset-password-form" class="mt-8 space-y-6">
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                            ${t('auth.resetPassword.password_label')}
                        </label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i class="fas fa-lock text-gray-400"></i>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                minlength="6"
                                class="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                placeholder="••••••••"
                            >
                            <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password" aria-label="${escapeAttr(t('common.show_password'))}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <p class="mt-1 text-xs text-gray-500">${t('auth.resetPassword.password_hint')}</p>
                    </div>

                    <div>
                        <label for="password-confirm" class="block text-sm font-medium text-gray-700 mb-1">
                            ${t('auth.resetPassword.password_confirm_label')}
                        </label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i class="fas fa-lock text-gray-400"></i>
                            </div>
                            <input
                                id="password-confirm"
                                name="password-confirm"
                                type="password"
                                required
                                minlength="6"
                                class="appearance-none relative block w-full pl-10 pr-10 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                placeholder="••••••••"
                            >
                            <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password-confirm" aria-label="${escapeAttr(t('common.show_password'))}">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div>
                        <button id="reset-password-submit" type="submit" class="btn-cenat w-full py-3 text-lg">
                            <i class="fas fa-check mr-2"></i>
                            ${t('auth.resetPassword.submit')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password-confirm').value;

        if (password !== passwordConfirm) {
            showToast(t('errors.passwords_dont_match'), 'error');
            return;
        }

        const submitBtn = document.getElementById('reset-password-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${t('auth.resetPassword.submitting')}`;

        try {
            const response = await authAPI.resetPassword(token, password);
            showToast(response.message, 'success');
            setTimeout(() => { window.location.hash = '#/login'; }, 1500);
        } catch (error) {
            showToast(error.message || t('errors.reset_password_failed'), 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-check mr-2"></i> ${t('auth.resetPassword.submit')}`;
        }
    });
};
