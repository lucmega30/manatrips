const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const usuariosMock = [];
const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// MIDDLEWARES DE SEGURIDAD
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
// REGLAS DE VALIDACIÓN
// ==========================================
const validacionRegistro = [
    body('nombre').trim().notEmpty().withMessage('El nombre es obligatorio.'),
    body('correo').isEmail().withMessage('Ingresa un correo válido.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
];

// Reglas para actualizar datos (son opcionales usando .optional())
const validacionActualizar = [
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío.'),
    body('correo').optional().isEmail().withMessage('Ingresa un correo válido.').normalizeEmail()
];

// NUEVO: Reglas para cambio de contraseña
const validacionCambiarPassword = [
    body('passwordActual').notEmpty().withMessage('La contraseña actual es obligatoria.'),
    body('passwordNueva').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.')
];

// ==========================================
// RUTA 1: REGISTRO
// ==========================================
router.post('/registro', validacionRegistro, async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    try {
        const { nombre, correo, password, rol } = req.body;

        const existeUsuario = usuariosMock.find(user => user.correo === correo);
        if (existeUsuario) return res.status(400).json({ error: "El correo ya está registrado." });

        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        const nuevoUsuario = {
            id: usuariosMock.length + 1,
            nombre,
            correo,
            password: passwordEncriptada,
            rol: rol || 'turista' 
        };

        usuariosMock.push(nuevoUsuario);
        res.status(201).json({
            mensaje: "¡Usuario registrado con éxito!",
            usuario: { id: nuevoUsuario.id, nombre: nuevoUsuario.nombre, correo: nuevoUsuario.correo, rol: nuevoUsuario.rol }
        });
    } catch (error) {
        res.status(500).json({ error: "Hubo un error en el servidor." });
    }
});

// ==========================================
// RUTA 2: LOGIN
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;
        const usuario = usuariosMock.find(user => user.correo === correo);
        if (!usuario) return res.status(400).json({ error: "Credenciales incorrectas." });

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecta) return res.status(400).json({ error: "Credenciales incorrectas." });

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
        console.error("ERROR LOGIN:", error);
        res.status(500).json({ error: "Hubo un error en el servidor." });
    }
});

// ==========================================
// RUTA 3: VER PERFIL
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
// RUTA 4: ACTUALIZAR PERFIL (PUT /api/usuarios/perfil/actualizar)
// ==========================================
router.put('/perfil/actualizar', verificarToken, validacionActualizar, (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    try {
        const { nombre, correo } = req.body;
        
        // Buscamos el usuario en base al ID que viene incrustado en el Token decodificado
        const usuario = usuariosMock.find(user => user.id === req.usuario.id);
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

        // Si intentan cambiar el correo, validamos que no lo tenga otra persona
        if (correo && correo !== usuario.correo) {
            const correoDuplicado = usuariosMock.find(user => user.correo === correo);
            if (correoDuplicado) return res.status(400).json({ error: "El correo ya está en uso por otro usuario." });
            usuario.correo = correo;
        }

        if (nombre) usuario.nombre = nombre;

        res.json({
            mensaje: "¡Perfil actualizado con éxito!",
            usuario: { id: usuario.id, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }
        });
    } catch (error) {
        res.status(500).json({ error: "Hubo un error en el servidor." });
    }
});

// ==========================================
// RUTA 5: CAMBIAR CONTRASEÑA (PUT /api/usuarios/perfil/cambiar-password)
// ==========================================
router.put('/perfil/cambiar-password', verificarToken, validacionCambiarPassword, async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    try {
        const { passwordActual, passwordNueva } = req.body;
        const usuario = usuariosMock.find(user => user.id === req.usuario.id);
        if (!usuario) return res.status(404).json({ error: "Usuario no encontrado." });

        // 1. Verificar si la clave actual enviada coincide con el hash en memoria
        const passwordCorrecta = await bcrypt.compare(passwordActual, usuario.password);
        if (!passwordCorrecta) return res.status(400).json({ error: "La contraseña actual es incorrecta." });

        // 2. Si todo está bien, encriptamos la nueva clave y reemplazamos
        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(passwordNueva, salt);

        res.json({ 
            mensaje: "¡Contraseña actualizada con éxito! Por seguridad, deberás iniciar sesión nuevamente." 
        });
    } catch (error) {
        res.status(500).json({ error: "Hubo un error en el servidor." });
    }
});

// ==========================================
// RUTA EXCLUSIVA: PANEL DE ADMIN
// ==========================================
router.get('/admin/panel', verificarToken, verificarRol(['admin']), (req, res) => {
    res.json({ mensaje: "¡Bienvenido, Administrador! Tienes acceso al panel de control de ManaTrip." });
});

module.exports = router;