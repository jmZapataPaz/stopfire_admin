export interface BomberoHistorialItem {
  idReporte: number;
  idAsignacion: number;
  idEstacion: number;

  descripcion?: string | null;

  nombreCompleto?: string | null;
  ci?: string | null;
  celular?: string | null;

  latitud?: number | null;
  longitud?: number | null;
  fotoUrl?: string | null;

  fechaCreacion?: string | null;
}