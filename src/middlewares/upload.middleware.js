import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { UPLOADS_ROOT } from '../config/uploads.js';
import { t } from '../utils/i18n.js';

// Crear directorios si no existen
const uploadsDir = UPLOADS_ROOT;
const videosDir = path.join(uploadsDir, 'videos');
const filesDir = path.join(uploadsDir, 'files');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const submissionsDir = path.join(uploadsDir, 'submissions');
const contentImagesDir = path.join(uploadsDir, 'content-images');
const avatarsDir = path.join(uploadsDir, 'avatars');
const siteDir = path.join(uploadsDir, 'site');

[uploadsDir, videosDir, filesDir, thumbnailsDir, submissionsDir, contentImagesDir, avatarsDir, siteDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// =============================================
// Configuración de almacenamiento para VIDEOS
// =============================================

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único: timestamp-nombre-original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Filtro para videos. Exige extensión Y mimetype (a diferencia de
// fileFilter/csvFilter más abajo): el mimetype de video que reporta el
// navegador es confiable, así que ambos chequeos coinciden en la práctica
// y exigir los dos suma una capa extra sin arriesgar falsos rechazos.
const videoFilter = (req, file, cb) => {
  const allowedTypes = /mp4|avi|mov|wmv|flv|mkv|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    const error = new Error(t(req.locale, 'errors.video_type_not_allowed'));
    error.status = 400;
    cb(error);
  }
};

// Exportada (no solo usada acá) para poder testearla sin duplicar el
// número, y por si algún día hace falta referenciarla al loguear el
// límite real al arrancar la app (app.js).
export const MAX_VIDEO_SIZE_BYTES = 2 * 1024 * 1024 * 1024; // 2GB

export const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: MAX_VIDEO_SIZE_BYTES
  },
  fileFilter: videoFilter
});

// =============================================
// Configuración de almacenamiento para ARCHIVOS
// =============================================

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, filesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Filtro para documentos. Solo por extensión (a diferencia de
// videoFilter/imageFilter): el mimetype que reportan Office/zip/rar varía
// mucho entre navegador y sistema operativo, así que exigirlo además
// rechazaría subidas legítimas. La validación real y confiable (firma
// binaria del archivo, no solo su nombre) la hace verifyFileSignature
// después de este filtro superficial.
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    return cb(null, true);
  } else {
    const error = new Error(t(req.locale, 'errors.document_type_not_allowed'));
    error.status = 400;
    cb(error);
  }
};

export const uploadFile = multer({
  storage: fileStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo
  },
  fileFilter: fileFilter
});

// =============================================
// Configuración de almacenamiento para ENTREGAS DE TAREAS
// (mismo límite y tipos permitidos que uploadFile)
// =============================================

const submissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, submissionsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

export const uploadSubmission = multer({
  storage: submissionStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo
  },
  fileFilter: fileFilter
});

// =============================================
// Configuración de almacenamiento para MINIATURAS
// =============================================

const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, thumbnailsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// Filtro para imágenes
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    const error = new Error(t(req.locale, 'errors.image_type_not_allowed'));
    error.status = 400;
    cb(error);
  }
};

export const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: imageFilter
});

// =============================================
// Configuración de almacenamiento para IMÁGENES DE CONTENIDO
// (una imagen más en la lista de contenido del curso, distinta de las
// miniaturas de portada — mismo filtro/límite que uploadThumbnail)
// =============================================

const contentImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, contentImagesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/\s+/g, '-');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

export const uploadContentImage = multer({
  storage: contentImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: imageFilter
});

// =============================================
// Configuración de almacenamiento para FOTO DE PERFIL
// (mismo filtro/límite que las otras imágenes — cualquier usuario logueado
// sube la suya propia, ver PUT /api/users/me/avatar)
// =============================================

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.session.user.id}-${uniqueSuffix}${ext}`);
  }
});

export const uploadAvatar = multer({
  storage: avatarStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: imageFilter
});

// =============================================
// Configuración de almacenamiento para IMÁGENES DE SITIO
// (fondo del login, fondo de la grilla de cursos — configuración global,
// no de un curso puntual, ver settings.controller.js. Mismo filtro/límite
// que el resto de las imágenes.)
// =============================================

const siteImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, siteDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

export const uploadSiteImage = multer({
  storage: siteImageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  },
  fileFilter: imageFilter
});

// =============================================
// Configuración de almacenamiento para IMPORTACIÓN MASIVA DE USUARIOS (CSV)
// En memoria, no en disco: se parsea una sola vez al vuelo y se descarta
// (a diferencia del resto, no es un archivo que alguien vaya a descargar
// después).
// =============================================

// OR en vez de AND (a diferencia de video/imagen): el mimetype de un .csv
// varía mucho entre Excel/Sheets/SO ("text/csv", "application/vnd.ms-excel",
// "application/csv", etc.) — exigir los dos a la vez rechazaría CSVs
// legítimos solo por una etiqueta de mimetype poco confiable.
const csvFilter = (req, file, cb) => {
  const extname = path.extname(file.originalname).toLowerCase() === '.csv';
  const mimetype = /csv|text\/plain|excel/.test(file.mimetype);

  if (extname || mimetype) {
    return cb(null, true);
  } else {
    const error = new Error(t(req.locale, 'errors.csv_type_not_allowed'));
    error.status = 400;
    cb(error);
  }
};

export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB máximo
  },
  fileFilter: csvFilter
});

// =============================================
// Función auxiliar para eliminar archivos
// =============================================

// Async (fs.promises), no fs.unlinkSync — el resto de middlewares del
// proyecto ya son async-first (auth.middleware.js, fileSignature.middleware.js);
// esta era la única I/O que bloqueaba el event loop en cada llamada. Todos
// los callers (controllers, siempre async) ahora la esperan con `await`.
export const deleteFile = async (filePath) => {
  // filePath viene como '/uploads/videos/x.mp4' (la URL pública guardada en
  // BD) — se le quita el prefijo 'uploads/' porque UPLOADS_ROOT ya apunta a
  // esa carpeta, dondequiera que esté configurada.
  const relativePath = filePath.replace(/^\/?uploads\//, '');
  const fullPath = path.join(UPLOADS_ROOT, relativePath);

  try {
    await fs.promises.unlink(fullPath);
    return true;
  } catch (error) {
    // ENOENT ("no existe") no es un error real acá — el archivo ya no
    // estaba, que es justo lo que existsSync() chequeaba antes de intentar
    // borrar. Cualquier otro error (permisos, etc.) sí se loguea.
    if (error.code !== 'ENOENT') {
      console.error('Error al eliminar archivo:', error);
    }
    return false;
  }
};