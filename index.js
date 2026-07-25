const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES GLOBALES
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.static('src'));

// ==========================================
// RUTAS DE LA API (BACKEND)
// ==========================================
const rutasUsuarios = require('./backend/routes/usuarios');
app.use('/api/usuarios', rutasUsuarios);

const rutasDestinos = require('./backend/routes/destinos');
app.use('/api/destinos', rutasDestinos);

const rutasReservas = require('./backend/routes/reservas');
app.use('/api/reservas', rutasReservas);

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ mensaje: 'ManaTrips API funcionando correctamente' });
});

// Ruta login
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'login.html'));
});

app.get('/registro', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'registro.html'));
});

app.get('/contacto', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'contacto.html'));
});

app.get('/destinos', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'destinos.html'));
});

app.get('/perfil', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'perfil.html'));
});

app.get('/destino/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'views', 'destino-detalle.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor backend de ManaTrip corriendo en http://localhost:${PORT}`);
});