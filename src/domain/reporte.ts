export interface Reporte {
  id: number;
  idUsuario?: number;
  descripcion?: string;
  fotoUrl?: string;
  latitud?: number;
  longitud?: number;
  estado?: string;
  fechaCreacion?: string;
  usuarioNombre?: string;
  usuarioCi?: string;
  usuarioCelular?: string;
  usuarioEmail?: string;
  usuario?: {
    nombre?: string;
    apellido?: string;
    ci?: string;
    correo?: string;
    celular?: string;
    telefono?: string;
  };
}