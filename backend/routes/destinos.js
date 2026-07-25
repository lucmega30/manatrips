const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// MIDDLEWARE: VERIFICAR TOKEN (mismo patron que usuarios.js)
// ==========================================
function verificarToken(req, res, next) {
    const tokenHeader = req.header('Authorization');
    if (!tokenHeader) {
        return res.status(401).json({ error: "Acceso denegado. No se proporcionó un token." });
    }

    const token = tokenHeader.replace('Bearer ', '');

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        req.usuario = verificado;
        next();
    } catch (error) {
        res.status(401).json({ error: "Token inválido o expirado." });
    }
}

// ==========================================
// MIDDLEWARE: VERIFICAR ROL (mismo patron que usuarios.js)
// ==========================================
function verificarRol(rolesPermitidos) {
    return (req, res, next) => {
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                error: `Acceso prohibido. Esta acción es exclusiva para roles: [${rolesPermitidos.join(', ')}]`
            });
        }
        next();
    };
}

// ==========================================
// CATEGORIAS DISPONIBLES (para el panel de admin)
// ==========================================
router.get('/admin/categorias', verificarToken, verificarRol(['admin']), async (req, res) => {
    try {
        const [categorias] = await db.query('SELECT id_categoria, nombre FROM categorias ORDER BY nombre ASC');
        res.json({ categorias });
    } catch (error) {
        console.error("ERROR AL OBTENER CATEGORIAS:", error);
        res.status(500).json({ error: "Hubo un error al obtener las categorías." });
    }
});

// ==========================================
// RUTA: OBTENER DESTINOS (con filtro opcional por categoria y promedio de calificacion)
// ==========================================
router.get('/', async (req, res) => {
    try {
        const { categoria } = req.query;

        let sql = `
            SELECT d.id_destino, d.nombre, d.descripcion, d.provincia, 
                   d.precio_estimado, d.imagen_url, c.nombre AS categoria,
                   ROUND(AVG(co.calificacion), 1) AS calificacion_promedio,
                   COUNT(co.id_comentario) AS total_comentarios
            FROM destinos d
            LEFT JOIN categorias c ON d.id_categoria = c.id_categoria
            LEFT JOIN comentarios co ON d.id_destino = co.id_destino
        `;
        const parametros = [];

        if (categoria) {
            sql += ' WHERE c.nombre = ?';
            parametros.push(categoria);
        }

        sql += ' GROUP BY d.id_destino ORDER BY d.id_destino ASC';

        const [destinos] = await db.query(sql, parametros);

        res.json({ destinos });
    } catch (error) {
        console.error("ERROR AL OBTENER DESTINOS:", error);
        res.status(500).json({ error: "Hubo un error al obtener los destinos." });
    }
});

// ==========================================
// RUTA: OBTENER UN SOLO DESTINO POR ID
// ==========================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [destinos] = await db.query(`
            SELECT d.id_destino, d.nombre, d.descripcion, d.provincia, 
                   d.precio_estimado, d.imagen_url, c.nombre AS categoria,
                   ROUND(AVG(co.calificacion), 1) AS calificacion_promedio,
                   COUNT(co.id_comentario) AS total_comentarios
            FROM destinos d
            LEFT JOIN categorias c ON d.id_categoria = c.id_categoria
            LEFT JOIN comentarios co ON d.id_destino = co.id_destino
            WHERE d.id_destino = ?
            GROUP BY d.id_destino
        `, [id]);

        if (destinos.length === 0) {
            return res.status(404).json({ error: "Destino no encontrado." });
        }

        res.json({ destino: destinos[0] });
    } catch (error) {
        console.error("ERROR AL OBTENER DESTINO:", error);
        res.status(500).json({ error: "Hubo un error al obtener el destino." });
    }
});

// ==========================================
// RUTA: OBTENER COMENTARIOS DE UN DESTINO
// ==========================================
router.get('/:id/comentarios', async (req, res) => {
    try {
        const { id } = req.params;

        const [comentarios] = await db.query(`
            SELECT co.id_comentario, co.calificacion, co.comentario, co.fecha, u.nombre AS usuario
            FROM comentarios co
            JOIN usuarios u ON co.id_usuario = u.id_usuario
            WHERE co.id_destino = ?
            ORDER BY co.fecha DESC
        `, [id]);

        res.json({ comentarios });
    } catch (error) {
        console.error("ERROR AL OBTENER COMENTARIOS:", error);
        res.status(500).json({ error: "Hubo un error al obtener los comentarios." });
    }
});

// ==========================================
// RUTA: CREAR COMENTARIO (requiere sesion activa)
// ==========================================
router.post('/:id/comentarios', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { calificacion, comentario } = req.body;

        if (!calificacion || calificacion < 1 || calificacion > 5) {
            return res.status(400).json({ error: "La calificación debe ser un número entre 1 y 5." });
        }

        await db.query(
            'INSERT INTO comentarios (id_usuario, id_destino, calificacion, comentario) VALUES (?, ?, ?, ?)',
            [req.usuario.id, id, calificacion, comentario || null]
        );

        res.status(201).json({ mensaje: "¡Comentario agregado con éxito!" });
    } catch (error) {
        console.error("ERROR AL CREAR COMENTARIO:", error);
        res.status(500).json({ error: "Hubo un error al guardar el comentario." });
    }
});

// ==========================================
// RUTA: CREAR DESTINO (solo admin)
// ==========================================
router.post('/', verificarToken, verificarRol(['admin']), async (req, res) => {
    try {
        const { nombre, descripcion, provincia, id_categoria, precio_estimado, imagen_url } = req.body;

        if (!nombre || !provincia) {
            return res.status(400).json({ error: "El nombre y la provincia son obligatorios." });
        }

        const [resultado] = await db.query(
            'INSERT INTO destinos (nombre, descripcion, provincia, id_categoria, precio_estimado, imagen_url) VALUES (?, ?, ?, ?, ?, ?)',
            [nombre, descripcion || null, provincia, id_categoria || null, precio_estimado || 0, imagen_url || null]
        );

        res.status(201).json({ mensaje: "¡Destino creado con éxito!", id_destino: resultado.insertId });
    } catch (error) {
        console.error("ERROR AL CREAR DESTINO:", error);
        res.status(500).json({ error: "Hubo un error al crear el destino." });
    }
});

// ==========================================
// RUTA: EDITAR DESTINO (solo admin)
// ==========================================
router.put('/:id', verificarToken, verificarRol(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, provincia, id_categoria, precio_estimado, imagen_url } = req.body;

        const [existe] = await db.query('SELECT * FROM destinos WHERE id_destino = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ error: "Destino no encontrado." });
        }

        if (!nombre || !provincia) {
            return res.status(400).json({ error: "El nombre y la provincia son obligatorios." });
        }

        await db.query(
            'UPDATE destinos SET nombre = ?, descripcion = ?, provincia = ?, id_categoria = ?, precio_estimado = ?, imagen_url = ? WHERE id_destino = ?',
            [nombre, descripcion || null, provincia, id_categoria || null, precio_estimado || 0, imagen_url || null, id]
        );

        res.json({ mensaje: "¡Destino actualizado con éxito!" });
    } catch (error) {
        console.error("ERROR AL ACTUALIZAR DESTINO:", error);
        res.status(500).json({ error: "Hubo un error al actualizar el destino." });
    }
});

// ==========================================
// RUTA: ELIMINAR DESTINO (solo admin)
// ==========================================
router.delete('/:id', verificarToken, verificarRol(['admin']), async (req, res) => {
    try {
        const { id } = req.params;

        const [existe] = await db.query('SELECT * FROM destinos WHERE id_destino = ?', [id]);
        if (existe.length === 0) {
            return res.status(404).json({ error: "Destino no encontrado." });
        }

        await db.query('DELETE FROM destinos WHERE id_destino = ?', [id]);

        res.json({ mensaje: "Destino eliminado con éxito." });
    } catch (error) {
        console.error("ERROR AL ELIMINAR DESTINO:", error);
        res.status(500).json({ error: "Hubo un error al eliminar el destino." });
    }
});

module.exports = router;