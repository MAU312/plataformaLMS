import express from 'express';
import * as courseController from '../controllers/course.controller.js';
import { isAuthenticated, isAdmin, requireCourseManager } from '../middlewares/auth.middleware.js';
import { uploadThumbnail } from '../middlewares/upload.middleware.js';
import { verifyFileSignature } from '../middlewares/fileSignature.middleware.js';
import { enrollLimiter, courseCreateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

/**
 * GET /api/courses
 * Obtener todos los cursos
 */
router.get('/', courseController.getAllCourses);

/**
 * GET /api/courses/enrolled
 * Obtener cursos inscritos del usuario actual
 * Requiere autenticación
 */
router.get('/enrolled', isAuthenticated, courseController.getEnrolledCourses);

/**
 * GET /api/courses/teaching
 * Cursos donde el usuario actual está asignado como profesor
 * Requiere autenticación
 */
router.get('/teaching', isAuthenticated, courseController.getTeachingCourses);

/**
 * GET /api/courses/stats/summary
 * Estadísticas globales para el dashboard
 * Solo administradores
 */
router.get('/stats/summary', isAuthenticated, isAdmin, courseController.getGlobalStats);

/**
 * GET /api/courses/:id
 * Obtener curso por ID
 */
router.get('/:id', courseController.getCourseById);

/**
 * POST /api/courses
 * Crear nuevo curso
 * Solo administradores
 */
router.post(
  '/',
  isAuthenticated,
  isAdmin,
  courseCreateLimiter,
  uploadThumbnail.single('thumbnail'),
  verifyFileSignature('image'),
  courseController.createCourse
);

/**
 * PUT /api/courses/:id
 * Actualizar curso
 * Solo administradores
 */
router.put(
  '/:id',
  isAuthenticated,
  isAdmin,
  uploadThumbnail.single('thumbnail'),
  verifyFileSignature('image'),
  courseController.updateCourse
);

/**
 * DELETE /api/courses/:id
 * Eliminar curso
 * Solo administradores
 */
router.delete('/:id', isAuthenticated, isAdmin, courseController.deleteCourse);

/**
 * POST /api/courses/:id/enroll
 * Inscribirse en un curso
 * Requiere autenticación
 */
router.post('/:id/enroll', isAuthenticated, enrollLimiter, courseController.enrollCourse);

/**
 * DELETE /api/courses/:id/enroll
 * Desinscribirse de un curso
 * Requiere autenticación
 */
router.delete('/:id/enroll', isAuthenticated, enrollLimiter, courseController.unenrollCourse);

/**
 * GET /api/courses/:id/stats
 * Obtener estadísticas de un curso
 * Solo administradores
 */
router.get('/:id/stats', isAuthenticated, isAdmin, courseController.getCourseStats);

/**
 * GET /api/courses/:id/certificate
 * Descargar certificado de finalización (PDF)
 * Requiere autenticación y haber completado el curso al 100%
 */
router.get('/:id/certificate', isAuthenticated, courseController.getCertificate);

/**
 * GET /api/courses/:id/students
 * Estudiantes inscritos en el curso con su progreso
 * Admin, o el profesor asignado a ese curso
 */
router.get('/:id/students', isAuthenticated, requireCourseManager((req) => req.params.id), courseController.getCourseStudents);

/**
 * GET /api/courses/:id/teachers
 * Profesores asignados al curso
 * Admin, o el propio profesor asignado a ese curso
 */
router.get('/:id/teachers', isAuthenticated, requireCourseManager((req) => req.params.id), courseController.getCourseTeachers);

export default router;