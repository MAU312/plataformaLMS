import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as userController from '../../src/controllers/user.controller.js';
import User from '../../src/models/User.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('createUser: 201 y hashea la contraseña antes de guardarla', async (t) => {
  const createCall = t.mock.method(User, 'create', async () => 20);
  const req = mockReq({
    body: { name: 'Nuevo Profe', email: 'profe@test.com', username: 'nuevo.profe', password: 'Secreta123', role: 'teacher' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.createUser(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.role, 'teacher');
  assert.equal(created.username, 'nuevo.profe');
  assert.notEqual(created.password, 'Secreta123', 'la contraseña nunca debe guardarse en texto plano');
});

test('createUser: 400 si falta el rol', async (t) => {
  const createCall = t.mock.method(User, 'create', async () => 20);
  const req = mockReq({
    body: { name: 'X', email: 'x@test.com', password: 'Secreta123' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.createUser(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(createCall.mock.calls.length, 0);
});

test('createUser: 400 si el rol no es válido', async (t) => {
  const req = mockReq({
    body: { name: 'X', email: 'x@test.com', password: 'Secreta123', role: 'superadmin' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.createUser(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Rol inválido/);
});

test('createUser: 400 si la contraseña es muy corta', async (t) => {
  const req = mockReq({
    body: { name: 'X', email: 'x@test.com', password: '123', role: 'student' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.createUser(req, res);

  assert.equal(res.statusCode, 400);
});

test('createUser: 400 si el username no cumple el formato (ej. trae espacios)', async (t) => {
  const req = mockReq({
    body: { name: 'X', email: 'x@test.com', password: 'Secreta123', role: 'student', username: 'con espacio' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.createUser(req, res);

  assert.equal(res.statusCode, 400);
});

test('createUser: 400 si el email o username ya está en uso (ER_DUP_ENTRY)', async (t) => {
  t.mock.method(User, 'create', async () => {
    const err = new Error('Duplicate entry');
    err.code = 'ER_DUP_ENTRY';
    throw err;
  });
  const req = mockReq({
    body: { name: 'X', email: 'x@test.com', password: 'Secreta123', role: 'student' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.createUser(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /ya está en uso/);
});

test('updateUser: acepta el rol "teacher"', async (t) => {
  t.mock.method(User, 'findById', async () => ({ id: 5, name: 'Ana', email: 'ana@test.com', role: 'student' }));
  const updateCall = t.mock.method(User, 'update', async () => true);
  const req = mockReq({
    params: { id: '5' },
    body: { name: 'Ana', email: 'ana@test.com', role: 'teacher' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.updateUser(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateCall.mock.calls.length, 1);
  assert.equal(updateCall.mock.calls[0].arguments[1].role, 'teacher');
});

test('updateUser: sigue rechazando un rol que no existe', async (t) => {
  t.mock.method(User, 'findById', async () => ({ id: 5, name: 'Ana', email: 'ana@test.com', role: 'student' }));
  const req = mockReq({
    params: { id: '5' },
    body: { name: 'Ana', email: 'ana@test.com', role: 'superadmin' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.updateUser(req, res);

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Rol inválido/);
});

test('updateUser: un admin no puede quitarse su propio rol de admin', async (t) => {
  t.mock.method(User, 'findById', async () => ({ id: 1, name: 'Admin', email: 'admin@test.com', role: 'admin' }));
  const req = mockReq({
    params: { id: '1' },
    body: { name: 'Admin', email: 'admin@test.com', role: 'teacher' },
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();

  await userController.updateUser(req, res);

  assert.equal(res.statusCode, 400);
});

test('getAllUsers: pasa page/limit/search al modelo con los mismos defaults que antes', async (t) => {
  const findAllCall = t.mock.method(User, 'findAll', async () => ({ rows: [], total: 0 }));
  const req = mockReq({ query: {} });
  const res = mockRes();

  await userController.getAllUsers(req, res);

  assert.deepEqual(findAllCall.mock.calls[0].arguments[0], { page: 1, limit: 10, search: '' });
});

// =================================
// updateMyAvatar / removeMyAvatar
// =================================

test('updateMyAvatar: 400 si no se sube ningún archivo', async (t) => {
  const updateCall = t.mock.method(User, 'updateAvatar', async () => true);
  const req = mockReq({ session: { user: { id: 5, avatar_url: null } } });
  const res = mockRes();

  await userController.updateMyAvatar(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCall.mock.calls.length, 0);
});

test('updateMyAvatar: borra la foto anterior SOLO después de confirmar el UPDATE en BD', async (t) => {
  t.mock.method(User, 'updateAvatar', async () => true);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    session: { user: { id: 5, avatar_url: '/uploads/avatars/viejo.jpg' } },
    file: { filename: 'nuevo.jpg' }
  });
  const res = mockRes();

  await userController.updateMyAvatar(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.avatar_url, '/uploads/avatars/nuevo.jpg');
  assert.equal(unlinkCall.mock.calls.length, 1, 'debe borrar la foto anterior tras confirmar el UPDATE');
  assert.equal(req.session.user.avatar_url, '/uploads/avatars/nuevo.jpg', 'la sesión debe reflejar la foto nueva de inmediato');
});

test('updateMyAvatar: si el UPDATE no afecta ninguna fila, borra la foto RECIÉN subida (no la anterior)', async (t) => {
  t.mock.method(User, 'updateAvatar', async () => false);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    session: { user: { id: 5, avatar_url: '/uploads/avatars/viejo.jpg' } },
    file: { filename: 'nuevo.jpg' }
  });
  const res = mockRes();

  await userController.updateMyAvatar(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(unlinkCall.mock.calls.length, 1, 'borra la recién subida, no dos veces ni la anterior');
});

test('removeMyAvatar: 400 si el usuario no tiene foto de perfil puesta', async (t) => {
  const updateCall = t.mock.method(User, 'updateAvatar', async () => true);
  const req = mockReq({ session: { user: { id: 5, avatar_url: null } } });
  const res = mockRes();

  await userController.removeMyAvatar(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCall.mock.calls.length, 0);
});

test('removeMyAvatar: borra el archivo, limpia avatar_url en BD y en la sesión', async (t) => {
  const updateCall = t.mock.method(User, 'updateAvatar', async () => true);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ session: { user: { id: 5, avatar_url: '/uploads/avatars/viejo.jpg' } } });
  const res = mockRes();

  await userController.removeMyAvatar(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(updateCall.mock.calls[0].arguments, [5, null]);
  assert.equal(unlinkCall.mock.calls.length, 1);
  assert.equal(req.session.user.avatar_url, null);
});
