import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import * as authController from '../../src/controllers/auth.controller.js';
import User from '../../src/models/User.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('register: falla si faltan campos requeridos', async () => {
  const req = mockReq({ body: { name: 'Ana' } });
  const res = mockRes();
  await authController.register(req, res);
  assert.equal(res.statusCode, 400);
});

test('register: falla con email inválido', async () => {
  const req = mockReq({ body: { name: 'Ana', email: 'no-es-email', password: '123456' } });
  const res = mockRes();
  await authController.register(req, res);
  assert.equal(res.statusCode, 400);
});

test('register: falla con contraseña menor a 6 caracteres', async () => {
  const req = mockReq({ body: { name: 'Ana', email: 'ana@test.com', password: '123' } });
  const res = mockRes();
  await authController.register(req, res);
  assert.equal(res.statusCode, 400);
});

test('register: falla si el email ya está registrado', async (t) => {
  t.mock.method(User, 'findByEmail', async () => ({ id: 1, email: 'ana@test.com' }));
  const req = mockReq({ body: { name: 'Ana', email: 'ana@test.com', password: '123456' } });
  const res = mockRes();
  await authController.register(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /ya está registrado/);
});

test('register: normaliza email/nombre e ignora cualquier role recibido en el body', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  const createCall = t.mock.method(User, 'create', async () => 42);
  const req = mockReq({
    body: { name: '  Ana  ', email: 'Ana@Test.com', password: '123456', role: 'admin' }
  });
  const res = mockRes();

  await authController.register(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createCall.mock.calls.length, 1);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.role, 'student', 'el role del body nunca debe respetarse');
  assert.equal(created.email, 'ana@test.com');
  assert.equal(created.name, 'Ana');
});

test('login: falla si faltan credenciales', async () => {
  const req = mockReq({ body: { email: 'ana@test.com' } });
  const res = mockRes();
  await authController.login(req, res);
  assert.equal(res.statusCode, 400);
});

test('login: credenciales inválidas si el email no existe', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  const req = mockReq({ body: { email: 'nadie@test.com', password: 'cualquiera' } });
  const res = mockRes();
  await authController.login(req, res);
  assert.equal(res.statusCode, 401);
});

test('login: credenciales inválidas con contraseña incorrecta', async (t) => {
  const hash = bcrypt.hashSync('correcta123', 10);
  t.mock.method(User, 'findByEmail', async () => (
    { id: 1, name: 'Ana', email: 'ana@test.com', password: hash, is_active: 1, role: 'student' }
  ));
  const req = mockReq({ body: { email: 'ana@test.com', password: 'incorrecta' } });
  const res = mockRes();
  await authController.login(req, res);
  assert.equal(res.statusCode, 401);
});

test('login: cuenta desactivada con contraseña correcta responde 403', async (t) => {
  const hash = bcrypt.hashSync('correcta123', 10);
  t.mock.method(User, 'findByEmail', async () => (
    { id: 1, name: 'Ana', email: 'ana@test.com', password: hash, is_active: 0, role: 'student' }
  ));
  const req = mockReq({ body: { email: 'ana@test.com', password: 'correcta123' } });
  const res = mockRes();
  await authController.login(req, res);
  assert.equal(res.statusCode, 403);
});

test('login exitoso guarda al usuario en sesión sin exponer el hash de contraseña', async (t) => {
  const hash = bcrypt.hashSync('correcta123', 10);
  t.mock.method(User, 'findByEmail', async () => (
    { id: 7, name: 'Ana', email: 'ana@test.com', password: hash, is_active: 1, role: 'student' }
  ));
  const session = {};
  const req = mockReq({ body: { email: 'ana@test.com', password: 'correcta123' }, session });
  const res = mockRes();

  await authController.login(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(session.user.id, 7);
  assert.equal(session.user.role, 'student');
  assert.equal('password' in session.user, false);
  assert.equal('password' in res.body.data.user, false);
});

test('logout destruye la sesión', async () => {
  let destroyed = false;
  const req = { session: { destroy: (cb) => { destroyed = true; cb(); } } };
  const res = mockRes();
  authController.logout(req, res);
  assert.equal(destroyed, true);
  assert.equal(res.statusCode, 200);
});

test('checkAuth reporta authenticated=false sin sesión activa', () => {
  const req = mockReq({ session: null });
  const res = mockRes();
  authController.checkAuth(req, res);
  assert.equal(res.body.authenticated, false);
});

test('checkAuth reporta authenticated=true con sesión activa', () => {
  const req = mockReq({ session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  authController.checkAuth(req, res);
  assert.equal(res.body.authenticated, true);
});
