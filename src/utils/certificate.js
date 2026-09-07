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

  doc.font('Helvetica-Bold').fontSize(26).fillColor(BRAND_GREEN)
    .text(studentName, 60, 245, { align: 'center', width: width - 120 });

  doc.font('Helvetica').fontSize(14).fillColor('#4b5563')
    .text('ha completado exitosamente el curso', 0, 290, { align: 'center' });

  doc.font('Helvetica-Bold').fontSize(20).fillColor('#1f2937')
    .text(courseTitle, 80, 318, { align: 'center', width: width - 160 });

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

  doc.font('Helvetica-Bold').fontSize(28).fillColor(BRAND_GREEN)
    .text(studentName, 70, bandHeight + 145, { width: width - 140 });

  doc.font('Helvetica').fontSize(13).fillColor('#4b5563')
    .text('completó exitosamente el curso', 70, bandHeight + 195, { width: width - 140 });

  doc.font('Helvetica-Bold').fontSize(19).fillColor('#1f2937')
    .text(courseTitle, 70, bandHeight + 220, { width: width - 140 });

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

  doc.font('Helvetica-Bold').fontSize(34).fillColor('#1f2937')
    .text(studentName, 60, 225, { align: 'center', width: width - 120 });

  // Línea fina centrada debajo del nombre, del mismo ancho que el texto
  // "por haber completado..." — un detalle minimalista en vez de un marco.
  const lineWidth = 220;
  doc.moveTo(centerX - lineWidth / 2, 278).lineTo(centerX + lineWidth / 2, 278)
    .lineWidth(1).strokeColor(BRAND_GREEN_LIGHT).stroke();

  doc.font('Helvetica').fontSize(13).fillColor('#6b7280')
    .text('por haber completado el curso', 0, 295, { align: 'center' });

  doc.font('Helvetica-Bold').fontSize(18).fillColor(BRAND_GREEN)
    .text(courseTitle, 80, 322, { align: 'center', width: width - 160 });

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
