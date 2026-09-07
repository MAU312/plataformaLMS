import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import User from '../../src/models/User.js';

test('update: si el nuevo rol es "teacher", conserva admin_access como estaba', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));
  const result = await User.update(5, { name: 'Ana', email: 'ana@test.com', role: 'teacher' });

  assert.equal(result, true);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /CASE WHEN \? = 'teacher' THEN admin_access ELSE FALSE END/);
  assert.deepEqual(params, ['Ana', 'ana@test.com', 'teacher', 'teacher', 5]);
});

test('update: si el nuevo rol NO es "teacher", la misma consulta apaga admin_access (doble rol solo aplica a profesores)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));
  await User.update(5, { name: 'Ana', email: 'ana@test.com', role: 'student' });

  const [, params] = queryCall.mock.calls[0].arguments;
  assert.deepEqual(params, ['Ana', 'ana@test.com', 'student', 'student', 5]);
});

test('setAdminAccess: hace UPDATE filtrando por role = teacher y devuelve true si afectó una fila', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));
  const result = await User.setAdminAccess(7, true);

  assert.equal(result, true);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /UPDATE users SET admin_access = \? WHERE id = \? AND role = 'teacher'/);
  assert.deepEqual(params, [1, 7]);
});

test('setAdminAccess: devuelve false si el usuario no existe o no es profesor (0 filas afectadas)', async (t) => {
  t.mock.method(pool, 'query', async () => ([{ affectedRows: 0 }]));
  const result = await User.setAdminAccess(7, false);
  assert.equal(result, false);
});
