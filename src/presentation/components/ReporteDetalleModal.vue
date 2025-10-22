<template>
  <div class="sf-modal-backdrop" @click.self="onClose">
    <div class="sf-modal">
      <header class="sf-modal__header">
        <h3>Incidente aceptado</h3>
        <button class="sf-modal__close" @click="onClose">✕</button>
      </header>
      <section class="sf-modal__body">
        <div class="sf-modal__row">
          <span class="sf-label">Descripción:</span>
          <span>{{ reporte.descripcion || '(sin descripción)' }}</span>
        </div>
        <div v-if="reporte.fechaCreacion" class="sf-modal__row">
          <span class="sf-label">Fecha:</span>
          <span>{{ formatFecha(reporte.fechaCreacion) }}</span>
        </div>
        <div v-if="reporte.fotoUrl" class="sf-modal__img">
          <img :src="reporte.fotoUrl" alt="Evidencia" class="rdm-thumb"/>
        </div>
        <p v-if="error" class="sf-error">{{ error }}</p>
      </section>
      <footer class="sf-modal__footer">
        <button class="sf-btn sf-btn--ghost" @click="onClose" :disabled="loading">Cerrar</button>
        <button v-if="canMitigar"
                class="sf-btn sf-btn--primary"
                @click="onMitigar"
                :disabled="loading">
          <span v-if="loading" class="sf-spinner"></span>
          Mitigar
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Reporte } from '../../domain/reporte'
import { mitigarReporte } from '../../infraestructure/reporteService'

const props = defineProps<{
  token: string;
  reporte: Reporte;
}>()
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'mitigado', id: number): void;
}>()

const loading = ref(false)
const error = ref('')

function b64urlToJson(b64: string) {
  const s = b64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = '='.repeat((4 - (s.length % 4)) % 4)
  return JSON.parse(atob(s + pad))
}
function getStationIdFromJwt(t: string): number | null {
  try {
    const parts = t.split('.'); if (parts.length !== 3) return null
    const payload = b64urlToJson(parts[1])
    const v = payload.estacion_id ?? payload.estacionId ?? payload.station_id ?? payload.stationId
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  } catch { return null }
}
function pickInt(o: any, keys: string[]): number | null {
  for (const k of keys) {
    const v = o?.[k]; const n = typeof v === 'number' ? v : Number(v)
    if (Number.isFinite(n)) return n
  }
  return null
}
function pickStr(o: any, keys: string[]): string | null {
  for (const k of keys) {
    const v = o?.[k]; if (typeof v === 'string') return v
  }
  return null
}

const myStationId = ref<number | null>(getStationIdFromJwt(props.token))

// AGREGADO: leer estacionId y estado desde el endpoint de detalle
const assignedStationId = ref<number | null>(pickInt(props.reporte as any, ['estacionId','EstacionId','idEstacion','IdEstacion']))
const estadoActual = ref<string>((props.reporte as any)?.estado ?? '')

onMounted(async () => {
  try {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5190'
    const url = `${String(base).replace(/\/+$/,'')}/api/Usuarios/reportes/${props.reporte.id}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${props.token}`, Accept: 'application/json' } })
    if (!res.ok) return
    const data = await res.json()
    const est = pickInt(data, ['estacionId','EstacionId','idEstacion','IdEstacion'])
    const estd = (pickStr(data, ['estado','Estado']) || '').toUpperCase()
    if (est != null) assignedStationId.value = est
    if (estd) estadoActual.value = estd
  } catch { /* no-op */ }
})
const canMitigar = computed(() => {
  if ((estadoActual.value || '').toUpperCase() !== 'ACEPTADO') return false
  if (assignedStationId.value == null || myStationId.value == null) return false
  return assignedStationId.value === myStationId.value
})

function onClose() { if (!loading.value) emit('close') }

async function onMitigar() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    const r = await mitigarReporte(props.token, props.reporte.id)
    window.dispatchEvent(new CustomEvent('reporte-mitigado', { detail: { id: r.id } }))
    emit('mitigado', r.id)
  } catch (e: any) {
    error.value = e?.message || 'No se pudo mitigar'
  } finally {
    loading.value = false
  }
}

function formatFecha(input: string | Date): string {
  if (!input) return ''
  const dt = new Date(input)
  if (isNaN(dt.getTime())) return String(input)
  const fecha = dt.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = dt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${fecha} ${hora}`
}
</script>