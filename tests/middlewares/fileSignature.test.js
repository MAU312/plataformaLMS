import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { verifyFileSignature } from '../../src/middlewares/fileSignature.middleware.js';
import { mockReq, mockRes } from '../helpers/http.js';

function tempFile(content) {
  const filePath = path.join(os.tmpdir(), `sig-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.writeFileSync(filePath, content);
  return filePath;
}

async function run(kind, filePath, originalname) {
  const req = mockReq({ file: { path: filePath, originalname } });
  const res = mockRes();
  let nextErr = 'not-called';
  await verifyFileSignature(kind)(req, res, (err) => { nextErr = err; });
  return { res, nextErr };
}

test('rechaza un archivo de texto renombrado a .pdf y lo borra del disco', async () => {
  const filePath = tempFile('<script>alert(1)</script> esto no es un PDF');
  const { res, nextErr } = await run('file', filePath, 'malicioso.pdf');

  assert.equal(nextErr, 'not-called', 'no debe llamar a next() al rechazar');
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(fs.existsSync(filePath), false, 'el archivo rechazado debe eliminarse');
});

test('acepta un PDF real', async () => {
  const filePath = tempFile(Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'));
  const { res, nextErr } = await run('file', filePath, 'real.pdf');

  assert.equal(nextErr, undefined, 'next() se llama sin argumentos en éxito');
  assert.equal(res.statusCode, 200, 'no debe haber tocado el status de respuesta');
  fs.unlinkSync(filePath);
});

test('rechaza un archivo de texto renombrado a .png', async () => {
  const filePath = tempFile('no soy una imagen');
  const { res, nextErr } = await run('image', filePath, 'fake.png');

  assert.equal(nextErr, 'not-called');
  assert.equal(res.statusCode, 400);
  assert.equal(fs.existsSync(filePath), false);
});

test('acepta un PNG real (1x1 px)', async () => {
  const png1x1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64'
  );
  const filePath = tempFile(png1x1);
  const { res, nextErr } = await run('image', filePath, 'real.png');

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  fs.unlinkSync(filePath);
});

test('deja pasar .txt sin verificar (no tiene firma binaria conocida)', async () => {
  const filePath = tempFile('contenido de texto plano cualquiera');
  const { res, nextErr } = await run('file', filePath, 'notas.txt');

  assert.equal(nextErr, undefined);
  assert.equal(res.statusCode, 200);
  assert.equal(fs.existsSync(filePath), true, 'no debe borrar archivos .txt');
  fs.unlinkSync(filePath);
});

test('no hace nada si la ruta no trae archivo (req.file ausente)', async () => {
  const req = mockReq({});
  const res = mockRes();
  let called = false;
  await verifyFileSignature('file')(req, res, () => { called = true; });

  assert.equal(called, true);
  assert.equal(res.statusCode, 200);
});
