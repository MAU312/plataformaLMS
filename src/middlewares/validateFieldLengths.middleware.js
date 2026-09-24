import fs from 'fs/promises';
import { t } from '../utils/i18n.js';

/**
 * Límites de largo de los campos de texto que escribe el usuario, iguales a
 * los de las columnas de la base de datos (ver database/cenat1.sql). Sin
 * esta validación, un valor más largo llegaba hasta MySQL, que en modo
 * estricto rechaza el INSERT/UPDATE con ER_DATA_TOO_LONG, y el controller lo
 * devolvía como un 500 genérico ("Error al crear curso") sin decirle nada
 * al usuario sobre QUÉ campo era el problema.
 *
 * - `max` de las columnas VARCHAR se mide en CARACTERES (code points, no
 *   unidades UTF-16: un emoji cuenta 1 igual que en MySQL utf8mb4).
 * - `max` de las columnas TEXT (65.535) se mide en BYTES UTF-8, porque ese
 *   es el límite real de MySQL — un texto con muchas tildes/eñes ocupa más
 *   bytes que caracteres.
 */
export const FIELD_LIMITS = {
  title: { max: 150 },                    // courses/contents/course_modules.title VARCHAR(150)
  name: { max: 100 },                     // users.name VARCHAR(100)
  email: { max: 100 },                    // users.email VARCHAR(100)
  url: { max: 500 },                      // contents.url VARCHAR(500)
  description: { max: 65535, bytes: true }, // courses/contents.description TEXT
  body: { max: 65535, bytes: true },      // forum_posts.body TEXT
  feedback: { max: 65535, bytes: true },  // task_submissions.feedback TEXT
  question_text: { max: 65535, bytes: true }, // content_questions.question_text TEXT
  option_text: { max: 500 }               // content_question_options.option_text VARCHAR(500)
};

function measure(value, { bytes }) {
  return bytes ? Buffer.byteLength(value, 'utf8') : [...value].length;
}

/**
 * ¿`value` supera el límite de `field`? Para validar campos que NO llegan
 * como un campo plano de req.body (ej. el texto de cada pregunta/opción de
 * un cuestionario, que viaja dentro de un array) — ver quiz.controller.js.
 */
export function exceedsFieldLimit(field, value) {
  const limit = FIELD_LIMITS[field];
  if (!limit) throw new Error(`exceedsFieldLimit: campo sin límite definido: ${field}`);
  return typeof value === 'string' && measure(value, limit) > limit.max;
}

/**
 * Middleware de ruta: `validateFieldLengths('title', 'description')` rechaza
 * con 400 (y un mensaje que nombra el campo) si algún campo de `req.body`
 * supera su límite. Solo mira valores de tipo string — un campo ausente o
 * de otro tipo lo dejan pasar a las validaciones propias del controller.
 *
 * En las rutas de subida va DESPUÉS de multer (los campos de un multipart
 * no existen en req.body hasta que multer los parsea), así que si rechaza
 * ya hay un archivo escrito en disco: se borra aquí mismo, igual que hace
 * requireCourseManager, para no dejarlo huérfano (nunca llega a insertarse
 * en la base, así que ninguna otra limpieza lo alcanzaría).
 */
export function validateFieldLengths(...fields) {
  // Falla al definir la ruta (no en una petición) si se pide un campo sin
  // límite conocido — un typo no debe convertirse en "no se valida nada".
  for (const field of fields) {
    if (!FIELD_LIMITS[field]) throw new Error(`validateFieldLengths: campo sin límite definido: ${field}`);
  }

  return async (req, res, next) => {
    const body = req.body || {};

    for (const field of fields) {
      // exceedsFieldLimit ya ignora lo que no sea string.
      if (!exceedsFieldLimit(field, body[field])) continue;
      const limit = FIELD_LIMITS[field];

      const uploaded = [req.file, ...Object.values(req.files || {}).flat()].filter(Boolean);
      await Promise.all(uploaded.map((file) => fs.unlink(file.path).catch(() => {})));

      return res.status(400).json({
        success: false,
        message: t(req.locale, `errors.${field}_too_long`, { max: limit.max })
      });
    }

    next();
  };
}
