import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

test('getEnrolledStudents: incluye last_login en el SELECT (para mostrar el último ingreso al profesor/admin)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    // resolveEnrollmentRoot corre primero (getEnrolledStudents ahora
    // resuelve la raíz — ver Módulos con cursos anidados): curso 7 no es
    // hijo de ningún módulo, se resuelve a sí mismo.
    if (sql.includes('as parent_id')) return [[]];
    if (/SELECT COUNT/.test(sql)) return [[{ total: 1 }]];
    return [[{ id: 1, name: 'Ana', last_login: null }]];
  });

  const result = await Course.getEnrolledStudents(7);

  assert.equal(result.rows.length, 1);
  assert.equal(result.total, 1);
  const mainCall = queryCall.mock.calls.find(c => c.arguments[0].includes('u.last_login'));
  assert.ok(mainCall, 'debe ejecutar el SELECT principal con last_login');
  assert.deepEqual(mainCall.arguments[1], [7, 20, 0], 'page=1/limit=20 por defecto -> LIMIT 20 OFFSET 0');
});

test('getEnrolledStudents: pagina con LIMIT/OFFSET según page/limit', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('as parent_id')) return [[]];
    if (/SELECT COUNT/.test(sql)) return [[{ total: 45 }]];
    return [[]];
  });

  const result = await Course.getEnrolledStudents(7, { page: 3, limit: 10 });

  assert.equal(result.total, 45);
  const mainCall = queryCall.mock.calls.find(c => /LIMIT \? OFFSET \?/.test(c.arguments[0]));
  assert.ok(mainCall, 'debe ejecutar el SELECT principal paginado');
  assert.deepEqual(mainCall.arguments[1], [7, 10, 20], 'page=3, limit=10 -> OFFSET 20');
});
