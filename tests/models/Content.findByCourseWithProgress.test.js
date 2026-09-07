import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';

test('findByCourseWithProgress: pasa por un LEFT JOIN contra task_submissions del propio usuario, no una consulta por tarea', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[]]));

  await Content.findByCourseWithProgress(7, 5);

  assert.equal(queryCall.mock.calls.length, 1, 'una sola consulta, sin importar cuántas tareas tenga el curso');
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /LEFT JOIN task_submissions ts ON ts\.content_id = co\.id AND ts\.user_id = \?/);
  assert.deepEqual(params, [5, 5, 7]);
});

test('findByCourseWithProgress: una tarea con entrega trae my_submission poblado (y sin los campos submission_* sueltos)', async (t) => {
  t.mock.method(pool, 'query', async () => ([[
    {
      id: 10, type: 'task', course_id: 7, completed: 0,
      submission_id: 99, submission_submitted_at: '2026-01-01', submission_feedback: 'Bien', submission_reviewed_at: '2026-01-02',
      submission_score_earned: 7
    }
  ]]));

  const rows = await Content.findByCourseWithProgress(7, 5);

  assert.deepEqual(rows[0].my_submission, { submitted_at: '2026-01-01', feedback: 'Bien', reviewed_at: '2026-01-02', score_earned: 7 });
  assert.equal(rows[0].submission_id, undefined, 'los campos submission_* sueltos no deben quedar en la respuesta');
  assert.equal(rows[0].submission_submitted_at, undefined);
});

test('findByCourseWithProgress: una tarea sin entrega trae my_submission: null', async (t) => {
  t.mock.method(pool, 'query', async () => ([[
    { id: 11, type: 'task', course_id: 7, completed: 0, submission_id: null, submission_submitted_at: null, submission_feedback: null, submission_reviewed_at: null }
  ]]));

  const rows = await Content.findByCourseWithProgress(7, 5);

  assert.equal(rows[0].my_submission, null);
});

test('findByCourseWithProgress: un contenido que no es tarea se devuelve tal cual (sin my_submission)', async (t) => {
  t.mock.method(pool, 'query', async () => ([[
    { id: 12, type: 'video', course_id: 7, completed: 1, submission_id: null, submission_submitted_at: null, submission_feedback: null, submission_reviewed_at: null }
  ]]));

  const rows = await Content.findByCourseWithProgress(7, 5);

  assert.equal(rows[0].type, 'video');
  assert.equal('my_submission' in rows[0], false);
});
