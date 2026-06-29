const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


// Importamos las herramientas de validación
const { body, validationResult } = require('express-validator');

// Nuestra "Base de Datos" temporal en memoria
const usuariosMock = [];
const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// MIDDLEWARE: El Guardián de las rutas
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
// REGRELA DE VALIDACIÓN (Middlewares específicos)
// ==========================================
const validacionRegistro = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio.'),
    body('correo')
        .isEmail().withMessage('Por favor, ingresa un correo electrónico válido.')
        .normalizeEmail(), // Limpia el correo (ej. quita espacios, pasa a minúsculas)
    body('password')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
];

const validacionLogin = [
    body('correo')
        .isEmail().withMessage('Por favor, ingresa un correo válido.'),
    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria.')
];

// ==========================================
// 1. RUTA DE REGISTRO (POST /api/usuarios/registro)
// ==========================================
// Nota que agregamos 'validacionRegistro' como middleware
router.post('/registro', validacionRegistro, async (req, res) => {
    // NUEVO: Verificar si express-validator encontró errores
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        // Si hay errores, devolvemos un código 400 con la lista de fallos
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { nombre, correo, password } = req.body;

        const existeUsuario = usuariosMock.find(user => user.correo === correo);
        if (existeUsuario) {
            return res.status(400).json({ error: "El correo ya está registrado." });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        const nuevoUsuario = {
            id: usuariosMock.length + 1,
            nombre,
            correo,
            password: passwordEncriptada
        };

        usuariosMock.push(nuevoUsuario);

        res.status(201).json({
            mensaje: "¡Usuario registrado con éxito!",
            usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, correo: nuevoUsuario.correo }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Hubo un error en el servidor." });
    }
});

// ==========================================
// 2. RUTA DE LOGIN (POST /api/usuarios/login)
// ==========================================
router.post('/login', validacionLogin, async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { correo, password } = req.body;

        const usuario = usuariosMock.find(user => user.correo === correo);
        if (!usuario) {
            return res.status(400).json({ error: "Credenciales incorrectas." });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecta) {
            return res.status(400).json({ error: "Credenciales incorrectas." });
        }

        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            mensaje: "¡Inicio de sesión exitoso!",
            token,
            usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Hubo un error en el servidor." });
    }
});

// ==========================================
// 3. RUTA PROTEGIDA: Perfil (GET /api/usuarios/perfil)
// ==========================================
router.get('/perfil', verificarToken, (req, res) => {
    const usuario = usuariosMock.find(user => user.id === req.usuario.id);
    if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json({
        mensaje: "¡Petición exitosa! El guardián validó tu token nítidamente.",
        perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo }
    });
});

module.exports = router;