import { fileTypeFromFile } from 'file-type';
import fs from 'fs/promises';
import path from 'path';
import { t } from '../utils/i18n.js';

/**
 * La extensión y el mimetype que llegan en la petición los controla por
 * completo el cliente (multer solo lee lo que el navegador reporta), así
 * que no bastan para confiar en el tipo real de un archivo: alguien puede
 * renombrar cualquier archivo a ".pdf" y falsificar el Content-Type.
 *
 * Este mapa asocia cada extensión permitida con el/los identificador(es)
 * que devuelve `file-type` al leer los primeros bytes reales del archivo
 * ya escrito en disco. `null` marca extensiones sin firma binaria conocida
 * (ej. .txt es texto plano, no tiene "magic bytes" que verificar) — esos
 * casos se dejan pasar tal cual, y de todos modos nunca se sirven inline
 * (ver downloadFile en content.controller.js, que fuerza descarga).
 *
 * Los formatos legacy de Office (.doc/.xls/.ppt) comparten el mismo
 * contenedor binario (CFB) y `file-type` no distingue entre ellos, por
 * eso los tres apuntan a 'cfb'. Igual con .wmv, que es un contenedor ASF.
 */
const SIGNATURES = {
  video: {
    mp4: ['mp4'], avi: ['avi'], mov: ['mov'], wmv: ['asf'],
    flv: ['flv'], mkv: ['mkv'], webm: ['webm']
  },
  file: {
    pdf: ['pdf'], zip: ['zip'], rar: ['rar'],
    doc: ['cfb'], xls: ['cfb'], ppt: ['cfb'],
    docx: ['docx'], xlsx: ['xlsx'], pptx: ['pptx'],
    txt: null
  },
  image: {
    jpg: ['jpg'], jpeg: ['jpg'], png: ['png'], gif: ['gif'], webp: ['webp']
  }
};

/**
 * Junta los archivos de una petición en una sola lista, sin importar si el
 * multer previo en la ruta fue `.single()` (deja `req.file`) o `.fields()`
 * (deja `req.files` como `{ campo: [archivo, ...] }`) — así este middleware
 * sirve para los dos casos sin que el que arma la ruta tenga que saberlo.
 */
function collectUploadedFiles(req) {
  if (req.file) return [req.file];
  if (!req.files) return [];
  return Object.values(req.files).flat();
}

/**
 * Middleware factory: verifica que el contenido real de cada archivo
 * subido (por un multer `.single()` o `.fields()` previo en la misma ruta)
 * coincida con lo que su extensión declara. Si alguno no coincide, borra
 * TODOS los archivos que multer ya escribió en esta misma petición (no
 * solo el inválido — con `.fields()` puede haber más de uno, y dejar un
 * archivo "hermano" válido en disco sin que nada en BD llegue a
 * referenciarlo lo deja huérfano) y responde 400 antes de que la petición
 * llegue al controlador.
 */
export function verifyFileSignature(kind) {
  const signatures = SIGNATURES[kind];

  return async (req, res, next) => {
    const files = collectUploadedFiles(req);
    if (files.length === 0) return next();

    try {
      for (const file of files) {
        const declaredExt = path.extname(file.originalname).slice(1).toLowerCase();
        const expected = signatures[declaredExt];
        if (expected === null) continue;

        const detected = await fileTypeFromFile(file.path);
        if (!expected || !detected || !expected.includes(detected.ext)) {
          await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
          return res.status(400).json({
            success: false,
            message: t(req.locale, 'errors.file_signature_mismatch')
          });
        }
      }

      next();
    } catch (error) {
      await Promise.all(files.map((f) => fs.unlink(f.path).catch(() => {})));
      next(error);
    }
  };
}
