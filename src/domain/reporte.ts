export interface Reporte {
  id: number;
  idUsuario?: number;
  descripcion?: string;
  fotoUrl?: string;
  latitud?: number;
  longitud?: number;
  estado?: string;
  fechaCreacion?: string;
}