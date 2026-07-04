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
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl fade-in">
                <!-- Logo y Header -->
                <div class="text-center">
                    <div class="mx-auto h-16 w-16 bg-gradient-to-br from-cenat-blue to-cenat-light rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-graduation-cap text-3xl text-white"></i>
                    </div>
                    <h2 class="text-3xl font-extrabold text-gray-900 mb-2">
                        Bienvenido a LMS CeNAT
                    </h2>
                    <p class="text-gray-600">
                        Inicia sesión para acceder a tus cursos
                    </p>
                </div>

                <!-- Formulario de Login -->
                <form id="login-form" class="mt-8 space-y-6">
                    <div class="space-y-4">
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
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition"
                                    placeholder="tu@email.com"
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
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition"
                                    placeholder="••••••••"
                                >
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
                            <a href="#/register" class="font-medium text-cenat-blue hover:text-cenat-hover transition">
                                Regístrate aquí
                            </a>
                        </p>
                    </div>

                    <!-- Test Credentials -->
                    <div class="bg-gray-50 rounded-lg p-4 mt-4">
                        <p class="text-xs text-gray-600 mb-2 font-semibold">📋 Credenciales de prueba:</p>
                        <div class="text-xs text-gray-500 space-y-1">
                            <p><strong>Admin:</strong> admin@cenat.ac.cr / admin123</p>
                            <p><strong>Estudiante:</strong> maria@cenat.ac.cr / admin123</p>
                        </div>
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
        <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-2xl fade-in">
                <!-- Logo y Header -->
                <div class="text-center">
                    <div class="mx-auto h-16 w-16 bg-gradient-to-br from-cenat-blue to-cenat-light rounded-full flex items-center justify-center mb-4">
                        <i class="fas fa-user-plus text-3xl text-white"></i>
                    </div>
                    <h2 class="text-3xl font-extrabold text-gray-900 mb-2">
                        Crear Cuenta
                    </h2>
                    <p class="text-gray-600">
                        Únete a la comunidad educativa de CeNAT
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
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition"
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
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition"
                                    placeholder="tu@email.com"
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
                                    class="appearance-none relative block w-full pl-10 pr-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-cenat-blue focus:border-transparent transition"
                                    placeholder="••••••••"
                                >
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
                            <a href="#/login" class="font-medium text-cenat-blue hover:text-cenat-hover transition">
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
        const password = document.getElementById('password').value;
        
        const success = await register(name, email, password);
        
        if (success) {
            // Redirigir al login después de 1 segundo
            setTimeout(() => {
                window.location.hash = '#/login';
            }, 1000);
        }
    });
};
