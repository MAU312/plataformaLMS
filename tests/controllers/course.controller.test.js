import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as courseController from '../../src/controllers/course.controller.js';
import Course from '../../src/models/Course.js';
import User from '../../src/models/User.js';
import certificateGenerator from '../../src/utils/certificate.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('getAllCourses: usuario no-admin recibe solo cursos activos, con valores de paginación por defecto', async (t) => {
  const findAllCall = t.mock.method(Course, 'findAll', async () => ({ rows: [{ id: 1 }], total: 1 }));
  const req = mockReq({ query: {}, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();

  await courseController.getAllCourses(req, res);

  assert.equal(findAllCall.mock.calls.length, 1);
  assert.deepEqual(findAllCall.mock.calls[0].arguments[0], { page: 1, limit: 12, search: '' });
  assert.deepEqual(res.body.pagination, { page: 1, limit: 12, total: 1, totalPages: 1 });
});

test('getAllCourses: admin recibe también los inactivos (findAllForAdmin)', async (t) => {
  const findAllForAdminCall = t.mock.method(Course, 'findAllForAdmin', async () => ({ rows: [], total: 0 }));
  const req = mockReq({ query: {}, session: { user: { id: 1, role: 'admin' } } });
  const res = mockRes();

  await courseController.getAllCourses(req, res);

  assert.equal(findAllForAdminCall.mock.calls.length, 1);
});

test('getAllCourses: limita el "limit" recibido por query string a un máximo de 50', async (t) => {
  const findAllCall = t.mock.method(Course, 'findAll', async () => ({ rows: [], total: 0 }));
  const req = mockReq({ query: { limit: '999', page: '2', search: '  ia  ' }, session: null });
  const res = mockRes();

  await courseController.getAllCourses(req, res);

  const args = findAllCall.mock.calls[0].arguments[0];
  assert.equal(args.limit, 50);
  assert.equal(args.page, 2);
  assert.equal(args.search, 'ia', 'debe recortar espacios del término de búsqueda');
});

test('createCourse: falla si falta el título', async () => {
  const req = mockReq({ body: {}, session: { user: { id: 1 } } });
  const res = mockRes();
  await courseController.createCourse(req, res);
  assert.equal(res.statusCode, 400);
});

test('createCourse: ya no usa instructor_id (queda deprecado en null) — la asignación es vía teacher_ids', async (t) => {
  const createCall = t.mock.method(Course, 'create', async () => 99);
  t.mock.method(Course, 'assignTeachers', async () => true);
  const req = mockReq({
    body: { title: 'Curso nuevo', instructor_id: 999 },
    session: { user: { id: 1 } }
  });
  const res = mockRes();

  await courseController.createCourse(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.instructor_id, null, 'instructor_id del body se ignora, y ya no se autoasigna al admin de la sesión');
});

test('createCourse: asigna solo los teacher_ids que corresponden a usuarios con rol teacher activos', async (t) => {
  t.mock.method(Course, 'create', async () => 99);
  t.mock.method(User, 'findByRole', async () => ([{ id: 5 }, { id: 6 }]));
  const assignCall = t.mock.method(Course, 'assignTeachers', async () => true);
  const req = mockReq({
    body: { title: 'Curso nuevo', teacher_ids: JSON.stringify([5, 6, 999]) },
    session: { user: { id: 1 } }
  });
  const res = mockRes();

  await courseController.createCourse(req, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(assignCall.mock.calls[0].arguments[1], [5, 6], 'el id 999 no corresponde a un profesor válido y se descarta');
});

test('createCourse: sin teacher_ids en el body, asigna una lista vacía (curso sin profesores)', async (t) => {
  t.mock.method(Course, 'create', async () => 99);
  const assignCall = t.mock.method(Course, 'assignTeachers', async () => true);
  const req = mockReq({ body: { title: 'Curso nuevo' }, session: { user: { id: 1 } } });
  const res = mockRes();

  await courseController.createCourse(req, res);

  assert.deepEqual(assignCall.mock.calls[0].arguments[1], []);
});

test('createCourse: si Course.create falla, borra la miniatura recién subida (no queda huérfana)', async (t) => {
  t.mock.method(Course, 'create', async () => { throw new Error('boom'); });
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    body: { title: 'Curso nuevo' },
    session: { user: { id: 1 } },
    file: { filename: 'portada.png' }
  });
  const res = mockRes();

  await courseController.createCourse(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(unlinkCall.mock.calls.length, 1, 'la miniatura subida no debe quedar huérfana en disco');
});

test('updateCourse: borra la miniatura anterior solo DESPUÉS de confirmar el UPDATE en BD', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso', thumbnail: '/uploads/thumbnails/vieja.png' }));
  const callOrder = [];
  t.mock.method(Course, 'update', async () => { callOrder.push('update'); return true; });
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => { callOrder.push('unlink'); });
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    params: { id: 1 },
    body: { title: 'Curso' },
    file: { filename: 'nueva.png' }
  });
  const res = mockRes();

  await courseController.updateCourse(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(unlinkCall.mock.calls.length, 1);
  assert.deepEqual(callOrder, ['update', 'unlink'], 'el UPDATE en BD debe confirmar antes de borrar el archivo viejo');
});

test('updateCourse: con teacher_ids en el body, reemplaza los profesores asignados', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso', thumbnail: null }));
  t.mock.method(Course, 'update', async () => true);
  t.mock.method(User, 'findByRole', async () => ([{ id: 7 }]));
  const assignCall = t.mock.method(Course, 'assignTeachers', async () => true);
  const req = mockReq({
    params: { id: 1 },
    body: { title: 'Curso', teacher_ids: JSON.stringify([7]) }
  });
  const res = mockRes();

  await courseController.updateCourse(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(assignCall.mock.calls[0].arguments, [1, [7]]);
});

test('updateCourse: sin teacher_ids en el body, NO toca la asignación de profesores existente', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso', thumbnail: null }));
  t.mock.method(Course, 'update', async () => true);
  const assignCall = t.mock.method(Course, 'assignTeachers', async () => true);
  const req = mockReq({ params: { id: 1 }, body: { title: 'Curso actualizado' } });
  const res = mockRes();

  await courseController.updateCourse(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(assignCall.mock.calls.length, 0);
});

test('getCourseTeachers: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.getCourseTeachers(req, res);
  assert.equal(res.statusCode, 404);
});

test('getCourseTeachers: devuelve el curso y la lista de profesores asignados', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  t.mock.method(Course, 'getCourseTeachers', async () => ([{ id: 5, name: 'Prof', email: 'p@test.com' }]));
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.getCourseTeachers(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.teachers.length, 1);
});

test('getTeachingCourses: pasa el id del usuario en sesión a Course.getCoursesForTeacher', async (t) => {
  const call = t.mock.method(Course, 'getCoursesForTeacher', async () => ([{ id: 1 }]));
  const req = mockReq({ session: { user: { id: 9 } } });
  const res = mockRes();
  await courseController.getTeachingCourses(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(call.mock.calls[0].arguments[0], 9);
});

test('enrollCourse: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 5 }, session: { user: { id: 1 } } });
  const res = mockRes();
  await courseController.enrollCourse(req, res);
  assert.equal(res.statusCode, 404);
});

test('enrollCourse: 403 si el curso está desactivado', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 5, is_active: 0 }));
  const req = mockReq({ params: { id: 5 }, session: { user: { id: 1 } } });
  const res = mockRes();
  await courseController.enrollCourse(req, res);
  assert.equal(res.statusCode, 403);
});

test('enrollCourse: 400 si ya estaba inscrito (constraint UNIQUE -> enrollUser devuelve null)', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 5, is_active: 1 }));
  t.mock.method(Course, 'enrollUser', async () => null);
  const req = mockReq({ params: { id: 5 }, session: { user: { id: 1 } } });
  const res = mockRes();
  await courseController.enrollCourse(req, res);
  assert.equal(res.statusCode, 400);
});

test('enrollCourse: 201 en inscripción exitosa', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 5, is_active: 1 }));
  t.mock.method(Course, 'enrollUser', async () => 123);
  const req = mockReq({ params: { id: 5 }, session: { user: { id: 1 } } });
  const res = mockRes();
  await courseController.enrollCourse(req, res);
  assert.equal(res.statusCode, 201);
});

test('unenrollCourse: 400 si no estaba inscrito', async (t) => {
  t.mock.method(Course, 'unenrollUser', async () => false);
  const req = mockReq({ params: { id: 5 }, session: { user: { id: 1 } } });
  const res = mockRes();
  await courseController.unenrollCourse(req, res);
  assert.equal(res.statusCode, 400);
});

test('getCourseById: oculta las URLs de contenido a un visitante no inscrito', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 5, title: 'Curso' }));
  t.mock.method(Course, 'getContents', async () => ([
    { id: 1, title: 'Video 1', url: '/uploads/videos/secreto.mp4' }
  ]));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => false);

  const req = mockReq({ params: { id: 5 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await courseController.getCourseById(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.contents[0].url, null);
  assert.equal(res.body.data.isEnrolled, false);
});

test('getCourseById: expone las URLs reales a un estudiante inscrito', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 5, title: 'Curso' }));
  t.mock.method(Course, 'getContents', async () => ([
    { id: 1, title: 'Video 1', url: '/uploads/videos/real.mp4' }
  ]));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Course, 'isUserTeacher', async () => false);

  const req = mockReq({ params: { id: 5 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await courseController.getCourseById(req, res);

  assert.equal(res.body.data.contents[0].url, '/uploads/videos/real.mp4');
});

test('getCourseById: expone las URLs reales a un admin sin importar inscripción', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 5, title: 'Curso' }));
  t.mock.method(Course, 'getContents', async () => ([
    { id: 1, title: 'Video 1', url: '/uploads/videos/real.mp4' }
  ]));
  t.mock.method(Course, 'isUserEnrolled', async () => false);

  const req = mockReq({ params: { id: 5 }, session: { user: { id: 2, role: 'admin' } } });
  const res = mockRes();
  await courseController.getCourseById(req, res);

  assert.equal(res.body.data.contents[0].url, '/uploads/videos/real.mp4');
});

test('getCourseById: expone las URLs reales a un profesor asignado al curso, sin estar inscrito', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 5, title: 'Curso' }));
  t.mock.method(Course, 'getContents', async () => ([
    { id: 1, title: 'Video 1', url: '/uploads/videos/real.mp4' }
  ]));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => true);

  const req = mockReq({ params: { id: 5 }, session: { user: { id: 2, role: 'teacher' } } });
  const res = mockRes();
  await courseController.getCourseById(req, res);

  assert.equal(res.body.data.contents[0].url, '/uploads/videos/real.mp4');
});

test('getCourseById: oculta las URLs a un visitante anónimo (sin sesión)', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 5, title: 'Curso' }));
  t.mock.method(Course, 'getContents', async () => ([
    { id: 1, title: 'Video 1', url: '/uploads/videos/real.mp4' }
  ]));

  const req = mockReq({ params: { id: 5 }, session: null });
  const res = mockRes();
  await courseController.getCourseById(req, res);

  assert.equal(res.body.data.contents[0].url, null);
});

test('getCertificate: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, name: 'Ana' } } });
  const res = mockRes();
  await courseController.getCertificate(req, res);
  assert.equal(res.statusCode, 404);
});

test('getCertificate: 403 si el usuario no está inscrito', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  t.mock.method(Course, 'getEnrollment', async () => undefined);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, name: 'Ana' } } });
  const res = mockRes();
  await courseController.getCertificate(req, res);
  assert.equal(res.statusCode, 403);
});

test('getCertificate: 403 si está inscrito pero no ha completado el curso (completed_at null)', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  t.mock.method(Course, 'getEnrollment', async () => ({ progress: 60, completed_at: null }));
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, name: 'Ana' } } });
  const res = mockRes();
  await courseController.getCertificate(req, res);
  assert.equal(res.statusCode, 403);
});

test('getCertificate: genera el PDF con los datos correctos cuando el curso está completado', async (t) => {
  const completedAt = new Date('2026-01-15');
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Introducción a la IA' }));
  t.mock.method(Course, 'getEnrollment', async () => ({ progress: 100, completed_at: completedAt }));
  const genCall = t.mock.method(certificateGenerator, 'generateCertificate', () => {});

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, name: 'Ana Pérez' } } });
  const res = mockRes();
  await courseController.getCertificate(req, res);

  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.match(res.headers['Content-Disposition'], /attachment/);
  assert.equal(genCall.mock.calls.length, 1);
  const args = genCall.mock.calls[0].arguments[0];
  assert.equal(args.studentName, 'Ana Pérez');
  assert.equal(args.courseTitle, 'Introducción a la IA');
  assert.equal(args.completedAt, completedAt);
});

test('getCourseStudents: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.getCourseStudents(req, res);
  assert.equal(res.statusCode, 404);
});

test('getCourseStudents: devuelve el curso y la lista de estudiantes con su progreso', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  t.mock.method(Course, 'getEnrolledStudents', async () => ([
    { id: 2, name: 'Ana', email: 'ana@test.com', progress: 100, completed_at: new Date() },
    { id: 3, name: 'Beto', email: 'beto@test.com', progress: 40, completed_at: null }
  ]));

  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.getCourseStudents(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.students.length, 2);
  assert.equal(res.body.data.course.title, 'Curso');
});
