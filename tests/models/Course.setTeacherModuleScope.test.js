import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

test('setTeacherModuleScope: hace UPDATE de module_id filtrando por course_id y user_id', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));

  const result = await Course.setTeacherModuleScope(7, 5, 24);

  assert.equal(result, true);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /UPDATE course_teachers SET module_id = \? WHERE course_id = \? AND user_id = \?/);
  assert.deepEqual(params, [24, 7, 5]);
});

test('setTeacherModuleScope: moduleId null vuelve al profesor "de todo el curso"', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));

  await Course.setTeacherModuleScope(7, 5, null);

  const [, params] = queryCall.mock.calls[0].arguments;
  assert.equal(params[0], null);
});

test('setTeacherModuleScope: devuelve false si el profesor no está asignado a ese curso (0 filas afectadas)', async (t) => {
  t.mock.method(pool, 'query', async () => ([{ affectedRows: 0 }]));

  const result = await Course.setTeacherModuleScope(7, 999, 24);

  assert.equal(result, false);
});
