import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middlewares/rateLimit.middleware.js';

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

/**
 * POST /api/auth/forgot-password
 * Solicitar enlace de recuperación de contraseña
 */
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);

/**
 * POST /api/auth/reset-password
 * Restablecer contraseña con el token recibido por correo
 */
router.post('/reset-password', forgotPasswordLimiter, authController.resetPassword);

export default router;