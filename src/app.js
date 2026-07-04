import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import expressMySQLSession from 'express-mysql-session';
import pool from './config/db.js';

const MySQLStore = expressMySQLSession(session);

// Routes
import authRoutes from './routes/auth.routes.js';
import courseRoutes from './routes/course.routes.js';
import contentRoutes from './routes/content.routes.js';
import userRoutes from './routes/user.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================
// Middlewares
// =============================================

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

// Archivos estáticos (HTML, CSS, JS, uploads)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =============================================
// API Routes
// =============================================

app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/users', userRoutes);

// =============================================
// SPA - Todas las rutas devuelven index.html
// =============================================

app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =============================================
// Error handling middleware
// =============================================

app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Error interno del servidor'
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
  
  app.listen(PORT, () => {
    console.log('\n🚀 ================================');
    console.log(`🚀 Servidor LMS-CeNAT corriendo`);
    console.log(`🚀 URL: http://localhost:${PORT}`);
    console.log('🚀 ================================\n');
  });
};

startServer();

export default app;