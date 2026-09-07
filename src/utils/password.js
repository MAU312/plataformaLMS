import crypto from 'crypto';

// Sin caracteres ambiguos (0/O, 1/l/I) — la persona la va a tener que leer
// y escribir a mano desde un correo (ej. importación masiva por CSV).
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

export function generateTempPassword(length = 10) {
  let password = '';
  for (let i = 0; i < length; i++) {
    password += CHARSET[crypto.randomInt(CHARSET.length)];
  }
  return password;
}
