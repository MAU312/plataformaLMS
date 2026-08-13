import pool from '../config/db.js';

class User {
  /**
   * Lista paginada de usuarios, con búsqueda opcional por nombre/email.
   * Devuelve también el total que cumple el filtro (sin paginar).
   */
  static async findAll({ page = 1, limit = 10, search = '' } = {}) {
    const offset = (page - 1) * limit;
    const where = search ? 'WHERE name LIKE ? OR email LIKE ?' : '';
    const searchParams = search ? [`%${search}%`, `%${search}%`] : [];

    const [rows] = await pool.query(
      `SELECT id, name, username, email, role, is_active, created_at, last_login FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...searchParams, limit, offset]
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM users ${where}`,
      searchParams
    );

    return { rows, total: countRows[0].total };
  }

  /**
   * Lista simple (sin paginar) de usuarios activos con un rol dado —
   * usado para poblar el selector de profesores al crear/editar un curso.
   */
  static async findByRole(role) {
    const [rows] = await pool.query(
      'SELECT id, name, email FROM users WHERE role = ? AND is_active = TRUE ORDER BY name ASC',
      [role]
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, username, email, role, is_active, created_at, last_login FROM users WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  static async findByEmail(email) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  /**
   * Busca por email O por username en una sola consulta — permite que el
   * login acepte cualquiera de los dos en el mismo campo.
   */
  static async findByEmailOrUsername(identifier) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR username = ?',
      [identifier, identifier]
    );
    return rows[0];
  }

  static async create({ name, username, email, password, role = 'student' }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, username || null, email, password, role]
    );
    return result.insertId;
  }

  static async update(id, { name, email, role }) {
    const [result] = await pool.query(
      'UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?',
      [name, email, role, id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Registra el momento del último inicio de sesión exitoso.
   */
  static async updateLastLogin(id) {
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = ?', [id]);
  }

  /**
   * Activar o desactivar un usuario
   */
  static async toggleActive(id, is_active) {
    const [result] = await pool.query(
      'UPDATE users SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  }

  static async delete(id) {
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  static async getEnrolledCourses(userId) {
    const [rows] = await pool.query(
      `SELECT c.*, e.progress, e.enrolled_at 
       FROM courses c 
       INNER JOIN enrollments e ON c.id = e.course_id 
       WHERE e.user_id = ? 
       ORDER BY e.enrolled_at DESC`,
      [userId]
    );
    return rows;
  }

  static async countByRole() {
    const [rows] = await pool.query(
      'SELECT role, COUNT(*) as count FROM users GROUP BY role'
    );
    return rows;
  }

  /**
   * Guarda el hash del token de recuperación de contraseña y su expiración.
   * Se guarda el hash (no el token crudo) por la misma razón que las
   * contraseñas: si la base de datos se filtrara, un hash de un token de
   * un solo uso no sirve para nada sin el valor original.
   */
  static async setResetToken(id, tokenHash, expiresAt) {
    await pool.query(
      'UPDATE users SET reset_token_hash = ?, reset_token_expires = ? WHERE id = ?',
      [tokenHash, expiresAt, id]
    );
  }

  /**
   * Busca un usuario por el hash del token, solo si no ha expirado.
   */
  static async findByValidResetTokenHash(tokenHash) {
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE reset_token_hash = ? AND reset_token_expires > NOW()',
      [tokenHash]
    );
    return rows[0];
  }

  /**
   * Actualiza la contraseña y consume el token de recuperación (evita que
   * el mismo enlace se pueda reutilizar dos veces).
   */
  static async resetPassword(id, hashedPassword) {
    const [result] = await pool.query(
      'UPDATE users SET password = ?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = ?',
      [hashedPassword, id]
    );
    return result.affectedRows > 0;
  }
}

export default User;