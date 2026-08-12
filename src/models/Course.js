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
      `SELECT c.*, u.name as instructor_name,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
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
      `SELECT c.*, u.name as instructor_name,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count
       FROM courses c
       LEFT JOIN users u ON c.instructor_id = u.id
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
      `SELECT c.*, u.name as instructor_name,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count
       FROM courses c 
       LEFT JOIN users u ON c.instructor_id = u.id 
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
   * Placeholder hasta que exista la tabla course_teachers (ver Fase 2 de
   * asignación profesor↔curso): por ahora siempre false, así un 'teacher'
   * todavía no tiene acceso de edición a ningún curso.
   */
  static async isUserTeacher(courseId, userId) {
    return false;
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