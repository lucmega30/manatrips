const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db'); // Conexión a archivo db.js (Pool de promesas de mysql2)

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

const validacionActualizar = [
    body('nombre').optional().trim().notEmpty().withMessage('El nombre no puede estar vacío.'),
    body('correo').optional().isEmail().withMessage('Ingresa un correo válido.').normalizeEmail()
];

const validacionCambiarPassword = [
    body('passwordActual').notEmpty().withMessage('La contraseña actual es obligatoria.'),
    body('passwordNueva').isLength({ min: 6 }).withMessage('La nueva contraseña debe tener al menos 6 caracteres.')
];

// ==========================================
// RUTA 1: REGISTRO (CON PERSISTENCIA REAL)
// ==========================================
router.post('/registro', validacionRegistro, async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    try {
        const { nombre, correo, password } = req.body;

        // Verificar si el correo ya existe en MySQL
        const [existeUsuario] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        if (existeUsuario.length > 0) {
            return res.status(400).json({ error: "El correo ya está registrado." });
        }

        // Encriptar la contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        // Insertar en MySQL (el campo 'rol' tomará 'usuario' por defecto automáticamente)
        const queryInsert = 'INSERT INTO usuarios (nombre, correo, contrasena) VALUES (?, ?, ?)';
        await db.query(queryInsert, [nombre, correo, passwordEncriptada]);

        res.status(201).json({
            mensaje: "¡Usuario registrado con éxito en la base de datos de ManaTrip!"
        });
    } catch (error) {
        console.error("ERROR EN REGISTRO:", error);
        res.status(500).json({ error: "Hubo un error en el servidor al registrar el usuario." });
    }
});

// ==========================================
// RUTA 2: LOGIN (CON ROL DINÁMICO DE LA BD)
// ==========================================
router.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        // Buscar al usuario por correo en MySQL
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
        if (usuarios.length === 0) return res.status(400).json({ error: "Credenciales incorrectas." });

        const usuario = usuarios[0];

        // Comparar la contraseña con el campo 'contrasena' de la BD
        const passwordCorrecta = await bcrypt.compare(password, usuario.contrasena);
        if (!passwordCorrecta) return res.status(400).json({ error: "Credenciales incorrectas." });

        // Generar Token JWT usando el rol real que Emilio guardó ('admin' o 'usuario')
        const token = jwt.sign(
            { id: usuario.id_usuario, nombre: usuario.nombre, rol: usuario.rol },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            mensaje: "¡Inicio de sesión exitoso!",
            token,
            usuario: { id: usuario.id_usuario, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }
        });
    } catch (error) {
        console.error("ERROR LOGIN:", error);
        res.status(500).json({ error: "Hubo un error en el servidor al iniciar sesión." });
    }
});

// ==========================================
// RUTA 3: VER PERFIL
// ==========================================
router.get('/perfil', verificarToken, async (req, res) => {
    try {
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE id_usuario = ?', [req.usuario.id]);
        if (usuarios.length === 0) return res.status(404).json({ error: "Usuario no encontrado." });

        const usuario = usuarios[0];
        res.json({
            mensaje: "¡Token válido!",
            perfil: { id: usuario.id_usuario, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol }
        });
    } catch (error) {
        res.status(500).json({ error: "Hubo un error al obtener el perfil." });
    }
});

// ==========================================
// RUTA 4: ACTUALIZAR PERFIL
// ==========================================
router.put('/perfil/actualizar', verificarToken, validacionActualizar, async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    try {
        const { nombre, correo } = req.body;
        
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE id_usuario = ?', [req.usuario.id]);
        if (usuarios.length === 0) return res.status(404).json({ error: "Usuario no encontrado." });

        const usuarioActual = usuarios[0];
        let nuevoCorreo = correo || usuarioActual.correo;
        let nuevoNombre = nombre || usuarioActual.nombre;

        if (correo && correo !== usuarioActual.correo) {
            const [correoDuplicado] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
            if (correoDuplicado.length > 0) {
                return res.status(400).json({ error: "El correo ya está en uso por otro usuario." });
            }
        }

        await db.query('UPDATE usuarios SET nombre = ?, correo = ? WHERE id_usuario = ?', [nuevoNombre, nuevoCorreo, req.usuario.id]);

        res.json({
            mensaje: "¡Perfil actualizado con éxito en la base de datos!",
            usuario: { id: req.usuario.id, nombre: nuevoNombre, correo: nuevoCorreo, rol: usuarioActual.rol }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Hubo un error al actualizar el perfil." });
    }
});

// ==========================================
// RUTA 5: CAMBIAR CONTRASEÑA
// ==========================================
router.put('/perfil/cambiar-password', verificarToken, validacionCambiarPassword, async (req, res) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) return res.status(400).json({ errores: errores.array() });

    try {
        const { passwordActual, passwordNueva } = req.body;
        
        const [usuarios] = await db.query('SELECT * FROM usuarios WHERE id_usuario = ?', [req.usuario.id]);
        if (usuarios.length === 0) return res.status(404).json({ error: "Usuario no encontrado." });

        const usuario = usuarios[0];

        const passwordCorrecta = await bcrypt.compare(passwordActual, usuario.contrasena);
        if (!passwordCorrecta) return res.status(400).json({ error: "La contraseña actual es incorrecta." });

        const salt = await bcrypt.genSalt(10);
        const nuevaPasswordEncriptada = await bcrypt.hash(passwordNueva, salt);

        await db.query('UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?', [nuevaPasswordEncriptada, req.usuario.id]);

        res.json({ 
            mensaje: "¡Contraseña actualizada con éxito! Por seguridad, deberás iniciar sesión nuevamente." 
        });
    } catch (error) {
        res.status(500).json({ error: "Hubo un error en el servidor al cambiar la contraseña." });
    }
});

// ==========================================
// RUTA EXCLUSIVA: PANEL DE ADMIN
// ==========================================
router.get('/admin/panel', verificarToken, verificarRol(['admin']), (req, res) => {
    res.json({ mensaje: "¡Bienvenido, Administrador! Tienes acceso al panel de control de ManaTrip." });
});

module.exports = router;