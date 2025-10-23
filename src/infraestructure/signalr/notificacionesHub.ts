import * as signalR from '@microsoft/signalr';
import { incomingReportesStore } from '../../application/reportes/reportesStore';

let connection: signalR.HubConnection | null = null;

export function getNotificacionesConnection() {
  return connection;
}

export function isNotificacionesConnected(): boolean {
  return !!connection && connection.state === signalR.HubConnectionState.Connected;
}
export async function stopConnection(): Promise<void> {
  if (!connection) return;
  try {
    try {
      connection.off('ReporteCreado');
      connection.off('ReporteAsignado');
      connection.off('AsignacionCreada');
      connection.off('ReporteEstado');
      connection.off('AsignacionEstado');
      connection.off('ReporteMitigado');
      connection.off('AsignacionMitigado');
      connection.off('ReporteActualizado');
      connection.off('AsignacionActualizada');
    } catch {}
    await connection.stop();
  } catch (e) {
    console.warn('[SignalR] stopConnection error:', e);
  } finally {
    connection = null;
  }
}

export function initNotificaciones(baseUrl: string, token: string) {
  if (connection) {
    return connection;
  }
  console.log('[SignalR] Creando conexión...', baseUrl);
  const hubUrl = `${baseUrl.replace(/\/+$/, '')}/hubs/notificaciones`;

  const estacionId = getEstacionIdFromToken(token);
  const shouldNotify = (p: any) => {
    try {
      const cand = p?.primeraCandidata ?? p?.PrimeraCandidata ?? p?.estacionId ?? p?.EstacionId;
      if (typeof cand === 'number') return cand === estacionId;
      const n = Number(cand);
      return !isNaN(n) && n === estacionId;
    } catch { return false; }
  };

  const api = new URL(baseUrl);
  const normalizeImageUrl = (raw: any) => {
    try {
      if (!raw) return '';
      const u = new URL(String(raw), api);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        u.hostname = api.hostname;
        u.port = api.port;
        u.protocol = api.protocol;
      }
      return u.toString();
    } catch {
      return String(raw ?? '');
    }
  };
  const normalize = (p: any) => {
    const id = p?.reporteId ?? p?.ReporteId ?? p?.id ?? p?.Id;
    const foto = p?.fotoUrl ?? p?.imagenUrl ?? p?.FotoUrl ?? p?.ImagenUrl;
    const fotoN = normalizeImageUrl(foto);
    return { ...p, id, fotoUrl: fotoN, imagenUrl: fotoN };
  };
  const seen = new Map<number, number>();
  const addOnce = (p: any) => {
    const id = Number(p?.reporteId ?? p?.ReporteId ?? p?.id ?? p?.Id);
    if (!Number.isFinite(id)) return true;
    const now = Date.now();
    const last = seen.get(id) ?? 0;
    if (now - last < 1200) { 
      console.log('[SignalR] Duplicado ignorado id=', id);
      return false;
    }
    seen.set(id, now);
    return true;
  };

  connection = new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => token
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 15000])
    .configureLogging(signalR.LogLevel.Information)
    .build();

  console.log('[SignalR] Configurando handlers para ReporteCreado en', hubUrl);

  connection.on('ReporteCreado', payload => {
    console.log('[SignalR] ReporteCreado recibido', payload);
    if (!shouldNotify(payload)) { console.log('[SignalR] Ignorado por estación', estacionId); return; }
    if (!addOnce(payload)) return;                          
    incomingReportesStore.addReporte(normalize(payload));    
  });

  connection.on('ReporteAsignado', payload => {
    console.log('[SignalR] ReporteAsignado recibido', payload);
    if (!shouldNotify(payload)) { console.log('[SignalR] Ignorado por estación', estacionId); return; }
    if (!addOnce(payload)) return;                           
    incomingReportesStore.addReporte(normalize(payload));    
  });

  connection.on?.('AsignacionCreada' as any, (payload: any) => {
    console.log('[SignalR] AsignacionCreada', payload);
    if (!shouldNotify(payload)) { console.log('[SignalR] Ignorado por estación', estacionId); return; }
    if (!addOnce(payload)) return;                          
    incomingReportesStore.addReporte(normalize(payload));    
  });

  // AGREGADO: helper para emitir un evento estándar de estado de reporte
  function emitReporteEstadoEvent(payload: any) {
    try {
      window.dispatchEvent(new CustomEvent('sr-reporte-estado', { detail: payload }));
    } catch {}
  }

  connection.on('ReporteEstado', (payload: any) => {
    console.log('[SignalR] ReporteEstado', payload);
    const estado = String(payload?.estado ?? '').toUpperCase();
    const id = payload?.id ?? payload?.Id ?? payload?.reporteId ?? payload?.ReporteId;

    if (estado === 'MITIGADO') {
      window.dispatchEvent(new CustomEvent('reporte-mitigado', { detail: payload }));
    }
    if (estado === 'ACEPTADO') {
      emitAceptado(payload);
    }
  });

  // AGREGADO: algunas instalaciones solo disparan AsignacionCreada al aceptar
  connection.on('AsignacionCreada', (a: any) => {
    const id =
      a?.idReporte ?? a?.IdReporte ?? a?.reporteId ?? a?.ReporteId ?? a?.id ?? a?.Id;
    emitReporteEstadoEvent({ id, estado: 'ACEPTADO', ...a });
  });

  connection.on('ReporteReasignado', p => {
    console.log('[SignalR] Reasignado', p);
    if (!shouldNotify(p)) { console.log('[SignalR] Ignorado por estación', estacionId); return; }
    if (!addOnce(p)) return;                                 
    incomingReportesStore.addReporte(normalize(p));          
  });

  ['ReporteRechazado', 'reporterechazado'].forEach(evt => {
    connection!.on(evt, p => {
      console.log('[SignalR] Evento rechazo', evt, p);
      const candRaw =
        p?.nuevaCandidata ?? p?.NuevaCandidata ??
        p?.candidata ?? p?.Candidata ??
        p?.primeraCandidata ?? p?.PrimeraCandidata;
      const cand = typeof candRaw === 'number' ? candRaw : Number(candRaw);
      if (!Number.isFinite(cand) || cand !== estacionId) {
        console.log('[SignalR] Rechazo ignorado por estación', estacionId);
        return;
      }
      if (!addOnce(p)) return;                               
      const id = p?.reporteId ?? p?.ReporteId ?? p?.id ?? p?.Id;
      const normalized = { ...normalize(p), id, primeraCandidata: cand, estado: (p?.estado ?? 'PENDIENTE').toString().toUpperCase() };
      incomingReportesStore.addReporte(normalized);
      if (id != null) {
        window.dispatchEvent(new CustomEvent('reporte-reasignado', { detail: { reporteId: id, nuevaCandidata: cand } }));
      }
    });
  });

  ;(connection as any).onAny?.((evt: string, ...args: any[]) => {
    if (evt !== 'ping') console.log('[SignalR][onAny]', evt, args);
  });

  connection.onclose(err => console.warn('[SignalR] Cerrado', err));
  connection.onreconnecting(err => console.warn('[SignalR] Reintentando', err));
  connection.onreconnected(id => console.log('[SignalR] Reconectado', id));

  (window as any).__conn = connection;
  return connection;
}

function getEstacionIdFromToken(token: string): number {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return 0;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const v = payload.estacion_id ?? payload.estacionId ?? payload.station_id ?? payload.stationId;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

export async function startNotificaciones() {
  if (!connection) return;
  if (connection.state === signalR.HubConnectionState.Connected) return;
  try {
    await connection.start();
    console.log('[SignalR] Conectado estado=', connection.state);
  } catch (e) {
    console.error('[SignalR] Error al iniciar', e);
  }
}

export async function ensureNotificaciones(baseUrl: string, token: string) {
  initNotificaciones(baseUrl, token);
  await startNotificaciones();
  return connection;
}

function isBomberoToken(token: string | null | undefined): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const v = payload.rol_id ?? payload.role_id ?? payload.rolId ?? payload.roleId ?? payload.rol ?? payload.role;
    if (typeof v === 'number') return v === 2;
    const s = String(v).toUpperCase();
    if (s === '2') return true;
    return s.includes('BOMBERO');
  } catch {
    return false;
  }
}

let _lastToken: string | null = null;

export async function ensureConnected(baseUrl: string, token: string) {
  _lastToken = token;
  if (!isBomberoToken(token)) {
    try { await stop(); } catch {}
    return; 
  }
}
export async function start(baseUrl: string, token: string) {
  _lastToken = token;
  if (!isBomberoToken(token)) {
    try { await stop(); } catch {}
    return; 
  }
}

export async function stop() {
  if (connection) {
    await connection.stop();
  }
  _lastToken = null;
}

function emitAceptado(p: any) {
  try {
    const id = p?.id ?? p?.Id ?? p?.reporteId ?? p?.ReporteId;
    if (id != null) {
      window.dispatchEvent(new CustomEvent('reporte-aceptado', { detail: { id: Number(id), payload: p } }));
      console.log('[SignalR] emit reporte-aceptado', id);
    }
  } catch {}
}