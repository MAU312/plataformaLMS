import Content from '../models/Content.js';
import ContentQuestion from '../models/ContentQuestion.js';
import ContentAnswer from '../models/ContentAnswer.js';
import Course from '../models/Course.js';

const QUESTION_TYPES = ['short_answer', 'multiple_choice', 'true_false'];

/**
 * Igual que resolveFolderId en content.controller.js (no se comparte el
 * módulo a propósito, para no acoplar los dos controladores por un helper
 * de 8 líneas): folder_id vacío/null/undefined = "sin carpeta"; si viene,
 * debe existir, ser type='folder', y pertenecer al mismo curso.
 */
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
 * Crea un content tipo 'quiz' o 'survey' con sus preguntas (y opciones,
 * cuando aplica). Ambos comparten el 100% de la validación y el esquema —
 * la única diferencia real es si se exige/guarda `is_correct`:
 * - quiz: exactamente una opción correcta por pregunta (multiple_choice/
 *   true_false). short_answer no lleva opciones, la revisa el profesor.
 * - survey: nunca hay respuesta correcta, is_correct siempre se guarda en 0
 *   sin importar lo que mande el cliente.
 */
async function createQuestionContent(req, res, type) {
  const isQuiz = type === 'quiz';
  const label = isQuiz ? 'el cuestionario' : 'la encuesta';

  try {
    const { course_id, title, description, folder_id, question_type, questions } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({ success: false, message: 'El ID del curso y el título son requeridos' });
    }

    if (!QUESTION_TYPES.includes(question_type)) {
      return res.status(400).json({ success: false, message: 'El tipo de pregunta no es válido' });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Se requiere al menos una pregunta' });
    }

    const needsOptions = question_type === 'multiple_choice' || question_type === 'true_false';

    for (const q of questions) {
      if (!q.text || !String(q.text).trim()) {
        return res.status(400).json({ success: false, message: 'Cada pregunta necesita un texto' });
      }
      if (needsOptions) {
        const options = Array.isArray(q.options) ? q.options : [];
        if (options.length < 2) {
          return res.status(400).json({ success: false, message: 'Cada pregunta necesita al menos 2 opciones' });
        }
        if (question_type === 'true_false' && options.length !== 2) {
          return res.status(400).json({ success: false, message: 'Verdadero/falso necesita exactamente 2 opciones' });
        }
        if (!options.every((o) => o.text && String(o.text).trim())) {
          return res.status(400).json({ success: false, message: 'Cada opción necesita un texto' });
        }
        if (isQuiz && options.filter((o) => o.is_correct).length !== 1) {
          return res.status(400).json({ success: false, message: 'Cada pregunta debe tener exactamente una opción correcta' });
        }
      }
    }

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
    }

    const contentId = await Content.create({
      course_id,
      type,
      title,
      description,
      url: null,
      folder_id: folderCheck.folderId,
      question_type
    });

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionId = await ContentQuestion.create(contentId, String(q.text).trim(), i);
      if (needsOptions) {
        const options = q.options.map((o, idx) => ({
          text: String(o.text).trim(),
          // Una encuesta nunca guarda respuesta correcta, sin importar lo
          // que mande el cliente.
          is_correct: isQuiz ? !!o.is_correct : false,
          order_index: idx
        }));
        await ContentQuestion.createOptions(questionId, options);
      }
    }

    res.status(201).json({
      success: true,
      message: isQuiz ? 'Cuestionario agregado exitosamente' : 'Encuesta agregada exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error(`Error al crear ${label}:`, error);
    res.status(500).json({ success: false, message: `Error al agregar ${label}` });
  }
}

export const createQuizContent = (req, res) => createQuestionContent(req, res, 'quiz');
export const createSurveyContent = (req, res) => createQuestionContent(req, res, 'survey');

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
      return res.status(404).json({ success: false, message: 'Contenido no encontrado' });
    }
    if (!['quiz', 'survey'].includes(content.type)) {
      return res.status(400).json({ success: false, message: 'Este contenido no es un cuestionario ni una encuesta' });
    }

    const canAccess = await Course.canAccessMedia(content.course_id, req.session?.user);
    if (!canAccess) {
      return res.status(403).json({ success: false, message: 'Debes estar inscrito en este curso para verlo' });
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
        data: { question_type: content.question_type, already_answered: true, questions, my_answers: myAnswers }
      });
    }

    const questions = await ContentQuestion.findByContent(id, { includeCorrect: false });
    res.json({
      success: true,
      data: { question_type: content.question_type, already_answered: false, questions }
    });
  } catch (error) {
    console.error('Error al obtener preguntas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener las preguntas' });
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
      return res.status(400).json({ success: false, message: 'Se requieren las respuestas' });
    }

    const alreadyAnswered = await ContentAnswer.hasAnswered(content.id, userId);
    if (alreadyAnswered) {
      return res.status(400).json({ success: false, message: 'Solo se permite una entrega.' });
    }

    const questions = await ContentQuestion.findByContent(content.id, { includeCorrect: true });
    if (questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Este contenido no tiene preguntas' });
    }

    const questionsById = new Map(questions.map((q) => [q.id, q]));
    const answersByQuestion = new Map(answers.map((a) => [a.question_id, a]));
    const answersAllQuestions = questions.every((q) => answersByQuestion.has(q.id));
    if (!answersAllQuestions || answers.length !== questions.length) {
      return res.status(400).json({ success: false, message: 'Debes responder todas las preguntas' });
    }

    const isQuiz = content.type === 'quiz';
    const needsOptions = content.question_type === 'multiple_choice' || content.question_type === 'true_false';

    let rows;
    try {
      rows = questions.map((question) => {
        const answer = answersByQuestion.get(question.id);

        if (needsOptions) {
          const option = question.options.find((o) => o.id === answer.option_id);
          if (!option) {
            throw Object.assign(new Error('Una de las opciones no pertenece a esta pregunta'), { status: 400 });
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
      return res.status(400).json({ success: false, message: 'Solo se permite una entrega.' });
    }

    await Content.markCompleted(content.id, userId);
    const { progress, total, completed } = await Content.recalculateCourseProgress(content.course_id, userId);

    const data = { progress, total, completed };
    if (isQuiz) {
      data.score = rows.filter((r) => r.is_correct === true).length;
      data.total_questions = rows.length;
      data.pending_review = rows.filter((r) => r.is_correct === null).length;
      data.results = rows.map((r) => ({ question_id: r.question_id, is_correct: r.is_correct }));
    }

    res.status(201).json({
      success: true,
      message: isQuiz ? 'Cuestionario enviado exitosamente' : '¡Gracias por responder la encuesta!',
      data
    });
  } catch (error) {
    console.error('Error al enviar respuestas:', error);
    res.status(500).json({ success: false, message: 'Error al enviar las respuestas' });
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
      return res.status(404).json({ success: false, message: 'Contenido no encontrado' });
    }
    if (!['quiz', 'survey'].includes(content.type)) {
      return res.status(400).json({ success: false, message: 'Este contenido no es un cuestionario ni una encuesta' });
    }

    const [questions, answers] = await Promise.all([
      ContentQuestion.findByContent(id, { includeCorrect: true }),
      ContentAnswer.findAllByContent(id)
    ]);

    const totalRespondents = new Set(answers.map((a) => a.user_id)).size;
    const isQuiz = content.type === 'quiz';

    const questionResults = questions.map((q) => {
      const questionAnswers = answers.filter((a) => a.question_id === q.id);

      if (content.question_type === 'short_answer') {
        return {
          question_id: q.id,
          question_text: q.question_text,
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
      return { question_id: q.id, question_text: q.question_text, options };
    });

    res.json({
      success: true,
      data: {
        type: content.type,
        question_type: content.question_type,
        total_respondents: totalRespondents,
        questions: questionResults
      }
    });
  } catch (error) {
    console.error('Error al obtener resultados:', error);
    res.status(500).json({ success: false, message: 'Error al obtener los resultados' });
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
      return res.status(400).json({ success: false, message: 'is_correct debe ser true o false' });
    }

    const updated = await ContentAnswer.gradeAnswer(answerId, is_correct);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Respuesta no encontrada' });
    }

    res.json({ success: true, message: 'Respuesta calificada exitosamente' });
  } catch (error) {
    console.error('Error al calificar respuesta:', error);
    res.status(500).json({ success: false, message: 'Error al calificar la respuesta' });
  }
};
