# Backend — Sistema Bibliotecario Distribuido (nodo Quito)

Backend en **Node.js + Express** que se conecta a **SQL Server** (`Biblioteca_Quito`) y sirve el front-end. Por ahora expone endpoints de **lectura** y ya deja **dos pantallas conectadas de verdad**: *Sedes y Libros* y *Estudiantes*.

## Requisitos

- **Node.js 18 o superior** — descárgalo de https://nodejs.org (versión LTS). Instálalo con las opciones por defecto.
- Tu SQL Server con `Biblioteca_Quito`, en **modo mixto** y el login `sa` habilitado (ya lo tienes).

## Pasos para correrlo

1. Descomprime esta carpeta donde quieras (por ejemplo `Documentos/biblioteca-backend`).

2. Crea el archivo de configuración: copia `.env.example` y renómbralo a **`.env`**. Ábrelo y pon tus datos reales:
   ```
   DB_SERVER=localhost
   DB_NAME=Biblioteca_Quito
   DB_USER=sa
   DB_PASSWORD=tu_contraseña_real
   ```
   - Si tu SQL Server es una **instancia nombrada** (ej. `EQUIPO\SQLEXPRESS`), pon `DB_SERVER=localhost` y descomenta `DB_INSTANCE=SQLEXPRESS`.
   - Si conoces el **puerto** (normalmente 1433), puedes usar `DB_PORT=1433` en lugar de la instancia.

3. Abre una terminal **dentro de la carpeta** y ejecuta:
   ```
   npm install
   npm start
   ```

4. Verás en la consola `OK - Conectado a SQL Server`. Abre el navegador en:
   - App:  http://localhost:3000
   - Prueba de vida:  http://localhost:3000/api/health
   - Prueba de BD:  http://localhost:3000/api/db-check
   - Datos reales:  http://localhost:3000/api/sedes

5. En la app, entra (Sede = Quito), ve a **Sedes y Libros** y a **Estudiantes**: esas tablas ahora salen de tu base de datos real.

## Si algo falla

- **`Login failed for user 'sa'`** → revisa `DB_PASSWORD` en `.env`, y que `sa` esté habilitado.
- **`Failed to connect ... instance`** → es instancia nombrada: usa `DB_INSTANCE=` o `DB_PORT=`. Verifica también que **TCP/IP** esté habilitado en SQL Server Configuration Manager.
- **La pantalla muestra "No se pudo conectar con el servidor"** → el backend no está corriendo (`npm start`) o el `.env` está mal.
- **`npm` no se reconoce** → falta instalar Node.js o reiniciar la terminal tras instalarlo.

## Qué sigue (con Claude)

- Conectar el resto de pantallas (Préstamos, Ejemplares, Dashboard con conteos reales).
- Endpoints de escritura (crear/editar/eliminar) con consultas parametrizadas.
- Segunda conexión al nodo Guayaquil y el préstamo remoto vía la vista particionada.

## Estructura

```
biblioteca-backend/
├── public/            (front-end: index.html, styles.css, script.js)
├── routes/
│   └── api.js         (endpoints REST)
├── db.js              (conexión a SQL Server)
├── server.js          (servidor Express)
├── .env.example       (copia a .env con tus datos)
├── package.json
└── README.md
```
