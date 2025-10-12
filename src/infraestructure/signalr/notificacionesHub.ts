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
      connection.off('AsignacionMitigada');
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
    incomingReportesStore.addReporte(payload);
  });

  connection.on('ReporteAsignado', payload => {
    console.log('[SignalR] ReporteAsignado recibido', payload);
    incomingReportesStore.addReporte(payload);
  });

  connection.on('ReporteEstado', payload => {
    console.log('[SignalR] ReporteEstado', payload);
    if ((payload.estado ?? '').toUpperCase() === 'MITIGADO') {
      window.dispatchEvent(new CustomEvent('reporte-mitigado', { detail: payload }));
    }
  });

  connection.on('ReporteReasignado', p => {
    console.log('[SignalR] Reasignado', p);
    incomingReportesStore.addReporte(p);
  });

  ['ReporteRechazado', 'reporterechazado'].forEach(evt => {
    connection!.on(evt, p => {
      console.log('[SignalR] Evento rechazo', evt, p);
      if (p && (p.latitud || p.Latitud)) {
        incomingReportesStore.addReporte(p);
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