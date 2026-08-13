import fs from 'fs/promises';
import Course from '../models/Course.js';
import User from '../models/User.js';

/**
 * Middleware de autenticación
 * Verifica si el usuario tiene una sesión activa Y que siga siendo válida
 * en base de datos. Sin esto, el rol/estado quedaba cacheado en
 * req.session.user desde el login: si un admin desactivaba, borraba, o le
 * cambiaba el rol a un usuario con sesión abierta, esa sesión seguía
 * funcionando con los permisos viejos hasta que expirara la cookie (24h) o
 * el usuario cerrara sesión manualmente.
 */
export const isAuthenticated = async (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado. Debes iniciar sesión.'
    });
  }

  try {
    const user = await User.findById(req.session.user.id);

    if (!user || user.is_active == 0 || user.is_active === false) {
      return req.session.destroy(() => {
        res.status(401).json({
          success: false,
          message: 'Tu sesión ya no es válida. Inicia sesión de nuevo.'
        });
      });
    }

    // Sincroniza la sesión con la BD (ej. si un admin cambió el rol o el
    // nombre de este usuario después de que inició sesión).
    req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware para verificar rol de administrador
 */
export const isAdmin = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Acceso denegado. Se requieren permisos de administrador.'
  });
};

/**
 * Middleware para verificar rol de estudiante
 */
export const isStudent = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.role === 'student') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Acceso denegado. Solo para estudiantes.'
  });
};

/**
 * Middleware opcional de autenticación
 * Agrega información del usuario si existe, pero no bloquea la petición
 */
export const optionalAuth = (req, res, next) => {
  // Si hay sesión, adjuntar usuario a la petición
  if (req.session && req.session.user) {
    req.user = req.session.user;
  }
  next();
};

/**
 * Middleware factory para rutas de gestión de un curso específico (editar
 * contenido, ver estudiantes inscritos, etc.): deja pasar a un admin
 * siempre, o a un profesor SOLO si está asignado a ese curso puntual
 * (Course.isUserTeacher). `resolveCourseId` recibe `req` y devuelve el id
 * del curso (o una Promise que lo resuelve) — permite usarlo tanto cuando
 * el id viene directo en la URL (`req.params.id`) como cuando hay que
 * buscarlo primero (ej. a partir de un content_id o de `req.body`).
 *
 * IMPORTANTE: en las rutas de subida (POST /video, POST /file), este
 * middleware va DESPUÉS de multer (no antes) porque `req.body.course_id`
 * es un campo del multipart/form-data — no existe todavía si multer no
 * corrió. Como consecuencia, si esta verificación rechaza la petición
 * *después* de que multer ya guardó el archivo en disco, hay que borrarlo
 * aquí mismo — si no, queda huérfano (nunca se inserta en la tabla
 * `contents`, así que ninguna otra limpieza lo alcanza).
 */
export function requireCourseManager(resolveCourseId) {
  const deny = async (req, res, status, message) => {
    if (req.file) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    return res.status(status).json({ success: false, message });
  };

  return async (req, res, next) => {
    if (!req.session || !req.session.user) {
      return deny(req, res, 401, 'No autorizado. Debes iniciar sesión.');
    }

    if (req.session.user.role === 'admin') {
      return next();
    }

    if (req.session.user.role !== 'teacher') {
      return deny(req, res, 403, 'Acceso denegado. Se requieren permisos de administrador o profesor del curso.');
    }

    try {
      const courseId = await resolveCourseId(req);

      if (!courseId) {
        return deny(req, res, 404, 'Curso no encontrado');
      }

      const isTeacherOfCourse = await Course.isUserTeacher(courseId, req.session.user.id);

      if (!isTeacherOfCourse) {
        return deny(req, res, 403, 'Acceso denegado. No eres profesor asignado a este curso.');
      }

      next();
    } catch (error) {
      if (req.file) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      next(error);
    }
  };
}