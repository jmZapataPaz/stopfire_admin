export interface CreateEstacionDto {
  nombre: string
  latitud: string
  longitud: string
  descripcionDireccion: string
  celular: string
  estado: boolean
  idUsuario: number
  coberturaGeoJson?: any
  cobertura?: any
}

export interface UpdateEstacionDto {
  nombre?: string
  latitud?: string
  longitud?: string
  descripcionDireccion?: string
  celular?: string
  estado?: boolean
  idUsuario?: number
  coberturaGeoJson?: any
  cobertura?: any
}