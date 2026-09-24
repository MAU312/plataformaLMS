/**
 * Escapa los metacaracteres de LIKE (`%`, `_` y la propia barra invertida)
 * de un término de búsqueda escrito por el usuario, para que se busque como
 * TEXTO LITERAL. Sin esto, buscar "%" o "_" coincidía con todas las filas
 * (eran comodines de LIKE), y buscar "50%" o un nombre con guion bajo
 * devolvía resultados que no contenían ese texto.
 *
 * MySQL usa `\` como carácter de escape por defecto en LIKE, así que no hace
 * falta una cláusula ESCAPE. Uso: `LIKE ?` con `%${escapeLike(term)}%`.
 */
export function escapeLike(term) {
  return String(term).replace(/[\\%_]/g, '\\$&');
}
