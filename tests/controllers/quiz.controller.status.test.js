import test from 'node:test';
import assert from 'node:assert/strict';
import Course from '../../src/models/Course.js';
import ContentAnswer from '../../src/models/ContentAnswer.js';
import * as quizController from '../../src/controllers/quiz.controller.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('getQuizStatusByCourse: 403 si el usuario no es admin, inscrito ni profesor del curso', async (t) => {
  t.mock.method(Course, 'canAccessMedia', async () => false);
  const statusCall = t.mock.method(ContentAnswer, 'getStatusByCourse', async () => []);

  const res = mockRes();
  await quizController.getQuizStatusByCourse(mockReq({ params: { courseId: 5 }, session: { user: { id: 2, role: 'student' } } }), res);

  assert.equal(res.statusCode, 403);
  assert.equal(statusCall.mock.calls.length, 0, 'no debe ni consultar el estado si no tiene acceso');
});

test('getQuizStatusByCourse: devuelve un mapa { contentId: { already_answered, score, max_score, pending } } con números reales (MySQL manda SUM como string)', async (t) => {
  t.mock.method(Course, 'canAccessMedia', async () => true);
  const statusCall = t.mock.method(ContentAnswer, 'getStatusByCourse', async () => ([
    { content_id: 10, answered_count: 3, max_score: '6', score: '4', pending_count: 1 },
    { content_id: 11, answered_count: 0, max_score: '2', score: '0', pending_count: 0 }
  ]));

  const res = mockRes();
  await quizController.getQuizStatusByCourse(mockReq({ params: { courseId: 5 }, session: { user: { id: 2, role: 'student' } } }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(statusCall.mock.calls[0].arguments, [5, 2]);
  assert.deepEqual(res.body.data, {
    10: { already_answered: true, score: 4, max_score: 6, pending: 1 },
    11: { already_answered: false, score: 0, max_score: 2, pending: 0 }
  });
});

test('getQuizStatusByCourse: un curso sin quizzes devuelve un mapa vacío', async (t) => {
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(ContentAnswer, 'getStatusByCourse', async () => []);

  const res = mockRes();
  await quizController.getQuizStatusByCourse(mockReq({ params: { courseId: 5 }, session: { user: { id: 2, role: 'admin' } } }), res);

  assert.deepEqual(res.body.data, {});
});

test('getQuizStatusByCourse: 500 si la consulta falla', async (t) => {
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(ContentAnswer, 'getStatusByCourse', async () => { throw new Error('conexión perdida'); });

  const res = mockRes();
  await quizController.getQuizStatusByCourse(mockReq({ params: { courseId: 5 }, session: { user: { id: 2, role: 'admin' } } }), res);

  assert.equal(res.statusCode, 500);
});

test('createQuizContent: 400 si una opción supera los 500 caracteres (option_text es VARCHAR(500))', async () => {
  const req = mockReq({
    body: {
      course_id: 1, title: 'Quiz',
      questions: [{ text: 'P1', question_type: 'multiple_choice', options: [{ text: 'x'.repeat(501), is_correct: true }, { text: 'B', is_correct: false }] }]
    }
  });
  const res = mockRes();
  await quizController.createQuizContent(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /500/);
});

test('createQuizContent: 400 si el texto de una pregunta supera el límite de una columna TEXT (65.535 bytes)', async () => {
  const req = mockReq({
    body: {
      course_id: 1, title: 'Quiz',
      questions: [{ text: 'á'.repeat(40000), question_type: 'short_answer' }]
    }
  });
  const res = mockRes();
  await quizController.createQuizContent(req, res);
  assert.equal(res.statusCode, 400, '40.000 "á" son 80.000 bytes en UTF-8, aunque solo 40.000 caracteres');
});
