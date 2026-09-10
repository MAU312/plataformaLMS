import Course from '../models/Course.js';
import CourseModule from '../models/CourseModule.js';
import { deleteFile } from '../middlewares/upload.middleware.js';
import { isValidCertificateStyle, DEFAULT_CERTIFICATE_STYLE } from '../utils/certificate.js';
import { resolveValidTeacherIds } from './course.controller.js';
import { t } from '../utils/i18n.js';

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
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.module_title_required') });
    }

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.course_not_found') });
    }

    // Nesting de un solo nivel: un curso que YA es hijo de un módulo no
    // puede alojar sus propios módulos. requireCourseManager (en la ruta)
    // solo confirma "¿puede gestionar este course_id?" — un profesor de
    // módulo SÍ tiene fila propia en course_teachers sobre su curso hijo,
    // así que pasaría ese chequeo igual; esta regla de negocio vive acá.
    if (course.parent_module_id) {
      return res.status(400).json({
        success: false,
        message: t(req.locale, 'errors.course_already_in_module')
      });
    }

    const moduleId = await CourseModule.create({ course_id: id, title: title.trim() });

    res.status(201).json({
      success: true,
      message: t(req.locale, 'success.module_created'),
      data: { id: moduleId }
    });
  } catch (error) {
    console.error('Error al crear módulo:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.create_module_failed') });
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
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.course_not_found') });
    }

    const modules = await CourseModule.findByCourse(id);
    res.json({ success: true, data: modules });
  } catch (error) {
    console.error('Error al obtener módulos del curso:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.get_course_modules_failed') });
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
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.module_not_found') });
    }

    if (title !== undefined && !title.trim()) {
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.module_title_required') });
    }

    await CourseModule.update(moduleId, {
      title: title !== undefined ? title.trim() : undefined,
      order_index
    });

    res.json({ success: true, message: t(req.locale, 'success.module_updated') });
  } catch (error) {
    console.error('Error al actualizar módulo:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.update_module_failed') });
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
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.module_not_found') });
    }

    const hasChildren = await CourseModule.hasChildCourses(moduleId);
    if (hasChildren) {
      return res.status(400).json({
        success: false,
        message: t(req.locale, 'errors.module_not_empty')
      });
    }

    await CourseModule.delete(moduleId);
    res.json({ success: true, message: t(req.locale, 'success.module_deleted') });
  } catch (error) {
    console.error('Error al eliminar módulo:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.delete_module_failed') });
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
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.module_not_found') });
    }

    if (!title) {
      if (req.file) deleteFile(`/uploads/thumbnails/${req.file.filename}`);
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.title_required') });
    }

    if (certificate_style !== undefined && certificate_style !== '' && !isValidCertificateStyle(certificate_style)) {
      if (req.file) deleteFile(`/uploads/thumbnails/${req.file.filename}`);
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.invalid_certificate_style') });
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
      message: t(req.locale, 'success.module_course_created'),
      data: { id: courseId }
    });
  } catch (error) {
    console.error('Error al crear curso dentro del módulo:', error);
    if (req.file) {
      deleteFile(`/uploads/thumbnails/${req.file.filename}`);
    }
    res.status(500).json({ success: false, message: t(req.locale, 'errors.create_module_course_failed') });
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
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.module_not_found') });
    }

    const childCourse = await Course.findById(childId);
    if (!childCourse || String(childCourse.parent_module_id) !== String(moduleId)) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.course_not_in_module') });
    }

    await Course.setParentModule(childId, null);
    res.json({ success: true, message: t(req.locale, 'success.module_course_unlinked') });
  } catch (error) {
    console.error('Error al desvincular curso del módulo:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.unlink_module_course_failed') });
  }
};
