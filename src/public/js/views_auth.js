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
                        Bienvenido a LMS LANBA - CeNAT
                    </h2>
                    <p class="text-gray-600">
                        Inicia sesión para acceder a tus cursos
                    </p>
                </div>

                <!-- Formulario de Login -->
                <form id="login-form" class="mt-8 space-y-6">
                    <div class="space-y-4">
                        <!-- Correo o usuario -->
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                                Correo o nombre de usuario
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
                                    placeholder="tu@email.com o tu usuario"
                                >
                            </div>
                        </div>

                        <!-- Password -->
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña
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
                                <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password" aria-label="Mostrar contraseña">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <div class="text-right mt-1">
                                <a href="#/forgot-password" class="text-xs font-medium text-cenat-green hover:text-cenat-green-hover transition">
                                    ¿Olvidaste tu contraseña?
                                </a>
                            </div>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <div>
                        <button
                            type="submit"
                            class="btn-cenat w-full py-3 text-lg"
                        >
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Iniciar Sesión
                        </button>
                    </div>

                    <!-- Register Link -->
                    <div class="text-center">
                        <p class="text-sm text-gray-600">
                            ¿No tienes una cuenta?
                            <a href="#/register" class="font-medium text-cenat-green hover:text-cenat-green-hover transition">
                                Regístrate aquí
                            </a>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    `;

    // Event listener para el formulario
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        await login(email, password);
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
                        Crear Cuenta
                    </h2>
                    <p class="text-gray-600">
                        Únete a la comunidad educativa de LANBA - CeNAT
                    </p>
                </div>

                <!-- Formulario de Registro -->
                <form id="register-form" class="mt-8 space-y-6">
                    <div class="space-y-4">
                        <!-- Nombre -->
                        <div>
                            <label for="name" class="block text-sm font-medium text-gray-700 mb-1">
                                Nombre Completo
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
                                    placeholder="Juan Pérez"
                                >
                            </div>
                        </div>

                        <!-- Email -->
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                                Correo Electrónico
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
                                    placeholder="tu@email.com"
                                >
                            </div>
                        </div>

                        <!-- Username (opcional) -->
                        <div>
                            <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
                                Nombre de usuario (opcional)
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
                                    pattern="[a-zA-Z0-9_.\-]+"
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-green focus:border-transparent transition"
                                    placeholder="Para iniciar sesión sin tu correo"
                                >
                            </div>
                        </div>

                        <!-- Password -->
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                                Contraseña
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
                                <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password" aria-label="Mostrar contraseña">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                            <p class="mt-1 text-xs text-gray-500">
                                Mínimo 6 caracteres
                            </p>
                        </div>
                    </div>

                    <!-- Submit Button -->
                    <div>
                        <button 
                            type="submit" 
                            class="btn-cenat w-full py-3 text-lg"
                        >
                            <i class="fas fa-user-plus mr-2"></i>
                            Registrarse
                        </button>
                    </div>

                    <!-- Login Link -->
                    <div class="text-center">
                        <p class="text-sm text-gray-600">
                            ¿Ya tienes una cuenta? 
                            <a href="#/login" class="font-medium text-cenat-green hover:text-cenat-green-hover transition">
                                Inicia sesión aquí
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

        const success = await register(name, email, password, username || undefined);

        if (success) {
            // Redirigir al login después de 1 segundo
            setTimeout(() => {
                window.location.hash = '#/login';
            }, 1000);
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
                        Recuperar contraseña
                    </h2>
                    <p class="text-gray-600">
                        Escribe tu correo y te enviaremos un enlace para restablecerla
                    </p>
                </div>

                <form id="forgot-password-form" class="mt-8 space-y-6">
                    <div>
                        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                            Correo Electrónico
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
                                placeholder="tu@email.com"
                            >
                        </div>
                    </div>

                    <div>
                        <button id="forgot-password-submit" type="submit" class="btn-cenat w-full py-3 text-lg">
                            <i class="fas fa-paper-plane mr-2"></i>
                            Enviar enlace de recuperación
                        </button>
                    </div>

                    <div class="text-center">
                        <a href="#/login" class="text-sm font-medium text-cenat-green hover:text-cenat-green-hover transition">
                            <i class="fas fa-arrow-left mr-1"></i> Volver a iniciar sesión
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
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...';

        try {
            const response = await authAPI.forgotPassword(email);
            showToast(response.message, 'success');
            e.target.reset();
        } catch (error) {
            showToast(error.message || 'Error al procesar la solicitud', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> Enviar enlace de recuperación';
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
                        Nueva contraseña
                    </h2>
                    <p class="text-gray-600">
                        Elige una nueva contraseña para tu cuenta
                    </p>
                </div>

                <form id="reset-password-form" class="mt-8 space-y-6">
                    <div>
                        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                            Nueva contraseña
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
                            <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password" aria-label="Mostrar contraseña">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                        <p class="mt-1 text-xs text-gray-500">Mínimo 6 caracteres</p>
                    </div>

                    <div>
                        <label for="password-confirm" class="block text-sm font-medium text-gray-700 mb-1">
                            Confirmar contraseña
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
                            <button type="button" class="toggle-password-btn absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition" data-target="password-confirm" aria-label="Mostrar contraseña">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div>
                        <button id="reset-password-submit" type="submit" class="btn-cenat w-full py-3 text-lg">
                            <i class="fas fa-check mr-2"></i>
                            Restablecer contraseña
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
            showToast('Las contraseñas no coinciden', 'error');
            return;
        }

        const submitBtn = document.getElementById('reset-password-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...';

        try {
            const response = await authAPI.resetPassword(token, password);
            showToast(response.message, 'success');
            setTimeout(() => { window.location.hash = '#/login'; }, 1500);
        } catch (error) {
            showToast(error.message || 'El enlace es inválido o ya expiró', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i> Restablecer contraseña';
        }
    });
};
