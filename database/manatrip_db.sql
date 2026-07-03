-- ============================================================
-- ManaTrip - Script de Base de Datos
-- Proyecto: Diseño Web - Universidad APEC
-- Encargado: Emilio Sena (Base de datos)
-- Motor: MySQL
-- ============================================================
-- Este script crea la base de datos, las 5 tablas asignadas
-- (USUARIOS, DESTINOS, RESERVAS, COMENTARIOS, CATEGORIAS)
-- y carga datos de prueba con destinos turisticos dominicanos.
-- ============================================================

-- 1. Crear la base de datos
DROP DATABASE IF EXISTS manatrip_db;
CREATE DATABASE manatrip_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE manatrip_db;

-- ============================================================
-- 2. Tabla CATEGORIAS
-- Clasifica los tipos de destino (playa, montaña, etc.)
-- ============================================================
CREATE TABLE categorias (
    id_categoria INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

-- ============================================================
-- 3. Tabla USUARIOS
-- Personas registradas en la plataforma
-- ============================================================
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    contrasena VARCHAR(255) NOT NULL,
    rol VARCHAR(20) DEFAULT 'usuario',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. Tabla DESTINOS
-- Lugares turisticos sugeridos en la plataforma
-- ============================================================
CREATE TABLE destinos (
    id_destino INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    provincia VARCHAR(100) NOT NULL,
    id_categoria INT,
    precio_estimado DECIMAL(10,2) DEFAULT 0,
    imagen_url VARCHAR(255),
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);

-- ============================================================
-- 5. Tabla RESERVAS
-- Reservas que hacen los usuarios sobre un destino
-- ============================================================
CREATE TABLE reservas (
    id_reserva INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_destino INT NOT NULL,
    fecha_reserva DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_viaje DATE NOT NULL,
    estado ENUM('pendiente', 'confirmada', 'cancelada') DEFAULT 'pendiente',
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (id_destino) REFERENCES destinos(id_destino)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ============================================================
-- 6. Tabla COMENTARIOS
-- Opiniones y calificaciones de usuarios sobre destinos
-- ============================================================
CREATE TABLE comentarios (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    id_destino INT NOT NULL,
    calificacion TINYINT NOT NULL CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY (id_destino) REFERENCES destinos(id_destino)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- ============================================================
-- 7. Datos de prueba
-- ============================================================

-- Categorias
INSERT INTO categorias (nombre, descripcion) VALUES
('Playa', 'Destinos costeros con arena y mar'),
('Montaña', 'Zonas altas, frescas y de naturaleza'),
('Ecoturismo', 'Reservas naturales y turismo sostenible'),
('Histórico', 'Sitios con valor cultural e histórico'),
('Aventura', 'Actividades de adrenalina y deportes extremos');

-- Usuarios de prueba
INSERT INTO usuarios (nombre, correo, contrasena, rol) VALUES
('Emilio Sena', 'emilio.sena@example.com', 'hash_temporal_1', 'admin'),
('Lucas Mejía', 'lucas.mejia@example.com', 'hash_temporal_2', 'admin'),
('Elías Pérez', 'elias.perez@example.com', 'hash_temporal_3', 'usuario');

-- Destinos turisticos dominicanos (al menos 5, requerido por la tarea)
INSERT INTO destinos (nombre, descripcion, provincia, id_categoria, precio_estimado, imagen_url) VALUES
('Playa Bávaro', 'Una de las playas más famosas del país, con arena blanca y aguas turquesas ideales para descansar.', 'Punta Cana', 1, 2500.00, 'https://example.com/imagenes/bavaro.jpg'),
('Pico Duarte', 'El pico más alto del Caribe, perfecto para los amantes del senderismo y la montaña.', 'La Vega', 2, 3500.00, 'https://example.com/imagenes/pico-duarte.jpg'),
('Los 27 Charcos de Damajagua', 'Cascadas y piscinas naturales donde se puede saltar, nadar y deslizarse entre las rocas.', 'Puerto Plata', 5, 1800.00, 'https://example.com/imagenes/27-charcos.jpg'),
('Zona Colonial de Santo Domingo', 'El centro histórico más antiguo de América, declarado Patrimonio de la Humanidad por la UNESCO.', 'Santo Domingo', 4, 0.00, 'https://example.com/imagenes/zona-colonial.jpg'),
('Lago Enriquillo', 'El lago más grande del Caribe y reserva natural, hogar de cocodrilos americanos e iguanas.', 'Independencia', 3, 2200.00, 'https://example.com/imagenes/lago-enriquillo.jpg'),
('Salto El Limón', 'Una cascada escondida en medio de la naturaleza, accesible a caballo o caminando.', 'Samaná', 3, 1500.00, 'https://example.com/imagenes/salto-el-limon.jpg');

-- Reservas de prueba
INSERT INTO reservas (id_usuario, id_destino, fecha_viaje, estado) VALUES
(1, 1, '2026-08-15', 'confirmada'),
(2, 3, '2026-09-01', 'pendiente'),
(3, 4, '2026-07-20', 'confirmada'),
(1, 5, '2026-10-10', 'pendiente');

-- Comentarios de prueba
INSERT INTO comentarios (id_usuario, id_destino, calificacion, comentario) VALUES
(1, 1, 5, 'Playa increíble, el agua estaba clarísima y muy tranquila.'),
(2, 3, 4, 'Los charcos son hermosos, aunque la caminata es algo exigente.'),
(3, 4, 5, 'La Zona Colonial tiene una arquitectura espectacular, vale la pena el recorrido.'),
(1, 2, 4, 'Subir el Pico Duarte fue agotador pero la vista en la cima lo compensa todo.');

-- ============================================================
-- 8. Consultas de verificación (opcional, para probar el script)
-- ============================================================
-- SELECT * FROM categorias;
-- SELECT * FROM usuarios;
-- SELECT * FROM destinos;
-- SELECT * FROM reservas;
-- SELECT * FROM comentarios;

-- Ejemplo de consulta util: destinos con su categoria
-- SELECT d.nombre AS destino, c.nombre AS categoria, d.provincia, d.precio_estimado
-- FROM destinos d
-- LEFT JOIN categorias c ON d.id_categoria = c.id_categoria;
