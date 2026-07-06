const express = require('express');
const router = express.Router();
const db = require('../db');

// ==========================================
// RUTA: OBTENER TODOS LOS DESTINOS
// ==========================================
router.get('/', async (req, res) => {
    try {
        const [destinos] = await db.query(`
            SELECT d.id_destino, d.nombre, d.descripcion, d.provincia, 
                   d.precio_estimado, d.imagen_url, c.nombre AS categoria
            FROM destinos d
            LEFT JOIN categorias c ON d.id_categoria = c.id_categoria
            ORDER BY d.id_destino ASC
        `);

        res.json({ destinos });
    } catch (error) {
        console.error("ERROR AL OBTENER DESTINOS:", error);
        res.status(500).json({ error: "Hubo un error al obtener los destinos." });
    }
});

module.exports = router;