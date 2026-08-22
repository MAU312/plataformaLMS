import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear directorios si no existen
const uploadsDir = path.join(__dirname, '../../uploads');
const videosDir = path.join(uploadsDir, 'videos');
const filesDir = path.join(uploadsDir, 'files');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');
const submissionsDir = path.join(uploadsDir, 'submissions');
const contentImagesDir = path.join(uploadsDir, 'content-images');

[uploadsDir, videosDir, filesDir, thumbnailsDir, submissionsDir, contentImagesDir].forEach(dir => {
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

// Filtro para videos
const videoFilter = (req, file, cb) => {
  const allowedTypes = /mp4|avi|mov|wmv|flv|mkv|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    const error = new Error('Solo se permiten archivos de video (mp4, avi, mov, wmv, flv, mkv, webm)');
    error.status = 400;
    cb(error);
  }
};

// Exportada (no solo usada acá) para que server.js pueda referenciarla al
// loguear el límite real, y para poder testearla sin duplicar el número.
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

// Filtro para documentos
const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|ppt|pptx|xls|xlsx|txt|zip|rar/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    return cb(null, true);
  } else {
    const error = new Error('Tipo de archivo no permitido. Se aceptan: PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, TXT, ZIP, RAR');
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
    const error = new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)');
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
// Función auxiliar para eliminar archivos
// =============================================

export const deleteFile = (filePath) => {
  const fullPath = path.join(__dirname, '../../', filePath);
  
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
      return true;
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      return false;
    }
  }
  return false;
};