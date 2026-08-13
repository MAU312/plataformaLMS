import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

test('unenrollUser: al desinscribir, también borra el progreso de contenidos de ese curso para ese usuario', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/DELETE FROM enrollments/.test(sql)) return [{ affectedRows: 1 }];
    return [{ affectedRows: 3 }];
  });

  const result = await Course.unenrollUser(7, 5);

  assert.equal(result, true);
  assert.equal(queryCall.mock.calls.length, 2, 'un DELETE de enrollments y un DELETE de content_progress');

  const [enrollSql, enrollParams] = queryCall.mock.calls[0].arguments;
  assert.match(enrollSql, /DELETE FROM enrollments WHERE course_id = \? AND user_id = \?/);
  assert.deepEqual(enrollParams, [7, 5]);

  const [progressSql, progressParams] = queryCall.mock.calls[1].arguments;
  assert.match(progressSql, /DELETE cp FROM content_progress cp/);
  assert.match(progressSql, /INNER JOIN contents co ON co\.id = cp\.content_id/);
  assert.deepEqual(progressParams, [7, 5]);
});

test('unenrollUser: si no estaba inscrito (0 filas afectadas), no toca content_progress', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 0 }]));

  const result = await Course.unenrollUser(7, 5);

  assert.equal(result, false);
  assert.equal(queryCall.mock.calls.length, 1, 'no debería ejecutar el DELETE de content_progress');
});
