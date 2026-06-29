const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Nuestra "Base de Datos" temporal en memoria
const usuariosMock = [];

// Una clave secreta para firmar los tokens JWT (En producción irá en el archivo .env)
const JWT_SECRET = "clave_secreta_temporal_manatrip";

// ==========================================
// 1. RUTA DE REGISTRO (POST /api/usuarios/registro)
// ==========================================
router.post('/registro', async (req, res) => {
    try {
        const { nombre, correo, password } = req.body;

        // Validación básica: que no vengan campos vacíos
        if (!nombre || !correo || !password) {
            return res.status(400).json({ error: "Todos los campos son obligatorios." });
        }

        // Verificar si el correo ya está registrado en nuestra lista ficticia
        const existeUsuario = usuariosMock.find(user => user.correo === correo);
        if (existeUsuario) {
            return res.status(400).json({ error: "El correo ya está registrado." });
        }

        // ¡PROCESO DE SEGURIDAD!: Encriptar la contraseña con Bcrypt
        // Generamos un 'salt' de 10 rondas y luego hashamos la clave
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        // Crear el nuevo usuario con la contraseña protegida
        const nuevoUsuario = {
            id: usuariosMock.length + 1,
            nombre,
            correo,
            password: passwordEncriptada // Guardamos el hash, NUNCA la clave limpia
        };

        // Guardarlo en nuestro arreglo temporal
        usuariosMock.push(nuevoUsuario);

        // Responder al frontend con éxito (sin mostrar la contraseña)
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

        // Validación básica
        if (!correo || !password) {
            return res.status(400).json({ error: "Correo y contraseña son obligatorios." });
        }

        // Buscar al usuario por su correo
        const usuario = usuariosMock.find(user => user.correo === correo);
        if (!usuario) {
            return res.status(400).json({ error: "Credenciales incorrectas (correo no encontrado)." });
        }

        // ¡PROCESO DE SEGURIDAD!: Comparar la contraseña ingresada con la encriptada
        const passwordCorrecta = await bcrypt.compare(password, usuario.password);
        if (!passwordCorrecta) {
            return res.status(400).json({ error: "Credenciales incorrectas (contraseña inválida)." });
        }

        // ¡GENERACIÓN DE TOKEN!: Si todo está bien, creamos un JSON Web Token (JWT)
        // El token llevará el ID del usuario como carga útil (payload)
        const token = jwt.sign(
            { id: usuario.id, nombre: usuario.nombre },
            JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora por seguridad
        );

        // Enviar el token al frontend
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

module.exports = router;