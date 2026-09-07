import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';
import ContentQuestion from '../../src/models/ContentQuestion.js';
import ContentAnswer from '../../src/models/ContentAnswer.js';
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
  assert.equal(createQuestionCall.mock.calls[0].arguments[4], connection);
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

test('getQuestionsForManage: devuelve question_type, preguntas CON is_correct, y el conteo de respondentes', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz', question_type: 'multiple_choice' }));
  t.mock.method(ContentQuestion, 'findByContent', async (id, opts) => {
    assert.deepEqual(opts, { includeCorrect: true }, 'el profesor siempre debe ver la respuesta correcta al editar');
    return [{ id: 1, question_text: 'P1', options: [{ id: 10, option_text: 'A', is_correct: 1 }] }];
  });
  t.mock.method(ContentAnswer, 'countRespondents', async () => 0);

  const req = mockReq({ params: { id: 40 } });
  const res = mockRes();
  await quizController.getQuestionsForManage(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.question_type, 'multiple_choice');
  assert.equal(res.body.data.respondent_count, 0);
  assert.equal(res.body.data.questions[0].options[0].is_correct, 1);
});

test('getQuestionsForManage: 400 si el content no es quiz ni survey', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'text' }));
  const req = mockReq({ params: { id: 40 } });
  const res = mockRes();
  await quizController.getQuestionsForManage(req, res);
  assert.equal(res.statusCode, 400);
});

test('getQuestionsForManage: 404 si el content no existe', async (t) => {
  t.mock.method(Content, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 999 } });
  const res = mockRes();
  await quizController.getQuestionsForManage(req, res);
  assert.equal(res.statusCode, 404);
});

test('updateQuestions: reemplaza título/tipo/preguntas dentro de una transacción cuando nadie respondió todavía', async (t) => {
  const { connection, calls } = mockConnection();
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz', description: 'vieja' }));
  t.mock.method(ContentAnswer, 'countRespondents', async () => 0);
  t.mock.method(pool, 'getConnection', async () => connection);
  const updateContentCall = t.mock.method(Content, 'update', async () => true);
  const deleteByContentCall = t.mock.method(ContentQuestion, 'deleteByContent', async () => {});
  t.mock.method(ContentQuestion, 'create', async () => 1);
  const createOptionsCall = t.mock.method(ContentQuestion, 'createOptions', async () => {});

  const req = mockReq({
    params: { id: 40 },
    body: {
      title: 'Quiz editado',
      question_type: 'true_false',
      questions: [{ text: 'Pregunta 1', options: [{ text: 'Verdadero', is_correct: true }, { text: 'Falso', is_correct: false }] }]
    }
  });
  const res = mockRes();

  await quizController.updateQuestions(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(calls.beginTransaction, 1);
  assert.equal(calls.commit, 1);
  assert.equal(calls.rollback, 0);
  assert.equal(calls.release, 1);
  assert.equal(updateContentCall.mock.calls[0].arguments[0], 40);
  assert.equal(updateContentCall.mock.calls[0].arguments[1].title, 'Quiz editado');
  assert.equal(updateContentCall.mock.calls[0].arguments[2], connection, 'debe usar la connection de la transacción, no el pool por defecto');
  assert.equal(deleteByContentCall.mock.calls[0].arguments[0], 40);
  assert.equal(deleteByContentCall.mock.calls[0].arguments[1], connection);
  assert.equal(createOptionsCall.mock.calls[0].arguments[2], connection);
});

test('updateQuestions: 400 y NO toca la base de datos si ya hay respondentes registrados (bloquea el reemplazo destructivo)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz', description: '' }));
  t.mock.method(ContentAnswer, 'countRespondents', async () => 2);
  const getConnectionCall = t.mock.method(pool, 'getConnection', async () => { throw new Error('no debería abrir una transacción'); });

  const req = mockReq({
    params: { id: 40 },
    body: { title: 'Quiz editado', question_type: 'short_answer', questions: [{ text: 'Pregunta 1' }] }
  });
  const res = mockRes();

  await quizController.updateQuestions(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /ya hay respuestas/i);
  assert.equal(getConnectionCall.mock.calls.length, 0);
});

test('updateQuestions: si falla a mitad de la transacción, hace rollback y no deja el quiz sin preguntas', async (t) => {
  const { connection, calls } = mockConnection();
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz', description: '' }));
  t.mock.method(ContentAnswer, 'countRespondents', async () => 0);
  t.mock.method(pool, 'getConnection', async () => connection);
  t.mock.method(Content, 'update', async () => true);
  t.mock.method(ContentQuestion, 'deleteByContent', async () => {});
  t.mock.method(ContentQuestion, 'create', async () => { throw new Error('conexión perdida'); });

  const req = mockReq({
    params: { id: 40 },
    body: { title: 'Quiz editado', question_type: 'short_answer', questions: [{ text: 'Pregunta 1' }] }
  });
  const res = mockRes();

  await quizController.updateQuestions(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(calls.rollback, 1);
  assert.equal(calls.commit, 0);
  assert.equal(calls.release, 1);
});

test('updateQuestions: 400 si falta el título', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz', description: '' }));
  const req = mockReq({
    params: { id: 40 },
    body: { question_type: 'short_answer', questions: [{ text: 'x' }] }
  });
  const res = mockRes();
  await quizController.updateQuestions(req, res);
  assert.equal(res.statusCode, 400);
});

test('createQuizContent: 400 si el puntaje de una pregunta no es un entero >= 1', async (t) => {
  const req = mockReq({
    body: {
      course_id: 1,
      title: 'Quiz',
      question_type: 'multiple_choice',
      questions: [{ text: '¿?', points: 0, options: [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }] }]
    }
  });
  const res = mockRes();
  await quizController.createQuizContent(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /puntaje/);
});

// =================================
// submitAnswers
// =================================

test('submitAnswers: el puntaje pondera por los puntos de cada pregunta, no por cantidad de correctas', async (t) => {
  t.mock.method(ContentAnswer, 'hasAnswered', async () => false);
  t.mock.method(ContentQuestion, 'findByContent', async () => ([
    { id: 1, points: 5, options: [{ id: 10, is_correct: true }, { id: 11, is_correct: false }] },
    { id: 2, points: 1, options: [{ id: 20, is_correct: false }, { id: 21, is_correct: true }] }
  ]));
  t.mock.method(ContentAnswer, 'submitAnswers', async () => true);
  t.mock.method(Content, 'markCompleted', async () => true);
  t.mock.method(Content, 'recalculateCourseProgress', async () => ({ progress: 50, total: 4, completed: 2 }));

  const req = mockReq({
    body: { answers: [{ question_id: 1, option_id: 10 }, { question_id: 2, option_id: 20 }] },
    session: { user: { id: 7 } }
  });
  req.quizContent = { id: 100, course_id: 1, type: 'quiz', question_type: 'multiple_choice' };
  const res = mockRes();

  await quizController.submitAnswers(req, res);

  assert.equal(res.statusCode, 201);
  // Solo la pregunta 1 (5 puntos) se contestó bien; la 2 (1 punto) mal —
  // el puntaje NO es "1 de 2 correctas", es 5 de un máximo de 6.
  assert.equal(res.body.data.score, 5);
  assert.equal(res.body.data.max_score, 6);
  assert.equal(res.body.data.total_questions, 2);
});

test('submitAnswers: todas correctas suma el total de puntos posibles', async (t) => {
  t.mock.method(ContentAnswer, 'hasAnswered', async () => false);
  t.mock.method(ContentQuestion, 'findByContent', async () => ([
    { id: 1, points: 3, options: [{ id: 10, is_correct: true }, { id: 11, is_correct: false }] },
    { id: 2, points: 2, options: [{ id: 20, is_correct: false }, { id: 21, is_correct: true }] }
  ]));
  t.mock.method(ContentAnswer, 'submitAnswers', async () => true);
  t.mock.method(Content, 'markCompleted', async () => true);
  t.mock.method(Content, 'recalculateCourseProgress', async () => ({ progress: 100, total: 4, completed: 4 }));

  const req = mockReq({
    body: { answers: [{ question_id: 1, option_id: 10 }, { question_id: 2, option_id: 21 }] },
    session: { user: { id: 7 } }
  });
  req.quizContent = { id: 100, course_id: 1, type: 'quiz', question_type: 'multiple_choice' };
  const res = mockRes();

  await quizController.submitAnswers(req, res);

  assert.equal(res.body.data.score, 5);
  assert.equal(res.body.data.max_score, 5);
});

// =================================
// getResults
// =================================

test('getResults: incluye los puntos de cada pregunta en el resultado (quiz de opción múltiple)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz', question_type: 'multiple_choice' }));
  t.mock.method(ContentQuestion, 'findByContent', async () => ([
    { id: 1, question_text: '¿?', points: 4, options: [{ id: 10, option_text: 'A', is_correct: true }] }
  ]));
  t.mock.method(ContentAnswer, 'findAllByContent', async () => ([
    { question_id: 1, user_id: 7, option_id: 10, is_correct: 1 }
  ]));

  const req = mockReq({ params: { id: 40 } });
  const res = mockRes();
  await quizController.getResults(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.questions[0].points, 4);
});
