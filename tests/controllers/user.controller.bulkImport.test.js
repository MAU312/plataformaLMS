import test from 'node:test';
import assert from 'node:assert/strict';
import * as userController from '../../src/controllers/user.controller.js';
import User from '../../src/models/User.js';
import Course from '../../src/models/Course.js';
import mailer from '../../src/config/mailer.js';
import { mockReq, mockRes } from '../helpers/http.js';

function csvFile(text) {
  return { buffer: Buffer.from(text, 'utf8') };
}

test('bulkImportUsers: 400 si no se sube archivo', async () => {
  const req = mockReq({ session: { user: { id: 1, role: 'admin' } } });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);
  assert.equal(res.statusCode, 400);
});

test('bulkImportUsers: 404 si course_id no existe', async (t) => {
  t.mock.method(Course, 'findById', async () => undefined);
  const req = mockReq({
    body: { course_id: '999' },
    file: csvFile('nombre,email\nAna,ana@test.com'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);
  assert.equal(res.statusCode, 404);
});

test('bulkImportUsers: 400 si al CSV le faltan las columnas nombre/email', async () => {
  const req = mockReq({
    file: csvFile('nombre,telefono\nAna,88888888'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /columna/);
});

test('bulkImportUsers: 400 si el CSV no tiene filas de datos', async () => {
  const req = mockReq({
    file: csvFile('nombre,email'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);
  assert.equal(res.statusCode, 400);
});

test('bulkImportUsers: 400 si el CSV excede el máximo de filas', async () => {
  const rows = Array.from({ length: 101 }, (_, i) => `Estudiante ${i},estudiante${i}@test.com`).join('\n');
  const req = mockReq({
    file: csvFile(`nombre,email\n${rows}`),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Máximo/);
});

test('bulkImportUsers: crea una cuenta nueva (sin curso) y le manda el correo de bienvenida', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  const createCall = t.mock.method(User, 'create', async () => 55);
  const mailCall = t.mock.method(mailer, 'sendWelcomeEmail', async () => {});
  const enrollCall = t.mock.method(Course, 'enrollUser', async () => 1);

  const req = mockReq({
    file: csvFile('nombre,email\nAna Rojas,ana@test.com'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.created, 1);
  assert.equal(res.body.data.skipped, 0);
  assert.equal(res.body.data.results[0].status, 'created');
  assert.equal(createCall.mock.calls[0].arguments[0].role, 'student');
  assert.equal(createCall.mock.calls[0].arguments[0].email, 'ana@test.com');
  assert.equal(mailCall.mock.calls[0].arguments[0].toEmail, 'ana@test.com');
  assert.equal(mailCall.mock.calls[0].arguments[0].courseTitle, null);
  assert.equal(enrollCall.mock.calls.length, 0, 'sin course_id no debe matricular a nadie');
});

test('bulkImportUsers: con course_id, matricula al usuario recién creado en ese curso', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 3, title: 'Biotecnología' }));
  t.mock.method(User, 'findByEmail', async () => undefined);
  t.mock.method(User, 'create', async () => 55);
  const mailCall = t.mock.method(mailer, 'sendWelcomeEmail', async () => {});
  const enrollCall = t.mock.method(Course, 'enrollUser', async () => 10);

  const req = mockReq({
    body: { course_id: '3' },
    file: csvFile('nombre,email\nAna Rojas,ana@test.com'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(enrollCall.mock.calls[0].arguments, [3, 55]);
  assert.equal(mailCall.mock.calls[0].arguments[0].courseTitle, 'Biotecnología');
});

test('bulkImportUsers: si el email ya existe, no crea cuenta ni manda correo (queda "skipped_existing")', async (t) => {
  t.mock.method(User, 'findByEmail', async () => ({ id: 7, email: 'ana@test.com' }));
  const createCall = t.mock.method(User, 'create', async () => 99);
  const mailCall = t.mock.method(mailer, 'sendWelcomeEmail', async () => {});

  const req = mockReq({
    file: csvFile('nombre,email\nAna Rojas,ana@test.com'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);

  assert.equal(res.body.data.created, 0);
  assert.equal(res.body.data.skipped, 1);
  assert.equal(res.body.data.results[0].status, 'skipped_existing');
  assert.equal(createCall.mock.calls.length, 0);
  assert.equal(mailCall.mock.calls.length, 0);
});

test('bulkImportUsers: si el email ya existe PERO viene con course_id, igual lo matricula en el curso', async (t) => {
  t.mock.method(Course, 'findById', async () => ({ id: 3, title: 'Biotecnología' }));
  t.mock.method(User, 'findByEmail', async () => ({ id: 7, email: 'ana@test.com' }));
  const enrollCall = t.mock.method(Course, 'enrollUser', async () => 10);

  const req = mockReq({
    body: { course_id: '3' },
    file: csvFile('nombre,email\nAna Rojas,ana@test.com'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);

  assert.deepEqual(enrollCall.mock.calls[0].arguments, [3, 7]);
  assert.equal(res.body.data.results[0].status, 'skipped_existing');
  assert.match(res.body.data.results[0].message, /se matriculó/);
});

test('bulkImportUsers: una fila con email inválido queda como error, sin frenar las demás filas', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  t.mock.method(User, 'create', async () => 55);
  t.mock.method(mailer, 'sendWelcomeEmail', async () => {});

  const req = mockReq({
    file: csvFile('nombre,email\nSin Correo,no-es-un-email\nAna Rojas,ana@test.com'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);

  assert.equal(res.body.data.results[0].status, 'error');
  assert.equal(res.body.data.results[1].status, 'created');
  assert.equal(res.body.data.created, 1);
});

test('bulkImportUsers: si falla el envío del correo, la cuenta igual queda creada', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  t.mock.method(User, 'create', async () => 55);
  t.mock.method(mailer, 'sendWelcomeEmail', async () => { throw new Error('SMTP caído'); });

  const req = mockReq({
    file: csvFile('nombre,email\nAna Rojas,ana@test.com'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.created, 1);
  assert.equal(res.body.data.results[0].status, 'created');
});

test('bulkImportUsers: acepta encabezados alternativos "name"/"correo"', async (t) => {
  t.mock.method(User, 'findByEmail', async () => undefined);
  const createCall = t.mock.method(User, 'create', async () => 55);
  t.mock.method(mailer, 'sendWelcomeEmail', async () => {});

  const req = mockReq({
    file: csvFile('name,correo\nAna Rojas,ana@test.com'),
    session: { user: { id: 1, role: 'admin' } }
  });
  const res = mockRes();
  await userController.bulkImportUsers(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(createCall.mock.calls[0].arguments[0].name, 'Ana Rojas');
});
