import type { User } from '../domain/user';

export interface LoginResponse {
  token: string;
  usuario?: User;
}

export async function login(correo: string, contrasena: string): Promise<LoginResponse> {
  const res = await fetch('http://localhost:5190/api/Usuarios/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, contrasena })
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(txt || 'Credenciales incorrectas')
  }
  const data = await res.json()
  const token = (data as any).token || (data as any).access_token || ''
  if (token) document.cookie = `csrftoken=${token}; Path=/`
  return data
}

export function decodeJwt(t: string): any {
  try { return JSON.parse(atob(t.split('.')[1])) } catch { return {} }
}

export function getRoleFromToken(token: string): number {
  const p = decodeJwt(token)
  return Number(p.role_id || p.rol_id || p.roleId || p.rolId || 0)
}