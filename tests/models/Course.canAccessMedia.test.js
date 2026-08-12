import test from 'node:test';
import assert from 'node:assert/strict';
import Course from '../../src/models/Course.js';

test('canAccessMedia: false si no hay usuario (visitante anónimo)', async () => {
  const result = await Course.canAccessMedia(1, null);
  assert.equal(result, false);
});

test('canAccessMedia: true para admin, sin consultar inscripción ni asignación', async (t) => {
  const enrolledCall = t.mock.method(Course, 'isUserEnrolled', async () => false);
  const teacherCall = t.mock.method(Course, 'isUserTeacher', async () => false);

  const result = await Course.canAccessMedia(1, { id: 9, role: 'admin' });

  assert.equal(result, true);
  assert.equal(enrolledCall.mock.calls.length, 0);
  assert.equal(teacherCall.mock.calls.length, 0);
});

test('canAccessMedia: true si el usuario está inscrito', async (t) => {
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Course, 'isUserTeacher', async () => false);

  const result = await Course.canAccessMedia(1, { id: 2, role: 'student' });

  assert.equal(result, true);
});

test('canAccessMedia: true si el usuario es profesor asignado a ese curso', async (t) => {
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => true);

  const result = await Course.canAccessMedia(1, { id: 3, role: 'teacher' });

  assert.equal(result, true);
});

test('canAccessMedia: false si no está inscrito ni es profesor de ese curso', async (t) => {
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => false);

  const result = await Course.canAccessMedia(1, { id: 4, role: 'teacher' });

  assert.equal(result, false);
});
