import express from 'express';
import * as courseModuleController from '../controllers/courseModule.controller.js';
import CourseModule from '../models/CourseModule.js';
import { isAuthenticated, requireCourseManager } from '../middlewares/auth.middleware.js';
import { uploadThumbnail } from '../middlewares/upload.middleware.js';
import { verifyFileSignature } from '../middlewares/fileSignature.middleware.js';
import { courseCreateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

/**
 * Resuelve el course_id del curso PADRE a partir de un :moduleId de ruta —
 * para que requireCourseManager evalúe permisos contra el curso padre
 * (admin o profesor de TODO el curso padre), nunca contra el módulo en sí
 * (que no tiene profesores propios). Mismo patrón que
 * courseIdFromContentParam en content.routes.js.
 */
async function courseIdFromModuleParam(req) {
  const module = await CourseModule.findById(req.params.moduleId);
  return module ? module.course_id : null;
}

const moduleManager = [isAuthenticated, requireCourseManager(courseIdFromModuleParam)];

/**
 * PUT /api/course-modules/:moduleId
 */
router.put('/:moduleId', ...moduleManager, courseModuleController.updateModule);

/**
 * DELETE /api/course-modules/:moduleId
 * Bloqueado si el módulo todavía tiene cursos hijo adentro.
 */
router.delete('/:moduleId', ...moduleManager, courseModuleController.deleteModule);

/**
 * POST /api/course-modules/:moduleId/courses
 * Crea un curso hijo (portada/título/profesor propios) dentro del módulo.
 */
router.post(
  '/:moduleId/courses',
  ...moduleManager,
  courseCreateLimiter,
  uploadThumbnail.single('thumbnail'),
  verifyFileSignature('image'),
  courseModuleController.createModuleCourse
);

/**
 * DELETE /api/course-modules/:moduleId/courses/:childId
 * Desanida el curso hijo (no lo borra) — vuelve a ser un curso top-level
 * independiente.
 */
router.delete('/:moduleId/courses/:childId', ...moduleManager, courseModuleController.removeModuleCourse);

export default router;
