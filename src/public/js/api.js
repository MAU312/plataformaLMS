/**
 * API Service - Maneja todas las peticiones al backend
 */

const API_URL = '/api';

/**
 * Aviso de sesión expirada + redirección a login. El toast se muestra
 * recién en un setTimeout(0): como es una tarea (macrotask), se ejecuta
 * DESPUÉS de que el catch del propio llamador (una promesa rechazada, o
 * sea una microtask) ya mostró su propio toast de error genérico —
 * siempre encima. Si se mostrara de forma síncrona acá, era al revés:
 * este aviso se mostraba primero y el catch del llamador lo tapaba
 * enseguida con su mensaje genérico, así que el usuario terminaba viendo
 * "Error al ..." y de repente lo mandaban a login sin ninguna explicación.
 */
function handleSessionExpired() {
    const currentHash = window.location.hash;
    if (currentHash === '#/login' || currentHash === '#/register') return;
    setTimeout(() => {
        showToast(t('errors.session_expired_toast'), 'warning');
    }, 0);
    setTimeout(() => {
        window.location.hash = '#/login';
        window.location.reload();
    }, 1500);
}

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Content-Type': 'application/json', 'X-Locale': getLocale(), ...options.headers },
            credentials: 'include',
            ...options
        });

        const data = await response.json();

        if (response.status === 401) {
            handleSessionExpired();
            throw new Error(data.message || t('errors.session_expired'));
        }

        if (!response.ok) throw new Error(data.message || t('errors.generic'));
        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * `method` por defecto POST (el caso más común: crear con archivo). Para
 * un PUT con FormData (reemplazar un archivo existente) se pasa
 * `{ method: 'PUT' }` — así coursesAPI.update, contentsAPI.update y
 * usersAPI.uploadAvatar dejan de hand-rollear cada una su propio fetch +
 * chequeo de 401 (contentsAPI.update era la única que ni siquiera lo
 * tenía).
 */
async function apiRequestFormData(endpoint, formData, { method = 'POST' } = {}) {
    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers: { 'X-Locale': getLocale() },
            body: formData,
            credentials: 'include'
        });

        const data = await response.json();

        if (response.status === 401) {
            handleSessionExpired();
            throw new Error(data.message || t('errors.session_expired'));
        }

        if (!response.ok) throw new Error(data.message || t('errors.generic'));
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
    checkAuth: async () => apiRequest('/auth/check'),
    forgotPassword: async (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
    resetPassword: async (token, password) => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) })
};

// =================================
// Courses API
// =================================

const coursesAPI = {
    getAll: async ({ page = 1, limit = 12, search = '', scope } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set('search', search);
        if (scope) params.set('scope', scope);
        return apiRequest(`/courses?${params}`);
    },
    getById: async (id) => apiRequest(`/courses/${id}`),
    getEnrolled: async ({ page = 1, limit = 12 } = {}) => apiRequest(`/courses/enrolled?${new URLSearchParams({ page, limit })}`),
    create: async (formData) => apiRequestFormData('/courses', formData),
    update: async (id, formData) => apiRequestFormData(`/courses/${id}`, formData, { method: 'PUT' }),
    enroll: async (id) => apiRequest(`/courses/${id}/enroll`, { method: 'POST' }),
    unenroll: async (id) => apiRequest(`/courses/${id}/enroll`, { method: 'DELETE' }),
    getGlobalStats: async () => apiRequest('/courses/stats/summary'),
    downloadCertificate: async (id) => { window.open(`${API_URL}/courses/${id}/certificate`, '_blank'); },
    getStudents: async (id, { page = 1, limit = 20 } = {}) => apiRequest(`/courses/${id}/students?${new URLSearchParams({ page, limit })}`),
    downloadGrades: async (id) => { window.open(`${API_URL}/courses/${id}/grades/export`, '_blank'); },
    downloadStudentGrades: async (id, studentId) => { window.open(`${API_URL}/courses/${id}/students/${studentId}/grades/export`, '_blank'); },
    getTeachers: async (id) => apiRequest(`/courses/${id}/teachers`),
    getTeaching: async () => apiRequest('/courses/teaching')
};

// =================================
// Course Modules API (módulos con cursos anidados dentro de un curso)
// =================================

const courseModulesAPI = {
    getByCourse: async (courseId) => apiRequest(`/courses/${courseId}/modules`),
    create: async (courseId, title) => apiRequest(`/courses/${courseId}/modules`, { method: 'POST', body: JSON.stringify({ title }) }),
    update: async (moduleId, data) => apiRequest(`/course-modules/${moduleId}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: async (moduleId) => apiRequest(`/course-modules/${moduleId}`, { method: 'DELETE' }),
    createCourse: async (moduleId, formData) => apiRequestFormData(`/course-modules/${moduleId}/courses`, formData),
    removeCourse: async (moduleId, childId) => apiRequest(`/course-modules/${moduleId}/courses/${childId}`, { method: 'DELETE' })
};

// =================================
// Contents API
// =================================

const contentsAPI = {
    getByCourse: async (courseId) => apiRequest(`/contents/course/${courseId}`),
    getById: async (id) => apiRequest(`/contents/${id}`),
    createVideo: async (formData) => apiRequestFormData('/contents/video', formData),
    createFile: async (formData) => apiRequestFormData('/contents/file', formData),
    createImage: async (formData) => apiRequestFormData('/contents/image', formData),
    createText: async (data) => apiRequest('/contents/text', { method: 'POST', body: JSON.stringify(data) }),
    createUrl: async (data) => apiRequest('/contents/url', { method: 'POST', body: JSON.stringify(data) }),
    createTask: async (formData) => apiRequestFormData('/contents/task', formData),
    createQuiz: async (data) => apiRequest('/contents/quiz', { method: 'POST', body: JSON.stringify(data) }),
    createSurvey: async (data) => apiRequest('/contents/survey', { method: 'POST', body: JSON.stringify(data) }),
    getQuestions: async (id) => apiRequest(`/contents/${id}/questions`),
    getQuestionsForManage: async (id) => apiRequest(`/contents/${id}/questions/manage`),
    updateQuestions: async (id, data) => apiRequest(`/contents/${id}/questions`, { method: 'PUT', body: JSON.stringify(data) }),
    submitAnswers: async (id, data) => apiRequest(`/contents/${id}/answers`, { method: 'POST', body: JSON.stringify(data) }),
    getResults: async (id) => apiRequest(`/contents/${id}/results`),
    gradeAnswer: async (answerId, data) => apiRequest(`/contents/answers/${answerId}/grade`, { method: 'PUT', body: JSON.stringify(data) }),
    createForum: async (data) => apiRequest('/contents/forum', { method: 'POST', body: JSON.stringify(data) }),
    createFolder: async (data) => apiRequest('/contents/folder', { method: 'POST', body: JSON.stringify(data) }),
    getForumThread: async (id) => apiRequest(`/contents/${id}/forum`),
    postForumReply: async (id, data) => apiRequest(`/contents/${id}/forum`, { method: 'POST', body: JSON.stringify(data) }),
    submit: async (id, formData) => apiRequestFormData(`/contents/${id}/submit`, formData),
    getSubmissions: async (id, { page = 1, limit = 20 } = {}) => apiRequest(`/contents/${id}/submissions?${new URLSearchParams({ page, limit })}`),
    // `data` es un FormData cuando se reemplaza el archivo (video/imagen/
    // archivo/tarea) — ahí el body va tal cual, sin Content-Type manual
    // (el navegador le pone el boundary correcto). Si es un objeto plano
    // (solo título/descripción/url, sin archivo nuevo), se manda como JSON:
    // la ruta PUT /:id no corre multer para texto/url/foro/carpeta/
    // cuestionario/encuesta, así que un FormData ahí llegaría con
    // req.body vacío.
    update: async (id, data) => {
        const isFormData = data instanceof FormData;
        // Delega en los dos helpers compartidos (antes hacía su propio
        // fetch a mano y era el único de los tres que no revisaba 401 —
        // una sesión expirada a mitad de una edición daba un error crudo
        // en vez del aviso + redirección que sí tienen coursesAPI.update
        // y usersAPI.uploadAvatar).
        return isFormData
            ? apiRequestFormData(`/contents/${id}`, data, { method: 'PUT' })
            : apiRequest(`/contents/${id}`, { method: 'PUT', body: JSON.stringify(data) });
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
    setAdminAccess: async (id, adminAccess) => apiRequest(`/users/${id}/admin-access`, { method: 'PUT', body: JSON.stringify({ admin_access: adminAccess }) }),
    getStats: async () => apiRequest('/users/stats/count'),
    getByRole: async (role) => apiRequest(`/users/by-role/${role}`),
    uploadAvatar: async (formData) => apiRequestFormData('/users/me/avatar', formData, { method: 'PUT' }),
    removeAvatar: async () => apiRequest('/users/me/avatar', { method: 'DELETE' }),
    bulkImport: async (formData) => apiRequestFormData('/users/bulk-import', formData)
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

// =================================
// Settings API (apariencia del sitio: fondos e texto del catálogo)
// =================================

const settingsAPI = {
    getAll: async () => apiRequest('/settings'),
    update: async (formData) => apiRequestFormData('/settings', formData, { method: 'PUT' })
};

window.authAPI = authAPI;
window.coursesAPI = coursesAPI;
window.courseModulesAPI = courseModulesAPI;
window.contentsAPI = contentsAPI;
window.usersAPI = usersAPI;
window.forumPostsAPI = forumPostsAPI;
window.submissionsAPI = submissionsAPI;
window.settingsAPI = settingsAPI;