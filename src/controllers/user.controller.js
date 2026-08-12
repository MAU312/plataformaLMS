import User from '../models/User.js';

const VALID_ROLES = ['admin', 'student', 'teacher'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * GET /api/users
 */
export const getAllUsers = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const search = String(req.query.search || '').trim();

    const { rows, total } = await User.findAll({ page, limit, search });

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
  }
};

/**
 * GET /api/users/:id
 */
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuario' });
  }
};

/**
 * PUT /api/users/:id
 */
export const updateUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({ success: false, message: 'Nombre, email y rol son requeridos' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'El email no tiene un formato válido' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Rol inválido' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    // Evita que un admin se quite su propio rol por accidente (por ejemplo
    // desde el selector de rol en la tabla de usuarios) y quede bloqueado
    // del panel sin que nadie más pueda revertirlo desde la interfaz.
    if (req.session.user.id === parseInt(req.params.id) && role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'No puedes cambiar tu propio rol de administrador'
      });
    }

    try {
      await User.update(req.params.id, { name: String(name).trim(), email: normalizedEmail, role });
    } catch (dbError) {
      if (dbError.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'El email ya está en uso por otro usuario' });
      }
      throw dbError;
    }

    res.json({ success: true, message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
  }
};

/**
 * PUT /api/users/:id/toggle-active
 * Activar o desactivar un usuario
 */
export const toggleUserActive = async (req, res) => {
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
};

/**
 * DELETE /api/users/:id
 */
export const deleteUser = async (req, res) => {
  try {
    if (req.session.user.id === parseInt(req.params.id)) {
      return res.status(400).json({ success: false, message: 'No puedes eliminar tu propia cuenta' });
    }
    await User.delete(req.params.id);
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
  }
};

/**
 * GET /api/users/stats/count
 */
export const getUserStats = async (req, res) => {
  try {
    const stats = await User.countByRole();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
  }
};
