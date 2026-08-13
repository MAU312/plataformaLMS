/**
 * Views - Hilo de un tema de foro (post principal + respuestas de 2 niveles)
 */

let currentForumTopicId = null;

window.renderForumThread = async function(params) {
    const app = document.getElementById('app');
    showLoading();
    currentForumTopicId = params.id;

    try {
        const response = await contentsAPI.getForumThread(params.id);
        const { topic, posts } = response.data;
        renderForumPage(topic, posts);
    } catch (error) {
        console.error('Error loading forum:', error);
        app.innerHTML = `
            <div class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <i class="fas fa-lock text-5xl text-yellow-500 mb-4"></i>
                    <p class="text-xl text-gray-600">${escapeHtml(error.message || 'No se pudo cargar el foro')}</p>
                    <a href="#/" class="btn-cenat mt-4 inline-block">Volver al inicio</a>
                </div>
            </div>
        `;
    }
};

function renderForumPage(topic, posts) {
    const app = document.getElementById('app');
    const currentUser = getCurrentUser();
    const totalReplies = posts.reduce((sum, post) => sum + 1 + (post.replies ? post.replies.length : 0), 0);

    app.innerHTML = `
        <div class="bg-white border-b">
            <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <a href="#/course/${topic.course_id}" class="text-cenat-green hover:underline text-sm">
                    <i class="fas fa-arrow-left mr-1"></i> Volver al curso
                </a>
            </div>
        </div>

        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <!-- Post principal -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <div class="flex items-center gap-2 text-xs text-gray-400 mb-2">
                    <i class="fas fa-comments text-cenat-green"></i>
                    <span>Tema de foro</span>
                </div>
                <h1 class="text-2xl font-bold text-gray-900 mb-3">${escapeHtml(topic.title)}</h1>
                <p class="text-gray-700 whitespace-pre-line">${escapeHtml(topic.description || '')}</p>
            </div>

            <!-- Formulario para responder al tema -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
                <form id="reply-to-topic-form" class="space-y-2">
                    <textarea id="reply-to-topic-body" rows="3" required
                        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green"
                        placeholder="Escribe una respuesta..."></textarea>
                    <button type="submit" class="bg-cenat-green text-white px-4 py-2 rounded-lg text-sm font-semibold">
                        <i class="fas fa-paper-plane mr-1"></i> Responder
                    </button>
                </form>
            </div>

            <!-- Respuestas -->
            <h2 class="text-lg font-bold text-gray-900 mb-4">
                ${totalReplies} ${totalReplies === 1 ? 'respuesta' : 'respuestas'}
            </h2>
            <div id="forum-posts-list" class="space-y-4">
                ${posts.length > 0 ? posts.map(post => renderTopLevelPost(post, currentUser)).join('') : `
                    <div class="empty-state bg-white rounded-xl border border-gray-100">
                        <i class="fas fa-comment-slash"></i>
                        <p class="text-gray-600">Todavía no hay respuestas. ¡Sé el primero en participar!</p>
                    </div>
                `}
            </div>
        </div>
    `;

    document.getElementById('reply-to-topic-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = document.getElementById('reply-to-topic-body');
        await submitForumReply(topic.id, null, textarea.value, e.target.querySelector('button[type="submit"]'));
    });

    setupForumPostListeners(topic, currentUser);
}

function renderTopLevelPost(post, currentUser) {
    return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            ${renderPostBody(post, currentUser)}

            ${post.replies && post.replies.length > 0 ? `
                <div class="mt-4 ml-6 pl-4 border-l-2 border-gray-100 space-y-3">
                    ${post.replies.map(reply => renderPostBody(reply, currentUser, true)).join('')}
                </div>
            ` : ''}

            <div class="mt-3 ${post.replies && post.replies.length > 0 ? 'ml-6 pl-4' : ''}">
                <button onclick="toggleReplyForm(${post.id})" class="text-xs text-cenat-green hover:text-cenat-green-hover font-medium">
                    <i class="fas fa-reply mr-1"></i> Responder
                </button>
                <div id="reply-form-${post.id}" class="hidden mt-2"></div>
            </div>
        </div>
    `;
}

function renderPostBody(post, currentUser, isReply = false) {
    const isOwner = !!currentUser && post.user_id === currentUser.id;
    const canModerate = isAdmin() || isTeacher();
    const roleLabel = post.author_role === 'teacher' ? 'Profesor' : post.author_role === 'admin' ? 'Admin' : '';

    return `
        <div class="post-body" data-post-id="${post.id}">
            <div class="flex items-start justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-semibold text-gray-900 text-sm">${escapeHtml(post.author_name)}</span>
                    ${roleLabel ? `<span class="badge ${post.author_role === 'teacher' ? 'badge-teacher' : 'badge-admin'} text-xs">${roleLabel}</span>` : ''}
                    <span class="text-xs text-gray-400">${formatDate(post.created_at)}${post.updated_at ? ' (editado)' : ''}</span>
                </div>
                ${isOwner || canModerate ? `
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${isOwner ? `<button onclick="toggleEditForm(${post.id})" class="text-xs text-gray-400 hover:text-cenat-green" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
                        <button onclick="deleteForumPost(${post.id})" class="text-xs text-gray-400 hover:text-red-500" title="Borrar"><i class="fas fa-trash"></i></button>
                    </div>
                ` : ''}
            </div>
            <p class="post-text text-sm text-gray-700 mt-1 whitespace-pre-line">${escapeHtml(post.body)}</p>
            <div id="edit-form-${post.id}" class="hidden mt-2"></div>
        </div>
    `;
}

function toggleReplyForm(postId) {
    const container = document.getElementById(`reply-form-${postId}`);
    if (!container) return;

    if (!container.classList.contains('hidden')) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }

    container.classList.remove('hidden');
    container.innerHTML = `
        <form class="reply-form space-y-2" data-parent-id="${postId}">
            <textarea rows="2" required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green"
                placeholder="Escribe tu respuesta..."></textarea>
            <div class="flex gap-2">
                <button type="submit" class="bg-cenat-green text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Responder</button>
                <button type="button" onclick="toggleReplyForm(${postId})" class="text-gray-500 text-xs px-3 py-1.5">Cancelar</button>
            </div>
        </form>
    `;

    container.querySelector('.reply-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = e.target.querySelector('textarea');
        await submitForumReply(currentForumTopicId, postId, textarea.value, e.target.querySelector('button[type="submit"]'));
    });
}

function toggleEditForm(postId) {
    const container = document.getElementById(`edit-form-${postId}`);
    const textEl = document.querySelector(`.post-body[data-post-id="${postId}"] .post-text`);
    if (!container || !textEl) return;

    if (!container.classList.contains('hidden')) {
        container.classList.add('hidden');
        container.innerHTML = '';
        textEl.classList.remove('hidden');
        return;
    }

    textEl.classList.add('hidden');
    container.classList.remove('hidden');
    container.innerHTML = `
        <form class="edit-form space-y-2">
            <textarea rows="2" required class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cenat-green">${escapeHtml(textEl.textContent.trim())}</textarea>
            <div class="flex gap-2">
                <button type="submit" class="bg-cenat-green text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Guardar</button>
                <button type="button" onclick="toggleEditForm(${postId})" class="text-gray-500 text-xs px-3 py-1.5">Cancelar</button>
            </div>
        </form>
    `;

    container.querySelector('.edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const textarea = e.target.querySelector('textarea');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        try {
            submitBtn.disabled = true;
            await forumPostsAPI.update(postId, { body: textarea.value.trim() });
            showToast('Respuesta actualizada', 'success');
            renderForumThread({ id: currentForumTopicId });
        } catch (error) {
            showToast(error.message || 'Error al editar la respuesta', 'error');
            submitBtn.disabled = false;
        }
    });
}

async function submitForumReply(topicId, parentId, body, submitBtn) {
    const trimmed = body.trim();
    if (!trimmed) {
        showToast('Escribe una respuesta antes de enviar', 'error');
        return;
    }

    try {
        if (submitBtn) submitBtn.disabled = true;
        await contentsAPI.postForumReply(topicId, { body: trimmed, parent_id: parentId || undefined });
        showToast('Respuesta publicada', 'success');
        renderForumThread({ id: topicId });
    } catch (error) {
        showToast(error.message || 'Error al publicar la respuesta', 'error');
        if (submitBtn) submitBtn.disabled = false;
    }
}

async function deleteForumPost(postId) {
    if (!confirmAction('¿Estás seguro de borrar esta respuesta? Esta acción no se puede deshacer.')) {
        return;
    }
    try {
        await forumPostsAPI.delete(postId);
        showToast('Respuesta eliminada', 'success');
        renderForumThread({ id: currentForumTopicId });
    } catch (error) {
        showToast(error.message || 'Error al borrar la respuesta', 'error');
    }
}

function setupForumPostListeners() {
    // Los formularios de respuesta/edición se registran dinámicamente al
    // abrirse (toggleReplyForm / toggleEditForm) — acá no hace falta nada
    // más al montar la página.
}

window.toggleReplyForm = toggleReplyForm;
window.toggleEditForm = toggleEditForm;
window.deleteForumPost = deleteForumPost;
