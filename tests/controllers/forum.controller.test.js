import test from 'node:test';
import assert from 'node:assert/strict';
import * as forumController from '../../src/controllers/forum.controller.js';
import Content from '../../src/models/Content.js';
import Course from '../../src/models/Course.js';
import ForumPost from '../../src/models/ForumPost.js';
import { mockReq, mockRes } from '../helpers/http.js';

// =================================
// listPosts
// =================================

test('listPosts: 404 si el contenido no existe', async (t) => {
  t.mock.method(Content, 'findById', async () => undefined);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await forumController.listPosts(req, res);
  assert.equal(res.statusCode, 404);
});

test('listPosts: 404 si el contenido existe pero no es type=forum', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'text', course_id: 5 }));
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await forumController.listPosts(req, res);
  assert.equal(res.statusCode, 404);
});

test('listPosts: 403 si no tiene acceso (no inscrito, ni profesor, ni admin)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => false);
  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await forumController.listPosts(req, res);
  assert.equal(res.statusCode, 403);
});

test('listPosts: agrupa las respuestas en 2 niveles (nivel 1 con su array replies)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5, title: 'Tema', description: 'Texto principal' }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(ForumPost, 'countByContentId', async () => ({ total_all: 3, total_top: 2 }));
  t.mock.method(ForumPost, 'findThreadPage', async () => ([
    { id: 10, content_id: 1, parent_id: null, body: 'Respuesta 1' },
    { id: 12, content_id: 1, parent_id: null, body: 'Respuesta 2' },
    { id: 11, content_id: 1, parent_id: 10, body: 'Respuesta a la 1' }
  ]));

  const req = mockReq({ params: { id: 1 }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await forumController.listPosts(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.posts.length, 2, 'solo 2 posts de nivel 1');
  assert.equal(res.body.data.posts[0].replies.length, 1);
  assert.equal(res.body.data.posts[0].replies[0].id, 11);
  assert.equal(res.body.data.posts[1].replies.length, 0);
  assert.equal(res.body.data.total_posts, 3, 'total_posts cuenta ambos niveles (para el encabezado "N respuestas")');
});

test('listPosts: pagina por respuesta de nivel 1 (20 por defecto) y pasa page/limit al modelo', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(ForumPost, 'countByContentId', async () => ({ total_all: 130, total_top: 45 }));
  const pageCall = t.mock.method(ForumPost, 'findThreadPage', async () => []);

  const res = mockRes();
  await forumController.listPosts(mockReq({ params: { id: 1 }, query: { page: '2' }, session: { user: { id: 1, role: 'student' } } }), res);

  assert.deepEqual(pageCall.mock.calls[0].arguments, [1, { page: 2, limit: 20 }]);
  assert.deepEqual(res.body.pagination, { page: 2, limit: 20, total: 45, totalPages: 3 });
});

test('listPosts: page=last salta a la última página (donde queda una respuesta recién publicada)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(ForumPost, 'countByContentId', async () => ({ total_all: 130, total_top: 45 }));
  const pageCall = t.mock.method(ForumPost, 'findThreadPage', async () => []);

  const res = mockRes();
  await forumController.listPosts(mockReq({ params: { id: 1 }, query: { page: 'last' }, session: { user: { id: 1, role: 'student' } } }), res);

  assert.equal(pageCall.mock.calls[0].arguments[1].page, 3, '45 hilos / 20 por página = 3 páginas');
  assert.equal(res.body.pagination.page, 3);
});

test('listPosts: page=last en un foro vacío es la página 1 (no 0)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(ForumPost, 'countByContentId', async () => ({ total_all: 0, total_top: 0 }));
  const pageCall = t.mock.method(ForumPost, 'findThreadPage', async () => []);

  const res = mockRes();
  await forumController.listPosts(mockReq({ params: { id: 1 }, query: { page: 'last' }, session: { user: { id: 1, role: 'student' } } }), res);

  assert.equal(pageCall.mock.calls[0].arguments[1].page, 1);
  assert.deepEqual(res.body.data.posts, []);
});

test('listPosts: un page absurdo o un limit enorme se acotan (no llegan crudos a MySQL)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(ForumPost, 'countByContentId', async () => ({ total_all: 0, total_top: 0 }));
  const pageCall = t.mock.method(ForumPost, 'findThreadPage', async () => []);

  await forumController.listPosts(mockReq({ params: { id: 1 }, query: { page: '99999999999999999999', limit: '9999' }, session: { user: { id: 1, role: 'student' } } }), mockRes());

  assert.deepEqual(pageCall.mock.calls[0].arguments[1], { page: 1000000, limit: 50 });
});

// =================================
// createPost
// =================================

test('createPost: 400 si el body viene vacío', async (t) => {
  const req = mockReq({ params: { id: 1 }, body: { body: '   ' }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await forumController.createPost(req, res);
  assert.equal(res.statusCode, 400);
});

test('createPost: 404 si el contenido no es type=forum', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'task', course_id: 5 }));
  const req = mockReq({ params: { id: 1 }, body: { body: 'Hola' }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await forumController.createPost(req, res);
  assert.equal(res.statusCode, 404);
});

test('createPost: 403 si no tiene acceso al curso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => false);
  const req = mockReq({ params: { id: 1 }, body: { body: 'Hola' }, session: { user: { id: 1, role: 'student' } } });
  const res = mockRes();
  await forumController.createPost(req, res);
  assert.equal(res.statusCode, 403);
});

test('createPost: sin parent_id, crea una respuesta de nivel 1 (parent_id null)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  const createCall = t.mock.method(ForumPost, 'create', async () => 20);

  const req = mockReq({ params: { id: 1 }, body: { body: 'Hola' }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.createPost(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createCall.mock.calls[0].arguments[0].parent_id, null);
});

test('createPost: respondiendo a una respuesta de NIVEL 1, queda con ese id como parent_id', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(ForumPost, 'findById', async () => ({ id: 10, content_id: 1, parent_id: null }));
  const createCall = t.mock.method(ForumPost, 'create', async () => 21);

  const req = mockReq({ params: { id: 1 }, body: { body: 'Respondo', parent_id: 10 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.createPost(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createCall.mock.calls[0].arguments[0].parent_id, 10);
});

test('createPost: respondiendo a una respuesta de NIVEL 2, se aplana al nivel 1 del que colgaba (no crea nivel 3)', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  // El post 11 es de nivel 2: cuelga del post 10 (nivel 1)
  t.mock.method(ForumPost, 'findById', async () => ({ id: 11, content_id: 1, parent_id: 10 }));
  const createCall = t.mock.method(ForumPost, 'create', async () => 22);

  const req = mockReq({ params: { id: 1 }, body: { body: 'Respondo a la respuesta', parent_id: 11 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.createPost(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(createCall.mock.calls[0].arguments[0].parent_id, 10, 'debe engancharse al nivel 1 (10), no quedar como hijo del nivel 2 (11)');
});

test('createPost: si el autor está inscrito en el curso, marca el foro como completado y recalcula el progreso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(Course, 'isUserEnrolled', async () => true);
  t.mock.method(ForumPost, 'create', async () => 20);
  const markCompletedCall = t.mock.method(Content, 'markCompleted', async () => true);
  const recalcCall = t.mock.method(Content, 'recalculateCourseProgress', async () => ({ progress: 50, total: 4, completed: 2, enrollment_course_id: 5 }));

  const req = mockReq({ params: { id: 1 }, body: { body: 'Hola' }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.createPost(req, res);

  assert.equal(res.statusCode, 201);
  assert.deepEqual(markCompletedCall.mock.calls[0].arguments, [1, 2]);
  assert.deepEqual(recalcCall.mock.calls[0].arguments, [5, 2]);
  // El resultado ya no se descarta: el frontend lo necesita para mostrar
  // la celebración de curso completado si esto fue lo último que faltaba
  // (ver views_forum.js) — antes createPost lo ignoraba por completo.
  assert.equal(res.body.data.progress, 50);
  assert.equal(res.body.data.enrollment_course_id, 5);
});

test('createPost: si el autor NO está inscrito (ej. el profesor respondiendo dudas), no toca el progreso', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(Course, 'isUserEnrolled', async () => false);
  t.mock.method(ForumPost, 'create', async () => 20);
  const markCompletedCall = t.mock.method(Content, 'markCompleted', async () => true);
  const recalcCall = t.mock.method(Content, 'recalculateCourseProgress', async () => ({ progress: 0, total: 4, completed: 0 }));

  const req = mockReq({ params: { id: 1 }, body: { body: 'Respondiendo como profesor' }, session: { user: { id: 3, role: 'teacher' } } });
  const res = mockRes();
  await forumController.createPost(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(markCompletedCall.mock.calls.length, 0);
  assert.equal(recalcCall.mock.calls.length, 0);
  assert.deepEqual(res.body.data, { id: 20 }, 'sin progreso que reportar, data no debe traer progress/enrollment_course_id');
});

test('createPost: 404 si el parent_id apunta a un post de OTRO tema de foro', async (t) => {
  t.mock.method(Content, 'findById', async () => ({ id: 1, type: 'forum', course_id: 5 }));
  t.mock.method(Course, 'canAccessMedia', async () => true);
  t.mock.method(ForumPost, 'findById', async () => ({ id: 10, content_id: 999, parent_id: null }));

  const req = mockReq({ params: { id: 1 }, body: { body: 'Hola', parent_id: 10 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.createPost(req, res);
  assert.equal(res.statusCode, 404);
});

// =================================
// updatePost
// =================================

test('updatePost: 403 si no es el autor', async (t) => {
  t.mock.method(ForumPost, 'findById', async () => ({ id: 10, user_id: 99 }));
  const req = mockReq({ params: { id: 10 }, body: { body: 'Nuevo texto' }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.updatePost(req, res);
  assert.equal(res.statusCode, 403);
});

test('updatePost: el autor puede editar su propia respuesta', async (t) => {
  t.mock.method(ForumPost, 'findById', async () => ({ id: 10, user_id: 2 }));
  const updateCall = t.mock.method(ForumPost, 'update', async () => true);
  const req = mockReq({ params: { id: 10 }, body: { body: 'Nuevo texto' }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.updatePost(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(updateCall.mock.calls[0].arguments[1], 'Nuevo texto');
});

// =================================
// deletePost
// =================================

test('deletePost: 403 si no es el autor, ni admin, ni profesor del curso', async (t) => {
  t.mock.method(ForumPost, 'findById', async () => ({ id: 10, user_id: 99, content_id: 1 }));
  t.mock.method(Content, 'findById', async () => ({ id: 1, course_id: 5 }));
  t.mock.method(Course, 'isUserTeacher', async () => false);
  const req = mockReq({ params: { id: 10 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.deletePost(req, res);
  assert.equal(res.statusCode, 403);
});

test('deletePost: el autor puede borrar su propia respuesta', async (t) => {
  t.mock.method(ForumPost, 'findById', async () => ({ id: 10, user_id: 2, content_id: 1 }));
  const deleteCall = t.mock.method(ForumPost, 'delete', async () => true);
  const req = mockReq({ params: { id: 10 }, session: { user: { id: 2, role: 'student' } } });
  const res = mockRes();
  await forumController.deletePost(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(deleteCall.mock.calls.length, 1);
});

test('deletePost: un admin puede borrar la respuesta de otro (moderación), sin ser el autor', async (t) => {
  t.mock.method(ForumPost, 'findById', async () => ({ id: 10, user_id: 99, content_id: 1 }));
  t.mock.method(ForumPost, 'delete', async () => true);
  const req = mockReq({ params: { id: 10 }, session: { user: { id: 1, role: 'admin' } } });
  const res = mockRes();
  await forumController.deletePost(req, res);
  assert.equal(res.statusCode, 200);
});

test('deletePost: el profesor asignado al curso puede borrar la respuesta de un estudiante (moderación)', async (t) => {
  t.mock.method(ForumPost, 'findById', async () => ({ id: 10, user_id: 99, content_id: 1 }));
  t.mock.method(Content, 'findById', async () => ({ id: 1, course_id: 5, folder_id: null }));
  t.mock.method(Course, 'canManageContent', async () => true);
  t.mock.method(ForumPost, 'delete', async () => true);
  const req = mockReq({ params: { id: 10 }, session: { user: { id: 3, role: 'teacher' } } });
  const res = mockRes();
  await forumController.deletePost(req, res);
  assert.equal(res.statusCode, 200);
});
