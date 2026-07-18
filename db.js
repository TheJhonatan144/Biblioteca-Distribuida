// db.js  -  Conexion a SQL Server con un unico pool reutilizable.
const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: false,               // en local no se cifra
    trustServerCertificate: true, // acepta el certificado autofirmado de SQL Server dev
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

// Instancia nombrada o puerto estatico (opcionales)
if (process.env.DB_INSTANCE) config.options.instanceName = process.env.DB_INSTANCE;
if (process.env.DB_PORT) config.port = parseInt(process.env.DB_PORT, 10);

let poolPromise;

// Devuelve el pool ya conectado (lo crea una sola vez).
function getPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(config)
      .then((pool) => {
        console.log('OK - Conectado a SQL Server, base:', process.env.DB_NAME);
        return pool;
      })
      .catch((err) => {
        poolPromise = undefined; // permite reintentar en la proxima peticion
        throw err;
      });
  }
  return poolPromise;
}

module.exports = { sql, getPool };
