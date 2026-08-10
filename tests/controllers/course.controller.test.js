import test from 'node:test';
import assert from 'node:assert/strict';
import * as courseController from '../../src/controllers/course.controller.js';
import Course from '../../src/models/Course.js';
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

test('createCourse: usa el usuario de la sesión como instructor, no algo enviado por el cliente', async (t) => {
  const createCall = t.mock.method(Course, 'create', async () => 99);
  const req = mockReq({
    body: { title: 'Curso nuevo', instructor_id: 999 },
    session: { user: { id: 1 } }
  });
  const res = mockRes();

  await courseController.createCourse(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.instructor_id, 1, 'debe ignorar instructor_id del body y usar el de la sesión');
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
