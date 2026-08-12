import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

test('assignTeachers: borra los profesores anteriores e inserta la lista nueva', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));

  const result = await Course.assignTeachers(7, [5, 6]);

  assert.equal(result, true);
  assert.equal(queryCall.mock.calls.length, 2, 'un DELETE y un INSERT, no una consulta por profesor');

  const [deleteSql, deleteParams] = queryCall.mock.calls[0].arguments;
  assert.match(deleteSql, /DELETE FROM course_teachers WHERE course_id = \?/);
  assert.deepEqual(deleteParams, [7]);

  const [insertSql, insertParams] = queryCall.mock.calls[1].arguments;
  assert.match(insertSql, /INSERT INTO course_teachers/);
  assert.deepEqual(insertParams, [[[7, 5], [7, 6]]]);
});

test('assignTeachers: con lista vacía, solo borra (no ejecuta INSERT)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 0 }]));

  const result = await Course.assignTeachers(7, []);

  assert.equal(result, true);
  assert.equal(queryCall.mock.calls.length, 1, 'solo el DELETE, sin INSERT vacío');
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
