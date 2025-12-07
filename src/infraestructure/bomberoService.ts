import type { BomberoHistorialItem } from '../domain/bomberoHistorial';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190').replace(/\/+$/, '');

function absolutize(u?: any): string | undefined {
  if (!u) return undefined;
  try { return new URL(String(u)).toString(); } catch {}
  const s = String(u);
  if (s.startsWith('/')) return `${API_BASE}${s}`;
  return `${API_BASE}/${s}`;
}

export type Bombero = {
  id: number
  nombre: string
  apellido: string
  ci: string
  correo: string
  celular: string
  rolId: number
  ultimoIngreso?: string | null
  estado: boolean
  tieneEstacionAsignada?: boolean
}

export interface CrearBombero {
  nombre: string;
  apellido: string;
  ci: string;
  correo: string;
  celular: string;
  contrasena: string;
}

export interface UpdateBombero {
  nombre: string;
  apellido: string;
  celular: string;
  rolId: number;
  nuevaContrasena?: string;
}

export async function getBomberos(token: string): Promise<Bombero[]> {
  const res = await fetch('http://localhost:5190/api/admin/usuarios/bomberos', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al obtener bomberos');
  return await res.json();
}

export async function crearBombero(data: CrearBombero, token: string) {
  const res = await fetch('http://localhost:5190/api/admin/usuarios/bombero', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    let msg = 'Error al crear bombero';
    try {
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          msg = json?.mensaje || json?.message || msg;
        } catch {
          msg = text || msg;
        }
      }
    } catch {}
    if (res.status === 409 && (!msg || msg === 'Error al crear bombero')) {
      msg = 'Ya existe un usuario con ese correo o CI.';
    }
    throw new Error(msg);
  }

  return await res.json();
}

export async function updateBombero(id: number, data: UpdateBombero, token: string) {
  const res = await fetch(`http://localhost:5190/api/admin/usuarios/bomberos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar bombero');
  return await res.json().catch(() => ({}));
}

export async function deleteBombero(id: number, token: string) {
  const res = await fetch(`http://localhost:5190/api/admin/usuarios/bomberos/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al eliminar bombero');
  return true;
}

export async function getHistorialAceptadosPorEstacion(token: string, idEstacion: number): Promise<BomberoHistorialItem[]> {
  const res = await fetch(`${API_BASE}/api/Bombero/estaciones/${idEstacion}/historial-aceptados`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Historial ${res.status}: ${txt}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((r: any) => ({
    idReporte: r.idReporte ?? r.IdReporte,
    idAsignacion: r.idAsignacion ?? r.IdAsignacion,
    idEstacion: r.idEstacion ?? r.IdEstacion,
    descripcion: r.descripcion ?? r.Descripcion,
    nombreCompleto: r.nombreCompleto ?? r.NombreCompleto,
    ci: r.ci ?? r.Ci,
    celular: r.celular ?? r.Celular,
    latitud: Number(r.latitud ?? r.Latitud),
    longitud: Number(r.longitud ?? r.Longitud),
    fotoUrl: r.fotoUrl ?? r.FotoUrl,
    fechaCreacion: (r.fechaCreacion ?? r.FechaCreacion)?.toString(),
    direccion: r.direccion ?? null, 
  })) as BomberoHistorialItem[];
}

export interface EstacionDetalle {
  id: number;
  idUsuario: number;
  nombre?: string | null;
  descripcionDireccion?: string | null;
  celular?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  estado: boolean;
  coberturaWkt?: string | null;
}

export interface UpdateEstacionBombero {
  nombre?: string;
  descripcionDireccion?: string;
  celular?: string;
}

export async function getMiEstacionBombero(token: string): Promise<EstacionDetalle> {
  const res = await fetch(`${API_BASE}/api/Bombero/mi-estacion`, {
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  });
  if (!res.ok) throw new Error(`mi-estacion ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return {
    id: d.id ?? d.Id,
    idUsuario: d.idUsuario ?? d.IdUsuario,
    nombre: d.nombre ?? d.Nombre,
    descripcionDireccion: d.descripcionDireccion ?? d.DescripcionDireccion,
    celular: d.celular ?? d.Celular,
    latitud: typeof d.latitud === 'number' ? d.latitud : Number(d.Latitud ?? d.latitud),
    longitud: typeof d.longitud === 'number' ? d.longitud : Number(d.Longitud ?? d.longitud),
    estado: d.estado ?? d.Estado,
    coberturaWkt: d.coberturaWkt ?? d.CoberturaWkt,
  };
}

// NUEVO: actualizar campos permitidos
export async function actualizarEstacionBombero(id: number, data: UpdateEstacionBombero, token: string): Promise<EstacionDetalle> {
  const res = await fetch(`${API_BASE}/api/Bombero/estaciones/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error(`PATCH estacion ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return {
    id: d.id ?? d.Id,
    idUsuario: d.idUsuario ?? d.IdUsuario,
    nombre: d.nombre ?? d.Nombre,
    descripcionDireccion: d.descripcionDireccion ?? d.DescripcionDireccion,
    celular: d.celular ?? d.Celular,
    estado: true
  } as EstacionDetalle;
}

export async function cambiarEstadoBombero(id: number, estado: boolean, token: string): Promise<void> {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5190'
  const res = await fetch(`${API_BASE}/api/admin/usuarios/bomberos/${id}/estado`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ estado }),
  })
  if (!res.ok) throw new Error(await res.text())
}