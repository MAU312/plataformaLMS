import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import User from '../../src/models/User.js';

test('getEnrolledCourses: pagina con LIMIT/OFFSET y devuelve el total sin paginar', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 25 }]];
    return [[{ id: 1, title: 'Curso A', progress: 50 }]];
  });

  const result = await User.getEnrolledCourses(7, { page: 2, limit: 12 });

  assert.equal(result.rows.length, 1);
  assert.equal(result.total, 25);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INNER JOIN enrollments e ON c\.id = e\.course_id/);
  assert.match(sql, /LIMIT \? OFFSET \?/);
  assert.deepEqual(params, [7, 12, 12], 'page=2, limit=12 -> OFFSET 12');
});

test('getEnrolledCourses: page/limit por defecto (1/12) si no se pasan', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await User.getEnrolledCourses(7);

  const [, params] = queryCall.mock.calls[0].arguments;
  assert.deepEqual(params, [7, 12, 0]);
});
