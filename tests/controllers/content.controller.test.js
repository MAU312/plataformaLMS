import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as contentController from '../../src/controllers/content.controller.js';
import Content from '../../src/models/Content.js';
import Course from '../../src/models/Course.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('createTaskContent: 201 sin archivo (las instrucciones pueden ir solo en el texto)', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 50);
  const req = mockReq({ body: { course_id: 1, title: 'Ensayo final', description: 'Entrega un PDF de 2 páginas' } });
  const res = mockRes();
  await contentController.createTaskContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.type, 'task');
  assert.equal(created.url, null);
});

test('createTaskContent: 201 con archivo de instrucciones adjunto', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 51);
  const req = mockReq({
    body: { course_id: 1, title: 'Ensayo final' },
    file: { filename: 'instrucciones-123.pdf', size: 2048 }
  });
  const res = mockRes();
  await contentController.createTaskContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.url, '/uploads/files/instrucciones-123.pdf');
  assert.equal(created.file_size, 2048);
});

test('createTaskContent: 400 si falta el título', async (t) => {
  const req = mockReq({ body: { course_id: 1 } });
  const res = mockRes();
  await contentController.createTaskContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createTextContent: 400 si falta el título', async (t) => {
  const req = mockReq({ body: { course_id: 1, description: 'algo de texto' } });
  const res = mockRes();
  await contentController.createTextContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createTextContent: 400 si el texto viene vacío (solo espacios)', async (t) => {
  const req = mockReq({ body: { course_id: 1, title: 'Lectura', description: '   ' } });
  const res = mockRes();
  await contentController.createTextContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createTextContent: 201 y guarda el texto en description con url null', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 42);
  const req = mockReq({ body: { course_id: 1, title: 'Lectura', description: 'contenido real de la lección' } });
  const res = mockRes();
  await contentController.createTextContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.type, 'text');
  assert.equal(created.description, 'contenido real de la lección');
  assert.equal(created.url, null);
});

test('createUrlContent: 400 si la URL no es http/https (ej. javascript:)', async (t) => {
  const req = mockReq({ body: { course_id: 1, title: 'Video externo', url: 'javascript:alert(1)' } });
  const res = mockRes();
  await contentController.createUrlContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createUrlContent: 400 si falta la URL', async (t) => {
  const req = mockReq({ body: { course_id: 1, title: 'Video externo' } });
  const res = mockRes();
  await contentController.createUrlContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createUrlContent: 201 con una URL https válida', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 43);
  const req = mockReq({ body: { course_id: 1, title: 'Video externo', url: 'https://www.youtube.com/watch?v=abc' } });
  const res = mockRes();
  await contentController.createUrlContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.type, 'url');
  assert.equal(created.url, 'https://www.youtube.com/watch?v=abc');
});

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

test('downloadFile: 403 si un estudiante no inscrito (ni profesor del curso) intenta descargar', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 403);
});

test('downloadFile: 404 si el archivo ya no existe en disco', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Course, 'isUserTeacher', async () => false);
  t.mock.method(fs, 'existsSync', () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 404);
});

test('downloadFile: un estudiante inscrito puede descargar', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Course, 'isUserTeacher', async () => false);
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.downloadCall.fileName, 'x.pdf');
});

test('downloadFile: un profesor del curso puede descargar sin estar inscrito', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => true);
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'teacher' } } });
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
  t.mock.method(Course, 'isUserTeacher', async () => false);

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
