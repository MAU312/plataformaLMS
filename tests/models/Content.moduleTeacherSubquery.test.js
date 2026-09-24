import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';

/**
 * El subquery de `module_teacher_name` necesita `AND ct.module_id IS NOT NULL`
 * aunque parezca redundante: sin él MySQL ignoraba el índice idx_module y
 * recorría course_teachers completa por cada contenido (1,7 s en un curso de
 * 1.697 contenidos; 0,025 s con la condición). Este test existe para que
 * nadie la "limpie" por parecer sobrante — ver el comentario de
 * MODULE_TEACHER_NAME_SUBQUERY en Content.js.
 */
const INDEXABLE_SUBQUERY = /WHERE ct\.module_id = co\.id AND ct\.module_id IS NOT NULL/;

test('findByCourse: el subquery de module_teacher_name conserva "AND ct.module_id IS NOT NULL" (usa idx_module)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[]]));

  await Content.findByCourse(7);

  const [sql] = queryCall.mock.calls[0].arguments;
  assert.match(sql, INDEXABLE_SUBQUERY);
  assert.match(sql, /AS module_teacher_name/);
});

test('findByCourseWithProgress: el subquery de module_teacher_name conserva "AND ct.module_id IS NOT NULL" (usa idx_module)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[]]));

  await Content.findByCourseWithProgress(7, 5);

  const [sql] = queryCall.mock.calls[0].arguments;
  assert.match(sql, INDEXABLE_SUBQUERY);
  assert.match(sql, /AS module_teacher_name/);
});
