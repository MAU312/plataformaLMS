import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import ForumPost from '../../src/models/ForumPost.js';

test('create: inserta la respuesta y devuelve el id', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ insertId: 42 }]));
  const result = await ForumPost.create({ content_id: 1, user_id: 2, parent_id: null, body: 'Hola' });

  assert.equal(result, 42);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INSERT INTO forum_posts/);
  assert.deepEqual(params, [1, 2, null, 'Hola']);
});

test('create: parent_id undefined se guarda como null (no como undefined)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ insertId: 42 }]));
  await ForumPost.create({ content_id: 1, user_id: 2, body: 'Hola' });

  const [, params] = queryCall.mock.calls[0].arguments;
  assert.equal(params[2], null);
});

test('findByContentId: hace JOIN con users y ordena por fecha ascendente', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 1, author_name: 'Ana' }]]));
  const result = await ForumPost.findByContentId(5);

  assert.equal(result.length, 1);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INNER JOIN users u ON u\.id = fp\.user_id/);
  assert.match(sql, /ORDER BY fp\.created_at ASC/);
  assert.deepEqual(params, [5]);
});

test('update: hace UPDATE del body y marca updated_at', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));
  const result = await ForumPost.update(9, 'Texto editado');

  assert.equal(result, true);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /UPDATE forum_posts SET body = \?, updated_at = NOW\(\)/);
  assert.deepEqual(params, ['Texto editado', 9]);
});

test('delete: devuelve false si no afectó ninguna fila (id inexistente)', async (t) => {
  t.mock.method(pool, 'query', async () => ([{ affectedRows: 0 }]));
  const result = await ForumPost.delete(999);
  assert.equal(result, false);
});
