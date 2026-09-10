import pool from '../config/db.js';

class Course {
  /**
   * Query compartida por findAll/findAllForAdmin — la única diferencia
   * real entre ambas es si se filtra por is_active, así que se arma acá
   * una sola vez en vez de mantener dos copias del mismo SELECT (con el
   * riesgo de que alguna quede desactualizada si se agrega una columna).
   *
   * `scope` (solo lo usa el admin, ver findAllForAdmin) distingue cursos
   * top-level de cursos hijo de un módulo, para la tabla separada de
   * "Módulos" en el panel admin: 'top' → solo padres, 'children' → solo
   * hijos, undefined → sin filtrar (comportamiento de siempre).
   */
  static async _findPaginated({ page, limit, search, activeOnly, scope }) {
    const offset = (page - 1) * limit;
    const conditions = [];
    const searchParams = [];
    if (activeOnly) conditions.push('c.is_active = TRUE');
    // Un curso hijo de un módulo (ver resolveEnrollmentRoot) no es
    // inscribible por su cuenta — no debe listarse suelto en el catálogo
    // público ni en "mis cursos". `findAllForAdmin` (activeOnly=false) sigue
    // mostrando todo por defecto, para que el admin pueda gestionarlos
    // directamente — salvo que pida un `scope` puntual (ver arriba).
    if (activeOnly) conditions.push('c.parent_module_id IS NULL');
    if (scope === 'top') conditions.push('c.parent_module_id IS NULL');
    if (scope === 'children') conditions.push('c.parent_module_id IS NOT NULL');
    if (search) {
      conditions.push('(c.title LIKE ? OR c.description LIKE ?)');
      searchParams.push(`%${search}%`, `%${search}%`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Mismo LEFT JOIN que findById, para poder mostrar a qué curso padre/
    // módulo pertenece un curso hijo (tabla "Módulos" del panel admin) sin
    // pedirlo aparte por cada fila — para un curso top-level queda NULL,
    // inofensivo.
    const [rows] = await pool.query(
      `SELECT c.*,
       (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM course_teachers ct INNER JOIN users u ON u.id = ct.user_id WHERE ct.course_id = c.id) as teacher_names,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count,
       cm.title as module_title, pc.id as parent_course_id, pc.title as parent_course_title
       FROM courses c
       LEFT JOIN course_modules cm ON cm.id = c.parent_module_id
       LEFT JOIN courses pc ON pc.id = cm.course_id
       ${where}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...searchParams, limit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM courses c ${where}`,
      searchParams
    );

    return { rows, total: countRows[0].total };
  }

  /**
   * Obtener cursos activos, paginados y con búsqueda opcional por
   * título/descripción. Devuelve también el total de cursos que
   * cumplen el filtro (sin paginar), para que el cliente pueda
   * calcular el número de páginas.
   */
  static async findAll({ page = 1, limit = 12, search = '' } = {}) {
    return Course._findPaginated({ page, limit, search, activeOnly: true });
  }

  /**
   * Igual que findAll, pero incluyendo cursos inactivos - solo para admin.
   * `scope` ('top'|'children') filtra la tabla separada de "Módulos" del
   * panel admin — ver _findPaginated.
   */
  static async findAllForAdmin({ page = 1, limit = 12, search = '', scope } = {}) {
    return Course._findPaginated({ page, limit, search, activeOnly: false, scope });
  }

  /**
   * Obtener curso por ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT c.*,
       (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM course_teachers ct INNER JOIN users u ON u.id = ct.user_id WHERE ct.course_id = c.id) as teacher_names,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = COALESCE(pc.id, c.id)) as enrolled_count,
       pc.id as parent_course_id, pc.title as parent_course_title
       FROM courses c
       LEFT JOIN course_modules cm ON cm.id = c.parent_module_id
       LEFT JOIN courses pc ON pc.id = cm.course_id
       WHERE c.id = ?`,
      [id]
    );
    return rows[0];
  }

  /**
   * Crear un nuevo curso
   */
  static async create({ title, description, thumbnail, instructor_id, certificate_style, parent_module_id }) {
    const [result] = await pool.query(
      'INSERT INTO courses (title, description, thumbnail, instructor_id, certificate_style, parent_module_id) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, thumbnail || null, instructor_id, certificate_style || 'classic', parent_module_id || null]
    );
    return result.insertId;
  }

  /**
   * Actualizar curso
   */
  static async update(id, { title, description, thumbnail, is_active, certificate_style }) {
    const fields = [];
    const values = [];

    if (title !== undefined) {
      fields.push('title = ?');
      values.push(title);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }
    if (thumbnail !== undefined) {
      fields.push('thumbnail = ?');
      values.push(thumbnail);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(is_active);
    }
    if (certificate_style !== undefined) {
      fields.push('certificate_style = ?');
      values.push(certificate_style);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Vincula (o desvincula, con moduleId null) un curso a un módulo — usado
   * para "desanidar" un curso hijo de vuelta a curso top-level
   * independiente (courseModule.controller.js#removeModuleCourse). No
   * valida que moduleId exista o pertenezca a este curso: eso lo hace el
   * controller, mismo criterio que setTeacherModuleScope.
   */
  static async setParentModule(courseId, moduleId) {
    const [result] = await pool.query(
      'UPDATE courses SET parent_module_id = ? WHERE id = ?',
      [moduleId, courseId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Eliminar curso
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM courses WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Verifica si un usuario es profesor asignado a un curso.
   */
  static async isUserTeacher(courseId, userId) {
    const [rows] = await pool.query(
      'SELECT id FROM course_teachers WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    return rows.length > 0;
  }

  /**
   * A diferencia de isUserTeacher (¿está asignado al curso, sin importar en
   * qué rol? — usado para acceso de lectura), esto decide si puede GESTIONAR
   * contenido puntual: un profesor sin module_id (NULL) es "de todo el
   * curso" y puede con cualquier folderId (incluido null/nivel superior);
   * uno con module_id solo puede si folderId coincide exactamente con su
   * módulo. Sin fila en course_teachers, no puede nada (el admin se maneja
   * aparte, en requireCourseManager).
   */
  static async canManageContent(courseId, userId, folderId) {
    const [rows] = await pool.query(
      'SELECT module_id FROM course_teachers WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    if (rows.length === 0) return false;
    if (rows[0].module_id === null) return true;
    return folderId != null && String(rows[0].module_id) === String(folderId);
  }

  /**
   * Escopea (o quita el escopeo de) un profesor YA asignado al curso a un
   * módulo puntual — moduleId null lo vuelve profesor de todo el curso de
   * nuevo. No valida que moduleId sea una carpeta de este curso: eso lo hace
   * el controller (mismo criterio que resolveFolderId en content.controller.js).
   */
  static async setTeacherModuleScope(courseId, userId, moduleId) {
    const [result] = await pool.query(
      'UPDATE course_teachers SET module_id = ? WHERE course_id = ? AND user_id = ?',
      [moduleId, courseId, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Determina si un usuario puede acceder al contenido real (URLs de
   * video/archivo) de un curso: admin, inscrito, o profesor asignado a
   * ese curso. Centraliza el criterio de acceso usado en varios
   * endpoints de curso/contenido para no repetirlo (y no
   * desincronizarlo) en cada uno — `user` es el objeto de sesión
   * (`req.session.user`) o null/undefined si no hay sesión.
   */
  static async canAccessMedia(courseId, user) {
    if (!user) return false;
    if (user.role === 'admin' || user.admin_access) return true;

    const [enrolled, isTeacher] = await Promise.all([
      Course.isUserEnrolled(courseId, user.id),
      Course.isUserTeacher(courseId, user.id)
    ]);

    return enrolled || isTeacher;
  }

  /**
   * Reemplaza por completo la lista de profesores asignados a un curso —
   * mismo espíritu simple que Content.reorder: el admin manda la lista
   * final, no altas/bajas individuales. Se borran solo los que ya no están
   * en la lista y se insertan solo los nuevos (INSERT IGNORE, protegido por
   * el UNIQUE de (course_id, user_id)) para no pisar el `assigned_at` de un
   * profesor que ya estaba asignado y sigue estándolo. Todo en una sola
   * transacción para que un teacherId inválido no deje el curso a medio
   * actualizar.
   */
  static async assignTeachers(courseId, teacherIds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (teacherIds.length > 0) {
        await connection.query(
          'DELETE FROM course_teachers WHERE course_id = ? AND user_id NOT IN (?)',
          [courseId, teacherIds]
        );
        const values = teacherIds.map((teacherId) => [courseId, teacherId]);
        await connection.query(
          'INSERT IGNORE INTO course_teachers (course_id, user_id) VALUES ?',
          [values]
        );
      } else {
        await connection.query('DELETE FROM course_teachers WHERE course_id = ?', [courseId]);
      }

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Obtener los profesores asignados a un curso.
   */
  static async getCourseTeachers(courseId) {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, ct.module_id
       FROM course_teachers ct
       INNER JOIN users u ON u.id = ct.user_id
       WHERE ct.course_id = ?
       ORDER BY u.name ASC`,
      [courseId]
    );
    return rows;
  }

  /**
   * Obtener los cursos donde un usuario está asignado como profesor.
   */
  static async getCoursesForTeacher(userId) {
    const [rows] = await pool.query(
      `SELECT c.*,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count
       FROM course_teachers ct
       INNER JOIN courses c ON c.id = ct.course_id
       WHERE ct.user_id = ?
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return rows;
  }

  /**
   * Si `courseId` es un curso hijo de un módulo (courses.parent_module_id),
   * devuelve el course_id del curso PADRE — el único que realmente tiene
   * inscripción/progreso/certificado (ver Módulos con cursos anidados: una
   * sola inscripción en el padre da acceso a todos sus cursos hijo). Si no
   * es un curso hijo, devuelve el mismo id sin tocar. Un solo JOIN, sin
   * recursión: un curso hijo nunca puede a su vez alojar sus propios
   * módulos (ver courseModule.controller.js#createModule), así que la
   * jerarquía nunca pasa de un nivel.
   */
  static async resolveEnrollmentRoot(courseId) {
    const [rows] = await pool.query(
      `SELECT cm.course_id as parent_id
       FROM courses c
       INNER JOIN course_modules cm ON cm.id = c.parent_module_id
       WHERE c.id = ?`,
      [courseId]
    );
    return rows.length > 0 ? rows[0].parent_id : courseId;
  }

  /**
   * Todos los course_id que cuentan para el progreso/certificado combinado
   * de `rootCourseId` (que debe ser ya una raíz — ver resolveEnrollmentRoot):
   * el propio curso, más todos los cursos hijo de sus módulos.
   */
  static async getProgressGroupIds(rootCourseId) {
    const [rows] = await pool.query(
      `SELECT c.id
       FROM courses c
       INNER JOIN course_modules cm ON cm.id = c.parent_module_id
       WHERE cm.course_id = ?`,
      [rootCourseId]
    );
    return [rootCourseId, ...rows.map((r) => r.id)];
  }

  /**
   * Verificar si un usuario está inscrito en un curso. Resuelve la raíz
   * primero: si `courseId` es un curso hijo, la inscripción real vive en el
   * curso padre (ver resolveEnrollmentRoot), no hay fila propia para el
   * hijo. Como canAccessMedia y ~6 puntos más del código llaman a este
   * método (o a canAccessMedia) para decidir acceso, este único cambio
   * propaga el comportamiento correcto a todos sin tocarlos uno por uno.
   */
  static async isUserEnrolled(courseId, userId) {
    const rootId = await Course.resolveEnrollmentRoot(courseId);
    const [rows] = await pool.query(
      'SELECT id FROM enrollments WHERE course_id = ? AND user_id = ?',
      [rootId, userId]
    );
    return rows.length > 0;
  }

  /**
   * Obtener el registro de inscripción de un usuario en un curso
   * (progreso, fecha de inscripción, fecha de finalización si aplica).
   * Resuelve la raíz igual que isUserEnrolled.
   */
  static async getEnrollment(courseId, userId) {
    const rootId = await Course.resolveEnrollmentRoot(courseId);
    const [rows] = await pool.query(
      'SELECT id, progress, enrolled_at, completed_at FROM enrollments WHERE course_id = ? AND user_id = ?',
      [rootId, userId]
    );
    return rows[0];
  }

  /**
   * Obtener los estudiantes inscritos en un curso junto con su progreso
   * (vista de instructor/admin), paginado — devuelve también el total sin
   * paginar para que el cliente pueda calcular el número de páginas.
   * Resuelve la raíz: si `courseId` es un curso hijo, la inscripción real
   * está en el padre — sin esto, un profesor de módulo entrando a "Ver
   * estudiantes" de su curso hijo vería la lista vacía. El `progress`
   * devuelto es el COMBINADO del padre completo, no específico de este
   * curso hijo — el controller lo reemplaza por el progreso puntual del
   * hijo cuando corresponde (ver getCourseStudents).
   */
  static async getEnrolledStudents(courseId, { page = 1, limit = 20 } = {}) {
    const rootId = await Course.resolveEnrollmentRoot(courseId);
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.last_login, e.progress, e.enrolled_at, e.completed_at
       FROM enrollments e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.course_id = ?
       ORDER BY e.progress DESC, u.name ASC
       LIMIT ? OFFSET ?`,
      [rootId, limit, offset]
    );

    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?',
      [rootId]
    );

    return { rows, total: countRows[0].total };
  }

  /**
   * Inscribir un usuario en un curso
   */
  static async enrollUser(courseId, userId) {
    try {
      const [result] = await pool.query(
        'INSERT INTO enrollments (course_id, user_id) VALUES (?, ?)',
        [courseId, userId]
      );
      return result.insertId;
    } catch (error) {
      // Si ya está inscrito (UNIQUE constraint), retornar null
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Desinscribir un usuario de un curso. El DELETE de enrollments y la
   * limpieza de content_progress van en una sola transacción: si el
   * proceso muriera entre los dos pasos, quedaría la inscripción borrada
   * pero el progreso viejo intacto — reapareciendo si el usuario vuelve a
   * inscribirse, exactamente el bug que este código dice evitar.
   */
  static async unenrollUser(courseId, userId) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        'DELETE FROM enrollments WHERE course_id = ? AND user_id = ?',
        [courseId, userId]
      );

      if (result.affectedRows > 0) {
        // Limpia también el progreso de este usuario en los contenidos del
        // curso. Sin esto, si vuelve a inscribirse más adelante, el detalle
        // del curso seguía mostrando contenidos viejos ya tildados como
        // completados aunque el progreso general mostrara 0%.
        await connection.query(
          `DELETE cp FROM content_progress cp
           INNER JOIN contents co ON co.id = cp.content_id
           WHERE co.course_id = ? AND cp.user_id = ?`,
          [courseId, userId]
        );
      }

      await connection.commit();
      return result.affectedRows > 0;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Estadísticas globales para el dashboard de admin: totales agregados
   * en una sola consulta, en vez de traer todos los cursos al cliente
   * para sumarlos ahí (que además ya no es viable con la lista paginada).
   */
  static async getGlobalStats() {
    const [rows] = await pool.query(
      `SELECT
        COUNT(*) as total_courses,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_courses,
        (SELECT COUNT(*) FROM contents) as total_contents,
        (SELECT COUNT(*) FROM enrollments) as total_enrollments
       FROM courses`
    );
    return rows[0];
  }

  /**
   * Obtener estadísticas de un curso
   */
  static async getStats(courseId) {
    const [rows] = await pool.query(
      `SELECT 
        (SELECT COUNT(*) FROM enrollments WHERE course_id = ?) as total_enrollments,
        (SELECT COUNT(*) FROM contents WHERE course_id = ?) as total_contents,
        (SELECT AVG(progress) FROM enrollments WHERE course_id = ?) as avg_progress
      `,
      [courseId, courseId, courseId]
    );
    return rows[0];
  }
}

export default Course;