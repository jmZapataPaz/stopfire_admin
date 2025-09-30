import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../presentation/views/LoginView.vue';
import WelcomeView from '../presentation/views/WelcomeView.vue';
import AdminLayout from '../presentation/views/admin/AdminLayout.vue';
import EstacionesView from '../presentation/views/admin/EstacionesView.vue';
import UsuariosView from '../presentation/views/admin/UsuariosView.vue';
import BomberosView from '../presentation/views/admin/BomberosView.vue';
import BomberoLayout from '../presentation/views/bomberos/BomberoLayout.vue';
import BomberoMapView from '../presentation/views/bomberos/BomberoMapView.vue';

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift()!;
  return null;
}

function decodeJwt(t: string): any {
  try { return JSON.parse(atob(t.split('.')[1])) } catch { return {} }
}

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  { path: '/', name: 'welcome', component: WelcomeView },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { role: 1 },
    children: [
      { path: 'estaciones', name: 'admin-estaciones', component: EstacionesView },
      { path: 'usuarios', name: 'admin-usuarios', component: UsuariosView },
      { path: 'bomberos', name: 'admin-bomberos', component: BomberosView }
    ]
  },
  {
    path: '/bombero',
    component: BomberoLayout,
    meta: { role: 2 },
    children: [
      { path: 'mapa', name: 'bombero-mapa', component: BomberoMapView }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  if (to.name === 'login') return next()
  const token = getCookie('csrftoken')
  if (!token) return next({ name: 'login' })
  const payload = decodeJwt(token)
  const role = Number(payload.role_id || payload.rol_id || payload.roleId || payload.rolId)
  if (![1, 2].includes(role)) {
    document.cookie = 'csrftoken=; Max-Age=0; Path=/'
    return next({ name: 'login' })
  }
  if (to.path.startsWith('/admin') && role !== 1) {
    return next({ name: 'bombero-mapa' })
  }
  if (to.path.startsWith('/bombero') && role !== 2) {
    return next({ name: 'admin-estaciones' })
  }
  next()
})

export default router