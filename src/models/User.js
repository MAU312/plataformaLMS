import pool from '../config/db.js';

class User {
  static async findAll() {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    return rows;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
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

  static async create({ name, email, password, role = 'student' }) {
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, role]
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
}

export default User;