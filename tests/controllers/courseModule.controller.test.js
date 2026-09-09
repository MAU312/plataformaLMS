import test from 'node:test';
import assert from 'node:assert/strict';
import * as courseModuleController from '../../src/controllers/courseModule.controller.js';
import Course from '../../src/models/Course.js';
import CourseModule from '../../src/models/CourseModule.js';
import User from '../../src/models/User.js';
import { mockReq, mockRes } from '../helpers/http.js';

// =================================
// createModule
// =================================

test('createModule: 400 si falta el título', async (t) => {
  const req = mockReq({ params: { id: 1 }, body: {} });
  const res = mockRes();
  await courseModuleController.createModule(req, res);
  assert.equal(res.statusCode, 400);
});

test('createModule: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 }, body: { title: 'Módulo 1' } });
  const res = mockRes();
  await courseModuleController.createModule(req, res);
  assert.equal(res.statusCode, 404);
});

test('createModule: 400 si el curso ya es en sí un curso hijo (nesting de un solo nivel)', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 10, parent_module_id: 3 }));
  const createCall = t.mock.method(CourseModule, 'create', async () => 99);
  const req = mockReq({ params: { id: 10 }, body: { title: 'Sub-módulo' } });
  const res = mockRes();
  await courseModuleController.createModule(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(createCall.mock.calls.length, 0, 'no debe crear el módulo — un curso hijo no puede alojar sus propios módulos');
});

test('createModule: 201 y crea el módulo cuando el curso es un curso de nivel superior (sin parent_module_id)', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 10, parent_module_id: null }));
  const createCall = t.mock.method(CourseModule, 'create', async () => 99);
  const req = mockReq({ params: { id: 10 }, body: { title: '  Módulo 1  ' } });
  const res = mockRes();
  await courseModuleController.createModule(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.id, 99);
  assert.deepEqual(createCall.mock.calls[0].arguments[0], { course_id: 10, title: 'Módulo 1' });
});

// =================================
// getModules
// =================================

test('getModules: 404 si el curso no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseModuleController.getModules(req, res);
  assert.equal(res.statusCode, 404);
});

test('getModules: devuelve los módulos del curso con sus cursos hijo', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 1 }));
  t.mock.method(CourseModule, 'findByCourse', async () => ([{ id: 3, title: 'Módulo 1', courses: [] }]));
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();
  await courseModuleController.getModules(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.length, 1);
});

// =================================
// deleteModule
// =================================

test('deleteModule: 404 si el módulo no existe', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => undefined);
  const req = mockReq({ params: { moduleId: 3 } });
  const res = mockRes();
  await courseModuleController.deleteModule(req, res);
  assert.equal(res.statusCode, 404);
});

test('deleteModule: 400 si el módulo todavía tiene cursos adentro', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => ({ id: 3, course_id: 1 }));
  t.mock.method(CourseModule, 'hasChildCourses', async () => true);
  const deleteCall = t.mock.method(CourseModule, 'delete', async () => true);
  const req = mockReq({ params: { moduleId: 3 } });
  const res = mockRes();
  await courseModuleController.deleteModule(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(deleteCall.mock.calls.length, 0);
});

test('deleteModule: 200 y borra el módulo si está vacío', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => ({ id: 3, course_id: 1 }));
  t.mock.method(CourseModule, 'hasChildCourses', async () => false);
  const deleteCall = t.mock.method(CourseModule, 'delete', async () => true);
  const req = mockReq({ params: { moduleId: 3 } });
  const res = mockRes();
  await courseModuleController.deleteModule(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(deleteCall.mock.calls.length, 1);
});

// =================================
// createModuleCourse
// =================================

test('createModuleCourse: 404 si el módulo no existe (y limpia la miniatura ya subida)', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => undefined);
  const req = mockReq({ params: { moduleId: 3 }, body: { title: 'Curso hijo' }, file: { filename: 'x.png' } });
  const res = mockRes();
  await courseModuleController.createModuleCourse(req, res);
  assert.equal(res.statusCode, 404);
});

test('createModuleCourse: 400 si falta el título', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => ({ id: 3, course_id: 1 }));
  const req = mockReq({ params: { moduleId: 3 }, body: {} });
  const res = mockRes();
  await courseModuleController.createModuleCourse(req, res);
  assert.equal(res.statusCode, 400);
});

test('createModuleCourse: 201 crea el curso hijo con parent_module_id seteado al módulo', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => ({ id: 3, course_id: 1 }));
  const createCall = t.mock.method(Course, 'create', async () => 55);
  t.mock.method(User, 'findByRole', async () => ([{ id: 7 }]));
  const assignCall = t.mock.method(Course, 'assignTeachers', async () => true);

  const req = mockReq({
    params: { moduleId: 3 },
    body: { title: 'Contribución de la ciencia abierta', description: 'desc', teacher_ids: JSON.stringify([7]) }
  });
  const res = mockRes();
  await courseModuleController.createModuleCourse(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.id, 55);
  assert.equal(createCall.mock.calls[0].arguments[0].parent_module_id, 3);
  assert.deepEqual(assignCall.mock.calls[0].arguments, [55, [7]]);
});

test('createModuleCourse: si assignTeachers falla, deshace la creación del curso hijo (rollback)', async (t) => {
  const createCall = t.mock.method(Course, 'create', async () => 55);
  const deleteCall = t.mock.method(Course, 'delete', async () => true);
  t.mock.method(CourseModule, 'findById', async () => ({ id: 3, course_id: 1 }));
  t.mock.method(User, 'findByRole', async () => ([{ id: 999 }]));
  t.mock.method(Course, 'assignTeachers', async () => { throw new Error('teacherId inválido'); });

  const req = mockReq({ params: { moduleId: 3 }, body: { title: 'Curso hijo', teacher_ids: JSON.stringify([999]) } });
  const res = mockRes();
  await courseModuleController.createModuleCourse(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(createCall.mock.calls.length, 1);
  assert.equal(deleteCall.mock.calls.length, 1);
  assert.equal(deleteCall.mock.calls[0].arguments[0], 55);
});

// =================================
// removeModuleCourse (desanidar, no borra)
// =================================

test('removeModuleCourse: 404 si el módulo no existe', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => undefined);
  const req = mockReq({ params: { moduleId: 3, childId: 55 } });
  const res = mockRes();
  await courseModuleController.removeModuleCourse(req, res);
  assert.equal(res.statusCode, 404);
});

test('removeModuleCourse: 404 si el curso no pertenece a ese módulo', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => ({ id: 3, course_id: 1 }));
  t.mock.method(Course, 'findById', async () => ({ id: 55, parent_module_id: 4 }));
  const req = mockReq({ params: { moduleId: 3, childId: 55 } });
  const res = mockRes();
  await courseModuleController.removeModuleCourse(req, res);
  assert.equal(res.statusCode, 404);
});

test('removeModuleCourse: 200 y desvincula el curso (setParentModule a null) sin borrarlo', async (t) => {
  t.mock.method(CourseModule, 'findById', async () => ({ id: 3, course_id: 1 }));
  t.mock.method(Course, 'findById', async () => ({ id: 55, parent_module_id: 3 }));
  const setParentCall = t.mock.method(Course, 'setParentModule', async () => true);
  const deleteCall = t.mock.method(Course, 'delete', async () => true);
  const req = mockReq({ params: { moduleId: 3, childId: 55 } });
  const res = mockRes();
  await courseModuleController.removeModuleCourse(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(setParentCall.mock.calls[0].arguments, [55, null]);
  assert.equal(deleteCall.mock.calls.length, 0, 'desvincular no debe borrar el curso');
});
