import express from 'express';
import * as contentController from '../controllers/content.controller.js';
import * as submissionController from '../controllers/submission.controller.js';
import * as forumController from '../controllers/forum.controller.js';
import * as quizController from '../controllers/quiz.controller.js';
import Content from '../models/Content.js';
import Course from '../models/Course.js';
import ContentQuestion from '../models/ContentQuestion.js';
import ContentAnswer from '../models/ContentAnswer.js';
import { isAuthenticated, requireCourseManager } from '../middlewares/auth.middleware.js';
import { uploadVideo, uploadFile, uploadSubmission, uploadContentImage } from '../middlewares/upload.middleware.js';
import { verifyFileSignature } from '../middlewares/fileSignature.middleware.js';
import { submitTaskLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

/**
 * Resuelve el course_id de un contenido existente a partir de su :id de
 * ruta — para las rutas PUT/DELETE /:id, que no traen course_id directo.
 */
async function courseIdFromContentParam(req) {
  const content = await Content.findById(req.params.id);
  return content ? content.course_id : null;
}

/**
 * Igual que courseIdFromContentParam, pero resolviendo desde el :answerId
 * de PUT /answers/:answerId/grade (answer -> question -> content -> curso).
 */
async function courseIdFromAnswerParam(req) {
  const answer = await ContentAnswer.findById(req.params.answerId);
  if (!answer) return null;
  const question = await ContentQuestion.findById(answer.question_id);
  if (!question) return null;
  const content = await Content.findById(question.content_id);
  return content ? content.course_id : null;
}

// ==============================================
// RUTAS ESPECÍFICAS PRIMERO (antes de /:id)
// ==============================================

/**
 * GET /api/contents/course/:courseId
 */
router.get('/course/:courseId', contentController.getContentsByCourse);

/**
 * PUT /api/contents/course/:courseId/reorder
 * Admin, o el profesor asignado a ese curso
 */
router.put(
  '/course/:courseId/reorder',
  isAuthenticated,
  requireCourseManager((req) => req.params.courseId),
  contentController.reorderContents
);

/**
 * POST /api/contents/video
 * Admin, o el profesor asignado al curso del body.
 * multer va primero: course_id es un campo del multipart/form-data, no
 * existe en req.body hasta que se parsea. requireCourseManager limpia el
 * archivo del disco si termina rechazando la petición.
 */
router.post(
  '/video',
  isAuthenticated,
  uploadVideo.single('video'),
  requireCourseManager((req) => req.body.course_id),
  verifyFileSignature('video'),
  contentController.createVideoContent
);

/**
 * POST /api/contents/file
 * Admin, o el profesor asignado al curso del body (ver nota de orden en
 * POST /video).
 */
router.post(
  '/file',
  isAuthenticated,
  uploadFile.single('file'),
  requireCourseManager((req) => req.body.course_id),
  verifyFileSignature('file'),
  contentController.createFileContent
);

/**
 * POST /api/contents/image
 * Admin, o el profesor asignado al curso del body (ver nota de orden en
 * POST /video).
 */
router.post(
  '/image',
  isAuthenticated,
  uploadContentImage.single('image'),
  requireCourseManager((req) => req.body.course_id),
  verifyFileSignature('image'),
  contentController.createImageContent
);

/**
 * POST /api/contents/text
 * Admin, o el profesor asignado al curso del body. Sin archivo (JSON
 * puro), así que aquí sí req.body.course_id ya está disponible antes de
 * requireCourseManager sin necesitar multer.
 */
router.post(
  '/text',
  isAuthenticated,
  requireCourseManager((req) => req.body.course_id),
  contentController.createTextContent
);

/**
 * POST /api/contents/url
 * Admin, o el profesor asignado al curso del body. Igual que /text, sin
 * archivo.
 */
router.post(
  '/url',
  isAuthenticated,
  requireCourseManager((req) => req.body.course_id),
  contentController.createUrlContent
);

/**
 * POST /api/contents/quiz
 * Admin, o el profesor asignado al curso del body. Sin archivo (JSON puro
 * con las preguntas/opciones), igual que /text.
 */
router.post(
  '/quiz',
  isAuthenticated,
  requireCourseManager((req) => req.body.course_id),
  quizController.createQuizContent
);

/**
 * POST /api/contents/survey
 * Admin, o el profesor asignado al curso del body. Comparte controlador y
 * validación con /quiz (ver quiz.controller.js) — solo cambia el tipo.
 */
router.post(
  '/survey',
  isAuthenticated,
  requireCourseManager((req) => req.body.course_id),
  quizController.createSurveyContent
);

/**
 * PUT /api/contents/answers/:answerId/grade
 * Calificación manual de una respuesta corta (multiple_choice/true_false
 * ya se autocalifican al enviar). Admin, o el profesor asignado al curso
 * dueño de la pregunta.
 */
router.put(
  '/answers/:answerId/grade',
  isAuthenticated,
  requireCourseManager(courseIdFromAnswerParam),
  quizController.gradeAnswer
);

/**
 * POST /api/contents/task
 * Admin, o el profesor asignado al curso del body. El archivo de
 * instrucciones es opcional (a diferencia de /video y /file), pero sigue
 * yendo por multer primero por la misma razón: course_id es un campo del
 * multipart/form-data.
 */
router.post(
  '/task',
  isAuthenticated,
  uploadFile.single('file'),
  requireCourseManager((req) => req.body.course_id),
  (req, res, next) => {
    if (!req.file) return next();
    verifyFileSignature('file')(req, res, next);
  },
  contentController.createTaskContent
);

/**
 * POST /api/contents/forum
 * Crea el tema (post principal) de un foro. Admin, o el profesor asignado
 * al curso del body. Igual que /text: sin archivo.
 */
router.post(
  '/forum',
  isAuthenticated,
  requireCourseManager((req) => req.body.course_id),
  contentController.createForumContent
);

/**
 * POST /api/contents/folder
 * Crea una carpeta para agrupar otro contenido del curso. Admin, o el
 * profesor asignado al curso del body. Sin archivo.
 */
router.post(
  '/folder',
  isAuthenticated,
  requireCourseManager((req) => req.body.course_id),
  contentController.createFolderContent
);

// ==============================================
// RUTAS CON PARÁMETRO /:id Y SUBRUTAS
// ==============================================

/**
 * POST /api/contents/:id/complete
 * Marcar contenido como completado
 */
router.post('/:id/complete', isAuthenticated, contentController.markContentCompleted);

/**
 * DELETE /api/contents/:id/complete
 * Desmarcar contenido como completado
 */
router.delete('/:id/complete', isAuthenticated, contentController.markContentIncomplete);

/**
 * GET /api/contents/:id/download
 */
router.get('/:id/download', isAuthenticated, contentController.downloadFile);

/**
 * POST /api/contents/:id/submit
 * Entregar una tarea. Antes de multer se valida que la tarea exista, que
 * sea type='task', y que el usuario esté inscrito — así no se escribe el
 * archivo en disco si algo de eso falla (a diferencia de POST
 * /video|/file|/task, aquí SÍ se puede resolver todo desde req.params.id,
 * sin depender del body, por eso el orden es al revés que ahí).
 */
router.post(
  '/:id/submit',
  isAuthenticated,
  async (req, res, next) => {
    try {
      const content = await Content.findById(req.params.id);
      if (!content) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      if (content.type !== 'task') {
        return res.status(400).json({ success: false, message: 'Este contenido no es una tarea' });
      }
      const enrolled = await Course.isUserEnrolled(content.course_id, req.session.user.id);
      if (!enrolled) {
        return res.status(403).json({
          success: false,
          message: 'Debes estar inscrito en este curso para entregar esta tarea'
        });
      }
      req.taskContent = content;
      next();
    } catch (error) {
      next(error);
    }
  },
  submitTaskLimiter,
  uploadSubmission.single('file'),
  verifyFileSignature('file'),
  submissionController.submitTask
);

/**
 * GET /api/contents/:id/submission
 * La propia entrega del usuario autenticado para esta tarea.
 */
router.get('/:id/submission', isAuthenticated, submissionController.getMySubmission);

/**
 * GET /api/contents/:id/submissions
 * Todas las entregas de la tarea. Admin, o el profesor asignado al curso.
 */
router.get(
  '/:id/submissions',
  isAuthenticated,
  requireCourseManager(courseIdFromContentParam),
  submissionController.listSubmissions
);

/**
 * GET /api/contents/:id/questions
 * Preguntas de un cuestionario/encuesta para responder (o, si ya
 * respondió, sus propias respuestas). El control de acceso fino
 * (inscrito/profesor/admin) se hace dentro del controlador, igual que
 * GET /:id/download.
 */
router.get('/:id/questions', isAuthenticated, quizController.getQuestions);

/**
 * POST /api/contents/:id/answers
 * Envía todas las respuestas de un cuestionario/encuesta de una vez. Mismo
 * patrón de pre-check inline que /:id/submit: valida que el content
 * exista, sea quiz/survey, y que el usuario esté inscrito, antes de tocar
 * la base de datos.
 */
router.post(
  '/:id/answers',
  isAuthenticated,
  async (req, res, next) => {
    try {
      const content = await Content.findById(req.params.id);
      if (!content) {
        return res.status(404).json({ success: false, message: 'Contenido no encontrado' });
      }
      if (!['quiz', 'survey'].includes(content.type)) {
        return res.status(400).json({ success: false, message: 'Este contenido no es un cuestionario ni una encuesta' });
      }
      const enrolled = await Course.isUserEnrolled(content.course_id, req.session.user.id);
      if (!enrolled) {
        return res.status(403).json({
          success: false,
          message: 'Debes estar inscrito en este curso para responder'
        });
      }
      req.quizContent = content;
      next();
    } catch (error) {
      next(error);
    }
  },
  quizController.submitAnswers
);

/**
 * GET /api/contents/:id/results
 * Resultados de un cuestionario/encuesta. Admin, o el profesor asignado
 * al curso.
 */
router.get(
  '/:id/results',
  isAuthenticated,
  requireCourseManager(courseIdFromContentParam),
  quizController.getResults
);

/**
 * GET /api/contents/:id/forum
 * Tema + respuestas de un foro. Admin, inscrito, o profesor asignado.
 */
router.get('/:id/forum', isAuthenticated, forumController.listPosts);

/**
 * POST /api/contents/:id/forum
 * Publica una respuesta en el foro. Mismo acceso que ver el hilo — a
 * diferencia de crear el TEMA (POST /forum, solo admin/profesor), acá
 * cualquier admin/inscrito/profesor puede responder.
 */
router.post('/:id/forum', isAuthenticated, forumController.createPost);

/**
 * GET /api/contents/:id
 */
router.get('/:id', contentController.getContentById);

/**
 * PUT /api/contents/:id
 * Admin, o el profesor asignado al curso dueño de este contenido
 */
router.put(
  '/:id',
  isAuthenticated,
  requireCourseManager(courseIdFromContentParam),
  (req, res, next) => {
    const handleUpload = async (req, res, next) => {
      try {
        const content = await Content.findById(req.params.id);

        if (!content) return next();

        req.contentType = content.type;

        // Texto, URL, el post principal de un foro, y una carpeta no
        // llevan archivo — no tiene sentido pasarlos por
        // multer/verifyFileSignature (que esperan un req.file). Una
        // carpeta solo se actualiza para cambiarle el título o moverla
        // (folder_id no aplica a una carpeta, ver updateContent).
        if (['text', 'url', 'forum', 'folder', 'quiz', 'survey'].includes(content.type)) {
          return next();
        }

        if (content.type === 'video') {
          return uploadVideo.single('video')(req, res, next);
        } else if (content.type === 'image') {
          return uploadContentImage.single('image')(req, res, next);
        } else {
          return uploadFile.single('file')(req, res, next);
        }
      } catch (error) {
        next(error);
      }
    };
    handleUpload(req, res, next);
  },
  (req, res, next) => {
    if (['text', 'url', 'forum', 'folder', 'quiz', 'survey'].includes(req.contentType)) return next();
    const signatureKind = req.contentType === 'video' ? 'video' : req.contentType === 'image' ? 'image' : 'file';
    verifyFileSignature(signatureKind)(req, res, next);
  },
  contentController.updateContent
);

/**
 * DELETE /api/contents/:id
 * Admin, o el profesor asignado al curso dueño de este contenido
 */
router.delete('/:id', isAuthenticated, requireCourseManager(courseIdFromContentParam), contentController.deleteContent);

export default router;