import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, '../public/images/logo-lanba-icono.png');

const BRAND_GREEN = '#007031';
const BRAND_GREEN_LIGHT = '#22c55e';
const BRAND_GREEN_DARK = '#004d21';

/**
 * Estilos de certificado disponibles — el admin elige uno al crear/editar
 * un curso (ver Course.certificate_style). `'classic'` es el default (el
 * único estilo que existía antes de agregar esta opción), así que un curso
 * ya creado sin elegir nada explícitamente sigue viéndose exactamente
 * igual que siempre.
 */
export const CERTIFICATE_STYLES = [
  { id: 'classic', label: 'Clásico (marco verde)' },
  { id: 'modern', label: 'Moderno (franja superior)' },
  { id: 'minimal', label: 'Minimalista' }
];
export const DEFAULT_CERTIFICATE_STYLE = 'classic';
const VALID_STYLE_IDS = new Set(CERTIFICATE_STYLES.map((s) => s.id));

function formatDate(completedAt) {
  return new Date(completedAt).toLocaleDateString('es-CR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

/**
 * Dibuja un texto del usuario (nombre del estudiante, título del curso) con
 * el MAYOR tamaño de letra ≤ `size` con el que su bloque —ya partido en
 * varias líneas por pdfkit según `width`— cabe en `maxHeight`, sin bajar
 * de `minSize`. Los tres diseños ubican el resto del texto en posiciones
 * fijas (y), así que un nombre largo (hasta 100 caracteres) o un título
 * largo se partía en 2-3 líneas y PISABA el renglón fijo de abajo ("ha
 * completado exitosamente el curso"). `maxHeight` es el espacio real que
 * queda entre el inicio del texto y el siguiente elemento fijo.
 *
 * Se llama con la fuente/color ya elegidos por quien dibuja; acá solo se
 * ajusta el tamaño.
 */
function drawFittedText(doc, text, x, y, { width, maxHeight, size, minSize, ...textOptions }) {
  let fontSize = size;
  doc.fontSize(fontSize);
  while (fontSize > minSize && doc.heightOfString(text, { width, ...textOptions }) > maxHeight) {
    fontSize -= 1;
    doc.fontSize(fontSize);
  }
  doc.text(text, x, y, { width, ...textOptions });
}

/**
 * Estilo original: marco doble (uno grueso, uno fino adentro), logo
 * centrado arriba, todo el texto centrado.
 */
function drawClassic(doc, { studentName, courseTitle, completedAt }) {
  const { width, height } = doc.page;

  doc.rect(0, 0, width, height).fill('#ffffff');
  doc.lineWidth(6).strokeColor(BRAND_GREEN).rect(30, 30, width - 60, height - 60).stroke();
  doc.lineWidth(1.5).strokeColor(BRAND_GREEN_LIGHT).rect(42, 42, width - 84, height - 84).stroke();

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, width / 2 - 35, 58, { width: 70 });
  }

  doc.font('Helvetica-Bold').fontSize(32).fillColor('#1f2937')
    .text('Certificado de Finalización', 0, 155, { align: 'center' });

  doc.font('Helvetica').fontSize(14).fillColor('#4b5563')
    .text('Se certifica que', 0, 215, { align: 'center' });

  // Presupuesto de alto: de y=245 hasta el renglón fijo de y=290.
  doc.font('Helvetica-Bold').fillColor(BRAND_GREEN);
  drawFittedText(doc, studentName, 60, 245, { align: 'center', width: width - 120, maxHeight: 41, size: 26, minSize: 12 });

  doc.font('Helvetica').fontSize(14).fillColor('#4b5563')
    .text('ha completado exitosamente el curso', 0, 290, { align: 'center' });

  // Presupuesto: de y=318 hasta la fecha (height - 110), con un respiro.
  doc.font('Helvetica-Bold').fillColor('#1f2937');
  drawFittedText(doc, courseTitle, 80, 318, { align: 'center', width: width - 160, maxHeight: height - 110 - 318 - 10, size: 20, minSize: 10 });

  doc.font('Helvetica').fontSize(12).fillColor('#6b7280')
    .text(`Fecha de finalización: ${formatDate(completedAt)}`, 0, height - 110, { align: 'center' });

  doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_GREEN)
    .text('LANBA · Laboratorio Nacional de Bioeconomía y Ambiente', 0, height - 80, { align: 'center' });

  doc.font('Helvetica').fontSize(9).fillColor('#9ca3af')
    .text('LMS LANBA - CeNAT (Centro Nacional de Alta Tecnología)', 0, height - 65, { align: 'center' });
}

/**
 * Estilo moderno: una franja sólida arriba y abajo (en vez de un marco
 * alrededor de toda la hoja), logo chico a la izquierda de la franja
 * superior, texto principal alineado a la izquierda.
 */
function drawModern(doc, { studentName, courseTitle, completedAt }) {
  const { width, height } = doc.page;
  const bandHeight = 90;

  doc.rect(0, 0, width, height).fill('#ffffff');
  doc.rect(0, 0, width, bandHeight).fill(BRAND_GREEN);
  doc.rect(0, height - 50, width, 50).fill(BRAND_GREEN_DARK);

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 55, bandHeight / 2 - 24, { width: 48 });
  }

  doc.font('Helvetica-Bold').fontSize(22).fillColor('#ffffff')
    .text('LANBA · CeNAT', 120, bandHeight / 2 - 20, { width: width - 400 });
  doc.font('Helvetica').fontSize(11).fillColor('#d1fae5')
    .text('Laboratorio Nacional de Bioeconomía y Ambiente', 120, bandHeight / 2 + 6, { width: width - 400 });

  doc.font('Helvetica-Bold').fontSize(30).fillColor('#1f2937')
    .text('Certificado de Finalización', 70, bandHeight + 60, { width: width - 140 });

  doc.font('Helvetica').fontSize(13).fillColor('#4b5563')
    .text('Se certifica que', 70, bandHeight + 120, { width: width - 140 });

  // Presupuesto: de y=bandHeight+145 hasta el renglón fijo de bandHeight+195.
  doc.font('Helvetica-Bold').fillColor(BRAND_GREEN);
  drawFittedText(doc, studentName, 70, bandHeight + 145, { width: width - 140, maxHeight: 46, size: 28, minSize: 12 });

  doc.font('Helvetica').fontSize(13).fillColor('#4b5563')
    .text('completó exitosamente el curso', 70, bandHeight + 195, { width: width - 140 });

  // Presupuesto: hasta la franja inferior (height - 50), con un respiro.
  doc.font('Helvetica-Bold').fillColor('#1f2937');
  drawFittedText(doc, courseTitle, 70, bandHeight + 220, { width: width - 140, maxHeight: height - 50 - (bandHeight + 220) - 10, size: 19, minSize: 10 });

  doc.font('Helvetica').fontSize(11).fillColor('#ffffff')
    .text(`Fecha de finalización: ${formatDate(completedAt)}`, 70, height - 35, { width: width - 300 });
}

/**
 * Estilo minimalista: sin marco ni franjas de color, solo una línea fina
 * abajo del nombre del curso, tipografía liviana, mucho espacio en blanco.
 */
function drawMinimal(doc, { studentName, courseTitle, completedAt }) {
  const { width, height } = doc.page;
  const centerX = width / 2;

  doc.rect(0, 0, width, height).fill('#ffffff');

  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, centerX - 22, 70, { width: 44 });
  }

  doc.font('Helvetica').fontSize(11).fillColor('#9ca3af')
    .text('LANBA · CENTRO NACIONAL DE ALTA TECNOLOGÍA', 0, 135, { align: 'center', characterSpacing: 1.5 });

  doc.font('Helvetica').fontSize(13).fillColor('#6b7280')
    .text('Este certificado se otorga a', 0, 195, { align: 'center' });

  // Presupuesto: de y=225 hasta la línea fina de y=278 (el nombre no debe
  // llegar a taparla), con un respiro.
  doc.font('Helvetica-Bold').fillColor('#1f2937');
  drawFittedText(doc, studentName, 60, 225, { align: 'center', width: width - 120, maxHeight: 278 - 225 - 4, size: 34, minSize: 12 });

  // Línea fina centrada debajo del nombre, del mismo ancho que el texto
  // "por haber completado..." — un detalle minimalista en vez de un marco.
  const lineWidth = 220;
  doc.moveTo(centerX - lineWidth / 2, 278).lineTo(centerX + lineWidth / 2, 278)
    .lineWidth(1).strokeColor(BRAND_GREEN_LIGHT).stroke();

  doc.font('Helvetica').fontSize(13).fillColor('#6b7280')
    .text('por haber completado el curso', 0, 295, { align: 'center' });

  // Presupuesto: hasta la fecha (height - 60), con un respiro.
  doc.font('Helvetica-Bold').fillColor(BRAND_GREEN);
  drawFittedText(doc, courseTitle, 80, 322, { align: 'center', width: width - 160, maxHeight: height - 60 - 322 - 10, size: 18, minSize: 10 });

  doc.font('Helvetica').fontSize(10).fillColor('#9ca3af')
    .text(formatDate(completedAt), 0, height - 60, { align: 'center' });
}

const STYLE_DRAWERS = { classic: drawClassic, modern: drawModern, minimal: drawMinimal };

/**
 * Genera el PDF del certificado de finalización y lo escribe directo al
 * stream de respuesta (res) — no se guarda ningún archivo en disco, se
 * genera al vuelo en cada descarga. `style` (uno de CERTIFICATE_STYLES,
 * ver Course.certificate_style) decide qué diseño dibujar; si no es uno
 * reconocido, cae de vuelta al clásico en vez de fallar.
 *
 * Se exporta como método de un objeto (no como función suelta), igual que
 * mailer.js, para poder mockearlo en tests con t.mock.method sin tener que
 * simular un stream escribible completo.
 */
function generateCertificate({ studentName, courseTitle, completedAt, style }, res) {
  const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
  doc.pipe(res);

  const draw = STYLE_DRAWERS[style] || STYLE_DRAWERS[DEFAULT_CERTIFICATE_STYLE];
  draw(doc, { studentName, courseTitle, completedAt });

  doc.end();
}

const certificateGenerator = { generateCertificate };
export default certificateGenerator;

export function isValidCertificateStyle(style) {
  return VALID_STYLE_IDS.has(style);
}
