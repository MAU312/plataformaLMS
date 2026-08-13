import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import expressMySQLSession from 'express-mysql-session';
import helmet from 'helmet';
import morgan from 'morgan';
import pool from './config/db.js';

const MySQLStore = expressMySQLSession(session);

// Routes
import authRoutes from './routes/auth.routes.js';
import courseRoutes from './routes/course.routes.js';
import contentRoutes from './routes/content.routes.js';
import userRoutes from './routes/user.routes.js';
import submissionRoutes from './routes/submission.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// Middlewares
// =============================================

// Cabeceras HTTP de seguridad (anti-clickjacking, anti-sniffing de MIME,
// desactiva X-Powered-By, etc.). La CSP por defecto de Helmet se desactiva
// porque el frontend carga Tailwind y Font Awesome desde CDN y usa
// atributos onclick inline en el HTML; con la CSP activa por defecto
// (script-src/style-src 'self') la interfaz dejaría de funcionar.
app.use(helmet({
  contentSecurityPolicy: false
}));

// Log de peticiones HTTP: formato compacto y coloreado en desarrollo,
// formato "combined" (estilo Apache, con IP y user-agent) en producción,
// más útil para revisar logs de un servidor real.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// La app no debe arrancar si falta el secret de sesión: sin esto, el
// fallback anterior era un secreto público hardcodeado en el código.
if (!process.env.SESSION_SECRET) {
  console.error('❌ Falta la variable de entorno SESSION_SECRET. Revisa tu archivo .env');
  process.exit(1);
}

// Session store en MySQL: usa el mismo pool que ya existe.
// Reemplaza a MemoryStore, que express-session marca como NO apta para
// producción (fuga de memoria y pérdida de sesiones al reiniciar).
const sessionStore = new MySQLStore({
  createDatabaseTable: true,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}, pool);

sessionStore.on('error', (error) => {
  console.error('❌ Error en el session store de MySQL:', error);
});

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 horas
    httpOnly: true, // no accesible desde JS en el navegador (mitiga robo de cookie vía XSS)
    secure: process.env.NODE_ENV === 'production', // solo por HTTPS en producción
    sameSite: 'lax' // mitiga CSRF básico
  }
}));

// Archivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Videos y thumbnails se sirven directo como estáticos (necesario para
// streaming eficiente con <video> y para las miniaturas del catálogo).
// Los ARCHIVOS DESCARGABLES ('uploads/files') NO se sirven aquí a propósito:
// deben pasar siempre por GET /api/contents/:id/download, que valida
// autenticación e inscripción al curso antes de entregar el archivo.
app.use('/uploads/videos', express.static(path.join(__dirname, '../uploads/videos')));
app.use('/uploads/thumbnails', express.static(path.join(__dirname, '../uploads/thumbnails')));

// =============================================
// API Routes
// =============================================

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/submissions', submissionRoutes);

// =============================================
// SPA - Todas las rutas devuelven index.html
// =============================================

app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================
// Error handling middleware
// =============================================

// Manejo específico de errores de Multer (archivo muy grande, campo de
// archivo inesperado, etc.). Sin esto, estos errores caían en el handler
// genérico de abajo y respondían 500 (error de servidor) cuando en
// realidad son errores del cliente (400): el archivo no cumple los límites.
app.use((err, req, res, next) => {
  if (err && err.name === 'MulterError') {
    const messages = {
      LIMIT_FILE_SIZE: 'El archivo excede el tamaño máximo permitido',
      LIMIT_UNEXPECTED_FILE: 'Campo de archivo inesperado'
    };
    return res.status(400).json({
      success: false,
      message: messages[err.code] || err.message
    });
  }
  next(err);
});

// Handler genérico: siempre se registra el detalle completo en el log del
// servidor, pero al cliente solo se le manda el mensaje interno si estamos
// en desarrollo. En producción, un mensaje genérico evita filtrar detalles
// internos (rutas, mensajes de MySQL, stack traces, etc.) a quien sea que
// esté viendo la respuesta.
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  const status = err.status || 500;
  const isDev = process.env.NODE_ENV !== 'production';
  // Los errores 4xx (validaciones, tipo de archivo no permitido, etc.) son
  // intencionales y su mensaje es información útil para el usuario, no un
  // detalle interno — se muestran siempre. Solo los 500 reales (errores
  // inesperados: MySQL, bugs, etc.) se ocultan en producción para no
  // filtrar detalles internos del servidor.
  const message = (status < 500 || isDev)
    ? (err.message || 'Error interno del servidor')
    : 'Error interno del servidor. Intenta de nuevo más tarde.';

  res.status(status).json({
    success: false,
    message
  });
});

// =============================================
// Verificar conexión a la base de datos
// =============================================

const testDB = async () => {
  try {
    const [rows] = await pool.query('SELECT 1');
    console.log('✅ Conectado a la base de datos MySQL');
  } catch (error) {
    console.error('❌ Error de conexión a la base de datos:', error.message);
    process.exit(1);
  }
};

// =============================================
// Iniciar servidor
// =============================================

const startServer = async () => {
  await testDB();

  const server = app.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log(`🚀 Servidor LMS LANBA - CeNAT corriendo`);
    console.log(`🚀 URL: http://localhost:${PORT}`);
    console.log('🚀 ================================\n');
  });

  // Con el límite de video en 2GB (ver upload.middleware.js), una subida en
  // una red lenta puede tardar bastante más que los 5 minutos por defecto
  // de Node para requestTimeout — sin este ajuste, el servidor cortaba la
  // conexión a medio subir. No se deja en 0 (sin límite): eso abriría la
  // puerta a conexiones colgadas indefinidamente (riesgo tipo slow-loris).
  server.requestTimeout = 60 * 60 * 1000; // 60 minutos
  server.headersTimeout = 65 * 1000; // los headers sí deben llegar rápido
};

// =============================================
// Errores no capturados a nivel de proceso
// =============================================
// Sin esto, un error fuera de un try/catch (por ejemplo en un callback o
// una promesa sin manejar) podía tumbar el servidor completo en silencio,
// afectando a TODOS los usuarios conectados a la vez, sin ningún log claro
// de qué pasó.

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promesa rechazada sin manejar:', reason);
  // No se cierra el proceso: se registra para diagnóstico y el servidor
  // sigue atendiendo al resto de usuarios.
});

process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error);
  // Aquí sí es más seguro cerrar el proceso (el estado interno de Node ya
  // no es confiable tras una excepción no capturada). Con nodemon en
  // desarrollo, o un gestor de procesos como PM2 en producción, el
  // servidor se reinicia automáticamente.
  process.exit(1);
});

startServer();

export default app;