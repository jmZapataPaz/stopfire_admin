export interface Hidrante {
  id: number
  latitud: number
  longitud: number
  geomWkt: string
  geomGeoJson: string
}

export async function getHidrantes(token: string): Promise<Hidrante[]> {
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190'
  const url = `${base}/api/Bombero/hidrantes`
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  })
  
  if (!res.ok) {
    throw new Error(`Error ${res.status} al cargar hidrantes`)
  }
  
  return await res.json()
}