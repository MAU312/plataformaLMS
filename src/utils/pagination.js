/**
 * Parseo y armado de paginación compartido por todos los listados
 * paginados (catálogo, usuarios, inscritos, estudiantes de un curso,
 * entregas, cursos del profesor, foro) — antes cada controller repetía las
 * mismas dos líneas de Math.max/Math.min y el mismo objeto `pagination`.
 */

// Tope de filas por página: un `limit` arbitrariamente alto en la query
// string no debería poder forzar al servidor a traer/enviar de más.
export const MAX_PAGE_LIMIT = 50;

// Tope de `page`: sin él, un valor como 99999999999999999999 llegaba a MySQL
// como un OFFSET fuera de rango (BIGINT) y la petición terminaba en 500 en
// vez de una lista vacía. Con 1.000.000 páginas el OFFSET máximo (50 millones)
// ya es válido para MySQL y el resultado es simplemente `data: []`.
export const MAX_PAGE = 1_000_000;

/**
 * `query` es `req.query`. Valores ausentes, no numéricos o negativos caen al
 * default (page 1 / `defaultLimit`).
 */
export function parsePagination(query, defaultLimit) {
  const page = Math.min(MAX_PAGE, Math.max(1, parseInt(query.page) || 1));
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { page, limit };
}

/**
 * El objeto `pagination` de las respuestas de los listados.
 */
export function buildPagination(page, limit, total) {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
