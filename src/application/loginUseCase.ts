import type { User } from '../domain/user';
import { login } from '../infraestructure/authService';

export async function loginUser(correo: string, contrasena: string): Promise<{ token: string, user: User }> {
  const res = await login(correo, contrasena);
  return { token: res.token, user: res.usuario };
}