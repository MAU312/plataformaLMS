/**
 * Views - Panel Administrativo (Dashboard)
 */

window.renderAdminDashboard = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const [coursesRes, usersStatsRes] = await Promise.all([
            coursesAPI.getAll(),
            usersAPI.getStats()
        ]);

        const courses = coursesRes.data || [];
        const userStats = usersStatsRes.data || [];

        const totalCourses = courses.length;
        const activeCourses = courses.filter(c => c.is_active).length;
        const totalContents = courses.reduce((sum, c) => sum + (c.content_count || 0), 0);
        const totalEnrollments = courses.reduce((sum, c) => sum + (c.enrolled_count || 0), 0);
        const totalStudents = userStats.find(s => s.role === 'student')?.count || 0;

        app.innerHTML = `
            ${renderAdminLayout(`
                <h1 class="text-2xl font-bold text-gray-900 mb-6">
                    <i class="fas fa-tachometer-alt text-cenat-blue mr-2"></i>
                    Panel de Administración
                </h1>

                <!-- Stats Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    ${renderStatCard('fa-book', totalCourses, 'Cursos totales', 'bg-blue-500')}
                    ${renderStatCard('fa-check-circle', activeCourses, 'Cursos activos', 'bg-green-500')}
                    ${renderStatCard('fa-file-video', totalContents, 'Contenidos', 'bg-purple-500')}
                    ${renderStatCard('fa-user-graduate', totalStudents, 'Estudiantes', 'bg-orange-500')}
                </div>

                <!-- Quick Actions -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                    <h2 class="text-lg font-bold text-gray-900 mb-4">Acciones rápidas</h2>
                    <div class="flex flex-wrap gap-4">
                        <a href="#/admin/courses/create" class="btn-cenat">
                            <i class="fas fa-plus mr-2"></i> Crear nuevo curso
                        </a>
                        <a href="#/admin/courses" class="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                            <i class="fas fa-cog mr-2"></i> Gestionar cursos
                        </a>
                        <a href="#/admin/users" class="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                            <i class="fas fa-users mr-2"></i> Gestionar usuarios
                        </a>
                    </div>
                </div>

                <!-- Cursos recientes -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4">Cursos recientes</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b text-left text-gray-500">
                                    <th class="py-2 pr-4">Título</th>
                                    <th class="py-2 pr-4">Estado</th>
                                    <th class="py-2 pr-4">Contenidos</th>
                                    <th class="py-2 pr-4">Inscritos</th>
                                    <th class="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${courses.slice(0, 5).map(course => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="py-3 pr-4 font-medium text-gray-900">${escapeHtml(course.title)}</td>
                                        <td class="py-3 pr-4">
                                            <span class="badge ${course.is_active ? 'badge-active' : 'badge-inactive'}">
                                                ${course.is_active ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td class="py-3 pr-4">${course.content_count || 0}</td>
                                        <td class="py-3 pr-4">${course.enrolled_count || 0}</td>
                                        <td class="py-3">
                                            <a href="#/admin/courses/${course.id}/edit" class="text-cenat-blue hover:underline">
                                                Editar
                                            </a>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `, 'dashboard')}
        `;

    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Error al cargar el panel administrativo', 'error');
    }
};

function renderStatCard(icon, value, label, colorClass) {
    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
            <div class="${colorClass} text-white rounded-lg w-14 h-14 flex items-center justify-center">
                <i class="fas ${icon} text-2xl"></i>
            </div>
            <div>
                <p class="text-2xl font-bold text-gray-900">${value}</p>
                <p class="text-gray-500 text-sm">${label}</p>
            </div>
        </div>
    `;
}

/**
 * Layout compartido para todas las páginas de admin (sidebar + contenido)
 */
function renderAdminLayout(content, activeSection) {
    const menuItems = [
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard', path: '/admin' },
        { id: 'courses', icon: 'fa-book', label: 'Cursos', path: '/admin/courses' },
        { id: 'users', icon: 'fa-users', label: 'Usuarios', path: '/admin/users' }
    ];

    return `
        <div class="flex min-h-screen bg-gray-50">
            <!-- Sidebar -->
            <aside class="w-64 bg-white border-r border-gray-200 hidden md:block">
                <div class="p-6">
                    <h2 class="text-lg font-bold text-cenat-blue mb-6">
                        <i class="fas fa-shield-alt mr-2"></i>Administración
                    </h2>
                    <nav class="space-y-1">
                        ${menuItems.map(item => `
                            <a href="#${item.path}" class="flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeSection === item.id ? 'bg-blue-50 text-cenat-blue font-semibold' : 'text-gray-600 hover:bg-gray-50'}">
                                <i class="fas ${item.icon} w-5"></i>
                                <span>${item.label}</span>
                            </a>
                        `).join('')}
                    </nav>
                </div>
            </aside>

            <!-- Mobile sidebar selector -->
            <div class="md:hidden fixed bottom-4 right-4 z-40">
                <select onchange="navigateTo(this.value)" class="bg-cenat-blue text-white rounded-lg px-4 py-2 shadow-lg">
                    ${menuItems.map(item => `
                        <option value="${item.path}" ${activeSection === item.id ? 'selected' : ''}>${item.label}</option>
                    `).join('')}
                </select>
            </div>

            <!-- Main content -->
            <div class="flex-1 p-6 md:p-8">
                ${content}
            </div>
        </div>
    `;
}

window.renderAdminLayout = renderAdminLayout;
window.renderStatCard = renderStatCard;
