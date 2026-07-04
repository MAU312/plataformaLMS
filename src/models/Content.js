import pool from '../config/db.js';

class Content {
  /**
   * Obtener todos los contenidos
   */
  static async findAll() {
    const [rows] = await pool.query(
      `SELECT co.*, c.title as course_title 
       FROM contents co 
       INNER JOIN courses c ON co.course_id = c.id 
       ORDER BY co.course_id, co.order_index`
    );
    return rows;
  }

  /**
   * Obtener contenido por ID
   */
  static async findById(id) {
    const [rows] = await pool.query(
      `SELECT co.*, c.title as course_title 
       FROM contents co 
       INNER JOIN courses c ON co.course_id = c.id 
       WHERE co.id = ?`,
      [id]
    );
    return rows[0];
  }

  /**
   * Obtener contenidos por curso
   */
  static async findByCourse(courseId) {
    const [rows] = await pool.query(
      'SELECT * FROM contents WHERE course_id = ? ORDER BY order_index ASC',
      [courseId]
    );
    return rows;
  }

  /**
   * Obtener contenidos por curso INCLUYENDO si el usuario los completó
   */
  static async findByCourseWithProgress(courseId, userId) {
    const [rows] = await pool.query(
      `SELECT co.*, 
        IF(cp.id IS NOT NULL, TRUE, FALSE) as completed
       FROM contents co 
       LEFT JOIN content_progress cp ON cp.content_id = co.id AND cp.user_id = ?
       WHERE co.course_id = ? 
       ORDER BY co.order_index ASC`,
      [userId, courseId]
    );
    return rows;
  }

  /**
   * Obtener contenidos por tipo
   */
  static async findByType(courseId, type) {
    const [rows] = await pool.query(
      'SELECT * FROM contents WHERE course_id = ? AND type = ? ORDER BY order_index ASC',
      [courseId, type]
    );
    return rows;
  }

  /**
   * Crear un nuevo contenido
   */
  static async create({ course_id, type, title, description, url, file_size, order_index }) {
    // Si no se proporciona order_index, obtener el siguiente disponible
    if (order_index === undefined) {
      const [maxOrder] = await pool.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM contents WHERE course_id = ?',
        [course_id]
      );
      order_index = maxOrder[0].next_order;
    }

    const [result] = await pool.query(
      `INSERT INTO contents (course_id, type, title, description, url, file_size, order_index) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [course_id, type, title, description || null, url, file_size || null, order_index]
    );
    return result.insertId;
  }

  /**
   * Actualizar contenido
   */
  static async update(id, { title, description, url, order_index }) {
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
    if (url !== undefined) {
      fields.push('url = ?');
      values.push(url);
    }
    if (order_index !== undefined) {
      fields.push('order_index = ?');
      values.push(order_index);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query(
      `UPDATE contents SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Eliminar contenido
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM contents WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Reordenar contenidos de un curso
   */
  static async reorder(courseId, contentIds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (let i = 0; i < contentIds.length; i++) {
        await connection.query(
          'UPDATE contents SET order_index = ? WHERE id = ? AND course_id = ?',
          [i + 1, contentIds[i], courseId]
        );
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
   * Contar contenidos por tipo en un curso
   */
  static async countByType(courseId) {
    const [rows] = await pool.query(
      'SELECT type, COUNT(*) as count FROM contents WHERE course_id = ? GROUP BY type',
      [courseId]
    );
    return rows;
  }

  /**
   * Obtener el siguiente número de orden para un curso
   */
  static async getNextOrder(courseId) {
    const [rows] = await pool.query(
      'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM contents WHERE course_id = ?',
      [courseId]
    );
    return rows[0].next_order;
  }

  // =================================
  // Progreso por contenido
  // =================================

  /**
   * Marcar un contenido como completado por un usuario
   */
  static async markCompleted(contentId, userId) {
    try {
      const [result] = await pool.query(
        'INSERT INTO content_progress (user_id, content_id) VALUES (?, ?)',
        [userId, contentId]
      );
      return result.insertId;
    } catch (error) {
      // Ya estaba marcado como completado (UNIQUE constraint) - no es un error real
      if (error.code === 'ER_DUP_ENTRY') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Desmarcar un contenido como completado (volver a "pendiente")
   */
  static async markIncomplete(contentId, userId) {
    const [result] = await pool.query(
      'DELETE FROM content_progress WHERE content_id = ? AND user_id = ?',
      [contentId, userId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Verificar si un contenido fue completado por un usuario
   */
  static async isCompleted(contentId, userId) {
    const [rows] = await pool.query(
      'SELECT id FROM content_progress WHERE content_id = ? AND user_id = ?',
      [contentId, userId]
    );
    return rows.length > 0;
  }

  /**
   * Calcular y actualizar el porcentaje de progreso de un usuario en un curso,
   * basado en cuántos contenidos completó sobre el total de contenidos del curso.
   * Devuelve el nuevo porcentaje calculado.
   */
  static async recalculateCourseProgress(courseId, userId) {
    // Contar total de contenidos del curso
    const [totalRows] = await pool.query(
      'SELECT COUNT(*) as total FROM contents WHERE course_id = ?',
      [courseId]
    );
    const total = totalRows[0].total;

    // Contar contenidos completados por el usuario en ese curso
    const [completedRows] = await pool.query(
      `SELECT COUNT(*) as completed 
       FROM content_progress cp
       INNER JOIN contents co ON co.id = cp.content_id
       WHERE co.course_id = ? AND cp.user_id = ?`,
      [courseId, userId]
    );
    const completed = completedRows[0].completed;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Actualizar el progreso en la tabla enrollments
    await pool.query(
      'UPDATE enrollments SET progress = ? WHERE course_id = ? AND user_id = ?',
      [progress, courseId, userId]
    );

    return { progress, total, completed };
  }
}

export default Content;