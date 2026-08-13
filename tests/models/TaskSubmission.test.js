import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import TaskSubmission from '../../src/models/TaskSubmission.js';

test('create: inserta la entrega y devuelve el id', async (t) => {
  t.mock.method(pool, 'query', async () => ([{ insertId: 55 }]));
  const result = await TaskSubmission.create(1, 2, '/uploads/submissions/x.pdf');
  assert.equal(result, 55);
});

test('create: si ya existía una entrega (UNIQUE), devuelve null en vez de tirar el error', async (t) => {
  t.mock.method(pool, 'query', async () => {
    const error = new Error('Duplicate entry');
    error.code = 'ER_DUP_ENTRY';
    throw error;
  });
  const result = await TaskSubmission.create(1, 2, '/uploads/submissions/x.pdf');
  assert.equal(result, null);
});

test('create: un error de BD distinto a duplicado sí se propaga', async (t) => {
  t.mock.method(pool, 'query', async () => { throw new Error('conexión perdida'); });
  await assert.rejects(() => TaskSubmission.create(1, 2, '/uploads/submissions/x.pdf'), /conexión perdida/);
});

test('markReviewed: hace UPDATE con el feedback y devuelve true si afectó una fila', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));
  const result = await TaskSubmission.markReviewed(9, 'Buen trabajo');

  assert.equal(result, true);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /UPDATE task_submissions SET feedback = \?, reviewed_at = NOW\(\)/);
  assert.deepEqual(params, ['Buen trabajo', 9]);
});

test('findAllByContent: hace JOIN con users para traer nombre/email del estudiante', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 1, student_name: 'Ana' }]]));
  const result = await TaskSubmission.findAllByContent(3);

  assert.equal(result.length, 1);
  const [sql] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INNER JOIN users u ON u\.id = ts\.user_id/);
});
