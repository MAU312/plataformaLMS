import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

/**
 * unenrollUser hace sus dos DELETE dentro de una transacción explícita
 * (pool.getConnection() en vez de pool.query directo) — se mockea la
 * conexión completa, no pool.query.
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

test('unenrollUser: al desinscribir, también borra el progreso de contenidos de ese curso para ese usuario', async (t) => {
  const { connection, calls } = mockConnection((sql) => {
    if (/DELETE FROM enrollments/.test(sql)) return [{ affectedRows: 1 }];
    return [{ affectedRows: 3 }];
  });
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await Course.unenrollUser(7, 5);

  assert.equal(result, true);
  assert.equal(calls.commit, 1);
  assert.equal(calls.rollback, 0);
  assert.equal(calls.query.length, 2, 'un DELETE de enrollments y un DELETE de content_progress');

  const [enrollSql, enrollParams] = calls.query[0];
  assert.match(enrollSql, /DELETE FROM enrollments WHERE course_id = \? AND user_id = \?/);
  assert.deepEqual(enrollParams, [7, 5]);

  const [progressSql, progressParams] = calls.query[1];
  assert.match(progressSql, /DELETE cp FROM content_progress cp/);
  assert.match(progressSql, /INNER JOIN contents co ON co\.id = cp\.content_id/);
  assert.deepEqual(progressParams, [7, 5]);
});

test('unenrollUser: si no estaba inscrito (0 filas afectadas), no toca content_progress', async (t) => {
  const { connection, calls } = mockConnection(() => [{ affectedRows: 0 }]);
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await Course.unenrollUser(7, 5);

  assert.equal(result, false);
  assert.equal(calls.commit, 1);
  assert.equal(calls.query.length, 1, 'no debería ejecutar el DELETE de content_progress');
});

test('unenrollUser: si el DELETE de content_progress falla, hace rollback (la inscripción no queda borrada a medias)', async (t) => {
  const { connection, calls } = mockConnection((sql) => {
    if (/DELETE FROM enrollments/.test(sql)) return [{ affectedRows: 1 }];
    throw new Error('conexión perdida');
  });
  t.mock.method(pool, 'getConnection', async () => connection);

  await assert.rejects(() => Course.unenrollUser(7, 5), /conexión perdida/);

  assert.equal(calls.rollback, 1);
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1);
});
