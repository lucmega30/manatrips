const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const usuariosMock = [];
const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// MIDDLEWARE 1: El Guardián de Autenticación
// ==========================================
function verificarToken(req, res, next) {
    const tokenHeader = req.header('Authorization');
    if (!tokenHeader) {
        return res.status(401).json({ error: "Acceso denegado. No se proporcionó un token." });
    }

    const token = tokenHeader.replace('Bearer ', '');

    try {
        const verificado = jwt.verify(token, JWT_SECRET);
        req.usuario = verificado; // Aquí ya viene el id, nombre Y ROL
        next(); 
    } catch (error) {
        res.status(401).json({ error: "Token inválido o expirado." });
    }
}

// ==========================================
//MIDDLEWARE 2: El Guardián de Roles (Autorización)
// ==========================================
function verificarRol(rolesPermitidos) {
    return (req, res, next) => {
        // Verificamos si el rol del usuario está dentro de los roles permitidos para la ruta
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ 
                error: `Acceso prohibido. Esta acción es exclusiva para roles: [${rolesPermitidos.join(', ')}]` 
            });
        }
        next(); // Si tiene el rol, ¡lo dejamos pasar!
    };
}

// ==========================================
// REGLAS DE VALIDACIÓN
// ==========================================
const validacionRegistro = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
    body('correo').isEmail().withMessage('Ingresa un correo válido.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
];

// ==========================================
// 1. RUTA DE REGISTRO
// ==========================================
router.post('/registro', validacionRegistro, async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        return res.status(400).json({ errores: errores.array() });
    }

    try {
        const { nombre, correo, password, rol } = req.body;

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
            password: passwordEncriptada,
            //Si no mandan rol, por defecto es 'turista'. Para pruebas permitimos asignar 'admin'.
            rol: rol || 'turista' 
        };

        usuariosMock.push(nuevoUsuario);

        res.status(201).json({
            mensaje: "¡Usuario registrado con éxito!",
            usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, correo: nuevoUsuario.correo, rol: nuevoUsuario.rol }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Hubo un error en el servidor." });
    }
});

// ==========================================
// 2. RUTA DE LOGIN
// ==========================================
router.post('/login', async (req, res) => {
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

        // Incluimos el ROL en el pastel del JWT
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            mensaje: "¡Inicio de sesión exitoso!",
            token,
            usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Hubo un error en el servidor." });
    }
});

// ==========================================
// 3. RUTA PROTEGIDA: Perfil (Cualquier usuario autenticado)
// ==========================================
router.get('/perfil', verificarToken, (req, res) => {
    const usuario = usuariosMock.find(user => user.id === req.usuario.id);
    if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

    res.json({
        mensaje: "¡Token válido!",
        perfil: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }
    });
});

// ==========================================
//4. RUTA PROTEGIDA EXCLUSIVA: Panel de Admin (GET /api/usuarios/admin/panel)
// ==========================================
// Encadenamos los guardianes: Primero que esté logueado, luego que sea 'admin'
router.get('/admin/panel', verificarToken, verificarRol(['admin']), (req, res) => {
    res.json({
        mensaje: "¡Bienvenido, Administrador! Tienes acceso al panel de control de ManaTrip."
    });
});

module.exports = router;