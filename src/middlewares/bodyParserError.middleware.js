import { t } from '../utils/i18n.js';
import { resolveLocale } from './i18n.middleware.js';

/**
 * Errores de los body parsers de Express (express.json / express.urlencoded).
 * Sin este handler caían en el handler genérico de app.js, que para un 4xx
 * devuelve `err.message` TAL CUAL: "request entity too large" (en inglés,
 * sin pasar por t()) y, para un JSON mal formado, el mensaje interno del
 * parser ("Unexpected token } in JSON at position 5") — ni traducido ni
 * útil para el usuario. Se identifican por `err.type`, que es el contrato
 * estable de body-parser (el texto de `message` puede cambiar de versión).
 */
const BODY_PARSER_ERRORS = {
  'entity.too.large': { status: 413, key: 'errors.payload_too_large' },
  'entity.parse.failed': { status: 400, key: 'errors.invalid_json_body' }
};

export function handleBodyParserError(err, req, res, next) {
  const known = err && BODY_PARSER_ERRORS[err.type];
  if (!known) return next(err);

  // Los body parsers corren ANTES que resolveLocale (que está montado solo
  // bajo /api, después de ellos), así que cuando fallan `req.locale` todavía
  // no existe — se resuelve acá mismo para no responderle español a quien
  // eligió inglés.
  if (!req.locale) resolveLocale(req, res, () => {});

  return res.status(known.status).json({
    success: false,
    message: t(req.locale, known.key)
  });
}
