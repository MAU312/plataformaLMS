import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

test('resolveEnrollmentRoot: un curso sin parent_module_id se resuelve a sí mismo', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const result = await Course.resolveEnrollmentRoot(5);
  assert.equal(result, 5);
});

test('resolveEnrollmentRoot: un curso hijo se resuelve al course_id del módulo padre', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ parent_id: 1 }]]));
  const result = await Course.resolveEnrollmentRoot(10);
  assert.equal(result, 1);
});

test('getProgressGroupIds: sin cursos hijo, el grupo es solo la raíz', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const result = await Course.getProgressGroupIds(1);
  assert.deepEqual(result, [1]);
});

test('getProgressGroupIds: incluye la raíz más todos los cursos hijo de sus módulos', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ id: 10 }, { id: 11 }]]));
  const result = await Course.getProgressGroupIds(1);
  assert.deepEqual(result, [1, 10, 11]);
});
