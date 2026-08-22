import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { deleteFile } from '../middlewares/upload.middleware.js';

const VALID_ROLES = ['admin', 'student', 'teacher'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Misma regla que en el registro público (auth.controller.js): 3-50
// caracteres, letras/números/punto/guion/guion bajo, nada de espacios ni '@'.
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;

/**
 * POST /api/users
 * Crea un usuario directo desde el panel de admin, con el rol que se
 * indique (a diferencia del registro público, que siempre crea 'student').
 * Evita que un admin tenga que cerrar su sesión para registrar profesores
 * o estudiantes.
 */
export const createUser = async (req, res) => {
  try {
    const { name, email, username, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Nombre, email, contraseña y rol son requeridos' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'El email no tiene un formato válido' });
    }

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Rol inválido' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    let normalizedUsername = null;
    if (username && String(username).trim()) {
      normalizedUsername = String(username).trim();
      if (!USERNAME_REGEX.test(normalizedUsername)) {
        return res.status(400).json({
          success: false,
          message: 'El nombre de usuario debe tener 3-50 caracteres: letras, números, puntos, guiones o guiones bajos'
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const userId = await User.create({
        name: String(name).trim(),
        username: normalizedUsername,
        email: normalizedEmail,
        password: hashedPassword,
        role
      });
      res.status(201).json({ success: true, message: 'Usuario creado exitosamente', data: { id: userId } });
    } catch (dbError) {
      if (dbError.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ success: false, message: 'El email o nombre de usuario ya está en uso' });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ success: false, message: 'Error al crear usuario' });
  }
};

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
 * GET /api/users/by-role/:role
 * Lista simple de usuarios activos con un rol dado (ej. para poblar el
 * selector de profesores al crear/editar un curso).
 */
export const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Rol inválido' });
    }

    const users = await User.findByRole(role);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
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

/**
 * PUT /api/users/me/avatar
 * Cualquier usuario logueado sube/reemplaza SU PROPIA foto de perfil (no
 * hay endpoint para que un admin le suba una foto a otro usuario). El
 * archivo anterior se borra recién después de confirmar el UPDATE en BD
 * — mismo motivo que en Content.updateContent: si se borrara antes y el
 * UPDATE fallara, la BD quedaría apuntando a un archivo que ya no existe.
 */
export const updateMyAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'La imagen es requerida' });
    }

    const userId = req.session.user.id;
    const previousAvatarUrl = req.session.user.avatar_url;
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const updated = await User.updateAvatar(userId, avatarUrl);

    if (!updated) {
      deleteFile(avatarUrl);
      return res.status(400).json({ success: false, message: 'No se pudo actualizar la foto de perfil' });
    }

    if (previousAvatarUrl) {
      deleteFile(previousAvatarUrl);
    }

    req.session.user.avatar_url = avatarUrl;

    res.json({ success: true, message: 'Foto de perfil actualizada exitosamente', data: { avatar_url: avatarUrl } });
  } catch (error) {
    console.error('Error al actualizar la foto de perfil:', error);
    if (req.file) {
      deleteFile(`/uploads/avatars/${req.file.filename}`);
    }
    res.status(500).json({ success: false, message: 'Error al actualizar la foto de perfil' });
  }
};

/**
 * DELETE /api/users/me/avatar
 * Quita la foto de perfil propia (vuelve al círculo con la inicial).
 */
export const removeMyAvatar = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const previousAvatarUrl = req.session.user.avatar_url;

    if (!previousAvatarUrl) {
      return res.status(400).json({ success: false, message: 'No tenés una foto de perfil para quitar' });
    }

    await User.updateAvatar(userId, null);
    deleteFile(previousAvatarUrl);
    req.session.user.avatar_url = null;

    res.json({ success: true, message: 'Foto de perfil eliminada exitosamente' });
  } catch (error) {
    console.error('Error al quitar la foto de perfil:', error);
    res.status(500).json({ success: false, message: 'Error al quitar la foto de perfil' });
  }
};
