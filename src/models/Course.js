import pool from '../config/db.js';

class Course {
  /**
   * Obtener cursos activos, paginados y con búsqueda opcional por
   * título/descripción. Devuelve también el total de cursos que
   * cumplen el filtro (sin paginar), para que el cliente pueda
   * calcular el número de páginas.
   */
  static async findAll({ page = 1, limit = 12, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const where = search ? 'WHERE c.is_active = TRUE AND (c.title LIKE ? OR c.description LIKE ?)' : 'WHERE c.is_active = TRUE';
    const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

    const [rows] = await pool.query(
      `SELECT c.*,
       (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM course_teachers ct INNER JOIN users u ON u.id = ct.user_id WHERE ct.course_id = c.id) as teacher_names,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count
       FROM courses c
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
   * Igual que findAll, pero incluyendo cursos inactivos - solo para admin.
   */
  static async findAllForAdmin({ page = 1, limit = 12, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const where = search ? 'WHERE (c.title LIKE ? OR c.description LIKE ?)' : '';
    const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

    const [rows] = await pool.query(
      `SELECT c.*,
       (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM course_teachers ct INNER JOIN users u ON u.id = ct.user_id WHERE ct.course_id = c.id) as teacher_names,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count
       FROM courses c
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
   * Obtener curso por ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT c.*,
       (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM course_teachers ct INNER JOIN users u ON u.id = ct.user_id WHERE ct.course_id = c.id) as teacher_names,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count
       FROM courses c
       WHERE c.id = ?`,
      [id]
    );
    return rows[0];
  }

  /**
   * Crear un nuevo curso
   */
  static async create({ title, description, thumbnail, instructor_id }) {
    const [result] = await pool.query(
      'INSERT INTO courses (title, description, thumbnail, instructor_id) VALUES (?, ?, ?, ?)',
      [title, description, thumbnail || null, instructor_id]
    );
    return result.insertId;
  }

  /**
   * Actualizar curso
   */
  static async update(id, { title, description, thumbnail, is_active }) {
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

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = ?`,
      values
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
   * Obtener contenidos de un curso
   */
  static async getContents(courseId) {
    const [rows] = await pool.query(
      'SELECT * FROM contents WHERE course_id = ? ORDER BY order_index ASC',
      [courseId]
    );
    return rows;
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
   * Reemplaza por completo la lista de profesores asignados a un curso
   * (borra los anteriores e inserta los nuevos) — mismo espíritu simple
   * que Content.reorder: el admin manda la lista final, no altas/bajas
   * individuales.
   */
  static async assignTeachers(courseId, teacherIds) {
    await pool.query('DELETE FROM course_teachers WHERE course_id = ?', [courseId]);

    if (teacherIds.length === 0) return true;

    const values = teacherIds.map((teacherId) => [courseId, teacherId]);
    await pool.query(
      'INSERT INTO course_teachers (course_id, user_id) VALUES ?',
      [values]
    );
    return true;
  }

  /**
   * Obtener los profesores asignados a un curso.
   */
  static async getCourseTeachers(courseId) {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email
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
   * Verificar si un usuario está inscrito en un curso
   */
  static async isUserEnrolled(courseId, userId) {
    const [rows] = await pool.query(
      'SELECT id FROM enrollments WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    return rows.length > 0;
  }

  /**
   * Obtener el registro de inscripción de un usuario en un curso
   * (progreso, fecha de inscripción, fecha de finalización si aplica).
   */
  static async getEnrollment(courseId, userId) {
    const [rows] = await pool.query(
      'SELECT id, progress, enrolled_at, completed_at FROM enrollments WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    return rows[0];
  }

  /**
   * Obtener los estudiantes inscritos en un curso junto con su progreso
   * (vista de instructor/admin).
   */
  static async getEnrolledStudents(courseId) {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, e.progress, e.enrolled_at, e.completed_at
       FROM enrollments e
       INNER JOIN users u ON u.id = e.user_id
       WHERE e.course_id = ?
       ORDER BY e.progress DESC, u.name ASC`,
      [courseId]
    );
    return rows;
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
   * Desinscribir un usuario de un curso
   */
  static async unenrollUser(courseId, userId) {
    const [result] = await pool.query(
      'DELETE FROM enrollments WHERE course_id = ? AND user_id = ?',
      [courseId, userId]
    );
    return result.affectedRows > 0;
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