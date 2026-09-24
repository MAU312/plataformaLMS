import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset: 'utf8mb4'
});

// MySQL corta el resultado de GROUP_CONCAT en group_concat_max_len bytes
// (1024 por defecto) SIN error ni aviso: `teacher_names` (los nombres de
// los profesores de un curso, ver Course.findById/_findPaginated) quedaba
// cortado a mitad de un nombre en un curso con ~45 profesores. Es una
// variable de SESIÓN, así que se fija en cada conexión nueva del pool.
const GROUP_CONCAT_MAX_LEN = 16384;
pool.pool.on('connection', (connection) => {
  connection.query(`SET SESSION group_concat_max_len = ${GROUP_CONCAT_MAX_LEN}`, (error) => {
    if (error) console.error('No se pudo fijar group_concat_max_len en la conexión:', error);
  });
});

export default pool;