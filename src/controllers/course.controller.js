import Course from '../models/Course.js';
import User from '../models/User.js';
import Content from '../models/Content.js';
import TaskSubmission from '../models/TaskSubmission.js';
import { deleteFile } from '../middlewares/upload.middleware.js';
import certificateGenerator from '../utils/certificate.js';

/**
 * Obtener cursos paginados (?page, ?limit, ?search)
 */
export const getAllCourses = async (req, res) => {
  try {
    // Si es admin, mostrar todos los cursos, sino solo activos
    const isAdmin = req.session?.user?.role === 'admin';
    const page = Math.max(1, parseInt(req.query.page) || 1);
    // Tope de 50: un límite arbitrariamente alto en la query string no
    // debería poder forzar al servidor a traer/enviar de más.
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const search = String(req.query.search || '').trim();

    const { rows, total } = isAdmin
      ? await Course.findAllForAdmin({ page, limit, search })
      : await Course.findAll({ page, limit, search });

    res.json({
      success: true,
      data: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error) {
    console.error('Error al obtener cursos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cursos'
    });
  }
};

/**
 * Obtener un curso por ID
 */
export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Obtener contenidos del curso
    const rawContents = await Course.getContents(id);

    // Verificar si el usuario está inscrito (si hay sesión activa)
    let isEnrolled = false;
    if (req.session?.user) {
      isEnrolled = await Course.isUserEnrolled(id, req.session.user.id);
    }
    const canAccessMedia = await Course.canAccessMedia(id, req.session?.user);

    // Igual que en GET /api/contents/course/:courseId: solo admin,
    // inscrito, o profesor asignado recibe las URLs/texto reales de
    // video/archivo/texto. Este endpoint es público (sin isAuthenticated)
    // a propósito para poder navegar el catálogo sin cuenta, así que sin
    // este filtro cualquier visitante anónimo podía obtener las URLs
    // reales de los videos (o el texto completo de una lección) de
    // cualquier curso.
    const contents = canAccessMedia
      ? rawContents
      : rawContents.map(Content.redactForNoAccess);

    res.json({
      success: true,
      data: {
        ...course,
        contents,
        isEnrolled
      }
    });
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener curso'
    });
  }
};

/**
 * A quién se le asigna un curso ya no se decide con un solo "instructor_id"
 * (columna vieja, se deja sin usar): el admin manda una lista de ids en
 * `teacher_ids` (JSON stringificado, viene por FormData) y aquí se filtra
 * contra los usuarios que realmente tienen rol 'teacher' y siguen activos
 * — así un id viejo/inválido/de otro rol simplemente se ignora en vez de
 * fallar toda la operación.
 */
async function resolveValidTeacherIds(raw) {
  if (!raw) return [];

  let ids;
  try {
    ids = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(ids)) return [];

  const numericIds = ids.map((id) => parseInt(id, 10)).filter((id) => Number.isInteger(id));
  if (numericIds.length === 0) return [];

  const teachers = await User.findByRole('teacher');
  const validIds = new Set(teachers.map((t) => t.id));
  return numericIds.filter((id) => validIds.has(id));
}

/**
 * Crear nuevo curso (solo admin)
 */
export const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'El título es requerido'
      });
    }

    // Si se subió una miniatura
    let thumbnail = null;
    if (req.file) {
      thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    const courseId = await Course.create({
      title,
      description,
      thumbnail,
      instructor_id: null
    });

    const teacherIds = await resolveValidTeacherIds(req.body.teacher_ids);
    await Course.assignTeachers(courseId, teacherIds);

    res.status(201).json({
      success: true,
      message: 'Curso creado exitosamente',
      data: { id: courseId }
    });
  } catch (error) {
    console.error('Error al crear curso:', error);
    if (req.file) {
      deleteFile(`/uploads/thumbnails/${req.file.filename}`);
    }
    res.status(500).json({
      success: false,
      message: 'Error al crear curso'
    });
  }
};

/**
 * Convierte valores que llegan como string (desde FormData) a booleano real.
 * FormData siempre manda todo como texto: "true"/"false"/"1"/"0".
 */
function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === '1';
  return Boolean(value);
}

/**
 * Actualizar curso (solo admin)
 */
export const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, is_active, teacher_ids } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    // FormData envía "true"/"false" como string; lo convertimos a 0/1 real
    if (is_active !== undefined) updateData.is_active = toBoolean(is_active) ? 1 : 0;

    // Si se subió nueva miniatura
    if (req.file) {
      updateData.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    if (Object.keys(updateData).length > 0) {
      await Course.update(id, updateData);
    }

    // La miniatura anterior se borra recién después de que el UPDATE
    // confirmó en BD — si se borrara antes y el UPDATE fallara, la BD
    // quedaría apuntando a una imagen que ya no existe en disco.
    if (req.file && course.thumbnail) {
      deleteFile(course.thumbnail);
    }

    // Reemplazo total de profesores asignados, igual que al crear el curso.
    // Solo se toca si el body trae `teacher_ids` (evita borrar la
    // asignación existente en un PUT que no la incluya por accidente).
    if (teacher_ids !== undefined) {
      const teacherIds = await resolveValidTeacherIds(teacher_ids);
      await Course.assignTeachers(id, teacherIds);
    }

    res.json({
      success: true,
      message: 'Curso actualizado exitosamente'
    });
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar curso'
    });
  }
};

/**
 * Eliminar curso (solo admin)
 */
export const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // Eliminar miniatura si existe
    if (course.thumbnail) {
      deleteFile(course.thumbnail);
    }

    // Borrar TODO el resto de archivos del curso antes de borrarlo: las
    // filas de contents/task_submissions se van solas en cascada (FK ON
    // DELETE CASCADE en course_id/content_id), pero eso nunca toca el
    // disco — sin esto, cada video/archivo/instrucciones de tarea del
    // curso, y cada entrega de cada estudiante, quedaba huérfano en
    // /uploads. Mismo criterio que deleteContent (content.controller.js)
    // para un solo contenido, aplicado a todos los contenidos del curso.
    const contents = await Content.findByCourse(id);
    for (const content of contents) {
      if (content.url && content.type !== 'url') {
        deleteFile(content.url);
      }
      if (content.type === 'task') {
        const submissions = await TaskSubmission.findAllByContent(content.id);
        submissions.forEach(submission => deleteFile(submission.file_url));
      }
    }

    const deleted = await Course.delete(id);

    if (deleted) {
      res.json({
        success: true,
        message: 'Curso eliminado exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No se pudo eliminar el curso'
      });
    }
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al eliminar curso'
    });
  }
};

/**
 * Inscribir usuario en un curso
 */
export const enrollCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    // No se puede iniciar una inscripción nueva en un curso desactivado.
    // (Si un estudiante ya estaba inscrito antes de que se desactivara,
    // conserva su acceso; esto solo bloquea inscripciones NUEVAS.)
    if (!course.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Este curso no está disponible actualmente'
      });
    }

    const enrollmentId = await Course.enrollUser(id, userId);

    if (enrollmentId === null) {
      return res.status(400).json({
        success: false,
        message: 'Ya estás inscrito en este curso'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Inscripción exitosa'
    });
  } catch (error) {
    console.error('Error al inscribir usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al inscribir en el curso'
    });
  }
};

/**
 * Desinscribir usuario de un curso
 */
export const unenrollCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const deleted = await Course.unenrollUser(id, userId);

    if (deleted) {
      res.json({
        success: true,
        message: 'Te has desinscrito del curso'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No estás inscrito en este curso'
      });
    }
  } catch (error) {
    console.error('Error al desinscribir usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error al desinscribir del curso'
    });
  }
};

/**
 * Obtener cursos inscritos del usuario actual
 */
export const getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const courses = await User.getEnrolledCourses(userId);

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Error al obtener cursos inscritos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener cursos inscritos'
    });
  }
};

/**
 * Descargar el certificado de finalización de un curso.
 * Solo si el usuario tiene una inscripción con completed_at (llegó al
 * 100% de progreso en algún momento).
 */
export const getCertificate = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.session.user.id;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    }

    const enrollment = await Course.getEnrollment(id, userId);
    if (!enrollment || !enrollment.completed_at) {
      return res.status(403).json({
        success: false,
        message: 'Debes completar el curso al 100% para descargar el certificado'
      });
    }

    const safeTitle = course.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificado-${safeTitle}.pdf"`);

    certificateGenerator.generateCertificate({
      studentName: req.session.user.name,
      courseTitle: course.title,
      completedAt: enrollment.completed_at
    }, res);
  } catch (error) {
    console.error('Error al generar certificado:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Error al generar el certificado' });
    }
  }
};

/**
 * Obtener los estudiantes inscritos en un curso con su progreso
 * (vista de instructor/admin, solo admin).
 */
export const getCourseStudents = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    }

    const students = await Course.getEnrolledStudents(id);

    res.json({ success: true, data: { course, students } });
  } catch (error) {
    console.error('Error al obtener estudiantes del curso:', error);
    res.status(500).json({ success: false, message: 'Error al obtener estudiantes del curso' });
  }
};

/**
 * Obtener los profesores asignados a un curso (admin, o el propio
 * profesor asignado a ese curso — autorización resuelta en la ruta con
 * requireCourseManager).
 */
export const getCourseTeachers = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    }

    const teachers = await Course.getCourseTeachers(id);

    res.json({ success: true, data: { course, teachers } });
  } catch (error) {
    console.error('Error al obtener profesores del curso:', error);
    res.status(500).json({ success: false, message: 'Error al obtener profesores del curso' });
  }
};

/**
 * Cursos donde el usuario autenticado está asignado como profesor.
 */
export const getTeachingCourses = async (req, res) => {
  try {
    const courses = await Course.getCoursesForTeacher(req.session.user.id);
    res.json({ success: true, data: courses });
  } catch (error) {
    console.error('Error al obtener cursos como profesor:', error);
    res.status(500).json({ success: false, message: 'Error al obtener cursos' });
  }
};

/**
 * Estadísticas globales para el dashboard de admin (solo admin)
 */
export const getGlobalStats = async (req, res) => {
  try {
    const stats = await Course.getGlobalStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error al obtener estadísticas globales:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas globales'
    });
  }
};

/**
 * Obtener estadísticas de un curso (solo admin)
 */
export const getCourseStats = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Curso no encontrado'
      });
    }

    const stats = await Course.getStats(id);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};