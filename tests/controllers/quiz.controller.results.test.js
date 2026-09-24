import test from 'node:test';
import assert from 'node:assert/strict';
import Content from '../../src/models/Content.js';
import ContentQuestion from '../../src/models/ContentQuestion.js';
import ContentAnswer from '../../src/models/ContentAnswer.js';
import * as quizController from '../../src/controllers/quiz.controller.js';
import { mockReq, mockRes } from '../helpers/http.js';

/**
 * Un quiz con 100 preguntas cortas y 150 estudiantes mandaba TODAS las
 * respuestas en /results (3,4 MB) y el navegador dibujaba 151.000 nodos.
 * Ahora /results trae solo las primeras 20 por pregunta corta (+ el total) y
 * el resto se pide de a páginas.
 */

function manyShortAnswers(questionId, count) {
  return Array.from({ length: count }, (_, i) => ({
    id: 1000 + i, question_id: questionId, user_id: i + 1, student_name: `Est ${i + 1}`,
    student_email: `e${i + 1}@x.com`, answer_text: `resp ${i + 1}`, is_correct: null
  }));
}

test('getResults: una pregunta corta con 45 respuestas manda solo las primeras 20 y answers_total = 45', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz' }));
  t.mock.method(ContentQuestion, 'findByContent', async () => ([
    { id: 2, question_text: 'Explica', question_type: 'short_answer', points: 1 }
  ]));
  t.mock.method(ContentAnswer, 'findAllByContent', async () => manyShortAnswers(2, 45));

  const res = mockRes();
  await quizController.getResults(mockReq({ params: { id: 40 } }), res);

  const q = res.body.data.questions[0];
  assert.equal(q.answers.length, 20);
  assert.equal(q.answers_total, 45);
  assert.equal(q.answers[0].answer_text, 'resp 1');
  assert.equal(res.body.data.total_respondents, 45, 'los respondentes se cuentan sobre TODAS las respuestas, no solo las mandadas');
});

test('getResults: una pregunta corta con pocas respuestas las manda todas y answers_total coincide', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz' }));
  t.mock.method(ContentQuestion, 'findByContent', async () => ([
    { id: 2, question_text: 'Explica', question_type: 'short_answer', points: 1 }
  ]));
  t.mock.method(ContentAnswer, 'findAllByContent', async () => manyShortAnswers(2, 3));

  const res = mockRes();
  await quizController.getResults(mockReq({ params: { id: 40 } }), res);

  assert.equal(res.body.data.questions[0].answers.length, 3);
  assert.equal(res.body.data.questions[0].answers_total, 3);
});

test('getResults: agrupar las respuestas por pregunta no mezcla las de una pregunta con las de otra', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz' }));
  t.mock.method(ContentQuestion, 'findByContent', async () => ([
    { id: 1, question_text: 'A', question_type: 'multiple_choice', points: 1, options: [{ id: 10, option_text: 'x', is_correct: true }] },
    { id: 2, question_text: 'B', question_type: 'multiple_choice', points: 1, options: [{ id: 20, option_text: 'y', is_correct: true }] }
  ]));
  t.mock.method(ContentAnswer, 'findAllByContent', async () => ([
    { question_id: 1, user_id: 1, option_id: 10, is_correct: 1 },
    { question_id: 1, user_id: 2, option_id: 11, is_correct: 0 },
    { question_id: 2, user_id: 1, option_id: 20, is_correct: 1 }
  ]));

  const res = mockRes();
  await quizController.getResults(mockReq({ params: { id: 40 } }), res);

  assert.equal(res.body.data.questions[0].correct_count, 1);
  assert.equal(res.body.data.questions[0].incorrect_count, 1);
  assert.equal(res.body.data.questions[1].correct_count, 1);
  assert.equal(res.body.data.questions[1].incorrect_count, 0);
});

test('getResults: una pregunta sin ninguna respuesta no rompe (cuenta 0)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz' }));
  t.mock.method(ContentQuestion, 'findByContent', async () => ([
    { id: 2, question_text: 'Explica', question_type: 'short_answer', points: 1 }
  ]));
  t.mock.method(ContentAnswer, 'findAllByContent', async () => []);

  const res = mockRes();
  await quizController.getResults(mockReq({ params: { id: 40 } }), res);

  assert.equal(res.body.data.questions[0].answers_total, 0);
  assert.deepEqual(res.body.data.questions[0].answers, []);
});

// =================================
// getShortAnswers
// =================================

test('getShortAnswers: 404 si el contenido no existe', async (t) => {
  t.mock.method(Content, 'findById', async () => undefined);
  const res = mockRes();
  await quizController.getShortAnswers(mockReq({ params: { id: 40, questionId: 2 } }), res);
  assert.equal(res.statusCode, 404);
});

test('getShortAnswers: 400 si el contenido no es quiz ni encuesta', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'text' }));
  const res = mockRes();
  await quizController.getShortAnswers(mockReq({ params: { id: 40, questionId: 2 } }), res);
  assert.equal(res.statusCode, 400);
});

test('getShortAnswers: 404 si la pregunta no existe o es de OTRO contenido (no se pueden leer respuestas ajenas cambiando el id)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz' }));
  const questionCall = t.mock.method(ContentQuestion, 'findById', async () => ({ id: 2, content_id: 999, question_type: 'short_answer' }));
  const pageCall = t.mock.method(ContentAnswer, 'findPageByQuestion', async () => []);

  const res = mockRes();
  await quizController.getShortAnswers(mockReq({ params: { id: 40, questionId: 2 } }), res);

  assert.equal(questionCall.mock.calls.length, 1);
  assert.equal(res.statusCode, 404);
  assert.equal(pageCall.mock.calls.length, 0);
});

test('getShortAnswers: 400 si la pregunta no es de respuesta corta', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz' }));
  t.mock.method(ContentQuestion, 'findById', async () => ({ id: 2, content_id: 40, question_type: 'multiple_choice' }));
  const res = mockRes();
  await quizController.getShortAnswers(mockReq({ params: { id: 40, questionId: 2 } }), res);
  assert.equal(res.statusCode, 400);
});

test('getShortAnswers: devuelve la página pedida en el mismo formato que /results, con paginación', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 40, type: 'quiz' }));
  t.mock.method(ContentQuestion, 'findById', async () => ({ id: 2, content_id: 40, question_type: 'short_answer' }));
  const pageCall = t.mock.method(ContentAnswer, 'findPageByQuestion', async () => ([
    { id: 900, user_id: 21, student_name: 'Ana', student_email: 'a@x.com', answer_text: 'porque sí', is_correct: 1, submitted_at: 'ayer' }
  ]));
  t.mock.method(ContentAnswer, 'countByQuestion', async () => 45);

  const res = mockRes();
  await quizController.getShortAnswers(mockReq({ params: { id: 40, questionId: 2 }, query: { page: '2' } }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(pageCall.mock.calls[0].arguments, [2, { page: 2, limit: 20 }]);
  assert.deepEqual(res.body.data.answers[0], {
    answer_id: 900, student_name: 'Ana', student_email: 'a@x.com', answer_text: 'porque sí', is_correct: 1, submitted_at: 'ayer'
  });
  assert.deepEqual(res.body.pagination, { page: 2, limit: 20, total: 45, totalPages: 3 });
});

test('getShortAnswers: en una encuesta no manda is_correct (una encuesta no tiene respuesta correcta)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 47, type: 'survey' }));
  t.mock.method(ContentQuestion, 'findById', async () => ({ id: 2, content_id: 47, question_type: 'short_answer' }));
  t.mock.method(ContentAnswer, 'findPageByQuestion', async () => ([{ id: 900, user_id: 21, student_name: 'Ana', answer_text: 'ok', is_correct: null }]));
  t.mock.method(ContentAnswer, 'countByQuestion', async () => 1);

  const res = mockRes();
  await quizController.getShortAnswers(mockReq({ params: { id: 47, questionId: 2 } }), res);

  assert.equal(res.body.data.answers[0].is_correct, undefined);
});
