import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as contentController from '../../src/controllers/content.controller.js';
import Content from '../../src/models/Content.js';
import Course from '../../src/models/Course.js';
import TaskSubmission from '../../src/models/TaskSubmission.js';
import { mockReq, mockRes } from '../helpers/http.js';

test('createTaskContent: 201 sin archivo (las instrucciones pueden ir solo en el texto)', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 50);
  const req = mockReq({ body: { course_id: 1, title: 'Ensayo final', description: 'Entrega un PDF de 2 páginas' } });
  const res = mockRes();
  await contentController.createTaskContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.type, 'task');
  assert.equal(created.url, null);
});

test('createTaskContent: 201 con archivo de instrucciones adjunto', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 51);
  const req = mockReq({
    body: { course_id: 1, title: 'Ensayo final' },
    file: { filename: 'instrucciones-123.pdf', size: 2048 }
  });
  const res = mockRes();
  await contentController.createTaskContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.url, '/uploads/files/instrucciones-123.pdf');
  assert.equal(created.file_size, 2048);
});

test('createForumContent: 201 con título y texto principal', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 60);
  const req = mockReq({ body: { course_id: 1, title: 'Discusión del capítulo 3', description: '¿Qué opinan del capítulo 3?' } });
  const res = mockRes();
  await contentController.createForumContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.type, 'forum');
  assert.equal(created.url, null);
});

test('createForumContent: 400 si falta el texto principal', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 60);
  const req = mockReq({ body: { course_id: 1, title: 'Discusión del capítulo 3' } });
  const res = mockRes();
  await contentController.createForumContent(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(createCall.mock.calls.length, 0);
});

test('createTaskContent: 400 si falta el título', async (t) => {
  const req = mockReq({ body: { course_id: 1 } });
  const res = mockRes();
  await contentController.createTaskContent(req, res);
  assert.equal(res.statusCode, 400);
});

// =================================
// Carpetas
// =================================

test('createFolderContent: 201 con título (sin url, sin descripción, sin folder_id — no hay subcarpetas)', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 70);
  const req = mockReq({ body: { course_id: 1, title: 'Semana 1' } });
  const res = mockRes();
  await contentController.createFolderContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.type, 'folder');
  assert.equal(created.url, null);
  assert.equal(created.folder_id, null);
});

test('createFolderContent: 400 si falta el título', async (t) => {
  const req = mockReq({ body: { course_id: 1 } });
  const res = mockRes();
  await contentController.createFolderContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createTextContent: con folder_id válido (carpeta del mismo curso), la asigna a esa carpeta', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 5, type: 'folder', course_id: 1 }));
  const createCall = t.mock.method(Content, 'create', async () => 71);
  const req = mockReq({ body: { course_id: 1, title: 'Lectura', description: 'texto', folder_id: 5 } });
  const res = mockRes();
  await contentController.createTextContent(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createCall.mock.calls[0].arguments[0].folder_id, 5);
});

test('createTextContent: 400 si folder_id apunta a un contenido que no es carpeta', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 5, type: 'file', course_id: 1 }));
  const createCall = t.mock.method(Content, 'create', async () => 71);
  const req = mockReq({ body: { course_id: 1, title: 'Lectura', description: 'texto', folder_id: 5 } });
  const res = mockRes();
  await contentController.createTextContent(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(createCall.mock.calls.length, 0);
});

test('createTextContent: 400 si folder_id apunta a una carpeta de OTRO curso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 5, type: 'folder', course_id: 999 }));
  const req = mockReq({ body: { course_id: 1, title: 'Lectura', description: 'texto', folder_id: 5 } });
  const res = mockRes();
  await contentController.createTextContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createVideoContent: folder_id inválido borra el video ya subido al disco (no queda huérfano)', async (t) => {
  t.mock.method(Content, 'findById', async () => undefined);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const createCall = t.mock.method(Content, 'create', async () => 72);

  const req = mockReq({
    body: { course_id: 1, title: 'Video', folder_id: 999 },
    file: { filename: 'video.mp4', size: 1000 }
  });
  const res = mockRes();
  await contentController.createVideoContent(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(createCall.mock.calls.length, 0);
  assert.equal(unlinkCall.mock.calls.length, 1, 'el video subido no debe quedar huérfano en disco');
});

test('updateContent: mueve el contenido a otra carpeta válida del mismo curso', async (t) => {
  t.mock.method(Content, 'findById', async (id) => {
    if (String(id) === '9') return { id: 9, type: 'file', course_id: 1, url: null };
    return { id: 5, type: 'folder', course_id: 1 };
  });
  const updateCall = t.mock.method(Content, 'update', async () => true);
  const req = mockReq({ params: { id: 9 }, body: { folder_id: 5 } });
  const res = mockRes();
  await contentController.updateContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateCall.mock.calls[0].arguments[1].folder_id, 5);
});

test('updateContent: folder_id: null explícito saca el contenido de su carpeta', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, type: 'file', course_id: 1, url: null }));
  const updateCall = t.mock.method(Content, 'update', async () => true);
  const req = mockReq({ params: { id: 9 }, body: { folder_id: null } });
  const res = mockRes();
  await contentController.updateContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateCall.mock.calls[0].arguments[1].folder_id, null);
});

test('updateContent: 400 si se intenta meter una carpeta dentro de otra carpeta (un solo nivel)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, type: 'folder', course_id: 1, url: null }));
  const updateCall = t.mock.method(Content, 'update', async () => true);
  const req = mockReq({ params: { id: 9 }, body: { folder_id: 5 } });
  const res = mockRes();
  await contentController.updateContent(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCall.mock.calls.length, 0);
});

test('deleteContent: 400 si la carpeta todavía tiene contenido adentro', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 5, type: 'folder', course_id: 1, url: null }));
  t.mock.method(Content, 'hasChildren', async () => true);
  const deleteCall = t.mock.method(Content, 'delete', async () => true);
  const req = mockReq({ params: { id: 5 } });
  const res = mockRes();
  await contentController.deleteContent(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(deleteCall.mock.calls.length, 0, 'no debe borrar una carpeta no vacía');
});

test('deleteContent: una carpeta vacía sí se puede borrar', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 5, type: 'folder', course_id: 1, url: null }));
  t.mock.method(Content, 'hasChildren', async () => false);
  const deleteCall = t.mock.method(Content, 'delete', async () => true);
  const req = mockReq({ params: { id: 5 } });
  const res = mockRes();
  await contentController.deleteContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(deleteCall.mock.calls.length, 1);
});

test('createTextContent: 400 si falta el título', async (t) => {
  const req = mockReq({ body: { course_id: 1, description: 'algo de texto' } });
  const res = mockRes();
  await contentController.createTextContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createTextContent: 400 si el texto viene vacío (solo espacios)', async (t) => {
  const req = mockReq({ body: { course_id: 1, title: 'Lectura', description: '   ' } });
  const res = mockRes();
  await contentController.createTextContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createTextContent: 201 y guarda el texto en description con url null', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 42);
  const req = mockReq({ body: { course_id: 1, title: 'Lectura', description: 'contenido real de la lección' } });
  const res = mockRes();
  await contentController.createTextContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.type, 'text');
  assert.equal(created.description, 'contenido real de la lección');
  assert.equal(created.url, null);
});

test('createUrlContent: 400 si la URL no es http/https (ej. javascript:)', async (t) => {
  const req = mockReq({ body: { course_id: 1, title: 'Video externo', url: 'javascript:alert(1)' } });
  const res = mockRes();
  await contentController.createUrlContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createUrlContent: 400 si falta la URL', async (t) => {
  const req = mockReq({ body: { course_id: 1, title: 'Video externo' } });
  const res = mockRes();
  await contentController.createUrlContent(req, res);
  assert.equal(res.statusCode, 400);
});

test('createUrlContent: 201 con una URL https válida', async (t) => {
  const createCall = t.mock.method(Content, 'create', async () => 43);
  const req = mockReq({ body: { course_id: 1, title: 'Video externo', url: 'https://www.youtube.com/watch?v=abc' } });
  const res = mockRes();
  await contentController.createUrlContent(req, res);

  assert.equal(res.statusCode, 201);
  const created = createCall.mock.calls[0].arguments[0];
  assert.equal(created.type, 'url');
  assert.equal(created.url, 'https://www.youtube.com/watch?v=abc');
});

test('downloadFile: 404 si el contenido no existe', async (t) => {
  t.mock.method(Content, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 404);
});

test('downloadFile: 400 si el contenido no es de tipo "file" (ej. es un video)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'video', course_id: 1 }));
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 400);
});

test('downloadFile: 403 si un estudiante no inscrito (ni profesor del curso) intenta descargar', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 403);
});

test('downloadFile: 404 si el archivo ya no existe en disco', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Course, 'isUserTeacher', async () => false);
  t.mock.method(fs, 'existsSync', () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 404);
});

test('downloadFile: un estudiante inscrito puede descargar', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Course, 'isUserTeacher', async () => false);
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.downloadCall.fileName, 'x.pdf');
});

test('downloadFile: un profesor del curso puede descargar sin estar inscrito', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => true);
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'teacher' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.downloadCall.fileName, 'x.pdf');
});

test('downloadFile: un admin descarga sin necesitar inscripción', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', course_id: 1, url: '/uploads/files/x.pdf' }));
  const enrolledCheck = t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'admin' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.downloadCall.fileName, 'x.pdf');
  assert.equal(enrolledCheck.mock.calls.length, 0, 'un admin no debería requerir la verificación de inscripción');
});

test('downloadFile: una tarea con archivo de instrucciones (type=task, con url) SÍ se puede descargar', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, type: 'task', course_id: 1, url: '/uploads/files/instrucciones.pdf' }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Course, 'isUserTeacher', async () => false);
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 9 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.downloadCall.fileName, 'instrucciones.pdf');
});

test('downloadFile: 400 si es una tarea SIN archivo de instrucciones (type=task, url=null)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, type: 'task', course_id: 1, url: null }));
  const req = mockReq({ params: { id: 9 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.downloadFile(req, res);
  assert.equal(res.statusCode, 400);
});

test('markContentCompleted: 403 si un estudiante no inscrito intenta marcar progreso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, course_id: 1 }));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentCompleted(req, res);
  assert.equal(res.statusCode, 403);
});

test('markContentCompleted: éxito recalcula y devuelve el progreso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, course_id: 1 }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Content, 'markCompleted', async () => 10);
  t.mock.method(Content, 'recalculateCourseProgress', async () => ({ progress: 50, total: 2, completed: 1 }));

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentCompleted(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.progress, 50);
});

test('markContentCompleted: 400 si el contenido es una tarea (su progreso solo lo controla la entrega)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, course_id: 1, type: 'task' }));
  const markCall = t.mock.method(Content, 'markCompleted', async () => 10);
  const req = mockReq({ params: { id: 9 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentCompleted(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(markCall.mock.calls.length, 0, 'no debe marcarse completada sin pasar por submitTask');
});

test('markContentIncomplete: 400 si el contenido es una tarea', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, course_id: 1, type: 'task' }));
  const markCall = t.mock.method(Content, 'markIncomplete', async () => true);
  const req = mockReq({ params: { id: 9 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentIncomplete(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(markCall.mock.calls.length, 0);
});

test('markContentCompleted: 400 si el contenido es un foro (no cuenta para el progreso)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, course_id: 1, type: 'forum' }));
  const markCall = t.mock.method(Content, 'markCompleted', async () => 10);
  const req = mockReq({ params: { id: 9 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentCompleted(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(markCall.mock.calls.length, 0);
});

test('markContentIncomplete: 400 si el contenido es un foro', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, course_id: 1, type: 'forum' }));
  const markCall = t.mock.method(Content, 'markIncomplete', async () => true);
  const req = mockReq({ params: { id: 9 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentIncomplete(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(markCall.mock.calls.length, 0);
});

test('markContentCompleted: 400 si el contenido es una carpeta (no cuenta para el progreso)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, course_id: 1, type: 'folder' }));
  const markCall = t.mock.method(Content, 'markCompleted', async () => 10);
  const req = mockReq({ params: { id: 9 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentCompleted(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(markCall.mock.calls.length, 0);
});

test('markContentIncomplete: éxito recalcula y devuelve el progreso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, course_id: 1, type: 'video' }));
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(Content, 'markIncomplete', async () => true);
  t.mock.method(Content, 'recalculateCourseProgress', async () => ({ progress: 0, total: 2, completed: 0 }));

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.markContentIncomplete(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.progress, 0);
});

test('getContentsByCourse: oculta URLs a un usuario con sesión pero no inscrito', async (t) => {
  t.mock.method(Content, 'findByCourseWithProgress', async () => ([{ id: 1, url: '/uploads/videos/x.mp4' }]));
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(Course, 'isUserTeacher', async () => false);

  const req = mockReq({ params: { courseId: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await contentController.getContentsByCourse(req, res);

  assert.equal(res.body.data[0].url, null);
});

test('getContentsByCourse: oculta URLs a un visitante anónimo (sin sesión)', async (t) => {
  t.mock.method(Content, 'findByCourse', async () => ([{ id: 1, url: '/uploads/videos/x.mp4' }]));

  const req = mockReq({ params: { courseId: 1 }, session: null });
  const res = mockRes();
  await contentController.getContentsByCourse(req, res);

  assert.equal(res.body.data[0].url, null);
});

test('updateContent: en type=url, permite editar la url si es un link http(s) válido', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'url', url: 'https://old.example.com' }));
  const updateCall = t.mock.method(Content, 'update', async () => true);
  const req = mockReq({ params: { id: 1 }, body: { url: 'https://youtube.com/watch?v=nuevo' } });
  const res = mockRes();

  await contentController.updateContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(updateCall.mock.calls[0].arguments[1].url, 'https://youtube.com/watch?v=nuevo');
});

test('updateContent: en type=url, rechaza una url que no sea http/https', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'url', url: 'https://old.example.com' }));
  const updateCall = t.mock.method(Content, 'update', async () => true);
  const req = mockReq({ params: { id: 1 }, body: { url: 'javascript:alert(1)' } });
  const res = mockRes();

  await contentController.updateContent(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(updateCall.mock.calls.length, 0);
});

test('deleteContent: en type=url no intenta borrar ningún archivo del disco (la "url" es un link externo)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'url', url: 'https://youtube.com/watch?v=x' }));
  t.mock.method(Content, 'delete', async () => true);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();

  await contentController.deleteContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(unlinkCall.mock.calls.length, 0);
});

test('deleteContent: en type=file SÍ borra el archivo del disco', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'file', url: '/uploads/files/x.pdf' }));
  t.mock.method(Content, 'delete', async () => true);
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();

  await contentController.deleteContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(unlinkCall.mock.calls.length, 1);
});

test('deleteContent: al borrar una tarea con entregas, también borra del disco el archivo de cada entrega (si no, quedan huérfanas)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, type: 'task', course_id: 1, url: '/uploads/files/instrucciones.pdf' }));
  t.mock.method(Content, 'delete', async () => true);
  t.mock.method(TaskSubmission, 'findAllByContent', async () => ([
    { id: 1, file_url: '/uploads/submissions/a.pdf' },
    { id: 2, file_url: '/uploads/submissions/b.docx' }
  ]));
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 9 } });
  const res = mockRes();

  await contentController.deleteContent(req, res);

  assert.equal(res.statusCode, 200);
  // 1 por el archivo de instrucciones de la tarea + 2 por las entregas
  assert.equal(unlinkCall.mock.calls.length, 3);
});

test('deleteContent: una tarea sin entregas no intenta borrar ningún archivo de entrega', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 9, type: 'task', course_id: 1, url: null }));
  t.mock.method(Content, 'delete', async () => true);
  t.mock.method(TaskSubmission, 'findAllByContent', async () => ([]));
  const unlinkCall = t.mock.method(fs, 'unlinkSync', () => {});
  const req = mockReq({ params: { id: 9 } });
  const res = mockRes();

  await contentController.deleteContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(unlinkCall.mock.calls.length, 0);
});

test('deleteContent: en un tipo que no es tarea, no consulta TaskSubmission.findAllByContent', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'video', url: '/uploads/videos/x.mp4' }));
  t.mock.method(Content, 'delete', async () => true);
  const findSubmissionsCall = t.mock.method(TaskSubmission, 'findAllByContent', async () => ([]));
  t.mock.method(fs, 'unlinkSync', () => {});
  t.mock.method(fs, 'existsSync', () => true);
  const req = mockReq({ params: { id: 1 } });
  const res = mockRes();

  await contentController.deleteContent(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(findSubmissionsCall.mock.calls.length, 0);
});
