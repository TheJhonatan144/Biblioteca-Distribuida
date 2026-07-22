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
// Envia datos al backend (POST/PUT/DELETE) con cuerpo JSON.
async function apiSend(path, method, body) {
  const r = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || ('HTTP ' + r.status));
  return data;
}

// (Los dos nodos estan operativos; ya no se requiere aviso por sede.)
function guardGuayaquil() { return ''; }

// ===== Notificaciones flotantes (toasts) =====
// Sobreviven al re-render porque viven en document.body, no dentro de #app.
function toast(mensaje, ok = true) {
  let cont = document.getElementById('toast-container');
  if (!cont) {
    cont = document.createElement('div');
    cont.id = 'toast-container';
    document.body.appendChild(cont);
  }
  const t = document.createElement('div');
  t.className = 'toast ' + (ok ? 'toast-ok' : 'toast-error');
  t.innerHTML = (ok ? '✓ ' : '✕ ') + mensaje;
  cont.appendChild(t);
  setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 350); }, 3800);
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
  { id: 'ejemplares', label: 'Ejemplares', icon: '⌁' },
  { id: 'consulta-remota', label: 'Disponibilidad', icon: '◎' },
];

function techCard(rows) {
  return '';
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
            <span class="status-pill">Sede: <b>&nbsp;${state.node}</b></span>
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
              ${field('Sede', state.node, 'text', true)}
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
  try { m = await apiGet('/dashboard'); } catch (err) { /* se quedan los guiones */ }

  // Actividad reciente construida con datos reales del nodo
  let actividadTable;
  try {
    const act = await apiGet('/actividad');
    const fmtFecha = (d) => {
      if (!d) return '—';
      const f = new Date(d);
      return f.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' ' + f.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
    };
    const rows = [];
    act.prestamos.forEach(p => {
      const accion = 'Préstamo ' + p.tipo_prestamo + ' · libro ' + p.id_libro +
                     ', ejemplar ' + p.nro_ejemplar +
                     (p.estado === 'DEVUELTO' ? ' (devuelto)' : p.estado === 'CANCELADO' ? ' (cancelado)' : '');
      rows.push([fmtFecha(p.fecha_prestamo), 'Préstamos', accion,
                 chip(p.id_sede_origen === 1 ? 'Quito' : 'Guayaquil')]);
    });
    act.estudiantes.forEach(e =>
      rows.push(['—', 'Estudiantes', 'Estudiante registrado: ' + e.nombre, chip(state.node)]));
    act.libros.forEach(l =>
      rows.push(['—', 'Catálogo', 'Libro en catálogo: ' + l.titulo, chip('Quito')]));
    actividadTable = rows.length
      ? table(['Fecha', 'Módulo', 'Acción', 'Sede'], rows)
      : errorBox('Aún no hay actividad registrada en esta sede.');
  } catch (err) {
    actividadTable = errorBox('No se pudo cargar la actividad reciente.');
  }

  const content = `
    ${pageHeader('', 'Resumen general', 'Estado actual de la biblioteca, préstamos activos y actividad reciente.')}
    <div class="grid grid-4">
      ${metric('Libros en catálogo', m.libros, 'Catálogo disponible')}
      ${metric('Estudiantes registrados', m.estudiantes, state.node)}
      ${metric('Ejemplares disponibles', m.ejemplares_disponibles, 'Para préstamo')}
      ${metric('Préstamos activos', m.prestamos_activos, state.node)}
    </div>
    <br />
    <div class="single-col">
      <div>
        <h3>Actividad reciente</h3>
        ${actividadTable}
      </div>
    </div>`;
  return shell(content, 'dashboard');
}


// ===== PANTALLA CONECTADA A LA API: Sedes y Libros =====
async function sedeLibro() {
  const readonly = state.node === 'Guayaquil';
  let sedeTable, libroTable;
  try {
    const [sedes, libros] = await Promise.all([apiGet('/sedes'), apiGet('/libros')]);
    sedeTable = table(['ID sede','Nombre','Ciudad'], sedes.map(s => [s.id_sede, s.nombre, s.ciudad]));
    libroTable = table(['ID libro','Título','Autor','Categoría'], libros.map(l => [l.id_libro, l.titulo, l.autor, l.categoria]));
  } catch (err) {
    sedeTable = errorBox('No se pudo conectar con el servidor.');
    libroTable = '';
  }

  // En Guayaquil: solo lectura (replicado). En Quito: botones activos.
  const botonesLibro = readonly
    ? '<div class="note">En esta sede el catálogo se muestra solo para consulta.</div>'
    : `<div class="actions">
        <button class="btn btn-primary" onclick="crearLibro()">Registrar</button>
        <button class="btn btn-secondary" onclick="editarLibro()">Actualizar</button>
        <button class="btn btn-secondary" onclick="eliminarLibro()">Eliminar</button>
      </div><div id="libro_msg" class="help"></div>`;
      const botonesSede = '<div class="note">Las sedes son fijas y se muestran solo para consulta.</div>';

  const content = `
    ${pageHeader('', 'Sedes y catálogo', 'Administra el catálogo de libros de la biblioteca.')}
    ${guardGuayaquil()}
    
    <div class="single-col">
      <div class="grid">
        <div class="card">
          <div class="section-title">LIBRO</div>
          <div class="form-grid">
            <div class="field"><label>ID libro <small>(solo para actualizar/eliminar)</small></label><input class="input" id="libro_id" type="number" placeholder="Automático al crear" /></div>
            <div class="field"><label>Título</label><input class="input" id="libro_titulo" type="text" placeholder="Título" /></div>
            <div class="field"><label>Autor</label><input class="input" id="libro_autor" type="text" placeholder="Autor" /></div>
            <div class="field"><label>Categoría</label><input class="input" id="libro_categoria" type="text" placeholder="Categoría" /></div>
          </div>
          ${botonesLibro}
        </div>
        ${libroTable}
        <div class="card">
          <div class="section-title">SEDE</div>
          ${botonesSede}
        </div>
        ${sedeTable}
      </div>
      ${techCard([
        ['Nodo:', 'Quito maestro / Guayaquil suscriptor'], ['Tabla:', 'SEDE y LIBRO'], ['Tipo de fragmentación:', 'Replicación transaccional'], ['Operaciones:', 'CRUD en Quito. Solo consulta en Guayaquil.']
      ])}
    </div>`;
  return shell(content, 'sede-libro');
}

// --- CRUD LIBRO ---
function leerLibro() {
  return {
    id_libro: parseInt(document.getElementById('libro_id').value, 10),
    titulo: document.getElementById('libro_titulo').value.trim(),
    autor: document.getElementById('libro_autor').value.trim(),
    categoria: document.getElementById('libro_categoria').value.trim()
  };
}
function msgLibro(t, ok=true){ toast(t, ok); }
async function crearLibro(){
  const d = leerLibro();
  if(!d.titulo) return msgLibro('El Título es obligatorio.', false);
  try{
    const r = await apiSend('/libros','POST',{ titulo:d.titulo, autor:d.autor, categoria:d.categoria });
    msgLibro('Libro registrado correctamente (ID ' + r.id_libro + ').');
    await render();
  }catch(e){ msgLibro('Error: '+e.message, false); }
}
async function editarLibro(){ const d=leerLibro(); if(!d.id_libro) return msgLibro('Indica el ID libro a actualizar.',false);
  try{ const r=await apiSend('/libros','PUT',d); if(r.filas===0) return msgLibro('No existe ese libro.',false); msgLibro('Libro actualizado correctamente.'); await render(); }catch(e){ msgLibro('Error: '+e.message,false); } }
async function eliminarLibro(){ const d=leerLibro(); if(!d.id_libro) return msgLibro('Indica el ID libro a eliminar.',false);
  if(!confirm('¿Eliminar el libro '+d.id_libro+'?')) return;
  try{ const r=await apiSend('/libros','DELETE',{id_libro:d.id_libro}); if(r.filas===0) return msgLibro('No existe ese libro.',false); msgLibro('Libro eliminado correctamente.'); await render(); }catch(e){ msgLibro('Error: '+e.message,false); } }

// --- CRUD SEDE ---
function leerSede() {
  return {
    id_sede: parseInt(document.getElementById('sede_id').value, 10),
    nombre: document.getElementById('sede_nombre').value.trim(),
    ciudad: document.getElementById('sede_ciudad').value.trim()
  };
}
function msgSede(t, ok=true){ toast(t, ok); }
async function crearSede(){ const d=leerSede(); if(!d.id_sede||!d.nombre) return msgSede('ID sede y Nombre son obligatorios.',false);
  try{ await apiSend('/sedes','POST',d); await render(); }catch(e){ msgSede('Error: '+e.message,false); } }
async function editarSede(){ const d=leerSede(); if(!d.id_sede) return msgSede('Indica el ID sede a actualizar.',false);
  try{ const r=await apiSend('/sedes','PUT',d); if(r.filas===0) return msgSede('No existe esa sede.',false); await render(); }catch(e){ msgSede('Error: '+e.message,false); } }
async function eliminarSede(){ const d=leerSede(); if(!d.id_sede) return msgSede('Indica el ID sede a eliminar.',false);
  if(!confirm('¿Eliminar la sede '+d.id_sede+'?')) return;
  try{ const r=await apiSend('/sedes','DELETE',{id_sede:d.id_sede}); if(r.filas===0) return msgSede('No existe esa sede.',false); await render(); }catch(e){ msgSede('Error: '+e.message,false); } }

// ===== PANTALLA CONECTADA A LA API: Estudiantes =====
async function estudiantes() {
  let tabla;
  try {
    const data = await apiGet('/estudiantes');
    const rows = data.map(e => [e.id_estudiante, e.nombre, e.carrera, e.correo, e.id_sede === 1 ? 'Quito' : 'Guayaquil']);
    tabla = rows.length ? table(['ID','Nombre','Carrera','Correo','Sede'], rows) : errorBox('No hay estudiantes en este nodo.');
  } catch (err) { tabla = errorBox('No se pudo conectar con el servidor.'); }

  const content = `
    ${pageHeader('', 'Estudiantes', 'Registra, consulta y actualiza la información de los estudiantes.')}
    ${guardGuayaquil()}
    <div class="single-col">
      <div class="grid">
        <div class="card">
          <div class="form-grid">
            <div class="field"><label>ID estudiante <small>(solo para actualizar/eliminar)</small></label><input class="input" id="est_id" type="number" placeholder="Automático al crear" /></div>
            <div class="field"><label>Nombre</label><input class="input" id="est_nombre" type="text" placeholder="Nombre completo" /></div>
            <div class="field"><label>Carrera</label><input class="input" id="est_carrera" type="text" placeholder="Carrera" /></div>
            <div class="field"><label>Correo</label><input class="input" id="est_correo" type="email" placeholder="correo@epn.edu.ec" /></div>
            <div class="field"><label>Sede</label><input class="input" value="${state.node}" readonly /></div>
          </div>
          <div class="actions">
            <button class="btn btn-primary" onclick="crearEstudiante()">Registrar</button>
            <button class="btn btn-secondary" onclick="editarEstudiante()">Actualizar</button>
            <button class="btn btn-secondary" onclick="eliminarEstudiante()">Eliminar</button>
          </div>
          <div id="est_msg" class="help"></div>
        </div>
        ${tabla}
      </div>
      ${techCard([
        ['Nodo:', state.node], ['Tabla:', 'ESTUDIANTE'], ['Tipo de fragmentación:', 'Fragmentación horizontal primaria'], ['Condición:', 'Cada sede administra sus propios estudiantes'], ['Operaciones:', 'Crear, consultar, actualizar y eliminar estudiantes locales']
      ])}
    </div>`;
  return shell(content, 'estudiantes');
}

// --- Manejadores CRUD de ESTUDIANTE ---
function leerEstudiante(){
  return {
    id_estudiante: parseInt(document.getElementById('est_id').value, 10),
    nombre: document.getElementById('est_nombre').value.trim(),
    carrera: document.getElementById('est_carrera').value.trim(),
    correo: document.getElementById('est_correo').value.trim()
  };
}
function msgEst(t, ok=true){ toast(t, ok); }
async function crearEstudiante(){
  const d = leerEstudiante();
  if(!d.nombre) return msgEst('El nombre es obligatorio.', false);
  try{ const r = await apiSend('/estudiantes','POST',{ nombre:d.nombre, carrera:d.carrera, correo:d.correo }); msgEst('Estudiante registrado correctamente (ID ' + r.id_estudiante + ').'); await render(); }
  catch(e){ msgEst('Error: '+e.message, false); }
}
async function editarEstudiante(){
  const d = leerEstudiante();
  if(!d.id_estudiante) return msgEst('Indica el ID del estudiante a actualizar.', false);
  try{ const r=await apiSend('/estudiantes','PUT',d); if(r.filas===0) return msgEst('No existe ese estudiante.', false); msgEst('Estudiante actualizado correctamente.'); await render(); }
  catch(e){ msgEst('Error: '+e.message, false); }
}
async function eliminarEstudiante(){
  const d = leerEstudiante();
  if(!d.id_estudiante) return msgEst('Indica el ID del estudiante a eliminar.', false);
  if(!confirm('¿Eliminar el estudiante '+d.id_estudiante+'?')) return;
  try{ const r=await apiSend('/estudiantes','DELETE',{id_estudiante:d.id_estudiante}); if(r.filas===0) return msgEst('No existe ese estudiante.', false); msgEst('Estudiante eliminado correctamente.'); await render(); }
  catch(e){ msgEst('Error: '+e.message, false); }
}

async function prestamos() {
  let tabla;
  try {
    const data = await apiGet('/prestamos');
    const rows = data.map(p => [
      p.id_prestamo, p.id_estudiante, p.id_libro, p.nro_ejemplar,
      p.id_sede_origen === 1 ? 'Quito' : 'Guayaquil',
      p.id_sede_proveedora === 1 ? 'Quito' : 'Guayaquil',
      chip(p.tipo_prestamo), chip(p.estado)
    ]);
    tabla = rows.length
      ? table(['ID','Estudiante','Libro','Ejemplar','Sede estudiante','Sede proveedora','Tipo','Estado'], rows)
      : errorBox('No hay prestamos registrados en esta sede.');
  } catch (err) { tabla = errorBox('No se pudo conectar con el servidor.'); }

  const content = `
    ${pageHeader('', 'Préstamos', 'Registra préstamos, devoluciones y consulta el historial.')}
    <div class="single-col">
      <div class="grid">
        <div class="card">
          <div class="section-title">Registrar préstamo</div>
          <div class="form-grid">
            <div class="field"><label>ID estudiante</label><input class="input" id="pr_est" type="number" placeholder="Ej. 1" /></div>
            <div class="field"><label>ID libro</label><input class="input" id="pr_libro" type="number" placeholder="Ej. 1" /></div>
            <div class="field"><label>Nro. ejemplar</label><input class="input" id="pr_nro" type="number" placeholder="Ej. 2" /></div>
            <div class="field"><label>Sede del ejemplar</label><select class="select" id="pr_prov"><option value="1">Quito</option><option value="2">Guayaquil</option></select></div>
            <div class="field"><label>Fecha de devolución</label><input class="input" id="pr_fdev" type="date" /></div>
            <div class="field"><label>Sede del estudiante</label><input class="input" value="${state.node}" readonly /></div>
          </div>
          <div class="actions">
            <button class="btn btn-primary" onclick="registrarPrestamo()">Registrar préstamo</button>
          </div>
          <div id="pr_msg" class="help"></div>
        </div>

        <div class="card">
          <div class="section-title">Registrar devolución</div>
          <div class="form-grid">
            <div class="field"><label>ID préstamo</label><input class="input" id="pr_dev_id" type="number" placeholder="Ej. 5" /></div>
          </div>
          <div class="actions">
            <button class="btn btn-secondary" onclick="registrarDevolucion()">Registrar devolución</button>
          </div>
          <div id="pr_dev_msg" class="help"></div>
        </div>

        ${tabla}
      </div>
    </div>`;
  return shell(content, 'prestamos');
}

function msgPr(id, t, ok) { toast(t, ok); }

async function registrarPrestamo() {
  const d = {
    id_estudiante: parseInt(document.getElementById('pr_est').value, 10),
    id_libro: parseInt(document.getElementById('pr_libro').value, 10),
    nro_ejemplar: parseInt(document.getElementById('pr_nro').value, 10),
    id_sede_proveedora: parseInt(document.getElementById('pr_prov').value, 10),
    fecha_devolucion: document.getElementById('pr_fdev').value || null
  };
  if (!d.id_estudiante || !d.id_libro || !d.nro_ejemplar)
    return msgPr('pr_msg', 'Completa ID estudiante, ID libro y Nro. ejemplar.', false);
  try {
    const r = await apiSend('/prestamos', 'POST', d);
    msgPr('pr_msg', `Préstamo ${r.tipo} registrado correctamente (ID ${r.id_prestamo ?? '-'}).`, true);
    await render();
  } catch (err) { msgPr('pr_msg', 'Error: ' + err.message, false); }
}

async function registrarDevolucion() {
  const id_prestamo = parseInt(document.getElementById('pr_dev_id').value, 10);
  if (!id_prestamo) return msgPr('pr_dev_msg', 'Indica el ID del préstamo a devolver.', false);
  try {
    await apiSend('/prestamos/devolucion', 'PUT', { id_prestamo });
    msgPr('pr_dev_msg', 'Devolución registrada. El ejemplar volvió a estar DISPONIBLE.', true);
    await render();
  } catch (err) { msgPr('pr_dev_msg', 'Error: ' + err.message, false); }
}

async function ejemplarIdentificacion() {
  const esQuito = state.node === 'Quito';
  let tablaIdent = '';
  if (esQuito) {
    try {
      const data = await apiGet('/ejemplares-identificacion');
      const rows = data.map(e => [e.id_libro, e.nro_ejemplar, e.codigo_ejemplar]);
      tablaIdent = rows.length ? table(['ID libro','Nro. ejemplar','Código ejemplar'], rows) : errorBox('No hay ejemplares identificados registrados.');
    } catch (err) { tablaIdent = errorBox('No se pudo conectar con el servidor.'); }
  }

  const bloqueQuito = `
        <div class="card">
          <div class="form-grid">
            <div class="field"><label>ID libro</label><input class="input" id="ident_id_libro" type="number" placeholder="Ej. 1" /></div>
            <div class="field"><label>Nro. ejemplar</label><input class="input" id="ident_nro" type="number" placeholder="Ej. 1" /></div>
            <div class="field"><label>Código ejemplar</label><input class="input" id="ident_codigo" type="text" placeholder="Ej. Q-BD-101-001" /></div>
          </div>
          <div class="actions">
            <button class="btn btn-primary" onclick="crearIdentificacion()">Registrar</button>
            <button class="btn btn-secondary" onclick="editarIdentificacion()">Actualizar código</button>
            <button class="btn btn-secondary" onclick="eliminarIdentificacion()">Eliminar</button>
          </div>
          <div id="ident_msg" class="help"></div>
        </div>
        ${tablaIdent}`;

  const bloqueGuayaquil = `
        <div class="card">
          <div class="note">La identificación de ejemplares se administra desde la sede principal (Quito).</div>
        </div>`;

  const content = `
    ${pageHeader('', 'Identificación de ejemplares', 'Registra el código de inventario de cada ejemplar.')}
    <div class="single-col">
      <div class="grid">
        ${esQuito ? bloqueQuito : bloqueGuayaquil}
      </div>
      ${techCard([
        ['Nodo:', 'Quito (centralizada)'], ['Tabla:', 'EJEMPLAR_Identificacion'], ['Tipo de fragmentación:', 'Fragmentación vertical'], ['Ubicación:', 'Quito'], ['Operaciones:', 'CRUD de códigos físicos (solo en Quito)']
      ])}
    </div>`;
  return shell(content, 'ejemplares-identificacion');
}

// --- Manejadores del CRUD de Identificación ---
function leerIdent() {
  return {
    id_libro: parseInt(document.getElementById('ident_id_libro').value, 10),
    nro_ejemplar: parseInt(document.getElementById('ident_nro').value, 10),
    codigo_ejemplar: document.getElementById('ident_codigo').value.trim()
  };
}
function msgIdent(texto, ok = true) { toast(texto, ok); }
async function crearIdentificacion() {
  const d = leerIdent();
  if (!d.id_libro || !d.nro_ejemplar || !d.codigo_ejemplar) return msgIdent('Completa los tres campos.', false);
  try { await apiSend('/ejemplares-identificacion', 'POST', d); msgIdent('Identificación registrada correctamente.'); await render(); }
  catch (err) { msgIdent('Error: ' + err.message, false); }
}
async function editarIdentificacion() {
  const d = leerIdent();
  if (!d.id_libro || !d.nro_ejemplar || !d.codigo_ejemplar) return msgIdent('Completa ID libro, Nro. y el nuevo código.', false);
  try {
    const r = await apiSend('/ejemplares-identificacion', 'PUT', d);
    if (r.filas === 0) return msgIdent('No existe ese ejemplar para actualizar.', false);
    msgIdent('Código actualizado correctamente.');
    await render();
  } catch (err) { msgIdent('Error: ' + err.message, false); }
}
async function eliminarIdentificacion() {
  const d = leerIdent();
  if (!d.id_libro || !d.nro_ejemplar) return msgIdent('Indica ID libro y Nro. ejemplar.', false);
  if (!confirm('¿Eliminar el ejemplar ' + d.id_libro + '-' + d.nro_ejemplar + '?')) return;
  try {
    const r = await apiSend('/ejemplares-identificacion', 'DELETE', d);
    if (r.filas === 0) return msgIdent('No existe ese ejemplar para eliminar.', false);
    msgIdent('Ejemplar eliminado de la identificación.');
    await render();
  } catch (err) { msgIdent('Error: ' + err.message, false); }
}

async function ejemplaresUnificado() {
  let tabla;
  try {
    const data = await apiGet('/ejemplares-global');
    const rows = data.map(e => [
      e.id_libro, e.nro_ejemplar,
      e.id_sede === 1 ? 'Quito' : 'Guayaquil',
      e.codigo_ejemplar || '—',
      chip(e.estado)
    ]);
    tabla = rows.length ? table(['ID libro','Nro. ejemplar','Sede','Código','Estado'], rows)
                        : errorBox('No hay ejemplares registrados.');
  } catch (err) {
    tabla = errorBox('No se pudo leer la vista global. Verifica que Guayaquil esté en línea (la vista distribuida necesita ambos nodos).');
  }

  const content = `
    ${pageHeader('', 'Ejemplares', 'Registra un ejemplar con su código, sede y estado.')}
    
    <div class="single-col">
      <div class="grid">
        <div class="card">
          <div class="section-title">Registrar ejemplar</div>
          <div class="form-grid">
            <div class="field"><label>ID libro</label><input class="input" id="ej_id_libro" type="number" placeholder="Ej. 1" /></div>
            <div class="field"><label>Nro. ejemplar</label><input class="input" id="ej_nro" type="number" placeholder="Ej. 3" /></div>
            <div class="field"><label>Sede</label><select class="select" id="ej_sede"><option value="1">Quito</option><option value="2">Guayaquil</option></select></div>
            <div class="field"><label>Código ejemplar</label><input class="input" id="ej_codigo" type="text" placeholder="Ej. UIO-LIB001-EJ003" /></div>
            <div class="field"><label>Estado</label><select class="select" id="ej_estado"><option>DISPONIBLE</option><option>PRESTADO</option><option>RESERVADO</option><option>MANTENIMIENTO</option></select></div>
          </div>
          <div class="actions">
            <button class="btn btn-primary" onclick="registrarEjemplar()">Registrar</button>
            <button class="btn btn-secondary" onclick="actualizarEjemplar()">Actualizar</button>
            <button class="btn btn-secondary" onclick="eliminarEjemplar()">Eliminar</button>
          </div>
        </div>
        ${tabla}
      </div>
      ${techCard([
        ['Nodo actual:', state.node],
        ['Vertical:', 'codigo_ejemplar → EJEMPLAR_Identificacion (Quito, ruta completa)'],
        ['Mixta:', 'id_sede + estado → V_EJEMPLAR_Operacion_Global (la vista enruta)'],
        ['Atomicidad:', 'Transacción distribuida (MSDTC)'],
        ['Requisitos:', '5 (mixta vía vista) y 6 (vertical) en una sola pantalla']
      ])}
    </div>`;
  return shell(content, 'ejemplares');
}

async function registrarEjemplar() {
  const d = {
    id_libro: parseInt(document.getElementById('ej_id_libro').value, 10),
    nro_ejemplar: parseInt(document.getElementById('ej_nro').value, 10),
    id_sede: parseInt(document.getElementById('ej_sede').value, 10),
    codigo_ejemplar: document.getElementById('ej_codigo').value.trim(),
    estado: document.getElementById('ej_estado').value
  };
  const msg = document.getElementById('ej_msg');
  const setMsg = (t, ok) => toast(t, ok);
  if (!d.id_libro || !d.nro_ejemplar || !d.codigo_ejemplar) return setMsg('Completa ID libro, Nro. ejemplar y Código.', false);
  try {
    await apiSend('/ejemplares-global', 'POST', d);
    setMsg('Ejemplar registrado correctamente.', true);
    await render();
  } catch (err) { setMsg('Error: ' + err.message, false); }
}

function leerEjemplar() {
  return {
    id_libro: parseInt(document.getElementById('ej_id_libro').value, 10),
    nro_ejemplar: parseInt(document.getElementById('ej_nro').value, 10),
    id_sede: parseInt(document.getElementById('ej_sede').value, 10),
    codigo_ejemplar: document.getElementById('ej_codigo').value.trim(),
    estado: document.getElementById('ej_estado').value
  };
}

async function actualizarEjemplar() {
  const d = leerEjemplar();
  const msg = document.getElementById('ej_msg');
  const setMsg = (t, ok) => toast(t, ok);
  if (!d.id_libro || !d.nro_ejemplar) return setMsg('Indica ID libro y Nro. ejemplar del ejemplar a actualizar.', false);
  if (!d.id_sede) return setMsg('Indica la Sede del ejemplar a actualizar.', false);
  try {
    const r = await apiSend('/ejemplares-global', 'PUT', d);
    if ((r.filasCodigo || 0) === 0 && (r.filasEstado || 0) === 0) {
      return setMsg('No existe ese ejemplar con ese id_libro, nro_ejemplar y sede.', false);
    }
    setMsg('Ejemplar actualizado correctamente.', true);
    await render();
  } catch (err) { setMsg('Error: ' + err.message, false); }
}

async function eliminarEjemplar() {
  const d = leerEjemplar();
  const msg = document.getElementById('ej_msg');
  const setMsg = (t, ok) => toast(t, ok);
  if (!d.id_libro || !d.nro_ejemplar || !d.id_sede) return setMsg('Indica ID libro, Nro. ejemplar y Sede del ejemplar a eliminar.', false);
  if (!confirm('¿Eliminar el ejemplar ' + d.id_libro + '-' + d.nro_ejemplar + ' de ' + (d.id_sede === 1 ? 'Quito' : 'Guayaquil') + '? Se borrará su código y su operación.')) return;
  try {
    await apiSend('/ejemplares-global', 'DELETE', d);
    setMsg('Ejemplar eliminado correctamente.', true);
    await render();
  } catch (err) { setMsg('Error: ' + err.message, false); }
}

async function consultaRemota() {
  const otraSede = otherNode();
  let tablaRemota, auditMetrics, validationTable;

  // 1) Disponibilidad remota (necesita el otro nodo en linea)
  try {
    const disp = await apiGet('/disponibilidad-remota');
    const rows = disp.map(e => [e.id_libro, e.titulo, e.autor, e.nro_ejemplar, chip(e.estado)]);
    tablaRemota = rows.length
      ? table(['ID libro','Título','Autor','Nro. ejemplar','Estado'], rows)
      : errorBox('No hay ejemplares disponibles en ' + otraSede + ' en este momento.');
  } catch (err) {
    tablaRemota = errorBox('No se pudo consultar la sede ' + otraSede + '. Verifica que su nodo esté en línea.');
  }

  // 2) Verificacion del sistema (local, siempre disponible)
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
    auditMetrics = errorBox('No se pudo calcular la verificación del sistema.');
    validationTable = '';
  }

  const content = `
    ${pageHeader('', 'Disponibilidad', 'Ejemplares disponibles en la sede ' + otraSede + ' que pueden solicitarse en préstamo.')}
    <div class="single-col">
      <div class="grid">
        <div class="card">
          <div class="section-title">Disponibles en ${otraSede}</div>
          <p class="help">Estos ejemplares pueden solicitarse desde la pestaña Préstamos indicando la sede ${otraSede}.</p>
        </div>
        ${tablaRemota}

        <div class="section-title" style="margin-top:18px">Verificación del sistema</div>
        ${auditMetrics}
        ${validationTable}
      </div>
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
    'ejemplares': ejemplaresUnificado,
    'consulta-remota': consultaRemota,
  };
  const view = views[route] || dashboard;
  document.getElementById('app').innerHTML = await view();
}
function go(route) { location.hash = '#/' + route; }
function setNode(n) { state.node = n; localStorage.setItem('sbd-node', n); render(); }
function readLoginAndGo() {
  const selects = document.querySelectorAll('select');
  state.role = selects[0].value;               // ahora el unico select es el Rol
  localStorage.setItem('sbd-role', state.role);
  go('dashboard');
}
window.addEventListener('hashchange', render);
(async function init() {
  try {
    const n = await apiGet('/nodo');
    state.node = n.nombre;
    localStorage.setItem('sbd-node', n.nombre);
  } catch (e) { /* si el backend no responde, se usa el ultimo valor conocido */ }
  render();
})();