/**
 * API Service - Maneja todas las peticiones al backend
 */

const API_URL = '/api';

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            credentials: 'include',
            ...options
        });

        const data = await response.json();

        if (response.status === 401) {
            const currentHash = window.location.hash;
            if (currentHash !== '#/login' && currentHash !== '#/register') {
                showToast('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'warning');
                setTimeout(() => { window.location.hash = '#/login'; window.location.reload(); }, 1500);
            }
            throw new Error(data.message || 'Sesión expirada');
        }

        if (!response.ok) throw new Error(data.message || 'Error en la petición');
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

async function apiRequestFormData(endpoint, formData) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();

        if (response.status === 401) {
            showToast('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', 'warning');
            setTimeout(() => { window.location.hash = '#/login'; window.location.reload(); }, 1500);
            throw new Error('Sesión expirada');
        }

        if (!response.ok) throw new Error(data.message || 'Error en la petición');
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// =================================
// Authentication API
// =================================

const authAPI = {
    login: async (email, password) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: async (name, email, password, username, role = 'student') => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, username, role }) }),
    logout: async () => apiRequest('/auth/logout', { method: 'POST' }),
    getCurrentUser: async () => apiRequest('/auth/me'),
    checkAuth: async () => apiRequest('/auth/check'),
    forgotPassword: async (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: async (token, password) => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
};

// =================================
// Courses API
// =================================

const coursesAPI = {
    getAll: async ({ page = 1, limit = 12, search = '' } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set('search', search);
        return apiRequest(`/courses?${params}`);
    },
    getById: async (id) => apiRequest(`/courses/${id}`),
    getEnrolled: async () => apiRequest('/courses/enrolled'),
    create: async (formData) => apiRequestFormData('/courses', formData),
    update: async (id, formData) => {
        const response = await fetch(`${API_URL}/courses/${id}`, { method: 'PUT', body: formData, credentials: 'include' });
        const data = await response.json();
        if (response.status === 401) { showToast('Tu sesión ha expirado.', 'warning'); setTimeout(() => { window.location.hash = '#/login'; window.location.reload(); }, 1500); throw new Error('Sesión expirada'); }
        if (!response.ok) throw new Error(data.message || 'Error al actualizar curso');
        return data;
    },
    delete: async (id) => apiRequest(`/courses/${id}`, { method: 'DELETE' }),
    enroll: async (id) => apiRequest(`/courses/${id}/enroll`, { method: 'POST' }),
    unenroll: async (id) => apiRequest(`/courses/${id}/enroll`, { method: 'DELETE' }),
    getStats: async (id) => apiRequest(`/courses/${id}/stats`),
    getGlobalStats: async () => apiRequest('/courses/stats/summary'),
    downloadCertificate: async (id) => { window.open(`${API_URL}/courses/${id}/certificate`, '_blank'); },
    getStudents: async (id) => apiRequest(`/courses/${id}/students`),
    getTeachers: async (id) => apiRequest(`/courses/${id}/teachers`),
    getTeaching: async () => apiRequest('/courses/teaching')
};

// =================================
// Contents API
// =================================

const contentsAPI = {
    getByCourse: async (courseId) => apiRequest(`/contents/course/${courseId}`),
    getById: async (id) => apiRequest(`/contents/${id}`),
    createVideo: async (formData) => apiRequestFormData('/contents/video', formData),
    createFile: async (formData) => apiRequestFormData('/contents/file', formData),
    createText: async (data) => apiRequest('/contents/text', { method: 'POST', body: JSON.stringify(data) }),
    createUrl: async (data) => apiRequest('/contents/url', { method: 'POST', body: JSON.stringify(data) }),
    createTask: async (formData) => apiRequestFormData('/contents/task', formData),
    createForum: async (data) => apiRequest('/contents/forum', { method: 'POST', body: JSON.stringify(data) }),
    createFolder: async (data) => apiRequest('/contents/folder', { method: 'POST', body: JSON.stringify(data) }),
    getForumThread: async (id) => apiRequest(`/contents/${id}/forum`),
    postForumReply: async (id, data) => apiRequest(`/contents/${id}/forum`, { method: 'POST', body: JSON.stringify(data) }),
    submit: async (id, formData) => apiRequestFormData(`/contents/${id}/submit`, formData),
    getMySubmission: async (id) => apiRequest(`/contents/${id}/submission`),
    getSubmissions: async (id) => apiRequest(`/contents/${id}/submissions`),
    update: async (id, formData) => {
        const response = await fetch(`${API_URL}/contents/${id}`, { method: 'PUT', body: formData, credentials: 'include' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Error al actualizar contenido');
        return data;
    },
    delete: async (id) => apiRequest(`/contents/${id}`, { method: 'DELETE' }),
    reorder: async (courseId, contentIds) => apiRequest(`/contents/course/${courseId}/reorder`, { method: 'PUT', body: JSON.stringify({ contentIds }) }),
    download: async (id) => { window.open(`${API_URL}/contents/${id}/download`, '_blank'); },
    markCompleted: async (id) => apiRequest(`/contents/${id}/complete`, { method: 'POST' }),
    markIncomplete: async (id) => apiRequest(`/contents/${id}/complete`, { method: 'DELETE' })
};

// =================================
// Users API
// =================================

const usersAPI = {
    create: async (data) => apiRequest('/users', { method: 'POST', body: JSON.stringify(data) }),
    getAll: async ({ page = 1, limit = 10, search = '' } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set('search', search);
        return apiRequest(`/users?${params}`);
    },
    getById: async (id) => apiRequest(`/users/${id}`),
    update: async (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleActive: async (id) => apiRequest(`/users/${id}/toggle-active`, { method: 'PUT' }),
    delete: async (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
    getStats: async () => apiRequest('/users/stats/count'),
    getByRole: async (role) => apiRequest(`/users/by-role/${role}`)
};

// =================================
// Forum posts API (editar/borrar una respuesta puntual)
// =================================

const forumPostsAPI = {
    update: async (id, data) => apiRequest(`/forum-posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (id) => apiRequest(`/forum-posts/${id}`, { method: 'DELETE' })
};

// =================================
// Submissions API (entregas de tareas)
// =================================

const submissionsAPI = {
    download: async (id) => { window.open(`${API_URL}/submissions/${id}/download`, '_blank'); },
    review: async (id, data) => apiRequest(`/submissions/${id}/review`, { method: 'PUT', body: JSON.stringify(data) })
};

window.authAPI = authAPI;
window.coursesAPI = coursesAPI;
window.contentsAPI = contentsAPI;
window.usersAPI = usersAPI;
window.forumPostsAPI = forumPostsAPI;
window.submissionsAPI = submissionsAPI;