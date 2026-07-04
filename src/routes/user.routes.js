import express from 'express';
import User from '../models/User.js';
import { isAuthenticated, isAdmin } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * GET /api/users
 */
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
  }
});

/**
 * GET /api/users/:id
 */
router.get('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuario' });
  }
});

/**
 * PUT /api/users/:id
 */
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    await User.update(req.params.id, { name, email, role });
    res.json({ success: true, message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
  }
});

/**
 * PUT /api/users/:id/toggle-active
 * Activar o desactivar un usuario
 */
router.put('/:id/toggle-active', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // No permitir que el admin se desactive a sí mismo
    if (req.session.user.id === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'No puedes desactivarte a ti mismo'
      });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const newState = !user.is_active;
    await User.toggleActive(id, newState);

    res.json({
      success: true,
      message: newState ? 'Usuario activado' : 'Usuario desactivado',
      data: { is_active: newState }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al cambiar estado del usuario' });
  }
});

/**
 * DELETE /api/users/:id
 */
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    if (req.session.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta' });
    }
    await User.delete(req.params.id);
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
  }
});

/**
 * GET /api/users/stats/count
 */
router.get('/stats/count', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const stats = await User.countByRole();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
});

export default router;