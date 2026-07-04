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