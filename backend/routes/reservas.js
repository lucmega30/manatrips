const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// MIDDLEWARE: VERIFICAR TOKEN (mismo patron que destinos.js / usuarios.js)
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
// RUTA: CREAR RESERVA (requiere sesion activa)
// ==========================================
router.post('/', verificarToken, async (req, res) => {
    try {
        const { id_destino, fecha_viaje } = req.body;

        if (!id_destino || !fecha_viaje) {
            return res.status(400).json({ error: "Debes indicar el destino y la fecha del viaje." });
        }

        // Verificar que la fecha de viaje no sea en el pasado
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaSeleccionada = new Date(fecha_viaje);

        if (fechaSeleccionada < hoy) {
            return res.status(400).json({ error: "La fecha de viaje no puede ser en el pasado." });
        }

        // Verificar que el destino exista
        const [destinos] = await db.query('SELECT * FROM destinos WHERE id_destino = ?', [id_destino]);
        if (destinos.length === 0) {
            return res.status(404).json({ error: "El destino seleccionado no existe." });
        }

        await db.query(
            'INSERT INTO reservas (id_usuario, id_destino, fecha_viaje) VALUES (?, ?, ?)',
            [req.usuario.id, id_destino, fecha_viaje]
        );

        res.status(201).json({ mensaje: "¡Reserva creada con éxito! Queda pendiente de confirmación." });
    } catch (error) {
        console.error("ERROR AL CREAR RESERVA:", error);
        res.status(500).json({ error: "Hubo un error al guardar la reserva." });
    }
});

// ==========================================
// RUTA: VER MIS RESERVAS (requiere sesion activa)
// ==========================================
router.get('/mis-reservas', verificarToken, async (req, res) => {
    try {
        const [reservas] = await db.query(`
            SELECT r.id_reserva, r.fecha_reserva, r.fecha_viaje, r.estado,
                   d.id_destino, d.nombre AS destino_nombre, d.provincia,
                   d.precio_estimado, d.imagen_url
            FROM reservas r
            JOIN destinos d ON r.id_destino = d.id_destino
            WHERE r.id_usuario = ?
            ORDER BY r.fecha_viaje DESC
        `, [req.usuario.id]);

        res.json({ reservas });
    } catch (error) {
        console.error("ERROR AL OBTENER RESERVAS:", error);
        res.status(500).json({ error: "Hubo un error al obtener tus reservas." });
    }
});

// ==========================================
// RUTA: CANCELAR RESERVA (requiere sesion activa y ser dueño de la reserva)
// ==========================================
router.put('/:id/cancelar', verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [reservas] = await db.query('SELECT * FROM reservas WHERE id_reserva = ?', [id]);
        if (reservas.length === 0) {
            return res.status(404).json({ error: "Reserva no encontrada." });
        }

        if (reservas[0].id_usuario !== req.usuario.id) {
            return res.status(403).json({ error: "No tienes permiso para cancelar esta reserva." });
        }

        await db.query('UPDATE reservas SET estado = ? WHERE id_reserva = ?', ['cancelada', id]);

        res.json({ mensaje: "Reserva cancelada con éxito." });
    } catch (error) {
        console.error("ERROR AL CANCELAR RESERVA:", error);
        res.status(500).json({ error: "Hubo un error al cancelar la reserva." });
    }
});

module.exports = router;