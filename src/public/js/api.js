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
    register: async (name, email, password, role = 'student') => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }),
    logout: async () => apiRequest('/auth/logout', { method: 'POST' }),
    getCurrentUser: async () => apiRequest('/auth/me'),
    checkAuth: async () => apiRequest('/auth/check')
};

// =================================
// Courses API
// =================================

const coursesAPI = {
    getAll: async () => apiRequest('/courses'),
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
    updateProgress: async (id, progress) => apiRequest(`/courses/${id}/progress`, { method: 'PUT', body: JSON.stringify({ progress }) }),
    getStats: async (id) => apiRequest(`/courses/${id}/stats`)
};

// =================================
// Contents API
// =================================

const contentsAPI = {
    getByCourse: async (courseId) => apiRequest(`/contents/course/${courseId}`),
    getById: async (id) => apiRequest(`/contents/${id}`),
    createVideo: async (formData) => apiRequestFormData('/contents/video', formData),
    createFile: async (formData) => apiRequestFormData('/contents/file', formData),
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
    getAll: async () => apiRequest('/users'),
    getById: async (id) => apiRequest(`/users/${id}`),
    update: async (id, data) => apiRequest(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    toggleActive: async (id) => apiRequest(`/users/${id}/toggle-active`, { method: 'PUT' }),
    delete: async (id) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
    getStats: async () => apiRequest('/users/stats/count')
};

window.authAPI = authAPI;
window.coursesAPI = coursesAPI;
window.contentsAPI = contentsAPI;
window.usersAPI = usersAPI;