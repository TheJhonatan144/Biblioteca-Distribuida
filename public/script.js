const state = {
  node: localStorage.getItem('sbd-node') || 'Quito',
  role: localStorage.getItem('sbd-role') || 'Administrador',
};

// ===== Helper de API =====
// Llama al backend (mismo origen). Si algo falla, lanza error para que
// la pantalla muestre un aviso en vez de romperse.
async function apiGet(path) {
  const r = await fetch('/api' + path);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}
// Aviso reutilizable cuando el nodo Guayaquil aun no esta conectado.
function guardGuayaquil() {
  return state.node === 'Guayaquil'
    ? '<div class="note">El nodo Guayaquil se conectara mas adelante (cuando enlacemos su base). Por ahora prueba en modo <b>Quito</b>; los datos mostrados provienen de Biblioteca_Quito.</div><br />'
    : '';
}
function errorBox(msg) {
  return `<div class="note">⚠ ${msg}</div>`;
}

const otherNode = () => state.node === 'Quito' ? 'Guayaquil' : 'Quito';
const nodeCode = () => state.node === 'Quito' ? 'Quito' : 'Guayaquil';
const icon = (symbol) => `<span class="nav-icon">${symbol}</span>`;

const routes = [
  { id: 'dashboard', label: 'Dashboard', icon: '□' },
  { id: 'sede-libro', label: 'Sedes y Libros', icon: '≡' },
  { id: 'estudiantes', label: 'Estudiantes', icon: '♙' },
  { id: 'prestamos', label: 'Préstamos', icon: '▣' },
  { id: 'ejemplares-identificacion', label: 'Ejemplares · Identificación', icon: '#' },
  { id: 'ejemplares-operacion', label: 'Ejemplares · Operación', icon: '⌁' },
  { id: 'consulta-remota', label: 'Disponibilidad / Auditoría', icon: '◎' },
];

function techCard(rows) {
  return `
    <aside class="card tech-card">
      <div class="label">• Etiqueta técnica</div>
      ${rows.map(([k, v]) => `<div class="tech-row"><b>${k}</b><span>${v}</span></div>`).join('')}
    </aside>
  `;
}

function field(label, value = '', type = 'text', readonly = false) {
  return `<div class="field"><label>${label}</label><input class="input" type="${type}" value="${value}" placeholder="Escribe aquí..." ${readonly ? 'readonly' : ''} /></div>`;
}
function selectField(label, options, selected) {
  return `<div class="field"><label>${label}</label><select class="select">${options.map(o => `<option ${o === selected ? 'selected' : ''}>${o}</option>`).join('')}</select></div>`;
}
function actions(list) {
  return `<div class="actions">${list.map((b, i) => `<button class="btn ${i === 0 ? 'btn-primary' : 'btn-secondary'}">${b}</button>`).join('')}</div>`;
}
function table(headers, rows) {
  return `<div class="card table-card"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function chip(text) { return `<span class="chip">• ${text}</span>`; }

function shell(content, active = 'dashboard') {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand"><div class="brand-mark">S</div><div><h1>SBD · Biblioteca</h1><small>QUITO · GUAYAQUIL</small></div></div>
        <div class="sidebar-section">Módulos</div>
        <nav class="nav">
          ${routes.map(r => `<button class="nav-link ${active === r.id ? 'active' : ''}" onclick="go('${r.id}')">${icon(r.icon)} ${r.label}</button>`).join('')}
        </nav>
        <div class="sidebar-spacer"></div>
        <button class="nav-link logout-link" onclick="go('login')">${icon('×')} Cerrar sesión</button>
      </aside>
      <section class="main-area">
        <header class="topbar">
          <div class="top-kicker">Sistema Bibliotecario</div>
          <div class="top-actions">
            <div class="node-toggle">
              <button class="node-btn ${state.node === 'Quito' ? 'active' : ''}" onclick="setNode('Quito')">Quito</button>
              <button class="node-btn ${state.node === 'Guayaquil' ? 'active' : ''}" onclick="setNode('Guayaquil')">Guayaquil</button>
            </div>
            <span class="status-pill"><span class="dot"></span> Sistema activo</span>
            <span class="status-pill">${state.role}</span>
            <span class="user-badge">${state.role[0]}</span>
          </div>
        </header>
        <div class="content">${content}</div>
      </section>
    </div>`;
}

function login() {
  return `
    <section class="login-page">
      <div class="login-hero">
        <div class="brand"><div class="brand-mark">S</div><div><h1>SBD · Biblioteca</h1><small>QUITO · GUAYAQUIL</small></div></div>
        <div class="login-copy">
          <div class="page-kicker">Sistema bibliotecario</div>
          <h2>Gestión integral de biblioteca para Quito y Guayaquil.</h2>
          <p>Administra el catálogo, estudiantes, ejemplares y préstamos de la biblioteca desde una plataforma clara, elegante y fácil de usar.</p>
        </div>
        <div class="node-cards">
          <div class="node-card"><div class="metric-label">Sede principal</div><h3>Quito</h3><p class="metric-note">Administración general del catálogo</p></div>
          <div class="node-card"><div class="metric-label">Sede secundaria</div><h3>Guayaquil</h3><p class="metric-note">Atención local y préstamos</p></div>
        </div>
      </div>
      <div class="login-panel">
        <div class="login-box">
          <div class="page-kicker">01 · Login</div>
          <h2>Ingresar al sistema</h2>
          <p class="page-desc">Selecciona la sede desde la cual vas a operar.</p>
          <div class="grid">
            ${field('Usuario', 'admin')}
            ${field('Contraseña', 'biblioteca', 'password')}
            <div class="form-grid">
              ${selectField('Sede', ['Quito', 'Guayaquil'], state.node)}
              ${selectField('Rol', ['Administrador', 'Bibliotecario'], state.role)}
            </div>
            <button class="btn btn-primary full" onclick="readLoginAndGo()">Ingresar</button>
          </div>
          <br />
          ${techCard([
            ['Nodo:', 'Quito / Guayaquil'], ['Tabla:', 'No aplica'], ['Tipo de fragmentación:', 'Acceso por nodo'], ['Operaciones:', 'Selección de usuario, rol y sede de operación']
          ])}
        </div>
      </div>
    </section>`;
}

function pageHeader(kicker, title, desc) {
  return `<div class="page-kicker">${kicker}</div><h2 class="page-title">${title}</h2><p class="page-desc">${desc}</p>`;
}
function metric(label, value, note) { return `<div class="card metric-card"><div class="metric-label">${label}</div><div><div class="metric-value">${value}</div><div class="metric-note">${note}</div></div></div>`; }

async function dashboard() {
  let m = { libros: '—', estudiantes: '—', ejemplares_disponibles: '—', prestamos_activos: '—' };
  try {
    m = await apiGet('/dashboard');
  } catch (err) {
    // si el backend no responde, se quedan los guiones
  }

  const content = `
    ${pageHeader('02 · Dashboard', 'Resumen general', 'Consulta el estado actual de la biblioteca, los préstamos activos y la actividad reciente de la sede seleccionada.')}
    <div class="grid grid-4">
      ${metric('Libros en catálogo', m.libros, 'Catálogo disponible')}
      ${metric('Estudiantes registrados', m.estudiantes, state.node)}
      ${metric('Ejemplares disponibles', m.ejemplares_disponibles, 'Para préstamo')}
      ${metric('Préstamos activos', m.prestamos_activos, state.node)}
    </div>
    <br />
    <div class="layout-with-aside">
      <div>
        <h3>Actividad reciente</h3>
        ${table(['Fecha','Módulo','Acción','Sede'], [
          ['27/06/2026 10:42','Préstamos','Registro de préstamo', chip(state.node)],
          ['27/06/2026 10:18','Ejemplares','Estado actualizado a DISPONIBLE', chip(state.node)],
          ['27/06/2026 09:55','Estudiantes','Nuevo estudiante registrado', chip(state.node)],
          ['27/06/2026 09:12','Catálogo','Información actualizada', chip(otherNode())]
        ])}
      </div>
      ${techCard([
        ['Nodo:', state.node], ['Tabla:', 'SEDE, LIBRO, ESTUDIANTE, EJEMPLAR_OPERACION, PRESTAMO'], ['Tipo de fragmentación:', 'Resumen de datos distribuidos y replicados'], ['Operaciones:', 'Consultar estado general del sistema']
      ])}
    </div>`;
  return shell(content, 'dashboard');
}

// ===== PANTALLA CONECTADA A LA API: Sedes y Libros =====
async function sedeLibro() {
  const readonly = state.node === 'Guayaquil';
  const note = readonly ? 'En Guayaquil esta sección funciona en modo consulta para visualizar sedes y catálogo.' : 'En Quito se administra la información de sedes y libros del catálogo.';

  // Traer datos reales desde el backend
  let sedeTable, libroTable;
  try {
    const [sedes, libros] = await Promise.all([apiGet('/sedes'), apiGet('/libros')]);
    const sedeRows = sedes.map(s => [s.id_sede, s.nombre, s.ciudad, readonly ? 'Consultar' : 'Editar / Eliminar']);
    const libroRows = libros.map(l => [l.id_libro, l.titulo, l.autor, l.categoria, readonly ? 'Consultar' : 'Editar / Eliminar']);
    sedeTable = table(['ID sede','Nombre','Ciudad','Acciones'], sedeRows);
    libroTable = table(['ID libro','Título','Autor','Categoría','Acciones'], libroRows);
  } catch (err) {
    const aviso = errorBox('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (npm start) y que la conexión a SQL Server sea correcta.');
    sedeTable = aviso;
    libroTable = '';
  }

  const content = `
    ${pageHeader('03 · Sedes y Libros', 'Sedes y catálogo', 'Administra la información de las sedes de la biblioteca y el catálogo general de libros.')}
    ${guardGuayaquil()}
    <div class="note">${note}</div><br />
    <div class="layout-with-aside">
      <div class="grid">
        <div class="card">
          <div class="tabs"><button class="tab active">SEDE</button><button class="tab">LIBRO</button></div>
          <div class="form-grid">
            ${field('ID sede', '1')}${field('Nombre', 'Biblioteca Quito')}${field('Ciudad', state.node)}
          </div>
          ${actions(['Nuevo', 'Editar', 'Eliminar', 'Buscar', 'Guardar', 'Cancelar'])}
        </div>
        ${sedeTable}
        <div class="card">
          <div class="form-grid">
            ${field('ID libro', '101')}${field('Título', 'Fundamentos de Bases de Datos')}${field('Autor', 'Silberschatz')}${field('Categoría', 'Base de Datos')}
          </div>
          ${actions(['Nuevo', 'Editar', 'Eliminar', 'Buscar', 'Guardar', 'Cancelar'])}
        </div>
        ${libroTable}
      </div>
      ${techCard([
        ['Nodo:', 'Quito maestro / Guayaquil suscriptor'], ['Tabla:', 'SEDE y LIBRO'], ['Tipo de fragmentación:', 'Replicación transaccional'], ['Operaciones:', 'Crear, consultar, actualizar y eliminar en Quito. Solo consulta en Guayaquil.']
      ])}
    </div>`;
  return shell(content, 'sede-libro');
}

// ===== PANTALLA CONECTADA A LA API: Estudiantes =====
async function estudiantes() {
  let tablaEstudiantes;
  try {
    const data = await apiGet('/estudiantes');
    const rows = data.map(e => [
      e.id_estudiante, e.nombre, e.carrera, e.correo,
      e.id_sede === 1 ? 'Quito' : 'Guayaquil',
      'Editar / Eliminar'
    ]);
    tablaEstudiantes = rows.length
      ? table(['ID estudiante','Nombre','Carrera','Correo','Sede','Acciones'], rows)
      : errorBox('No hay estudiantes registrados en este nodo.');
  } catch (err) {
    tablaEstudiantes = errorBox('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (npm start).');
  }

  const content = `
    ${pageHeader('04 · Estudiantes', 'Gestión de estudiantes', 'Registra, consulta y actualiza la información de los estudiantes asociados a la sede seleccionada.')}
    ${guardGuayaquil()}
    <div class="layout-with-aside">
      <div class="grid">
        <div class="card">
          <div class="form-grid">
            ${field('ID estudiante')}${field('Nombre')}${field('Carrera')}${field('Correo')}${field('Sede', state.node, 'text', true)}
          </div>
          <p class="help">La sede se asigna automáticamente según la selección actual.</p>
          ${actions(['Nuevo estudiante', 'Editar', 'Eliminar', 'Buscar', 'Guardar'])}
        </div>
        ${tablaEstudiantes}
      </div>
      ${techCard([
        ['Nodo:', state.node], ['Tabla:', 'ESTUDIANTE'], ['Tipo de fragmentación:', 'Fragmentación horizontal primaria'], ['Condición Quito:', 'Estudiantes de Quito'], ['Condición Guayaquil:', 'Estudiantes de Guayaquil'], ['Operaciones:', 'Crear, consultar, actualizar y eliminar estudiantes locales']
      ])}
    </div>`;
  return shell(content, 'estudiantes');
}

async function prestamos() {
  let tablaPrestamos;
  try {
    const data = await apiGet('/prestamos');
    const rows = data.map(p => [
      p.id_prestamo,
      p.id_estudiante,
      p.id_libro,
      p.nro_ejemplar,
      p.id_sede_origen === 1 ? 'Quito' : 'Guayaquil',
      p.id_sede_proveedora === 1 ? 'Quito' : 'Guayaquil',
      chip(p.tipo_prestamo),
      chip(p.estado)
    ]);
    tablaPrestamos = rows.length
      ? table(['ID préstamo','Estudiante','Libro','Ejemplar','Sede estudiante','Sede proveedora','Tipo','Estado'], rows)
      : errorBox('No hay préstamos registrados en este nodo.');
  } catch (err) {
    tablaPrestamos = errorBox('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (npm start).');
  }

  const content = `
    ${pageHeader('05 · Préstamos', 'Gestión de préstamos', 'Registra préstamos, devoluciones y consultas de libros solicitados por los estudiantes.')}
    ${guardGuayaquil()}
    <div class="note">Cuando un estudiante solicita un libro de otra sede, el sistema registra el préstamo en la sede a la que pertenece el estudiante.</div><br />
    <div class="layout-with-aside">
      <div class="grid">
        <div class="card">
          <div class="form-grid">
            ${field('ID préstamo')}${field('Fecha préstamo', '2026-06-27', 'date')}${field('Fecha devolución', '2026-07-04', 'date')}${selectField('Estado', ['ACTIVO','DEVUELTO','CANCELADO'], 'ACTIVO')}${selectField('Tipo de préstamo', ['LOCAL','REMOTO'], 'LOCAL')}${field('ID estudiante')}${field('ID libro')}${field('Nro. ejemplar')}${field('Sede del estudiante', state.node, 'text', true)}${selectField('Sede proveedora', [state.node, otherNode()], state.node)}
          </div>
          ${actions(['Registrar préstamo', 'Registrar devolución', 'Buscar préstamo', 'Cancelar préstamo'])}
        </div>
        ${tablaPrestamos}
      </div>
      ${techCard([
        ['Nodo:', state.node], ['Tabla:', 'PRESTAMO'], ['Tipo de fragmentación:', 'Fragmentación horizontal derivada'], ['Derivada desde:', 'ESTUDIANTE'], ['Condición:', 'Préstamos originados por estudiantes del nodo local'], ['Operaciones:', 'Registrar, consultar, devolver y cancelar préstamos']
      ])}
    </div>`;
  return shell(content, 'prestamos');
}

async function ejemplarIdentificacion() {
  let tablaIdent;
  try {
    const data = await apiGet('/ejemplares-identificacion');
    const rows = data.map(e => [
      e.id_libro,
      e.nro_ejemplar,
      e.codigo_ejemplar,
      'Editar / Eliminar'
    ]);
    tablaIdent = rows.length
      ? table(['ID libro', 'Nro. ejemplar', 'Código ejemplar', 'Acciones'], rows)
      : errorBox('No hay ejemplares identificados registrados.');
  } catch (err) {
    tablaIdent = errorBox('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (npm start).');
  }

  const content = `
    ${pageHeader('06 · Identificación de ejemplares', 'Identificación física de ejemplares', 'Registra el código físico o de inventario de cada ejemplar disponible en la biblioteca.')}
    <div class="note">Este inventario de identificación está centralizado en Quito e incluye los ejemplares de ambas sedes.</div><br />
    <div class="layout-with-aside">
      <div class="grid">
        <div class="card"><div class="form-grid">${field('ID libro')}${field('Nro. ejemplar')}${field('Código ejemplar', 'Q-BD-101-001')}</div>${actions(['Registrar identificación','Editar código','Eliminar','Buscar'])}</div>
        ${tablaIdent}
      </div>
      ${techCard([
        ['Nodo:', 'Quito'], ['Tabla:', 'EJEMPLAR_Identificacion'], ['Tipo de fragmentación:', 'Fragmentación vertical'], ['Ubicación:', 'Quito (centralizada)'], ['Función:', 'Identificación física general de ejemplares'], ['Operaciones:', 'Registrar, consultar, editar y eliminar códigos físicos de ejemplares']
      ])}
    </div>`;
  return shell(content, 'ejemplares-identificacion');
}

async function ejemplarOperacion() {
  let tablaOper;
  try {
    const data = await apiGet('/ejemplares-operacion');
    const rows = data.map(e => [
      e.id_libro,
      e.nro_ejemplar,
      e.id_sede === 1 ? 'Quito' : 'Guayaquil',
      chip(e.estado),
      'Cambiar estado'
    ]);
    tablaOper = rows.length
      ? table(['ID libro', 'Nro. ejemplar', 'Sede', 'Estado', 'Acciones'], rows)
      : errorBox('No hay ejemplares operativos en este nodo.');
  } catch (err) {
    tablaOper = errorBox('No se pudo conectar con el servidor. Verifica que el backend esté corriendo (npm start).');
  }

  const content = `
    ${pageHeader('07 · Ejemplares', 'Estado de ejemplares', 'Consulta y actualiza el estado de los ejemplares disponibles en la sede seleccionada.')}
    ${guardGuayaquil()}
    <div class="layout-with-aside">
      <div class="grid">
        <div class="card"><div class="form-grid">${field('ID libro')}${field('Nro. ejemplar')}${field('Sede', state.node, 'text', true)}${selectField('Estado', ['DISPONIBLE','PRESTADO','RESERVADO','MANTENIMIENTO'], 'DISPONIBLE')}</div>${actions(['Cambiar estado','Buscar disponibles','Registrar operación','Actualizar'])}</div>
        ${tablaOper}
      </div>
      ${techCard([
        ['Nodo:', state.node], ['Tabla:', 'EJEMPLAR_Operacion'], ['Tipo de fragmentación:', 'Fragmentación mixta'], ['Vertical:', 'Separación identificación / operación'], ['Horizontal:', 'Quito o Guayaquil'], ['Operaciones:', 'Registrar, consultar y actualizar estado operativo de ejemplares locales']
      ])}
    </div>`;
  return shell(content, 'ejemplares-operacion');
}

async function consultaRemota() {
  let auditMetrics, validationTable;
  try {
    const a = await apiGet('/auditoria');
    const ok = (n) => n === 0;
    const catalogoOk = a.total_sedes > 0 && a.total_libros > 0;
    auditMetrics = `
      <div class="audit-metrics">
        ${metric('Estudiantes fuera de sede', a.estudiantes_fuera, ok(a.estudiantes_fuera) ? 'Sin inconsistencias' : 'Revisar')}
        ${metric('Ejemplares fuera de sede', a.ejemplares_fuera, ok(a.ejemplares_fuera) ? 'Operación correcta' : 'Revisar')}
        ${metric('Préstamos fuera de regla', a.prestamos_fuera, ok(a.prestamos_fuera) ? 'Origen validado' : 'Revisar')}
        ${metric('Catálogo compartido', catalogoOk ? 'Correcto' : 'Vacío', 'Sedes y libros')}
      </div>`;
    validationTable = table(['Validación','Resultado','Detalle','Estado'], [
      ['Estudiantes por sede', ok(a.estudiantes_fuera)?'Correcto':'Inconsistente','No existen estudiantes asignados a una sede incorrecta', chip(ok(a.estudiantes_fuera)?'Aprobado':'Revisar')],
      ['Ejemplares operativos', ok(a.ejemplares_fuera)?'Correcto':'Inconsistente','Los ejemplares corresponden a su sede de operación', chip(ok(a.ejemplares_fuera)?'Aprobado':'Revisar')],
      ['Préstamos', ok(a.prestamos_fuera)?'Correcto':'Inconsistente','Los préstamos se registran en la sede del estudiante solicitante', chip(ok(a.prestamos_fuera)?'Aprobado':'Revisar')],
      ['Catálogo compartido', catalogoOk?'Correcto':'Vacío','La información de sedes y libros está disponible para consulta', chip('Aprobado')]
    ]);
  } catch (err) {
    auditMetrics = errorBox('No se pudo conectar con el servidor para calcular la auditoría.');
    validationTable = '';
  }

  const content = `
    ${pageHeader('08 · Consulta de disponibilidad remota / Auditoría', 'Disponibilidad remota y auditoría', 'Consulta ejemplares disponibles en otra sede y valida que los registros del sistema se mantengan correctos entre Quito y Guayaquil.')}
    <div class="layout-with-aside">
      <div class="grid">
        <div class="card">
          <div class="section-title">Consulta de disponibilidad remota</div>
          <div class="note">Esta sección consulta la vista particionada distribuida y requiere que el nodo Guayaquil esté en línea. Se demuestra en la sesión coordinada con el nodo remoto.</div>
        </div>

        <div class="section-title">Auditoría de fragmentación (nodo local)</div>
        ${auditMetrics}
        ${validationTable}

        <div class="card soft-panel">
          <div class="section-title">Resumen de la pantalla</div>
          <p class="help">La auditoría valida que las reglas de distribución se cumplan en el nodo local: cada estudiante, ejemplar y préstamo pertenece a la sede correcta. La consulta de disponibilidad remota (vista particionada) se ejecuta con el nodo Guayaquil en línea.</p>
        </div>
      </div>
      ${techCard([
        ['Nodo:', state.node], ['Tabla:', 'ESTUDIANTE, EJEMPLAR_Operacion, PRESTAMO, SEDE, LIBRO'], ['Tipo de fragmentación:', 'Validación de reglas de fragmentación + consulta distribuida'], ['Operaciones:', 'Auditar distribución local y consultar disponibilidad remota']
      ])}
    </div>`;
  return shell(content, 'consulta-remota');
}

// render ahora es async: espera a las pantallas que traen datos del backend.
async function render() {
  const route = location.hash.replace('#/', '') || 'login';
  const views = {
    login,
    dashboard,
    'sede-libro': sedeLibro,
    estudiantes,
    prestamos,
    'ejemplares-identificacion': ejemplarIdentificacion,
    'ejemplares-operacion': ejemplarOperacion,
    'consulta-remota': consultaRemota,
  };
  const view = views[route] || dashboard;
  document.getElementById('app').innerHTML = await view();
}
function go(route) { location.hash = '#/' + route; }
function setNode(n) { state.node = n; localStorage.setItem('sbd-node', n); render(); }
function readLoginAndGo() {
  const selects = document.querySelectorAll('select');
  state.node = selects[0].value;
  state.role = selects[1].value;
  localStorage.setItem('sbd-node', state.node);
  localStorage.setItem('sbd-role', state.role);
  go('dashboard');
}
window.addEventListener('hashchange', render);
render();
