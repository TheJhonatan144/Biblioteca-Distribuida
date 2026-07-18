// routes/api.js  -  Endpoints REST de solo lectura (por ahora) contra Biblioteca_Quito.
const express = require('express');
const router = express.Router();
const { getPool } = require('../db');

// Helper: ejecuta una consulta y devuelve el arreglo de filas como JSON.
async function consultar(res, sqlText) {
  try {
    const pool = await getPool();
    const resultado = await pool.request().query(sqlText);
    res.json(resultado.recordset);
  } catch (err) {
    console.error('Error de consulta:', err.message);
    res.status(500).json({ error: 'Error de base de datos', detalle: err.message });
  }
}

// --- Pruebas de vida / conexion ---
router.get('/health', (req, res) => {
  res.json({ ok: true, hora: new Date().toISOString() });
});

router.get('/db-check', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query('SELECT DB_NAME() AS base, @@SERVERNAME AS servidor');
    res.json({ ok: true, ...r.recordset[0] });
  } catch (err) {
    res.status(500).json({ ok: false, detalle: err.message });
  }
});

// --- Tablas del nodo Quito ---
router.get('/sedes', (req, res) =>
  consultar(res, 'SELECT id_sede, nombre, ciudad FROM SEDE ORDER BY id_sede'));

router.get('/libros', (req, res) =>
  consultar(res, 'SELECT id_libro, titulo, autor, categoria FROM LIBRO ORDER BY id_libro'));

router.get('/estudiantes', (req, res) =>
  consultar(res, 'SELECT id_estudiante, nombre, carrera, correo, id_sede FROM ESTUDIANTE ORDER BY id_estudiante'));

router.get('/ejemplares-operacion', (req, res) =>
  consultar(res, 'SELECT id_libro, nro_ejemplar, id_sede, estado FROM EJEMPLAR_Operacion ORDER BY id_libro, nro_ejemplar'));

router.get('/ejemplares-identificacion', (req, res) =>
  consultar(res, 'SELECT id_libro, nro_ejemplar, codigo_ejemplar FROM EJEMPLAR_Identificacion ORDER BY id_libro, nro_ejemplar'));

router.get('/prestamos', (req, res) =>
  consultar(res, `SELECT id_prestamo, fecha_prestamo, fecha_devolucion, estado, tipo_prestamo,
                         id_estudiante, id_libro, nro_ejemplar, id_sede_origen, id_sede_proveedora
                  FROM PRESTAMO ORDER BY id_prestamo`));

module.exports = router;
