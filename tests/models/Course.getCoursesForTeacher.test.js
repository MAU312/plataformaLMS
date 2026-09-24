import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

test('getCoursesForTeacher: pagina con LIMIT/OFFSET, devuelve el total sin paginar y ordena con desempate estable', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 30 }]];
    return [[{ id: 1, title: 'Curso A' }]];
  });

  const result = await Course.getCoursesForTeacher(9, { page: 3, limit: 10 });

  assert.equal(result.total, 30);
  assert.equal(result.rows.length, 1);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /ORDER BY c\.created_at DESC, c\.id DESC\s+LIMIT \? OFFSET \?/);
  assert.deepEqual(params, [9, 10, 20], 'page=3, limit=10 -> OFFSET 20');
  const [countSql, countParams] = queryCall.mock.calls[1].arguments;
  assert.match(countSql, /FROM course_teachers WHERE user_id = \?/);
  assert.deepEqual(countParams, [9]);
});

test('getCoursesForTeacher: page/limit por defecto (1/12)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await Course.getCoursesForTeacher(9);

  assert.deepEqual(queryCall.mock.calls[0].arguments[1], [9, 12, 0]);
});

test('getCoursesForTeacher: enrolled_count se cuenta contra la RAÍZ (curso padre) — un curso hijo de módulo no tiene inscripciones propias', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await Course.getCoursesForTeacher(9);

  const [sql] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /FROM enrollments WHERE course_id = COALESCE\(pc\.id, c\.id\)/);
  assert.match(sql, /LEFT JOIN course_modules cm ON cm\.id = c\.parent_module_id/);
  assert.match(sql, /LEFT JOIN courses pc ON pc\.id = cm\.course_id/);
});
