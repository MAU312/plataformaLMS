import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as contentController from '../../src/controllers/content.controller.js';
import Content from '../../src/models/Content.js';
import Course from '../../src/models/Course.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('downloadFile: 404 si el contenido no existe', async (t) => {
  t.mock.method(Content, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 404);
});

test('downloadFile: 400 si el contenido no es de tipo "file" (ej. es un video)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'video', course_id: 1 }));
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 400);
});

test('downloadFile: 403 si un estudiante no inscrito intenta descargar', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 403);
});

test('downloadFile: 404 si el archivo ya no existe en disco', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(fs, 'existsSync', () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 404);
});

test('downloadFile: un estudiante inscrito puede descargar', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.downloadCall.fileName, 'x.pdf');
});

test('downloadFile: un admin descarga sin necesitar inscripción', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  const enrolledCheck = t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'admin' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.downloadCall.fileName, 'x.pdf');
  assert.equal(enrolledCheck.mock.calls.length, 0, 'un admin no debería requerir la verificación de inscripción');
});

test('markContentCompleted: 403 si un estudiante no inscrito intenta marcar progreso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, course_id: 1 }));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentCompleted(req, res);
  assert.equal(res.statusCode, 403);
});

test('markContentCompleted: éxito recalcula y devuelve el progreso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, course_id: 1 }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Content, 'markCompleted', async () => 10);
  t.mock.method(Content, 'recalculateCourseProgress', async () => ({ progress: 50, total: 2, completed: 1 }));

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentCompleted(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.progress, 50);
});

test('getContentsByCourse: oculta URLs a un usuario con sesión pero no inscrito', async (t) => {
  t.mock.method(Content, 'findByCourseWithProgress', async () => ([{ id: 1, url: '/uploads/videos/x.mp4' }]));
  t.mock.method(Course, 'isUserEnrolled', async () => false);

  const req = mockReq({ params: { courseId: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.getContentsByCourse(req, res);

  assert.equal(res.body.data[0].url, null);
});

test('getContentsByCourse: oculta URLs a un visitante anónimo (sin sesión)', async (t) => {
  t.mock.method(Content, 'findByCourse', async () => ([{ id: 1, url: '/uploads/videos/x.mp4' }]));

  const req = mockReq({ params: { courseId: 1 }, session: null });
  const res = mockRes();
  await contentController.getContentsByCourse(req, res);

  assert.equal(res.body.data[0].url, null);
});
