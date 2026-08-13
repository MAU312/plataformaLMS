/**
 * Views - Administración de Usuarios (con paginación y toggle activo)
 */

const USERS_PER_PAGE = 10;
let currentUserPage = 1;
let currentUserSearch = '';
let currentPageUsers = [];
let currentUsersPagination = { total: 0, totalPages: 1 };
// Descarta respuestas obsoletas si el usuario escribe más rápido de lo
// que tardan en volver las peticiones de búsqueda.
let adminUsersRequestToken = 0;

window.renderAdminUsers = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentUserPage = 1;
    currentUserSearch = '';

    app.innerHTML = renderAdminLayout(`
        <div class="flex items-center justify-between mb-6 gap-4 flex-wrap">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">
                <i class="fas fa-users text-cenat-green mr-2"></i>
                Gestión de Usuarios
            </h1>
            <button onclick="openCreateUserModal()" class="btn-cenat">
                <i class="fas fa-user-plus"></i> Crear usuario
            </button>
        </div>

        <div class="relative mb-4">
            <input type="text" id="search-admin-users" placeholder="Buscar usuario por nombre o email..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
            <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div id="users-table-container"></div>
            <div id="users-pagination" class="px-4 py-3 border-t border-gray-100 dark:border-slate-700"></div>
        </div>
    `, 'users');

    document.getElementById('search-admin-users').addEventListener('input', debounce((e) => {
        currentUserSearch = e.target.value.trim();
        loadAdminUsers(1);
    }, 300));

    await loadAdminUsers(1);
};

function openCreateUserModal() {
    closeCreateUserModal();

    const modal = document.createElement('div');
    modal.id = 'create-user-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center px-4';
    modal.innerHTML = `
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" onclick="closeCreateUserModal()"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-md w-full fade-in">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">
                    <i class="fas fa-user-plus text-cenat-green mr-2"></i> Crear usuario
                </h2>
                <button onclick="closeCreateUserModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>

            <form id="create-user-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre completo *</label>
                    <input type="text" id="new-user-name" required
                        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email *</label>
                    <input type="email" id="new-user-email" required
                        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre de usuario (opcional)</label>
                    <input type="text" id="new-user-username" minlength="3" maxlength="50"
                        placeholder="Para iniciar sesión sin el correo"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Contraseña *</label>
                    <input type="password" id="new-user-password" required minlength="6"
                        placeholder="Mínimo 6 caracteres"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Rol *</label>
                    <select id="new-user-role"
                        class="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-green">
                        <option value="student" selected>Estudiante</option>
                        <option value="teacher">Profesor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div class="flex items-center gap-3 pt-2">
                    <button type="submit" class="btn-cenat flex-1">Crear usuario</button>
                    <button type="button" onclick="closeCreateUserModal()" class="text-gray-600 dark:text-slate-300 px-4 py-2 text-sm">
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('create-user-form').addEventListener('submit', handleCreateUserSubmit);
}

function closeCreateUserModal() {
    const modal = document.getElementById('create-user-modal');
    if (modal) modal.remove();
}

async function handleCreateUserSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    const data = {
        name: document.getElementById('new-user-name').value.trim(),
        email: document.getElementById('new-user-email').value.trim(),
        username: document.getElementById('new-user-username').value.trim() || undefined,
        password: document.getElementById('new-user-password').value,
        role: document.getElementById('new-user-role').value
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creando...';

    try {
        await usersAPI.create(data);
        showToast('Usuario creado exitosamente', 'success');
        closeCreateUserModal();
        loadAdminUsers(currentUserPage);
    } catch (error) {
        showToast(error.message || 'Error al crear el usuario', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

window.openCreateUserModal = openCreateUserModal;
window.closeCreateUserModal = closeCreateUserModal;

async function loadAdminUsers(page) {
    const container = document.getElementById('users-table-container');
    const pagination = document.getElementById('users-pagination');
    if (!container) return;

    const token = ++adminUsersRequestToken;
    const currentUserId = getCurrentUser().id;

    try {
        const response = await usersAPI.getAll({ page, limit: USERS_PER_PAGE, search: currentUserSearch });
        if (token !== adminUsersRequestToken) return;

        currentUserPage = page;
        currentPageUsers = response.data || [];
        currentUsersPagination = response.pagination || { total: currentPageUsers.length, totalPages: 1 };
        renderUsersTable(currentPageUsers, page, currentUserId, currentUsersPagination);
    } catch (error) {
        if (token !== adminUsersRequestToken) return;
        console.error('Error loading users:', error);
        showToast('Error al cargar los usuarios', 'error');
    }
}

function renderUsersTable(users, page, currentUserId, pagination) {
    const container = document.getElementById('users-table-container');
    const paginationContainer = document.getElementById('users-pagination');
    if (!container) return;

    container.innerHTML = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-slate-700">
                    <tr class="text-left text-gray-500 dark:text-slate-400">
                        <th class="py-3 px-4">Nombre</th>
                        <th class="py-3 px-4">Email</th>
                        <th class="py-3 px-4">Rol</th>
                        <th class="py-3 px-4">Estado</th>
                        <th class="py-3 px-4">Registrado</th>
                        <th class="py-3 px-4">Último ingreso</th>
                        <th class="py-3 px-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => {
                        const isMe = user.id === currentUserId;
                        const isActive = user.is_active == 1 || user.is_active === true;
                        return `
                        <tr class="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 ${!isActive ? 'opacity-60' : ''}">
                            <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">
                                ${escapeHtml(user.name)}
                                ${isMe ? '<span class="text-xs text-gray-400 ml-1">(Tú)</span>' : ''}
                            </td>
                            <td class="py-3 px-4 text-gray-600 dark:text-slate-300">${escapeHtml(user.email)}</td>
                            <td class="py-3 px-4">
                                <select onchange="changeUserRole(${user.id}, this.value)"
                                    class="badge ${user.role === 'admin' ? 'badge-admin' : user.role === 'teacher' ? 'badge-teacher' : 'badge-student'} border-0 cursor-pointer"
                                    ${isMe ? 'disabled' : ''}>
                                    <option value="student" ${user.role === 'student' ? 'selected' : ''}>Estudiante</option>
                                    <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>Profesor</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </td>
                            <td class="py-3 px-4">
                                <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                                    ${isActive ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-gray-500 dark:text-slate-400">${formatDate(user.created_at)}</td>
                            <td class="py-3 px-4 text-gray-500 dark:text-slate-400">${user.last_login ? formatDate(user.last_login) : 'Nunca'}</td>
                            <td class="py-3 px-4 text-right">
                                <button
                                    onclick="toggleUserActive(${user.id})"
                                    title="${isActive ? 'Desactivar usuario' : 'Activar usuario'}"
                                    class="${isMe ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-80'} transition"
                                    ${isMe ? 'disabled' : ''}>
                                    <i class="fas ${isActive ? 'fa-user-slash text-yellow-500' : 'fa-user-check text-green-500'} text-lg"></i>
                                </button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>`;

    const { totalPages = 1, total = users.length } = pagination || {};
    paginationContainer.innerHTML = renderPagination(page, totalPages, total, USERS_PER_PAGE, 'goToUserPage');
}

window.goToUserPage = function(page) {
    loadAdminUsers(page);
};

async function toggleUserActive(userId) {
    try {
        const response = await usersAPI.toggleActive(userId);
        const newState = response.data.is_active;

        // Actualizar en la página actual sin volver a pedirla al servidor
        const user = currentPageUsers.find(u => u.id === userId);
        if (user) user.is_active = newState;

        showToast(response.message, newState ? 'success' : 'warning');
        renderUsersTable(currentPageUsers, currentUserPage, getCurrentUser().id, currentUsersPagination);
    } catch (error) {
        showToast(error.message || 'Error al cambiar estado del usuario', 'error');
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const user = await usersAPI.getById(userId);
        await usersAPI.update(userId, { name: user.data.name, email: user.data.email, role: newRole });
        showToast('Rol actualizado exitosamente', 'success');
        const u = currentPageUsers.find(u => u.id === userId);
        if (u) u.role = newRole;
    } catch (error) {
        showToast(error.message || 'Error al actualizar el rol', 'error');
        loadAdminUsers(currentUserPage);
    }
}

window.toggleUserActive = toggleUserActive;
window.changeUserRole = changeUserRole;
