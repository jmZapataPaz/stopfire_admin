import type { Reporte } from '../domain/reporte';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190').replace(/\/+$/, '');

export async function getReportes(token: string): Promise<Reporte[]> {
  const res = await fetch(`${API_BASE}/api/Usuarios/reportes`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GET /reportes ${res.status}: ${txt}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({
    id: r.id ?? r.Id,
    idUsuario: r.idUsuario ?? r.IdUsuario,
    descripcion: r.descripcion ?? r.Descripcion,
    fotoUrl: r.fotoUrl ?? r.FotoUrl,
    latitud: typeof r.latitud === 'number' ? r.latitud : Number(r.Latitud ?? r.latitud),
    longitud: typeof r.longitud === 'number' ? r.longitud : Number(r.Longitud ?? r.longitud),
    estado: r.estado ?? r.Estado,
    fechaCreacion: (r.fechaCreacion ?? r.FechaCreacion)?.toString(),
  })) as Reporte[];
}

export async function mitigarReporte(token: string, id: number): Promise<{ id: number; estado: string }> {
  const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190').replace(/\/+$/,'');
  const res = await fetch(`${API_BASE}/api/Bombero/reportes/${id}/mitigar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { const j = JSON.parse(text); msg = j.mensaje || j.error || text; } catch {}
    throw new Error(`Mitigar fallo (${res.status}): ${msg}`);
  }
  const data = text ? JSON.parse(text) : {};
  return { id: data.Id ?? data.id ?? id, estado: data.Estado ?? data.estado ?? 'MITIGADO' };
}