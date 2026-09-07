import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import SiteSetting from '../../src/models/SiteSetting.js';

test('getAll: arma un objeto { key: value } a partir de las filas', async (t) => {
  t.mock.method(pool, 'query', async () => ([[
    { key: 'catalog_title', value: 'Bienvenidos' },
    { key: 'login_bg_image', value: '/uploads/site/x.png' }
  ]]));

  const settings = await SiteSetting.getAll();
  assert.deepEqual(settings, { catalog_title: 'Bienvenidos', login_bg_image: '/uploads/site/x.png' });
});

test('getAll: objeto vacío si no hay ninguna fila todavía (instalación recién migrada)', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const settings = await SiteSetting.getAll();
  assert.deepEqual(settings, {});
});

test('get: devuelve el value de una clave puntual', async (t) => {
  t.mock.method(pool, 'query', async () => ([[{ value: '/uploads/site/x.png' }]]));
  const value = await SiteSetting.get('login_bg_image');
  assert.equal(value, '/uploads/site/x.png');
});

test('get: null si la clave no existe', async (t) => {
  t.mock.method(pool, 'query', async () => ([[]]));
  const value = await SiteSetting.get('no-existe');
  assert.equal(value, null);
});

test('set: hace un upsert (INSERT ... ON DUPLICATE KEY UPDATE)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{}]));
  await SiteSetting.set('catalog_title', 'Nuevo título');

  const [sql, params] = queryCall.mock.calls[0].arguments;
  assert.match(sql, /INSERT INTO site_settings/);
  assert.match(sql, /ON DUPLICATE KEY UPDATE/);
  assert.deepEqual(params, ['catalog_title', 'Nuevo título']);
});

test('set: acepta null como value (restaurar el default sin borrar la fila)', async (t) => {
  const queryCall = t.mock.method(pool, 'query', async () => ([{}]));
  await SiteSetting.set('login_bg_image', null);

  const [, params] = queryCall.mock.calls[0].arguments;
  assert.deepEqual(params, ['login_bg_image', null]);
});
