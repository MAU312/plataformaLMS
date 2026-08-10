import express from 'express';
import * as contentController from '../controllers/content.controller.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware.js';
import { uploadVideo, uploadFile } from '../middlewares/upload.middleware.js';
import { verifyFileSignature } from '../middlewares/fileSignature.middleware.js';

const router = express.Router();

// ==============================================
// RUTAS ESPECÍFICAS PRIMERO (antes de /:id)
// ==============================================

/**
 * GET /api/contents/course/:courseId
 */
router.get('/course/:courseId', contentController.getContentsByCourse);

/**
 * PUT /api/contents/course/:courseId/reorder
 */
router.put(
  '/course/:courseId/reorder',
  isAuthenticated,
  isAdmin,
  contentController.reorderContents
);

/**
 * POST /api/contents/video
 */
router.post(
  '/video',
  isAuthenticated,
  isAdmin,
  uploadVideo.single('video'),
  verifyFileSignature('video'),
  contentController.createVideoContent
);

/**
 * POST /api/contents/file
 */
router.post(
  '/file',
  isAuthenticated,
  isAdmin,
  uploadFile.single('file'),
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
 */
router.put(
  '/:id',
  isAuthenticated,
  isAdmin,
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
 */
router.delete('/:id', isAuthenticated, isAdmin, contentController.deleteContent);

export default router;