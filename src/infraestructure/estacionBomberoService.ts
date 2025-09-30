import type { Estacion } from '../domain/estacion'

function baseUrl() {
  return 'http://localhost:5190'
}

export async function getEstacionesBombero(token: string): Promise<Estacion[]> {
  const res = await fetch(`${baseUrl()}/api/Usuarios/estaciones`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.map((e: any) => ({
    ...e,
    coberturaGeoJson: e.cobertura ?? e.coberturaGeoJson
  }))
}