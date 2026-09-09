import Course from '../models/Course.js';
import CourseModule from '../models/CourseModule.js';
import { deleteFile } from '../middlewares/upload.middleware.js';
import { isValidCertificateStyle, DEFAULT_CERTIFICATE_STYLE } from '../utils/certificate.js';
import { resolveValidTeacherIds } from './course.controller.js';

/**
 * POST /api/courses/:id/modules
 * Crea un módulo dentro de un curso — admin o profesor de TODO el curso
 * (:id), ver requireCourseManager en las rutas. `:id` es siempre el curso
 * PADRE en el que se está creando el módulo.
 */
export const createModule = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'El título del módulo es requerido' });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    }

    // Nesting de un solo nivel: un curso que YA es hijo de un módulo no
    // puede alojar sus propios módulos. requireCourseManager (en la ruta)
    // solo confirma "¿puede gestionar este course_id?" — un profesor de
    // módulo SÍ tiene fila propia en course_teachers sobre su curso hijo,
    // así que pasaría ese chequeo igual; esta regla de negocio vive acá.
    if (course.parent_module_id) {
      return res.status(400).json({
        success: false,
        message: 'Un curso que ya es parte de un módulo no puede tener sus propios módulos'
      });
    }

    const moduleId = await CourseModule.create({ course_id: id, title: title.trim() });

    res.status(201).json({
      success: true,
      message: 'Módulo creado exitosamente',
      data: { id: moduleId }
    });
  } catch (error) {
    console.error('Error al crear módulo:', error);
    res.status(500).json({ success: false, message: 'Error al crear módulo' });
  }
};

/**
 * GET /api/courses/:id/modules
 * Módulos de un curso, con sus cursos hijo — público (mismo criterio que
 * GET /api/courses/:id): un guest puede ver el catálogo y el detalle de un
 * curso sin cuenta, así que también debe poder ver qué módulos/cursos hijo
 * tiene antes de decidir registrarse.
 */
export const getModules = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Curso no encontrado' });
    }

    const modules = await CourseModule.findByCourse(id);
    res.json({ success: true, data: modules });
  } catch (error) {
    console.error('Error al obtener módulos del curso:', error);
    res.status(500).json({ success: false, message: 'Error al obtener módulos del curso' });
  }
};

/**
 * PUT /api/course-modules/:moduleId
 * Admin o profesor de TODO el curso padre del módulo.
 */
export const updateModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, order_index } = req.body;

    const module = await CourseModule.findById(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Módulo no encontrado' });
    }

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ success: false, message: 'El título del módulo es requerido' });
    }

    await CourseModule.update(moduleId, {
      title: title !== undefined ? title.trim() : undefined,
      order_index
    });

    res.json({ success: true, message: 'Módulo actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar módulo:', error);
    res.status(500).json({ success: false, message: 'Error al actualizar módulo' });
  }
};

/**
 * DELETE /api/course-modules/:moduleId
 * Bloqueado si el módulo todavía tiene cursos hijo adentro (mismo criterio
 * que borrar una carpeta con contenido) — hay que vaciarlo primero
 * (borrar o desanidar cada curso hijo).
 */
export const deleteModule = async (req, res) => {
  try {
    const { moduleId } = req.params;

    const module = await CourseModule.findById(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Módulo no encontrado' });
    }

    const hasChildren = await CourseModule.hasChildCourses(moduleId);
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: 'El módulo todavía tiene cursos adentro. Bórralos o desanídalos antes de eliminar el módulo.'
      });
    }

    await CourseModule.delete(moduleId);
    res.json({ success: true, message: 'Módulo eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar módulo:', error);
    res.status(500).json({ success: false, message: 'Error al eliminar módulo' });
  }
};

/**
 * POST /api/course-modules/:moduleId/courses
 * Crea un curso hijo completo dentro de un módulo (portada/título/profesor
 * propios) — mismo flujo que crear un curso normal (course.controller.js
 * createCourse), con `parent_module_id` seteado al crear en vez de un
 * UPDATE aparte, y el mismo rollback si falla la asignación de profesores.
 */
export const createModuleCourse = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { title, description, certificate_style } = req.body;

    const module = await CourseModule.findById(moduleId);
    if (!module) {
      if (req.file) deleteFile(`/uploads/thumbnails/${req.file.filename}`);
      return res.status(404).json({ success: false, message: 'Módulo no encontrado' });
    }

    if (!title) {
      if (req.file) deleteFile(`/uploads/thumbnails/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'El título es requerido' });
    }

    if (certificate_style !== undefined && certificate_style !== '' && !isValidCertificateStyle(certificate_style)) {
      if (req.file) deleteFile(`/uploads/thumbnails/${req.file.filename}`);
      return res.status(400).json({ success: false, message: 'Estilo de certificado inválido' });
    }

    let thumbnail = null;
    if (req.file) {
      thumbnail = `/uploads/thumbnails/${req.file.filename}`;
    }

    const courseId = await Course.create({
      title,
      description,
      thumbnail,
      instructor_id: null,
      certificate_style: certificate_style || DEFAULT_CERTIFICATE_STYLE,
      parent_module_id: moduleId
    });

    try {
      const teacherIds = await resolveValidTeacherIds(req.body.teacher_ids);
      await Course.assignTeachers(courseId, teacherIds);
    } catch (assignError) {
      // Mismo rollback que createCourse: si falla asignar al "profesor de
      // módulo", se deshace la creación completa en vez de dejar un curso
      // hijo a medias sin profesor.
      await Course.delete(courseId);
      throw assignError;
    }

    res.status(201).json({
      success: true,
      message: 'Curso creado dentro del módulo exitosamente',
      data: { id: courseId }
    });
  } catch (error) {
    console.error('Error al crear curso dentro del módulo:', error);
    if (req.file) {
      deleteFile(`/uploads/thumbnails/${req.file.filename}`);
    }
    res.status(500).json({ success: false, message: 'Error al crear curso dentro del módulo' });
  }
};

/**
 * DELETE /api/course-modules/:moduleId/courses/:childId
 * "Desanida" un curso hijo del módulo (vuelve a ser un curso top-level
 * independiente) — NO lo borra, solo le quita el `parent_module_id`. Para
 * borrarlo de verdad se usa el DELETE /api/courses/:id normal (admin-only).
 * Reservado a admin/profesor principal del curso PADRE (no al propio
 * profesor de módulo del hijo — ver requireCourseManager en la ruta,
 * resuelto contra el curso del módulo, no contra :childId).
 */
export const removeModuleCourse = async (req, res) => {
  try {
    const { moduleId, childId } = req.params;

    const module = await CourseModule.findById(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, message: 'Módulo no encontrado' });
    }

    const childCourse = await Course.findById(childId);
    if (!childCourse || String(childCourse.parent_module_id) !== String(moduleId)) {
      return res.status(404).json({ success: false, message: 'Ese curso no pertenece a este módulo' });
    }

    await Course.setParentModule(childId, null);
    res.json({ success: true, message: 'Curso desvinculado del módulo — ahora es un curso independiente' });
  } catch (error) {
    console.error('Error al desvincular curso del módulo:', error);
    res.status(500).json({ success: false, message: 'Error al desvincular curso del módulo' });
  }
};
