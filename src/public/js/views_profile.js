/**
 * Views - Mi Perfil
 */

window.renderProfile = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    const user = getCurrentUser();

    try {
        let enrolledCourses = [];
        if (isStudent()) {
            const response = await coursesAPI.getEnrolled();
            enrolledCourses = response.data || [];
        }

        app.innerHTML = `
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mb-6">
                    <div class="flex items-center gap-4">
                        <div class="w-20 h-20 bg-gradient-to-br from-cenat-blue to-cenat-light rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            ${user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 class="text-2xl font-bold text-gray-900">${escapeHtml(user.name)}</h1>
                            <p class="text-gray-600">${escapeHtml(user.email)}</p>
                            <span class="badge ${user.role === 'admin' ? 'badge-admin' : 'badge-student'} mt-2 inline-block">
                                ${user.role === 'admin' ? 'Administrador' : 'Estudiante'}
                            </span>
                        </div>
                    </div>
                </div>

                ${isStudent() ? `
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
                        <h2 class="text-lg font-bold text-gray-900 mb-4">
                            <i class="fas fa-chart-line text-cenat-blue mr-2"></i>
                            Mi progreso (${enrolledCourses.length} cursos)
                        </h2>
                        ${enrolledCourses.length > 0 ? `
                            <div class="space-y-4">
                                ${enrolledCourses.map(course => `
                                    <div class="border border-gray-100 rounded-lg p-4">
                                        <div class="flex justify-between items-center mb-2">
                                            <a href="#/course/${course.id}" class="font-medium text-gray-900 hover:text-cenat-blue">${escapeHtml(course.title)}</a>
                                            <span class="text-sm text-gray-500">${course.progress || 0}%</span>
                                        </div>
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${course.progress || 0}%"></div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : `
                            <p class="text-gray-500 text-center py-6">No estás inscrito en ningún curso aún</p>
                        `}
                    </div>
                ` : ''}
            </div>
        `;

    } catch (error) {
        console.error('Error loading profile:', error);
        showToast('Error al cargar el perfil', 'error');
    }
};
