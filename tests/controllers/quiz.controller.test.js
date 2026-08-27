import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';
import ContentQuestion from '../../src/models/ContentQuestion.js';
import * as quizController from '../../src/controllers/quiz.controller.js';
import { mockReq, mockRes } from '../helpers/http.js';

/**
 * createQuizContent/createSurveyContent crean el content y todas sus
 * preguntas/opciones dentro de una sola transacción (pool.getConnection())
 * — se mockea la conexión completa, no pool.query.
 */
function mockConnection() {
  const calls = { beginTransaction: 0, commit: 0, rollback: 0, release: 0 };
  return {
    calls,
    connection: {
      beginTransaction: async () => { calls.beginTransaction++; },
      commit: async () => { calls.commit++; },
      rollback: async () => { calls.rollback++; },
      release: () => { calls.release++; },
      query: async () => [{ insertId: 1, affectedRows: 1 }]
    }
  };
}

test('createQuizContent: crea el content y las preguntas/opciones dentro de una transacción', async (t) => {
  const { connection, calls } = mockConnection();
  t.mock.method(pool, 'getConnection', async () => connection);
  const createContentCall = t.mock.method(Content, 'create', async () => 50);
  const createQuestionCall = t.mock.method(ContentQuestion, 'create', async () => 1);
  const createOptionsCall = t.mock.method(ContentQuestion, 'createOptions', async () => {});

  const req = mockReq({
    body: {
      course_id: 1,
      title: 'Quiz 1',
      question_type: 'true_false',
      questions: [
        { text: 'Pregunta 1', options: [{ text: 'Verdadero', is_correct: true }, { text: 'Falso', is_correct: false }] }
      ]
    }
  });
  const res = mockRes();

  await quizController.createQuizContent(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(calls.beginTransaction, 1);
  assert.equal(calls.commit, 1);
  assert.equal(calls.rollback, 0);
  assert.equal(calls.release, 1);
  assert.equal(createContentCall.mock.calls[0].arguments[1], connection, 'Content.create debe recibir la connection de la transacción, no usar el pool por defecto');
  assert.equal(createQuestionCall.mock.calls[0].arguments[3], connection);
  assert.equal(createOptionsCall.mock.calls[0].arguments[2], connection);
});

test('createQuizContent: si una pregunta falla a mitad del loop, hace rollback (no queda un quiz a medias en BD)', async (t) => {
  const { connection, calls } = mockConnection();
  t.mock.method(pool, 'getConnection', async () => connection);
  t.mock.method(Content, 'create', async () => 50);
  let callCount = 0;
  t.mock.method(ContentQuestion, 'create', async () => {
    callCount++;
    if (callCount === 2) throw new Error('conexión perdida');
    return callCount;
  });
  t.mock.method(ContentQuestion, 'createOptions', async () => {});

  const req = mockReq({
    body: {
      course_id: 1,
      title: 'Quiz 1',
      question_type: 'short_answer',
      questions: [{ text: 'Pregunta 1' }, { text: 'Pregunta 2' }]
    }
  });
  const res = mockRes();

  await quizController.createQuizContent(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(calls.rollback, 1, 'debe hacer rollback si una pregunta falla a mitad del loop');
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1, 'la conexión se libera incluso si falló');
});

test('createSurveyContent: ignora is_correct del cliente y siempre guarda 0 en una encuesta', async (t) => {
  const { connection } = mockConnection();
  t.mock.method(pool, 'getConnection', async () => connection);
  t.mock.method(Content, 'create', async () => 50);
  t.mock.method(ContentQuestion, 'create', async () => 1);
  const createOptionsCall = t.mock.method(ContentQuestion, 'createOptions', async () => {});

  const req = mockReq({
    body: {
      course_id: 1,
      title: 'Encuesta 1',
      question_type: 'multiple_choice',
      questions: [
        { text: 'Pregunta 1', options: [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }] }
      ]
    }
  });
  const res = mockRes();

  await quizController.createSurveyContent(req, res);

  assert.equal(res.statusCode, 201);
  const options = createOptionsCall.mock.calls[0].arguments[1];
  assert.ok(options.every((o) => o.is_correct === false), 'una encuesta nunca guarda is_correct, sin importar lo que mande el cliente');
});

test('createQuizContent: 400 si falta el título', async (t) => {
  const req = mockReq({ body: { course_id: 1, question_type: 'short_answer', questions: [{ text: 'x' }] } });
  const res = mockRes();
  await quizController.createQuizContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createQuizContent: 400 si no hay preguntas', async (t) => {
  const req = mockReq({ body: { course_id: 1, title: 'Quiz', question_type: 'short_answer', questions: [] } });
  const res = mockRes();
  await quizController.createQuizContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createQuizContent: 400 si multiple_choice no tiene exactamente una opción correcta', async (t) => {
  const req = mockReq({
    body: {
      course_id: 1,
      title: 'Quiz',
      question_type: 'multiple_choice',
      questions: [{ text: 'x', options: [{ text: 'A', is_correct: true }, { text: 'B', is_correct: true }] }]
    }
  });
  const res = mockRes();
  await quizController.createQuizContent(req, res);
  assert.equal(res.statusCode, 400);
});
