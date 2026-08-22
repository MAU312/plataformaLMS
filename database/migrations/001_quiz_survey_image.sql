-- Migración 001: agrega los tipos de contenido 'quiz', 'survey' e 'image',
-- y las tablas de preguntas/opciones/respuestas que usan cuestionario y
-- encuesta (comparten el mismo esquema; se distinguen por contents.type).

ALTER TABLE contents
  MODIFY COLUMN type ENUM('video','file','text','url','task','forum','folder','quiz','survey','image')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;

-- Un solo tipo de pregunta por cuestionario/encuesta completo. NULL para
-- cualquier otro tipo de contenido.
ALTER TABLE contents
  ADD COLUMN question_type ENUM('short_answer','multiple_choice','true_false')
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER type;

CREATE TABLE content_questions (
  id INT NOT NULL AUTO_INCREMENT,
  content_id INT NOT NULL,
  question_text TEXT COLLATE utf8mb4_unicode_ci NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_content (content_id),
  CONSTRAINT content_questions_ibfk_1 FOREIGN KEY (content_id) REFERENCES contents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- is_correct se ignora cuando el content padre es 'survey' (una encuesta no
-- tiene respuestas correctas). Verdadero/falso reutiliza esta misma tabla
-- con 2 filas ("Verdadero"/"Falso") en vez de una columna aparte.
CREATE TABLE content_question_options (
  id INT NOT NULL AUTO_INCREMENT,
  question_id INT NOT NULL,
  option_text VARCHAR(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  is_correct TINYINT(1) DEFAULT 0,
  order_index INT DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_question (question_id),
  CONSTRAINT content_question_options_ibfk_1 FOREIGN KEY (question_id) REFERENCES content_questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- content_id está denormalizado (además de question_id) para poder
-- responder "¿ya respondió este content?" sin JOIN a content_questions.
-- UNIQUE(question_id, user_id) es la red de seguridad ante un doble-submit
-- concurrente, igual que task_submissions.unique_submission — la regla de
-- "una sola entrega para todo el cuestionario" se aplica en el controlador.
CREATE TABLE content_answers (
  id INT NOT NULL AUTO_INCREMENT,
  content_id INT NOT NULL,
  question_id INT NOT NULL,
  user_id INT NOT NULL,
  option_id INT DEFAULT NULL,
  answer_text TEXT COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  is_correct TINYINT(1) DEFAULT NULL,
  graded_at TIMESTAMP NULL DEFAULT NULL,
  submitted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY unique_answer (question_id, user_id),
  KEY idx_content_user (content_id, user_id),
  CONSTRAINT content_answers_ibfk_1 FOREIGN KEY (content_id) REFERENCES contents (id) ON DELETE CASCADE,
  CONSTRAINT content_answers_ibfk_2 FOREIGN KEY (question_id) REFERENCES content_questions (id) ON DELETE CASCADE,
  CONSTRAINT content_answers_ibfk_3 FOREIGN KEY (option_id) REFERENCES content_question_options (id) ON DELETE SET NULL,
  CONSTRAINT content_answers_ibfk_4 FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
