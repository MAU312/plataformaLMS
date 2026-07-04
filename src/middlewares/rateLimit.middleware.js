import rateLimit from 'express-rate-limit';

/**
 * Limita intentos de login: 10 intentos cada 15 minutos por IP.
 * Evita ataques de fuerza bruta contra contraseñas.
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.'
  }
});

/**
 * Limita registros: 5 registros cada hora por IP.
 * Evita creación masiva de cuentas automatizada (bots).
 */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados registros desde esta red. Intenta de nuevo más tarde.'
  }
});
