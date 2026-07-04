CREATE DATABASE  IF NOT EXISTS `lms_cenat` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `lms_cenat`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: lms_cenat
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_progress`
--

LOCK TABLES `content_progress` WRITE;
/*!40000 ALTER TABLE `content_progress` DISABLE KEYS */;
INSERT INTO `content_progress` VALUES (4,5,2,'2026-07-02 01:18:39'),(6,5,3,'2026-07-02 01:18:45'),(8,5,1,'2026-07-02 01:18:54'),(11,5,4,'2026-07-02 01:34:51'),(45,5,7,'2026-07-02 06:22:06'),(50,5,6,'2026-07-02 06:37:59'),(51,5,5,'2026-07-02 06:39:34');
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
  `type` enum('video','file') COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `url` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL COMMENT 'Size in bytes',
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_course` (`course_id`),
  KEY `idx_type` (`type`),
  KEY `idx_order` (`order_index`),
  CONSTRAINT `contents_ibfk_1` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contents`
--

LOCK TABLES `contents` WRITE;
/*!40000 ALTER TABLE `contents` DISABLE KEYS */;
INSERT INTO `contents` VALUES (1,1,'video','Introducci├│n al curso','Video introductorio sobre qu├® es la IA','https://example.com/video1.mp4',NULL,1,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(2,1,'file','Presentaci├│n del curso','Slides de introducci├│n','/uploads/ia-intro.pdf',NULL,2,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(3,1,'video','Historia de la IA','Evoluci├│n de la inteligencia artificial','https://example.com/video2.mp4',NULL,3,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(4,2,'video','Instalaci├│n de Node.js','C├│mo instalar el entorno de desarrollo','https://example.com/nodejs-install.mp4',NULL,1,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(5,2,'file','Gu├¡a de instalaci├│n','Documento PDF con pasos detallados','/uploads/nodejs-guide.pdf',NULL,2,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(6,4,'file','ejemplo de prueba de archivo Esta es la prueba ! ó á í # $ ?','esto se ve bien? Esta es la prueba ! ó á í # $ ?','/uploads/files/CV_Mauricio_Hidalgo_B1-1782729609396-375329727.pdf',22149,1,'2026-06-29 10:40:09','2026-06-29 10:40:09'),(7,4,'video','ejemplo de prueba de video Esta es la prueba ! ó á í # $ ?','ejemplo de prueba de video Esta es la prueba ! ó á í # $ ?','/uploads/videos/1video-1782729688669-542331368.mp4',14134233,2,'2026-06-29 10:41:28','2026-06-29 10:41:28');
/*!40000 ALTER TABLE `contents` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `courses`
--

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES (1,'Introducción a la Inteligencia Artificial','Curso b├ísico sobre conceptos fundamentales de IA y Machine Learning',NULL,1,1,'2026-02-11 08:54:30','2026-06-29 10:35:36'),(2,'Desarrollo Web con Node.js','Aprende a crear aplicaciones web modernas con Node.js y Express',NULL,1,1,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(3,'Base de Datos con MySQL','Fundamentos de bases de datos relacionales y SQL',NULL,1,1,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(4,'Prueba de Curso 1 2 3','Esta es la prueba ! ó á í # $ ?','/uploads/thumbnails/herramientas-y-recursos-para-crear-curso-online-1782729450936-670302008.png',4,1,'2026-06-29 10:37:30','2026-06-29 10:48:17'),(5,'1','1',NULL,4,1,'2026-07-02 01:22:02','2026-07-02 01:22:02');
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
INSERT INTO `enrollments` VALUES (1,2,1,'2026-02-11 08:54:30',30),(2,2,2,'2026-02-11 08:54:30',0),(3,3,1,'2026-02-11 08:54:30',60),(4,5,4,'2026-06-29 10:51:42',100),(5,5,1,'2026-06-29 11:04:17',100),(6,5,2,'2026-07-02 01:34:43',100);
/*!40000 ALTER TABLE `enrollments` ENABLE KEYS */;
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
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','student') COLLATE utf8mb4_unicode_ci DEFAULT 'student',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Administrador CeNAT','admin@cenat.ac.cr','$2a$10$xQWvKqKXvBLHWqKHpvJQDO9vEH5aVZJ8jYHvJqKXvBLHWqKHpvJQDO','admin',1,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(2,'Mar├¡a Gonz├ílez','maria@cenat.ac.cr','$2a$10$xQWvKqKXvBLHWqKHpvJQDO9vEH5aVZJ8jYHvJqKXvBLHWqKHpvJQDO','student',1,'2026-02-11 08:54:30','2026-07-02 19:05:23'),(3,'Carlos Rodr├¡guez','carlos@cenat.ac.cr','$2a$10$xQWvKqKXvBLHWqKHpvJQDO9vEH5aVZJ8jYHvJqKXvBLHWqKHpvJQDO','student',1,'2026-02-11 08:54:30','2026-02-11 08:54:30'),(4,'Mauricio','mauricio@cenat.ac.cr','$2a$10$XV6H/I23waB4tBlZgwkaQeMh7jKPvdyCr.GMIAT2T3VqP.N0PVqTi','admin',1,'2026-06-29 10:32:17','2026-06-29 10:34:06'),(5,'Mauricio Estudiante','mauricio@estudiante.com','$2a$10$087DhWXzjx7ADa2ZMRiQsuM6phuktexKQw7fx9hgKeQVKuZYqvRNS','student',1,'2026-06-29 10:51:19','2026-07-03 00:06:26');
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

-- Dump completed on 2026-07-02 19:47:41
