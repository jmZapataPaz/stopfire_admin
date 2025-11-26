<template>
  <div class="admin-layout">
    <aside class="sidebar" :class="{ 'is-open': isOpen }">
      <div class="topbar">
        <button class="hamburger-btn" @click="toggleSidebar" aria-label="Abrir menú">
          <span></span><span></span><span></span>
        </button>
        <h1 class="brand">
          <span class="label">StopFire Admin</span>
        </h1>
      </div>
      <nav>
        <RouterLink class="nav-link" to="/admin/usuarios">
          <span class="icon">👥</span>
          <span class="label">Ciudadanos</span>
        </RouterLink>
        <RouterLink class="nav-link" to="/admin/bomberos">
          <span class="icon">🚒</span>
          <span class="label">Bomberos</span>
        </RouterLink>
        <RouterLink class="nav-link" to="/admin/estaciones">
          <span class="icon">🏢</span>
          <span class="label">Estaciones</span>
        </RouterLink>
        <RouterLink class="nav-link" to="/admin/hidrantes">
          <span class="icon">🚰</span>
          <span class="label">Hidrantes</span>
        </RouterLink>
        <RouterLink class="nav-link" to="/admin/registros-estaciones">
          <span class="icon">🧾</span>
          <span class="label">Registro de estaciones</span>
        </RouterLink>
      </nav>
      <button class="logout" @click="logout">
        <span class="icon">↩</span>
        <span class="label">Cerrar sesión</span>
      </button>
    </aside>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import '../../../assets/AdminLayout.css';
import { stopConnection } from '../../../infraestructure/signalr/notificacionesHub'; // NUEVO

const router = useRouter();
const isOpen = ref(false);

function toggleSidebar() {
  isOpen.value = !isOpen.value;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; Max-Age=0; Path=/`;
}
async function logout() {
  try { await stopConnection(); } catch {}
  deleteCookie('csrftoken');
  router.push({ name: 'login' });
}
</script>