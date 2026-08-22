import Content from '../models/Content.js';
import Course from '../models/Course.js';
import TaskSubmission from '../models/TaskSubmission.js';
import { deleteFile } from '../middlewares/upload.middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Solo http(s) — rechaza esquemas como javascript:, data:, etc.
const URL_REGEX = /^https?:\/\/.+/i;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Valida un folder_id opcional recibido del body: vacío/null/undefined
 * significa "sin carpeta" (nivel superior). Si viene, la carpeta debe
 * existir, ser type='folder', y pertenecer al MISMO curso — así no se
 * puede colgar contenido de la carpeta de otro curso, ni meterlo "dentro"
 * de un contenido que no sea una carpeta.
 */
/**
 * Mensaje de por qué un tipo de contenido no se puede marcar
 * completado/pendiente manualmente, o null si sí se puede. Una tarea la
 * marca automáticamente submitTask al entregar; un foro y una carpeta no
 * tienen un estado "completado" real (son discusión abierta / agrupador),
 * así que ninguno de los tres debe contar para el progreso del curso.
 */
function uncompletableReason(type) {
  if (type === 'task') return 'El progreso de una tarea se actualiza automáticamente al entregarla';
  if (type === 'quiz' || type === 'survey') return 'El progreso se actualiza automáticamente al responder';
  if (type === 'forum') return 'El foro no cuenta para el progreso del curso';
  if (type === 'folder') return 'Una carpeta no cuenta para el progreso del curso';
  return null;
}

async function resolveFolderId(folderIdInput, courseId) {
  if (folderIdInput === undefined || folderIdInput === null || folderIdInput === '') {
    return { ok: true, folderId: null };
  }
  const folder = await Content.findById(folderIdInput);
  if (!folder || folder.type !== 'folder' || String(folder.course_id) !== String(courseId)) {
    return { ok: false };
  }
  return { ok: true, folderId: folder.id };
}

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
    const { course_id, title, description, folder_id } = req.body;

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

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      deleteFile(`/uploads/videos/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
    }

    const url = `/uploads/videos/${req.file.filename}`;
    const file_size = req.file.size;

    const contentId = await Content.create({
      course_id,
      type: 'video',
      title,
      description,
      url,
      file_size,
      folder_id: folderCheck.folderId
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
    const { course_id, title, description, folder_id } = req.body;

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

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      deleteFile(`/uploads/files/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
    }

    const url = `/uploads/files/${req.file.filename}`;
    const file_size = req.file.size;

    const contentId = await Content.create({
      course_id,
      type: 'file',
      title,
      description,
      url,
      file_size,
      folder_id: folderCheck.folderId
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
 * Crear nuevo contenido de tipo IMAGE: una imagen más en la lista de
 * contenido del curso (no una portada), para decorar/ilustrar. Mismo
 * patrón que video/file: archivo obligatorio.
 */
export const createImageContent = async (req, res) => {
  try {
    const { course_id, title, description, folder_id } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'La imagen es requerida'
      });
    }

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      deleteFile(`/uploads/content-images/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
    }

    const url = `/uploads/content-images/${req.file.filename}`;
    const file_size = req.file.size;

    const contentId = await Content.create({
      course_id,
      type: 'image',
      title,
      description,
      url,
      file_size,
      folder_id: folderCheck.folderId
    });

    res.status(201).json({
      success: true,
      message: 'Imagen agregada exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error('Error al crear contenido de imagen:', error);
    if (req.file) {
      deleteFile(`/uploads/content-images/${req.file.filename}`);
    }
    res.status(500).json({
      success: false,
      message: 'Error al agregar la imagen'
    });
  }
};

/**
 * Crear nuevo contenido de tipo TEXT: sin archivo, el contenido en sí es
 * el texto guardado en `description`.
 */
export const createTextContent = async (req, res) => {
  try {
    const { course_id, title, description, folder_id } = req.body;

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

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
    }

    const contentId = await Content.create({
      course_id,
      type: 'text',
      title,
      description,
      url: null,
      folder_id: folderCheck.folderId
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
    const { course_id, title, description, url, folder_id } = req.body;

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

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
    }

    const contentId = await Content.create({
      course_id,
      type: 'url',
      title,
      description,
      url: String(url).trim(),
      folder_id: folderCheck.folderId
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
    const { course_id, title, description, folder_id } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      if (req.file) deleteFile(`/uploads/files/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
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
      file_size,
      folder_id: folderCheck.folderId
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
    const { course_id, title, description, folder_id } = req.body;

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

    const folderCheck = await resolveFolderId(folder_id, course_id);
    if (!folderCheck.ok) {
      return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
    }

    const contentId = await Content.create({
      course_id,
      type: 'forum',
      title,
      description,
      url: null,
      folder_id: folderCheck.folderId
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
 * Crear una carpeta: solo agrupa otro contenido del mismo curso (video,
 * archivo, texto, URL, tarea o foro) bajo su folder_id — no lleva url ni
 * texto propio. Una carpeta nunca puede tener folder_id (no hay
 * subcarpetas, un solo nivel de anidamiento).
 */
export const createFolderContent = async (req, res) => {
  try {
    const { course_id, title } = req.body;

    if (!course_id || !title) {
      return res.status(400).json({
        success: false,
        message: 'El ID del curso y el título son requeridos'
      });
    }

    const contentId = await Content.create({
      course_id,
      type: 'folder',
      title,
      description: null,
      url: null,
      folder_id: null
    });

    res.status(201).json({
      success: true,
      message: 'Carpeta creada exitosamente',
      data: { id: contentId }
    });
  } catch (error) {
    console.error('Error al crear la carpeta:', error);
    res.status(500).json({
      success: false,
      message: 'Error al crear la carpeta'
    });
  }
};

/**
 * Actualizar contenido (solo admin)
 */
export const updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order_index, url, folder_id } = req.body;

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

    // Mover el contenido a otra carpeta (o sacarlo con folder_id: null).
    // Una carpeta no puede meterse dentro de otra (un solo nivel).
    if (folder_id !== undefined) {
      if (content.type === 'folder') {
        return res.status(400).json({
          success: false,
          message: 'Una carpeta no puede estar dentro de otra carpeta'
        });
      }
      const folderCheck = await resolveFolderId(folder_id, content.course_id);
      if (!folderCheck.ok) {
        return res.status(400).json({ success: false, message: 'La carpeta indicada no existe en este curso' });
      }
      updateData.folder_id = folderCheck.folderId;
    }

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
      } else if (content.type === 'image') {
        updateData.url = `/uploads/content-images/${req.file.filename}`;
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

    // Una carpeta con contenido adentro no se borra de un tirón (evita
    // perder por accidente tareas con entregas, u otro contenido, que
    // estaban agrupados ahí) — hay que vaciarla o mover su contenido antes.
    if (content.type === 'folder') {
      const hasChildren = await Content.hasChildren(id);
      if (hasChildren) {
        return res.status(400).json({
          success: false,
          message: 'La carpeta todavía tiene contenido adentro. Vacíala (muévelo o bórralo) antes de eliminarla.'
        });
      }
    }

    // Eliminar archivo físico (type='url' no tiene archivo local, es un
    // link externo — no hay nada que borrar del disco).
    if (content.url && content.type !== 'url') {
      deleteFile(content.url);
    }

    // Si es una tarea, también hay que borrar del disco el archivo de
    // cada entrega ANTES de borrar la tarea — la fila en task_submissions
    // se borra sola en cascada (FK ON DELETE CASCADE), pero el archivo
    // subido no, y quedaba huérfano en /uploads/submissions.
    if (content.type === 'task') {
      const submissions = await TaskSubmission.findAllByContent(id);
      submissions.forEach(submission => deleteFile(submission.file_url));
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

    const blockedReason = uncompletableReason(content.type);
    if (blockedReason) {
      return res.status(400).json({ success: false, message: blockedReason });
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

    // Misma regla que al marcar como completado.
    const blockedReason = uncompletableReason(content.type);
    if (blockedReason) {
      return res.status(400).json({ success: false, message: blockedReason });
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