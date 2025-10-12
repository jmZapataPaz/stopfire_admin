import { reactive, readonly } from 'vue';

interface Reporte {
  id?: number;
  descripcion?: string;
  latitud?: number;
  longitud?: number;
  imagenUrl?: string;
  creadoEn?: string;
  estado?: string;
}

const state = reactive({
  pendientes: [] as Reporte[],
  visible: false,
  actual: null as Reporte | null,
  aceptado: false,
  loadingAccion: false
});

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190').replace(/\/+$/,'');

function addReporte(r: any) {
  const reporte = {
    ...r,
    ...attachPersona(r),
    id: r.id ?? r.Id,
    descripcion: r.descripcion ?? r.Descripcion,
    latitud: r.latitud ?? r.Latitud,
    longitud: r.longitud ?? r.Longitud,
    imagenUrl: r.imagenUrl ?? r.ImagenUrl ?? r.FotoUrl,
    creadoEn: r.creadoEn ?? r.CreadoEn ?? r.fecha ?? r.createdAt,
    estado: r.estado ?? r.Estado
  };
  console.log('[Store] addReporte', reporte);
  state.pendientes.push(reporte);
  if (!state.actual) mostrarSiguiente();
}

function mostrarSiguiente() {
  state.actual = state.pendientes.shift() || null;
  state.visible = !!state.actual;
  state.aceptado = false;
  console.log('[Store] mostrarSiguiente visible=', state.visible);
}

function cerrarActual() {
  state.actual = null;
  state.visible = false;
  state.aceptado = false;
  if (state.pendientes.length) setTimeout(mostrarSiguiente, 120);
}

function getToken(): string {
  return localStorage.getItem('authToken')
    || (document.cookie.match(/csrftoken=([^;]+)/)?.[1] || '');
}

async function aceptarActual() {
  if (!state.actual || state.aceptado || state.loadingAccion) return;
  const id = state.actual.id;
  if (!id) return;
  state.loadingAccion = true;
  try {
    console.log('[Aceptar] POST', `${API_BASE}/api/bombero/reportes/${id}/aceptar`);
    await fetch(`${API_BASE}/api/bombero/reportes/${id}/aceptar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    state.aceptado = true;
    state.actual.estado = 'ACEPTADO';
    window.dispatchEvent(new CustomEvent('reporte-aceptado', { detail: state.actual }));
  } catch (e) {
    console.warn('Aceptar fallo', e);
  } finally {
    state.loadingAccion = false;
  }
}

async function rechazarActual() {
  if (!state.actual || state.loadingAccion) return;
  const id = state.actual.id;
  if (!id) return;
  state.loadingAccion = true;
  try {
    console.log('[Rechazar] POST', `${API_BASE}/api/bombero/reportes/${id}/rechazar`);
    await fetch(`${API_BASE}/api/bombero/reportes/${id}/rechazar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    window.dispatchEvent(new CustomEvent('reporte-rechazado', { detail: { id } }));
  } catch (e) {
    console.warn('Rechazar fallo', e);
  } finally {
    state.loadingAccion = false;
    cerrarActual();
  }
}

function attachPersona(r: any) {
  const nombre =
    r.usuarioNombre ??
    r.nombreUsuario ??
    (r.usuario && ((r.usuario.nombre ?? '') + ' ' + (r.usuario.apellido ?? '')).trim()) ??
    r.reporterNombre ??
    r.nombre ??
    null;

  const ci =
    r.usuarioCi ??
    r.ci ??
    (r.usuario && r.usuario.ci) ??
    null;

  const celular =
    r.usuarioCelular ??
    r.telefono ??
    r.celular ??
    (r.usuario && (r.usuario.celular ?? r.usuario.telefono)) ??
    null;

  const email =
    r.usuarioEmail ??
    r.email ??
    (r.usuario && r.usuario.correo) ??
    null;

  return {
    ...(nombre ? { usuarioNombre: nombre } : {}),
    ...(ci ? { usuarioCi: ci } : {}),
    ...(celular ? { usuarioCelular: celular } : {}),
    ...(email ? { usuarioEmail: email } : {}),
  } as Partial<Reporte>;
}

function setActualFromPayload(payload: any) {
  const normalized = {
    ...payload,
    ...attachPersona(payload),
  } as Reporte;

  state.actual = normalized;
  state.visible = true;
  state.aceptado = false;
}

export const incomingReportesStore = {
  state: readonly(state),
  addReporte,
  aceptarActual,
  rechazarActual,
  cerrarActual,
  actualizarEstado(id: number, nuevo: string) {
    if (state.actual?.id === id) {
      state.actual.estado = nuevo;
      if (nuevo === 'ACEPTADO') state.aceptado = true;
    }
  },
  setActualFromPayload,
  attachPersona,
};