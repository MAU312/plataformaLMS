import Content from '../models/Content.js';
import Course from '../models/Course.js';
import ForumPost from '../models/ForumPost.js';

/**
 * Agrupa el listado plano de posts en árbol de 2 niveles: cada post de
 * nivel 1 (parent_id null) con su array `replies` de posts de nivel 2
 * (parent_id = el id de ese post de nivel 1). ForumPost.findByContentId ya
 * viene ordenado por fecha, así que alcanza un solo recorrido.
 */
function buildThread(posts) {
  const topLevel = [];
  const byId = new Map();

  for (const post of posts) {
    if (post.parent_id === null) {
      const node = { ...post, replies: [] };
      byId.set(post.id, node);
      topLevel.push(node);
    }
  }

  for (const post of posts) {
    if (post.parent_id !== null) {
      const parent = byId.get(post.parent_id);
      // Si el "padre" no es de nivel 1 (no debería pasar, createPost ya
      // aplana todo a 2 niveles al crear), se descarta en vez de romper.
      if (parent) parent.replies.push(post);
    }
  }

  return topLevel;
}

/**
 * GET /api/contents/:id/forum
 * Lista el tema (post principal) y todas sus respuestas, agrupadas en 2
 * niveles. Mismo criterio de acceso que el resto del contenido de un
 * curso: admin, inscrito, o profesor asignado.
 */
export const listPosts = async (req, res) => {
  try {
    const { id } = req.params;

    const content = await Content.findById(id);
    if (!content || content.type !== 'forum') {
      return res.status(404).json({ success: false, message: 'Foro no encontrado' });
    }

    const canAccess = await Course.canAccessMedia(content.course_id, req.session?.user);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Debes estar inscrito en este curso para ver este foro'
      });
    }

    const posts = await ForumPost.findByContentId(id);

    res.json({
      success: true,
      data: { topic: content, posts: buildThread(posts) }
    });
  } catch (error) {
    console.error('Error al obtener el foro:', error);
    res.status(500).json({ success: false, message: 'Error al obtener el foro' });
  }
};

/**
 * POST /api/contents/:id/forum
 * Publica una respuesta. `parent_id` opcional: si no viene (o viene null),
 * es una respuesta directa al tema (nivel 1). Si viene, se aplana a 2
 * niveles — responder a una respuesta de nivel 2 la reengancha bajo el
 * mismo post de nivel 1 del que ya colgaba, en vez de crear un nivel 3.
 */
export const createPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { body, parent_id } = req.body;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, message: 'El texto de la respuesta es requerido' });
    }

    const content = await Content.findById(id);
    if (!content || content.type !== 'forum') {
      return res.status(404).json({ success: false, message: 'Foro no encontrado' });
    }

    const canAccess = await Course.canAccessMedia(content.course_id, req.session?.user);
    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message: 'Debes estar inscrito en este curso para responder en este foro'
      });
    }

    let effectiveParentId = null;
    if (parent_id !== undefined && parent_id !== null) {
      const parentPost = await ForumPost.findById(parent_id);
      if (!parentPost || parentPost.content_id !== content.id) {
        return res.status(404).json({ success: false, message: 'La respuesta a la que intentas contestar no existe' });
      }
      effectiveParentId = parentPost.parent_id === null ? parentPost.id : parentPost.parent_id;
    }

    const postId = await ForumPost.create({
      content_id: content.id,
      user_id: req.session.user.id,
      parent_id: effectiveParentId,
      body: String(body).trim()
    });

    res.status(201).json({ success: true, message: 'Respuesta publicada', data: { id: postId } });
  } catch (error) {
    console.error('Error al publicar en el foro:', error);
    res.status(500).json({ success: false, message: 'Error al publicar la respuesta' });
  }
};

/**
 * PUT /api/forum-posts/:id
 * Solo el propio autor puede editar el texto de su respuesta.
 */
export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    if (!body || !String(body).trim()) {
      return res.status(400).json({ success: false, message: 'El texto de la respuesta es requerido' });
    }

    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Respuesta no encontrada' });
    }

    if (post.user_id !== req.session.user.id) {
      return res.status(403).json({ success: false, message: 'Solo puedes editar tus propias respuestas' });
    }

    await ForumPost.update(id, String(body).trim());

    res.json({ success: true, message: 'Respuesta actualizada' });
  } catch (error) {
    console.error('Error al editar la respuesta:', error);
    res.status(500).json({ success: false, message: 'Error al editar la respuesta' });
  }
};

/**
 * DELETE /api/forum-posts/:id
 * El propio autor puede borrar su respuesta. Un admin, o el profesor
 * asignado al curso del foro, puede borrar cualquier respuesta (moderación)
 * pero no editar el texto de otros — solo borrar.
 */
export const deletePost = async (req, res) => {
  try {
    const { id } = req.params;

    const post = await ForumPost.findById(id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Respuesta no encontrada' });
    }

    const isOwner = post.user_id === req.session.user.id;
    const isAdminUser = req.session.user.role === 'admin';

    let isTeacherOfCourse = false;
    if (!isOwner && !isAdminUser && req.session.user.role === 'teacher') {
      const content = await Content.findById(post.content_id);
      isTeacherOfCourse = !!content && await Course.isUserTeacher(content.course_id, req.session.user.id);
    }

    if (!isOwner && !isAdminUser && !isTeacherOfCourse) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para borrar esta respuesta' });
    }

    await ForumPost.delete(id);

    res.json({ success: true, message: 'Respuesta eliminada' });
  } catch (error) {
    console.error('Error al borrar la respuesta:', error);
    res.status(500).json({ success: false, message: 'Error al borrar la respuesta' });
  }
};
