import test from 'node:test';
import assert from 'node:assert/strict';
import { requireCourseManager } from '../../src/middlewares/auth.middleware.js';
import Course from '../../src/models/Course.js';
import { mockReq, mockRes } from '../helpers/http.js';

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
