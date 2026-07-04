import pool from '../config/db.js';

class Course {
  /**
   * Obtener todos los cursos activos
   */
  static async findAll() {
    const [rows] = await pool.query(
      `SELECT c.*, u.name as instructor_name, 
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count
       FROM courses c 
       LEFT JOIN users u ON c.instructor_id = u.id 
       WHERE c.is_active = TRUE 
       ORDER BY c.created_at DESC`
    );
    return rows;
  }

  /**
   * Obtener todos los cursos (incluyendo inactivos) - solo para admin
   */
  static async findAllForAdmin() {
    const [rows] = await pool.query(
      `SELECT c.*, u.name as instructor_name,
       (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id) as enrolled_count,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count
       FROM courses c 
       LEFT JOIN users u ON c.instructor_id = u.id 
       ORDER BY c.created_at DESC`
    );
    return rows;
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
   * Actualizar progreso de un usuario en un curso
   */
  static async updateProgress(courseId, userId, progress) {
    const [result] = await pool.query(
      'UPDATE enrollments SET progress = ? WHERE course_id = ? AND user_id = ?',
      [progress, courseId, userId]
    );
    return result.affectedRows > 0;
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