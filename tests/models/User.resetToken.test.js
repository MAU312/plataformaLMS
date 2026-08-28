import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import User from '../../src/models/User.js';

/**
 * Cubre el flujo de recuperación de contraseña (setResetToken ->
 * findByValidResetTokenHash -> resetPassword) y el lookup de login
 * (findByEmailOrUsername) — la única lógica de seguridad no trivial de
 * este modelo, sin ningún test hasta ahora.
 */

test('setResetToken: guarda el hash del token y su expiración (nunca el token crudo)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));
  const expires = new Date('2026-01-01T00:00:00Z');

  await User.setResetToken(7, 'hash-abc', expires);

  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /UPDATE users SET reset_token_hash = \?, reset_token_expires = \? WHERE id = \?/);
  assert.deepEqual(params, ['hash-abc', expires, 7]);
});

test('findByValidResetTokenHash: busca por el hash Y exige que no haya expirado', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 7, reset_token_hash: 'hash-abc' }]]));

  const user = await User.findByValidResetTokenHash('hash-abc');

  assert.equal(user.id, 7);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /WHERE reset_token_hash = \? AND reset_token_expires > NOW\(\)/);
  assert.deepEqual(params, ['hash-abc']);
});

test('findByValidResetTokenHash: undefined si el token no existe o ya expiró', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const user = await User.findByValidResetTokenHash('hash-vencido');
  assert.equal(user, undefined);
});

test('resetPassword: actualiza la contraseña y consume el token (lo deja NULL) en la misma consulta', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 1 }]));

  const result = await User.resetPassword(7, 'nuevo-hash-bcrypt');

  assert.equal(result, true);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /SET password = \?, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = \?/);
  assert.deepEqual(params, ['nuevo-hash-bcrypt', 7]);
});

test('resetPassword: devuelve false si el id no existe (0 filas afectadas)', async (t) => {
  t.mock.method(pool, 'query', async () => ([{ affectedRows: 0 }]));
  const result = await User.resetPassword(999, 'nuevo-hash');
  assert.equal(result, false);
});

test('findByEmailOrUsername: busca por email O username con el mismo identificador', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([[{ id: 3, email: 'ana@correo.com' }]]));

  const user = await User.findByEmailOrUsername('ana@correo.com');

  assert.equal(user.id, 3);
  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /WHERE email = \? OR username = \?/);
  assert.deepEqual(params, ['ana@correo.com', 'ana@correo.com']);
});

test('findByEmailOrUsername: undefined si no hay ninguna fila', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const user = await User.findByEmailOrUsername('no-existe');
  assert.equal(user, undefined);
});

test('invalidateSessions: borra las sesiones filtrando por user.id dentro del JSON de `data`', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{ affectedRows: 2 }]));

  await User.invalidateSessions(7);

  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /DELETE FROM sessions WHERE JSON_EXTRACT\(data, '\$\.user\.id'\) = \?/);
  assert.deepEqual(params, [7]);
});
