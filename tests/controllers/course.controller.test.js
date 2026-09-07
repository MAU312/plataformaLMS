import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as courseController from '../../src/controllers/course.controller.js';
import Course from '../../src/models/Course.js';
import User from '../../src/models/User.js';
import Content from '../../src/models/Content.js';
import TaskSubmission from '../../src/models/TaskSubmission.js';
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

test('getEnrolledCourses: valores de paginación por defecto', async (t) => {
  const getCall = t.mock.method(User, 'getEnrolledCourses', async () => ({ rows: [{ id: 1 }], total: 1 }));
  const req = mockReq({ query: {}, session: { user: { id: 5 } } });
  const res = mockRes();

  await courseController.getEnrolledCourses(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(getCall.mock.calls[0].arguments, [5, { page: 1, limit: 12 }]);
  assert.deepEqual(res.body.pagination, { page: 1, limit: 12, total: 1, totalPages: 1 });
});

test('getEnrolledCourses: limita el "limit" recibido por query string a un máximo de 50 (usado por el perfil para pedir "todos")', async (t) => {
  const getCall = t.mock.method(User, 'getEnrolledCourses', async () => ({ rows: [], total: 0 }));
  const req = mockReq({ query: { limit: '9999', page: '3' }, session: { user: { id: 5 } } });
  const res = mockRes();

  await courseController.getEnrolledCourses(req, res);

  assert.deepEqual(getCall.mock.calls[0].arguments, [5, { page: 3, limit: 50 }]);
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

test('createCourse: usa "classic" por defecto si no se indica certificate_style', async (t) => {
  const createCall = t.mock.method(Course, 'create', async () => 99);
  t.mock.method(Course, 'assignTeachers', async () => true);
  const req = mockReq({ body: { title: 'Curso nuevo' }, session: { user: { id: 1 } } });
  const res = mockRes();

  await courseController.createCourse(req, res);

  assert.equal(createCall.mock.calls[0].arguments[0].certificate_style, 'classic');
});

test('createCourse: 400 si certificate_style no es uno de los estilos válidos (y borra la miniatura ya subida)', async (t) => {
  const createCall = t.mock.method(Course, 'create', async () => 99);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    body: { title: 'Curso nuevo', certificate_style: 'no-existe' },
    session: { user: { id: 1 } },
    file: { filename: 'portada.png' }
  });
  const res = mockRes();

  await courseController.createCourse(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(createCall.mock.calls.length, 0);
  assert.equal(unlinkCall.mock.calls.length, 1, 'la miniatura ya subida por multer no debe quedar huérfana');
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

test('createCourse: si assignTeachers falla tras crear el curso, deshace la creación (Course.delete) antes de borrar la miniatura', async (t) => {
  t.mock.method(Course, 'create', async () => 99);
  const deleteCall = t.mock.method(Course, 'delete', async () => true);
  t.mock.method(User, 'findByRole', async () => ([{ id: 999 }]));
  t.mock.method(Course, 'assignTeachers', async () => { throw new Error('teacherId inválido'); });
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    body: { title: 'Curso nuevo', teacher_ids: JSON.stringify([999]) },
    session: { user: { id: 1 } },
    file: { filename: 'portada.png' }
  });
  const res = mockRes();

  await courseController.createCourse(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(deleteCall.mock.calls.length, 1, 'el curso a medio crear debe deshacerse, no quedar huérfano en BD');
  assert.equal(deleteCall.mock.calls[0].arguments[0], 99);
  assert.equal(unlinkCall.mock.calls.length, 1, 'la miniatura también debe borrarse una vez deshecha la creación');
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

test('updateCourse: actualiza certificate_style cuando viene un id válido', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso', thumbnail: null }));
  const updateCall = t.mock.method(Course, 'update', async () => true);
  const req = mockReq({ params: { id: 1 }, body: { certificate_style: 'minimal' } });
  const res = mockRes();

  await courseController.updateCourse(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateCall.mock.calls[0].arguments[1].certificate_style, 'minimal');
});

test('updateCourse: 400 si certificate_style no es un estilo válido, sin llegar a tocar Course.update', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso', thumbnail: null }));
  const updateCall = t.mock.method(Course, 'update', async () => true);
  const req = mockReq({ params: { id: 1 }, body: { certificate_style: 'no-existe' } });
  const res = mockRes();

  await courseController.updateCourse(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCall.mock.calls.length, 0);
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
  t.mock.method(Content, 'findByCourse', async () => ([
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
  t.mock.method(Content, 'findByCourse', async () => ([
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
  t.mock.method(Content, 'findByCourse', async () => ([
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
  t.mock.method(Content, 'findByCourse', async () => ([
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
  t.mock.method(Content, 'findByCourse', async () => ([
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
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Introducción a la IA', certificate_style: 'modern' }));
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
  assert.equal(args.style, 'modern', 'debe pasar el estilo elegido para este curso al generador');
});

test('getCourseStudents: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.getCourseStudents(req, res);
  assert.equal(res.statusCode, 404);
});

test('getCourseStudents: devuelve el curso, la lista de estudiantes con su progreso, y la paginación', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  const getStudentsCall = t.mock.method(Course, 'getEnrolledStudents', async () => ({
    rows: [
      { id: 2, name: 'Ana', email: 'ana@test.com', progress: 100, completed_at: new Date() },
      { id: 3, name: 'Beto', email: 'beto@test.com', progress: 40, completed_at: null }
    ],
    total: 2
  }));
  t.mock.method(Content, 'calculateCourseGrade', async () => null);

  const req = mockReq({ params: { id: 1 }, query: {} });
  const res = mockRes();
  await courseController.getCourseStudents(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.students.length, 2);
  assert.equal(res.body.data.course.title, 'Curso');
  assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total: 2, totalPages: 1 });
  assert.deepEqual(getStudentsCall.mock.calls[0].arguments, [1, { page: 1, limit: 20 }]);
});

test('getCourseStudents: limita el "limit" recibido por query string a un máximo de 50', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  const getStudentsCall = t.mock.method(Course, 'getEnrolledStudents', async () => ({ rows: [], total: 0 }));
  t.mock.method(Content, 'calculateCourseGrade', async () => null);

  const req = mockReq({ params: { id: 1 }, query: { page: '2', limit: '9999' } });
  const res = mockRes();
  await courseController.getCourseStudents(req, res);

  assert.deepEqual(getStudentsCall.mock.calls[0].arguments, [1, { page: 2, limit: 50 }]);
});

test('getCourseStudents: adjunta la nota calculada de cada estudiante (Content.calculateCourseGrade)', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  t.mock.method(Course, 'getEnrolledStudents', async () => ({
    rows: [
      { id: 2, name: 'Ana', email: 'ana@test.com', progress: 100 },
      { id: 3, name: 'Beto', email: 'beto@test.com', progress: 40 }
    ],
    total: 2
  }));
  const gradeCall = t.mock.method(Content, 'calculateCourseGrade', async (courseId, userId) => (userId === 2 ? 85.5 : null));

  const req = mockReq({ params: { id: 1 }, query: {} });
  const res = mockRes();
  await courseController.getCourseStudents(req, res);

  assert.equal(res.body.data.students[0].grade, 85.5);
  assert.equal(res.body.data.students[1].grade, null);
  assert.equal(gradeCall.mock.calls.length, 2);
});

// =================================
// deleteCourse
// =================================

test('deleteCourse: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.deleteCourse(req, res);
  assert.equal(res.statusCode, 404);
});

test('deleteCourse: borra la miniatura del curso y el archivo de cada contenido (menos type=url)', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, thumbnail: '/uploads/thumbnails/x.jpg' }));
  t.mock.method(Content, 'findByCourse', async () => ([
    { id: 10, type: 'video', url: '/uploads/videos/a.mp4' },
    { id: 11, type: 'file', url: '/uploads/files/b.pdf' },
    { id: 12, type: 'url', url: 'https://youtube.com/watch?v=x' },
    { id: 13, type: 'text', url: null }
  ]));
  t.mock.method(TaskSubmission, 'findAllByCourse', async () => ([]));
  t.mock.method(Course, 'delete', async () => true);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);

  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.deleteCourse(req, res);

  assert.equal(res.statusCode, 200);
  // 1 miniatura + video + file = 3 (la url externa y el texto sin archivo no cuentan)
  assert.equal(unlinkCall.mock.calls.length, 3);
});

test('deleteCourse: borra el archivo de cada entrega de tarea del curso, en una sola consulta batched (si no, quedan huérfanas)', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, thumbnail: null }));
  t.mock.method(Content, 'findByCourse', async () => ([
    { id: 20, type: 'task', url: '/uploads/files/instrucciones.pdf' },
    { id: 21, type: 'task', url: null }
  ]));
  const findSubmissionsCall = t.mock.method(TaskSubmission, 'findAllByCourse', async () => ([
    { id: 1, file_url: '/uploads/submissions/a.pdf' },
    { id: 2, file_url: '/uploads/submissions/b.docx' }
  ]));
  t.mock.method(Course, 'delete', async () => true);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);

  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.deleteCourse(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(findSubmissionsCall.mock.calls.length, 1, 'una sola consulta batched para todas las entregas del curso, no una por tarea');
  // 1 instrucciones de la tarea 20 + 2 entregas = 3
  assert.equal(unlinkCall.mock.calls.length, 3);
});

test('deleteCourse: un curso sin contenido no intenta borrar ningún archivo de contenido', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, thumbnail: null }));
  t.mock.method(Content, 'findByCourse', async () => ([]));
  t.mock.method(TaskSubmission, 'findAllByCourse', async () => ([]));
  t.mock.method(Course, 'delete', async () => true);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});

  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.deleteCourse(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(unlinkCall.mock.calls.length, 0);
});

test('deleteCourse: si Course.delete no confirma (0 filas), no borra ningún archivo del disco', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, thumbnail: '/uploads/thumbnails/x.jpg' }));
  t.mock.method(Content, 'findByCourse', async () => ([
    { id: 10, type: 'video', url: '/uploads/videos/a.mp4' }
  ]));
  t.mock.method(TaskSubmission, 'findAllByCourse', async () => ([]));
  t.mock.method(Course, 'delete', async () => false);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);

  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.deleteCourse(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(unlinkCall.mock.calls.length, 0, 'si el DELETE no confirmó, los archivos no deben tocarse (evita perderlos sin haber borrado el curso)');
});

// =================================
// exportCourseGrades
// =================================

test('exportCourseGrades: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.exportCourseGrades(req, res);
  assert.equal(res.statusCode, 404);
});

test('exportCourseGrades: arma un CSV con nombre/email/progreso/nota de cada estudiante, sin paginar', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Biotecnología Ambiental' }));
  const getStudentsCall = t.mock.method(Course, 'getEnrolledStudents', async () => ({
    rows: [
      { id: 2, name: 'Ana', email: 'ana@test.com', progress: 100 },
      { id: 3, name: 'Beto', email: 'beto@test.com', progress: 40 }
    ],
    total: 2
  }));
  t.mock.method(Content, 'calculateCourseGrade', async (courseId, userId) => (userId === 2 ? 90 : null));

  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseController.exportCourseGrades(req, res);

  assert.equal(res.headers['Content-Type'], 'text/csv; charset=utf-8');
  assert.match(res.headers['Content-Disposition'], /attachment; filename="notas-biotecnologia-ambiental\.csv"/);
  assert.match(res.textBody, /Nombre,Email,Progreso \(%\),Nota/);
  assert.match(res.textBody, /Ana,ana@test\.com,100,90/);
  assert.equal(res.textBody.includes('Beto,beto@test.com,40,'), true, 'la nota null se escribe vacía, no como "null"');
  // No paginado: limit alto pasado a getEnrolledStudents, no el default de la vista paginada (20).
  assert.equal(getStudentsCall.mock.calls[0].arguments[1].limit > 1000, true);
});

// =================================
// exportStudentGrades
// =================================

test('exportStudentGrades: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1, studentId: 2 } });
  const res = mockRes();
  await courseController.exportStudentGrades(req, res);
  assert.equal(res.statusCode, 404);
});

test('exportStudentGrades: 404 si el estudiante no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  t.mock.method(User, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1, studentId: 999 } });
  const res = mockRes();
  await courseController.exportStudentGrades(req, res);
  assert.equal(res.statusCode, 404);
});

test('exportStudentGrades: arma un CSV con el detalle de cada item calificado más una fila de nota final', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1, title: 'Curso' }));
  t.mock.method(User, 'findById', async () => ({ id: 2, name: 'Ana Rojas' }));
  t.mock.method(Content, 'getCourseGradeBreakdown', async () => ({
    items: [
      { title: 'Tarea 1', type: 'Tarea', weight_percent: 10, earned: 7 },
      { title: 'Quiz 1', type: 'Cuestionario', weight_percent: 20, earned: 16 }
    ],
    total: 23
  }));

  const req = mockReq({ params: { id: 1, studentId: 2 } });
  const res = mockRes();
  await courseController.exportStudentGrades(req, res);

  assert.match(res.headers['Content-Disposition'], /filename="notas-ana-rojas-curso\.csv"/);
  assert.match(res.textBody, /Tarea 1,Tarea,10,7/);
  assert.match(res.textBody, /Quiz 1,Cuestionario,20,16/);
  assert.match(res.textBody, /Nota final,,,23/);
});
