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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import '../../../assets/AdminLayout.css'
import '../../../assets/BomberoLayout.css'
import ReporteNotification from '../../components/ReporteNotification.vue'
import { ensureNotificaciones, isNotificacionesConnected } from '../../../infraestructure/signalr/notificacionesHub'

const router = useRouter()
const isOpen = ref(false)
function toggleSidebar() { isOpen.value = !isOpen.value }
function deleteCookie(name: string) { document.cookie = `${name}=; Max-Age=0; Path=/` }
function logout() { deleteCookie('csrftoken'); router.push({ name: 'login' }) }

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : ''
}
const token = getCookie('csrftoken')
const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5190').replace(/\/+$/, '')
onMounted(async () => {
  try {
    if (token) {
      await ensureNotificaciones(API_BASE, token)
      console.log('[BomberoLayout] SignalR conectado =', isNotificacionesConnected())
    } else {
      console.warn('[BomberoLayout] Sin token; no se conecta SignalR')
    }
  } catch (e) {
    console.warn('[BomberoLayout] Error conectando SignalR', e)
  }
})
</script>

<style scoped>
</style>