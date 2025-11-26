const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190'

export interface RegistroEstacion {
  id: number
  estacionId: number
  estacionNombre: string
  responsableId: number
  responsableNombre: string
  fecha: string
}

export async function getRegistrosEstaciones(params: {
  token: string
  estacionId?: number
  responsableId?: number
  year?: number
  month?: number
}): Promise<RegistroEstacion[]> {
  const qs = new URLSearchParams()
  if (params.estacionId) qs.set('estacionId', String(params.estacionId))
  if (params.responsableId) qs.set('responsableId', String(params.responsableId))
  if (params.year) qs.set('year', String(params.year))
  if (params.month) qs.set('month', String(params.month))

  const res = await fetch(`${base}/api/admin/registros-estaciones?${qs.toString()}`, {
    headers: {
      'Authorization': `Bearer ${params.token}`,
      'Accept': 'application/json'
    }
  })
  if (!res.ok) throw new Error(`GET registros-estaciones ${res.status}`)
  return res.json()
}