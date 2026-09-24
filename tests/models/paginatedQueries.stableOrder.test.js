import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import User from '../../src/models/User.js';
import Course from '../../src/models/Course.js';
import TaskSubmission from '../../src/models/TaskSubmission.js';

/**
 * Toda consulta paginada (LIMIT/OFFSET) necesita un ORDER BY con orden
 * TOTAL: si dos filas empatan en la(s) columna(s) de orden, MySQL no
 * garantiza el mismo orden entre una página y la siguiente, y una fila
 * puede aparecer en dos páginas o en ninguna. Medido con 250 usuarios que
 * compartían `created_at` (como tras un import CSV) entre 2.969: 77
 * duplicados y 77 omitidos en la tabla de usuarios del admin. La regresión
 * es fácil de reintroducir (basta quitar el `, id` "que sobra"), y no se
 * ve con datos de prueba chicos — por eso se fija acá.
 */

test('User.findAll: ordena por created_at DESC con id DESC de desempate', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await User.findAll({ page: 2, limit: 10 });

  const [sql] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /ORDER BY created_at DESC, id DESC LIMIT \? OFFSET \?/);
});

test('User.getEnrolledCourses: ordena por enrolled_at DESC con e.id DESC de desempate', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await User.getEnrolledCourses(7, { page: 1, limit: 12 });

  const [sql] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /ORDER BY e\.enrolled_at DESC, e\.id DESC\s+LIMIT \? OFFSET \?/);
});

test('Course.findAll / findAllForAdmin: ordenan por created_at DESC con c.id DESC de desempate', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await Course.findAll({ page: 1, limit: 12 });
  await Course.findAllForAdmin({ page: 1, limit: 8, scope: 'children' });

  const selects = queryCall.mock.calls.map((c) => c.arguments[0]).filter((sql) => /LIMIT \? OFFSET \?/.test(sql));
  assert.equal(selects.length, 2);
  for (const sql of selects) {
    assert.match(sql, /ORDER BY c\.created_at DESC, c\.id DESC\s+LIMIT \? OFFSET \?/);
  }
});

test('Course.getEnrolledStudents: ordena por progress DESC, name ASC con u.id ASC de desempate (dos alumnos pueden tener el mismo nombre y progreso)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('as parent_id')) return [[]];
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await Course.getEnrolledStudents(7, { page: 1, limit: 20 });

  const mainCall = queryCall.mock.calls.find((c) => /LIMIT \? OFFSET \?/.test(c.arguments[0]));
  assert.match(mainCall.arguments[0], /ORDER BY e\.progress DESC, u\.name ASC, u\.id ASC\s+LIMIT \? OFFSET \?/);
});

test('TaskSubmission.findPaginatedByContent: ordena por submitted_at ASC con ts.id ASC de desempate', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await TaskSubmission.findPaginatedByContent(3, { page: 1, limit: 20 });

  const [sql] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /ORDER BY ts\.submitted_at ASC, ts\.id ASC\s+LIMIT \? OFFSET \?/);
});
