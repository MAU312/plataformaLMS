import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/**
 * Genera la key del rate limiter a partir del usuario autenticado en vez de
 * la IP. Estas rutas ya requieren sesión (isAuthenticated), así que agrupar
 * por usuario es más preciso: evita que varios estudiantes detrás de la
 * misma red (ej. un salón de clases) compartan el mismo límite.
 */
const byUser = (req) => (req.session?.user?.id ? `user:${req.session.user.id}` : ipKeyGenerator(req.ip));

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

/**
 * Limita inscribirse/desinscribirse de cursos: 30 veces cada 15 minutos
 * por usuario. Evita que un usuario sature la BD alternando inscripción
 * en bucle (por accidente o con un script).
 */
export const enrollLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUser,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de inscripción. Intenta de nuevo en unos minutos.'
  }
});

/**
 * Limita solicitudes de recuperación de contraseña: 5 cada 15 minutos por
 * IP. Evita que alguien use este endpoint para bombardear de correos a un
 * email ajeno, o para "sondear" en bucle qué emails existen (aunque la
 * respuesta ya es idéntica exista o no la cuenta).
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en unos minutos.'
  }
});

/**
 * Limita la creación de cursos: 20 por hora por usuario admin.
 * Un admin legítimo no necesita crear más que eso en una hora; evita
 * creación masiva accidental (doble clic, script, etc.).
 */
export const courseCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUser,
  message: {
    success: false,
    message: 'Demasiados cursos creados en poco tiempo. Intenta de nuevo más tarde.'
  }
});

/**
 * Limita la creación de usuarios desde el panel de admin: 20 por hora por
 * usuario admin. A diferencia de registerLimiter (5/hora por IP, pensado
 * para frenar bots contra el registro público), esta ruta ya requiere
 * sesión de admin, así que se agrupa por usuario en vez de por IP.
 */
export const userCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUser,
  message: {
    success: false,
    message: 'Demasiados usuarios creados en poco tiempo. Intenta de nuevo más tarde.'
  }
});

/**
 * Limita entregas de tareas: 20 por hora por usuario. Cada tarea solo
 * admite una entrega de todos modos (UNIQUE en task_submissions), así que
 * esto es sobre todo para evitar reintentos en bucle de un script/bug del
 * cliente contra el endpoint de subida.
 */
export const submitTaskLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: byUser,
  message: {
    success: false,
    message: 'Demasiados intentos de entrega. Intenta de nuevo más tarde.'
  }
});
