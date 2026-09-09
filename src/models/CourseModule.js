import pool from '../config/db.js';

/**
 * Un "módulo" acá es un agrupador de CURSOS COMPLETOS dentro de un curso
 * padre (portada/título/profesor propios cada uno) — distinto del
 * "módulo"-carpeta que ya existe en Content/course_teachers.module_id (una
 * carpeta con un profesor escopeado a ella dentro de UN solo curso). Ver
 * courseModule.controller.js para las reglas de negocio (nesting de un solo
 * nivel, permisos).
 */
class CourseModule {
  /**
   * `order_index` se autonumera entre los módulos del mismo curso si no se
   * manda, mismo criterio que Content.create con folder_id.
   */
  static async create({ course_id, title, order_index }) {
    if (order_index === undefined) {
      const [maxOrder] = await pool.query(
        'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM course_modules WHERE course_id = ?',
        [course_id]
      );
      order_index = maxOrder[0].next_order;
    }

    const [result] = await pool.query(
      'INSERT INTO course_modules (course_id, title, order_index) VALUES (?, ?, ?)',
      [course_id, title, order_index]
    );
    return result.insertId;
  }

  static async findById(id) {
    const [rows] = await pool.query('SELECT * FROM course_modules WHERE id = ?', [id]);
    return rows[0];
  }

  /**
   * Módulos de un curso, cada uno con sus cursos hijo ya armados como
   * tarjeta (portada/título/profesores/cantidad de contenido) — mismo shape
   * que usa el catálogo (Course._findPaginated), para poder reusar
   * renderCourseCard tal cual en el frontend sin transformar nada.
   * `enrolled_count` de cada curso hijo es el del PADRE (el propio hijo
   * nunca tiene inscripciones propias — ver Course.resolveEnrollmentRoot):
   * mostrar 0 en cada tarjeta sería engañoso, ya que en realidad todos los
   * inscritos del padre tienen acceso a él.
   */
  static async findByCourse(courseId) {
    const [modules] = await pool.query(
      'SELECT * FROM course_modules WHERE course_id = ? ORDER BY order_index ASC, id ASC',
      [courseId]
    );
    if (modules.length === 0) return [];

    const moduleIds = modules.map((m) => m.id);
    const [[{ enrolled_count }]] = await pool.query(
      'SELECT COUNT(*) as enrolled_count FROM enrollments WHERE course_id = ?',
      [courseId]
    );
    const [childCourses] = await pool.query(
      `SELECT c.*,
       (SELECT GROUP_CONCAT(u.name SEPARATOR ', ') FROM course_teachers ct INNER JOIN users u ON u.id = ct.user_id WHERE ct.course_id = c.id) as teacher_names,
       (SELECT COUNT(*) FROM contents WHERE course_id = c.id) as content_count
       FROM courses c
       WHERE c.parent_module_id IN (?)
       ORDER BY c.created_at ASC`,
      [moduleIds]
    );

    return modules.map((m) => ({
      ...m,
      courses: childCourses
        .filter((c) => c.parent_module_id === m.id)
        .map((c) => ({ ...c, enrolled_count }))
    }));
  }

  static async update(id, { title, order_index }) {
    const fields = [];
    const values = [];
    if (title !== undefined) { fields.push('title = ?'); values.push(title); }
    if (order_index !== undefined) { fields.push('order_index = ?'); values.push(order_index); }
    if (fields.length === 0) return false;

    values.push(id);
    const [result] = await pool.query(`UPDATE course_modules SET ${fields.join(', ')} WHERE id = ?`, values);
    return result.affectedRows > 0;
  }

  /**
   * Igual que Content.hasChildren para carpetas: un módulo con cursos
   * adentro no se puede borrar de un tirón (perdería sus cursos hijo sin
   * limpiar sus archivos en disco) — hay que vaciarlo primero.
   */
  static async hasChildCourses(moduleId) {
    const [rows] = await pool.query('SELECT id FROM courses WHERE parent_module_id = ? LIMIT 1', [moduleId]);
    return rows.length > 0;
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM course_modules WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

export default CourseModule;
