import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthenticated } from '../../src/middlewares/auth.middleware.js';
import User from '../../src/models/User.js';
import { mockReq, mockRes } from '../helpers/http.js';

async function run(session) {
  const req = mockReq({ session });
  const res = mockRes();
  let nextArg = 'not-called';
  await isAuthenticated(req, res, (err) => { nextArg = err; });
  return { req, res, nextArg };
}

test('isAuthenticated: sin sesión responde 401 y no llama a next()', async () => {
  const { res, nextArg } = await run(null);
  assert.equal(res.statusCode, 401);
  assert.equal(nextArg, 'not-called');
});

test('isAuthenticated: usuario borrado (findById devuelve undefined) destruye la sesión y responde 401', async (t) => {
  t.mock.method(User, 'findById', async () => undefined);
  let destroyed = false;
  const session = { user: { id: 1, role: 'student' }, destroy: (cb) => { destroyed = true; cb(); } };
  const { res, nextArg } = await run(session);
  assert.equal(res.statusCode, 401);
  assert.equal(destroyed, true);
  assert.equal(nextArg, 'not-called');
});

test('isAuthenticated: usuario desactivado (is_active=0) destruye la sesión y responde 401', async (t) => {
  t.mock.method(User, 'findById', async () => ({ id: 1, name: 'X', email: 'x@x.com', role: 'student', is_active: 0 }));
  let destroyed = false;
  const session = { user: { id: 1, role: 'student' }, destroy: (cb) => { destroyed = true; cb(); } };
  const { res, nextArg } = await run(session);
  assert.equal(res.statusCode, 401);
  assert.equal(destroyed, true);
});

test('isAuthenticated: usuario activo pasa y sincroniza req.session.user con la BD (ej. rol cambiado por un admin)', async (t) => {
  t.mock.method(User, 'findById', async () => ({ id: 1, name: 'Prof X', email: 'x@x.com', role: 'teacher', is_active: 1 }));
  const session = { user: { id: 1, role: 'student' } };
  const { req, res, nextArg } = await run(session);
  assert.equal(nextArg, undefined, 'next() se llama sin argumentos en éxito');
  assert.equal(res.statusCode, 200);
  assert.equal(req.session.user.role, 'teacher', 'el rol cacheado debe actualizarse al de la BD');
});
