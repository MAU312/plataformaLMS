import express from 'express';
import * as forumController from '../controllers/forum.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * PUT /api/forum-posts/:id
 * Solo el propio autor puede editar el texto de su respuesta —
 * autorización fina resuelta dentro del controller (no es un simple
 * "admin o profesor de curso" como requireCourseManager).
 */
router.put('/:id', isAuthenticated, forumController.updatePost);

/**
 * DELETE /api/forum-posts/:id
 * El autor borra la suya; admin o el profesor del curso pueden borrar
 * cualquier respuesta (moderación). Autorización resuelta en el controller.
 */
router.delete('/:id', isAuthenticated, forumController.deletePost);

export default router;
