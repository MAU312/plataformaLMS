import pool from '../config/db.js';

class ForumPost {
  /**
   * Crea una respuesta en un tema de foro. `parentId` es null para una
   * respuesta directa al tema (nivel 1), o el id de OTRA respuesta de
   * nivel 1 para anidarla debajo (nivel 2) — el aplanado a exactamente 2
   * niveles (si alguien responde a una respuesta de nivel 2, se reengancha
   * al nivel 1 del que cuelga) lo resuelve el controller antes de llamar
   * acá, no este modelo.
   */
  static async create({ content_id, user_id, parent_id, body }) {
    const [result] = await pool.query(
      'INSERT INTO forum_posts (content_id, user_id, parent_id, body) VALUES (?, ?, ?, ?)',
      [content_id, user_id, parent_id || null, body]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM forum_posts WHERE id = ?', [id]);
    return rows[0];
  }

  /**
   * Todas las respuestas de un tema, con nombre del autor, en orden
   * cronológico — el controller/frontend se encarga de agrupar nivel 1 y
   * nivel 2 a partir de `parent_id`.
   */
  static async findByContentId(contentId) {
    const [rows] = await pool.query(
      `SELECT fp.*, u.name as author_name, u.role as author_role
       FROM forum_posts fp
       INNER JOIN users u ON u.id = fp.user_id
       WHERE fp.content_id = ?
       ORDER BY fp.created_at ASC`,
      [contentId]
    );
    return rows;
  }

  /**
   * Edita el texto de una respuesta ya publicada. Quién puede llamar esto
   * (solo el autor) se valida en el controller, no acá.
   */
  static async update(id, body) {
    const [result] = await pool.query(
      'UPDATE forum_posts SET body = ?, updated_at = NOW() WHERE id = ?',
      [body, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Borra una respuesta. Las respuestas de nivel 2 que colgaban de esta
   * (si era de nivel 1) se borran en cascada por la FK de `parent_id`.
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM forum_posts WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

export default ForumPost;
