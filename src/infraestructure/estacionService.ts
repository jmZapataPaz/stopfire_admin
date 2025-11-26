import type { Estacion } from '../domain/estacion'
import type { CreateEstacionDto, UpdateEstacionDto } from '../application/estaciones/dtos'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5190'

function headers(token: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function getEstaciones(token: string): Promise<Estacion[]> {
  const res = await fetch(`${API_BASE}/api/admin/estaciones`, { headers: headers(token) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function crearEstacion(dto: CreateEstacionDto, token: string): Promise<Estacion> {
  const res = await fetch(`${API_BASE}/api/admin/estaciones`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateEstacion(id: number, dto: UpdateEstacionDto, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/estaciones/${id}`, {
    method: 'PUT',
    headers: headers(token),
    body: JSON.stringify(dto),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function deleteEstacion(id: number, token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/admin/estaciones/${id}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function cambiarEstadoEstacion(id: number, estado: boolean, token: string): Promise<void> {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190'
  const url = `${base}/api/admin/estaciones/${id}/estado`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    },
    body: JSON.stringify({ estado })
  })
  if (!res.ok) throw new Error(`Error al cambiar estado (${res.status})`)
}