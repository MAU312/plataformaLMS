import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { requireCourseManager } from '../../src/middlewares/auth.middleware.js';
import Course from '../../src/models/Course.js';
import { mockReq, mockRes } from '../helpers/http.js';

function tempFile() {
  const filePath = path.join(os.tmpdir(), `rcm-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.writeFileSync(filePath, 'contenido de prueba');
  return filePath;
}

async function run(session, courseId = 7) {
  const req = mockReq({ params: { id: String(courseId) }, session });
  const res = mockRes();
  let nextArg = 'not-called';
  await requireCourseManager((r) => r.params.id)(req, res, (err) => { nextArg = err; });
  return { res, nextArg };
}

test('requireCourseManager: sin sesión responde 401 y no llama a next()', async () => {
  const { res, nextArg } = await run(null);
  assert.equal(res.statusCode, 401);
  assert.equal(nextArg, 'not-called');
});

test('requireCourseManager: admin siempre pasa, sin consultar Course.isUserTeacher', async (t) => {
  const isTeacherCall = t.mock.method(Course, 'isUserTeacher', async () => false);
  const { res, nextArg } = await run({ user: { id: 1, role: 'admin' } });
  assert.equal(nextArg, undefined, 'next() se llama sin argumentos en éxito');
  assert.equal(res.statusCode, 200, 'no debe haber tocado el status de respuesta');
  assert.equal(isTeacherCall.mock.calls.length, 0);
});

test('requireCourseManager: un estudiante recibe 403', async () => {
  const { res, nextArg } = await run({ user: { id: 2, role: 'student' } });
  assert.equal(res.statusCode, 403);
  assert.equal(nextArg, 'not-called');
});

test('requireCourseManager: profesor asignado a ESE curso pasa', async (t) => {
  t.mock.method(Course, 'isUserTeacher', async (courseId, userId) => courseId === '7' && userId === 3);
  const { res, nextArg } = await run({ user: { id: 3, role: 'teacher' } }, 7);
  assert.equal(nextArg, undefined);
  assert.equal(res.statusCode, 200);
});

test('requireCourseManager: profesor de OTRO curso recibe 403', async (t) => {
  t.mock.method(Course, 'isUserTeacher', async () => false);
  const { res, nextArg } = await run({ user: { id: 3, role: 'teacher' } }, 7);
  assert.equal(res.statusCode, 403);
  assert.equal(nextArg, 'not-called');
});

test('requireCourseManager: si resolveCourseId no encuentra el curso, responde 404', async () => {
  const req = mockReq({ params: {}, session: { user: { id: 3, role: 'teacher' } } });
  const res = mockRes();
  let nextArg = 'not-called';
  await requireCourseManager(() => null)(req, res, (err) => { nextArg = err; });
  assert.equal(res.statusCode, 404);
  assert.equal(nextArg, 'not-called');
});

test('requireCourseManager: si rechaza y ya había un archivo subido (multer corrió antes), lo borra del disco', async (t) => {
  t.mock.method(Course, 'isUserTeacher', async () => false);
  const filePath = tempFile();
  const req = mockReq({
    params: { id: '7' },
    session: { user: { id: 3, role: 'teacher' } },
    file: { path: filePath }
  });
  const res = mockRes();

  await requireCourseManager((r) => r.params.id)(req, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.equal(fs.existsSync(filePath), false, 'el archivo subido antes del rechazo debe eliminarse, no quedar huérfano');
});

test('requireCourseManager: si aprueba, no toca el archivo subido', async (t) => {
  t.mock.method(Course, 'isUserTeacher', async () => true);
  const filePath = tempFile();
  const req = mockReq({
    params: { id: '7' },
    session: { user: { id: 3, role: 'teacher' } },
    file: { path: filePath }
  });
  const res = mockRes();
  let nextCalled = false;

  await requireCourseManager((r) => r.params.id)(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(fs.existsSync(filePath), true);
  fs.unlinkSync(filePath);
});
