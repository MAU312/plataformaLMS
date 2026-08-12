import express from 'express';
import * as contentController from '../controllers/content.controller.js';
import Content from '../models/Content.js';
import { isAuthenticated, requireCourseManager } from '../middlewares/auth.middleware.js';
import { uploadVideo, uploadFile } from '../middlewares/upload.middleware.js';
import { verifyFileSignature } from '../middlewares/fileSignature.middleware.js';

const router = express.Router();

/**
 * Resuelve el course_id de un contenido existente a partir de su :id de
 * ruta — para las rutas PUT/DELETE /:id, que no traen course_id directo.
 */
async function courseIdFromContentParam(req) {
  const content = await Content.findById(req.params.id);
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
        const contentId = req.params.id;
        const content = await import('../models/Content.js').then(m => m.default.findById(contentId));

        if (!content) return next();

        req.contentType = content.type;

        if (content.type === 'video') {
          return uploadVideo.single('video')(req, res, next);
        } else {
          return uploadFile.single('file')(req, res, next);
        }
      } catch (error) {
        next(error);
      }
    };
    handleUpload(req, res, next);
  },
  (req, res, next) => verifyFileSignature(req.contentType === 'video' ? 'video' : 'file')(req, res, next),
  contentController.updateContent
);

/**
 * DELETE /api/contents/:id
 * Admin, o el profesor asignado al curso dueño de este contenido
 */
router.delete('/:id', isAuthenticated, requireCourseManager(courseIdFromContentParam), contentController.deleteContent);

export default router;