import SiteSetting from '../models/SiteSetting.js';
import { deleteFile } from '../middlewares/upload.middleware.js';

// Únicas claves que este endpoint sabe leer/escribir — evita que alguien
// use PUT /api/settings para meter una clave arbitraria en la tabla.
const TEXT_KEYS = ['catalog_title', 'catalog_subtitle'];
const IMAGE_KEYS = ['login_bg_image', 'courses_bg_image'];
const MAX_TEXT_LENGTH = 300;

/**
 * GET /api/settings
 * Público (sin isAuthenticated a propósito): la página de login y el
 * catálogo de invitado necesitan esto ANTES de que haya sesión.
 */
export const getSettings = async (req, res) => {
  try {
    const settings = await SiteSetting.getAll();
    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error al obtener la configuración del sitio:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la configuración' });
  }
};

/**
 * PUT /api/settings (solo admin)
 * Actualiza texto del catálogo y/o reemplaza una o ambas imágenes de
 * fondo, todo en una sola petición. `<campo>_clear = 'true'` restaura esa
 * imagen al valor por defecto (borra el archivo personalizado y la fila
 * de configuración) — se ignora si además viene un archivo nuevo para ese
 * mismo campo, el archivo nuevo gana.
 */
export const updateSettings = async (req, res) => {
  const uploadedFiles = req.files ? Object.values(req.files).flat() : [];
  // Archivos ya asociados con éxito a una fila en BD — si algo falla más
  // adelante en el loop, el catch de abajo borra los que quedaron
  // "sueltos" (nunca llegaron a guardarse en BD) pero NO estos, para no
  // dejar una fila de configuración apuntando a un archivo que ya no existe.
  const committed = new Set();

  try {
    for (const key of TEXT_KEYS) {
      const value = req.body[key];
      if (value === undefined) continue;
      if (String(value).length > MAX_TEXT_LENGTH) {
        uploadedFiles.forEach((f) => deleteFile(`/uploads/site/${f.filename}`));
        return res.status(400).json({
          success: false,
          message: `El texto es demasiado largo (máximo ${MAX_TEXT_LENGTH} caracteres)`
        });
      }
    }

    for (const key of TEXT_KEYS) {
      const value = req.body[key];
      if (value !== undefined) {
        await SiteSetting.set(key, String(value).trim());
      }
    }

    for (const key of IMAGE_KEYS) {
      const uploaded = req.files?.[key]?.[0];
      const shouldClear = req.body[`${key}_clear`] === 'true';

      if (uploaded) {
        const previous = await SiteSetting.get(key);
        await SiteSetting.set(key, `/uploads/site/${uploaded.filename}`);
        committed.add(uploaded);
        if (previous) deleteFile(previous);
      } else if (shouldClear) {
        const previous = await SiteSetting.get(key);
        await SiteSetting.set(key, null);
        if (previous) deleteFile(previous);
      }
    }

    res.json({ success: true, message: 'Configuración actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar la configuración del sitio:', error);
    uploadedFiles.filter((f) => !committed.has(f)).forEach((f) => deleteFile(`/uploads/site/${f.filename}`));
    res.status(500).json({ success: false, message: 'Error al actualizar la configuración' });
  }
};
