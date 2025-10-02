import type { User } from '../domain/user';
import { login } from '../infraestructure/authService';
import { initNotificaciones, startNotificaciones } from '../infraestructure/signalr/notificacionesHub';
import { getRoleFromToken } from '../infraestructure/authService';

export async function loginUser(correo: string, contrasena: string): Promise<{ token: string, user: User }> {
  const res = await login(correo, contrasena);
  const token = res.token;
  const user: User = res.usuario;

  const rolRaw = (user as any)?.rol || (user as any)?.Rol || '';
  const rolUpper = (rolRaw || '').toString().trim().toUpperCase();
  const roleNum = getRoleFromToken(token); // 1=ADMIN? 2=BOMBERO/RESPONSABLE (ajusta si difiere)
  console.log('[Auth] rolRaw=', rolRaw, 'roleNum=', roleNum);

  let shouldInitSignalR = false;
  let rolCanonico = '';

  if (roleNum === 2) {
    rolCanonico = 'BOMBERO';
    shouldInitSignalR = true;
  } else if (['BOMBERO','RESPONSABLE'].includes(rolUpper)) {
    rolCanonico = rolUpper;
    shouldInitSignalR = true;
  }

  if (shouldInitSignalR) {
    localStorage.setItem('authToken', token); // <-- agrega esto
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190';
    console.log('[Auth] Iniciando SignalR baseUrl=', baseUrl, 'rolCanonico=', rolCanonico);
    initNotificaciones(baseUrl, token);
    startNotificaciones();
    (window as any).__forceSignalR = () => {
      console.log('[Debug] Forzando reconexión SignalR');
      initNotificaciones(baseUrl, token);
      startNotificaciones();
    };
  } else {
    console.warn('[Auth] No se inicializa SignalR (rol ausente)');
  }

  return { token, user };
}