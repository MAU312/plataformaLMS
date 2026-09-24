import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

/**
 * Course.delete borra primero los contenidos que están DENTRO de una
 * carpeta y luego el curso, en una transacción — contents.folder_id es una
 * FK a sí misma sin ON DELETE, y sin este orden el borrado en cascada del
 * curso fallaba (ER_ROW_IS_REFERENCED_2, HTTP 500) apenas el curso tenía
 * una carpeta con algo adentro. Se mockea la conexión completa (no
 * pool.query), igual que en Course.assignTeachers.test.js.
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

test('delete: borra primero los contenidos dentro de carpetas y después el curso, en una transacción', async (t) => {
  const { connection, calls } = mockConnection();
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await Course.delete(7);

  assert.equal(result, true);
  assert.equal(calls.beginTransaction, 1);
  assert.equal(calls.commit, 1);
  assert.equal(calls.rollback, 0);
  assert.equal(calls.release, 1);
  assert.equal(calls.query.length, 2);

  const [childrenSql, childrenParams] = calls.query[0];
  assert.match(childrenSql, /DELETE FROM contents WHERE course_id = \? AND folder_id IS NOT NULL/);
  assert.deepEqual(childrenParams, [7]);

  const [courseSql, courseParams] = calls.query[1];
  assert.match(courseSql, /DELETE FROM courses WHERE id = \?/);
  assert.deepEqual(courseParams, [7]);
});

test('delete: devuelve false si el curso no existía (0 filas), sin dejar la transacción abierta', async (t) => {
  const { connection, calls } = mockConnection(async (sql) => {
    if (/DELETE FROM courses/.test(sql)) return [{ affectedRows: 0 }];
    return [{ affectedRows: 0 }];
  });
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await Course.delete(999);

  assert.equal(result, false);
  assert.equal(calls.commit, 1);
  assert.equal(calls.release, 1);
});

test('delete: si el DELETE del curso falla, hace rollback (no quedan los contenidos de carpetas borrados a medias) y propaga el error', async (t) => {
  const { connection, calls } = mockConnection(async (sql) => {
    if (/DELETE FROM courses/.test(sql)) throw new Error('FK inesperada');
    return [{ affectedRows: 3 }];
  });
  t.mock.method(pool, 'getConnection', async () => connection);

  await assert.rejects(() => Course.delete(7), /FK inesperada/);

  assert.equal(calls.commit, 0);
  assert.equal(calls.rollback, 1);
  assert.equal(calls.release, 1, 'la conexión se libera aunque falle');
});
