import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';

test('reorder: hace un único UPDATE con CASE WHEN en vez de un UPDATE por elemento', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 3 }]));

  const result = await Content.reorder(7, [10, 20, 30]);

  assert.equal(result, true);
  assert.equal(queryCall.mock.calls.length, 1, 'debe ejecutar una sola consulta, no una por contenido');

  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /CASE id/);
  assert.match(sql, /WHERE course_id = \? AND id IN \(\?, \?, \?\)/);
  assert.deepEqual(params, [10, 1, 20, 2, 30, 3, 7, 10, 20, 30]);
});

test('reorder: no consulta la base de datos si la lista de ids está vacía', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => { throw new Error('no debería llamarse'); });

  const result = await Content.reorder(7, []);

  assert.equal(result, true);
  assert.equal(queryCall.mock.calls.length, 0);
});

test('reorder: devuelve false si ningún contenido coincidió (ej. course_id no corresponde)', async (t) => {
  t.mock.method(pool, 'query', async () => ([{ affectedRows: 0 }]));

  const result = await Content.reorder(999, [10]);

  assert.equal(result, false);
});
