import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';

/**
 * MySQL corta GROUP_CONCAT en group_concat_max_len bytes (1024 por defecto)
 * SIN error: la lista de profesores de un curso (`teacher_names`) quedaba
 * cortada a mitad de un nombre con ~45 profesores. Es una variable de
 * SESIÓN, así que db.js la fija en cada conexión nueva del pool.
 */

test('db: cada conexión nueva del pool sube group_concat_max_len (si no, GROUP_CONCAT trunca en 1024 bytes)', () => {
  const queries = [];
  const fakeConnection = { query: (sql, callback) => { queries.push(sql); callback(null); } };

  pool.pool.emit('connection', fakeConnection);

  assert.equal(queries.length, 1);
  assert.match(queries[0], /SET SESSION group_concat_max_len = (\d+)/);
  const value = Number(queries[0].match(/= (\d+)/)[1]);
  assert.ok(value > 1024, 'debe ser mayor que el default de 1024');
});

test('db: si SET SESSION falla, lo registra en el log y NO revienta la conexión', (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  const fakeConnection = { query: (sql, callback) => callback(new Error('sin permiso')) };

  assert.doesNotThrow(() => pool.pool.emit('connection', fakeConnection));
  assert.equal(logged.mock.calls.length, 1);
});
