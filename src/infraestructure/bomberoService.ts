export interface Bombero {
  id: number;
  nombre: string;
  apellido: string;
  ci: string;
  correo: string;
  celular: string;
  rolId: number;
}

export interface CrearBombero {
  nombre: string;
  apellido: string;
  ci: string;
  correo: string;
  celular: string;
  contrasena: string;
}

export interface UpdateBombero {
  nombre: string;
  apellido: string;
  celular: string;
  rolId: number;
  nuevaContrasena?: string;
}

export async function getBomberos(token: string): Promise<Bombero[]> {
  const res = await fetch('http://localhost:5190/api/admin/usuarios/bomberos', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al obtener bomberos');
  return await res.json();
}

export async function crearBombero(data: CrearBombero, token: string) {
  const res = await fetch('http://localhost:5190/api/admin/usuarios/bombero', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al crear bombero');
  return await res.json();
}

export async function updateBombero(id: number, data: UpdateBombero, token: string) {
  const res = await fetch(`http://localhost:5190/api/admin/usuarios/bomberos/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Error al actualizar bombero');
  return await res.json().catch(() => ({}));
}

export async function deleteBombero(id: number, token: string) {
  const res = await fetch(`http://localhost:5190/api/admin/usuarios/bomberos/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Error al eliminar bombero');
  return true;
}