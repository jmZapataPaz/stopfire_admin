import { createRouter, createWebHistory, type RouteLocationNormalized, type NavigationGuardNext } from 'vue-router';
import LoginView from '../presentation/views/LoginView.vue';
import AdminLayout from '../presentation/views/AdminLayout.vue';
import BomberosView from '../presentation/views/BomberosView.vue';
import UsuariosView from '../presentation/views/UsuariosView.vue';
import EstacionesView from '../presentation/views/EstacionesView.vue';

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()!.split(';').shift()!;
  return null;
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    {
      path: '/admin',
      component: AdminLayout,
      children: [
        { path: '', redirect: { name: 'admin-bomberos' } },
        { path: 'usuarios', name: 'admin-usuarios', component: UsuariosView },
        { path: 'bomberos', name: 'admin-bomberos', component: BomberosView },
        { path: 'estaciones', name: 'admin-estaciones', component: EstacionesView },
      ],
    },
  ],
});

router.beforeEach((to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
  const csrftoken = getCookie('csrftoken');
  if (!csrftoken && to.name !== 'login') next({ name: 'login' });
  else next();
});

export default router;