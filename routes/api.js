// routes/api.js  -  Endpoints REST de solo lectura (por ahora) contra Biblioteca_Quito.
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

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
// Conteos para el Dashboard (una sola consulta con subconsultas)
router.get('/dashboard', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM LIBRO)                                          AS libros,
        (SELECT COUNT(*) FROM ESTUDIANTE)                                     AS estudiantes,
        (SELECT COUNT(*) FROM EJEMPLAR_Operacion WHERE estado = 'DISPONIBLE') AS ejemplares_disponibles,
        (SELECT COUNT(*) FROM PRESTAMO WHERE estado = 'ACTIVO')               AS prestamos_activos
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error dashboard:', err.message);
    res.status(500).json({ error: 'Error de base de datos', detalle: err.message });
  }
});

// Auditoria de fragmentacion del nodo local (Quito = id_sede 1)
router.get('/auditoria', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM ESTUDIANTE         WHERE id_sede <> 1)        AS estudiantes_fuera,
        (SELECT COUNT(*) FROM EJEMPLAR_Operacion WHERE id_sede <> 1)        AS ejemplares_fuera,
        (SELECT COUNT(*) FROM PRESTAMO           WHERE id_sede_origen <> 1) AS prestamos_fuera,
        (SELECT COUNT(*) FROM SEDE)                                         AS total_sedes,
        (SELECT COUNT(*) FROM LIBRO)                                        AS total_libros
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error auditoria:', err.message);
    res.status(500).json({ error: 'Error de base de datos', detalle: err.message });
  }
});

// ===== CRUD de EJEMPLAR_Identificacion (fragmentación vertical, local Quito) =====

// CREAR
router.post('/ejemplares-identificacion', async (req, res) => {
  const { id_libro, nro_ejemplar, codigo_ejemplar } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id_libro', sql.Int, id_libro)
      .input('nro_ejemplar', sql.Int, nro_ejemplar)
      .input('codigo_ejemplar', sql.VarChar(100), codigo_ejemplar)
      .query(`INSERT INTO EJEMPLAR_Identificacion (id_libro, nro_ejemplar, codigo_ejemplar)
              VALUES (@id_libro, @nro_ejemplar, @codigo_ejemplar)`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ACTUALIZAR (el código de un ejemplar existente)
router.put('/ejemplares-identificacion', async (req, res) => {
  const { id_libro, nro_ejemplar, codigo_ejemplar } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id_libro', sql.Int, id_libro)
      .input('nro_ejemplar', sql.Int, nro_ejemplar)
      .input('codigo_ejemplar', sql.VarChar(100), codigo_ejemplar)
      .query(`UPDATE EJEMPLAR_Identificacion SET codigo_ejemplar = @codigo_ejemplar
              WHERE id_libro = @id_libro AND nro_ejemplar = @nro_ejemplar`);
    res.json({ ok: true, filas: r.rowsAffected[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ELIMINAR
router.delete('/ejemplares-identificacion', async (req, res) => {
  const { id_libro, nro_ejemplar } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id_libro', sql.Int, id_libro)
      .input('nro_ejemplar', sql.Int, nro_ejemplar)
      .query(`DELETE FROM EJEMPLAR_Identificacion
              WHERE id_libro = @id_libro AND nro_ejemplar = @nro_ejemplar`);
    res.json({ ok: true, filas: r.rowsAffected[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== CRUD de LIBRO (replicado: solo se escribe en Quito) =====
router.post('/libros', async (req, res) => {
  const { titulo, autor, categoria } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('titulo', sql.VarChar(200), titulo)
      .input('autor', sql.VarChar(150), autor)
      .input('categoria', sql.VarChar(100), categoria)
      .query(`INSERT INTO LIBRO (titulo, autor, categoria)
              OUTPUT INSERTED.id_libro
              VALUES (@titulo, @autor, @categoria)`);
    res.json({ ok: true, id_libro: r.recordset[0].id_libro });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/libros', async (req, res) => {
  const { id_libro, titulo, autor, categoria } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id_libro', sql.Int, id_libro)
      .input('titulo', sql.VarChar(200), titulo)
      .input('autor', sql.VarChar(150), autor)
      .input('categoria', sql.VarChar(100), categoria)
      .query(`UPDATE LIBRO SET titulo=@titulo, autor=@autor, categoria=@categoria
              WHERE id_libro=@id_libro`);
    res.json({ ok: true, filas: r.rowsAffected[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/libros', async (req, res) => {
  const { id_libro } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id_libro', sql.Int, id_libro)
      .query(`DELETE FROM LIBRO WHERE id_libro=@id_libro`);
    res.json({ ok: true, filas: r.rowsAffected[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== CRUD de SEDE (replicado: solo se escribe en Quito) =====
router.post('/sedes', async (req, res) => {
  const { id_sede, nombre, ciudad } = req.body;
  try {
    const pool = await getPool();
    await pool.request()
      .input('id_sede', sql.Int, id_sede)
      .input('nombre', sql.VarChar(150), nombre)
      .input('ciudad', sql.VarChar(100), ciudad)
      .query(`INSERT INTO SEDE (id_sede, nombre, ciudad) VALUES (@id_sede, @nombre, @ciudad)`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/sedes', async (req, res) => {
  const { id_sede, nombre, ciudad } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id_sede', sql.Int, id_sede)
      .input('nombre', sql.VarChar(150), nombre)
      .input('ciudad', sql.VarChar(100), ciudad)
      .query(`UPDATE SEDE SET nombre=@nombre, ciudad=@ciudad WHERE id_sede=@id_sede`);
    res.json({ ok: true, filas: r.rowsAffected[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/sedes', async (req, res) => {
  const { id_sede } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id_sede', sql.Int, id_sede)
      .query(`DELETE FROM SEDE WHERE id_sede=@id_sede`);
    res.json({ ok: true, filas: r.rowsAffected[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
