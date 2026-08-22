import pool from '../config/db.js';

/**
 * Respuestas de un estudiante a un cuestionario/encuesta. Igual que
 * TaskSubmission, "una sola entrega" se garantiza con un UNIQUE (acá por
 * pregunta: unique_answer(question_id, user_id)) — si el insert choca,
 * `submitAnswers` devuelve null en vez de tirar el error, mismo patrón que
 * TaskSubmission.create.
 */
class ContentAnswer {
  static async hasAnswered(contentId, userId) {
    const [rows] = await pool.query(
      'SELECT id FROM content_answers WHERE content_id = ? AND user_id = ? LIMIT 1',
      [contentId, userId]
    );
    return rows.length > 0;
  }

  /**
   * Inserta todas las respuestas de un intento en una sola transacción —
   * o quedan todas, o no queda ninguna (evita un cuestionario "a medio
   * responder" si una pregunta falla a mitad de camino, por ejemplo por
   * la carrera de dos envíos simultáneos del mismo estudiante).
   * `answers`: [{ question_id, option_id, answer_text, is_correct }]
   */
  static async submitAnswers(contentId, userId, answers) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      for (const answer of answers) {
        await connection.query(
          `INSERT INTO content_answers (content_id, question_id, user_id, option_id, answer_text, is_correct)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            contentId,
            answer.question_id,
            userId,
            answer.option_id ?? null,
            answer.answer_text ?? null,
            answer.is_correct === undefined ? null : answer.is_correct
          ]
        );
      }
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  static async findByContentAndUser(contentId, userId) {
    const [rows] = await pool.query(
      `SELECT ca.*, cq.question_text
       FROM content_answers ca
       INNER JOIN content_questions cq ON cq.id = ca.question_id
       WHERE ca.content_id = ? AND ca.user_id = ?
       ORDER BY cq.order_index ASC, cq.id ASC`,
      [contentId, userId]
    );
    return rows;
  }

  /**
   * Todas las respuestas de un content, con nombre/email del estudiante —
   * vista del profesor para ver resultados/calificar respuesta corta.
   */
  static async findAllByContent(contentId) {
    const [rows] = await pool.query(
      `SELECT ca.*, u.name as student_name, u.email as student_email,
              cq.question_text, cq.order_index
       FROM content_answers ca
       INNER JOIN users u ON u.id = ca.user_id
       INNER JOIN content_questions cq ON cq.id = ca.question_id
       WHERE ca.content_id = ?
       ORDER BY ca.user_id ASC, cq.order_index ASC, cq.id ASC`,
      [contentId]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM content_answers WHERE id = ?', [id]);
    return rows[0];
  }

  /**
   * Calificación manual de una respuesta corta (multiple_choice/true_false
   * ya se autocalifican al enviar, esto solo aplica a short_answer).
   */
  static async gradeAnswer(id, isCorrect) {
    const [result] = await pool.query(
      'UPDATE content_answers SET is_correct = ?, graded_at = NOW() WHERE id = ?',
      [isCorrect ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  }
}

export default ContentAnswer;
