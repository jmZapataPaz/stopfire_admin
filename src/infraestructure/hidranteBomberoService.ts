import axios from 'axios'

export interface HidranteBomberoDto {
  id: number
  latitud: number
  longitud: number
  geomWkt?: string | null
  geomGeoJson?: string | null
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5190'

export async function getHidrantesBombero(token: string): Promise<HidranteBomberoDto[]> {
  if (!token) {
    throw new Error('Token de autenticación no disponible')
  }

  const resp = await axios.get(`${API_BASE_URL}/api/Bombero/hidrantes`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  // Aseguramos que siempre devolvemos un array tipado
  return (resp.data ?? []) as HidranteBomberoDto[]
}