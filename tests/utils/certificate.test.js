import test from 'node:test';
import assert from 'node:assert/strict';
import { CERTIFICATE_STYLES, DEFAULT_CERTIFICATE_STYLE, isValidCertificateStyle } from '../../src/utils/certificate.js';

test('CERTIFICATE_STYLES: tiene al menos 2 estilos, cada uno con id y label', () => {
  assert.ok(CERTIFICATE_STYLES.length >= 2);
  for (const style of CERTIFICATE_STYLES) {
    assert.equal(typeof style.id, 'string');
    assert.equal(typeof style.label, 'string');
  }
});

test('DEFAULT_CERTIFICATE_STYLE: es uno de los ids listados en CERTIFICATE_STYLES', () => {
  assert.ok(CERTIFICATE_STYLES.some((s) => s.id === DEFAULT_CERTIFICATE_STYLE));
});

test('isValidCertificateStyle: true para cada id listado', () => {
  for (const style of CERTIFICATE_STYLES) {
    assert.equal(isValidCertificateStyle(style.id), true);
  }
});

test('isValidCertificateStyle: false para un id inventado', () => {
  assert.equal(isValidCertificateStyle('no-existe'), false);
  assert.equal(isValidCertificateStyle(''), false);
  assert.equal(isValidCertificateStyle(undefined), false);
});
