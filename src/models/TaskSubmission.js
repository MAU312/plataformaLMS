import pool from '../config/db.js';

class TaskSubmission {
  /**
   * Registrar la entrega de un estudiante para una tarea. El UNIQUE
   * (content_id, user_id) es lo que garantiza "una sola entrega": si ya
   * existía una, el INSERT choca con la constraint y se captura acá
   * devolviendo null en vez de tirar un error genérico — mismo patrón que
   * Course.enrollUser para inscripciones duplicadas.
   */
  static async create(contentId, userId, fileUrl) {
    try {
      const [result] = await pool.query(
        'INSERT INTO task_submissions (content_id, user_id, file_url) VALUES (?, ?, ?)',
        [contentId, userId, fileUrl]
      );
      return result.insertId;
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT * FROM task_submissions WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByContentAndUser(contentId, userId) {
    const [rows] = await pool.query(
      'SELECT * FROM task_submissions WHERE content_id = ? AND user_id = ?',
      [contentId, userId]
    );
    return rows[0];
  }

  /**
   * Todas las entregas de una tarea, con nombre/email del estudiante —
   * vista del profesor para revisar.
   */
  static async findAllByContent(contentId) {
    const [rows] = await pool.query(
      `SELECT ts.*, u.name as student_name, u.email as student_email
       FROM task_submissions ts
       INNER JOIN users u ON u.id = ts.user_id
       WHERE ts.content_id = ?
       ORDER BY ts.submitted_at ASC`,
      [contentId]
    );
    return rows;
  }

  /**
   * Marcar una entrega como revisada, con comentario opcional del
   * profesor. Sin calificación numérica por ahora.
   */
  static async markReviewed(id, feedback) {
    const [result] = await pool.query(
      'UPDATE task_submissions SET feedback = ?, reviewed_at = NOW() WHERE id = ?',
      [feedback || null, id]
    );
    return result.affectedRows > 0;
  }
}

export default TaskSubmission;
