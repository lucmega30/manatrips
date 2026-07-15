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

module.exports = router;