import Content from '../models/Content.js';
import { deleteFile } from '../middlewares/upload.middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

    res.json({
      success: true,
      data: contents
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

    res.json({
      success: true,
      data: content
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
 * Actualizar contenido (solo admin)
 */
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order_index } = req.body;

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

    // Eliminar archivo físico
    if (content.url) {
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

    if (content.type !== 'file') {
      return res.status(400).json({
        success: false,
        message: 'Este contenido no es un archivo descargable'
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