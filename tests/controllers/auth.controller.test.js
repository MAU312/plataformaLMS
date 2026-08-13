import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import * as authController from '../../src/controllers/auth.controller.js';
import User from '../../src/models/User.js';
import mailer from '../../src/config/mailer.js';
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

test('register: falla si el username tiene un formato inválido (ej. con espacios)', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  const req = mockReq({ body: { name: 'Ana', email: 'ana@test.com', password: '123456', username: 'nombre con espacios' } });
  const res = mockRes();
  await authController.register(req, res);
  assert.equal(res.statusCode, 400);
});

test('register: falla si el username ya está en uso', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  t.mock.method(User, 'findByEmailOrUsername', async () => ({ id: 99 }));
  const req = mockReq({ body: { name: 'Ana', email: 'ana@test.com', password: '123456', username: 'ana_dev' } });
  const res = mockRes();
  await authController.register(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /usuario ya está en uso/);
});

test('register: éxito con username válido, se guarda tal cual (recortado)', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  t.mock.method(User, 'findByEmailOrUsername', async () => undefined);
  const createCall = t.mock.method(User, 'create', async () => 42);
  const req = mockReq({ body: { name: 'Ana', email: 'ana@test.com', password: '123456', username: '  ana_dev  ' } });
  const res = mockRes();

  await authController.register(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createCall.mock.calls[0].arguments[0].username, 'ana_dev');
});

test('register: username es opcional — sin él, se guarda null y no se valida nada de username', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  const createCall = t.mock.method(User, 'create', async () => 42);
  const req = mockReq({ body: { name: 'Ana', email: 'ana@test.com', password: '123456' } });
  const res = mockRes();

  await authController.register(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createCall.mock.calls[0].arguments[0].username, null);
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

test('login: credenciales inválidas si el email/usuario no existe', async (t) => {
  t.mock.method(User, 'findByEmailOrUsername', async () => undefined);
  const req = mockReq({ body: { email: 'nadie@test.com', password: 'cualquiera' } });
  const res = mockRes();
  await authController.login(req, res);
  assert.equal(res.statusCode, 401);
});

test('login: credenciales inválidas con contraseña incorrecta', async (t) => {
  const hash = bcrypt.hashSync('correcta123', 10);
  t.mock.method(User, 'findByEmailOrUsername', async () => (
    { id: 1, name: 'Ana', email: 'ana@test.com', password: hash, is_active: 1, role: 'student' }
  ));
  const req = mockReq({ body: { email: 'ana@test.com', password: 'incorrecta' } });
  const res = mockRes();
  await authController.login(req, res);
  assert.equal(res.statusCode, 401);
});

test('login: cuenta desactivada con contraseña correcta responde 403', async (t) => {
  const hash = bcrypt.hashSync('correcta123', 10);
  t.mock.method(User, 'findByEmailOrUsername', async () => (
    { id: 1, name: 'Ana', email: 'ana@test.com', password: hash, is_active: 0, role: 'student' }
  ));
  const req = mockReq({ body: { email: 'ana@test.com', password: 'correcta123' } });
  const res = mockRes();
  await authController.login(req, res);
  assert.equal(res.statusCode, 403);
});

test('login exitoso guarda al usuario en sesión sin exponer el hash de contraseña, y registra el último ingreso', async (t) => {
  const hash = bcrypt.hashSync('correcta123', 10);
  const findCall = t.mock.method(User, 'findByEmailOrUsername', async () => (
    { id: 7, name: 'Ana', email: 'ana@test.com', password: hash, is_active: 1, role: 'student' }
  ));
  const lastLoginCall = t.mock.method(User, 'updateLastLogin', async () => {});
  const session = {};
  const req = mockReq({ body: { email: 'ana@test.com', password: 'correcta123' }, session });
  const res = mockRes();

  await authController.login(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(session.user.id, 7);
  assert.equal(session.user.role, 'student');
  assert.equal('password' in session.user, false);
  assert.equal('password' in res.body.data.user, false);
  assert.equal(findCall.mock.calls[0].arguments[0], 'ana@test.com', 'email normalizado a minúsculas antes de buscar');
  assert.equal(lastLoginCall.mock.calls[0].arguments[0], 7);
});

test('login: acepta un username (sin @) tal cual, sin forzar minúsculas', async (t) => {
  const hash = bcrypt.hashSync('correcta123', 10);
  const findCall = t.mock.method(User, 'findByEmailOrUsername', async () => (
    { id: 8, name: 'Ana', email: 'ana@test.com', password: hash, is_active: 1, role: 'student' }
  ));
  t.mock.method(User, 'updateLastLogin', async () => {});
  const req = mockReq({ body: { email: '  Ana_Dev  ', password: 'correcta123' }, session: {} });
  const res = mockRes();

  await authController.login(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(findCall.mock.calls[0].arguments[0], 'Ana_Dev', 'username se recorta pero NO se baja a minúsculas (sí distingue mayúsculas)');
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

test('forgotPassword: falla si falta el email', async () => {
  const req = mockReq({ body: {} });
  const res = mockRes();
  await authController.forgotPassword(req, res);
  assert.equal(res.statusCode, 400);
});

test('forgotPassword: responde éxito genérico aunque el email no exista (no revela si la cuenta existe)', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  const sendMailCall = t.mock.method(mailer, 'sendPasswordResetEmail', async () => {});

  const req = mockReq({ body: { email: 'nadie@test.com' } });
  const res = mockRes();
  await authController.forgotPassword(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(sendMailCall.mock.calls.length, 0, 'no debe intentar enviar correo si el usuario no existe');
});

test('forgotPassword: genera token, lo guarda hasheado y envía el correo si el email existe', async (t) => {
  t.mock.method(User, 'findByEmail', async () => ({ id: 5, email: 'ana@test.com' }));
  const setTokenCall = t.mock.method(User, 'setResetToken', async () => {});
  const sendMailCall = t.mock.method(mailer, 'sendPasswordResetEmail', async () => {});

  const req = mockReq({ body: { email: 'ana@test.com' } });
  const res = mockRes();
  await authController.forgotPassword(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(setTokenCall.mock.calls.length, 1);
  assert.equal(setTokenCall.mock.calls[0].arguments[0], 5);
  const tokenHash = setTokenCall.mock.calls[0].arguments[1];
  assert.equal(typeof tokenHash, 'string');
  assert.equal(tokenHash.length, 64, 'debe ser un hash sha256 en hex (64 caracteres)');

  assert.equal(sendMailCall.mock.calls.length, 1);
  assert.equal(sendMailCall.mock.calls[0].arguments[0], 'ana@test.com');
  const rawToken = sendMailCall.mock.calls[0].arguments[1];
  assert.notEqual(rawToken, tokenHash, 'el correo debe llevar el token crudo, no el hash guardado en BD');
});

test('resetPassword: falla si faltan token o contraseña', async () => {
  const req = mockReq({ body: { token: 'abc' } });
  const res = mockRes();
  await authController.resetPassword(req, res);
  assert.equal(res.statusCode, 400);
});

test('resetPassword: falla con contraseña menor a 6 caracteres', async () => {
  const req = mockReq({ body: { token: 'abc', password: '123' } });
  const res = mockRes();
  await authController.resetPassword(req, res);
  assert.equal(res.statusCode, 400);
});

test('resetPassword: 400 si el token es inválido o expiró', async (t) => {
  t.mock.method(User, 'findByValidResetTokenHash', async () => undefined);
  const req = mockReq({ body: { token: 'token-invalido', password: 'nueva123' } });
  const res = mockRes();
  await authController.resetPassword(req, res);
  assert.equal(res.statusCode, 400);
});

test('resetPassword: éxito actualiza la contraseña y consume el token', async (t) => {
  t.mock.method(User, 'findByValidResetTokenHash', async () => ({ id: 7 }));
  const resetCall = t.mock.method(User, 'resetPassword', async () => true);

  const req = mockReq({ body: { token: 'token-valido', password: 'nueva123' } });
  const res = mockRes();
  await authController.resetPassword(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(resetCall.mock.calls.length, 1);
  assert.equal(resetCall.mock.calls[0].arguments[0], 7);
  const storedHash = resetCall.mock.calls[0].arguments[1];
  assert.notEqual(storedHash, 'nueva123', 'la contraseña nunca debe guardarse en texto plano');
});
