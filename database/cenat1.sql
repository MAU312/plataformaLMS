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
) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_progress`
--

LOCK TABLES `content_progress` WRITE;
/*!40000 ALTER TABLE `content_progress` DISABLE KEYS */;
INSERT INTO `content_progress` VALUES (67,3,1,'2026-08-12 16:13:40'),(68,3,2,'2026-08-12 16:13:44'),(69,3,3,'2026-08-12 16:14:02'),(72,11,14,'2026-08-13 10:14:33');
/*!40000 ALTER TABLE `content_progress` ENABLE KEYS */;
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
  `type` enum('video','file','text','url','task','forum') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_size` int DEFAULT NULL COMMENT 'Size in bytes',
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_course` (`course_id`),
  KEY `idx_type` (`type`),
  KEY `idx_order` (`order_index`),
  CONSTRAINT `contents_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contents`
--

LOCK TABLES `contents` WRITE;
/*!40000 ALTER TABLE `contents` DISABLE KEYS */;
INSERT INTO `contents` VALUES (1,1,'video','ejemplo 1','descip','/uploads/videos/YTDown.com_YouTube_Samsung-Galaxy-Z-Fold-8-I-Unboxing-_-Cam_Media_0mWy2Vr8YHo_001_1080p-1786550895628-487089031.mp4',344744669,1,'2026-08-12 16:08:17','2026-08-12 16:08:17'),(2,1,'file','ejemplo 2','ejemplo 2','/uploads/files/EstadodeCuenta-1786551022084-375358342.pdf',127781,2,'2026-08-12 16:10:22','2026-08-12 16:10:22'),(3,1,'file','ejemplo 3','ejemplo 3','/uploads/files/CV_Mauricio_Hidalgo_B1-1786551034692-475220608.pdf',22149,3,'2026-08-12 16:10:34','2026-08-12 16:10:34'),(11,4,'text','dadsad','sdsadsa',NULL,NULL,1,'2026-08-13 10:06:59','2026-08-13 10:06:59'),(12,4,'url','musica','video musical','https://www.youtube.com/watch?v=qz6_ETehLpQ',NULL,2,'2026-08-13 10:12:18','2026-08-13 10:12:18'),(13,4,'file','dada','dada','/uploads/files/20260515-REGLAMENTO_POKEMON_CHAMPIONS_vf-1786615954650-547301046.pdf',169027,3,'2026-08-13 10:12:34','2026-08-13 10:12:34'),(14,4,'task','tarea','tarea','/uploads/files/BIG-DATA-GUION-DE-EXPOSICIÃN-EXTENSO-Y-CODIGO-1786615978390-294165536.docx',33332,4,'2026-08-13 10:12:58','2026-08-13 10:12:58'),(15,4,'video','dada','dada','/uploads/videos/no-joda-1786615995296-952925826.mp4',9064665,5,'2026-08-13 10:13:15','2026-08-13 10:13:15');
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
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `course_teachers`
--

LOCK TABLES `course_teachers` WRITE;
/*!40000 ALTER TABLE `course_teachers` DISABLE KEYS */;
INSERT INTO `course_teachers` VALUES (6,4,3,'2026-08-13 10:07:02');
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
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `thumbnail` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
INSERT INTO `courses` VALUES (1,'Introduccion a la Biotecnología Ambiental','La biotecnología ambiental aplica sistemas biológicos y microorganismos para prevenir, controlar y remediar la contaminación del aire, agua y suelo.','/uploads/thumbnails/Biotecnologia-Ambiental-introduccion-1-2048-1786526153173-223843741.webp',1,1,'2026-08-12 09:15:53','2026-08-12 09:15:53'),(4,'fsdfds','fsdfsdf','/uploads/thumbnails/ComprobanteExtremeTech-1786615597701-103762211.jpeg',NULL,1,'2026-08-13 10:06:37','2026-08-13 10:06:37');
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `enrollments`
--

LOCK TABLES `enrollments` WRITE;
/*!40000 ALTER TABLE `enrollments` DISABLE KEYS */;
INSERT INTO `enrollments` VALUES (1,3,1,'2026-08-12 16:13:23',100,'2026-08-12 16:14:02'),(4,11,4,'2026-08-13 10:14:10',20,NULL);
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
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_content` (`content_id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `forum_posts_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_posts_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `forum_posts_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `forum_posts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `forum_posts`
--

LOCK TABLES `forum_posts` WRITE;
/*!40000 ALTER TABLE `forum_posts` DISABLE KEYS */;
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
INSERT INTO `sessions` VALUES ('AFpN5Zgqw6wXmgB42sQQEbK1Bxtm0Pk3',1786704090,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-08-14T10:41:29.519Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":1,\"name\":\"Administrador LANBA\",\"email\":\"adminlms@cenat.com\",\"role\":\"admin\"}}'),('Z57mjGVa0Vf23VDnTmNN6YaW451FupOC',1786702575,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2026-08-14T10:15:01.001Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"user\":{\"id\":3,\"name\":\"Jazmin Calderon Quiros\",\"email\":\"jazmin@gmail.com\",\"role\":\"teacher\"}}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_submission` (`content_id`,`user_id`),
  KEY `idx_content` (`content_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `task_submissions_ibfk_1` FOREIGN KEY (`content_id`) REFERENCES `contents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `task_submissions_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_submissions`
--

LOCK TABLES `task_submissions` WRITE;
/*!40000 ALTER TABLE `task_submissions` DISABLE KEYS */;
INSERT INTO `task_submissions` VALUES (5,14,11,'/uploads/submissions/BIG-DATA-GUION-DE-EXPOSICIÃ_N-EXTENSO-Y-CODIGO-1786615978390-294165536-1786616073912-435106974.docx','2026-08-13 10:14:33','2026-08-13 10:15:24','muy bien hecho');
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
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','student','teacher') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'student',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_login` timestamp NULL DEFAULT NULL,
  `reset_token_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expires` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrador LANBA',NULL,'adminlms@cenat.com','$2a$10$.N7s0OE2s3iqbL4tsWC7mOnZmyfnrIWYn4PJZ3aYTEeLyWm8rAIR.','admin',1,'2026-08-11 02:06:18','2026-08-13 10:41:29','2026-08-13 10:41:29',NULL,NULL),(2,'Estudiante LANBA',NULL,'estudiantelms@cenat.com','$2a$10$uY59Lw.t0Ng4NBiuJeHThu7bw51QG88hl/9ewPuiSp8yiASHLBtvC','student',1,'2026-08-11 02:06:18','2026-08-13 10:41:29','2026-08-13 10:41:29',NULL,NULL),(3,'Jazmin Calderon Quiros',NULL,'jazmin@gmail.com','$2a$10$Xw39AhgrDRMVoDJrycnXTebL1b8OjOunQ0.GkBnfzJDTYf128iYEC','teacher',1,'2026-08-12 16:06:19','2026-08-13 10:15:00','2026-08-13 10:15:00',NULL,NULL),(11,'Mauricio Hidalgo Garzon','mau312','mauhidalgo312@gmail.com','$2a$10$PdO0QhK0FPp2vM1aYzWMiezMfE9h0RMv58HvQ4kXR1MSckg3l3gc6','student',1,'2026-08-13 03:42:25','2026-08-13 10:14:06','2026-08-13 10:14:06',NULL,NULL),(12,'Ana Rojas Méndez','ana.rojas','ana.rojas@correo.com','$2a$10$bHW8xylfPMw4HVJPGsiWv.2cap57Tpq1eQStAhpX/z.o4lhIAqCsK','student',1,'2026-08-13 03:46:10','2026-08-13 03:46:10',NULL,NULL,NULL),(13,'Carlos Vindas Solís','carlos.vindas','carlos.vindas@correo.com','$2a$10$5xlUPzXrhkFNQITypzdypuvqh.oNjSiyEc88W/CNdUUDVMG44pf02','student',1,'2026-08-13 03:46:10','2026-08-13 03:46:10',NULL,NULL,NULL),(14,'Sofía Chacón Brenes','sofia.chacon','sofia.chacon@correo.com','$2a$10$ym0hKHtYgmLqAL37I9Tl6.d3/n0vvjDODcIBqeNxCfyB5CGssvIMa','student',1,'2026-08-13 03:46:10','2026-08-13 03:46:10',NULL,NULL,NULL),(15,'Luis Fernández Araya','luis.fernandez','luis.fernandez@correo.com','$2a$10$YukGqYucgOrdnU6uwS.RTe8dz1sXftdmNcmZhUCu5t11l.gO/3b3a','teacher',1,'2026-08-13 03:46:10','2026-08-13 10:39:27','2026-08-13 10:39:27',NULL,NULL),(16,'Marcela Gómez Solano','marcela.gomez','marcela.gomez@correo.com','$2a$10$Nt3Oqg2XPAF/hCZ3P6UYM.371fIwpzzpt0UJQpNkFCtVGhreQAUn.','teacher',1,'2026-08-13 03:46:49','2026-08-13 03:47:11',NULL,NULL,NULL);
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

-- Dump completed on 2026-08-13  4:42:02
