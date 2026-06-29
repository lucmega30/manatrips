const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Nuestra "Base de Datos" temporal en memoria
const usuariosMock = [];

// ¡MEJORA DE SEGURIDAD!: Leemos la clave secreta directamente desde el archivo .env
const JWT_SECRET = process.env.JWT_SECRET;

// ==========================================
// MIDDLEWARE: El Guardián de las rutas
// ==========================================
function verificarToken(req, res, next) {
    // Buscamos el token en las cabeceras de la petición (Authorization)
    const tokenHeader = req.header('Authorization');
    
    if (!tokenHeader) {
        return res.status(401).json({ error: "Acceso denegado. No se proporcionó un token." });
    }

    // El formato estándar es "Bearer TOKEN_AQUÍ", así que limpiamos el texto
    const token = tokenHeader.replace('Bearer ', '');

    try {
        // Verificamos si el token es real y fue firmado con nuestra clave secreta
        const verificado = jwt.verify(token, JWT_SECRET);
        
        // Guardamos los datos decodificados del usuario dentro de la petición (req)
        req.usuario = verificado; 
        
        next(); // ¡Todo bien! Le permitimos pasar a la ruta real
    } catch (error) {
        res.status(401).json({ error: "Token inválido o expirado." });
    }
}

// ==========================================
// 1. RUTA DE REGISTRO (POST /api/usuarios/registro)
// ==========================================
router.post('/registro', async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;

        if (!nombre || !correo || !password) {
            return res.status(400).json({ error: "Todos los campos son obligatorios." });
        }

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
router.post('/login', async (req, res) => {
    try {
        const { correo, password } = req.body;

        if (!correo || !password) {
            return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
        }

        const usuario = usuariosMock.find(user => user.correo === correo);
        if (!usuario) {
            return res.status(400).json({ error: "Credenciales incorrectas." });
        }

        const passwordCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecta) {
            return res.status(400).json({ error: "Credenciales incorrectas." });
        }

        // Firmamos el token incluyendo el ID y el nombre del usuario
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
// Nota cómo agregamos 'verificarToken' antes de la función de la ruta
router.get('/perfil', verificarToken, (req, res) => {
    // Si el middleware lo dejó pasar, req.usuario contiene los datos del token
    const usuario = usuariosMock.find(user => user.id === req.usuario.id);
    
    if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado." });
    }

    res.json({
        mensaje: "¡Petición exitosa! El guardián validó tu token nítidamente.",
        perfil: {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo
        }
    });
});

module.exports = router;