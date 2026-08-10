import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const { EMAIL_USER, EMAIL_APP_PASSWORD, APP_URL } = process.env;
const emailConfigured = Boolean(EMAIL_USER && EMAIL_APP_PASSWORD);

const transporter = emailConfigured
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD }
    })
  : null;

if (!emailConfigured) {
  console.warn('⚠️  EMAIL_USER/EMAIL_APP_PASSWORD no configurados: los correos de recuperación de contraseña se imprimirán en la consola en vez de enviarse.');
}

/**
 * Envía el correo de recuperación de contraseña. Si no hay credenciales de
 * correo configuradas (desarrollo/demo), imprime el enlace en la consola
 * del servidor en vez de fallar — así la funcionalidad se puede probar de
 * punta a punta sin depender de una cuenta de Gmail real.
 *
 * Se exporta como método de un objeto (no como función suelta) a propósito:
 * así los tests pueden mockearlo con t.mock.method(mailer, 'sendPasswordResetEmail', ...)
 * igual que a los modelos, sin arriesgarse nunca a mandar un correo real
 * durante `npm test` sin importar qué haya configurado en .env.
 */
async function sendPasswordResetEmail(toEmail, resetToken) {
  const resetUrl = `${APP_URL || 'http://localhost:3000'}/#/reset-password/${resetToken}`;

  if (!emailConfigured) {
    console.log(`\n📧 [DEV] Enlace de recuperación de contraseña para ${toEmail}:\n   ${resetUrl}\n`);
    return;
  }

  await transporter.sendMail({
    from: `"LMS LANBA - CeNAT" <${EMAIL_USER}>`,
    to: toEmail,
    subject: 'Recupera tu contraseña - LMS LANBA - CeNAT',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #007031;">LMS LANBA - CeNAT</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>
          <a href="${resetUrl}"
             style="display: inline-block; background: #007031; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">Este enlace expira en 1 hora. Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `
  });
}

const mailer = { sendPasswordResetEmail };
export default mailer;
