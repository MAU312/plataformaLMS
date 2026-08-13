import Content from '../models/Content.js';
import Course from '../models/Course.js';
import TaskSubmission from '../models/TaskSubmission.js';
import { deleteFile } from '../middlewares/upload.middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Entregar una tarea. La ruta ya validó (antes de multer, para no escribir
 * el archivo si algo de esto falla) que la tarea existe, que es type='task'
 * y que el usuario está inscrito en el curso — ver content.routes.js,
 * que deja el contenido ya cargado en req.taskContent.
 *
 * Una sola entrega por tarea/estudiante: si ya existía una,
 * TaskSubmission.create devuelve null (constraint UNIQUE) y se rechaza
 * sin reemplazar nada. Al entregar con éxito, la tarea se marca
 * completada automáticamente (mismo mecanismo que markContentCompleted)
 * para que cuente en el progreso del curso.
 */
export const submitTask = async (req, res) => {
  try {
    const content = req.taskContent;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'El archivo de entrega es requerido' });
    }

    const fileUrl = `/uploads/submissions/${req.file.filename}`;
    const submissionId = await TaskSubmission.create(content.id, req.session.user.id, fileUrl);

    if (submissionId === null) {
      deleteFile(fileUrl);
      return res.status(400).json({
        success: false,
        message: 'Ya entregaste esta tarea. Solo se permite una entrega.'
      });
    }

    await Content.markCompleted(content.id, req.session.user.id);
    const progress = await Content.recalculateCourseProgress(content.course_id, req.session.user.id);

    res.status(201).json({
      success: true,
      message: 'Tarea entregada exitosamente',
      data: { id: submissionId, ...progress }
    });
  } catch (error) {
    console.error('Error al entregar la tarea:', error);
    if (req.file) {
      deleteFile(`/uploads/submissions/${req.file.filename}`);
    }
    res.status(500).json({ success: false, message: 'Error al entregar la tarea' });
  }
};

/**
 * La propia entrega del usuario autenticado para una tarea (o null si
 * todavía no entregó). Cada quien solo puede ver la suya — no recibe un
 * user_id por parámetro a propósito.
 */
export const getMySubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await TaskSubmission.findByContentAndUser(id, req.session.user.id);
    res.json({ success: true, data: submission || null });
  } catch (error) {
    console.error('Error al obtener la entrega:', error);
    res.status(500).json({ success: false, message: 'Error al obtener la entrega' });
  }
};

/**
 * Todas las entregas de una tarea (vista de admin/profesor para revisar).
 * Autorización resuelta en la ruta con requireCourseManager.
 */
export const listSubmissions = async (req, res) => {
  try {
    const { id } = req.params;

    const content = await Content.findById(id);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
    }

    const submissions = await TaskSubmission.findAllByContent(id);

    res.json({ success: true, data: { content, submissions } });
  } catch (error) {
    console.error('Error al obtener las entregas:', error);
    res.status(500).json({ success: false, message: 'Error al obtener las entregas' });
  }
};

/**
 * Descargar el archivo de una entrega. A diferencia de downloadFile
 * (contenido de curso), aquí NO alcanza con "estar inscrito en el curso"
 * — cualquier estudiante inscrito podría entonces ver las entregas de
 * los demás. Solo puede descargar: admin, el profesor asignado al curso
 * de esa tarea, o el propio estudiante dueño de la entrega.
 */
export const downloadSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await TaskSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Entrega no encontrada' });
    }

    const content = await Content.findById(submission.content_id);
    const isOwner = submission.user_id === req.session.user.id;
    const isAdminUser = req.session.user.role === 'admin';
    const isTeacherOfCourse = content && req.session.user.role === 'teacher'
      && await Course.isUserTeacher(content.course_id, req.session.user.id);

    if (!isOwner && !isAdminUser && !isTeacherOfCourse) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permiso para descargar esta entrega'
      });
    }

    const filePath = path.join(__dirname, '../../', submission.file_url);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Archivo no encontrado en el servidor' });
    }

    res.download(filePath, path.basename(submission.file_url));
  } catch (error) {
    console.error('Error al descargar la entrega:', error);
    res.status(500).json({ success: false, message: 'Error al descargar la entrega' });
  }
};

/**
 * Marcar una entrega como revisada, con comentario opcional. Sin
 * calificación numérica por ahora. Autorización resuelta en la ruta con
 * requireCourseManager.
 */
export const reviewSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { feedback } = req.body;

    const submission = await TaskSubmission.findById(id);
    if (!submission) {
      return res.status(404).json({ success: false, message: 'Entrega no encontrada' });
    }

    await TaskSubmission.markReviewed(id, feedback);

    res.json({ success: true, message: 'Entrega marcada como revisada' });
  } catch (error) {
    console.error('Error al revisar la entrega:', error);
    res.status(500).json({ success: false, message: 'Error al revisar la entrega' });
  }
};
