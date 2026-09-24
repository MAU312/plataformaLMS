import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import ContentAnswer from '../../src/models/ContentAnswer.js';

test('getStatusByCourse: UNA consulta para todos los quizzes/encuestas del curso (no una por quiz)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ content_id: 1, answered_count: 2, max_score: '5', score: '3', pending_count: 1 }]]));

  const rows = await ContentAnswer.getStatusByCourse(7, 42);

  assert.equal(queryCall.mock.calls.length, 1);
  assert.equal(rows.length, 1);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /co\.course_id = \? AND co\.type IN \('quiz', 'survey'\)/);
  assert.deepEqual(params, [42, 42, 42, 7], 'el usuario para cada subconsulta y el curso al final');
});

test('getStatusByCourse: cuenta como correctas solo is_correct = 1 y como pendientes solo is_correct IS NULL', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[]]));

  await ContentAnswer.getStatusByCourse(7, 42);

  const [sql] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /ca\.is_correct = 1/);
  assert.match(sql, /ca\.is_correct IS NULL/);
});
