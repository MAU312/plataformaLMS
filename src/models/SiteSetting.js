import pool from '../config/db.js';

/**
 * Configuración editable del sitio (texto del catálogo, imágenes de fondo
 * del login y de la grilla de cursos) — clave/valor genérico en vez de
 * columnas fijas, para poder agregar nuevos ajustes editables a futuro sin
 * otro ALTER TABLE. Ver src/public/js/site_settings.js para cómo el
 * frontend consume esto (una sola carga al iniciar la app).
 */
class SiteSetting {
  static async getAll() {
    const [rows] = await pool.query('SELECT `key`, `value` FROM site_settings');
    const settings = {};
    rows.forEach((row) => { settings[row.key] = row.value; });
    return settings;
  }

  static async get(key) {
    const [rows] = await pool.query('SELECT `value` FROM site_settings WHERE `key` = ?', [key]);
    return rows[0] ? rows[0].value : null;
  }

  /**
   * Crea o reemplaza el valor de una clave. `value = null` la deja
   * explícitamente vacía (usado para "restaurar la imagen por defecto",
   * ver settings.controller.js) en vez de borrar la fila — así queda
   * registrado que el admin la tocó, aunque el resultado sea "sin
   * personalizar".
   */
  static async set(key, value) {
    await pool.query(
      'INSERT INTO site_settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)',
      [key, value]
    );
  }
}

export default SiteSetting;
