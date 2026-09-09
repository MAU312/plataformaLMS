import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '../utils/i18n.js';

/**
 * Resuelve `req.locale` una sola vez por petición, a partir del header
 * `X-Locale` que manda el frontend (ver api.js) con el idioma elegido por
 * el usuario (getLocale(), persistido en localStorage). Un valor ausente o
 * no soportado cae en DEFAULT_LOCALE — nunca bloquea la petición.
 */
export function resolveLocale(req, res, next) {
  const requested = req.headers['x-locale'];
  req.locale = SUPPORTED_LOCALES.includes(requested) ? requested : DEFAULT_LOCALE;
  next();
}
