/**
 * Views - Entregas de una tarea (admin/profesor revisa lo que entregaron
 * los estudiantes). Autorización fina resuelta por el backend
 * (requireCourseManager): si el usuario no es admin ni profesor
 * asignado al curso de esta tarea, la API responde 403 y se muestra un
 * error en vez de la tabla.
 */

const SUBMISSIONS_PER_PAGE = 20;
let currentTaskContentId = null;
let currentSubmissions = [];
let currentSubmissionsPage = 1;
// El % del curso que vale ESTA tarea (o null si no tiene) — aplica a
// todas las entregas de esta pantalla por igual, ver renderSubmissionRow.
let currentTaskWeightPercent = null;

window.renderTaskSubmissions = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentTaskContentId = params.id;

    try {
        const response = await contentsAPI.getSubmissions(params.id, { page: 1, limit: SUBMISSIONS_PER_PAGE });
        const { content, submissions } = response.data;
        currentSubmissions = submissions;
        currentSubmissionsPage = 1;
        currentTaskWeightPercent = content.weight_percent;
        const pagination = response.pagination || { total: submissions.length, totalPages: 1 };

        app.innerHTML = `
            <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="javascript:history.back()" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> ${t('quiz.results_back')}
                </a>

                <h1 class="text-2xl font-bold text-gray-900 mb-1">
                    <i class="fas fa-inbox text-cenat-green mr-2"></i> ${t('taskSubmissions.heading')}
                </h1>
                <p class="text-gray-500 mb-6">${escapeHtml(content.title)}</p>

                <div id="submissions-table-container" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"></div>
                <div id="submissions-pagination" class="mt-4"></div>
            </div>
        `;
        renderSubmissionsTable();
        renderSubmissionsPaginationControls(pagination);

    } catch (error) {
        console.error('Error loading submissions:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">${escapeHtml(error.message || t('taskSubmissions.load_failed'))}</p>
                </div>
            </div>
        `;
    }
};

function renderSubmissionsPaginationControls(pagination) {
    const container = document.getElementById('submissions-pagination');
    if (!container) return;
    container.innerHTML = currentSubmissions.length > 0
        ? renderPagination(currentSubmissionsPage, pagination.totalPages, pagination.total, SUBMISSIONS_PER_PAGE, 'goToSubmissionsPage')
        : '';
}

window.goToSubmissionsPage = async function(page) {
    try {
        const response = await contentsAPI.getSubmissions(currentTaskContentId, { page, limit: SUBMISSIONS_PER_PAGE });
        currentSubmissions = response.data.submissions;
        currentSubmissionsPage = page;
        const pagination = response.pagination || { total: currentSubmissions.length, totalPages: 1 };
        renderSubmissionsTable();
        renderSubmissionsPaginationControls(pagination);
    } catch (error) {
        showToast(error.message || t('taskSubmissions.load_failed'), 'error');
    }
};

function renderSubmissionsTable() {
    const container = document.getElementById('submissions-table-container');
    if (!container) return;

    container.innerHTML = currentSubmissions.length > 0 ? `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead class="bg-gray-50">
                    <tr class="text-left text-gray-500">
                        <th class="py-3 px-4">${t('taskSubmissions.col_student')}</th>
                        <th class="py-3 px-4">${t('taskSubmissions.col_submitted')}</th>
                        <th class="py-3 px-4">${t('taskSubmissions.col_status')}</th>
                        ${currentTaskWeightPercent ? `<th class="py-3 px-4">${t('studentsTable.col_grade')}</th>` : ''}
                        <th class="py-3 px-4">${t('taskSubmissions.col_comment')}</th>
                        <th class="py-3 px-4 text-right">${t('taskSubmissions.col_actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${currentSubmissions.map(s => renderSubmissionRow(s)).join('')}
                </tbody>
            </table>
        </div>
    ` : `
        <div class="empty-state">
            <i class="fas fa-inbox"></i>
            <p class="text-xl text-gray-600 font-medium">${t('taskSubmissions.empty')}</p>
        </div>
    `;
}

function renderSubmissionRow(s) {
    const reviewed = !!s.reviewed_at;
    const hasScore = s.score_earned !== null && s.score_earned !== undefined;
    return `
        <tr class="border-t border-gray-100">
            <td class="py-3 px-4 font-medium text-gray-900">
                ${escapeHtml(s.student_name)}<br>
                <span class="text-xs text-gray-400 font-normal">${escapeHtml(s.student_email)}</span>
            </td>
            <td class="py-3 px-4 text-gray-500">${formatDateTime(s.submitted_at)}</td>
            <td class="py-3 px-4">
                <span class="badge ${reviewed ? 'badge-active' : 'badge-inactive'}">${reviewed ? t('taskSubmissions.status_reviewed') : t('quiz.status_pending')}</span>
            </td>
            ${currentTaskWeightPercent ? `
                <td class="py-3 px-4 text-gray-600">${hasScore ? `${s.score_earned}/${currentTaskWeightPercent}` : '—'}</td>
            ` : ''}
            <td class="py-3 px-4 text-gray-600 max-w-xs whitespace-normal break-words">${s.feedback ? escapeHtml(s.feedback) : '—'}</td>
            <td class="py-3 px-4 text-right whitespace-nowrap">
                <button onclick="downloadSubmissionHandler(${s.id})" class="text-cenat-green hover:text-cenat-green-hover mr-3" title="${escapeAttr(t('taskSubmissions.download_submission_title'))}">
                    <i class="fas fa-download"></i>
                </button>
                <button onclick="showReviewForm(${s.id})" class="text-sm bg-green-50 text-cenat-green px-3 py-1.5 rounded-lg hover:bg-green-100 transition">
                    <i class="fas fa-check mr-1"></i> ${reviewed ? t('taskSubmissions.edit_review') : t('taskSubmissions.mark_reviewed')}
                </button>
            </td>
        </tr>
        <tr id="review-form-row-${s.id}" class="hidden border-t border-gray-100">
            <td colspan="${currentTaskWeightPercent ? 6 : 5}" class="px-4 py-4 bg-green-50">
                ${currentTaskWeightPercent ? `
                    <label class="block text-xs font-medium text-gray-700 mb-1">${t('taskSubmissions.grade_label', { max: currentTaskWeightPercent })}</label>
                    <input type="number" id="score-${s.id}" min="0" max="${currentTaskWeightPercent}" step="0.01"
                        class="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green mb-2"
                        placeholder="${escapeAttr(t('taskSubmissions.grade_placeholder'))}" value="${hasScore ? s.score_earned : ''}">
                ` : ''}
                <label class="block text-xs font-medium text-gray-700 mb-1">${t('taskSubmissions.comment_optional')}</label>
                <textarea id="feedback-${s.id}" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">${escapeHtml(s.feedback || '')}</textarea>
                <div class="flex gap-2 mt-2">
                    <button onclick="submitReview(${s.id})" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">${t('forum.save')}</button>
                    <button onclick="hideReviewForm(${s.id})" class="text-gray-600 px-4 py-2 text-sm">${t('forum.cancel')}</button>
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
    const scoreInput = document.getElementById(`score-${id}`);
    const scoreValue = scoreInput ? scoreInput.value.trim() : '';

    const payload = { feedback };
    if (scoreValue !== '') payload.score_earned = Number(scoreValue);

    try {
        await submissionsAPI.review(id, payload);
        showToast(t('taskSubmissions.review_saved'), 'success');

        // Parchea el estado local en vez de volver a pedir la lista
        // completa de entregas al servidor — el endpoint de revisión no
        // devuelve la fila actualizada, pero acá ya sabemos qué cambió
        // (el feedback/calificación recién guardados, y que reviewed_at
        // pasa a "ahora").
        const submission = currentSubmissions.find(s => s.id === id);
        if (submission) {
            submission.feedback = feedback;
            submission.reviewed_at = new Date().toISOString();
            if (scoreValue !== '') submission.score_earned = Number(scoreValue);
        }
        renderSubmissionsTable();
    } catch (error) {
        showToast(error.message || t('taskSubmissions.save_review_failed'), 'error');
    }
}

window.downloadSubmissionHandler = downloadSubmissionHandler;
window.showReviewForm = showReviewForm;
window.hideReviewForm = hideReviewForm;
window.submitReview = submitReview;
