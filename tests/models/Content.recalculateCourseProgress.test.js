import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';

test('recalculateCourseProgress: al 100% el UPDATE marca completed_at solo si aún es NULL', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
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
    if (sql.includes('COUNT(*) as total')) return [[{ total: 5 }]];
    if (sql.includes('COUNT(*) as completed')) return [[{ completed: 2 }]];
    return [{ affectedRows: 1 }];
  });

  const result = await Content.recalculateCourseProgress(10, 20);
  assert.equal(result.progress, 40);
});

test('recalculateCourseProgress: progreso es 0 si el curso no tiene contenidos (evita división entre cero)', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('COUNT(*) as total')) return [[{ total: 0 }]];
    if (sql.includes('COUNT(*) as completed')) return [[{ completed: 0 }]];
    return [{ affectedRows: 1 }];
  });

  const result = await Content.recalculateCourseProgress(10, 20);
  assert.equal(result.progress, 0);
});

test('recalculateCourseProgress: excluye los contenidos type=forum, type=folder y type=image del total y de los completados', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('COUNT(*) as total')) return [[{ total: 3 }]];
    if (sql.includes('COUNT(*) as completed')) return [[{ completed: 3 }]];
    return [{ affectedRows: 1 }];
  });

  await Content.recalculateCourseProgress(10, 20);

  const totalCall = queryCall.mock.calls.find(c => c.arguments[0].includes('COUNT(*) as total'));
  const completedCall = queryCall.mock.calls.find(c => c.arguments[0].includes('COUNT(*) as completed'));

  assert.match(totalCall.arguments[0], /type NOT IN \('forum', 'folder', 'image'\)/);
  assert.match(completedCall.arguments[0], /co\.type NOT IN \('forum', 'folder', 'image'\)/);
});
