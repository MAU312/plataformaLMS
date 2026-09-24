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

  /**
   * Estado de TODOS los cuestionarios/encuestas de un curso para un usuario,
   * en UNA consulta: si ya respondió, el puntaje obtenido/máximo y cuántas
   * respuestas cortas siguen pendientes de revisión. Es lo único que necesita
   * la tarjeta de cada quiz en el detalle del curso — antes el frontend
   * pedía GET /:id/questions una vez POR quiz/encuesta (369 peticiones
   * paralelas en un curso grande) solo para calcular esto en el navegador.
   * `score` y `max_score` están en puntos (content_questions.points).
   */
  static async getStatusByCourse(courseId, userId) {
    const [rows] = await pool.query(
      `SELECT co.id AS content_id,
        (SELECT COUNT(*) FROM content_answers ca WHERE ca.content_id = co.id AND ca.user_id = ?) AS answered_count,
        (SELECT COALESCE(SUM(cq.points), 0) FROM content_questions cq WHERE cq.content_id = co.id) AS max_score,
        (SELECT COALESCE(SUM(cq.points), 0) FROM content_answers ca
           INNER JOIN content_questions cq ON cq.id = ca.question_id
           WHERE ca.content_id = co.id AND ca.user_id = ? AND ca.is_correct = 1) AS score,
        (SELECT COUNT(*) FROM content_answers ca WHERE ca.content_id = co.id AND ca.user_id = ? AND ca.is_correct IS NULL) AS pending_count
       FROM contents co
       WHERE co.course_id = ? AND co.type IN ('quiz', 'survey')`,
      [userId, userId, userId, courseId]
    );
    return rows;
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
   * Una PÁGINA de las respuestas de UNA pregunta (con nombre/email del
   * estudiante) — para la vista de resultados, donde una pregunta de
   * respuesta corta puede tener cientos de respuestas. Ordenadas por
   * user_id, el mismo orden con el que findAllByContent entrega las primeras
   * que ya vienen en /results, así que la página 2 continúa donde termina
   * lo que ya se mostró. `unique_answer(question_id, user_id)` garantiza que
   * user_id no se repite dentro de una pregunta (orden total, sin empates).
   */
  static async findPageByQuestion(questionId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT ca.*, u.name as student_name, u.email as student_email
       FROM content_answers ca
       INNER JOIN users u ON u.id = ca.user_id
       WHERE ca.question_id = ?
       ORDER BY ca.user_id ASC
       LIMIT ? OFFSET ?`,
      [questionId, limit, offset]
    );
    return rows;
  }

  static async countByQuestion(questionId) {
    const [rows] = await pool.query(
      'SELECT COUNT(*) as total FROM content_answers WHERE question_id = ?',
      [questionId]
    );
    return rows[0].total;
  }

  /**
   * Cuántos estudiantes distintos ya respondieron un content — se usa para
   * bloquear la edición de preguntas una vez que hay respuestas reales
   * (editar reemplaza las preguntas, y por el ON DELETE CASCADE de
   * content_questions eso se llevaría las respuestas existentes).
   */
  static async countRespondents(contentId) {
    const [rows] = await pool.query(
      'SELECT COUNT(DISTINCT user_id) as count FROM content_answers WHERE content_id = ?',
      [contentId]
    );
    return rows[0].count;
  }

  /**
   * Calificación manual de una respuesta corta. multiple_choice/true_false
   * ya se autocalifican al enviar y NO deben poder recalificarse a mano —
   * el WHERE contra content_questions.question_type lo garantiza a nivel de
   * datos (antes solo dependía de que el frontend no mostrara el botón para
   * esos casos; un PUT directo a la ruta podía sobrescribir un puntaje
   * autocalificado). Se cruza contra content_questions (no contents) porque
   * el tipo es por pregunta, no por cuestionario completo.
   */
  static async gradeAnswer(id, isCorrect) {
    const [result] = await pool.query(
      `UPDATE content_answers ca
       INNER JOIN content_questions cq ON cq.id = ca.question_id
       SET ca.is_correct = ?, ca.graded_at = NOW()
       WHERE ca.id = ? AND cq.question_type = 'short_answer'`,
      [isCorrect ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  }
}

export default ContentAnswer;
