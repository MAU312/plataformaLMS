import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

/**
 * unenrollUser hace todo (resolver la raíz, el DELETE de enrollments y el
 * de content_progress) dentro de una sola transacción explícita
 * (pool.getConnection() en vez de pool.query directo) — se mockea la
 * conexión completa, no pool.query. Las dos consultas de solo-lectura
 * (resolver curso padre / cursos hijo) siempre corren primero; por
 * defecto responden "sin módulo padre, sin hijos" (rows vacío) para que
 * los tests de un curso normal no tengan que preocuparse por ellas —
 * `hasParentModule`/`childIds` las activan cuando un test sí las necesita.
 */
function mockConnection(queryImpl, { hasParentModule = null, childIds = [] } = {}) {
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
        if (/SELECT cm\.course_id as parent_id/.test(sql)) {
          return [hasParentModule ? [{ parent_id: hasParentModule }] : []];
        }
        if (/SELECT c\.id\s+FROM courses c\s+INNER JOIN course_modules/.test(sql)) {
          return [childIds.map((id) => ({ id }))];
        }
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
  assert.equal(calls.query.length, 4, 'resolver raíz + grupo de progreso + DELETE enrollments + DELETE content_progress');

  const [rootSql, rootParams] = calls.query[0];
  assert.match(rootSql, /SELECT cm\.course_id as parent_id/);
  assert.deepEqual(rootParams, [7]);

  const [enrollSql, enrollParams] = calls.query[1];
  assert.match(enrollSql, /DELETE FROM enrollments WHERE course_id = \? AND user_id = \?/);
  assert.deepEqual(enrollParams, [7, 5]);

  const [groupSql, groupParams] = calls.query[2];
  assert.match(groupSql, /SELECT c\.id/);
  assert.deepEqual(groupParams, [7]);

  const [progressSql, progressParams] = calls.query[3];
  assert.match(progressSql, /DELETE cp FROM content_progress cp/);
  assert.match(progressSql, /INNER JOIN contents co ON co\.id = cp\.content_id/);
  assert.match(progressSql, /co\.course_id IN \(\?\)/);
  assert.deepEqual(progressParams, [[7], 5]);
});

test('unenrollUser: si no estaba inscrito (0 filas afectadas), no toca content_progress', async (t) => {
  const { connection, calls } = mockConnection(() => [{ affectedRows: 0 }]);
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await Course.unenrollUser(7, 5);

  assert.equal(result, false);
  assert.equal(calls.commit, 1);
  assert.equal(calls.query.length, 2, 'resuelve la raíz y el DELETE de enrollments, pero no llega a tocar content_progress');
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

test('unenrollUser: si courseId es un curso hijo de módulo, desinscribe al padre y limpia el progreso de TODO el grupo (padre + hermanos)', async (t) => {
  // courseId=20 es un curso hijo cuyo módulo pertenece al curso padre 7,
  // que a su vez tiene otro curso hijo (21) además de 20 — el DELETE de
  // content_progress debe alcanzar a los 3 (7, 20, 21), no solo al 20 que
  // se pasó como argumento ni solo al 7 resuelto como raíz.
  const { connection, calls } = mockConnection(
    (sql) => {
      if (/DELETE FROM enrollments/.test(sql)) return [{ affectedRows: 1 }];
      return [{ affectedRows: 5 }];
    },
    { hasParentModule: 7, childIds: [20, 21] }
  );
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await Course.unenrollUser(20, 5);

  assert.equal(result, true);

  const [enrollSql, enrollParams] = calls.query[1];
  assert.match(enrollSql, /DELETE FROM enrollments/);
  assert.deepEqual(enrollParams, [7, 5], 'la inscripción vive en el padre (7), no en el hijo (20) que se pasó');

  const [, progressParams] = calls.query[3];
  assert.deepEqual(progressParams, [[7, 20, 21], 5], 'limpia el progreso de la raíz Y de todos sus cursos hijo');
});
