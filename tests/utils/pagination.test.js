import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePagination, buildPagination, MAX_PAGE, MAX_PAGE_LIMIT } from '../../src/utils/pagination.js';

test('parsePagination: page/limit ausentes caen en 1 y en el default de cada listado', () => {
  assert.deepEqual(parsePagination({}, 12), { page: 1, limit: 12 });
  assert.deepEqual(parsePagination({}, 20), { page: 1, limit: 20 });
});

test('parsePagination: valores no numéricos, cero o negativos caen en page 1 / default', () => {
  assert.deepEqual(parsePagination({ page: 'abc', limit: 'xyz' }, 10), { page: 1, limit: 10 });
  assert.deepEqual(parsePagination({ page: '-5', limit: '-1' }, 10), { page: 1, limit: 1 });
  assert.deepEqual(parsePagination({ page: '0', limit: '0' }, 10), { page: 1, limit: 10 });
});

test('parsePagination: limit se acota a MAX_PAGE_LIMIT (50)', () => {
  assert.equal(MAX_PAGE_LIMIT, 50);
  assert.equal(parsePagination({ limit: '999999' }, 12).limit, 50);
});

test('parsePagination: un page astronómico se acota a MAX_PAGE en vez de llegar a MySQL como un OFFSET fuera de rango (500 en producción)', () => {
  assert.equal(parsePagination({ page: '99999999999999999999' }, 12).page, MAX_PAGE);
  // El OFFSET más grande posible debe ser un entero seguro para MySQL.
  assert.ok(Number.isSafeInteger((MAX_PAGE - 1) * MAX_PAGE_LIMIT));
});

test('buildPagination: totalPages redondea hacia arriba y nunca baja de 1 (aunque no haya resultados)', () => {
  assert.deepEqual(buildPagination(1, 12, 25), { page: 1, limit: 12, total: 25, totalPages: 3 });
  assert.deepEqual(buildPagination(1, 12, 12), { page: 1, limit: 12, total: 12, totalPages: 1 });
  assert.deepEqual(buildPagination(1, 12, 0), { page: 1, limit: 12, total: 0, totalPages: 1 });
});
