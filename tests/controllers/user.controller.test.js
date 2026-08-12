import test from 'node:test';
import assert from 'node:assert/strict';
import * as userController from '../../src/controllers/user.controller.js';
import User from '../../src/models/User.js';
import { mockReq, mockRes } from '../helpers/http.js';

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
