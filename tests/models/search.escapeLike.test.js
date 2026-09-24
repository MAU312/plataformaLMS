import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Course from '../../src/models/Course.js';
import User from '../../src/models/User.js';

/**
 * Buscar "%" o "_" coincidía con TODAS las filas (eran comodines de LIKE):
 * medido con 1.455 cursos, `search=%` devolvía los 1.455. Ahora el término
 * se busca como texto literal.
 */

test('Course.findAll: el término de búsqueda se escapa (los % y _ del usuario no son comodines)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await Course.findAll({ page: 1, limit: 12, search: '50%_x' });

  const [, params] = queryCall.mock.calls[0].arguments;
  assert.deepEqual(params.slice(0, 2), ['%50\\%\\_x%', '%50\\%\\_x%']);
});

test('User.findAll: el término de búsqueda se escapa (los % y _ del usuario no son comodines)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await User.findAll({ page: 1, limit: 10, search: '%' });

  const [, params] = queryCall.mock.calls[0].arguments;
  assert.deepEqual(params.slice(0, 2), ['%\\%%', '%\\%%']);
});

test('User.findAll: sin búsqueda no agrega filtro ni parámetros de LIKE', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/SELECT COUNT/.test(sql)) return [[{ total: 0 }]];
    return [[]];
  });

  await User.findAll({ page: 1, limit: 10 });

  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.doesNotMatch(sql, /LIKE/);
  assert.deepEqual(params, [10, 0]);
});
