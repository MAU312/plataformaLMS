/**
 * Views - Responder un cuestionario/encuesta (estudiante) y ver sus
 * resultados (profesor/admin). Cuestionario y encuesta comparten estas dos
 * pantallas — la única diferencia es si se muestra puntaje/calificación
 * (cuestionario) o solo conteos agregados (encuesta, sin respuesta
 * correcta).
 */

let currentQuizContentId = null;

window.renderTakeQuiz = async function(params) {
    const app = document.getElementById('app');
    showLoading();

    try {
        const [contentResponse, questionsResponse] = await Promise.all([
            contentsAPI.getById(params.id),
            contentsAPI.getQuestions(params.id)
        ]);
        const content = contentResponse.data;
        const { already_answered, questions } = questionsResponse.data;
        const isQuiz = content.type === 'quiz';

        // Un solo intento: si ya respondió, no tiene sentido mostrar el
        // formulario de nuevo — de vuelta al curso, donde ya se ve su
        // estado/puntaje (ver renderQuizCard en views_course_detail.js).
        if (already_answered) {
            navigateTo(`/course/${content.course_id}`);
            return;
        }

        app.innerHTML = `
            <div class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="#/course/${content.course_id}" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> ${t('quiz.back_to_course')}
                </a>

                <h1 class="text-2xl font-bold text-gray-900 mb-1">
                    <i class="fas ${isQuiz ? 'fa-question-circle' : 'fa-poll'} text-cenat-green mr-2"></i> ${escapeHtml(content.title)}
                </h1>
                ${content.description ? `<p class="text-gray-500 mb-6 whitespace-pre-line">${escapeHtml(content.description)}</p>` : '<div class="mb-6"></div>'}

                <form id="quiz-take-form" class="space-y-4">
                    ${questions.map((q, index) => renderQuestionField(q, index, isQuiz)).join('')}
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <button type="submit" class="submit-quiz-answers-btn btn-cenat w-full">
                            <i class="fas fa-paper-plane mr-2"></i> ${isQuiz ? t('quiz.submit_quiz') : t('quiz.submit_survey')}
                        </button>
                        <p class="text-xs text-gray-400 text-center mt-2">${t('quiz.submit_once_notice')}</p>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('quiz-take-form').addEventListener('submit', (e) => {
            e.preventDefault();
            submitQuizAnswers(content, questions);
        });

    } catch (error) {
        console.error('Error loading quiz:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">${escapeHtml(error.message || t('quiz.load_failed'))}</p>
                    <a href="#/" class="btn-cenat mt-4 inline-block">${t('quiz.back_to_home')}</a>
                </div>
            </div>
        `;
    }
};

function renderQuestionField(question, index, isQuiz) {
    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p class="font-medium text-gray-900 mb-3">${index + 1}. ${escapeHtml(question.question_text)} ${isQuiz ? `<span class="text-xs font-normal text-gray-400">(${t(question.points === 1 ? 'quiz.point_singular' : 'quiz.point_plural', { count: question.points })})</span>` : ''}</p>
            ${question.question_type === 'short_answer' ? `
                <textarea class="answer-input w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" data-question-id="${question.id}" rows="3" required placeholder="${escapeAttr(t('quiz.answer_placeholder'))}"></textarea>
            ` : `
                <div class="space-y-2">
                    ${question.options.map(opt => `
                        <label class="flex items-center gap-2 p-2 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input type="radio" name="question-${question.id}" class="answer-input" value="${opt.id}" required>
                            <span class="text-sm text-gray-700">${escapeHtml(opt.option_text)}</span>
                        </label>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

async function submitQuizAnswers(content, questions) {
    const submitBtn = document.querySelector('.submit-quiz-answers-btn');

    const answers = questions.map((q) => {
        if (q.question_type === 'short_answer') {
            const textarea = document.querySelector(`textarea[data-question-id="${q.id}"]`);
            return { question_id: q.id, answer_text: textarea.value.trim() };
        }
        const checked = document.querySelector(`input[name="question-${q.id}"]:checked`);
        return { question_id: q.id, option_id: checked ? Number(checked.value) : null };
    });

    const answersByQuestionId = new Map(questions.map((q) => [q.id, q]));
    const missingAnswer = answers.some((a) => (answersByQuestionId.get(a.question_id).question_type === 'short_answer' ? !a.answer_text : !a.option_id));
    if (missingAnswer) {
        showToast(t('quiz.all_questions_required'), 'error');
        return;
    }

    const isQuiz = content.type === 'quiz';

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> ${t('quiz.sending')}`;

        const response = await contentsAPI.submitAnswers(content.id, { answers });

        if (isQuiz) {
            const { score, max_score, pending_review } = response.data;
            const pendingNote = pending_review > 0 ? t(pending_review === 1 ? 'quiz.pending_review_singular' : 'quiz.pending_review_plural', { count: pending_review }) : '';
            showToast(`${t('quiz.submitted_score', { score, max: max_score })}${pendingNote}`, 'success');
        } else {
            showToast(t('quiz.survey_thanks'), 'success');
        }

        navigateTo(`/course/${content.course_id}`);
    } catch (error) {
        showToast(error.message || t('quiz.submit_failed'), 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-paper-plane mr-2"></i> ${isQuiz ? t('quiz.submit_quiz') : t('quiz.submit_survey')}`;
    }
}

window.renderQuizResults = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentQuizContentId = params.id;

    try {
        const [contentResponse, resultsResponse] = await Promise.all([
            contentsAPI.getById(params.id),
            contentsAPI.getResults(params.id)
        ]);
        const content = contentResponse.data;
        const { type, total_respondents, questions } = resultsResponse.data;
        const isQuiz = type === 'quiz';

        app.innerHTML = `
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="javascript:history.back()" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> ${t('quiz.results_back')}
                </a>

                <h1 class="text-2xl font-bold text-gray-900 mb-1">
                    <i class="fas fa-chart-bar text-cenat-green mr-2"></i> ${t('quiz.results_title')}
                </h1>
                <p class="text-gray-500 mb-6">${escapeHtml(content.title)} — ${t(total_respondents === 1 ? 'quiz.respondents_singular' : 'quiz.respondents_plural', { count: total_respondents })}</p>

                ${questions.length > 0 ? `
                    <div class="space-y-4">
                        ${questions.map((q, index) => renderResultQuestion(q, index, isQuiz)).join('')}
                    </div>
                ` : `
                    <div class="empty-state bg-white rounded-xl border border-gray-100">
                        <i class="fas fa-inbox"></i>
                        <p class="text-xl text-gray-600 font-medium">${isQuiz ? t('quiz.no_questions_quiz') : t('quiz.no_questions_survey')}</p>
                    </div>
                `}
            </div>
        `;

    } catch (error) {
        console.error('Error loading results:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">${escapeHtml(error.message || t('quiz.results_load_failed'))}</p>
                </div>
            </div>
        `;
    }
};

function renderResultQuestion(q, index, isQuiz) {
    if (q.question_type === 'short_answer') {
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p class="font-medium text-gray-900 mb-3">${index + 1}. ${escapeHtml(q.question_text)} ${isQuiz ? `<span class="text-xs font-normal text-gray-400">(${t(q.points === 1 ? 'quiz.point_singular' : 'quiz.point_plural', { count: q.points })})</span>` : ''}</p>
                ${q.answers.length > 0 ? `
                    <div class="space-y-2">
                        ${q.answers.map((a) => renderShortAnswerRow(a, isQuiz)).join('')}
                    </div>
                ` : `<p class="text-sm text-gray-400">${t('quiz.no_answers_yet')}</p>`}
            </div>
        `;
    }

    if (isQuiz) {
        const total = q.correct_count + q.incorrect_count;
        const percent = total > 0 ? Math.round((q.correct_count / total) * 100) : 0;
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p class="font-medium text-gray-900 mb-2">${index + 1}. ${escapeHtml(q.question_text)} <span class="text-xs font-normal text-gray-400">(${t(q.points === 1 ? 'quiz.point_singular' : 'quiz.point_plural', { count: q.points })})</span></p>
                <div class="progress-bar mb-1"><div class="progress-fill" style="width: ${percent}%"></div></div>
                <p class="text-xs text-gray-500">${t('quiz.correct_incorrect_percent', { correct: q.correct_count, incorrect: q.incorrect_count, percent })}</p>
            </div>
        `;
    }

    // Encuesta de opción múltiple/verdadero-falso: no hay "correcta", solo
    // conteo + porcentaje por opción.
    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p class="font-medium text-gray-900 mb-3">${index + 1}. ${escapeHtml(q.question_text)}</p>
            <div class="space-y-2">
                ${q.options.map((opt) => `
                    <div>
                        <div class="flex justify-between text-sm text-gray-600 mb-1">
                            <span>${escapeHtml(opt.option_text)}</span>
                            <span>${opt.count} (${opt.percent}%)</span>
                        </div>
                        <div class="progress-bar"><div class="progress-fill" style="width: ${opt.percent}%"></div></div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderShortAnswerRow(a, isQuiz) {
    const statusLabel = a.is_correct == null ? t('quiz.status_pending') : (a.is_correct == 1 ? t('quiz.status_correct') : t('quiz.status_incorrect'));
    const statusClass = a.is_correct == null ? 'text-gray-400' : (a.is_correct == 1 ? 'text-green-600' : 'text-red-600');
    return `
        <div class="border border-gray-100 rounded-lg p-3">
            <div class="flex items-center justify-between gap-2 flex-wrap">
                <p class="text-sm font-medium text-gray-700">${escapeHtml(a.student_name)}</p>
                ${isQuiz ? `<span class="text-xs font-semibold ${statusClass}">${statusLabel}</span>` : ''}
            </div>
            <p class="text-sm text-gray-600 mt-1 whitespace-pre-line">${escapeHtml(a.answer_text || '')}</p>
            ${isQuiz && a.is_correct == null ? `
                <div class="flex gap-2 mt-2">
                    <button onclick="gradeAnswerHandler(${a.answer_id}, true, this)" class="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg hover:bg-green-100">
                        <i class="fas fa-check mr-1"></i> ${t('quiz.status_correct')}
                    </button>
                    <button onclick="gradeAnswerHandler(${a.answer_id}, false, this)" class="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-lg hover:bg-red-100">
                        <i class="fas fa-times mr-1"></i> ${t('quiz.status_incorrect')}
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

async function gradeAnswerHandler(answerId, isCorrect, btn) {
    // Deshabilita ambos botones (Correcta/Incorrecta) de esta fila mientras
    // se espera la respuesta — sin esto, un doble clic rápido podía
    // disparar dos calificaciones para la misma respuesta.
    const buttons = btn?.parentElement ? btn.parentElement.querySelectorAll('button') : [];
    buttons.forEach(b => { b.disabled = true; });

    try {
        await contentsAPI.gradeAnswer(answerId, { is_correct: isCorrect });
        showToast(t('quiz.grade_success'), 'success');
        renderQuizResults({ id: currentQuizContentId });
    } catch (error) {
        showToast(error.message || t('quiz.grade_failed'), 'error');
        buttons.forEach(b => { b.disabled = false; });
    }
}

window.gradeAnswerHandler = gradeAnswerHandler;
