import test from 'node:test';
import assert from 'node:assert/strict';
import { handleBodyParserError } from '../../src/middlewares/bodyParserError.middleware.js';
import { mockReq, mockRes } from '../helpers/http.js';

/**
 * Antes un JSON demasiado grande respondía el mensaje crudo del parser en
 * inglés ("request entity too large") y uno mal formado, el mensaje interno
 * ("Unexpected token } in JSON at position 5").
 */

function run(err, req = mockReq()) {
  // En Express real `req.headers` siempre existe; mockReq no lo trae.
  req.headers = req.headers || {};
  const res = mockRes();
  let nextArg = 'not-called';
  handleBodyParserError(err, req, res, (e) => { nextArg = e; });
  return { res, nextArg, req };
}

test('handleBodyParserError: 413 con mensaje traducido para "entity.too.large"', () => {
  const { res, nextArg } = run({ type: 'entity.too.large', status: 413, message: 'request entity too large' });
  assert.equal(res.statusCode, 413);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'La petición es demasiado grande');
  assert.equal(nextArg, 'not-called');
});

test('handleBodyParserError: 400 con mensaje traducido para un JSON mal formado, sin filtrar el mensaje interno del parser', () => {
  const { res } = run({ type: 'entity.parse.failed', status: 400, message: 'Unexpected token } in JSON at position 5' });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, 'El cuerpo de la petición no es un JSON válido');
  assert.doesNotMatch(res.body.message, /Unexpected token/);
});

test('handleBodyParserError: respeta el idioma del header X-Locale aunque req.locale aún no exista (los body parsers corren antes que resolveLocale)', () => {
  const req = mockReq();
  req.headers = { 'x-locale': 'en' };
  const { res } = run({ type: 'entity.too.large', status: 413 }, req);
  assert.equal(res.body.message, 'The request is too large');
});

test('handleBodyParserError: sin X-Locale cae en español', () => {
  const req = mockReq();
  req.headers = {};
  const { res } = run({ type: 'entity.too.large', status: 413 }, req);
  assert.equal(res.body.message, 'La petición es demasiado grande');
});

test('handleBodyParserError: cualquier otro error pasa al siguiente handler sin tocarlo', () => {
  const error = new Error('otra cosa');
  const { res, nextArg } = run(error);
  assert.equal(nextArg, error);
  assert.equal(res.body, undefined);
});
