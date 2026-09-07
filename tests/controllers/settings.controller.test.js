import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as settingsController from '../../src/controllers/settings.controller.js';
import SiteSetting from '../../src/models/SiteSetting.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('getSettings: devuelve lo que SiteSetting.getAll() trae, tal cual', async (t) => {
  t.mock.method(SiteSetting, 'getAll', async () => ({ catalog_title: 'Hola' }));
  const req = mockReq({});
  const res = mockRes();

  await settingsController.getSettings(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data, { catalog_title: 'Hola' });
});

test('updateSettings: guarda catalog_title y catalog_subtitle cuando vienen en el body', async (t) => {
  const setCall = t.mock.method(SiteSetting, 'set', async () => {});
  const req = mockReq({ body: { catalog_title: '  Nuevo título  ', catalog_subtitle: 'Nuevo subtítulo' } });
  const res = mockRes();

  await settingsController.updateSettings(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(setCall.mock.calls[0].arguments, ['catalog_title', 'Nuevo título']);
  assert.deepEqual(setCall.mock.calls[1].arguments, ['catalog_subtitle', 'Nuevo subtítulo']);
});

test('updateSettings: no toca las claves que no vienen en el body', async (t) => {
  const setCall = t.mock.method(SiteSetting, 'set', async () => {});
  const req = mockReq({ body: { catalog_title: 'Solo el título' } });
  const res = mockRes();

  await settingsController.updateSettings(req, res);

  assert.equal(setCall.mock.calls.length, 1);
  assert.equal(setCall.mock.calls[0].arguments[0], 'catalog_title');
});

test('updateSettings: 400 si el texto supera el máximo, y borra los archivos ya subidos por multer', async (t) => {
  const setCall = t.mock.method(SiteSetting, 'set', async () => {});
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    body: { catalog_title: 'x'.repeat(301) },
    files: { login_bg_image: [{ filename: 'nuevo.png' }] }
  });
  const res = mockRes();

  await settingsController.updateSettings(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(setCall.mock.calls.length, 0, 'no debe guardar nada si la validación falla');
  assert.equal(unlinkCall.mock.calls.length, 1, 'el archivo recién subido no debe quedar huérfano');
});

test('updateSettings: al subir una imagen nueva, guarda su URL y borra la anterior', async (t) => {
  t.mock.method(SiteSetting, 'get', async () => '/uploads/site/vieja.png');
  const setCall = t.mock.method(SiteSetting, 'set', async () => {});
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    body: {},
    files: { login_bg_image: [{ filename: 'nueva-123.png' }] }
  });
  const res = mockRes();

  await settingsController.updateSettings(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(setCall.mock.calls[0].arguments, ['login_bg_image', '/uploads/site/nueva-123.png']);
  assert.equal(unlinkCall.mock.calls.length, 1, 'debe borrar la imagen anterior del disco');
});

test('updateSettings: "_clear" restaura la imagen por defecto (guarda null y borra el archivo personalizado)', async (t) => {
  t.mock.method(SiteSetting, 'get', async () => '/uploads/site/personalizada.png');
  const setCall = t.mock.method(SiteSetting, 'set', async () => {});
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ body: { courses_bg_image_clear: 'true' } });
  const res = mockRes();

  await settingsController.updateSettings(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(setCall.mock.calls[0].arguments, ['courses_bg_image', null]);
  assert.equal(unlinkCall.mock.calls.length, 1);
});

test('updateSettings: si llega un archivo nuevo Y "_clear" para la misma clave, el archivo nuevo gana', async (t) => {
  t.mock.method(SiteSetting, 'get', async () => null);
  const setCall = t.mock.method(SiteSetting, 'set', async () => {});
  t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    body: { login_bg_image_clear: 'true' },
    files: { login_bg_image: [{ filename: 'nueva.png' }] }
  });
  const res = mockRes();

  await settingsController.updateSettings(req, res);

  assert.deepEqual(setCall.mock.calls[0].arguments, ['login_bg_image', '/uploads/site/nueva.png']);
});

test('updateSettings: si SiteSetting.set falla, borra los archivos que NO llegaron a guardarse, pero no los ya confirmados', async (t) => {
  let callCount = 0;
  t.mock.method(SiteSetting, 'get', async () => null);
  t.mock.method(SiteSetting, 'set', async (key) => {
    callCount++;
    // El primer campo de imagen (login_bg_image) se guarda bien; el
    // segundo (courses_bg_image) revienta.
    if (key === 'courses_bg_image') throw new Error('DB caída');
  });
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({
    body: {},
    files: {
      login_bg_image: [{ filename: 'login-nueva.png' }],
      courses_bg_image: [{ filename: 'courses-nueva.png' }]
    }
  });
  const res = mockRes();

  await settingsController.updateSettings(req, res);

  assert.equal(res.statusCode, 500);
  // Solo el archivo de courses_bg_image (el que nunca se confirmó en BD)
  // debe borrarse - login_bg_image ya quedó referenciado en site_settings.
  assert.equal(unlinkCall.mock.calls.length, 1);
  assert.match(unlinkCall.mock.calls[0].arguments[0], /courses-nueva\.png/);
});
