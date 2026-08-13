/**
 * Views - Entregas de una tarea (admin/profesor revisa lo que entregaron
 * los estudiantes). Autorización fina resuelta por el backend
 * (requireCourseManager): si el usuario no es admin ni profesor
 * asignado al curso de esta tarea, la API responde 403 y se muestra un
 * error en vez de la tabla.
 */

let currentTaskContentId = null;

window.renderTaskSubmissions = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentTaskContentId = params.id;

    try {
        const response = await contentsAPI.getSubmissions(params.id);
        const { content, submissions } = response.data;

        app.innerHTML = `
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="javascript:history.back()" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> Volver
                </a>

                <h1 class="text-2xl font-bold text-gray-900 mb-1">
                    <i class="fas fa-inbox text-cenat-green mr-2"></i> Entregas
                </h1>
                <p class="text-gray-500 mb-6">${escapeHtml(content.title)}</p>

                <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    ${submissions.length > 0 ? `
                        <div class="overflow-x-auto">
                            <table class="w-full text-sm">
                                <thead class="bg-gray-50">
                                    <tr class="text-left text-gray-500">
                                        <th class="py-3 px-4">Estudiante</th>
                                        <th class="py-3 px-4">Entregado</th>
                                        <th class="py-3 px-4">Estado</th>
                                        <th class="py-3 px-4">Comentario</th>
                                        <th class="py-3 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${submissions.map(s => renderSubmissionRow(s)).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : `
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p class="text-xl text-gray-600 font-medium">Nadie ha entregado esta tarea todavía</p>
                        </div>
                    `}
                </div>
            </div>
        `;

    } catch (error) {
        console.error('Error loading submissions:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">${escapeHtml(error.message || 'Error al cargar las entregas')}</p>
                </div>
            </div>
        `;
    }
};

function renderSubmissionRow(s) {
    const reviewed = !!s.reviewed_at;
    return `
        <tr class="border-t border-gray-100">
            <td class="py-3 px-4 font-medium text-gray-900">
                ${escapeHtml(s.student_name)}<br>
                <span class="text-xs text-gray-400 font-normal">${escapeHtml(s.student_email)}</span>
            </td>
            <td class="py-3 px-4 text-gray-500">${formatDate(s.submitted_at)}</td>
            <td class="py-3 px-4">
                <span class="badge ${reviewed ? 'badge-active' : 'badge-inactive'}">${reviewed ? 'Revisada' : 'Pendiente'}</span>
            </td>
            <td class="py-3 px-4 text-gray-600 max-w-xs truncate" title="${escapeHtml(s.feedback || '')}">${s.feedback ? escapeHtml(s.feedback) : '—'}</td>
            <td class="py-3 px-4 text-right whitespace-nowrap">
                <button onclick="downloadSubmissionHandler(${s.id})" class="text-cenat-green hover:text-cenat-green-hover mr-3" title="Descargar entrega">
                    <i class="fas fa-download"></i>
                </button>
                <button onclick="showReviewForm(${s.id})" class="text-sm bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
                    <i class="fas fa-check mr-1"></i> ${reviewed ? 'Editar revisión' : 'Marcar revisada'}
                </button>
            </td>
        </tr>
        <tr id="review-form-row-${s.id}" class="hidden border-t border-gray-100">
            <td colspan="5" class="px-4 py-4 bg-green-50">
                <label class="block text-xs font-medium text-gray-700 mb-1">Comentario (opcional)</label>
                <textarea id="feedback-${s.id}" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">${escapeHtml(s.feedback || '')}</textarea>
                <div class="flex gap-2 mt-2">
                    <button onclick="submitReview(${s.id})" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">Guardar</button>
                    <button onclick="hideReviewForm(${s.id})" class="text-gray-600 px-4 py-2 text-sm">Cancelar</button>
                </div>
            </td>
        </tr>
    `;
}

function downloadSubmissionHandler(id) {
    submissionsAPI.download(id);
}

function showReviewForm(id) {
    document.getElementById(`review-form-row-${id}`).classList.remove('hidden');
}

function hideReviewForm(id) {
    document.getElementById(`review-form-row-${id}`).classList.add('hidden');
}

async function submitReview(id) {
    const feedback = document.getElementById(`feedback-${id}`).value.trim();

    try {
        await submissionsAPI.review(id, { feedback });
        showToast('Entrega marcada como revisada', 'success');
        renderTaskSubmissions({ id: currentTaskContentId });
    } catch (error) {
        showToast(error.message || 'Error al guardar la revisión', 'error');
    }
}

window.downloadSubmissionHandler = downloadSubmissionHandler;
window.showReviewForm = showReviewForm;
window.hideReviewForm = hideReviewForm;
window.submitReview = submitReview;
