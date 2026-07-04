import express from 'express';
import * as courseController from '../controllers/course.controller.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware.js';
import { uploadThumbnail } from '../middlewares/upload.middleware.js';

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
  uploadThumbnail.single('thumbnail'),
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
router.post('/:id/enroll', isAuthenticated, courseController.enrollCourse);

/**
 * DELETE /api/courses/:id/enroll
 * Desinscribirse de un curso
 * Requiere autenticación
 */
router.delete('/:id/enroll', isAuthenticated, courseController.unenrollCourse);

/**
 * PUT /api/courses/:id/progress
 * Actualizar progreso en un curso
 * Requiere autenticación
 */
router.put('/:id/progress', isAuthenticated, courseController.updateProgress);

/**
 * GET /api/courses/:id/stats
 * Obtener estadísticas de un curso
 * Solo administradores
 */
router.get('/:id/stats', isAuthenticated, isAdmin, courseController.getCourseStats);

export default router;