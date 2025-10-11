<template>
  <div class="bombero-layout">
    <aside class="sidebar" :class="{ 'is-open': isOpen }">
      <div class="topbar">
        <button class="hamburger-btn" @click="toggleSidebar"><span></span><span></span><span></span></button>
        <h1 class="brand"><span class="label">StopFire Bombero</span></h1>
      </div>
      <nav>
        <RouterLink class="nav-link" to="/bombero/mapa">
          <span class="icon">🗺</span>
          <span class="label">Mapa</span>
        </RouterLink>
        <RouterLink class="nav-link" to="/bombero/historial">
          <span class="icon">📜</span>
          <span class="label">Historial</span>
        </RouterLink>
      </nav>
      <button class="logout" @click="logout">
        <span class="icon">↩</span><span class="label">Cerrar sesión</span>
      </button>
    </aside>
    <main class="content">
      <RouterView />
      <ReporteNotification />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import '../../../assets/AdminLayout.css'
import '../../../assets/BomberoLayout.css'
import ReporteNotification from '../../components/ReporteNotification.vue'

const router = useRouter()
const isOpen = ref(false)
function toggleSidebar() { isOpen.value = !isOpen.value }
function deleteCookie(name: string) { document.cookie = `${name}=; Max-Age=0; Path=/` }
function logout() { deleteCookie('csrftoken'); router.push({ name: 'login' }) }
</script>

<style scoped>
/* ...existing code... */
</style>