import type { User } from '../domain/user'

export async function getUsuarios(token: string): Promise<User[]> {
  const res = await fetch('http://localhost:5190/api/admin/usuarios', {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}