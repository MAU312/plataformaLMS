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
   * Cuántos posts tiene un tema: `total_top` (respuestas directas al tema,
   * nivel 1 — lo que se pagina) y `total_all` (nivel 1 + nivel 2, lo que se
   * muestra como "N respuestas" en el encabezado).
   */
  static async countByContentId(contentId) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total_all, COALESCE(SUM(parent_id IS NULL), 0) AS total_top
       FROM forum_posts WHERE content_id = ?`,
      [contentId]
    );
    return { total_all: Number(rows[0].total_all), total_top: Number(rows[0].total_top) };
  }

  /**
   * Una PÁGINA de un tema: `limit` respuestas de nivel 1 (en orden
   * cronológico) más TODAS las respuestas de nivel 2 que cuelgan de ellas —
   * un hilo nunca queda partido entre dos páginas. Devuelve una lista plana
   * (nivel 1 primero, luego sus respuestas) con el nombre/rol del autor; el
   * controller la agrupa en árbol con buildThread. Antes se traían TODOS los
   * posts del tema de una vez (4.462 posts = 1,5 MB y 41.000 nodos DOM en la
   * prueba de carga). `id` desempata posts con el mismo `created_at` para
   * que LIMIT/OFFSET no repita ni omita filas entre páginas.
   */
  static async findThreadPage(contentId, { page = 1, limit = 20 } = {}) {
    const offset = (page - 1) * limit;
    const [topLevel] = await pool.query(
      `SELECT fp.*, u.name as author_name, u.role as author_role
       FROM forum_posts fp
       INNER JOIN users u ON u.id = fp.user_id
       WHERE fp.content_id = ? AND fp.parent_id IS NULL
       ORDER BY fp.created_at ASC, fp.id ASC
       LIMIT ? OFFSET ?`,
      [contentId, limit, offset]
    );
    if (topLevel.length === 0) return [];

    const [replies] = await pool.query(
      `SELECT fp.*, u.name as author_name, u.role as author_role
       FROM forum_posts fp
       INNER JOIN users u ON u.id = fp.user_id
       WHERE fp.content_id = ? AND fp.parent_id IN (?)
       ORDER BY fp.created_at ASC, fp.id ASC`,
      [contentId, topLevel.map((post) => post.id)]
    );
    return [...topLevel, ...replies];
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
