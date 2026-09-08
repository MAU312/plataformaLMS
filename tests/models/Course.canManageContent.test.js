import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';

/**
 * canManageContent decide si un profesor puede GESTIONAR contenido puntual
 * (a diferencia de isUserTeacher, que solo pregunta si está asignado al
 * curso en cualquier rol — usado para acceso de lectura). Un profesor sin
 * module_id (NULL) es "de todo el curso" y pasa para cualquier folderId; uno
 * con module_id solo pasa si folderId coincide exactamente con su módulo.
 */

test('canManageContent: profesor de todo el curso (module_id NULL) pasa para cualquier folderId, incluido null', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ module_id: null }]]));

  assert.equal(await Course.canManageContent(7, 3, null), true);
  assert.equal(await Course.canManageContent(7, 3, 24), true);
});

test('canManageContent: profesor escopeado a un módulo solo pasa con SU folderId', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ module_id: 24 }]]));

  assert.equal(await Course.canManageContent(7, 5, 24), true);
  assert.equal(await Course.canManageContent(7, 5, 99), false);
  assert.equal(await Course.canManageContent(7, 5, null), false, 'no puede tocar contenido de nivel superior si está escopeado a un módulo');
});

test('canManageContent: sin fila en course_teachers, no puede gestionar nada', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));

  assert.equal(await Course.canManageContent(7, 999, null), false);
  assert.equal(await Course.canManageContent(7, 999, 24), false);
});
