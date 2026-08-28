import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

test('getEnrolledStudents: incluye last_login en el SELECT (para mostrar el último ingreso al profesor/admin)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 1 }]];
    return [[{ id: 1, name: 'Ana', last_login: null }]];
  });

  const result = await Course.getEnrolledStudents(7);

  assert.equal(result.rows.length, 1);
  assert.equal(result.total, 1);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /u\.last_login/);
  assert.deepEqual(params, [7, 20, 0], 'page=1/limit=20 por defecto -> LIMIT 20 OFFSET 0');
});

test('getEnrolledStudents: pagina con LIMIT/OFFSET según page/limit', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 45 }]];
    return [[]];
  });

  const result = await Course.getEnrolledStudents(7, { page: 3, limit: 10 });

  assert.equal(result.total, 45);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /LIMIT \? OFFSET \?/);
  assert.deepEqual(params, [7, 10, 20], 'page=3, limit=10 -> OFFSET 20');
});
