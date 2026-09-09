import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import mailer from '../config/mailer.js';
import { t } from '../utils/i18n.js';

// Regex simple pero suficiente para validar formato de email en el backend
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Username: 3-50 caracteres, letras/números/punto/guion/guion bajo. Nada de
// espacios ni '@' — así nunca se puede confundir con un email al hacer login.
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,50}$/;

export const register = async (req, res) => {
  try {
    // IMPORTANTE: 'role' NUNCA se toma del body. El registro público
    // siempre crea usuarios 'student'. Crear admins se hace desde un
    // endpoint protegido (ver user.routes.js) o directo en base de datos.
    const { name, email, password, username } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.name_email_password_required') });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.invalid_email_format') });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.password_min_length') });
    }

    // El username es opcional al registrarse.
    let normalizedUsername = null;
    if (username && String(username).trim()) {
      normalizedUsername = String(username).trim();
      if (!USERNAME_REGEX.test(normalizedUsername)) {
        return res.status(400).json({
          success: false,
          message: t(req.locale, 'errors.invalid_username_format')
        });
      }
    }

    const existingUser = await User.findByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.email_already_registered') });
    }

    if (normalizedUsername) {
      const existingUsername = await User.findByEmailOrUsername(normalizedUsername);
      if (existingUsername) {
        return res.status(400).json({ success: false, message: t(req.locale, 'errors.username_already_taken') });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await User.create({
      name: String(name).trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'student' // fijo, sin excepciones, para todo registro público
    });

    res.status(201).json({ success: true, message: t(req.locale, 'success.user_registered'), data: { id: userId } });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.email_or_username_taken') });
    }
    console.error('Error en registro:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.register_failed') });
  }
};

export const login = async (req, res) => {
  try {
    // El campo sigue llamándose "email" en el body por compatibilidad con
    // el frontend existente, pero ahora acepta también un username: si
    // contiene '@' se normaliza como email (minúsculas); si no, se usa tal
    // cual (el username sí distingue mayúsculas de minúsculas).
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.identifier_password_required') });
    }

    const identifier = String(email).trim();
    const normalizedIdentifier = identifier.includes('@') ? identifier.toLowerCase() : identifier;
    const user = await User.findByEmailOrUsername(normalizedIdentifier);

    // Hash "dummy" para comparar aunque el usuario no exista. Así el tiempo
    // de respuesta es similar en ambos casos y no se puede usar el login
    // para enumerar qué emails/usuarios están registrados (timing attack).
    const hashToCompare = user ? user.password : '$2a$10$aAxccBGObjG/Dk0fWyIl1esr2QYvJxG/TqFX7JWjQAecw/9k.gfry';
    const isValidPassword = await bcrypt.compare(password, hashToCompare);

    if (!user || !isValidPassword) {
      return res.status(401).json({ success: false, message: t(req.locale, 'errors.invalid_credentials') });
    }

    // El estado de la cuenta se revela SOLO si la contraseña ya es correcta,
    // así no se filtra a un atacante sin credenciales si una cuenta existe
    // o está desactivada.
    if (user.is_active == 0 || user.is_active === false) {
      return res.status(403).json({
        success: false,
        message: t(req.locale, 'errors.account_deactivated')
      });
    }

    await User.updateLastLogin(user.id);

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      admin_access: Boolean(user.admin_access),
      avatar_url: user.avatar_url
    };

    res.json({
      success: true,
      message: t(req.locale, 'success.login_success'),
      data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, admin_access: Boolean(user.admin_access), avatar_url: user.avatar_url } }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.login_failed') });
  }
};

export const logout = (req, res) => {
  const locale = req.locale;
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ success: false, message: t(locale, 'errors.logout_failed') });
    res.json({ success: true, message: t(locale, 'success.logout_success') });
  });
};

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: t(req.locale, 'errors.no_active_session') });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).json({ success: false, message: t(req.locale, 'errors.user_not_found') });

    res.json({ success: true, data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, admin_access: Boolean(user.admin_access), avatar_url: user.avatar_url } } });
  } catch (error) {
    res.status(500).json({ success: false, message: t(req.locale, 'errors.get_user_failed') });
  }
};

export const checkAuth = (req, res) => {
  if (req.session && req.session.user) {
    res.json({ success: true, authenticated: true, user: req.session.user });
  } else {
    res.json({ success: true, authenticated: false });
  }
};

/**
 * Solicita un enlace de recuperación de contraseña.
 * Responde con el mismo mensaje exista o no la cuenta con ese email, para
 * no revelar qué correos están registrados (evita enumeración de usuarios).
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.email_required') });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findByEmail(normalizedEmail);

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      await User.setResetToken(user.id, tokenHash, expiresAt);
      await mailer.sendPasswordResetEmail(user.email, rawToken);
    }

    res.json({
      success: true,
      message: t(req.locale, 'success.forgot_password_sent')
    });
  } catch (error) {
    console.error('Error en forgotPassword:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.forgot_password_failed') });
  }
};

/**
 * Restablece la contraseña usando el token recibido por correo.
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.token_password_required') });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.password_min_length') });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findByValidResetTokenHash(tokenHash);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: t(req.locale, 'errors.reset_link_invalid')
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.resetPassword(user.id, hashedPassword);

    // Si el reset fue porque una sesión estaba comprometida, esa sesión
    // robada no debe seguir sirviendo después de este punto — se cierran
    // TODAS las sesiones activas de la cuenta, no solo la que hizo el
    // request (este endpoint no requiere estar logueado de todos modos).
    await User.invalidateSessions(user.id);

    res.json({ success: true, message: t(req.locale, 'success.password_reset_success') });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.reset_password_failed') });
  }
};