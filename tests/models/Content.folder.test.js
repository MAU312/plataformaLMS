import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';

test('create: sin order_index, calcula el siguiente order_index escopado por (course_id, folder_id) con el operador NULL-safe <=>', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('next_order')) return [[{ next_order: 3 }]];
    return [{ insertId: 99 }];
  });

  await Content.create({ course_id: 1, type: 'file', title: 'x', folder_id: 5 });

  const orderCall = queryCall.mock.calls.find(c => c.arguments[0].includes('next_order'));
  assert.match(orderCall.arguments[0], /folder_id <=> \?/);
  assert.deepEqual(orderCall.arguments[1], [1, 5]);

  const insertCall = queryCall.mock.calls.find(c => c.arguments[0].includes('INSERT INTO contents'));
  assert.equal(insertCall.arguments[1][6], 3, 'usa el next_order calculado');
  assert.equal(insertCall.arguments[1][7], 5, 'guarda el folder_id');
});

test('create: sin folder_id, lo guarda como null (contenido de nivel superior)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('next_order')) return [[{ next_order: 1 }]];
    return [{ insertId: 99 }];
  });

  await Content.create({ course_id: 1, type: 'text', title: 'x' });

  const orderCall = queryCall.mock.calls.find(c => c.arguments[0].includes('next_order'));
  assert.deepEqual(orderCall.arguments[1], [1, null]);

  const insertCall = queryCall.mock.calls.find(c => c.arguments[0].includes('INSERT INTO contents'));
  assert.equal(insertCall.arguments[1][7], null);
});

test('update: acepta folder_id (mover a otra carpeta, o null para sacarlo)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));

  await Content.update(7, { folder_id: 3 });

  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /folder_id = \?/);
  assert.deepEqual(params, [3, 7]);
});

test('update: folder_id: null explícito SÍ se aplica (se distingue de "no tocar" con !== undefined)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));

  await Content.update(7, { folder_id: null });

  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /folder_id = \?/);
  assert.deepEqual(params, [null, 7]);
});

test('hasChildren: true si hay contenido con folder_id apuntando a esa carpeta', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ id: 1 }]]));
  const result = await Content.hasChildren(5);
  assert.equal(result, true);
});

test('hasChildren: false si la carpeta está vacía', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const result = await Content.hasChildren(5);
  assert.equal(result, false);
});
