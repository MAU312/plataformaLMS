import express from 'express';
import * as settingsController from '../controllers/settings.controller.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware.js';
import { uploadSiteImage } from '../middlewares/upload.middleware.js';
import { verifyFileSignature } from '../middlewares/fileSignature.middleware.js';

const router = express.Router();

// Público a propósito: la página de login (sin sesión) y el catálogo como
// invitado necesitan el texto/imágenes personalizadas antes de que exista
// ninguna autenticación.
router.get('/', settingsController.getSettings);

router.put(
  '/',
  isAuthenticated,
  isAdmin,
  uploadSiteImage.fields([{ name: 'login_bg_image', maxCount: 1 }, { name: 'courses_bg_image', maxCount: 1 }]),
  verifyFileSignature('image'),
  settingsController.updateSettings
);

export default router;
