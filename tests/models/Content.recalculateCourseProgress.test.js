import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';

test('recalculateCourseProgress: al 100% el UPDATE marca completed_at solo si aún es NULL', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    // resolveEnrollmentRoot: curso 10 no es hijo de ningún módulo (no hay
    // fila) — se resuelve a sí mismo. getProgressGroupIds: sin cursos
    // hermanos, el grupo es solo [10].
    if (sql.includes('as parent_id')) return [[]];
    if (sql.includes('SELECT c.id')) return [[]];
    if (sql.includes('COUNT(*) as total')) return [[{ total: 4 }]];
    if (sql.includes('COUNT(*) as completed')) return [[{ completed: 4 }]];
    if (sql.includes('UPDATE enrollments')) return [{ affectedRows: 1 }];
    throw new Error('query no esperada: ' + sql);
  });

  const result = await Content.recalculateCourseProgress(10, 20);

  assert.equal(result.progress, 100);

  const updateCall = queryCall.mock.calls.find(c => c.arguments[0].includes('UPDATE enrollments'));
  assert.ok(updateCall, 'debe ejecutar el UPDATE de enrollments');
  assert.match(updateCall.arguments[0], /CASE WHEN \? = 100 AND completed_at IS NULL THEN NOW\(\)/);
  assert.deepEqual(updateCall.arguments[1], [100, 100, 10, 20]);
});

test('recalculateCourseProgress: calcula el porcentaje correctamente con progreso parcial', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('as parent_id')) return [[]];
    if (sql.includes('SELECT c.id')) return [[]];
    if (sql.includes('COUNT(*) as total')) return [[{ total: 5 }]];
    if (sql.includes('COUNT(*) as completed')) return [[{ completed: 2 }]];
    return [{ affectedRows: 1 }];
  });

  const result = await Content.recalculateCourseProgress(10, 20);
  assert.equal(result.progress, 40);
});

test('recalculateCourseProgress: progreso es 0 si el curso no tiene contenidos (evita división entre cero)', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('as parent_id')) return [[]];
    if (sql.includes('SELECT c.id')) return [[]];
    if (sql.includes('COUNT(*) as total')) return [[{ total: 0 }]];
    if (sql.includes('COUNT(*) as completed')) return [[{ completed: 0 }]];
    return [{ affectedRows: 1 }];
  });

  const result = await Content.recalculateCourseProgress(10, 20);
  assert.equal(result.progress, 0);
});

test('recalculateCourseProgress: excluye los contenidos type=folder y type=image (pero NO type=forum) del total y de los completados', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('as parent_id')) return [[]];
    if (sql.includes('SELECT c.id')) return [[]];
    if (sql.includes('COUNT(*) as total')) return [[{ total: 3 }]];
    if (sql.includes('COUNT(*) as completed')) return [[{ completed: 3 }]];
    return [{ affectedRows: 1 }];
  });

  await Content.recalculateCourseProgress(10, 20);

  const totalCall = queryCall.mock.calls.find(c => c.arguments[0].includes('COUNT(*) as total'));
  const completedCall = queryCall.mock.calls.find(c => c.arguments[0].includes('COUNT(*) as completed'));

  assert.match(totalCall.arguments[0], /type NOT IN \('folder', 'image'\)/);
  assert.match(completedCall.arguments[0], /co\.type NOT IN \('folder', 'image'\)/);
  assert.doesNotMatch(totalCall.arguments[0], /forum/);
  assert.doesNotMatch(completedCall.arguments[0], /forum/);
});

test('recalculateCourseProgress: si el curso tocado es hijo de un módulo, combina el total/completado de TODO el grupo (padre + hermanos) y escribe en la fila del padre', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql, params) => {
    // El curso 10 es hijo del módulo cuyo curso padre es el 1.
    if (sql.includes('as parent_id')) return [[{ parent_id: 1 }]];
    // El grupo completo del padre 1 son los cursos hijo 10 y 11.
    if (sql.includes('SELECT c.id')) return [[{ id: 10 }, { id: 11 }]];
    if (sql.includes('COUNT(*) as total')) {
      assert.deepEqual(params[0], [1, 10, 11], 'debe contar sobre el grupo completo, no solo el curso 10 recién tocado');
      return [[{ total: 6 }]];
    }
    if (sql.includes('COUNT(*) as completed')) return [[{ completed: 3 }]];
    if (sql.includes('UPDATE enrollments')) return [{ affectedRows: 1 }];
    throw new Error('query no esperada: ' + sql);
  });

  const result = await Content.recalculateCourseProgress(10, 20);

  assert.equal(result.progress, 50);
  const updateCall = queryCall.mock.calls.find(c => c.arguments[0].includes('UPDATE enrollments'));
  assert.deepEqual(updateCall.arguments[1], [50, 50, 1, 20], 'debe actualizar la fila de enrollments del PADRE (course_id=1), no la del hijo (10)');
});
