import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import ContentAnswer from '../../src/models/ContentAnswer.js';

function mockConnection(queryImpl) {
  const calls = { query: [], beginTransaction: 0, commit: 0, rollback: 0, release: 0 };
  return {
    calls,
    connection: {
      beginTransaction: async () => { calls.beginTransaction++; },
      commit: async () => { calls.commit++; },
      rollback: async () => { calls.rollback++; },
      release: () => { calls.release++; },
      query: async (sql, params) => {
        calls.query.push([sql, params]);
        return queryImpl ? queryImpl(sql, params) : [{}];
      }
    }
  };
}

test('hasAnswered: true si ya existe una respuesta de ese usuario para ese content', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ id: 1 }]]));
  const result = await ContentAnswer.hasAnswered(10, 5);
  assert.equal(result, true);
});

test('hasAnswered: false si no hay ninguna fila', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const result = await ContentAnswer.hasAnswered(10, 5);
  assert.equal(result, false);
});

test('submitAnswers: inserta todas las respuestas en una sola transacción y hace commit', async (t) => {
  const { connection, calls } = mockConnection();
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await ContentAnswer.submitAnswers(10, 5, [
    { question_id: 1, option_id: 100, is_correct: true },
    { question_id: 2, answer_text: 'respuesta libre' }
  ]);

  assert.equal(result, true);
  assert.equal(calls.beginTransaction, 1);
  assert.equal(calls.commit, 1);
  assert.equal(calls.rollback, 0);
  assert.equal(calls.release, 1);
  assert.equal(calls.query.length, 2, 'un INSERT por respuesta');
  // option_id/answer_text/is_correct ausentes se normalizan a null, no undefined
  assert.deepEqual(calls.query[1][1], [10, 2, 5, null, 'respuesta libre', null]);
});

test('submitAnswers: si una respuesta ya existía (UNIQUE), hace rollback y devuelve null en vez de tirar el error', async (t) => {
  const { connection, calls } = mockConnection(async (sql, params) => {
    if (calls.query.length === 2) {
      const error = new Error('Duplicate entry');
      error.code = 'ER_DUP_ENTRY';
      throw error;
    }
    return [{}];
  });
  t.mock.method(pool, 'getConnection', async () => connection);

  const result = await ContentAnswer.submitAnswers(10, 5, [
    { question_id: 1, option_id: 100 },
    { question_id: 2, option_id: 101 }
  ]);

  assert.equal(result, null);
  assert.equal(calls.rollback, 1);
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1);
});

test('submitAnswers: un error de BD distinto a duplicado sí se propaga, con rollback', async (t) => {
  const { connection, calls } = mockConnection(async () => { throw new Error('conexión perdida'); });
  t.mock.method(pool, 'getConnection', async () => connection);

  await assert.rejects(
    () => ContentAnswer.submitAnswers(10, 5, [{ question_id: 1 }]),
    /conexión perdida/
  );
  assert.equal(calls.rollback, 1);
});

test('findByContentAndUser: hace JOIN con content_questions y ordena por order_index', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 1, question_text: 'P1' }]]));
  const result = await ContentAnswer.findByContentAndUser(10, 5);

  assert.equal(result.length, 1);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INNER JOIN content_questions cq ON cq\.id = ca\.question_id/);
  assert.match(sql, /ORDER BY cq\.order_index ASC, cq\.id ASC/);
  assert.deepEqual(params, [10, 5]);
});

test('findAllByContent: hace JOIN con users y content_questions (vista de revisión del profesor)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 1, student_name: 'Ana' }]]));
  const result = await ContentAnswer.findAllByContent(10);

  assert.equal(result[0].student_name, 'Ana');
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INNER JOIN users u ON u\.id = ca\.user_id/);
  assert.deepEqual(params, [10]);
});

test('gradeAnswer: solo califica si la pregunta es short_answer (JOIN contra contents.question_type)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));

  const result = await ContentAnswer.gradeAnswer(7, true);

  assert.equal(result, true);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INNER JOIN contents c ON c\.id = ca\.content_id/);
  assert.match(sql, /WHERE ca\.id = \? AND c\.question_type = 'short_answer'/);
  assert.deepEqual(params, [1, 7]);
});

test('gradeAnswer: devuelve false si la pregunta NO es short_answer (multiple_choice/true_false ya autocalificadas)', async (t) => {
  // El WHERE con question_type filtra la fila en el propio UPDATE — 0 filas
  // afectadas es exactamente lo que pasa cuando el id existe pero no es
  // short_answer (o no existe en absoluto).
  t.mock.method(pool, 'query', async () => ([{ affectedRows: 0 }]));
  const result = await ContentAnswer.gradeAnswer(7, true);
  assert.equal(result, false);
});

test('countRespondents: cuenta usuarios distintos, no filas de respuesta (varias preguntas del mismo usuario cuentan una vez)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ count: 3 }]]));
  const result = await ContentAnswer.countRespondents(10);

  assert.equal(result, 3);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /COUNT\(DISTINCT user_id\)/);
  assert.deepEqual(params, [10]);
});
