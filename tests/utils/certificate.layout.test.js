import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import PDFDocument from 'pdfkit';
import certificateGenerator, { CERTIFICATE_STYLES } from '../../src/utils/certificate.js';

/**
 * Los 3 diseños de certificado ubican el texto fijo en posiciones `y`
 * absolutas; el nombre del estudiante (hasta 100 caracteres) y el título del
 * curso (hasta 150) se parten en varias líneas y, sin ajustar el tamaño de
 * letra, PISABAN el renglón fijo de abajo (medido: un nombre de 100
 * caracteres, en los 3 estilos). No hay rasterizador de PDF en el entorno de
 * pruebas, así que se mide la geometría real que calcula pdfkit: se envuelve
 * `doc.text` para registrar dónde empieza y dónde termina (doc.y después de
 * dibujar) cada bloque de texto.
 */

async function drawAndMeasure(t, { studentName, courseTitle, style }) {
  const blocks = [];
  const original = PDFDocument.prototype.text;
  t.mock.method(PDFDocument.prototype, 'text', function (str, x, y, opts) {
    const top = typeof x === 'number' ? y : this.y;
    const size = this._fontSize;
    const result = original.call(this, str, x, y, opts);
    blocks.push({ text: String(str).slice(0, 30), top, bottom: this.y, size, pageHeight: this.page.height });
    return result;
  });

  const sink = new Writable({ write(chunk, encoding, callback) { callback(); } });
  const finished = new Promise((resolve) => sink.on('finish', resolve));
  certificateGenerator.generateCertificate({ studentName, courseTitle, completedAt: new Date('2026-01-15'), style }, sink);
  await finished;
  return blocks;
}

function findOverlaps(blocks) {
  const sorted = [...blocks].sort((a, b) => a.top - b.top);
  const overlaps = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    // 1 pt de tolerancia: pdfkit redondea la altura de línea con decimales.
    if (sorted[i].bottom > sorted[i + 1].top + 1) {
      overlaps.push(`"${sorted[i].text}" (${sorted[i].top}→${sorted[i].bottom}) pisa a "${sorted[i + 1].text}" (top ${sorted[i + 1].top})`);
    }
  }
  return overlaps;
}

const LONG_NAME = 'Estudiante Con Nombre Larguísimo Apellidoextremadamentelargo Apellidoextremadamentelargo'.slice(0, 100);
const UNBROKEN_NAME = 'N' + 'o'.repeat(99);
const LONG_TITLE = 'Curso de Especialización en Biotecnología Ambiental Aplicada a la Gestión Sostenible de Recursos Naturales y Conservación de la Biodiversidad en Costa Rica'.slice(0, 150);
const UNBROKEN_TITLE = 'C'.repeat(150);

const CASES = {
  'nombre y título normales': ['María Fernández Solís', 'Introducción a la Biotecnología Ambiental'],
  'nombre de 100 caracteres con espacios': [LONG_NAME, 'Introducción a la Biotecnología Ambiental'],
  'nombre de 100 caracteres sin espacios': [UNBROKEN_NAME, 'Introducción a la Biotecnología Ambiental'],
  'título de 150 caracteres': ['María Fernández Solís', LONG_TITLE],
  'título de 150 caracteres sin espacios': ['María Fernández Solís', UNBROKEN_TITLE],
  'nombre y título al límite a la vez': [LONG_NAME, LONG_TITLE]
};

for (const { id: style } of CERTIFICATE_STYLES) {
  for (const [label, [studentName, courseTitle]] of Object.entries(CASES)) {
    test(`certificado "${style}": ${label} — ningún bloque de texto pisa a otro ni se sale de la hoja`, async (t) => {
      const blocks = await drawAndMeasure(t, { studentName, courseTitle, style });

      assert.deepEqual(findOverlaps(blocks), []);
      const pageHeight = blocks[0].pageHeight;
      for (const block of blocks) {
        assert.ok(block.bottom <= pageHeight, `"${block.text}" termina en ${block.bottom}, fuera de la hoja (${pageHeight})`);
      }
    });
  }

  test(`certificado "${style}": un nombre y título normales conservan su tamaño de letra original (solo se achica lo que no cabe)`, async (t) => {
    const blocks = await drawAndMeasure(t, { studentName: 'María Fernández Solís', courseTitle: 'Introducción a la Biotecnología Ambiental', style });
    const long = await drawAndMeasure(t, { studentName: LONG_NAME, courseTitle: LONG_TITLE, style });

    const sizeOf = (list, prefix) => list.find((b) => b.text.startsWith(prefix)).size;
    assert.ok(sizeOf(blocks, 'María') >= 26, 'el nombre normal debe seguir en su tamaño grande original');
    assert.ok(sizeOf(long, 'Estudiante') < sizeOf(blocks, 'María'), 'el nombre de 100 caracteres sí se achica');
  });
}
