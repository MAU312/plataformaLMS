import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeLike } from '../../src/utils/sql.js';

test('escapeLike: escapa % y _ (comodines de LIKE) para buscarlos como texto literal', () => {
  assert.equal(escapeLike('50%'), '50\\%');
  assert.equal(escapeLike('mi_curso'), 'mi\\_curso');
  assert.equal(escapeLike('%'), '\\%');
  assert.equal(escapeLike('_'), '\\_');
});

test('escapeLike: escapa la propia barra invertida (si no, "\\%" volvería a ser un comodín)', () => {
  assert.equal(escapeLike('a\\b'), 'a\\\\b');
  assert.equal(escapeLike('\\%'), '\\\\\\%');
});

test('escapeLike: no toca texto normal, con tildes, comillas o emoji', () => {
  assert.equal(escapeLike('Biotecnología'), 'Biotecnología');
  assert.equal(escapeLike("O'Reilly \"x\""), "O'Reilly \"x\"");
  assert.equal(escapeLike('🧪'), '🧪');
});
