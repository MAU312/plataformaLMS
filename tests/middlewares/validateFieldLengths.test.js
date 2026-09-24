import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateFieldLengths, exceedsFieldLimit, FIELD_LIMITS } from '../../src/middlewares/validateFieldLengths.middleware.js';
import { mockReq, mockRes } from '../helpers/http.js';

/**
 * Sin esta validación, un título de 151 caracteres o un nombre de 101 llegaba
 * hasta MySQL (columna VARCHAR(150)/VARCHAR(100)), que en modo estricto
 * rechaza el INSERT y el controller lo devolvía como un 500 genérico
 * ("Error al crear curso") sin decir qué campo era el problema.
 */

async function run(middleware, req) {
  const res = mockRes();
  let nextCalled = false;
  await middleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
}

test('FIELD_LIMITS: iguales a las columnas reales (title 150, name 100, email 100, url 500)', () => {
  assert.equal(FIELD_LIMITS.title.max, 150);
  assert.equal(FIELD_LIMITS.name.max, 100);
  assert.equal(FIELD_LIMITS.email.max, 100);
  assert.equal(FIELD_LIMITS.url.max, 500);
});

test('validateFieldLengths: un título de exactamente 150 caracteres pasa', async () => {
  const { res, nextCalled } = await run(validateFieldLengths('title'), mockReq({ body: { title: 'T'.repeat(150) } }));
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, 200);
});

test('validateFieldLengths: un título de 151 caracteres responde 400 con un mensaje que nombra el campo y el máximo', async () => {
  const { res, nextCalled } = await run(validateFieldLengths('title'), mockReq({ body: { title: 'T'.repeat(151) } }));
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /título/i);
  assert.match(res.body.message, /150/);
});

test('validateFieldLengths: el mensaje sale en el idioma de req.locale', async () => {
  const req = mockReq({ body: { name: 'N'.repeat(101) } });
  req.locale = 'en';
  const { res } = await run(validateFieldLengths('name'), req);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /name cannot exceed 100 characters/i);
});

test('validateFieldLengths: los VARCHAR se miden en caracteres, no en unidades UTF-16 (150 emojis caben en VARCHAR(150) utf8mb4)', async () => {
  const { nextCalled } = await run(validateFieldLengths('title'), mockReq({ body: { title: '🧪'.repeat(150) } }));
  assert.equal(nextCalled, true);
});

test('validateFieldLengths: los TEXT se miden en BYTES UTF-8 (30.000 "á" son 60.000 bytes: caben; 40.000 son 80.000: no)', async () => {
  const ok = await run(validateFieldLengths('description'), mockReq({ body: { description: 'á'.repeat(30000) } }));
  assert.equal(ok.nextCalled, true);
  const tooLong = await run(validateFieldLengths('description'), mockReq({ body: { description: 'á'.repeat(40000) } }));
  assert.equal(tooLong.nextCalled, false);
  assert.equal(tooLong.res.statusCode, 400);
});

test('validateFieldLengths: campos ausentes o que no son texto pasan a las validaciones propias del controller', async () => {
  const { nextCalled } = await run(validateFieldLengths('title', 'description'), mockReq({ body: { title: 12345, otro: 'x' } }));
  assert.equal(nextCalled, true);
  const empty = await run(validateFieldLengths('title'), { body: undefined, headers: {} });
  assert.equal(empty.nextCalled, true);
});

test('validateFieldLengths: revisa TODOS los campos pedidos (el segundo también rechaza)', async () => {
  const { res, nextCalled } = await run(validateFieldLengths('title', 'url'), mockReq({ body: { title: 'ok', url: 'u'.repeat(501) } }));
  assert.equal(nextCalled, false);
  assert.match(res.body.message, /URL/);
});

test('validateFieldLengths: si rechaza una subida, borra el archivo que multer ya escribió en disco (no queda huérfano)', async () => {
  const file = path.join(os.tmpdir(), `qa-orphan-${Date.now()}.txt`);
  await fs.writeFile(file, 'x');
  const req = mockReq({ body: { title: 'T'.repeat(151) }, file: { path: file } });

  const { res } = await run(validateFieldLengths('title'), req);

  assert.equal(res.statusCode, 400);
  await assert.rejects(() => fs.access(file), 'el archivo debe haberse borrado');
});

test('validateFieldLengths: tolera que el archivo ya no exista al intentar borrarlo', async () => {
  const req = mockReq({ body: { title: 'T'.repeat(151) }, file: { path: path.join(os.tmpdir(), 'no-existe-qa.txt') } });
  const { res } = await run(validateFieldLengths('title'), req);
  assert.equal(res.statusCode, 400);
});

test('validateFieldLengths: un campo sin límite definido falla al DEFINIR la ruta (un typo no debe significar "no se valida nada")', () => {
  assert.throws(() => validateFieldLengths('titel'), /sin límite definido/);
});

test('exceedsFieldLimit: solo mira strings', () => {
  assert.equal(exceedsFieldLimit('title', 'T'.repeat(151)), true);
  assert.equal(exceedsFieldLimit('title', 'T'.repeat(150)), false);
  assert.equal(exceedsFieldLimit('title', undefined), false);
  assert.equal(exceedsFieldLimit('title', 12345), false);
});
