import express from 'express';
import * as submissionController from '../controllers/submission.controller.js';
import TaskSubmission from '../models/TaskSubmission.js';
import Content from '../models/Content.js';
import { isAuthenticated, requireCourseManager } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * Resuelve el course_id de una entrega a partir de su :id de ruta
 * (entrega -> contenido -> curso), para requireCourseManager en la ruta
 * de revisión.
 */
async function courseIdFromSubmissionParam(req) {
  const submission = await TaskSubmission.findById(req.params.id);
  if (!submission) return null;
  const content = await Content.findById(submission.content_id);
  return content ? content.course_id : null;
}

/**
 * GET /api/submissions/:id/download
 * Autorización fina (admin, profesor del curso, o el propio dueño de la
 * entrega) resuelta dentro del controller — no es un simple "admin o
 * profesor de curso" como requireCourseManager, así que no se usa acá.
 */
router.get('/:id/download', isAuthenticated, submissionController.downloadSubmission);

/**
 * PUT /api/submissions/:id/review
 * Admin, o el profesor asignado al curso de esa tarea.
 */
router.put(
  '/:id/review',
  isAuthenticated,
  requireCourseManager(courseIdFromSubmissionParam),
  submissionController.reviewSubmission
);

export default router;
