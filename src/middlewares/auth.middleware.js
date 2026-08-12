import Course from '../models/Course.js';

/**
 * Middleware de autenticación
 * Verifica si el usuario tiene una sesión activa
 */
export const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.user) {
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'No autorizado. Debes iniciar sesión.'
  });
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
 * buscarlo primero (ej. a partir de un content_id).
 */
export function requireCourseManager(resolveCourseId) {
  return async (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Debes iniciar sesión.'
      });
    }

    if (req.session.user.role === 'admin') {
      return next();
    }

    if (req.session.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requieren permisos de administrador o profesor del curso.'
      });
    }

    try {
      const courseId = await resolveCourseId(req);

      if (!courseId) {
        return res.status(404).json({ success: false, message: 'Curso no encontrado' });
      }

      const isTeacherOfCourse = await Course.isUserTeacher(courseId, req.session.user.id);

      if (!isTeacherOfCourse) {
        return res.status(403).json({
          success: false,
          message: 'Acceso denegado. No eres profesor asignado a este curso.'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}