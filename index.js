const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'src')));

// Ruta de prueba
app.get('/api', (req, res) => {
  res.json({ mensaje: 'ManaTrips API funcionando correctamente' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});