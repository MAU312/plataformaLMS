import Content from '../models/Content.js';
import Course from '../models/Course.js';
import { deleteFile } from '../middlewares/upload.middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Solo http(s) — rechaza esquemas como javascript:, data:, etc.
const URL_REGEX = /^https?:\/\/.+/i;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Obtener todos los contenidos de un curso
 * Si hay sesión activa, incluye el estado "completed" de cada contenido
 */
export const getContentsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const contents = req.session?.user
      ? await Content.findByCourseWithProgress(courseId, req.session.user.id)
      : await Content.findByCourse(courseId);

    // Solo un admin, un estudiante inscrito, o el profesor asignado al
    // curso recibe las URLs/texto reales de video/archivo/texto.
    // Cualquier otro usuario ve el listado (títulos, orden) pero sin
    // acceso directo al contenido — así se fuerza la inscripción antes
    // de poder reproducir, descargar, o leer una lección de texto.
    const canAccessMedia = await Course.canAccessMedia(courseId, req.session?.user);

    const responseData = canAccessMedia
      ? contents
      : contents.map(Content.redactForNoAccess);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error al obtener contenidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener contenidos'
    });
  }
};

/**
 * Obtener un contenido por ID
 */
export const getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findById(id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Contenido no encontrado'
      });
    }

    // Mismo criterio que en los demás endpoints de contenido: solo admin,
    // inscrito, o profesor asignado ve la URL/texto real. Antes este
    // endpoint público devolvía la URL sin ningún filtro.
    const canAccessMedia = await Course.canAccessMedia(content.course_id, req.session?.user);

    const responseData = canAccessMedia ? content : Content.redactForNoAccess(content);

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error al obtener contenido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener contenido'
    });
  }
};

/**
 * Crear nuevo contenido de tipo VIDEO (solo admin)
 */
export const createVideoContent = async (req, res) => {
  try {
    const { course_id, title, description } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'El archivo de video es requerido'
      });
    }

    const url = `/uploads/videos/${req.file.filename}`;
    const file_size = req.file.size;

    const contentId = await Content.create({
      course_id,
      type: 'video',
      title,
      description,
      url,
      file_size
    });

    res.status(201).json({
      success: true,
      message: 'Video agregado exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error('Error al crear contenido de video:', error);
    // Si hubo error, eliminar el archivo subido
    if (req.file) {
      deleteFile(`/uploads/videos/${req.file.filename}`);
    }
    res.status(500).json({
      success: false,
      message: 'Error al agregar video'
    });
  }
};

/**
 * Crear nuevo contenido de tipo FILE (solo admin)
 */
export const createFileContent = async (req, res) => {
  try {
    const { course_id, title, description } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'El archivo es requerido'
      });
    }

    const url = `/uploads/files/${req.file.filename}`;
    const file_size = req.file.size;

    const contentId = await Content.create({
      course_id,
      type: 'file',
      title,
      description,
      url,
      file_size
    });

    res.status(201).json({
      success: true,
      message: 'Archivo agregado exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error('Error al crear contenido de archivo:', error);
    // Si hubo error, eliminar el archivo subido
    if (req.file) {
      deleteFile(`/uploads/files/${req.file.filename}`);
    }
    res.status(500).json({
      success: false,
      message: 'Error al agregar archivo'
    });
  }
};

/**
 * Crear nuevo contenido de tipo TEXT: sin archivo, el contenido en sí es
 * el texto guardado en `description`.
 */
export const createTextContent = async (req, res) => {
  try {
    const { course_id, title, description } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({
        success: false,
        message: 'El contenido de texto es requerido'
      });
    }

    const contentId = await Content.create({
      course_id,
      type: 'text',
      title,
      description,
      url: null
    });

    res.status(201).json({
      success: true,
      message: 'Contenido de texto agregado exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error('Error al crear contenido de texto:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar el contenido de texto'
    });
  }
};

/**
 * Crear nuevo contenido de tipo URL: un video externo (ej. YouTube) en
 * vez de un archivo subido — la URL se guarda directo, sin multer.
 */
export const createUrlContent = async (req, res) => {
  try {
    const { course_id, title, description, url } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    if (!url || !URL_REGEX.test(String(url).trim())) {
      return res.status(400).json({
        success: false,
        message: 'La URL debe ser un enlace http o https válido'
      });
    }

    const contentId = await Content.create({
      course_id,
      type: 'url',
      title,
      description,
      url: String(url).trim()
    });

    res.status(201).json({
      success: true,
      message: 'URL de video agregada exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error('Error al crear contenido de URL:', error);
    res.status(500).json({
      success: false,
      message: 'Error al agregar la URL de video'
    });
  }
};

/**
 * Crear nuevo contenido de tipo TASK (tarea): el archivo de
 * instrucciones/plantilla es OPCIONAL (a diferencia de video/archivo,
 * donde es obligatorio) — una tarea puede ser solo texto de
 * instrucciones sin ningún archivo adjunto.
 */
export const createTaskContent = async (req, res) => {
  try {
    const { course_id, title, description } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    let url = null;
    let file_size = null;
    if (req.file) {
      url = `/uploads/files/${req.file.filename}`;
      file_size = req.file.size;
    }

    const contentId = await Content.create({
      course_id,
      type: 'task',
      title,
      description,
      url,
      file_size
    });

    res.status(201).json({
      success: true,
      message: 'Tarea agregada exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error('Error al crear la tarea:', error);
    if (req.file) {
      deleteFile(`/uploads/files/${req.file.filename}`);
    }
    res.status(500).json({
      success: false,
      message: 'Error al agregar la tarea'
    });
  }
};

/**
 * Crear nuevo tema de foro: el profesor/admin escribe el post principal
 * (guardado en `description`, igual que en 'text') y los estudiantes
 * inscritos responden después vía forum.controller.js — este endpoint solo
 * crea el tema, no acepta respuestas.
 */
export const createForumContent = async (req, res) => {
  try {
    const { course_id, title, description } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({
        success: false,
        message: 'El texto principal del tema es requerido'
      });
    }

    const contentId = await Content.create({
      course_id,
      type: 'forum',
      title,
      description,
      url: null
    });

    res.status(201).json({
      success: true,
      message: 'Tema de foro creado exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error('Error al crear el tema de foro:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear el tema de foro'
    });
  }
};

/**
 * Actualizar contenido (solo admin)
 */
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order_index, url } = req.body;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Contenido no encontrado'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order_index !== undefined) updateData.order_index = parseInt(order_index);

    // Contenido tipo URL no lleva archivo: la única forma de "reemplazar"
    // el contenido es cambiar el link.
    if (content.type === 'url' && url !== undefined) {
      if (!URL_REGEX.test(String(url).trim())) {
        return res.status(400).json({
          success: false,
          message: 'La URL debe ser un enlace http o https válido'
        });
      }
      updateData.url = String(url).trim();
    }

    // Si se subió un nuevo archivo
    if (req.file) {
      // Eliminar archivo anterior
      if (content.url) {
        deleteFile(content.url);
      }

      // Actualizar URL según el tipo
      if (content.type === 'video') {
        updateData.url = `/uploads/videos/${req.file.filename}`;
      } else {
        updateData.url = `/uploads/files/${req.file.filename}`;
      }
    }

    const updated = await Content.update(id, updateData);

    if (updated) {
      res.json({
        success: true,
        message: 'Contenido actualizado exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el contenido'
      });
    }
  } catch (error) {
    console.error('Error al actualizar contenido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar contenido'
    });
  }
};

/**
 * Eliminar contenido (solo admin)
 */
export const deleteContent = async (req, res) => {
  try {
    const { id } = req.params;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Contenido no encontrado'
      });
    }

    // Eliminar archivo físico (type='url' no tiene archivo local, es un
    // link externo — no hay nada que borrar del disco).
    if (content.url && content.type !== 'url') {
      deleteFile(content.url);
    }

    const deleted = await Content.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Contenido eliminado exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar el contenido'
      });
    }
  } catch (error) {
    console.error('Error al eliminar contenido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar contenido'
    });
  }
};

/**
 * Reordenar contenidos de un curso (solo admin)
 */
export const reorderContents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { contentIds } = req.body;

    if (!Array.isArray(contentIds) || contentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere un array de IDs de contenidos'
      });
    }

    await Content.reorder(courseId, contentIds);

    res.json({
      success: true,
      message: 'Contenidos reordenados exitosamente'
    });
  } catch (error) {
    console.error('Error al reordenar contenidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al reordenar contenidos'
    });
  }
};

/**
 * Descargar archivo
 */
export const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    
    const content = await Content.findById(id);
    
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Contenido no encontrado'
      });
    }

    // El archivo de instrucciones de una tarea se guarda igual que un
    // 'file' (mismo storage, misma carpeta no-estática), así que también
    // se descarga por acá.
    const isDownloadable = content.type === 'file' || (content.type === 'task' && content.url);
    if (!isDownloadable) {
      return res.status(400).json({
        success: false,
        message: 'Este contenido no es un archivo descargable'
      });
    }

    // Solo puede descargar: un admin, un estudiante inscrito, o el
    // profesor asignado al curso al que pertenece este contenido. Antes
    // cualquier usuario autenticado podía descargar cualquier archivo sin
    // importar su inscripción.
    const canAccess = await Course.canAccessMedia(content.course_id, req.session.user);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Debes estar inscrito en este curso para descargar este archivo'
      });
    }

    const filePath = path.join(__dirname, '../../', content.url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Archivo no encontrado en el servidor'
      });
    }

    // Obtener nombre original del archivo
    const fileName = path.basename(content.url);

    res.download(filePath, fileName);
  } catch (error) {
    console.error('Error al descargar archivo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al descargar archivo'
    });
  }
};

// =================================
// Progreso de contenidos
// =================================

/**
 * Marcar un contenido como completado por el usuario actual.
 * Recalcula automáticamente el progreso general del curso.
 */
export const markContentCompleted = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Contenido no encontrado'
      });
    }

    // Una tarea se marca completada automáticamente al entregarla (ver
    // submitTask) — no manualmente, o un estudiante podría marcarla como
    // hecha sin haber entregado nada. Un foro no se "completa": es una
    // discusión abierta, no cuenta para el progreso del curso.
    if (content.type === 'task' || content.type === 'forum') {
      return res.status(400).json({
        success: false,
        message: content.type === 'forum'
          ? 'El foro no cuenta para el progreso del curso'
          : 'El progreso de una tarea se actualiza automáticamente al entregarla'
      });
    }

    // Solo se puede marcar progreso en contenido de un curso en el que
    // se está inscrito (o si es admin). Antes cualquier usuario autenticado
    // podía marcar como completado contenido de cursos ajenos.
    const isAdminUser = req.session.user.role === 'admin';
    if (!isAdminUser) {
      const enrolled = await Course.isUserEnrolled(content.course_id, userId);
      if (!enrolled) {
        return res.status(403).json({
          success: false,
          message: 'Debes estar inscrito en este curso para marcar contenido como completado'
        });
      }
    }

    await Content.markCompleted(id, userId);
    const { progress: newProgress, total: totalContents, completed: completedContents } = await Content.recalculateCourseProgress(content.course_id, userId);

    res.json({
      success: true,
      message: 'Contenido marcado como completado',
      data: { progress: newProgress, total: totalContents, completed: completedContents }
    });
  } catch (error) {
    console.error('Error al marcar contenido como completado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al marcar contenido como completado'
    });
  }
};

/**
 * Desmarcar un contenido como completado (volver a pendiente).
 * Recalcula automáticamente el progreso general del curso.
 */
export const markContentIncomplete = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Contenido no encontrado'
      });
    }

    // Misma regla que al marcar como completado: el progreso de una tarea
    // solo lo controla la entrega, y un foro no cuenta para el progreso.
    if (content.type === 'task' || content.type === 'forum') {
      return res.status(400).json({
        success: false,
        message: content.type === 'forum'
          ? 'El foro no cuenta para el progreso del curso'
          : 'El progreso de una tarea se actualiza automáticamente al entregarla'
      });
    }

    // Misma regla que al marcar como completado.
    const isAdminUser = req.session.user.role === 'admin';
    if (!isAdminUser) {
      const enrolled = await Course.isUserEnrolled(content.course_id, userId);
      if (!enrolled) {
        return res.status(403).json({
          success: false,
          message: 'Debes estar inscrito en este curso para modificar su progreso'
        });
      }
    }

    await Content.markIncomplete(id, userId);
    const { progress: newProgress, total: totalContents, completed: completedContents } = await Content.recalculateCourseProgress(content.course_id, userId);

    res.json({
      success: true,
      message: 'Contenido desmarcado',
      data: { progress: newProgress, total: totalContents, completed: completedContents }
    });
  } catch (error) {
    console.error('Error al desmarcar contenido:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desmarcar contenido'
    });
  }
};