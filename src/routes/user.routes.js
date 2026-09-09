import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware.js';
import { userCreateLimiter } from '../middlewares/rateLimit.middleware.js';
import { uploadAvatar, uploadCsv } from '../middlewares/upload.middleware.js';
import { verifyFileSignature } from '../middlewares/fileSignature.middleware.js';

const router = express.Router();

// Rutas específicas primero (antes de /:id) — cualquier usuario logueado
// sobre su PROPIA foto de perfil, sin requerir isAdmin.
router.put('/me/avatar', isAuthenticated, uploadAvatar.single('avatar'), verifyFileSignature('image'), userController.updateMyAvatar);
router.delete('/me/avatar', isAuthenticated, userController.removeMyAvatar);

router.post('/', isAuthenticated, isAdmin, userCreateLimiter, userController.createUser);
router.post('/bulk-import', isAuthenticated, isAdmin, userCreateLimiter, uploadCsv.single('csv'), userController.bulkImportUsers);
router.get('/', isAuthenticated, isAdmin, userController.getAllUsers);
router.get('/stats/count', isAuthenticated, isAdmin, userController.getUserStats);
/**
 * GET /api/users/by-role/:role
 * Admin siempre puede. Un profesor TAMBIÉN puede, pero solo pidiendo la
 * lista de profesores (role=teacher) — lo necesita para elegir "profesor
 * de módulo" al crear un curso hijo dentro de un módulo suyo (ver
 * views_content_manager.js#showAddModuleCourseForm), algo que antes de los
 * módulos con cursos anidados solo hacía el admin. Pedir cualquier otro rol
 * (student/admin) sigue siendo admin-only.
 */
router.get('/by-role/:role', isAuthenticated, (req, res, next) => {
  const isAdminUser = req.session.user.role === 'admin' || req.session.user.admin_access;
  const isTeacherListingTeachers = req.session.user.role === 'teacher' && req.params.role === 'teacher';
  if (isAdminUser || isTeacherListingTeachers) return next();
  return res.status(403).json({
    success: false,
    message: 'Acceso denegado. Se requieren permisos de administrador.'
  });
}, userController.getUsersByRole);
router.get('/:id', isAuthenticated, isAdmin, userController.getUserById);
router.put('/:id', isAuthenticated, isAdmin, userController.updateUser);
router.put('/:id/toggle-active', isAuthenticated, isAdmin, userController.toggleUserActive);
router.put('/:id/admin-access', isAuthenticated, isAdmin, userController.setUserAdminAccess);
router.delete('/:id', isAuthenticated, isAdmin, userController.deleteUser);

export default router;
