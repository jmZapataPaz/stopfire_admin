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

export async function getMiEstacion(token: string): Promise<Estacion> {
  const url = `${baseUrl()}/api/Bombero/mi-estacion`; 
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${url} -> ${text}`);
  }
  return (await res.json()) as Estacion;
}