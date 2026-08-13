import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as submissionController from '../../src/controllers/submission.controller.js';
import Content from '../../src/models/Content.js';
import Course from '../../src/models/Course.js';
import TaskSubmission from '../../src/models/TaskSubmission.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('submitTask: 400 si no viene archivo', async () => {
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 2, role: 'student' } } });
  req.taskContent = { id: 1, course_id: 5 };
  const res = mockRes();
  await submissionController.submitTask(req, res);
  assert.equal(res.statusCode, 400);
});

test('submitTask: 400 y borra el archivo si ya había entregado (TaskSubmission.create devuelve null)', async (t) => {
  t.mock.method(TaskSubmission, 'create', async () => null);
  const deleteFileCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 2, role: 'student' } }, file: { filename: 'x.pdf' } });
  req.taskContent = { id: 1, course_id: 5 };
  const res = mockRes();

  await submissionController.submitTask(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Solo se permite una entrega/);
  assert.equal(deleteFileCall.mock.calls.length, 1, 'debe borrar el archivo recién subido, no dejarlo huérfano');
});

test('submitTask: éxito marca la tarea como completada y recalcula el progreso', async (t) => {
  t.mock.method(TaskSubmission, 'create', async () => 77);
  const markCompletedCall = t.mock.method(Content, 'markCompleted', async () => true);
  const recalcCall = t.mock.method(Content, 'recalculateCourseProgress', async () => ({ progress: 100, total: 3, completed: 3 }));

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 2, role: 'student' } }, file: { filename: 'x.pdf' } });
  req.taskContent = { id: 1, course_id: 5 };
  const res = mockRes();

  await submissionController.submitTask(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(markCompletedCall.mock.calls[0].arguments[0], 1);
  assert.equal(markCompletedCall.mock.calls[0].arguments[1], 2);
  assert.equal(recalcCall.mock.calls[0].arguments[0], 5);
  assert.equal(res.body.data.progress, 100);
});

test('getMySubmission: devuelve null si el usuario no ha entregado (no un error)', async (t) => {
  t.mock.method(TaskSubmission, 'findByContentAndUser', async () => undefined);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 2 } } });
  const res = mockRes();
  await submissionController.getMySubmission(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data, null);
});

test('downloadSubmission: 404 si la entrega no existe', async (t) => {
  t.mock.method(TaskSubmission, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await submissionController.downloadSubmission(req, res);
  assert.equal(res.statusCode, 404);
});

test('downloadSubmission: 403 si no es el dueño, ni admin, ni profesor del curso', async (t) => {
  t.mock.method(TaskSubmission, 'findById', async () => ({ id: 1, content_id: 10, user_id: 99, file_url: '/uploads/submissions/x.pdf' }));
  t.mock.method(Content, 'findById', async () => ({ id: 10, course_id: 5 }));
  t.mock.method(Course, 'isUserTeacher', async () => false);

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await submissionController.downloadSubmission(req, res);
  assert.equal(res.statusCode, 403);
});

test('downloadSubmission: el propio estudiante dueño puede descargar sin ser admin/profesor', async (t) => {
  t.mock.method(TaskSubmission, 'findById', async () => ({ id: 1, content_id: 10, user_id: 2, file_url: '/uploads/submissions/x.pdf' }));
  t.mock.method(Content, 'findById', async () => ({ id: 10, course_id: 5 }));
  t.mock.method(fs, 'existsSync', () => true);

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await submissionController.downloadSubmission(req, res);
  assert.equal(res.downloadCall.fileName, 'x.pdf');
});

test('downloadSubmission: el profesor del curso puede descargar sin ser el dueño', async (t) => {
  t.mock.method(TaskSubmission, 'findById', async () => ({ id: 1, content_id: 10, user_id: 99, file_url: '/uploads/submissions/x.pdf' }));
  t.mock.method(Content, 'findById', async () => ({ id: 10, course_id: 5 }));
  t.mock.method(Course, 'isUserTeacher', async () => true);
  t.mock.method(fs, 'existsSync', () => true);

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 3, role: 'teacher' } } });
  const res = mockRes();
  await submissionController.downloadSubmission(req, res);
  assert.equal(res.downloadCall.fileName, 'x.pdf');
});

test('reviewSubmission: 404 si la entrega no existe', async (t) => {
  t.mock.method(TaskSubmission, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 }, body: { feedback: 'ok' } });
  const res = mockRes();
  await submissionController.reviewSubmission(req, res);
  assert.equal(res.statusCode, 404);
});

test('reviewSubmission: éxito marca revisada con el feedback dado', async (t) => {
  t.mock.method(TaskSubmission, 'findById', async () => ({ id: 1, content_id: 10, user_id: 2 }));
  const markCall = t.mock.method(TaskSubmission, 'markReviewed', async () => true);

  const req = mockReq({ params: { id: 1 }, body: { feedback: 'Buen trabajo' } });
  const res = mockRes();
  await submissionController.reviewSubmission(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(markCall.mock.calls[0].arguments, [1, 'Buen trabajo']);
});
