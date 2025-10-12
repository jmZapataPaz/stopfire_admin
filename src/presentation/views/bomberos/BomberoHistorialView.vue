<template>
  <div class="bh-container">
    <div class="bh-toolbar">
      <label>Estación:</label>
      <strong>{{ tituloEstacion }}</strong>
      <button class="sf-btn" @click="reload" :disabled="loading">Recargar</button>
      <span v-if="loading" class="sf-badge">Cargando…</span>
      <span v-if="error" class="bh-badge">{{ error }}</span>
    </div>

    <table class="bh-table">
      <thead>
        <tr>
          <th>Ciudadano</th><th>CI</th><th>Celular</th>
          <th>Descripción</th><th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in items" :key="r.idAsignacion" class="bh-row" @click="openImg(r.fotoUrl)">
          <td>{{ r.nombreCompleto || '-' }}</td>
          <td>{{ r.ci || '-' }}</td>
          <td>{{ r.celular || '-' }}</td>
          <td>
            <span v-if="r.descripcion && r.descripcion.trim() !== ''">{{ r.descripcion }}</span>
            <span v-else class="bh-desc-empty">no descripción</span>
          </td>
          <td>{{ formatFecha(r.fechaCreacion) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="bh-footer">Click en una fila para ver la fotografía.</div>
    <ImagenModal v-if="imgOpen" :src="imgSrc" @close="imgOpen=false"/>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import type { BomberoHistorialItem } from '../../../domain/bomberoHistorial'
import { getHistorialAceptadosPorEstacion } from '../../../infraestructure/bomberoService'
import { getClaim } from '../../../utils/jwt'
import '../../../assets/BomberoHistorialView.css'
import '../../../assets/ReporteDetalleModal.css'
import ImagenModal from '../../components/ImagenModal.vue'

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : ''
}
const token = getCookie('csrftoken')

const estacionId = ref<number | null>(null)
const tituloEstacion = computed(() => estacionId.value ? `#${estacionId.value}` : '-')

const items = ref<BomberoHistorialItem[]>([])
const loading = ref(false)
const error = ref('')

const imgOpen = ref(false)
const imgSrc = ref<string | null>(null)

function openImg(src?: string | null) { imgSrc.value = src || null; imgOpen.value = true }
function formatFecha(f?: string | null) { if (!f) return '-'; try { return new Date(f).toLocaleString() } catch { return f } }

async function reload() {
  if (!estacionId.value) return
  loading.value = true; error.value = ''
  try {
    items.value = await getHistorialAceptadosPorEstacion(token, estacionId.value)
  } catch (e: any) {
    error.value = e?.message || 'Error al cargar historial'
  } finally { loading.value = false }
}

onMounted(async () => {
  const eid = Number(getClaim(token, 'estacion_id', 'estacionId'))
  if (!Number.isFinite(eid) || eid <= 0) {
    error.value = 'Token sin estacion_id. Vuelva a iniciar sesión.'
    return
  }
  estacionId.value = eid
  await reload()
})
</script>