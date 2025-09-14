export interface GeometryPolygon {
  type: 'Polygon'
  coordinates: number[][][]
}

export interface Estacion {
  id: number
  idUsuario: number
  nombre: string
  latitud: string
  longitud: string
  descripcionDireccion: string
  celular: string
  estado: boolean
  cobertura?: GeometryPolygon | null
  coberturaGeoJson?: GeometryPolygon | null
}