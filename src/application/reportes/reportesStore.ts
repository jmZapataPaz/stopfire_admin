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

function addReporte(r: Reporte) {
  console.log('[Store] addReporte', r);
  state.pendientes.push(r);
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
    console.log('[Aceptar] POST', `${API_BASE}/api/Usuarios/reportes/${id}/aceptar`);
    await fetch(`${API_BASE}/api/Usuarios/reportes/${id}/aceptar`, {
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
    console.log('[Rechazar] POST', `${API_BASE}/api/Usuarios/reportes/${id}/rechazar`);
    await fetch(`${API_BASE}/api/Usuarios/reportes/${id}/rechazar`, {
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
  }
};