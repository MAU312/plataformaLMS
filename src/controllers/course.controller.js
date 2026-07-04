import Course from '../models/Course.js';
import User from '../models/User.js';
import { deleteFile } from '../middlewares/upload.middleware.js';

/**
 * Obtener todos los cursos
 */
export const getAllCourses = async (req, res) => {
  try {
    // Si es admin, mostrar todos los cursos, sino solo activos
    const isAdmin = req.session?.user?.role === 'admin';
    const courses = isAdmin 
      ? await Course.findAllForAdmin() 
      : await Course.findAll();

    res.json({
      success: true,
      data: courses
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
    const contents = await Course.getContents(id);
    
    // Verificar si el usuario está inscrito (si hay sesión activa)
    let isEnrolled = false;
    if (req.session?.user) {
      isEnrolled = await Course.isUserEnrolled(id, req.session.user.id);
    }

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
 * Crear nuevo curso (solo admin)
 */
export const createCourse = async (req, res) => {
  try {
    const { title, description } = req.body;
    const instructor_id = req.session.user.id;

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
      instructor_id
    });

    res.status(201).json({
      success: true,
      message: 'Curso creado exitosamente',
      data: { id: courseId }
    });
  } catch (error) {
    console.error('Error al crear curso:', error);
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
    const { title, description, is_active } = req.body;

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
      // Eliminar miniatura anterior si existe
      if (course.thumbnail) {
        deleteFile(course.thumbnail);
      }
      updateData.thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    const updated = await Course.update(id, updateData);

    if (updated) {
      res.json({
        success: true,
        message: 'Curso actualizado exitosamente'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el curso'
      });
    }
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
 * Actualizar progreso en un curso
 */
export const updateProgress = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress } = req.body;
    const userId = req.session.user.id;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'El progreso debe estar entre 0 y 100'
      });
    }

    const updated = await Course.updateProgress(id, userId, progress);

    if (updated) {
      res.json({
        success: true,
        message: 'Progreso actualizado'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'No se pudo actualizar el progreso'
      });
    }
  } catch (error) {
    console.error('Error al actualizar progreso:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar progreso'
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