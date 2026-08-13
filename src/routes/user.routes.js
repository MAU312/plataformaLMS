import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware.js';
import { userCreateLimiter } from '../middlewares/rateLimit.middleware.js';

const router = express.Router();

router.post('/', isAuthenticated, isAdmin, userCreateLimiter, userController.createUser);
router.get('/', isAuthenticated, isAdmin, userController.getAllUsers);
router.get('/stats/count', isAuthenticated, isAdmin, userController.getUserStats);
router.get('/by-role/:role', isAuthenticated, isAdmin, userController.getUsersByRole);
router.get('/:id', isAuthenticated, isAdmin, userController.getUserById);
router.put('/:id', isAuthenticated, isAdmin, userController.updateUser);
router.put('/:id/toggle-active', isAuthenticated, isAdmin, userController.toggleUserActive);
router.delete('/:id', isAuthenticated, isAdmin, userController.deleteUser);

export default router;
