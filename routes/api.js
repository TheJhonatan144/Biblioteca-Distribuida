// routes/api.js  -  Endpoints REST. Compatible con ambos nodos (Quito y Guayaquil).
const express = require('express');
const router = express.Router();
const { sql, getPool } = require('../db');

// ===== Configuración del nodo =====
// Sede de este nodo (1 = Quito, 2 = Guayaquil). Se lee del .env; por defecto 1.
const NODO_SEDE = parseInt(process.env.DB_SEDE || '1', 10);
const esQuito = NODO_SEDE === 1;

// Nombres de tabla según el nodo (Quito sin sufijo, Guayaquil con sufijo _Guayaquil).
const T = {
  operacion:  esQuito ? 'EJEMPLAR_Operacion_Quito' : 'EJEMPLAR_Operacion_Guayaquil',
  estudiante: esQuito ? 'ESTUDIANTE_Quito'         : 'ESTUDIANTE_Guayaquil',
  prestamo:   esQuito ? 'PRESTAMO_Quito'           : 'PRESTAMO_Guayaquil',
};

// Ruta a la identificacion (vertical, centralizada en Quito):
//  - En Quito: local.   - En Guayaquil: remota via linked server JHONATAN.
const RUTA_IDENT = esQuito
  ? 'Biblioteca_Quito.dbo.EJEMPLAR_Identificacion'
  : 'JHONATAN.Biblioteca_Quito.dbo.EJEMPLAR_Identificacion';

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

// ===== LECTURA de tablas =====
router.get('/sedes', (req, res) =>
  consultar(res, 'SELECT id_sede, nombre, ciudad FROM SEDE ORDER BY id_sede'));

router.get('/libros', (req, res) =>
  consultar(res, 'SELECT id_libro, titulo, autor, categoria FROM LIBRO ORDER BY id_libro'));

router.get('/estudiantes', (req, res) =>
  consultar(res, `SELECT id_estudiante, nombre, carrera, correo, id_sede FROM ${T.estudiante} ORDER BY id_estudiante`));

router.get('/ejemplares-operacion', (req, res) =>
  consultar(res, `SELECT id_libro, nro_ejemplar, id_sede, estado FROM ${T.operacion} ORDER BY id_libro, nro_ejemplar`));

router.get('/prestamos', (req, res) =>
  consultar(res, `SELECT id_prestamo, fecha_prestamo, fecha_devolucion, estado, tipo_prestamo,
                         id_estudiante, id_libro, nro_ejemplar, id_sede_origen, id_sede_proveedora
                  FROM ${T.prestamo} ORDER BY id_prestamo`));

// EJEMPLAR_Identificacion está centralizada en Quito. En Guayaquil devuelve vacío.
router.get('/ejemplares-identificacion', (req, res) => {
  if (!esQuito) return res.json([]);
  return consultar(res, 'SELECT id_libro, nro_ejemplar, codigo_ejemplar FROM EJEMPLAR_Identificacion ORDER BY id_libro, nro_ejemplar');
});

// ===== Dashboard (conteos reales del nodo) =====
router.get('/dashboard', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM LIBRO)                                     AS libros,
        (SELECT COUNT(*) FROM ${T.estudiante})                          AS estudiantes,
        (SELECT COUNT(*) FROM ${T.operacion} WHERE estado='DISPONIBLE') AS ejemplares_disponibles,
        (SELECT COUNT(*) FROM ${T.prestamo}  WHERE estado='ACTIVO')     AS prestamos_activos
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error dashboard:', err.message);
    res.status(500).json({ error: 'Error de base de datos', detalle: err.message });
  }
});

// ===== Auditoría de fragmentación del nodo local =====
router.get('/auditoria', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT
        (SELECT COUNT(*) FROM ${T.estudiante} WHERE id_sede <> ${NODO_SEDE})       AS estudiantes_fuera,
        (SELECT COUNT(*) FROM ${T.operacion}  WHERE id_sede <> ${NODO_SEDE})       AS ejemplares_fuera,
        (SELECT COUNT(*) FROM ${T.prestamo}   WHERE id_sede_origen <> ${NODO_SEDE}) AS prestamos_fuera,
        (SELECT COUNT(*) FROM SEDE)                                                AS total_sedes,
        (SELECT COUNT(*) FROM LIBRO)                                               AS total_libros
    `);
    res.json(result.recordset[0]);
  } catch (err) {
    console.error('Error auditoria:', err.message);
    res.status(500).json({ error: 'Error de base de datos', detalle: err.message });
  }
});

// ===== CRUD de EJEMPLAR_Identificacion (fragmentación vertical, solo Quito) =====
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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
  } catch (err) { res.status(500).json({ error: err.message }); }
});

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
  } catch (err) { res.status(500).json({ error: err.message }); }
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

// ===== CRUD de ESTUDIANTE (fragmentación horizontal, local al nodo) =====
router.post('/estudiantes', async (req, res) => {
  const { nombre, carrera, correo } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('nombre', sql.VarChar(150), nombre)
      .input('carrera', sql.VarChar(150), carrera)
      .input('correo', sql.VarChar(150), correo)
      .input('id_sede', sql.Int, NODO_SEDE)
      .query(`INSERT INTO ${T.estudiante} (nombre, carrera, correo, id_sede)
              OUTPUT INSERTED.id_estudiante
              VALUES (@nombre, @carrera, @correo, @id_sede)`);
    res.json({ ok: true, id_estudiante: r.recordset[0].id_estudiante });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/estudiantes', async (req, res) => {
  const { id_estudiante, nombre, carrera, correo } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id_estudiante', sql.Int, id_estudiante)
      .input('nombre', sql.VarChar(150), nombre)
      .input('carrera', sql.VarChar(150), carrera)
      .input('correo', sql.VarChar(150), correo)
      .query(`UPDATE ${T.estudiante} SET nombre=@nombre, carrera=@carrera, correo=@correo
              WHERE id_estudiante=@id_estudiante`);
    res.json({ ok: true, filas: r.rowsAffected[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/estudiantes', async (req, res) => {
  const { id_estudiante } = req.body;
  try {
    const pool = await getPool();
    const r = await pool.request()
      .input('id_estudiante', sql.Int, id_estudiante)
      .query(`DELETE FROM ${T.estudiante} WHERE id_estudiante=@id_estudiante`);
    res.json({ ok: true, filas: r.rowsAffected[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== EJEMPLARES: pantalla unificada (registro dividido en 2 fragmentos, atomico) =====

// GET: listado GLOBAL desde la vista particionada + codigo de la identificacion (Quito).
router.get('/ejemplares-global', async (req, res) => {
  try {
    const pool = await getPool();
    const r = await pool.request().query(`
      SELECT v.id_libro, v.nro_ejemplar, v.id_sede, v.estado, i.codigo_ejemplar
      FROM V_EJEMPLAR_Operacion_Global v
      LEFT JOIN ${RUTA_IDENT} i
        ON i.id_libro = v.id_libro AND i.nro_ejemplar = v.nro_ejemplar
      ORDER BY v.id_sede, v.id_libro, v.nro_ejemplar
    `);
    res.json(r.recordset);
  } catch (err) {
    console.error('Error ejemplares-global:', err.message);
    res.status(500).json({ error: 'Error de base de datos', detalle: err.message });
  }
});

// POST: REGISTRAR un ejemplar completo en UNA transaccion distribuida.
//  Todo en un solo batch: SET XACT_ABORT ON + BEGIN DISTRIBUTED TRANSACTION + 2 INSERT + COMMIT.
//  (1) codigo_ejemplar -> identificacion en Quito (fragmento VERTICAL, ruta completa)
//  (2) id_sede + estado -> vista particionada (fragmento MIXTO, la vista enruta)
router.post('/ejemplares-global', async (req, res) => {
  const { id_libro, nro_ejemplar, id_sede, codigo_ejemplar, estado } = req.body;
  if (!id_libro || !nro_ejemplar || !id_sede || !codigo_ejemplar || !estado) {
    return res.status(400).json({ error: 'Faltan datos: se requieren id_libro, nro_ejemplar, id_sede, codigo_ejemplar y estado.' });
  }
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('il', sql.Int, id_libro);
    request.input('ne', sql.Int, nro_ejemplar);
    request.input('is', sql.Int, id_sede);
    request.input('cod', sql.VarChar(100), codigo_ejemplar);
    request.input('est', sql.VarChar(20), estado);
    await request.query(`
      SET XACT_ABORT ON;
      BEGIN DISTRIBUTED TRANSACTION;
        INSERT INTO ${RUTA_IDENT} (id_libro, nro_ejemplar, codigo_ejemplar)
        VALUES (@il, @ne, @cod);
        INSERT INTO V_EJEMPLAR_Operacion_Global (id_libro, nro_ejemplar, id_sede, estado)
        VALUES (@il, @ne, @is, @est);
      COMMIT TRANSACTION;
    `);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error registro ejemplar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT: ACTUALIZAR un ejemplar (código en Quito + estado en la vista) — atómico.
router.put('/ejemplares-global', async (req, res) => {
  const { id_libro, nro_ejemplar, id_sede, codigo_ejemplar, estado } = req.body;
  if (!id_libro || !nro_ejemplar || !id_sede) {
    return res.status(400).json({ error: 'Se requieren id_libro, nro_ejemplar e id_sede.' });
  }
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('il', sql.Int, id_libro);
    request.input('ne', sql.Int, nro_ejemplar);
    request.input('is', sql.Int, id_sede);
    request.input('cod', sql.VarChar(100), codigo_ejemplar);
    request.input('est', sql.VarChar(20), estado);
    const r = await request.query(`
      SET XACT_ABORT ON;
      BEGIN DISTRIBUTED TRANSACTION;
        UPDATE ${RUTA_IDENT} SET codigo_ejemplar = @cod
        WHERE id_libro = @il AND nro_ejemplar = @ne;
        UPDATE V_EJEMPLAR_Operacion_Global SET estado = @est
        WHERE id_libro = @il AND nro_ejemplar = @ne AND id_sede = @is;
      COMMIT TRANSACTION;
    `);
    // rowsAffected trae un conteo por sentencia DML del batch: [0]=UPDATE identificacion, [1]=UPDATE vista.
    const filasCodigo = r.rowsAffected[0] || 0;
    const filasEstado = r.rowsAffected[1] || 0;
    if (filasCodigo === 0 && filasEstado === 0) {
      return res.status(404).json({
        error: 'No existe ningun ejemplar con ese id_libro, nro_ejemplar e id_sede.',
        filasCodigo, filasEstado,
      });
    }
    res.json({ ok: true, filasCodigo, filasEstado });
  } catch (err) {
    console.error('Error update ejemplar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE: ELIMINAR un ejemplar completo (operacion via vista + identificacion en Quito) — atómico.
router.delete('/ejemplares-global', async (req, res) => {
  const { id_libro, nro_ejemplar, id_sede } = req.body;
  if (!id_libro || !nro_ejemplar || !id_sede) {
    return res.status(400).json({ error: 'Se requieren id_libro, nro_ejemplar e id_sede.' });
  }
  try {
    const pool = await getPool();
    const request = pool.request();
    request.input('il', sql.Int, id_libro);
    request.input('ne', sql.Int, nro_ejemplar);
    request.input('is', sql.Int, id_sede);
    await request.query(`
      SET XACT_ABORT ON;
      BEGIN DISTRIBUTED TRANSACTION;
        DELETE FROM V_EJEMPLAR_Operacion_Global
        WHERE id_libro = @il AND nro_ejemplar = @ne AND id_sede = @is;
        DELETE FROM ${RUTA_IDENT}
        WHERE id_libro = @il AND nro_ejemplar = @ne;
      COMMIT TRANSACTION;
    `);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error delete ejemplar:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;