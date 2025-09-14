import type { User } from '../domain/user';

export interface LoginResponse {
  token: string;
  usuario: User;
}

export async function login(correo: string, contrasena: string): Promise<LoginResponse> {
  const response = await fetch('http://localhost:5190/api/Usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena }),
  });
  if (!response.ok) throw new Error('Credenciales incorrectas');
  return response.json();
}