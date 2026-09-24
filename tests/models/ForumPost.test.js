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

test('countByContentId: cuenta ambos niveles (total_all) y solo el nivel 1 (total_top), como números', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ total_all: '130', total_top: '45' }]]));
  const result = await ForumPost.countByContentId(5);

  assert.deepEqual(result, { total_all: 130, total_top: 45 });
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /SUM\(parent_id IS NULL\)/);
  assert.deepEqual(params, [5]);
});

test('findThreadPage: pagina las respuestas de nivel 1 con LIMIT/OFFSET, orden cronológico con desempate por id', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 1, author_name: 'Ana' }]]));
  await ForumPost.findThreadPage(5, { page: 3, limit: 20 });

  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INNER JOIN users u ON u\.id = fp\.user_id/);
  assert.match(sql, /fp\.parent_id IS NULL/);
  assert.match(sql, /ORDER BY fp\.created_at ASC, fp\.id ASC\s+LIMIT \? OFFSET \?/);
  assert.deepEqual(params, [5, 20, 40], 'page=3, limit=20 -> OFFSET 40');
});

test('findThreadPage: trae TODAS las respuestas de nivel 2 de los hilos de esa página (un hilo nunca queda partido) y devuelve nivel 1 primero', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (/parent_id IS NULL/.test(sql)) return [[{ id: 10, parent_id: null }, { id: 12, parent_id: null }]];
    return [[{ id: 11, parent_id: 10 }]];
  });

  const result = await ForumPost.findThreadPage(5, { page: 1, limit: 20 });

  assert.deepEqual(result.map((p) => p.id), [10, 12, 11]);
  const [repliesSql, repliesParams] = queryCall.mock.calls[1].arguments;
  assert.match(repliesSql, /fp\.parent_id IN \(\?\)/);
  assert.deepEqual(repliesParams, [5, [10, 12]]);
});

test('findThreadPage: una página sin hilos devuelve [] sin consultar respuestas', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[]]));

  const result = await ForumPost.findThreadPage(5, { page: 9, limit: 20 });

  assert.deepEqual(result, []);
  assert.equal(queryCall.mock.calls.length, 1, 'no hay hilos: no se pregunta por sus respuestas');
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
