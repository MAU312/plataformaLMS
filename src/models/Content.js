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
      `SELECT co.*,
              (SELECT COUNT(*) FROM content_questions cq WHERE cq.content_id = co.id) AS question_count
       FROM contents co WHERE co.course_id = ? ORDER BY co.order_index ASC`,
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
        ts.feedback as submission_feedback, ts.reviewed_at as submission_reviewed_at,
        ts.score_earned as submission_score_earned
       FROM contents co
       LEFT JOIN content_progress cp ON cp.content_id = co.id AND cp.user_id = ?
       LEFT JOIN task_submissions ts ON ts.content_id = co.id AND ts.user_id = ?
       WHERE co.course_id = ?
       ORDER BY co.order_index ASC`,
      [userId, userId, courseId]
    );
    return rows.map((row) => {
      if (row.type !== 'task') return row;
      const { submission_id, submission_submitted_at, submission_feedback, submission_reviewed_at, submission_score_earned, ...rest } = row;
      return {
        ...rest,
        my_submission: submission_id
          ? { submitted_at: submission_submitted_at, feedback: submission_feedback, reviewed_at: submission_reviewed_at, score_earned: submission_score_earned }
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
  static async create({ course_id, type, title, description, url, file_size, order_index, folder_id, weight_percent }, executor = pool) {
    const folderId = folder_id || null;

    if (order_index === undefined) {
      const [maxOrder] = await executor.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM contents WHERE course_id = ? AND folder_id <=> ?',
        [course_id, folderId]
      );
      order_index = maxOrder[0].next_order;
    }

    const [result] = await executor.query(
      `INSERT INTO contents (course_id, type, title, description, url, file_size, order_index, folder_id, weight_percent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [course_id, type, title, description || null, url, file_size || null, order_index, folderId, weight_percent ?? null]
    );
    return result.insertId;
  }

  /**
   * Actualizar contenido. `folder_id` se distingue de "no lo toques"
   * (undefined) con `!== undefined`, igual que los demás campos — así se
   * puede mandar `folder_id: null` explícito para sacar algo de su carpeta.
   * `executor` (pool por defecto) permite pasar una connection ya abierta
   * dentro de una transacción — usado por quiz.controller.js al reemplazar
   * las preguntas de un quiz/survey.
   */
  static async update(id, { title, description, url, order_index, folder_id, weight_percent }, executor = pool) {
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
    if (weight_percent !== undefined) {
      fields.push('weight_percent = ?');
      values.push(weight_percent);
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
    // Contar total de contenidos del curso. Una carpeta queda fuera (es
    // solo un agrupador, no contenido en sí) y una imagen también (es solo
    // decoración/ilustración, no algo que tenga sentido "completar") —
    // contarlas dejaría a los estudiantes sin poder llegar nunca al 100%
    // ni sacar certificado. Un foro SÍ cuenta (participar con al menos un
    // post lo marca completado, ver forum.controller.js createPost).
    const [totalRows] = await pool.query(
      "SELECT COUNT(*) as total FROM contents WHERE course_id = ? AND type NOT IN ('folder', 'image')",
      [courseId]
    );
    const total = totalRows[0].total;

    // Contar contenidos completados por el usuario en ese curso
    const [completedRows] = await pool.query(
      `SELECT COUNT(*) as completed
       FROM content_progress cp
       INNER JOIN contents co ON co.id = cp.content_id
       WHERE co.course_id = ? AND cp.user_id = ? AND co.type NOT IN ('folder', 'image')`,
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

  /**
   * Detalle de la nota de un estudiante en un curso: un item por cada
   * tarea calificada CON weight_percent, y por cada cuestionario CON
   * weight_percent que el estudiante ya respondió POR COMPLETO —
   * "por completo" significa que ninguna pregunta de respuesta corta sigue
   * con is_correct NULL (pendiente de que el profesor la revise a mano).
   * Una tarea/cuestionario SIN weight_percent asignado no genera item (el
   * profesor decidió que no cuenta para la nota). `total` es la suma de
   * todos los items, o null si todavía no hay ninguno (para que la UI
   * muestre "—" en vez de "0"). Usado tanto para calcular la nota final
   * (calculateCourseGrade) como para el CSV de detalle por estudiante (ver
   * course.controller.js exportStudentGrades).
   */
  static async getCourseGradeBreakdown(courseId, userId) {
    const [taskRows] = await pool.query(
      `SELECT c.title, c.weight_percent, ts.score_earned
       FROM task_submissions ts
       INNER JOIN contents c ON c.id = ts.content_id
       WHERE c.course_id = ? AND ts.user_id = ? AND c.type = 'task'
         AND c.weight_percent IS NOT NULL AND ts.score_earned IS NOT NULL`,
      [courseId, userId]
    );

    const items = taskRows.map((row) => ({
      title: row.title,
      type: 'Tarea',
      weight_percent: Number(row.weight_percent),
      earned: Number(row.score_earned)
    }));

    const [quizRows] = await pool.query(
      `SELECT id, title, weight_percent FROM contents WHERE course_id = ? AND type = 'quiz' AND weight_percent IS NOT NULL`,
      [courseId]
    );

    for (const quiz of quizRows) {
      const [answerRows] = await pool.query(
        `SELECT ca.is_correct, cq.points
         FROM content_answers ca
         INNER JOIN content_questions cq ON cq.id = ca.question_id
         WHERE ca.content_id = ? AND ca.user_id = ?`,
        [quiz.id, userId]
      );

      if (answerRows.length === 0) continue;
      if (answerRows.some((a) => a.is_correct === null)) continue;

      const maxPoints = answerRows.reduce((sum, a) => sum + a.points, 0);
      if (maxPoints === 0) continue;
      const earnedPoints = answerRows.filter((a) => a.is_correct == 1).reduce((sum, a) => sum + a.points, 0);

      items.push({
        title: quiz.title,
        type: 'Cuestionario',
        weight_percent: Number(quiz.weight_percent),
        earned: Math.round((earnedPoints / maxPoints) * Number(quiz.weight_percent) * 100) / 100
      });
    }

    const total = items.length > 0 ? Math.round(items.reduce((sum, item) => sum + item.earned, 0) * 100) / 100 : null;
    return { items, total };
  }

  /**
   * Nota final de un estudiante en un curso — ver getCourseGradeBreakdown
   * para el detalle de cómo se calcula cada item.
   */
  static async calculateCourseGrade(courseId, userId) {
    const { total } = await Content.getCourseGradeBreakdown(courseId, userId);
    return total;
  }
}

export default Content;