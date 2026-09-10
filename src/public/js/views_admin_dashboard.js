/**
 * Views - Panel Administrativo (Dashboard)
 */

window.renderAdminDashboard = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        // Los totales agregados vienen de un endpoint de estadísticas
        // (cuenta todos los cursos/contenidos/inscripciones en el servidor);
        // la tabla de "recientes" solo necesita los últimos 5, así que se
        // pide esa página nada más en vez de traer el catálogo completo.
        const [statsRes, recentCoursesRes, usersStatsRes] = await Promise.all([
            coursesAPI.getGlobalStats(),
            coursesAPI.getAll({ limit: 5 }),
            usersAPI.getStats()
        ]);

        const stats = statsRes.data || {};
        const recentCourses = recentCoursesRes.data || [];
        const userStats = usersStatsRes.data || [];

        const totalCourses = stats.total_courses || 0;
        const activeCourses = stats.active_courses || 0;
        const totalContents = stats.total_contents || 0;
        const totalStudents = userStats.find(s => s.role === 'student')?.count || 0;

        app.innerHTML = `
            ${renderAdminLayout(`
                <h1 class="text-2xl font-bold text-gray-900 mb-6">
                    <i class="fas fa-tachometer-alt text-cenat-green mr-2"></i>
                    ${t('admin.dashboard.title')}
                </h1>

                <!-- Stats Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    ${renderStatCard('fa-book', totalCourses, t('admin.dashboard.stat_total_courses'), 'bg-blue-500')}
                    ${renderStatCard('fa-check-circle', activeCourses, t('admin.dashboard.stat_active_courses'), 'bg-green-500')}
                    ${renderStatCard('fa-file-video', totalContents, t('admin.dashboard.stat_contents'), 'bg-purple-500')}
                    ${renderStatCard('fa-user-graduate', totalStudents, t('admin.dashboard.stat_students'), 'bg-orange-500')}
                </div>

                <!-- Quick Actions -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
                    <h2 class="text-lg font-bold text-gray-900 mb-4">${t('admin.dashboard.quick_actions')}</h2>
                    <div class="flex flex-wrap gap-4">
                        <a href="#/admin/courses/create" class="btn-cenat">
                            <i class="fas fa-plus mr-2"></i> ${t('admin.dashboard.create_course')}
                        </a>
                        <a href="#/admin/courses" class="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                            <i class="fas fa-cog mr-2"></i> ${t('admin.dashboard.manage_courses')}
                        </a>
                        <a href="#/admin/users" class="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                            <i class="fas fa-users mr-2"></i> ${t('admin.dashboard.manage_users')}
                        </a>
                    </div>
                </div>

                <!-- Cursos recientes -->
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h2 class="text-lg font-bold text-gray-900 mb-4">${t('admin.dashboard.recent_courses')}</h2>
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="border-b text-left text-gray-500">
                                    <th class="py-2 pr-4">${t('admin.dashboard.col_title')}</th>
                                    <th class="py-2 pr-4">${t('admin.dashboard.col_status')}</th>
                                    <th class="py-2 pr-4">${t('admin.dashboard.col_contents')}</th>
                                    <th class="py-2 pr-4">${t('admin.dashboard.col_enrolled')}</th>
                                    <th class="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                ${recentCourses.map(course => `
                                    <tr class="border-b hover:bg-gray-50">
                                        <td class="py-3 pr-4 font-medium text-gray-900">${escapeHtml(course.title)}</td>
                                        <td class="py-3 pr-4">
                                            <span class="badge ${course.is_active ? 'badge-active' : 'badge-inactive'}">
                                                ${course.is_active ? t('admin.status_active') : t('admin.status_inactive')}
                                            </span>
                                        </td>
                                        <td class="py-3 pr-4">${course.content_count || 0}</td>
                                        <td class="py-3 pr-4">${course.enrolled_count || 0}</td>
                                        <td class="py-3">
                                            <a href="#/admin/courses/${course.id}/edit" class="text-cenat-green hover:underline">
                                                ${t('admin.dashboard.edit')}
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
        showToast(t('admin.dashboard.load_failed'), 'error');
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
        { id: 'dashboard', icon: 'fa-tachometer-alt', label: t('admin.nav.dashboard'), path: '/admin' },
        { id: 'courses', icon: 'fa-book', label: t('admin.nav.courses'), path: '/admin/courses' },
        { id: 'users', icon: 'fa-users', label: t('admin.nav.users'), path: '/admin/users' },
        { id: 'settings', icon: 'fa-paint-brush', label: t('admin.nav.settings'), path: '/admin/settings' }
    ];

    return `
        <div class="flex min-h-screen bg-gray-50">
            <!-- Sidebar -->
            <aside class="w-64 bg-white border-r border-gray-200 hidden md:block">
                <div class="p-6">
                    <h2 class="text-lg font-bold text-cenat-green mb-6">
                        <i class="fas fa-shield-alt mr-2"></i>${t('nav.admin')}
                    </h2>
                    <nav class="space-y-1">
                        ${menuItems.map(item => `
                            <a href="#${item.path}" class="flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeSection === item.id ? 'bg-green-50 text-cenat-green font-semibold' : 'text-gray-600 hover:bg-gray-50'}">
                                <i class="fas ${item.icon} w-5"></i>
                                <span>${item.label}</span>
                            </a>
                        `).join('')}
                    </nav>
                </div>
            </aside>

            <!-- Mobile sidebar selector -->
            <div class="md:hidden fixed bottom-4 right-4 z-40">
                <select onchange="navigateTo(this.value)" class="bg-cenat-green text-white rounded-lg px-4 py-2 shadow-lg">
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
