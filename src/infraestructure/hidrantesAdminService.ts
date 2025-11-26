export interface HidranteAdmin {
  id: number
  latitud: number
  longitud: number
  descripcion: string | null
  estado: boolean
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5190'

function headers(token: string) {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${token}`,
  }
}

export async function getHidrantesAdmin(token: string): Promise<HidranteAdmin[]> {
  const res = await fetch(`${API_BASE}/api/admin/hidrantes`, { headers: headers(token) })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function crearHidranteAdmin(data: { latitud: number; longitud: number; descripcion?: string | null; estado?: boolean }, token: string) {
  const res = await fetch(`${API_BASE}/api/admin/hidrantes`, {
    method: 'POST', headers: headers(token), body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateHidranteAdmin(id: number, data: { latitud: number; longitud: number; descripcion?: string | null }, token: string) {
  const res = await fetch(`${API_BASE}/api/admin/hidrantes/${id}`, {
    method: 'PUT', headers: headers(token), body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function cambiarEstadoHidranteAdmin(id: number, estado: boolean, token: string) {
  const res = await fetch(`${API_BASE}/api/admin/hidrantes/${id}/estado`, {
    method: 'PUT', headers: headers(token), body: JSON.stringify({ estado }),
  })
  if (!res.ok) throw new Error(await res.text())
}