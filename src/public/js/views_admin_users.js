/**
 * Views - Administración de Usuarios (con paginación y toggle activo)
 */

const USERS_PER_PAGE = 10;
let currentUserPage = 1;
let allUsers = [];

window.renderAdminUsers = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const response = await usersAPI.getAll();
        allUsers = response.data || [];
        currentUserPage = 1;
        const currentUserId = getCurrentUser().id;

        app.innerHTML = renderAdminLayout(`
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                <i class="fas fa-users text-cenat-blue mr-2"></i>
                Gestión de Usuarios
            </h1>

            <div class="relative mb-4">
                <input type="text" id="search-admin-users" placeholder="Buscar usuario por nombre o email..."
                    class="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cenat-blue">
                <i class="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            </div>

            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div id="users-table-container"></div>
                <div id="users-pagination" class="px-4 py-3 border-t border-gray-100 dark:border-slate-700"></div>
            </div>
        `, 'users');

        renderUsersTable(allUsers, currentUserPage, currentUserId);

        document.getElementById('search-admin-users').addEventListener('input', debounce((e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allUsers.filter(u =>
                u.name.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term)
            );
            currentUserPage = 1;
            renderUsersTable(filtered, 1, currentUserId);
        }, 300));

    } catch (error) {
        console.error('Error loading users:', error);
        showToast('Error al cargar los usuarios', 'error');
    }
};

function renderUsersTable(users, page, currentUserId) {
    const total = users.length;
    const totalPages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));
    const start = (page - 1) * USERS_PER_PAGE;
    const paginated = users.slice(start, start + USERS_PER_PAGE);

    const container = document.getElementById('users-table-container');
    const pagination = document.getElementById('users-pagination');
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
                        <th class="py-3 px-4 text-right">Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${paginated.map(user => {
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
                                    class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-student'} border-0 cursor-pointer"
                                    ${isMe ? 'disabled' : ''}>
                                    <option value="student" ${user.role === 'student' ? 'selected' : ''}>Estudiante</option>
                                    <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                                </select>
                            </td>
                            <td class="py-3 px-4">
                                <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
                                    ${isActive ? 'Activo' : 'Inactivo'}
                                </span>
                            </td>
                            <td class="py-3 px-4 text-gray-500 dark:text-slate-400">${formatDate(user.created_at)}</td>
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

    pagination.innerHTML = renderPagination(page, totalPages, total, USERS_PER_PAGE, 'goToUserPage');
}

window.goToUserPage = function(page) {
    currentUserPage = page;
    const term = document.getElementById('search-admin-users')?.value?.toLowerCase() || '';
    const currentUserId = getCurrentUser().id;
    const filtered = term
        ? allUsers.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
        : allUsers;
    renderUsersTable(filtered, page, currentUserId);
};

async function toggleUserActive(userId) {
    try {
        const response = await usersAPI.toggleActive(userId);
        const newState = response.data.is_active;

        // Actualizar en el array local
        const user = allUsers.find(u => u.id === userId);
        if (user) user.is_active = newState;

        showToast(response.message, newState ? 'success' : 'warning');
        renderUsersTable(allUsers, currentUserPage, getCurrentUser().id);
    } catch (error) {
        showToast(error.message || 'Error al cambiar estado del usuario', 'error');
    }
}

async function changeUserRole(userId, newRole) {
    try {
        const user = await usersAPI.getById(userId);
        await usersAPI.update(userId, { name: user.data.name, email: user.data.email, role: newRole });
        showToast('Rol actualizado exitosamente', 'success');
        const u = allUsers.find(u => u.id === userId);
        if (u) u.role = newRole;
    } catch (error) {
        showToast(error.message || 'Error al actualizar el rol', 'error');
        renderAdminUsers({});
    }
}

window.toggleUserActive = toggleUserActive;
window.changeUserRole = changeUserRole;