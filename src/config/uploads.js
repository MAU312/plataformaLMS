import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carpeta donde viven los archivos subidos (videos, imágenes, tareas,
// avatares, miniaturas). Por defecto es uploads/ en la raíz del proyecto,
// pero UPLOADS_DIR permite apuntarla a otro lado — un disco aparte, una
// unidad de red montada — sin tocar código, para un despliegue que separa
// el almacenamiento de archivos del código de la aplicación.
export const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../../uploads');
