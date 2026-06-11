-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 11-Jun-2026 às 11:02
-- Versão do servidor: 10.4.32-MariaDB
-- versão do PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `liveeyedetect`
--
CREATE DATABASE IF NOT EXISTS `liveeyedetect` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `liveeyedetect`;

-- --------------------------------------------------------

--
-- Estrutura da tabela `convites`
--

DROP TABLE IF EXISTS `convites`;
CREATE TABLE `convites` (
  `id_convite` int(11) NOT NULL,
  `codigo_validacao` varchar(16) NOT NULL,
  `codigo_usado` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `detecoes`
--

DROP TABLE IF EXISTS `detecoes`;
CREATE TABLE `detecoes` (
  `id` int(11) NOT NULL,
  `person_id` int(255) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `stream_id` varchar(255) DEFAULT NULL,
  `detetado_em` datetime NOT NULL DEFAULT current_timestamp(),
  `visto` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura da tabela `utilizadores`
--

DROP TABLE IF EXISTS `utilizadores`;
CREATE TABLE `utilizadores` (
  `id_utilizador` int(11) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `nome` varchar(255) DEFAULT '',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Extraindo dados da tabela `utilizadores`
--

INSERT INTO `utilizadores` (`id_utilizador`, `email`, `password`, `nome`, `created_at`, `updated_at`) VALUES
(1, 'a14486@oficina.pt', '$2b$12$.SOAcrTWi2nfer5O8h2Bb.kT5uPUF7rWHqyqFZxrS9aBaf0Pldsli', 'João', '2026-05-25 12:32:50', '2026-05-28 10:15:28'),
(2, 'rui@gmail.com', '$2b$12$HoTn6dye7TNlL6lekXAYD.cJA2rnMUI9UWOWDuRnIj33Rxs1f39A.', 'Rui', '2026-05-25 12:40:59', '2026-05-25 12:40:59');

--
-- Índices para tabelas despejadas
--

--
-- Índices para tabela `convites`
--
ALTER TABLE `convites`
  ADD PRIMARY KEY (`id_convite`),
  ADD UNIQUE KEY `uq_codigo` (`codigo_validacao`);

--
-- Índices para tabela `detecoes`
--
ALTER TABLE `detecoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_person_id` (`person_id`),
  ADD KEY `idx_visto` (`visto`),
  ADD KEY `idx_detetado` (`detetado_em`);

--
-- Índices para tabela `utilizadores`
--
ALTER TABLE `utilizadores`
  ADD PRIMARY KEY (`id_utilizador`),
  ADD UNIQUE KEY `uq_email` (`email`);

--
-- AUTO_INCREMENT de tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `convites`
--
ALTER TABLE `convites`
  MODIFY `id_convite` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `detecoes`
--
ALTER TABLE `detecoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `utilizadores`
--
ALTER TABLE `utilizadores`
  MODIFY `id_utilizador` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
