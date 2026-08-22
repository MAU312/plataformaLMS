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
        const { question_type, already_answered, questions } = questionsResponse.data;
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
                    <i class="fas fa-arrow-left mr-1"></i> Volver al curso
                </a>

                <h1 class="text-2xl font-bold text-gray-900 mb-1">
                    <i class="fas ${isQuiz ? 'fa-question-circle' : 'fa-poll'} text-cenat-green mr-2"></i> ${escapeHtml(content.title)}
                </h1>
                ${content.description ? `<p class="text-gray-500 mb-6 whitespace-pre-line">${escapeHtml(content.description)}</p>` : '<div class="mb-6"></div>'}

                <form id="quiz-take-form" class="space-y-4">
                    ${questions.map((q, index) => renderQuestionField(q, index, question_type)).join('')}
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                        <button type="submit" class="submit-quiz-answers-btn btn-cenat w-full">
                            <i class="fas fa-paper-plane mr-2"></i> Enviar ${isQuiz ? 'cuestionario' : 'encuesta'}
                        </button>
                        <p class="text-xs text-gray-400 text-center mt-2">Solo puedes responder una vez — revisa tus respuestas antes de enviar.</p>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('quiz-take-form').addEventListener('submit', (e) => {
            e.preventDefault();
            submitQuizAnswers(content, questions, question_type);
        });

    } catch (error) {
        console.error('Error loading quiz:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-exclamation-triangle text-5xl text-red-500 mb-4"></i>
                    <p class="text-xl text-gray-600">${escapeHtml(error.message || 'Error al cargar el cuestionario')}</p>
                    <a href="#/" class="btn-cenat mt-4 inline-block">Volver al inicio</a>
                </div>
            </div>
        `;
    }
};

function renderQuestionField(question, index, questionType) {
    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p class="font-medium text-gray-900 mb-3">${index + 1}. ${escapeHtml(question.question_text)}</p>
            ${questionType === 'short_answer' ? `
                <textarea class="answer-input w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green" data-question-id="${question.id}" rows="3" required placeholder="Escribe tu respuesta..."></textarea>
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

async function submitQuizAnswers(content, questions, questionType) {
    const submitBtn = document.querySelector('.submit-quiz-answers-btn');

    const answers = questions.map((q) => {
        if (questionType === 'short_answer') {
            const textarea = document.querySelector(`textarea[data-question-id="${q.id}"]`);
            return { question_id: q.id, answer_text: textarea.value.trim() };
        }
        const checked = document.querySelector(`input[name="question-${q.id}"]:checked`);
        return { question_id: q.id, option_id: checked ? Number(checked.value) : null };
    });

    const missingAnswer = answers.some((a) => (questionType === 'short_answer' ? !a.answer_text : !a.option_id));
    if (missingAnswer) {
        showToast('Debes responder todas las preguntas', 'error');
        return;
    }

    const isQuiz = content.type === 'quiz';

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Enviando...';

        const response = await contentsAPI.submitAnswers(content.id, { answers });

        if (isQuiz) {
            const { score, total_questions, pending_review } = response.data;
            const pendingNote = pending_review > 0 ? ` (${pending_review} pendiente${pending_review === 1 ? '' : 's'} de revisión)` : '';
            showToast(`Enviado — ${score}/${total_questions} correctas${pendingNote}`, 'success');
        } else {
            showToast('¡Gracias por responder la encuesta!', 'success');
        }

        navigateTo(`/course/${content.course_id}`);
    } catch (error) {
        showToast(error.message || 'Error al enviar las respuestas', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="fas fa-paper-plane mr-2"></i> Enviar ${isQuiz ? 'cuestionario' : 'encuesta'}`;
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
        const { type, question_type, total_respondents, questions } = resultsResponse.data;
        const isQuiz = type === 'quiz';

        app.innerHTML = `
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <a href="javascript:history.back()" class="text-cenat-green hover:underline text-sm mb-4 inline-block">
                    <i class="fas fa-arrow-left mr-1"></i> Volver
                </a>

                <h1 class="text-2xl font-bold text-gray-900 mb-1">
                    <i class="fas fa-chart-bar text-cenat-green mr-2"></i> Resultados
                </h1>
                <p class="text-gray-500 mb-6">${escapeHtml(content.title)} — ${total_respondents} ${total_respondents === 1 ? 'respuesta' : 'respuestas'}</p>

                ${questions.length > 0 ? `
                    <div class="space-y-4">
                        ${questions.map((q, index) => renderResultQuestion(q, index, isQuiz, question_type)).join('')}
                    </div>
                ` : `
                    <div class="empty-state bg-white rounded-xl border border-gray-100">
                        <i class="fas fa-inbox"></i>
                        <p class="text-xl text-gray-600 font-medium">Este ${isQuiz ? 'cuestionario' : 'esta encuesta'} todavía no tiene preguntas</p>
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
                    <p class="text-xl text-gray-600">${escapeHtml(error.message || 'Error al cargar los resultados')}</p>
                </div>
            </div>
        `;
    }
};

function renderResultQuestion(q, index, isQuiz, questionType) {
    if (questionType === 'short_answer') {
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p class="font-medium text-gray-900 mb-3">${index + 1}. ${escapeHtml(q.question_text)}</p>
                ${q.answers.length > 0 ? `
                    <div class="space-y-2">
                        ${q.answers.map((a) => renderShortAnswerRow(a, isQuiz)).join('')}
                    </div>
                ` : `<p class="text-sm text-gray-400">Nadie ha respondido esta pregunta todavía</p>`}
            </div>
        `;
    }

    if (isQuiz) {
        const total = q.correct_count + q.incorrect_count;
        const percent = total > 0 ? Math.round((q.correct_count / total) * 100) : 0;
        return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p class="font-medium text-gray-900 mb-2">${index + 1}. ${escapeHtml(q.question_text)}</p>
                <div class="progress-bar mb-1"><div class="progress-fill" style="width: ${percent}%"></div></div>
                <p class="text-xs text-gray-500">${q.correct_count} correctas, ${q.incorrect_count} incorrectas (${percent}%)</p>
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
    const statusLabel = a.is_correct == null ? 'Pendiente' : (a.is_correct == 1 ? 'Correcta' : 'Incorrecta');
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
                    <button onclick="gradeAnswerHandler(${a.answer_id}, true)" class="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg hover:bg-green-100">
                        <i class="fas fa-check mr-1"></i> Correcta
                    </button>
                    <button onclick="gradeAnswerHandler(${a.answer_id}, false)" class="text-xs bg-red-50 text-red-700 px-3 py-1 rounded-lg hover:bg-red-100">
                        <i class="fas fa-times mr-1"></i> Incorrecta
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

async function gradeAnswerHandler(answerId, isCorrect) {
    try {
        await contentsAPI.gradeAnswer(answerId, { is_correct: isCorrect });
        showToast('Respuesta calificada exitosamente', 'success');
        renderQuizResults({ id: currentQuizContentId });
    } catch (error) {
        showToast(error.message || 'Error al calificar la respuesta', 'error');
    }
}

window.gradeAnswerHandler = gradeAnswerHandler;
