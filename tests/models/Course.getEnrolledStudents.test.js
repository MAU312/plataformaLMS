import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

test('getEnrolledStudents: incluye last_login en el SELECT (para mostrar el último ingreso al profesor/admin)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 1, name: 'Ana', last_login: null }]]));

  const result = await Course.getEnrolledStudents(7);

  assert.equal(result.length, 1);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /u\.last_login/);
  assert.deepEqual(params, [7]);
});
