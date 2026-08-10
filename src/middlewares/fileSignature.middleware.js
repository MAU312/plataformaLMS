import { fileTypeFromFile } from 'file-type';
import fs from 'fs';
import path from 'path';

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
 * Middleware factory: verifica que el contenido real del archivo (subido
 * por un multer.single() previo en la misma ruta) coincida con lo que su
 * extensión declara. Si no coincide, borra el archivo recién subido del
 * disco y responde 400 antes de que la petición llegue al controlador.
 */
export function verifyFileSignature(kind) {
  const signatures = SIGNATURES[kind];

  return async (req, res, next) => {
    if (!req.file) return next();

    const declaredExt = path.extname(req.file.originalname).slice(1).toLowerCase();
    const expected = signatures[declaredExt];

    if (expected === null) return next();

    try {
      const detected = await fileTypeFromFile(req.file.path);

      if (!expected || !detected || !expected.includes(detected.ext)) {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({
          success: false,
          message: 'El contenido del archivo no coincide con su extensión. Verifica que no esté corrupto o haya sido renombrado.'
        });
      }

      next();
    } catch (error) {
      fs.unlink(req.file.path, () => {});
      next(error);
    }
  };
}
