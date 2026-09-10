import Course from '../models/Course.js';
import User from '../models/User.js';
import Content from '../models/Content.js';
import CourseModule from '../models/CourseModule.js';
import TaskSubmission from '../models/TaskSubmission.js';
import { deleteFile } from '../middlewares/upload.middleware.js';
import certificateGenerator, { isValidCertificateStyle, DEFAULT_CERTIFICATE_STYLE } from '../utils/certificate.js';
import { toCsv } from '../utils/csv.js';
import { t } from '../utils/i18n.js';

/**
 * Nombre de archivo seguro a partir de un título/nombre real — sin tildes
 * ni caracteres que rompan un `Content-Disposition` o un nombre de archivo
 * en Windows.
 */
// Marcas diacríticas combinantes (U+0300-U+036F) que quedan sueltas tras
// normalize('NFD') separar una letra acentuada en letra + tilde.
const DIACRITICS_REGEX = /[̀-ͯ]/g;

function slugifyFilename(text) {
  return String(text)
    .normalize('NFD').replace(DIACRITICS_REGEX, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'archivo';
}

/**
 * Obtener cursos paginados (?page, ?limit, ?search, ?scope)
 */
export const getAllCourses = async (req, res) => {
  try {
    // Si es admin, mostrar todos los cursos, sino solo activos
    const isAdmin = req.session?.user?.role === 'admin' || Boolean(req.session?.user?.admin_access);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    // Tope de 50: un límite arbitrariamente alto en la query string no
    // debería poder forzar al servidor a traer/enviar de más.
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const search = String(req.query.search || '').trim();
    // 'top'|'children' distingue cursos normales de cursos hijo de un
    // módulo (tabla "Módulos" del panel admin) — cualquier otro valor se
    // ignora en vez de fallar, igual que un scope ausente. Sin sentido
    // fuera del panel admin: el catálogo público (findAll) ya fuerza
    // top-level por su cuenta.
    const scope = ['top', 'children'].includes(req.query.scope) ? req.query.scope : undefined;

    const { rows, total } = isAdmin
      ? await Course.findAllForAdmin({ page, limit, search, scope })
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
      message: t(req.locale, 'errors.get_courses_failed')
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
        message: t(req.locale, 'errors.course_not_found')
      });
    }

    // Obtener contenidos del curso
    const rawContents = await Content.findByCourse(id);

    // Verificar si el usuario está inscrito (si hay sesión activa) y traer
    // su inscripción (progreso/certificado). Course.getEnrollment ya
    // resuelve la raíz: si `id` es un curso hijo, esto trae la inscripción
    // REAL del curso padre (progreso combinado de padre + todos sus
    // hermanos), no una fila propia que el hijo nunca tiene — el frontend
    // usa esto para la barra de progreso/certificado en vez de recalcularlo
    // solo con los `contents` de esta página (ver views_course_detail.js).
    let isEnrolled = false;
    let enrollment = null;
    if (req.session?.user) {
      enrollment = (await Course.getEnrollment(id, req.session.user.id)) || null;
      isEnrolled = Boolean(enrollment);
      if (enrollment) {
        // total/completed combinados (padre + todos sus cursos hijo si
        // aplica) — el frontend los usa para la barra "X% (completado/total)"
        // en vez de recalcularlos solo con los `contents` de esta página.
        const groupProgress = await Content.calculateGroupProgress(id, req.session.user.id);
        enrollment.total = groupProgress.total;
        enrollment.completed = groupProgress.completed;
      }
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
        isEnrolled,
        enrollment
      }
    });
  } catch (error) {
    console.error('Error al obtener curso:', error);
    res.status(500).json({
      success: false,
      message: t(req.locale, 'errors.get_course_failed')
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
export async function resolveValidTeacherIds(raw) {
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
 * `teacher_modules` (JSON stringificado, viene por FormData igual que
 * teacher_ids): { "<userId>": <moduleId|null> } — a qué módulo (carpeta)
 * queda escopeado cada profesor YA asignado al curso (ver
 * Course.canManageContent). Un moduleId inválido (no existe, no es una
 * carpeta, o es de otro curso) se ignora en vez de fallar toda la
 * operación, mismo criterio que resolveValidTeacherIds. Solo se aplica a
 * userIds que quedaron en `teacherIds` — un profesor que se está
 * desasignando en la misma petición no tiene sentido escoparlo.
 */
async function resolveTeacherModuleScopes(raw, courseId, teacherIds) {
  if (!raw) return {};

  let map;
  try {
    map = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!map || typeof map !== 'object' || Array.isArray(map)) return {};

  const teacherIdSet = new Set(teacherIds);
  const result = {};

  for (const [rawUserId, rawModuleId] of Object.entries(map)) {
    const userId = parseInt(rawUserId, 10);
    if (!Number.isInteger(userId) || !teacherIdSet.has(userId)) continue;

    if (rawModuleId === null || rawModuleId === '' || rawModuleId === undefined) {
      result[userId] = null;
      continue;
    }

    const moduleId = parseInt(rawModuleId, 10);
    if (!Number.isInteger(moduleId)) continue;

    const folder = await Content.findById(moduleId);
    if (!folder || folder.type !== 'folder' || String(folder.course_id) !== String(courseId)) continue;

    result[userId] = moduleId;
  }

  return result;
}

/**
 * Crear nuevo curso (solo admin)
 */
export const createCourse = async (req, res) => {
  try {
    const { title, description, certificate_style } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: t(req.locale, 'errors.title_required')
      });
    }

    if (certificate_style !== undefined && certificate_style !== '' && !isValidCertificateStyle(certificate_style)) {
      if (req.file) deleteFile(`/uploads/thumbnails/${req.file.filename}`);
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.invalid_certificate_style') });
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
      instructor_id: null,
      certificate_style: certificate_style || DEFAULT_CERTIFICATE_STYLE
    });

    try {
      const teacherIds = await resolveValidTeacherIds(req.body.teacher_ids);
      await Course.assignTeachers(courseId, teacherIds);
    } catch (assignError) {
      // El curso ya se creó en BD (con el thumbnail ya referenciado). Si
      // asignar profesores falla, se deshace la creación completa en vez
      // de dejar un curso a medias — sin este rollback, el catch de
      // afuera borraría el thumbnail del disco mientras la fila del curso
      // seguía existiendo y apuntando a él.
      await Course.delete(courseId);
      throw assignError;
    }

    res.status(201).json({
      success: true,
      message: t(req.locale, 'success.course_created'),
      data: { id: courseId }
    });
  } catch (error) {
    console.error('Error al crear curso:', error);
    if (req.file) {
      deleteFile(`/uploads/thumbnails/${req.file.filename}`);
    }
    res.status(500).json({
      success: false,
      message: t(req.locale, 'errors.create_course_failed')
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
    const { title, description, is_active, teacher_ids, teacher_modules, certificate_style } = req.body;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: t(req.locale, 'errors.course_not_found')
      });
    }

    if (certificate_style !== undefined && !isValidCertificateStyle(certificate_style)) {
      if (req.file) deleteFile(`/uploads/thumbnails/${req.file.filename}`);
      return res.status(400).json({ success: false, message: t(req.locale, 'errors.invalid_certificate_style') });
    }

    // Preparar datos para actualizar
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    // FormData envía "true"/"false" como string; lo convertimos a 0/1 real
    if (is_active !== undefined) updateData.is_active = toBoolean(is_active) ? 1 : 0;
    if (certificate_style !== undefined) updateData.certificate_style = certificate_style;

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

      // Escopeo por módulo: solo tiene sentido junto con teacher_ids (un
      // profesor recién asignado en esta misma petición ya puede
      // escoparse de una vez). assignTeachers no toca module_id de un
      // profesor que sigue asignado (INSERT IGNORE), así que esto es
      // seguro de aplicar después sin pisar nada innecesariamente.
      if (teacher_modules !== undefined) {
        const scopes = await resolveTeacherModuleScopes(teacher_modules, id, teacherIds);
        for (const [userId, moduleId] of Object.entries(scopes)) {
          await Course.setTeacherModuleScope(id, userId, moduleId);
        }
      }
    }

    res.json({
      success: true,
      message: t(req.locale, 'success.course_updated')
    });
  } catch (error) {
    console.error('Error al actualizar curso:', error);
    res.status(500).json({
      success: false,
      message: t(req.locale, 'errors.update_course_failed')
    });
  }
};

/**
 * Junta las rutas de archivo de UN curso (miniatura, contenidos, entregas
 * de tareas) SIN borrar nada todavía — extraído de deleteCourse para poder
 * reusarlo también por cada curso hijo cuando se borra un curso padre con
 * módulos (ver deleteCourse).
 */
async function collectCourseFilesToDelete(course) {
  const contents = await Content.findByCourse(course.id);
  const submissions = await TaskSubmission.findAllByCourse(course.id);

  const files = [];
  if (course.thumbnail) files.push(course.thumbnail);
  for (const content of contents) {
    if (content.url && content.type !== 'url') files.push(content.url);
  }
  for (const submission of submissions) {
    if (submission.file_url) files.push(submission.file_url);
  }
  return files;
}

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
        message: t(req.locale, 'errors.course_not_found')
      });
    }

    // Recolectar TODAS las rutas de archivo del curso (miniatura, contenidos,
    // entregas de tareas) ANTES de borrar nada — las filas de
    // contents/task_submissions se van solas en cascada (FK ON DELETE
    // CASCADE en course_id/content_id) al borrar el curso, así que hay que
    // leerlas mientras todavía existen. Los archivos en disco recién se
    // borran después de confirmar que el curso se eliminó en BD: si se
    // borraran antes y el DELETE fallara, el curso completo (contenidos,
    // inscripciones, entregas) quedaría en BD apuntando a archivos que ya
    // no existen en disco, sin forma de recuperarlos.
    let filesToDelete = await collectCourseFilesToDelete(course);

    // Un curso con módulos tiene cursos hijo colgando de ellos
    // (courses.parent_module_id → course_modules.id, SIN cascade a
    // propósito — ver plan de "Módulos con cursos anidados"). Si no se
    // borran explícitamente antes, el DELETE del padre fallaría por esa FK
    // al intentar arrastrar en cascada sus course_modules (course_id →
    // courses.id ON DELETE CASCADE) mientras un curso hijo todavía les
    // apunta. Cada hijo se borra con la MISMA lógica de limpieza de
    // archivos que el curso principal, para no dejar huérfanos en disco.
    const modules = await CourseModule.findByCourse(id);
    for (const module of modules) {
      for (const childCourse of module.courses) {
        const childFiles = await collectCourseFilesToDelete(childCourse);
        const childDeleted = await Course.delete(childCourse.id);
        if (childDeleted) filesToDelete = filesToDelete.concat(childFiles);
      }
    }

    const deleted = await Course.delete(id);

    if (!deleted) {
      return res.status(400).json({
        success: false,
        message: t(req.locale, 'errors.delete_course_no_rows')
      });
    }

    filesToDelete.forEach(deleteFile);

    res.json({
      success: true,
      message: t(req.locale, 'success.course_deleted')
    });
  } catch (error) {
    console.error('Error al eliminar curso:', error);
    res.status(500).json({
      success: false,
      message: t(req.locale, 'errors.delete_course_failed')
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
        message: t(req.locale, 'errors.course_not_found')
      });
    }

    // No se puede iniciar una inscripción nueva en un curso desactivado.
    // (Si un estudiante ya estaba inscrito antes de que se desactivara,
    // conserva su acceso; esto solo bloquea inscripciones NUEVAS.)
    if (!course.is_active) {
      return res.status(403).json({
        success: false,
        message: t(req.locale, 'errors.course_not_active')
      });
    }

    // Un curso hijo de un módulo no es inscribible por su cuenta: la
    // inscripción vive SIEMPRE en el curso padre y da acceso a todos sus
    // cursos hijo (ver Course.resolveEnrollmentRoot). Sin este guard, un
    // estudiante que llamara este endpoint directo con el id de un curso
    // hijo (visible en las tarjetas del selector de módulos) crearía una
    // fila fantasma en enrollments que nunca recibe progreso real.
    if (course.parent_module_id) {
      return res.status(400).json({
        success: false,
        message: course.parent_course_title
          ? t(req.locale, 'errors.enroll_in_parent_required_titled', { title: course.parent_course_title })
          : t(req.locale, 'errors.enroll_in_parent_required')
      });
    }

    const enrollmentId = await Course.enrollUser(id, userId);

    if (enrollmentId === null) {
      return res.status(400).json({
        success: false,
        message: t(req.locale, 'errors.already_enrolled')
      });
    }

    res.status(201).json({
      success: true,
      message: t(req.locale, 'success.enrollment_success')
    });
  } catch (error) {
    console.error('Error al inscribir usuario:', error);
    res.status(500).json({
      success: false,
      message: t(req.locale, 'errors.enroll_in_course_failed')
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
        message: t(req.locale, 'success.unenroll_success')
      });
    } else {
      res.status(400).json({
        success: false,
        message: t(req.locale, 'errors.not_enrolled')
      });
    }
  } catch (error) {
    console.error('Error al desinscribir usuario:', error);
    res.status(500).json({
      success: false,
      message: t(req.locale, 'errors.unenroll_failed')
    });
  }
};

/**
 * Obtener cursos inscritos del usuario actual
 */
export const getEnrolledCourses = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
    const { rows: courses, total } = await User.getEnrolledCourses(userId, { page, limit });

    res.json({
      success: true,
      data: courses,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error) {
    console.error('Error al obtener cursos inscritos:', error);
    res.status(500).json({
      success: false,
      message: t(req.locale, 'errors.get_enrolled_courses_failed')
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
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.course_not_found') });
    }

    const enrollment = await Course.getEnrollment(id, userId);
    if (!enrollment || !enrollment.completed_at) {
      return res.status(403).json({
        success: false,
        message: t(req.locale, 'errors.certificate_not_completed')
      });
    }

    const safeTitle = course.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificado-${safeTitle}.pdf"`);

    certificateGenerator.generateCertificate({
      studentName: req.session.user.name,
      courseTitle: course.title,
      completedAt: enrollment.completed_at,
      style: course.certificate_style
    }, res);
  } catch (error) {
    console.error('Error al generar certificado:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: t(req.locale, 'errors.generate_certificate_failed') });
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
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.course_not_found') });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const { rows: students, total } = await Course.getEnrolledStudents(id, { page, limit });

    // Nota final por estudiante (ver Content.calculateCourseGrade) — solo
    // se calcula sobre la página que se está mostrando, no sobre TODO el
    // curso, para no pagar ese costo en cursos con muchos inscritos.
    const grades = await Promise.all(students.map((s) => Content.calculateCourseGrade(id, s.id)));
    students.forEach((s, i) => { s.grade = grades[i]; });

    // Course.getEnrolledStudents ya resuelve la raíz y trae el `progress`
    // COMBINADO del curso padre completo (padre + todos sus cursos hijo).
    // Si `id` es en sí un curso hijo, eso es engañoso para el profesor de
    // módulo que gestiona SOLO ese curso — se reemplaza por el progreso
    // puntual de este curso, sin persistir nada (ver
    // Content.calculateProgressForSingleCourse).
    if (course.parent_module_id) {
      const soloProgress = await Promise.all(
        students.map((s) => Content.calculateProgressForSingleCourse(id, s.id))
      );
      students.forEach((s, i) => { s.progress = soloProgress[i].progress; });
    }

    res.json({
      success: true,
      data: { course, students },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error) {
    console.error('Error al obtener estudiantes del curso:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.get_course_students_failed') });
  }
};

/**
 * GET /api/courses/:id/grades/export
 * Descarga un CSV con la nota final de CADA estudiante inscrito en el
 * curso (el "libro de calificaciones" completo) — a diferencia de
 * getCourseStudents, sin paginar: es una descarga, tiene que traer a
 * todos de una vez.
 */
export const exportCourseGrades = async (req, res) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.course_not_found') });
    }

    const { rows: students } = await Course.getEnrolledStudents(id, { page: 1, limit: 10000 });
    const grades = await Promise.all(students.map((s) => Content.calculateCourseGrade(id, s.id)));

    const csv = toCsv(
      [
        t(req.locale, 'labels.csv_col_name'),
        t(req.locale, 'labels.csv_col_email'),
        t(req.locale, 'labels.csv_col_progress'),
        t(req.locale, 'labels.csv_col_grade')
      ],
      students.map((s, i) => [s.name, s.email, s.progress, grades[i] ?? ''])
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="notas-${slugifyFilename(course.title)}.csv"`);
    // BOM al inicio: sin esto Excel abre el CSV interpretando los acentos
    // mal (no detecta UTF-8 solo, asume la codificación regional).
    res.send('﻿' + csv);
  } catch (error) {
    console.error('Error al exportar las notas del curso:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.export_grades_failed') });
  }
};

/**
 * GET /api/courses/:id/students/:studentId/grades/export
 * Descarga un CSV con el detalle de la nota de UN estudiante puntual:
 * cada tarea/cuestionario calificado, cuánto valía, y cuánto ganó — no
 * solo el número final (ver getCourseStudents/exportCourseGrades para
 * eso), para que el profesor pueda explicarle a un estudiante puntual de
 * dónde sale su nota.
 */
export const exportStudentGrades = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    const course = await Course.findById(id);
    if (!course) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.course_not_found') });
    }
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.student_not_found') });
    }

    const { items, total } = await Content.getCourseGradeBreakdown(id, studentId);

    const rows = items.map((item) => [item.title, item.type, item.weight_percent, item.earned]);
    rows.push([t(req.locale, 'labels.csv_final_grade_label'), '', '', total ?? '']);

    const csv = toCsv(
      [
        t(req.locale, 'labels.csv_col_content'),
        t(req.locale, 'labels.csv_col_type'),
        t(req.locale, 'labels.csv_col_weight'),
        t(req.locale, 'labels.csv_col_earned')
      ],
      rows
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="notas-${slugifyFilename(student.name)}-${slugifyFilename(course.title)}.csv"`);
    res.send('﻿' + csv);
  } catch (error) {
    console.error('Error al exportar la nota del estudiante:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.export_student_grade_failed') });
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
      return res.status(404).json({ success: false, message: t(req.locale, 'errors.course_not_found') });
    }

    const teachers = await Course.getCourseTeachers(id);

    res.json({ success: true, data: { course, teachers } });
  } catch (error) {
    console.error('Error al obtener profesores del curso:', error);
    res.status(500).json({ success: false, message: t(req.locale, 'errors.get_course_teachers_failed') });
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
    res.status(500).json({ success: false, message: t(req.locale, 'errors.get_teaching_courses_failed') });
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
      message: t(req.locale, 'errors.get_global_stats_failed')
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
        message: t(req.locale, 'errors.course_not_found')
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
      message: t(req.locale, 'errors.get_stats_failed')
    });
  }
};