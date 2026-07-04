import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { loginLimiter, registerLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Registrar nuevo usuario
 */
router.post('/register', registerLimiter, authController.register);

/**
 * POST /api/auth/login
 * Iniciar sesión
 */
router.post('/login', loginLimiter, authController.login);

/**
 * POST /api/auth/logout
 * Cerrar sesión
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/me
 * Obtener usuario actual (requiere autenticación)
 */
router.get('/me', isAuthenticated, authController.getCurrentUser);

/**
 * GET /api/auth/check
 * Verificar si hay sesión activa
 */
router.get('/check', authController.checkAuth);

export default router;