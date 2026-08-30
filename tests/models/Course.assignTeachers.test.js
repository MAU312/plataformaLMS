import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

/**
 * assignTeachers hace DELETE (de los que ya no están) + INSERT IGNORE (de
 * la lista nueva) dentro de una transacción explícita (pool.getConnection()
 * en vez de pool.query directo) — se mockea la conexión completa, no
 * pool.query. INSERT IGNORE evita pisar el assigned_at de un profesor que
 * ya estaba asignado y sigue en la lista.
 */
function mockConnection(queryImpl) {
  const calls = { query: [], beginTransaction: 0, commit: 0, rollback: 0, release: 0 };
  return {
    calls,
    connection: {
      beginTransaction: async () => { calls.beginTransaction++; },
      commit: async () => { calls.commit++; },
      rollback: async () => { calls.rollback++; },
      release: () => { calls.release++; },
      query: async (sql, params) => {
        calls.query.push([sql, params]);
        return queryImpl ? queryImpl(sql, params) : [{ affectedRows: 1 }];
      }
    }
  };
}

test('assignTeachers: borra los profesores anteriores e inserta la lista nueva, en una transacción', async (t) => {
  const { connection, calls } = mockConnection();
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await Course.assignTeachers(7, [5, 6]);

  assert.equal(result, true);
  assert.equal(calls.beginTransaction, 1);
  assert.equal(calls.commit, 1);
  assert.equal(calls.rollback, 0);
  assert.equal(calls.release, 1);
  assert.equal(calls.query.length, 2, 'un DELETE y un INSERT, no una consulta por profesor');

  const [deleteSql, deleteParams] = calls.query[0];
  assert.match(deleteSql, /DELETE FROM course_teachers WHERE course_id = \? AND user_id NOT IN \(\?\)/);
  assert.deepEqual(deleteParams, [7, [5, 6]]);

  const [insertSql, insertParams] = calls.query[1];
  assert.match(insertSql, /INSERT IGNORE INTO course_teachers/);
  assert.deepEqual(insertParams, [[[7, 5], [7, 6]]]);
});

test('assignTeachers: con lista vacía, solo borra (no ejecuta INSERT)', async (t) => {
  const { connection, calls } = mockConnection();
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await Course.assignTeachers(7, []);

  assert.equal(result, true);
  assert.equal(calls.commit, 1);
  assert.equal(calls.query.length, 1, 'solo el DELETE, sin INSERT vacío');
});

test('assignTeachers: si el INSERT falla, hace rollback (el DELETE no queda a medias) y propaga el error', async (t) => {
  const { connection, calls } = mockConnection(async (sql) => {
    if (/INSERT/.test(sql)) throw new Error('FK inválida');
    return [{ affectedRows: 1 }];
  });
  t.mock.method(pool, 'getConnection', async () => connection);

  await assert.rejects(() => Course.assignTeachers(7, [999]), /FK inválida/);

  assert.equal(calls.rollback, 1);
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1, 'la conexión se libera incluso si falló');
});

test('isUserTeacher: true si existe una fila en course_teachers para ese curso/usuario', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ id: 1 }]]));
  const result = await Course.isUserTeacher(7, 5);
  assert.equal(result, true);
});

test('isUserTeacher: false si no hay ninguna fila', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const result = await Course.isUserTeacher(7, 5);
  assert.equal(result, false);
});
