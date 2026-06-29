const express = require('express');
const router = express.Router();

// Ruta de prueba para simular un inicio de sesión futuro
router.post('/login', (req, res) => {
    res.json({ 
        mensaje: "¡La API de usuarios responde! Aquí validaremos las claves más adelante." 
    });
});

module.exports = router;