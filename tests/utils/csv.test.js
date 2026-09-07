import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv } from '../../src/utils/csv.js';

test('parseCsv: encabezados en minúscula y una fila simple', () => {
  const { headers, rows } = parseCsv('Nombre,Email\nAna Rojas,ana@test.com');
  assert.deepEqual(headers, ['nombre', 'email']);
  assert.deepEqual(rows, [{ nombre: 'Ana Rojas', email: 'ana@test.com' }]);
});

test('parseCsv: soporta CRLF y descarta líneas vacías', () => {
  const { rows } = parseCsv('nombre,email\r\nAna,ana@test.com\r\n\r\nCarlos,carlos@test.com\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1].email, 'carlos@test.com');
});

test('parseCsv: campo entre comillas con una coma adentro no se parte en dos columnas', () => {
  const { rows } = parseCsv('nombre,email\n"Pérez, Juan",juan@test.com');
  assert.equal(rows[0].nombre, 'Pérez, Juan');
  assert.equal(rows[0].email, 'juan@test.com');
});

test('parseCsv: comillas escapadas ("") dentro de un campo entre comillas', () => {
  const { rows } = parseCsv('nombre,email\n"Ana ""la crack"" Rojas",ana@test.com');
  assert.equal(rows[0].nombre, 'Ana "la crack" Rojas');
});

test('parseCsv: texto vacío devuelve headers y rows vacíos', () => {
  const { headers, rows } = parseCsv('');
  assert.deepEqual(headers, []);
  assert.deepEqual(rows, []);
});

test('parseCsv: solo encabezado, sin filas de datos', () => {
  const { rows } = parseCsv('nombre,email');
  assert.deepEqual(rows, []);
});

// =================================
// toCsv
// =================================

test('toCsv: arma encabezados + filas separados por coma, terminados en CRLF', () => {
  const csv = toCsv(['Nombre', 'Nota'], [['Ana', 85], ['Beto', 92]]);
  assert.equal(csv, 'Nombre,Nota\r\nAna,85\r\nBeto,92');
});

test('toCsv: envuelve en comillas un campo que contiene una coma, escapando comillas internas', () => {
  const csv = toCsv(['Nombre'], [['Pérez, Juan "el crack"']]);
  assert.equal(csv, 'Nombre\r\n"Pérez, Juan ""el crack"""');
});

test('toCsv: null/undefined se escriben como campo vacío, no como el texto "null"', () => {
  const csv = toCsv(['A', 'B'], [[null, undefined]]);
  assert.equal(csv, 'A,B\r\n,');
});
