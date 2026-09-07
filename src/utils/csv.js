/**
 * Parser de CSV minimalista: soporta campos entre comillas dobles (para
 * nombres con coma, ej. "Pérez, Juan") y comillas escapadas (""), además
 * de CRLF/LF. No se agrega una librería externa para esto — el caso real
 * es solo nombre+email exportados de Excel/Google Sheets.
 */
function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

/**
 * Convierte el texto crudo del CSV en `{ headers, rows }` — `headers` en
 * minúsculas (para que el llamador busque la columna sin preocuparse por
 * mayúsculas), `rows` como array de objetos `{ [header]: valor }`.
 */
export function parseCsv(text) {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] !== undefined ? values[i] : '';
    });
    return row;
  });

  return { headers, rows };
}
