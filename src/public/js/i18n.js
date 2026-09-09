/**
 * i18n (es/en) — diccionarios + t()/setLocale(), sin bundler: script
 * clásico igual que el resto de la app, todo expuesto en window.
 *
 * Cobertura actual: navbar/footer (data-i18n en index.html), utils.js
 * (helpers compartidos), catálogo público (views_home.js) y las 4 páginas
 * de auth (views_auth.js) — el resto de las vistas todavía tiene español
 * fijo y se va migrando vista por vista en sesiones futuras, reusando este
 * mismo mecanismo. Portugués no está traducido todavía, pero agregar un
 * tercer diccionario acá es lo único que haría falta.
 */

const SUPPORTED_LOCALES = ['es', 'en'];
const DEFAULT_LOCALE = 'es';

const TRANSLATIONS = {
    es: {
        common: {
            loading: 'Cargando...',
            confirm: 'Confirmar',
            cancel: 'Cancelar',
            copied: 'Copiado al portapapeles',
            showing_range: 'Mostrando {{start}}–{{end}} de {{total}}',
            show_password: 'Mostrar contraseña',
            hide_password: 'Ocultar contraseña'
        },
        nav: {
            home: 'Inicio',
            my_courses: 'Mis Cursos',
            admin: 'Administración',
            teacher_courses: 'Mis Cursos (Profesor)',
            login: 'Iniciar sesión',
            register: 'Regístrate',
            profile: 'Mi Perfil',
            logout: 'Cerrar Sesión',
            font_size: 'Tamaño de letra',
            decrease_font: 'Reducir tamaño de letra',
            increase_font: 'Aumentar tamaño de letra',
            toggle_dark_mode: 'Cambiar modo oscuro/claro',
            switch_to_light: 'Cambiar a modo claro',
            switch_to_dark: 'Cambiar a modo oscuro',
            language: 'Idioma'
        },
        footer: {
            copyright: '© 2026 LANBA - Centro Nacional de Alta Tecnología (CeNAT)',
            developed_by: 'Desarrollado por Mauricio Hidalgo Garzón - TCU UFIDE'
        },
        errors: {
            generic: 'Error en la petición',
            session_expired: 'Sesión expirada',
            session_expired_toast: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
            passwords_dont_match: 'Las contraseñas no coinciden',
            login_failed: 'Error al iniciar sesión',
            register_failed: 'Error al registrar usuario',
            logout_failed: 'Error al cerrar sesión',
            forgot_password_failed: 'Error al procesar la solicitud',
            reset_password_failed: 'El enlace es inválido o ya expiró',
            load_courses_failed: 'Error al cargar los cursos',
            no_permission: 'No tienes permisos para acceder a esta sección',
            file_too_large: '{{label}} supera el máximo permitido ({{size}})',
            copy_failed: 'Error al copiar',
            app_init_failed: 'Error al inicializar la aplicación',
            password_too_short: 'La contraseña debe tener al menos 6 caracteres'
        },
        auth: {
            login: {
                title: 'Bienvenido a LMS LANBA - CeNAT',
                subtitle: 'Inicia sesión para acceder a tus cursos',
                identifier_label: 'Correo o nombre de usuario',
                identifier_placeholder: 'tu@email.com o tu usuario',
                password_label: 'Contraseña',
                forgot_password: '¿Olvidaste tu contraseña?',
                submit: 'Iniciar Sesión',
                submitting: 'Ingresando...',
                success: 'Inicio de sesión exitoso',
                no_account: '¿No tienes una cuenta?',
                register_link: 'Regístrate aquí',
                or_separator: 'o',
                guest_button: 'Acceder como invitado',
                guest_hint: 'Como invitado solo podés explorar el catálogo de cursos'
            },
            register: {
                title: 'Crear Cuenta',
                subtitle: 'Únete a la comunidad educativa de LANBA - CeNAT',
                name_label: 'Nombre Completo',
                name_placeholder: 'Juan Pérez',
                email_label: 'Correo Electrónico',
                email_placeholder: 'tu@email.com',
                username_label: 'Nombre de usuario (opcional)',
                username_placeholder: 'Para iniciar sesión sin tu correo',
                password_label: 'Contraseña',
                password_hint: 'Mínimo 6 caracteres',
                password_confirm_label: 'Confirmar contraseña',
                submit: 'Registrarse',
                submitting: 'Registrando...',
                has_account: '¿Ya tienes una cuenta?',
                login_link: 'Inicia sesión aquí',
                fields_required: 'Todos los campos son requeridos',
                invalid_email: 'Email inválido'
            },
            forgotPassword: {
                title: 'Recuperar contraseña',
                subtitle: 'Escribe tu correo y te enviaremos un enlace para restablecerla',
                email_label: 'Correo Electrónico',
                email_placeholder: 'tu@email.com',
                submit: 'Enviar enlace de recuperación',
                submitting: 'Enviando...',
                back_to_login: 'Volver a iniciar sesión'
            },
            resetPassword: {
                title: 'Nueva contraseña',
                subtitle: 'Elige una nueva contraseña para tu cuenta',
                password_label: 'Nueva contraseña',
                password_hint: 'Mínimo 6 caracteres',
                password_confirm_label: 'Confirmar contraseña',
                submit: 'Restablecer contraseña',
                submitting: 'Guardando...'
            }
        },
        home: {
            title_default: 'Cursos del LANBA - CeNAT',
            subtitle_default: 'Explora nuestros cursos educativos y fortalece tus conocimientos en biotecnología ambiental y ciencia abierta.',
            available_courses: 'Cursos disponibles',
            search_placeholder: 'Buscar curso...',
            retry: 'Reintentar',
            no_description: 'Sin descripción disponible',
            contents_count: '{{count}} contenidos',
            enrolled_count: '{{count}} inscritos',
            empty_search_title: 'No se encontraron cursos',
            empty_search_subtitle: 'Intenta con otro término de búsqueda',
            empty_title: 'No hay cursos disponibles aún',
            empty_subtitle: 'Vuelve pronto para ver nuevos contenidos'
        },
        myCourses: {
            title: 'Mis Cursos',
            subtitle: 'Aquí están todos los cursos en los que estás inscrito',
            empty_title: 'Aún no estás inscrito en ningún curso',
            empty_subtitle: 'Explora el catálogo y comienza a aprender',
            explore_courses: 'Explorar cursos',
            progress_label: 'Progreso',
            enrolled_on: 'Inscrito el {{date}}',
            load_failed: 'Error al cargar tus cursos'
        },
        forum: {
            load_failed_fallback: 'No se pudo cargar el foro',
            back_to_home: 'Volver al inicio',
            back_to_course: 'Volver al curso',
            topic_label: 'Tema de foro',
            reply_placeholder: 'Escribe una respuesta...',
            reply_button: 'Responder',
            reply_singular: '{{count}} respuesta',
            reply_plural: '{{count}} respuestas',
            empty_replies: 'Todavía no hay respuestas. ¡Sé el primero en participar!',
            role_teacher: 'Profesor',
            role_admin: 'Admin',
            edited_suffix: '(editado)',
            edit_title: 'Editar',
            delete_title: 'Borrar',
            reply_placeholder_short: 'Escribe tu respuesta...',
            cancel: 'Cancelar',
            save: 'Guardar',
            reply_updated: 'Respuesta actualizada',
            edit_failed: 'Error al editar la respuesta',
            body_required: 'Escribe una respuesta antes de enviar',
            reply_published: 'Respuesta publicada',
            publish_failed: 'Error al publicar la respuesta',
            delete_confirm: '¿Estás seguro de borrar esta respuesta? Esta acción no se puede deshacer.',
            reply_deleted: 'Respuesta eliminada',
            delete_failed: 'Error al borrar la respuesta'
        },
        quiz: {
            back_to_course: 'Volver al curso',
            submit_quiz: 'Enviar cuestionario',
            submit_survey: 'Enviar encuesta',
            submit_once_notice: 'Solo puedes responder una vez — revisa tus respuestas antes de enviar.',
            load_failed: 'Error al cargar el cuestionario',
            back_to_home: 'Volver al inicio',
            point_singular: '{{count}} punto',
            point_plural: '{{count}} puntos',
            answer_placeholder: 'Escribe tu respuesta...',
            all_questions_required: 'Debes responder todas las preguntas',
            sending: 'Enviando...',
            submitted_score: 'Enviado — {{score}}/{{max}} puntos',
            pending_review_singular: ' ({{count}} pendiente de revisión)',
            pending_review_plural: ' ({{count}} pendientes de revisión)',
            survey_thanks: '¡Gracias por responder la encuesta!',
            submit_failed: 'Error al enviar las respuestas',
            results_back: 'Volver',
            results_title: 'Resultados',
            results_load_failed: 'Error al cargar los resultados',
            no_questions_quiz: 'Este cuestionario todavía no tiene preguntas',
            no_questions_survey: 'Esta encuesta todavía no tiene preguntas',
            no_answers_yet: 'Nadie ha respondido esta pregunta todavía',
            correct_incorrect_percent: '{{correct}} correctas, {{incorrect}} incorrectas ({{percent}}%)',
            status_pending: 'Pendiente',
            status_correct: 'Correcta',
            status_incorrect: 'Incorrecta',
            grade_success: 'Respuesta calificada exitosamente',
            grade_failed: 'Error al calificar la respuesta',
            respondents_singular: '{{count}} respuesta',
            respondents_plural: '{{count}} respuestas'
        },
        courseDetail: {
            not_found: 'Curso no encontrado',
            back_to_home: 'Volver al inicio',
            back_to_catalog: 'Volver al catálogo',
            your_progress: 'Tu progreso',
            videos_of_course: 'Videos del curso',
            video_not_supported: 'Tu navegador no soporta la reproducción de video.',
            enroll_to_watch: 'Inscríbete en este curso para ver los videos',
            videos_grouped_notice: 'Los videos de este curso están agrupados en una carpeta — bajá hasta "Contenido" para verlos y elegir cuál reproducir.',
            no_videos_yet: 'Este curso aún no tiene videos disponibles',
            content_heading: 'Contenido',
            course_info_heading: 'Información del curso',
            info_videos: 'videos',
            info_files: 'archivos',
            info_images: 'imágenes',
            info_external_videos: 'videos externos',
            info_readings: 'lecturas',
            info_tasks: 'tareas',
            info_quizzes: 'cuestionarios',
            info_surveys: 'encuestas',
            info_forums: 'foros',
            info_folders: 'carpetas',
            download_certificate: 'Descargar certificado',
            mark_as_pending: 'Marcar como pendiente',
            mark_as_completed: 'Marcar como completado',
            enroll_to_download: 'Inscríbete para descargar',
            enroll_to_watch_short: 'Inscríbete para ver',
            open_external_video: 'Abrir video externo',
            video_cannot_embed: 'Este video no se puede reproducir aquí — usá el botón de arriba para verlo directamente en YouTube.',
            enroll_to_view_reading: 'Inscríbete en este curso para ver esta lectura',
            enroll_to_view_image: 'Inscríbete en este curso para ver esta imagen',
            enroll_to_join_forum: 'Inscríbete en este curso para participar en este foro',
            already_participated_forum: 'Ya participaste en este foro',
            participate_in_forum: 'Participar en el foro',
            enroll_to_view_folder: 'Inscríbete en este curso para ver el contenido de esta carpeta',
            item_singular: '{{count}} elemento',
            item_plural: '{{count}} elementos',
            folder_empty: 'Esta carpeta todavía no tiene contenido',
            folder_completed: 'Completada',
            folder_progress_singular: '{{completed}}/{{total}} completado',
            folder_progress_plural: '{{completed}}/{{total}} completados',
            enroll_to_view_submit_task: 'Inscríbete en este curso para ver y entregar esta tarea',
            download_instructions: 'Descargar instrucciones',
            submission_reviewed: 'Entrega revisada',
            submission_pending_review: 'Entregado — pendiente de revisión',
            submitted_on: 'Entregado el {{date}}',
            grade_prefix: 'Calificación:',
            teacher_comment_prefix: 'Comentario del profesor:',
            submit_button: 'Entregar',
            submit_once_notice: 'Solo puedes entregar una vez — revisa el archivo antes de subirlo.',
            select_file_required: 'Selecciona un archivo para entregar',
            task_submitted_success: 'Tarea entregada exitosamente',
            submit_task_failed: 'Error al entregar la tarea',
            mark_completed_success: 'Contenido marcado como completado',
            mark_pending_success: 'Contenido marcado como pendiente',
            update_progress_failed: 'Error al actualizar el progreso',
            enroll_to_answer_quiz: 'Inscríbete en este curso para responder este cuestionario',
            enroll_to_answer_survey: 'Inscríbete en este curso para responder esta encuesta',
            already_answered_quiz: 'Ya respondiste este cuestionario',
            survey_thanks: '¡Gracias por responder esta encuesta!',
            score_points: '{{score}}/{{max}} puntos',
            pending_review_singular: ' — {{count}} pendiente de revisión',
            pending_review_plural: ' — {{count}} pendientes de revisión',
            answer_quiz_button: 'Responder cuestionario',
            answer_survey_button: 'Responder encuesta',
            answer_once_notice: 'Solo puedes responder una vez.',
            module_label: 'Módulo:',
            module_empty: 'Este módulo todavía no tiene cursos.',
            login_to_enroll: 'Inicia sesión para inscribirte',
            enrolled_label: 'Inscrito',
            enrolled_via: 'Inscrito vía «{{title}}»',
            enroll_button: 'Inscribirme',
            enroll_in_button: 'Inscribirme en «{{title}}»',
            enroll_success: 'Te has inscrito exitosamente',
            enroll_failed: 'Error al inscribirse',
            unenroll_confirm: '¿Estás seguro de que deseas desinscribirte de este curso?',
            unenroll_success: 'Te has desinscrito del curso',
            unenroll_failed: 'Error al desinscribirse',
            login_required_download: 'Debes iniciar sesión para descargar archivos',
            download_certificate_failed: 'Error al descargar el certificado',
            completion_title: '¡Curso completado!',
            completion_message: 'Felicidades, has completado todos los contenidos de este curso. ¡Excelente trabajo!',
            completion_badge: '100% Completado',
            completion_understood: '¡Entendido!',
            completion_see_more: 'Ver más cursos',
            load_failed: 'Error al cargar el curso'
        }
    },
    en: {
        common: {
            loading: 'Loading...',
            confirm: 'Confirm',
            cancel: 'Cancel',
            copied: 'Copied to clipboard',
            showing_range: 'Showing {{start}}–{{end}} of {{total}}',
            show_password: 'Show password',
            hide_password: 'Hide password'
        },
        nav: {
            home: 'Home',
            my_courses: 'My Courses',
            admin: 'Administration',
            teacher_courses: 'My Courses (Teacher)',
            login: 'Log in',
            register: 'Sign up',
            profile: 'My Profile',
            logout: 'Log Out',
            font_size: 'Text size',
            decrease_font: 'Decrease text size',
            increase_font: 'Increase text size',
            toggle_dark_mode: 'Toggle dark/light mode',
            switch_to_light: 'Switch to light mode',
            switch_to_dark: 'Switch to dark mode',
            language: 'Language'
        },
        footer: {
            copyright: '© 2026 LANBA - Centro Nacional de Alta Tecnología (CeNAT)',
            developed_by: 'Developed by Mauricio Hidalgo Garzón - TCU UFIDE'
        },
        errors: {
            generic: 'Request error',
            session_expired: 'Session expired',
            session_expired_toast: 'Your session has expired. Please log in again.',
            passwords_dont_match: 'Passwords do not match',
            login_failed: 'Error logging in',
            register_failed: 'Error registering user',
            logout_failed: 'Error logging out',
            forgot_password_failed: 'Error processing the request',
            reset_password_failed: 'The link is invalid or has expired',
            load_courses_failed: 'Error loading courses',
            no_permission: 'You do not have permission to access this section',
            file_too_large: '{{label}} exceeds the maximum allowed size ({{size}})',
            copy_failed: 'Error copying',
            app_init_failed: 'Error initializing the application',
            password_too_short: 'Password must be at least 6 characters'
        },
        auth: {
            login: {
                title: 'Welcome to LMS LANBA - CeNAT',
                subtitle: 'Log in to access your courses',
                identifier_label: 'Email or username',
                identifier_placeholder: 'you@email.com or your username',
                password_label: 'Password',
                forgot_password: 'Forgot your password?',
                submit: 'Log In',
                submitting: 'Logging in...',
                success: 'Login successful',
                no_account: "Don't have an account?",
                register_link: 'Sign up here',
                or_separator: 'or',
                guest_button: 'Continue as guest',
                guest_hint: 'As a guest you can only browse the course catalog'
            },
            register: {
                title: 'Create Account',
                subtitle: 'Join the LANBA - CeNAT learning community',
                name_label: 'Full Name',
                name_placeholder: 'John Smith',
                email_label: 'Email',
                email_placeholder: 'you@email.com',
                username_label: 'Username (optional)',
                username_placeholder: 'To log in without your email',
                password_label: 'Password',
                password_hint: 'At least 6 characters',
                password_confirm_label: 'Confirm password',
                submit: 'Sign Up',
                submitting: 'Signing up...',
                has_account: 'Already have an account?',
                login_link: 'Log in here',
                fields_required: 'All fields are required',
                invalid_email: 'Invalid email'
            },
            forgotPassword: {
                title: 'Recover password',
                subtitle: "Enter your email and we'll send you a link to reset it",
                email_label: 'Email',
                email_placeholder: 'you@email.com',
                submit: 'Send recovery link',
                submitting: 'Sending...',
                back_to_login: 'Back to login'
            },
            resetPassword: {
                title: 'New password',
                subtitle: 'Choose a new password for your account',
                password_label: 'New password',
                password_hint: 'At least 6 characters',
                password_confirm_label: 'Confirm password',
                submit: 'Reset password',
                submitting: 'Saving...'
            }
        },
        home: {
            title_default: 'LANBA - CeNAT Courses',
            subtitle_default: 'Explore our educational courses and strengthen your knowledge in environmental biotechnology and open science.',
            available_courses: 'Available courses',
            search_placeholder: 'Search course...',
            retry: 'Retry',
            no_description: 'No description available',
            contents_count: '{{count}} contents',
            enrolled_count: '{{count}} enrolled',
            empty_search_title: 'No courses found',
            empty_search_subtitle: 'Try a different search term',
            empty_title: 'No courses available yet',
            empty_subtitle: 'Check back soon for new content'
        },
        myCourses: {
            title: 'My Courses',
            subtitle: 'Here are all the courses you are enrolled in',
            empty_title: "You're not enrolled in any course yet",
            empty_subtitle: 'Explore the catalog and start learning',
            explore_courses: 'Explore courses',
            progress_label: 'Progress',
            enrolled_on: 'Enrolled on {{date}}',
            load_failed: 'Error loading your courses'
        },
        forum: {
            load_failed_fallback: 'Could not load the forum',
            back_to_home: 'Back to home',
            back_to_course: 'Back to course',
            topic_label: 'Forum topic',
            reply_placeholder: 'Write a reply...',
            reply_button: 'Reply',
            reply_singular: '{{count}} reply',
            reply_plural: '{{count}} replies',
            empty_replies: 'No replies yet. Be the first to join in!',
            role_teacher: 'Teacher',
            role_admin: 'Admin',
            edited_suffix: '(edited)',
            edit_title: 'Edit',
            delete_title: 'Delete',
            reply_placeholder_short: 'Write your reply...',
            cancel: 'Cancel',
            save: 'Save',
            reply_updated: 'Reply updated',
            edit_failed: 'Error editing the reply',
            body_required: 'Write a reply before sending',
            reply_published: 'Reply posted',
            publish_failed: 'Error posting the reply',
            delete_confirm: 'Are you sure you want to delete this reply? This action cannot be undone.',
            reply_deleted: 'Reply deleted',
            delete_failed: 'Error deleting the reply'
        },
        quiz: {
            back_to_course: 'Back to course',
            submit_quiz: 'Submit quiz',
            submit_survey: 'Submit survey',
            submit_once_notice: 'You can only answer once — review your answers before submitting.',
            load_failed: 'Error loading the quiz',
            back_to_home: 'Back to home',
            point_singular: '{{count}} point',
            point_plural: '{{count}} points',
            answer_placeholder: 'Write your answer...',
            all_questions_required: 'You must answer all the questions',
            sending: 'Sending...',
            submitted_score: 'Submitted — {{score}}/{{max}} points',
            pending_review_singular: ' ({{count}} pending review)',
            pending_review_plural: ' ({{count}} pending review)',
            survey_thanks: 'Thanks for completing the survey!',
            submit_failed: 'Error submitting the answers',
            results_back: 'Back',
            results_title: 'Results',
            results_load_failed: 'Error loading the results',
            no_questions_quiz: "This quiz doesn't have any questions yet",
            no_questions_survey: "This survey doesn't have any questions yet",
            no_answers_yet: 'No one has answered this question yet',
            correct_incorrect_percent: '{{correct}} correct, {{incorrect}} incorrect ({{percent}}%)',
            status_pending: 'Pending',
            status_correct: 'Correct',
            status_incorrect: 'Incorrect',
            grade_success: 'Answer graded successfully',
            grade_failed: 'Error grading the answer',
            respondents_singular: '{{count}} response',
            respondents_plural: '{{count}} responses'
        },
        courseDetail: {
            not_found: 'Course not found',
            back_to_home: 'Back to home',
            back_to_catalog: 'Back to catalog',
            your_progress: 'Your progress',
            videos_of_course: 'Course videos',
            video_not_supported: 'Your browser does not support video playback.',
            enroll_to_watch: 'Enroll in this course to watch the videos',
            videos_grouped_notice: 'This course\'s videos are grouped in a folder — scroll down to "Content" to watch them and choose which one to play.',
            no_videos_yet: "This course doesn't have any videos yet",
            content_heading: 'Content',
            course_info_heading: 'Course information',
            info_videos: 'videos',
            info_files: 'files',
            info_images: 'images',
            info_external_videos: 'external videos',
            info_readings: 'readings',
            info_tasks: 'tasks',
            info_quizzes: 'quizzes',
            info_surveys: 'surveys',
            info_forums: 'forums',
            info_folders: 'folders',
            download_certificate: 'Download certificate',
            mark_as_pending: 'Mark as pending',
            mark_as_completed: 'Mark as completed',
            enroll_to_download: 'Enroll to download',
            enroll_to_watch_short: 'Enroll to watch',
            open_external_video: 'Open external video',
            video_cannot_embed: "This video can't be played here — use the button above to watch it directly on YouTube.",
            enroll_to_view_reading: 'Enroll in this course to view this reading',
            enroll_to_view_image: 'Enroll in this course to view this image',
            enroll_to_join_forum: 'Enroll in this course to join this forum',
            already_participated_forum: 'You already participated in this forum',
            participate_in_forum: 'Join the forum',
            enroll_to_view_folder: "Enroll in this course to view this folder's content",
            item_singular: '{{count}} item',
            item_plural: '{{count}} items',
            folder_empty: "This folder doesn't have any content yet",
            folder_completed: 'Completed',
            folder_progress_singular: '{{completed}}/{{total}} completed',
            folder_progress_plural: '{{completed}}/{{total}} completed',
            enroll_to_view_submit_task: 'Enroll in this course to view and submit this task',
            download_instructions: 'Download instructions',
            submission_reviewed: 'Submission reviewed',
            submission_pending_review: 'Submitted — pending review',
            submitted_on: 'Submitted on {{date}}',
            grade_prefix: 'Grade:',
            teacher_comment_prefix: "Teacher's comment:",
            submit_button: 'Submit',
            submit_once_notice: 'You can only submit once — review the file before uploading it.',
            select_file_required: 'Select a file to submit',
            task_submitted_success: 'Task submitted successfully',
            submit_task_failed: 'Error submitting the task',
            mark_completed_success: 'Content marked as completed',
            mark_pending_success: 'Content marked as pending',
            update_progress_failed: 'Error updating progress',
            enroll_to_answer_quiz: 'Enroll in this course to answer this quiz',
            enroll_to_answer_survey: 'Enroll in this course to answer this survey',
            already_answered_quiz: 'You already answered this quiz',
            survey_thanks: 'Thanks for completing this survey!',
            score_points: '{{score}}/{{max}} points',
            pending_review_singular: ' — {{count}} pending review',
            pending_review_plural: ' — {{count}} pending review',
            answer_quiz_button: 'Answer quiz',
            answer_survey_button: 'Answer survey',
            answer_once_notice: 'You can only answer once.',
            module_label: 'Module:',
            module_empty: "This module doesn't have any courses yet.",
            login_to_enroll: 'Log in to enroll',
            enrolled_label: 'Enrolled',
            enrolled_via: 'Enrolled via «{{title}}»',
            enroll_button: 'Enroll',
            enroll_in_button: 'Enroll in «{{title}}»',
            enroll_success: 'You have successfully enrolled',
            enroll_failed: 'Error enrolling',
            unenroll_confirm: 'Are you sure you want to unenroll from this course?',
            unenroll_success: 'You have unenrolled from the course',
            unenroll_failed: 'Error unenrolling',
            login_required_download: 'You must log in to download files',
            download_certificate_failed: 'Error downloading the certificate',
            completion_title: 'Course completed!',
            completion_message: "Congratulations, you've completed all the content in this course. Excellent work!",
            completion_badge: '100% Completed',
            completion_understood: 'Got it!',
            completion_see_more: 'See more courses',
            load_failed: 'Error loading the course'
        }
    }
};

function detectInitialLocale() {
    try {
        const saved = localStorage.getItem('locale');
        if (SUPPORTED_LOCALES.includes(saved)) return saved;
    } catch (error) { /* localStorage puede fallar (modo privado, etc.) */ }

    const browserLang = String(navigator.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED_LOCALES.includes(browserLang)) return browserLang;

    return DEFAULT_LOCALE;
}

let currentLocale = detectInitialLocale();

function getLocale() {
    return currentLocale;
}

function resolveKey(dict, key) {
    return key.split('.').reduce((obj, part) => (obj && typeof obj === 'object') ? obj[part] : undefined, dict);
}

/**
 * Nunca revienta ni devuelve "undefined" visible: si falta en el locale
 * actual cae al español, si falta en los dos devuelve la propia key (señal
 * clara, en desarrollo, de que falta agregarla al diccionario).
 */
function t(key, vars) {
    let value = resolveKey(TRANSLATIONS[currentLocale], key);
    if (value === undefined) value = resolveKey(TRANSLATIONS[DEFAULT_LOCALE], key);
    if (value === undefined) return key;

    if (vars) {
        Object.keys(vars).forEach((varKey) => {
            value = value.replace(new RegExp(`{{${varKey}}}`, 'g'), vars[varKey]);
        });
    }
    return value;
}

/**
 * Para el HTML estático (navbar/footer en index.html) que no pasa por un
 * template de JS — cada elemento marcado con data-i18n(-placeholder/-title/
 * -aria-label) se actualiza in-place, sin tocar su estructura ni perder
 * los listeners ya enganchados (auth.js hace toggles de display sobre
 * estos mismos elementos, por id).
 */
function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
        el.title = t(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((el) => {
        el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label')));
    });
}

/**
 * Recorre la ruta actual otra vez para que las vistas ya traducidas (las
 * que llaman a t() en su propio render) se vuelvan a pintar en el idioma
 * nuevo — no depende de cambiar el hash, handleRoute() ya soporta
 * llamarse de nuevo directamente (ver router.js).
 */
/**
 * Hay dos <select> de idioma (uno para desktop, uno para el menú mobile,
 * ver index.html) — deben quedar sincronizados entre sí sin importar cuál
 * disparó el cambio.
 */
function syncLanguageSelects() {
    document.querySelectorAll('#language-select, #language-select-mobile').forEach((el) => {
        el.value = currentLocale;
    });
}

function setLocale(locale) {
    if (!SUPPORTED_LOCALES.includes(locale)) return;

    currentLocale = locale;
    try { localStorage.setItem('locale', locale); } catch (error) { /* ok, queda solo para esta carga */ }
    document.documentElement.lang = locale;

    applyStaticTranslations();
    syncLanguageSelects();
    // El título del toggle de modo oscuro no es un data-i18n simple: su
    // texto depende del estado actual (claro/oscuro), lo arma
    // updateToggleUI en darkmode.js — hay que volver a llamarlo acá.
    if (typeof updateToggleUI === 'function') {
        updateToggleUI(document.documentElement.classList.contains('dark'));
    }
    if (typeof handleRoute === 'function') handleRoute();
}

// Aplicado ya en la carga de este script (no en DOMContentLoaded): para
// cuando este <script> se ejecuta, el <body> ya está parseado (va después
// de utils.js, cerca del final del documento), así que el navbar/footer y
// el select de idioma ya existen en el DOM.
document.documentElement.lang = currentLocale;
applyStaticTranslations();
syncLanguageSelects();

window.t = t;
window.getLocale = getLocale;
window.setLocale = setLocale;
window.applyStaticTranslations = applyStaticTranslations;
window.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
