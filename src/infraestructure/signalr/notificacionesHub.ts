import * as signalR from '@microsoft/signalr';
import { incomingReportesStore } from '../../application/reportes/reportesStore';

let connection: signalR.HubConnection | null = null;

export function getNotificacionesConnection() {
  return connection;
}

export function isNotificacionesConnected() {
  return connection?.state === signalR.HubConnectionState.Connected;
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
    incomingReportesStore.addReporte(normalizarReporte(payload));
  });

  connection.on('ReporteAsignado', payload => {
    console.log('[SignalR] ReporteAsignado recibido', payload);
    incomingReportesStore.addReporte(normalizarReporte(payload));
  });

  connection.on('ReporteEstado', p => {
    console.log('[SignalR] ReporteEstado', p);
  });

  connection.on('ReporteReasignado', p => {
    console.log('[SignalR] Reasignado', p);
    incomingReportesStore.addReporte(normalizarReporte(p));
  });

  ['ReporteRechazado', 'reporterechazado'].forEach(evt => {
    connection!.on(evt, p => {
      console.log('[SignalR] Evento rechazo', evt, p);
      if (p && (p.latitud || p.Latitud)) {
        incomingReportesStore.addReporte(normalizarReporte(p));
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

function normalizarReporte(raw: any) {
  return {
    id: raw.id ?? raw.Id,
    descripcion: raw.descripcion ?? raw.Descripcion,
    latitud: raw.latitud ?? raw.Latitud,
    longitud: raw.longitud ?? raw.Longitud,
    imagenUrl: raw.imagenUrl ?? raw.ImagenUrl ?? raw.FotoUrl,
    creadoEn: raw.creadoEn ?? raw.CreadoEn ?? raw.fecha ?? raw.createdAt,
    estado: raw.estado ?? raw.Estado
  };
}