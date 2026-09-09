import Content from '../models/Content.js';
import ContentQuestion from '../models/ContentQuestion.js';
import ContentAnswer from '../models/ContentAnswer.js';
import Course from '../models/Course.js';
import pool from '../config/db.js';
import { t } from '../utils/i18n.js';

const QUESTION_TYPES = ['short_answer', 'multiple_choice', 'true_false'];

/**
 * Igual que resolveFolderId en content.controller.js (no se comparte el
 * módulo a propósito, para no acoplar los dos controladores por un helper
 * de 8 líneas): folder_id vacío/null/undefined = "sin carpeta"; si viene,
 * debe existir, ser type='folder', y pertenecer al mismo curso.
 */
/**
 * Igual que parseWeightPercent en content.controller.js (no se comparte el
 * módulo a propósito, mismo criterio que resolveFolderId): vacío/undefined
 * = "no cuenta para la nota del curso" (null), no un error. Solo un quiz
 * puede tener peso — una encuesta nunca se califica, así que no tiene
 * sentido que cuente para la nota.
 */
function parseWeightPercent(input, locale) {
  if (input === undefined || input === null || input === '') {
    return { ok: true, value: null };
  }
  const value = Number(input);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return { ok: false, message: t(locale, 'errors.weight_percent_invalid') };
  }
  return { ok: true, value };
}

async function resolveFolderId(folderIdInput, courseId) {
  if (folderIdInput === undefined || folderIdInput === null || folderIdInput === '') {
    return { ok: true, folderId: null };
  }
  const folder = await Content.findById(folderIdInput);
  if (!folder || folder.type !== 'folder' || String(folder.course_id) !== String(courseId)) {
    return { ok: false };
  }
  return { ok: true, folderId: folder.id };
}

/**
 * Valida el array de preguntas/opciones — compartido entre crear
 * (createQuestionContent) y reemplazar (updateQuestions) un set de
 * preguntas. El tipo se elige por pregunta (se pueden mezclar
 * multiple_choice/true_false/short_answer en el mismo cuestionario), misma
 * regla para cada una:
 * - quiz: exactamente una opción correcta por pregunta (multiple_choice/
 *   true_false). short_answer no lleva opciones, la revisa el profesor.
 * - survey: nunca hay respuesta correcta (is_correct del cliente se ignora
 *   al insertar, ver insertQuestions).
 */
function validateQuestions(questions, isQuiz, locale) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { ok: false, message: t(locale, 'errors.at_least_one_question') };
  }

  for (const q of questions) {
    if (!QUESTION_TYPES.includes(q.question_type)) {
      return { ok: false, message: t(locale, 'errors.invalid_question_type') };
    }
    if (!q.text || !String(q.text).trim()) {
      return { ok: false, message: t(locale, 'errors.question_text_required') };
    }
    if (q.points !== undefined && (!Number.isInteger(q.points) || q.points < 1)) {
      return { ok: false, message: t(locale, 'errors.question_points_invalid') };
    }

    const needsOptions = q.question_type === 'multiple_choice' || q.question_type === 'true_false';
    if (needsOptions) {
      const options = Array.isArray(q.options) ? q.options : [];
      if (options.length < 2) {
        return { ok: false, message: t(locale, 'errors.min_two_options') };
      }
      if (q.question_type === 'true_false' && options.length !== 2) {
        return { ok: false, message: t(locale, 'errors.true_false_two_options') };
      }
      if (!options.every((o) => o.text && String(o.text).trim())) {
        return { ok: false, message: t(locale, 'errors.option_text_required') };
      }
      if (isQuiz && options.filter((o) => o.is_correct).length !== 1) {
        return { ok: false, message: t(locale, 'errors.exactly_one_correct_option') };
      }
    }
  }

  return { ok: true };
}

/**
 * Inserta las preguntas (y opciones) de un quiz/survey ya validado, dentro
 * de la connection de una transacción — compartido entre crear y
 * reemplazar un set de preguntas. Cada pregunta lleva su propio
 * question_type.
 */
async function insertQuestions(contentId, questions, isQuiz, connection) {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const needsOptions = q.question_type === 'multiple_choice' || q.question_type === 'true_false';
    const questionId = await ContentQuestion.create(contentId, String(q.text).trim(), i, q.points || 1, q.question_type, connection);
    if (needsOptions) {
      const options = q.options.map((o, idx) => ({
        text: String(o.text).trim(),
        // Una encuesta nunca guarda respuesta correcta, sin importar lo
        // que mande el cliente.
        is_correct: isQuiz ? !!o.is_correct : false,
        order_index: idx
      }));
      await ContentQuestion.createOptions(questionId, options, connection);
    }
  }
}

/**
 * Crea un content tipo 'quiz' o 'survey' con sus preguntas (y opciones,
 * cuando aplica). Ver validateQuestions/insertQuestions para las reglas
 * compartidas con updateQuestions.
 */
async function createQuestionContent(req, res, type) {
  const isQuiz = type === 'quiz';
  const label = isQuiz ? 'el cuestionario' : 'la encuesta';

  try {
    const { course_id, title, description, folder_id, questions, weight_percent } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.course_id_title_required') });
    }

    const validation = validateQuestions(questions, isQuiz, req.locale);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const weightCheck = parseWeightPercent(isQuiz ? weight_percent : undefined, req.locale);
    if (!weightCheck.ok) {
      return res.status(400).json({ success: false, message: weightCheck.message });
    }

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.folder_not_in_course') });
    }

    // El content y todas sus preguntas/opciones se crean en una sola
    // transacción: sin esto, un fallo a mitad del loop (ej. pregunta 3 de
    // 5) dejaba un quiz/encuesta a medio construir, ya visible para los
    // estudiantes, mientras el profesor recibía un error de creación
    // fallida sin ninguna pista de que quedó una fila a medias.
    const connection = await pool.getConnection();
    let contentId;
    try {
      await connection.beginTransaction();

      contentId = await Content.create({
        course_id,
        type,
        title,
        description,
        url: null,
        folder_id: folderCheck.folderId,
        weight_percent: weightCheck.value
      }, connection);

      await insertQuestions(contentId, questions, isQuiz, connection);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({
      success: true,
      message: isQuiz ? t(req.locale, 'success.quiz_created') : t(req.locale, 'success.survey_created'),
      data: { id: contentId }
    });
  } catch (error) {
    console.error(`Error al crear ${label}:`, error);
    res.status(500).json({ success: false, message: isQuiz ? t(req.locale, 'errors.add_quiz_failed') : t(req.locale, 'errors.add_survey_failed') });
  }
}

export const createQuizContent = (req, res) => createQuestionContent(req, res, 'quiz');
export const createSurveyContent = (req, res) => createQuestionContent(req, res, 'survey');

/**
 * Preguntas de un quiz/survey para que el profesor/admin las edite —
 * siempre con is_correct (a diferencia de getQuestions, pensado para el
 * estudiante que todavía no respondió) y con `respondent_count`, que el
 * frontend usa para decidir si ofrece el editor completo o el aviso de
 * "hay que borrar y crear de nuevo" (ver updateQuestions).
 */
export const getQuestionsForManage = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findById(id);

    if (!content) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.content_not_found') });
    }
    if (!['quiz', 'survey'].includes(content.type)) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.not_quiz_or_survey') });
    }

    const [questions, respondentCount] = await Promise.all([
      ContentQuestion.findByContent(id, { includeCorrect: true }),
      ContentAnswer.countRespondents(id)
    ]);

    res.json({
      success: true,
      data: { weight_percent: content.weight_percent, questions, respondent_count: respondentCount }
    });
  } catch (error) {
    console.error('Error al obtener las preguntas para editar:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.get_questions_failed') });
  }
};

/**
 * Reemplaza título/descripción/tipo de pregunta y TODAS las preguntas de un
 * quiz/survey — solo mientras nadie respondió todavía (ContentQuestion
 * tiene ON DELETE CASCADE hacia content_question_options y
 * content_answers, así que borrar las preguntas viejas se llevaría
 * respuestas reales si las hubiera). Con respondentCount > 0 el frontend
 * ni siquiera ofrece este formulario, pero se revalida acá también — un
 * PUT directo no debe poder saltarse la regla.
 */
export const updateQuestions = async (req, res) => {
  const { id } = req.params;
  const content = await Content.findById(id);

  try {
    if (!content) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.content_not_found') });
    }
    if (!['quiz', 'survey'].includes(content.type)) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.not_quiz_or_survey') });
    }

    const { title, description, questions, weight_percent } = req.body;
    const isQuiz = content.type === 'quiz';

    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.title_required') });
    }

    const validation = validateQuestions(questions, isQuiz, req.locale);
    if (!validation.ok) {
      return res.status(400).json({ success: false, message: validation.message });
    }

    const weightCheck = parseWeightPercent(isQuiz ? weight_percent : undefined, req.locale);
    if (!weightCheck.ok) {
      return res.status(400).json({ success: false, message: weightCheck.message });
    }

    const respondentCount = await ContentAnswer.countRespondents(id);
    if (respondentCount > 0) {
      return res.status(400).json({
        success: false,
        message: t(req.locale, 'errors.cannot_edit_questions_has_answers')
      });
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await Content.update(id, {
        title: String(title).trim(),
        description: description !== undefined ? description : content.description,
        weight_percent: weightCheck.value
      }, connection);

      await ContentQuestion.deleteByContent(id, connection);
      await insertQuestions(id, questions, isQuiz, connection);

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.json({
      success: true,
      message: isQuiz ? t(req.locale, 'success.quiz_updated') : t(req.locale, 'success.survey_updated')
    });
  } catch (error) {
    console.error('Error al actualizar las preguntas:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.update_questions_failed') });
  }
};

/**
 * Preguntas de un cuestionario/encuesta para que el estudiante responda —
 * sin `is_correct` en las opciones si todavía no respondió. Si ya
 * respondió, devuelve también sus respuestas (ahí sí con `is_correct`,
 * porque ya no hay nada que proteger).
 */
export const getQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findById(id);

    if (!content) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.content_not_found') });
    }
    if (!['quiz', 'survey'].includes(content.type)) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.not_quiz_or_survey') });
    }

    const canAccess = await Course.canAccessMedia(content.course_id, req.session?.user);
    if (!canAccess) {
      return res.status(403).json({ success: false, message: t(req.locale, 'errors.quiz_view_access_required') });
    }

    const userId = req.session.user.id;
    const alreadyAnswered = await ContentAnswer.hasAnswered(id, userId);

    if (alreadyAnswered) {
      const [questions, myAnswers] = await Promise.all([
        ContentQuestion.findByContent(id, { includeCorrect: true }),
        ContentAnswer.findByContentAndUser(id, userId)
      ]);
      return res.json({
        success: true,
        data: { already_answered: true, questions, my_answers: myAnswers }
      });
    }

    const questions = await ContentQuestion.findByContent(id, { includeCorrect: false });
    res.json({
      success: true,
      data: { already_answered: false, questions }
    });
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.get_questions_failed') });
  }
};

/**
 * Envía todas las respuestas de un intento a la vez. `req.quizContent` lo
 * deja puesto el middleware inline de la ruta (ver content.routes.js,
 * mismo patrón que req.taskContent en /:id/submit): ya validó que el
 * content existe, es quiz/survey, y el usuario está inscrito.
 */
export const submitAnswers = async (req, res) => {
  try {
    const content = req.quizContent;
    const userId = req.session.user.id;
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.answers_required') });
    }

    const alreadyAnswered = await ContentAnswer.hasAnswered(content.id, userId);
    if (alreadyAnswered) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.single_submission_only') });
    }

    const questions = await ContentQuestion.findByContent(content.id, { includeCorrect: true });
    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.no_questions_in_content') });
    }

    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const answersByQuestion = new Map(answers.map((a) => [a.question_id, a]));
    const answersAllQuestions = questions.every((q) => answersByQuestion.has(q.id));
    if (!answersAllQuestions || answers.length !== questions.length) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.all_questions_required') });
    }

    const isQuiz = content.type === 'quiz';

    let rows;
    try {
      rows = questions.map((question) => {
        const answer = answersByQuestion.get(question.id);
        const needsOptions = question.question_type === 'multiple_choice' || question.question_type === 'true_false';

        if (needsOptions) {
          const option = question.options.find((o) => o.id === answer.option_id);
          if (!option) {
            throw Object.assign(new Error(t(req.locale, 'errors.option_not_in_question')), { status: 400 });
          }
          return {
            question_id: question.id,
            option_id: option.id,
            answer_text: null,
            is_correct: isQuiz ? !!option.is_correct : null
          };
        }

        // short_answer: en un quiz queda pendiente de revisión manual
        // (is_correct null hasta que el profesor la califique); en una
        // encuesta nunca se califica.
        return {
          question_id: question.id,
          option_id: null,
          answer_text: answer.answer_text ? String(answer.answer_text).trim() : '',
          is_correct: null
        };
      });
    } catch (validationError) {
      if (validationError.status === 400) {
        return res.status(400).json({ success: false, message: validationError.message });
      }
      throw validationError;
    }

    const inserted = await ContentAnswer.submitAnswers(content.id, userId, rows);
    if (inserted === null) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.single_submission_only') });
    }

    await Content.markCompleted(content.id, userId);
    const { progress, total, completed } = await Content.recalculateCourseProgress(content.course_id, userId);

    const data = { progress, total, completed };
    if (isQuiz) {
      // El puntaje pondera por los puntos de cada pregunta (ver
      // ContentQuestion.points), no por cantidad de preguntas correctas —
      // una pregunta más difícil marcada con más puntos pesa más en el
      // resultado final.
      const pointsByQuestion = new Map(questions.map((q) => [q.id, q.points || 1]));
      data.score = rows
        .filter((r) => r.is_correct === true)
        .reduce((sum, r) => sum + (pointsByQuestion.get(r.question_id) || 1), 0);
      data.max_score = questions.reduce((sum, q) => sum + (q.points || 1), 0);
      data.total_questions = rows.length;
      data.pending_review = rows.filter((r) => r.is_correct === null).length;
      data.results = rows.map((r) => ({
        question_id: r.question_id,
        is_correct: r.is_correct,
        points: pointsByQuestion.get(r.question_id) || 1
      }));
    }

    res.status(201).json({
      success: true,
      message: isQuiz ? t(req.locale, 'success.quiz_submitted') : t(req.locale, 'success.survey_thanks'),
      data
    });
  } catch (error) {
    console.error('Error al enviar respuestas:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.submit_answers_failed') });
  }
};

/**
 * Resultados para el profesor/admin. Un quiz muestra correctas/incorrectas
 * por pregunta (y respuestas cortas pendientes de calificar); una encuesta
 * muestra conteos agregados por opción (y respuestas abiertas, sin
 * calificar — una encuesta no tiene "correcto").
 */
export const getResults = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findById(id);

    if (!content) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.content_not_found') });
    }
    if (!['quiz', 'survey'].includes(content.type)) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.not_quiz_or_survey') });
    }

    const [questions, answers] = await Promise.all([
      ContentQuestion.findByContent(id, { includeCorrect: true }),
      ContentAnswer.findAllByContent(id)
    ]);

    const totalRespondents = new Set(answers.map((a) => a.user_id)).size;
    const isQuiz = content.type === 'quiz';

    const questionResults = questions.map((q) => {
      const questionAnswers = answers.filter((a) => a.question_id === q.id);

      if (q.question_type === 'short_answer') {
        return {
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          answers: questionAnswers.map((a) => ({
            answer_id: a.id,
            student_name: a.student_name,
            student_email: a.student_email,
            answer_text: a.answer_text,
            is_correct: isQuiz ? a.is_correct : undefined,
            submitted_at: a.submitted_at
          }))
        };
      }

      if (isQuiz) {
        const correctCount = questionAnswers.filter((a) => a.is_correct == 1).length;
        return {
          question_id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          correct_count: correctCount,
          incorrect_count: questionAnswers.length - correctCount
        };
      }

      // Encuesta de opción múltiple/verdadero-falso: conteo + porcentaje
      // por opción.
      const options = q.options.map((o) => {
        const count = questionAnswers.filter((a) => a.option_id === o.id).length;
        const percent = questionAnswers.length > 0 ? Math.round((count / questionAnswers.length) * 100) : 0;
        return { option_id: o.id, option_text: o.option_text, count, percent };
      });
      return { question_id: q.id, question_text: q.question_text, question_type: q.question_type, options };
    });

    res.json({
      success: true,
      data: {
        type: content.type,
        total_respondents: totalRespondents,
        questions: questionResults
      }
    });
  } catch (error) {
    console.error('Error al obtener resultados:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.get_results_failed') });
  }
};

/**
 * Calificación manual de una respuesta de tipo short_answer (multiple_choice
 * / true_false ya se autocalificaron al enviar). Solo tiene sentido para
 * quiz — una encuesta nunca se califica, pero no hace falta bloquearlo acá:
 * el frontend simplemente no ofrece el botón de calificar en encuestas.
 */
export const gradeAnswer = async (req, res) => {
  try {
    const { answerId } = req.params;
    const { is_correct } = req.body;

    if (typeof is_correct !== 'boolean') {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.is_correct_boolean_required') });
    }

    const updated = await ContentAnswer.gradeAnswer(answerId, is_correct);
    if (!updated) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.answer_not_found') });
    }

    res.json({ success: true, message: t(req.locale, 'success.answer_graded') });
  } catch (error) {
    console.error('Error al calificar respuesta:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.grade_answer_failed') });
  }
};
