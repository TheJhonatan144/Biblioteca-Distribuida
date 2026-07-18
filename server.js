// server.js  -  Punto de entrada del backend.
const express = require('express');
const path = require('path');
const cors = require('cors');
const api = require('./routes/api');

const app = express();

app.use(cors());
app.use(express.json());

// API REST bajo /api
app.use('/api', api);

// Sirve el front-end (index.html, script.js, styles.css) desde /public
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('--------------------------------------------------');
  console.log('  Servidor Biblioteca corriendo');
  console.log('  Front-end:  http://localhost:' + PORT);
  console.log('  API salud:  http://localhost:' + PORT + '/api/health');
  console.log('  API BD:     http://localhost:' + PORT + '/api/db-check');
  console.log('--------------------------------------------------');
});
