/**
 * Fake mínimo de `res` de Express para probar controladores sin levantar
 * un servidor real. Encadenable como el real: res.status(x).json(y).
 */
export function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined,
    downloadCall: undefined,
    headers: {},
    headersSent: false
  };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (payload) => { res.body = payload; return res; };
  res.download = (filePath, fileName) => { res.downloadCall = { filePath, fileName }; return res; };
  res.setHeader = (name, value) => { res.headers[name] = value; res.headersSent = true; return res; };
  return res;
}

/**
 * Fake de `req` con lo mínimo que usan los controladores: body, params,
 * query, session y (para subidas) file.
 */
export function mockReq({ body = {}, params = {}, query = {}, session = null, file = null } = {}) {
  return { body, params, query, session, file };
}
