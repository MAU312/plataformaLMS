import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import CourseModule from '../../src/models/CourseModule.js';

test('create: sin order_index, calcula el siguiente escopado por course_id', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('MAX(order_index)')) return [[{ next_order: 2 }]];
    if (sql.includes('INSERT INTO course_modules')) return [{ insertId: 9 }];
    throw new Error('query no esperada: ' + sql);
  });

  const id = await CourseModule.create({ course_id: 1, title: 'Módulo 1' });

  assert.equal(id, 9);
  const insertCall = queryCall.mock.calls.find(c => c.arguments[0].includes('INSERT INTO course_modules'));
  assert.deepEqual(insertCall.arguments[1], [1, 'Módulo 1', 2]);
});

test('findByCourse: [] si el curso no tiene ningún módulo (sin consultar cursos hijo)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[]]));

  const result = await CourseModule.findByCourse(1);

  assert.deepEqual(result, []);
  assert.equal(queryCall.mock.calls.length, 1, 'no debe consultar cursos hijo si no hay módulos');
});

test('findByCourse: agrupa los cursos hijo bajo su módulo, con el enrolled_count del curso PADRE (no 0 por cada hijo)', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM course_modules WHERE course_id')) {
      return [[{ id: 3, course_id: 1, title: 'Módulo 1', order_index: 1 }]];
    }
    if (sql.includes('COUNT(*) as enrolled_count')) return [[{ enrolled_count: 12 }]];
    if (sql.includes('FROM courses c')) {
      return [[
        { id: 10, parent_module_id: 3, title: 'Curso A' },
        { id: 11, parent_module_id: 3, title: 'Curso B' }
      ]];
    }
    throw new Error('query no esperada: ' + sql);
  });

  const result = await CourseModule.findByCourse(1);

  assert.equal(result.length, 1);
  assert.equal(result[0].courses.length, 2);
  assert.equal(result[0].courses[0].enrolled_count, 12, 'un curso hijo nunca tiene inscripciones propias — se muestra el enrolled_count real del padre');
  assert.equal(result[0].courses[1].enrolled_count, 12);
});

test('hasChildCourses: true si hay un curso con ese parent_module_id', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ id: 10 }]]));
  const result = await CourseModule.hasChildCourses(3);
  assert.equal(result, true);
});

test('hasChildCourses: false si el módulo está vacío', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const result = await CourseModule.hasChildCourses(3);
  assert.equal(result, false);
});

test('delete: devuelve true si borró una fila', async (t) => {
  t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));
  const result = await CourseModule.delete(3);
  assert.equal(result, true);
});
