import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import ContentAnswer from '../../src/models/ContentAnswer.js';

test('findPageByQuestion: pagina las respuestas de UNA pregunta con LIMIT/OFFSET, ordenadas por user_id (mismo orden que las que ya vienen en /results)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 1, student_name: 'Ana' }]]));

  const rows = await ContentAnswer.findPageByQuestion(7, { page: 3, limit: 20 });

  assert.equal(rows.length, 1);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /WHERE ca\.question_id = \?/);
  assert.match(sql, /INNER JOIN users u ON u\.id = ca\.user_id/);
  assert.match(sql, /ORDER BY ca\.user_id ASC\s+LIMIT \? OFFSET \?/);
  assert.deepEqual(params, [7, 20, 40], 'page=3, limit=20 -> OFFSET 40');
});

test('findPageByQuestion: page/limit por defecto (1/20)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[]]));
  await ContentAnswer.findPageByQuestion(7);
  assert.deepEqual(queryCall.mock.calls[0].arguments[1], [7, 20, 0]);
});

test('countByQuestion: cuenta las respuestas de esa pregunta', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ total: 45 }]]));
  const total = await ContentAnswer.countByQuestion(7);
  assert.equal(total, 45);
  assert.deepEqual(queryCall.mock.calls[0].arguments[1], [7]);
});
