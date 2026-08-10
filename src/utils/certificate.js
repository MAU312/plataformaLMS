import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, '../public/images/logo-lanba-icono.png');

const BRAND_GREEN = '#007031';
const BRAND_GREEN_LIGHT = '#22c55e';

/**
 * Genera el PDF del certificado de finalización y lo escribe directo al
 * stream de respuesta (res) — no se guarda ningún archivo en disco, se
 * genera al vuelo en cada descarga.
 *
 * Se exporta como método de un objeto (no como función suelta), igual que
 * mailer.js, para poder mockearlo en tests con t.mock.method sin tener que
 * simular un stream escribible completo.
 */
function generateCertificate({ studentName, courseTitle, completedAt }, res) {
  const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 0 });
  doc.pipe(res);

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

  const dateStr = new Date(completedAt).toLocaleDateString('es-CR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  doc.font('Helvetica').fontSize(12).fillColor('#6b7280')
    .text(`Fecha de finalización: ${dateStr}`, 0, height - 110, { align: 'center' });

  doc.font('Helvetica-Bold').fontSize(11).fillColor(BRAND_GREEN)
    .text('LANBA · Laboratorio Nacional de Bioeconomía y Ambiente', 0, height - 80, { align: 'center' });

  doc.font('Helvetica').fontSize(9).fillColor('#9ca3af')
    .text('LMS CeNAT - Centro Nacional de Alta Tecnología', 0, height - 65, { align: 'center' });

  doc.end();
}

const certificateGenerator = { generateCertificate };
export default certificateGenerator;
