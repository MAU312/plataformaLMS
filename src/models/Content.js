import pool from '../config/db.js';

class Content {
  /**
   * "Redacta" un contenido para un usuario sin acceso (ver
   * Course.canAccessMedia): siempre oculta la URL, y además el cuerpo de
   * texto (`description`) si el tipo es 'text' o 'forum' — ahí
   * `description` ES el contenido real (la lección, o el post principal
   * del tema), a diferencia de video/file donde es solo una descripción
   * corta que no hace falta ocultar.
   */
  static redactForNoAccess(content) {
    return {
      ...content,
      url: null,
      description: (content.type === 'text' || content.type === 'forum') ? null : content.description
    };
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
   * Obtener contenidos por curso INCLUYENDO si el usuario los completó.
   * `ts.*` viene de un LEFT JOIN contra task_submissions DEL PROPIO
   * usuario — así el detalle de curso puede saber de una sola vez qué
   * tareas ya entregó (y con qué feedback/estado de revisión) sin tener
   * que pedir GET /contents/:id/submission una vez por cada tarea del
   * curso (antes N peticiones en paralelo, ahora ninguna extra).
   */
  static async findByCourseWithProgress(courseId, userId) {
    const [rows] = await pool.query(
      `SELECT co.*,
        IF(cp.id IS NOT NULL, TRUE, FALSE) as completed,
        ts.id as submission_id, ts.submitted_at as submission_submitted_at,
        ts.feedback as submission_feedback, ts.reviewed_at as submission_reviewed_at
       FROM contents co
       LEFT JOIN content_progress cp ON cp.content_id = co.id AND cp.user_id = ?
       LEFT JOIN task_submissions ts ON ts.content_id = co.id AND ts.user_id = ?
       WHERE co.course_id = ?
       ORDER BY co.order_index ASC`,
      [userId, userId, courseId]
    );
    return rows.map((row) => {
      if (row.type !== 'task') return row;
      const { submission_id, submission_submitted_at, submission_feedback, submission_reviewed_at, ...rest } = row;
      return {
        ...rest,
        my_submission: submission_id
          ? { submitted_at: submission_submitted_at, feedback: submission_feedback, reviewed_at: submission_reviewed_at }
          : null
      };
    });
  }

  /**
   * Crear un nuevo contenido. `folder_id` (null = "sin carpeta") escopa el
   * orden: el siguiente order_index se calcula entre los hermanos de esa
   * misma carpeta (o los del nivel superior), no contra todo el curso —
   * así cada carpeta empieza su propia numeración desde 1. El operador
   * `<=>` es NULL-safe: `folder_id <=> NULL` si no hay carpeta, o
   * `folder_id <=> 5` si la hay, sin necesitar dos queries distintas.
   */
  /**
   * `executor` (pool por defecto) permite pasar una connection ya abierta
   * dentro de una transacción — usado por quiz.controller.js para que la
   * creación del content y la de todas sus preguntas/opciones sean una
   * sola unidad atómica.
   */
  static async create({ course_id, type, title, description, url, file_size, order_index, folder_id, question_type }, executor = pool) {
    const folderId = folder_id || null;

    if (order_index === undefined) {
      const [maxOrder] = await executor.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM contents WHERE course_id = ? AND folder_id <=> ?',
        [course_id, folderId]
      );
      order_index = maxOrder[0].next_order;
    }

    const [result] = await executor.query(
      `INSERT INTO contents (course_id, type, title, description, url, file_size, order_index, folder_id, question_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id, type, title, description || null, url, file_size || null, order_index, folderId, question_type || null]
    );
    return result.insertId;
  }

  /**
   * Actualizar contenido. `folder_id` se distingue de "no lo toques"
   * (undefined) con `!== undefined`, igual que los demás campos — así se
   * puede mandar `folder_id: null` explícito para sacar algo de su carpeta.
   * `executor` (pool por defecto) permite pasar una connection ya abierta
   * dentro de una transacción — usado por quiz.controller.js al reemplazar
   * question_type junto con las preguntas de un quiz/survey.
   */
  static async update(id, { title, description, url, order_index, folder_id, question_type }, executor = pool) {
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
    if (folder_id !== undefined) {
      fields.push('folder_id = ?');
      values.push(folder_id);
    }
    if (question_type !== undefined) {
      fields.push('question_type = ?');
      values.push(question_type);
    }

    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await executor.query(
      `UPDATE contents SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * true si una carpeta todavía tiene contenido adentro (folder_id
   * apuntando a ella) — se usa para bloquear su borrado hasta que esté
   * vacía, en vez de borrar todo en cascada.
   */
  static async hasChildren(folderId) {
    const [rows] = await pool.query(
      'SELECT id FROM contents WHERE folder_id = ? LIMIT 1',
      [folderId]
    );
    return rows.length > 0;
  }

  /**
   * Eliminar contenido
   */
  static async delete(id) {
    const [result] = await pool.query('DELETE FROM contents WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  /**
   * Reordenar contenidos de un curso.
   * Antes hacía un UPDATE por elemento dentro de una transacción (N
   * queries para N contenidos); ahora es un único UPDATE con CASE WHEN,
   * que además es atómico de por sí (no requiere transacción manual).
   * El WHERE con course_id sigue evitando que se cuele el id de un
   * contenido de otro curso.
   */
  static async reorder(courseId, contentIds) {
    if (contentIds.length === 0) return true;

    const caseClauses = contentIds.map(() => 'WHEN ? THEN ?').join(' ');
    const caseParams = contentIds.flatMap((id, i) => [id, i + 1]);
    const placeholders = contentIds.map(() => '?').join(', ');

    const [result] = await pool.query(
      `UPDATE contents SET order_index = CASE id ${caseClauses} ELSE order_index END
       WHERE course_id = ? AND id IN (${placeholders})`,
      [...caseParams, courseId, ...contentIds]
    );

    return result.affectedRows > 0;
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
   * Calcular y actualizar el porcentaje de progreso de un usuario en un curso,
   * basado en cuántos contenidos completó sobre el total de contenidos del curso.
   * Devuelve el nuevo porcentaje calculado.
   */
  static async recalculateCourseProgress(courseId, userId) {
    // Contar total de contenidos del curso. Un foro queda fuera (discusión
    // abierta, sin estado "completado"), una carpeta también (es solo un
    // agrupador, no contenido en sí), y una imagen también (es solo
    // decoración/ilustración, no algo que tenga sentido "completar") —
    // contarlos dejaría a los estudiantes sin poder llegar nunca al 100%
    // ni sacar certificado.
    const [totalRows] = await pool.query(
      "SELECT COUNT(*) as total FROM contents WHERE course_id = ? AND type NOT IN ('forum', 'folder', 'image')",
      [courseId]
    );
    const total = totalRows[0].total;

    // Contar contenidos completados por el usuario en ese curso
    const [completedRows] = await pool.query(
      `SELECT COUNT(*) as completed
       FROM content_progress cp
       INNER JOIN contents co ON co.id = cp.content_id
       WHERE co.course_id = ? AND cp.user_id = ? AND co.type NOT IN ('forum', 'folder', 'image')`,
      [courseId, userId]
    );
    const completed = completedRows[0].completed;

    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Actualizar el progreso en la tabla enrollments. completed_at se marca
    // solo la primera vez que se llega a 100 (CASE con "completed_at IS
    // NULL") y no se vuelve a tocar después, aunque el progreso baje más
    // adelante por desmarcar contenido: sirve como fecha de finalización
    // para el certificado, no como "está completo ahora mismo".
    await pool.query(
      `UPDATE enrollments
       SET progress = ?,
           completed_at = CASE WHEN ? = 100 AND completed_at IS NULL THEN NOW() ELSE completed_at END
       WHERE course_id = ? AND user_id = ?`,
      [progress, progress, courseId, userId]
    );

    return { progress, total, completed };
  }
}

export default Content;