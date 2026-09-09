/**
 * i18n (es/en) del lado del servidor — mismo espíritu que
 * src/public/js/i18n.js (mismo mecanismo de t()/fallback), pero como
 * diccionario aparte: no hay forma de compartir un solo archivo entre
 * Node y un script clásico del navegador sin introducir un bundler o
 * módulos ES en el frontend (que hoy no existen, a propósito — ver
 * src/public/index.html, ~30 <script> clásicos). Se acepta la duplicación
 * de contenido entre los dos diccionarios como compromiso deliberado.
 *
 * Cobertura actual: solo los controllers ya traducidos
 * (auth.controller.js completo, course.controller.js#getAllCourses) — el
 * resto de los controllers todavía responde con texto fijo en español y se
 * va migrando controller por controller, agregando sus keys acá.
 */

export const SUPPORTED_LOCALES = ['es', 'en'];
export const DEFAULT_LOCALE = 'es';

const TRANSLATIONS = {
  es: {
    errors: {
      name_email_password_required: 'Nombre, email y contraseña son requeridos',
      invalid_email_format: 'El email no tiene un formato válido',
      password_min_length: 'La contraseña debe tener al menos 6 caracteres',
      invalid_username_format: 'El nombre de usuario debe tener 3-50 caracteres: letras, números, puntos, guiones o guiones bajos',
      email_already_registered: 'El email ya está registrado',
      username_already_taken: 'Ese nombre de usuario ya está en uso',
      email_or_username_taken: 'El email o nombre de usuario ya está en uso',
      register_failed: 'Error al registrar usuario',
      identifier_password_required: 'Correo/usuario y contraseña son requeridos',
      invalid_credentials: 'Credenciales inválidas',
      account_deactivated: 'Tu cuenta ha sido desactivada. Contacta al administrador.',
      login_failed: 'Error al iniciar sesión',
      logout_failed: 'Error al cerrar sesión',
      no_active_session: 'No hay sesión activa',
      user_not_found: 'Usuario no encontrado',
      get_user_failed: 'Error al obtener información del usuario',
      email_required: 'El email es requerido',
      forgot_password_failed: 'Error al procesar la solicitud',
      token_password_required: 'Token y nueva contraseña son requeridos',
      reset_link_invalid: 'El enlace es inválido o ya expiró. Solicita uno nuevo.',
      reset_password_failed: 'Error al restablecer la contraseña',
      get_courses_failed: 'Error al obtener cursos'
    },
    success: {
      user_registered: 'Usuario registrado exitosamente',
      login_success: 'Inicio de sesión exitoso',
      logout_success: 'Sesión cerrada exitosamente',
      forgot_password_sent: 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.',
      password_reset_success: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.'
    }
  },
  en: {
    errors: {
      name_email_password_required: 'Name, email and password are required',
      invalid_email_format: 'The email is not in a valid format',
      password_min_length: 'Password must be at least 6 characters',
      invalid_username_format: 'Username must be 3-50 characters: letters, numbers, dots, hyphens or underscores',
      email_already_registered: 'This email is already registered',
      username_already_taken: 'That username is already in use',
      email_or_username_taken: 'The email or username is already in use',
      register_failed: 'Error registering user',
      identifier_password_required: 'Email/username and password are required',
      invalid_credentials: 'Invalid credentials',
      account_deactivated: 'Your account has been deactivated. Contact the administrator.',
      login_failed: 'Error logging in',
      logout_failed: 'Error logging out',
      no_active_session: 'No active session',
      user_not_found: 'User not found',
      get_user_failed: 'Error getting user information',
      email_required: 'Email is required',
      forgot_password_failed: 'Error processing the request',
      token_password_required: 'Token and new password are required',
      reset_link_invalid: 'The link is invalid or has expired. Request a new one.',
      reset_password_failed: 'Error resetting password',
      get_courses_failed: 'Error getting courses'
    },
    success: {
      user_registered: 'User registered successfully',
      login_success: 'Login successful',
      logout_success: 'Session closed successfully',
      forgot_password_sent: "If the email is registered, you'll receive a link to reset your password.",
      password_reset_success: 'Password updated successfully. You can now log in.'
    }
  }
};

function resolveKey(dict, key) {
  return key.split('.').reduce((obj, part) => (obj && typeof obj === 'object') ? obj[part] : undefined, dict);
}

/**
 * `locale` inválido/ausente cae en DEFAULT_LOCALE; una key que no exista en
 * ningún lado devuelve la propia key (para notar el faltante en desarrollo,
 * nunca "undefined" en una respuesta real).
 */
export function t(locale, key, vars) {
  const dict = TRANSLATIONS[locale] || TRANSLATIONS[DEFAULT_LOCALE];
  let value = resolveKey(dict, key);
  if (value === undefined) value = resolveKey(TRANSLATIONS[DEFAULT_LOCALE], key);
  if (value === undefined) return key;

  if (vars) {
    for (const varKey of Object.keys(vars)) {
      value = value.replaceAll(`{{${varKey}}}`, vars[varKey]);
    }
  }
  return value;
}
