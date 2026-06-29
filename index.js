const express = require('express');
const cors = require('cors'); 
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

app.listen(PORT, () => {
    console.log(`Servidor backend de ManaTrip corriendo en http://localhost:${PORT}`);
});