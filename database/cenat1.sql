mysqldump: [Warning] Using a password on the command line interface can be insecure.
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: lms_cenat
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `content_answers`
--

DROP TABLE IF EXISTS `content_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_answers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content_id` int NOT NULL,
  `question_id` int NOT NULL,
  `user_id` int NOT NULL,
  `option_id` int DEFAULT NULL,
  `answer_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_correct` tinyint(1) DEFAULT NULL,
  `graded_at` timestamp NULL DEFAULT NULL,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_answer` (`question_id`,`user_id`),
  KEY `idx_content_user` (`content_id`,`user_id`),
  KEY `content_answers_ibfk_3` (`option_id`),
  KEY `content_answers_ibfk_4` (`user_id`),
  CONSTRAINT `content_answers_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_answers_ibfk_2` FOREIGN KEY (`question_id`) REFERENCES `content_questions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_answers_ibfk_3` FOREIGN KEY (`option_id`) REFERENCES `content_question_options` (`id`) ON DELETE SET NULL,
  CONSTRAINT `content_answers_ibfk_4` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_answers`
--

LOCK TABLES `content_answers` WRITE;
/*!40000 ALTER TABLE `content_answers` DISABLE KEYS */;
INSERT INTO `content_answers` VALUES (4,47,12,14,16,NULL,NULL,NULL,'2026-08-18 19:13:44');
/*!40000 ALTER TABLE `content_answers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_progress`
--

DROP TABLE IF EXISTS `content_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `content_id` int NOT NULL,
  `completed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_progress` (`user_id`,`content_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_content` (`content_id`),
  CONSTRAINT `content_progress_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `content_progress_ibfk_2` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=104 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_progress`
--

LOCK TABLES `content_progress` WRITE;
/*!40000 ALTER TABLE `content_progress` DISABLE KEYS */;
INSERT INTO `content_progress` VALUES (72,11,14,'2026-08-13 10:14:33'),(78,12,30,'2026-08-18 14:51:29'),(82,14,47,'2026-08-18 19:13:44'),(84,11,38,'2026-08-18 21:01:16');
/*!40000 ALTER TABLE `content_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_question_options`
--

DROP TABLE IF EXISTS `content_question_options`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_question_options` (
  `id` int NOT NULL AUTO_INCREMENT,
  `question_id` int NOT NULL,
  `option_text` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_correct` tinyint(1) DEFAULT '0',
  `order_index` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_question` (`question_id`),
  CONSTRAINT `content_question_options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `content_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_question_options`
--

LOCK TABLES `content_question_options` WRITE;
/*!40000 ALTER TABLE `content_question_options` DISABLE KEYS */;
INSERT INTO `content_question_options` VALUES (10,6,'Verdadero',1,0),(11,6,'Falso',0,1),(12,7,'Verdadero',1,0),(13,7,'Falso',0,1),(14,8,'Verdadero',0,0),(15,8,'Falso',1,1),(16,12,'bueno',0,0),(17,12,'malo',0,1),(33,19,'si',1,0),(34,19,'no',0,1),(35,19,'tal vez',0,2),(36,19,'no se',0,3),(37,20,'adios',0,0),(38,20,'bye',0,1),(39,20,'hello',1,2);
/*!40000 ALTER TABLE `content_question_options` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_questions`
--

DROP TABLE IF EXISTS `content_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_questions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content_id` int NOT NULL,
  `question_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `points` int NOT NULL DEFAULT '1',
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_content` (`content_id`),
  CONSTRAINT `content_questions_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_questions`
--

LOCK TABLES `content_questions` WRITE;
/*!40000 ALTER TABLE `content_questions` DISABLE KEYS */;
INSERT INTO `content_questions` VALUES (6,41,'hola',1,0,'2026-08-18 17:33:07'),(7,41,'adios',1,1,'2026-08-18 17:33:07'),(8,41,'pato',1,2,'2026-08-18 17:33:07'),(9,42,'como te llamas?',1,0,'2026-08-18 17:33:35'),(10,42,'que edad tienes?',1,1,'2026-08-18 17:33:35'),(11,42,'eres hombre?',1,2,'2026-08-18 17:33:35'),(12,47,'que tal te parecio el curso',1,0,'2026-08-18 19:13:07'),(19,40,'pregunta 1',1,0,'2026-08-28 10:51:21'),(20,40,'hola',1,1,'2026-08-28 10:51:21');
/*!40000 ALTER TABLE `content_questions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contents`
--

DROP TABLE IF EXISTS `contents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `folder_id` int DEFAULT NULL,
  `type` enum('video','file','text','url','task','forum','folder','quiz','survey','image') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` enum('short_answer','multiple_choice','true_false') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `weight_percent` decimal(5,2) DEFAULT NULL,
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL COMMENT 'Size in bytes',
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_course` (`course_id`),
  KEY `idx_type` (`type`),
  KEY `idx_order` (`order_index`),
  KEY `idx_folder` (`folder_id`),
  CONSTRAINT `contents_folder_fk` FOREIGN KEY (`folder_id`) REFERENCES `contents` (`id`),
  CONSTRAINT `contents_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contents`
--

LOCK TABLES `contents` WRITE;
/*!40000 ALTER TABLE `contents` DISABLE KEYS */;
INSERT INTO `contents` VALUES (11,4,NULL,'text',NULL,NULL,'dadsad','sdsadsa',NULL,NULL,1,'2026-08-13 10:06:59','2026-08-22 11:51:38'),(12,4,NULL,'url',NULL,NULL,'musica','video musical','https://www.youtube.com/watch?v=qz6_ETehLpQ',NULL,2,'2026-08-13 10:12:18','2026-08-22 11:51:38'),(13,4,NULL,'file',NULL,NULL,'dada','dada','/uploads/files/20260515-REGLAMENTO_POKEMON_CHAMPIONS_vf-1786615954650-547301046.pdf',169027,3,'2026-08-13 10:12:34','2026-08-13 10:12:34'),(14,4,NULL,'task',NULL,NULL,'tarea','tarea','/uploads/files/BIG-DATA-GUION-DE-EXPOSICIÃN-EXTENSO-Y-CODIGO-1786615978390-294165536.docx',33332,4,'2026-08-13 10:12:58','2026-08-22 11:51:38'),(15,4,NULL,'video',NULL,NULL,'dada','dada','/uploads/videos/no-joda-1786615995296-952925826.mp4',9064665,5,'2026-08-13 10:13:15','2026-08-13 10:13:15'),(17,4,NULL,'forum',NULL,NULL,'foro 1','primer foro',NULL,NULL,6,'2026-08-13 10:44:50','2026-08-28 10:03:44'),(24,1,NULL,'folder',NULL,NULL,'Unidad 1',NULL,NULL,NULL,2,'2026-08-18 07:48:08','2026-09-07 16:30:09'),(25,1,NULL,'folder',NULL,NULL,'Unidad 2',NULL,NULL,NULL,4,'2026-08-18 07:48:16','2026-09-07 16:30:00'),(26,1,NULL,'folder',NULL,NULL,'Unidad 3',NULL,NULL,NULL,5,'2026-08-18 07:48:27','2026-09-07 16:29:59'),(27,1,24,'video',NULL,NULL,'video 1','hola','/uploads/videos/YTDown.com_YouTube_Samsung-Galaxy-Z-Fold-8-I-Unboxing-_-Cam_Media_0mWy2Vr8YHo_001_1080p-1786748414866-771704190-1787039398024-788598740.mp4',344744669,1,'2026-08-18 07:50:04','2026-08-22 11:54:36'),(28,1,24,'text',NULL,NULL,'Bienvenidos al curso','etc etc etc etc etc etc ect ect',NULL,NULL,1,'2026-08-18 07:50:35','2026-09-07 16:30:26'),(29,1,24,'file',NULL,NULL,'guia de curso',NULL,'/uploads/files/CuadroSinÃ³pticoTecnologia-1787039467932-263913221.pdf',1087774,2,'2026-08-18 07:51:07','2026-09-07 16:30:26'),(30,1,25,'task',NULL,NULL,'aaaa','hola','/uploads/files/ORDEN-DE-PRODUCCION-AC-1787064644086-314714759.pdf',463323,1,'2026-08-18 14:50:44','2026-08-22 11:55:20'),(31,1,25,'task',NULL,NULL,'tarea 1','para la tarea tiene que hacer esto aquello y aja','/uploads/files/Caso-prÃ¡ctico-PelÃ­culas-Web-1787064922936-574098792.pdf',320272,2,'2026-08-18 14:55:22','2026-08-18 14:55:22'),(32,1,25,'forum',NULL,NULL,'foro sobre el cenat','la pregunta del foro es esta, respondan',NULL,NULL,3,'2026-08-18 14:56:24','2026-08-18 14:56:24'),(38,1,NULL,'image',NULL,NULL,'imagen1a','','/uploads/content-images/imagen1-1787074088639-815344633.jpg',31680,1,'2026-08-18 17:28:08','2026-09-07 16:30:09'),(40,1,26,'quiz','multiple_choice',NULL,'quiz 1','',NULL,NULL,1,'2026-08-18 17:32:40','2026-08-28 11:06:27'),(41,1,26,'quiz','true_false',NULL,'quiz1',NULL,NULL,NULL,2,'2026-08-18 17:33:07','2026-08-28 11:06:27'),(42,1,26,'quiz','short_answer',NULL,'quiz 3',NULL,NULL,NULL,3,'2026-08-18 17:33:35','2026-08-28 11:06:27'),(44,1,26,'url',NULL,NULL,'video',NULL,'https://www.youtube.com/watch?v=xSn66Am1GbU',NULL,5,'2026-08-18 18:57:37','2026-09-07 16:30:32'),(46,1,26,'url',NULL,NULL,'video',NULL,'https://www.youtube.com/watch?v=4DBy1-BdcsE',NULL,4,'2026-08-18 18:59:45','2026-09-07 16:30:32'),(47,1,26,'survey','multiple_choice',NULL,'encuesta de satisfaccion',NULL,NULL,NULL,6,'2026-08-18 19:13:07','2026-08-28 11:06:28'),(68,1,NULL,'file',NULL,NULL,'hola','holaaa','/uploads/files/2025_2C_SC-807_Lab2---RecolecciÃ³n-de-InformaciÃ³n-(version-usando-Metagoofil)-1788798586676-268789942.pdf',1926355,3,'2026-09-07 16:29:46','2026-09-07 16:30:09');
/*!40000 ALTER TABLE `contents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `course_teachers`
--

DROP TABLE IF EXISTS `course_teachers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `course_id` int NOT NULL,
  `user_id` int NOT NULL,
  `assigned_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_course_teacher` (`course_id`,`user_id`),
  KEY `idx_course` (`course_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `course_teachers_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_teachers_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_teachers`
--

LOCK TABLES `course_teachers` WRITE;
/*!40000 ALTER TABLE `course_teachers` DISABLE KEYS */;
INSERT INTO `course_teachers` VALUES (6,4,3,'2026-08-13 10:07:02'),(12,1,16,'2026-08-30 16:55:36'),(13,1,3,'2026-09-07 16:18:34'),(15,1,14,'2026-09-07 16:20:50');
/*!40000 ALTER TABLE `course_teachers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `courses`
--

DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `thumbnail` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `certificate_style` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'classic',
  `instructor_id` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_instructor` (`instructor_id`),
  CONSTRAINT `courses_ibfk_1` FOREIGN KEY (`instructor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'Introduccion a la Biotecnología Ambiental','La biotecnología ambiental aplica sistemas biológicos y microorganismos para prevenir, controlar y remediar la contaminación del aire, agua y suelo.','/uploads/thumbnails/Biotecnologia-Ambiental-introduccion-1-2048-1786526153173-223843741.webp','classic',1,1,'2026-08-12 09:15:53','2026-09-07 20:00:36'),(4,'fsdfds','fsdfsdf','/uploads/thumbnails/ComprobanteExtremeTech-1786615597701-103762211.jpeg','classic',NULL,1,'2026-08-13 10:06:37','2026-08-13 10:06:37');
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `enrollments`
--

DROP TABLE IF EXISTS `enrollments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `enrollments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `course_id` int NOT NULL,
  `enrolled_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `progress` int DEFAULT '0' COMMENT 'Porcentaje 0-100',
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_enrollment` (`user_id`,`course_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_course` (`course_id`),
  CONSTRAINT `enrollments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `enrollments_ibfk_2` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enrollments`
--

LOCK TABLES `enrollments` WRITE;
/*!40000 ALTER TABLE `enrollments` DISABLE KEYS */;
INSERT INTO `enrollments` VALUES (1,3,1,'2026-08-12 16:13:23',100,'2026-08-12 16:14:02'),(4,11,4,'2026-08-13 10:14:10',20,NULL),(7,12,4,'2026-08-13 10:46:35',0,NULL),(8,13,4,'2026-08-13 10:47:30',0,NULL),(11,12,1,'2026-08-18 14:51:11',25,NULL),(13,14,1,'2026-08-18 19:13:33',8,NULL),(14,11,1,'2026-08-18 19:34:57',8,NULL);
/*!40000 ALTER TABLE `enrollments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `forum_posts`
--

DROP TABLE IF EXISTS `forum_posts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `forum_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content_id` int NOT NULL,
  `user_id` int NOT NULL,
  `parent_id` int DEFAULT NULL,
  `body` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_content` (`content_id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `forum_posts_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_posts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_posts_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_posts`
--

LOCK TABLES `forum_posts` WRITE;
/*!40000 ALTER TABLE `forum_posts` DISABLE KEYS */;
INSERT INTO `forum_posts` VALUES (4,17,3,NULL,'respuesta 1','2026-08-13 10:45:00',NULL),(5,17,11,NULL,'respuesta 2','2026-08-13 10:45:30',NULL),(6,17,11,4,'respondiendo 1','2026-08-13 10:45:42',NULL),(7,17,12,NULL,'respuesta 3','2026-08-13 10:46:45',NULL),(8,17,12,4,'respondiendo 2','2026-08-13 10:46:57',NULL),(9,17,12,5,'respondiendo 2 1','2026-08-13 10:47:07',NULL),(10,17,13,4,'respondiendo 3','2026-08-13 10:47:38',NULL),(11,17,13,5,'respondiendo 2 2','2026-08-13 10:47:46',NULL),(12,17,13,7,'respondiendo 3 1','2026-08-13 10:47:54',NULL),(13,32,12,NULL,'hhhhh','2026-08-18 15:06:35',NULL);
/*!40000 ALTER TABLE `forum_posts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `site_settings`
--

DROP TABLE IF EXISTS `site_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `site_settings` (
  `key` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` text COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `site_settings`
--

LOCK TABLES `site_settings` WRITE;
/*!40000 ALTER TABLE `site_settings` DISABLE KEYS */;
/*!40000 ALTER TABLE `site_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_submissions`
--

DROP TABLE IF EXISTS `task_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content_id` int NOT NULL,
  `user_id` int NOT NULL,
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `submitted_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `feedback` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `score_earned` decimal(5,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_submission` (`content_id`,`user_id`),
  KEY `idx_content` (`content_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `task_submissions_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_submissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_submissions`
--

LOCK TABLES `task_submissions` WRITE;
/*!40000 ALTER TABLE `task_submissions` DISABLE KEYS */;
INSERT INTO `task_submissions` VALUES (5,14,11,'/uploads/submissions/BIG-DATA-GUION-DE-EXPOSICIÃ_N-EXTENSO-Y-CODIGO-1786615978390-294165536-1786616073912-435106974.docx','2026-08-13 10:14:33','2026-08-13 10:15:24','muy bien hecho',NULL),(6,30,12,'/uploads/submissions/EvaluaciÃ³n-grupal-(1)-1787064689465-477866861.docx','2026-08-18 14:51:29','2026-09-07 16:39:16','le faltodasasssssssssssssssssssssssssssssssssssssssssle faltodasasssssssssssssssssssssssssssssssssssssssssle faltodasasssssssssssssssssssssssssssssssssssssssssle faltodasasssssssssssssssssssssssssssssssssssssssssle faltodasasssssssssssssssssssssssssssssssssssssssss',NULL);
/*!40000 ALTER TABLE `task_submissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','student','teacher') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'student',
  `admin_access` tinyint(1) NOT NULL DEFAULT '0',
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `reset_token_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expires` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrador LANBA',NULL,'adminlms@cenat.com','$2a$10$.N7s0OE2s3iqbL4tsWC7mOnZmyfnrIWYn4PJZ3aYTEeLyWm8rAIR.','admin',0,NULL,1,'2026-08-11 02:06:18','2026-09-07 17:38:37','2026-09-07 17:38:37',NULL,NULL),(2,'Estudiante LANBA',NULL,'estudiantelms@cenat.com','$2a$10$uY59Lw.t0Ng4NBiuJeHThu7bw51QG88hl/9ewPuiSp8yiASHLBtvC','student',0,NULL,1,'2026-08-11 02:06:18','2026-08-14 08:09:49','2026-08-14 08:09:49',NULL,NULL),(3,'Jazmin Calderon Quiros',NULL,'jazmin@gmail.com','$2a$10$Xw39AhgrDRMVoDJrycnXTebL1b8OjOunQ0.GkBnfzJDTYf128iYEC','teacher',0,NULL,1,'2026-08-12 16:06:19','2026-08-13 10:15:00','2026-08-13 10:15:00',NULL,NULL),(11,'Mauricio Hidalgo Garzon','mau312','mauhidalgo312@gmail.com','$2a$10$xLJ75Pzxq0HCyJjOB.Z9aemhaZQodtD0hHt/0b/2ZcU7TKcDrvjC.','student',0,NULL,1,'2026-08-13 03:42:25','2026-09-07 16:42:01','2026-08-28 11:04:54',NULL,NULL),(12,'Ana Rojas Méndez','ana.rojas','ana.rojas@correo.com','$2a$10$bHW8xylfPMw4HVJPGsiWv.2cap57Tpq1eQStAhpX/z.o4lhIAqCsK','student',0,NULL,1,'2026-08-13 03:46:10','2026-08-27 08:26:44','2026-08-22 11:24:39',NULL,NULL),(13,'Carlos Vindas Solís','carlos.vindas','carlos.vindas@correo.com','$2a$10$5xlUPzXrhkFNQITypzdypuvqh.oNjSiyEc88W/CNdUUDVMG44pf02','student',0,NULL,1,'2026-08-13 03:46:10','2026-09-07 16:49:43','2026-09-07 16:49:43',NULL,NULL),(14,'Sofía Chacón Brenes','sofia.chacon','sofia.chacon@correo.com','$2a$10$ym0hKHtYgmLqAL37I9Tl6.d3/n0vvjDODcIBqeNxCfyB5CGssvIMa','teacher',0,NULL,1,'2026-08-13 03:46:10','2026-09-07 16:20:32','2026-08-18 19:13:30',NULL,NULL),(15,'Luis Fernández Araya','luis.fernandez','luis.fernandez@correo.com','$2a$10$YukGqYucgOrdnU6uwS.RTe8dz1sXftdmNcmZhUCu5t11l.gO/3b3a','teacher',0,NULL,1,'2026-08-13 03:46:10','2026-08-22 11:12:14','2026-08-22 11:12:14',NULL,NULL),(16,'Marcela Gómez Solano','marcela.gomez','marcela.gomez@correo.com','$2a$10$Nt3Oqg2XPAF/hCZ3P6UYM.371fIwpzzpt0UJQpNkFCtVGhreQAUn.','teacher',0,NULL,1,'2026-08-13 03:46:49','2026-09-07 17:36:23','2026-09-07 17:36:23',NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-07 14:13:01
