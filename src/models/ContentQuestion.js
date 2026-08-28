import pool from '../config/db.js';

/**
 * Preguntas (y sus opciones) de un cuestionario o encuesta. Un content de
 * tipo 'quiz'/'survey' tiene varias preguntas, todas del mismo
 * question_type (columna en `contents`, no acá) — ver Content.js.
 */
class ContentQuestion {
  /**
   * `executor` (pool por defecto) permite pasar una connection ya abierta
   * dentro de una transacción — ver Content.create para el mismo criterio.
   */
  static async create(contentId, questionText, orderIndex = 0, executor = pool) {
    const [result] = await executor.query(
      'INSERT INTO content_questions (content_id, question_text, order_index) VALUES (?, ?, ?)',
      [contentId, questionText, orderIndex]
    );
    return result.insertId;
  }

  /**
   * `is_correct` se guarda siempre (aunque el content padre sea 'survey',
   * donde simplemente no se le hace caso al leer) — así no hace falta una
   * rama especial en el INSERT según el tipo de content.
   */
  static async createOptions(questionId, options, executor = pool) {
    if (!options || options.length === 0) return;
    const values = options.map((opt, index) => [
      questionId,
      opt.text,
      opt.is_correct ? 1 : 0,
      opt.order_index ?? index
    ]);
    await executor.query(
      'INSERT INTO content_question_options (question_id, option_text, is_correct, order_index) VALUES ?',
      [values]
    );
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM content_questions WHERE id = ?', [id]);
    return rows[0];
  }

  /**
   * Borra todas las preguntas de un content (el ON DELETE CASCADE se lleva
   * sus opciones) — usado por quiz.controller.js para reemplazar el set de
   * preguntas al editar. Solo se llama cuando ya se confirmó que nadie
   * respondió todavía (ver ContentAnswer.countRespondents), así no hay
   * respuestas reales que arrastrar en cascada.
   */
  static async deleteByContent(contentId, executor = pool) {
    await executor.query('DELETE FROM content_questions WHERE content_id = ?', [contentId]);
  }

  /**
   * Preguntas de un content con sus opciones. `includeCorrect: false`
   * (default) omite `is_correct` de las opciones — se usa así cuando el
   * estudiante todavía no respondió, para no filtrarle la respuesta
   * correcta antes de tiempo.
   */
  static async findByContent(contentId, { includeCorrect = false } = {}) {
    const [questions] = await pool.query(
      'SELECT id, content_id, question_text, order_index FROM content_questions WHERE content_id = ? ORDER BY order_index ASC, id ASC',
      [contentId]
    );
    if (questions.length === 0) return [];

    const questionIds = questions.map((q) => q.id);
    const optionColumns = includeCorrect
      ? 'id, question_id, option_text, is_correct, order_index'
      : 'id, question_id, option_text, order_index';
    const [options] = await pool.query(
      `SELECT ${optionColumns} FROM content_question_options WHERE question_id IN (?) ORDER BY order_index ASC, id ASC`,
      [questionIds]
    );

    return questions.map((q) => ({
      ...q,
      options: options.filter((o) => o.question_id === q.id)
    }));
  }
}

export default ContentQuestion;
