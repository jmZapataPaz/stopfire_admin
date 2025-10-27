<template>
  <div class="bombero-metrics">
    <h2 class="sf-page-title">Mapa de calor</h2>

    <!-- Controles siempre visibles -->
    <div class="metrics-controls">
      <div class="controls-row">
        <label>
          Mes:
          <select v-model.number="selectedMonth">
            <option v-for="(m, i) in months" :key="i" :value="i+1">{{ m }}</option>
          </select>
        </label>
        <label>
          Año:
          <select v-model.number="selectedYear">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
        </label>
        <label><input type="checkbox" v-model="showLabels" /> Mostrar conteos</label>
        <label><input type="checkbox" v-model="useGradient" /> Gradiente</label>
      </div>
      <div class="legend">
        <span class="legend-item" v-for="c in legendStops" :key="c.label">
          <i :style="{ background: c.color }"></i> {{ c.label }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="sf-loading">Cargando métricas...</div>
    <div v-else-if="error" class="sf-error">{{ error }}</div>
    <div v-else-if="points.length === 0" class="sf-empty">No hay datos para hacer la métrica.</div>

    <!-- Contenedor siempre presente para que el ref exista; se muestra solo si hay puntos -->
    <div ref="mapEl" v-show="points.length > 0" style="height:600px; border-radius:8px;"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const loading = ref(true)
const error = ref<string | null>(null)
const points = ref<any[]>([])

const mapEl = ref<HTMLElement | null>(null)
let mapInstance: L.Map | null = null
let layersGroup: L.LayerGroup | null = null

const radiusMultiplier = ref(1.0)
const showLabels = ref(true)
const useGradient = ref(true)

// filtros de mes/año (por defecto fecha sistema)
const dnow = new Date()
const selectedMonth = ref<number>(dnow.getMonth() + 1)
const selectedYear = ref<number>(dnow.getFullYear())
const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
function buildYearsRange(span = 5) {
  const y = dnow.getFullYear()
  const arr = []
  for (let i = 0; i < span; i++) arr.push(y - i)
  return arr
}
const years = buildYearsRange(6)

const legendStops = [
  { label: 'Bajo', color: '#ffeb3b' },
  { label: 'Medio', color: '#ff9800' },
  { label: 'Alto', color: '#d32f2f' },
]

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : ''
}

function pickNum(o: any, candidates: string[]) {
  for (const k of candidates) {
    const v = o?.[k]
    if (v == null) continue
    const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
    if (Number.isFinite(n)) return n
  }
  return null
}

function colorBetween(t: number) {
  const c1 = [255, 235, 59] // yellow #ffeb3b
  const c2 = [255, 152, 0]  // orange #ff9800
  const c3 = [211, 47, 47]  // red #d32f2f
  if (t < 0.5) {
    const u = t / 0.5
    return interpRgb(c1, c2, u)
  } else {
    const u = (t - 0.5) / 0.5
    return interpRgb(c2, c3, u)
  }
}
function interpRgb(a: number[], b: number[], t: number) {
  const r = Math.round(a[0] + (b[0] - a[0]) * t)
  const g = Math.round(a[1] + (b[1] - a[1]) * t)
  const bl = Math.round(a[2] + (b[2] - a[2]) * t)
  return `rgb(${r},${g},${bl})`
}

async function renderMap() {
  if (!mapEl.value) {
    console.error('[METRICS] mapEl is null')
    return
  }
  if (mapInstance) {
    try { mapInstance.remove() } catch (_) {}
    mapInstance = null
  }
  if (layersGroup) {
    try { layersGroup.clearLayers() } catch (_) {}
    layersGroup = null
  }

  const validPoints = points.value
    .map((p: any) => {
      const lat = pickNum(p, ['Lat','lat','Latitud','latitud','latitude','Latitude','latitudDecimal'])
      const lon = pickNum(p, ['Lon','lon','Longitud','longitud','longitude','Longitude','longitudDecimal'])
      const count = pickNum(p, ['Count','count','Count','Cnt','cnt','CountPoints','CountValue','Count'])
      return { raw: p, lat, lon, count: count ?? 1 }
    })
    .filter((p:any) => Number.isFinite(p.lat) && Number.isFinite(p.lon))
  points.value = validPoints.map((p:any) => ({ lat: p.lat, lon: p.lon, count: p.count }))
  console.log('[METRICS] validPoints parsed:', points.value.length, points.value.slice(0,3))
  const defaultCenter = { lat: -17.783333, lon: -63.182968 }
  const avgLat = points.value.length > 0 ? points.value.reduce((s:any, p:any) => s + p.lat, 0) / points.value.length : defaultCenter.lat
  const avgLon = points.value.length > 0 ? points.value.reduce((s:any, p:any) => s + p.lon, 0) / points.value.length : defaultCenter.lon

  mapInstance = L.map(mapEl.value as HTMLElement, { center: [avgLat, avgLon], zoom: 13 })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(mapInstance)

  layersGroup = L.layerGroup().addTo(mapInstance)

  if (points.value.length === 0) return

  const maxCount = Math.max(...points.value.map((p:any) => Number(p.count) || 1))
  for (const p of points.value) {
    const weight = Math.max(1, Number(p.count) || 1)
    const backendRadius = pickNum(p, ['RadiusMeters','radiusMeters','radius'])
    const baseRadius = Number.isFinite(backendRadius) ? backendRadius : (150 + Math.sqrt(weight) * 120)
    const radius = baseRadius! * radiusMultiplier.value
    const t = Math.min(1, (weight - 1) / Math.max(1, maxCount - 1)) 
    const fillColor = useGradient.value ? colorBetween(t) : 'rgb(211,47,47)'
    const opacity = 0.15 + 0.6 * t

    const c = L.circle([p.lat, p.lon], {
      radius,
      color: fillColor,
      fillColor,
      fillOpacity: opacity,
      weight: 0.8
    }).addTo(layersGroup)

    if (showLabels.value) {
      L.marker([p.lat, p.lon], { interactive: false, opacity: 0 })
        .bindTooltip(String(p.count), { permanent: true, direction: 'center', className: 'heat-count' })
        .addTo(layersGroup)
    }
  }

  setTimeout(() => { try { mapInstance?.invalidateSize() } catch (_) {} }, 200)
}

async function loadMetrics() {
  loading.value = true
  error.value = null
  try {
    const token = getCookie('csrftoken')
    if (!token) { error.value = 'No autorizado'; loading.value = false; return }

    const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5190'
    const baseUrl = String(base).replace(/\/+$/, '')
    const url = `${baseUrl}/api/Bombero/mi-estacion`
    const miEstRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!miEstRes.ok) { error.value = 'No se pudo obtener la estación'; loading.value = false; return }
    const miEst = await miEstRes.json()
    const idEst = miEst?.id ?? miEst?.Id
    if (!idEst) { error.value = 'No tiene estación asignada'; loading.value = false; return }

    const heatUrl = `${baseUrl}/api/Bombero/estaciones/${idEst}/metricas/heatmap?month=${selectedMonth.value}&year=${selectedYear.value}`
    console.log('[METRICS] fetch heatmap URL:', heatUrl)
    const res = await fetch(heatUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    console.log('[METRICS] fetch heatmap status:', res.status)
    if (!res.ok) { error.value = `Error al cargar métricas: ${res.status}`; loading.value = false; return }
    const data = await res.json()
    const pts = data?.points ?? []
    console.log('[METRICS] points raw:', pts)
    await nextTick()
    points.value = pts
    await nextTick()
    await renderMap()
  } catch (e: any) {
    console.error('[METRICS][ERR]', e)
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadMetrics()
})

onBeforeUnmount(() => {
  if (mapInstance) {
    try { mapInstance.remove() } catch (_) {}
    mapInstance = null
  }
})

import { watch } from 'vue'
watch([radiusMultiplier, showLabels, useGradient], () => {
  try {
    if (!loading.value && points.value.length > 0) renderMap()
  } catch (e) { /* no-op */ }
})

// recargar cuando cambian mes/año
watch([selectedMonth, selectedYear], () => {
  try { if (!loading.value) loadMetrics() } catch (_) {}
})
</script>

<style scoped>
.bombero-metrics { padding: 16px; }
.sf-loading, .sf-empty { padding: 20px; background:#fff7; border-radius:8px; color:#333 }
.sf-error { color: #a00; padding: 12px }
.leaflet-container { border-radius: 8px; }
.heat-count { background: rgba(255,255,255,0.85); padding: 2px 6px; border-radius: 4px; font-weight: 600; color:#222 }
.metrics-controls { margin-bottom: 8px; display:flex; flex-direction:column; gap:8px }
.controls-row { display:flex; gap:12px; align-items:center; flex-wrap:wrap }
.controls-row input[type="range"] { width:200px; }
.legend { margin-top:6px }
.legend-item { display:inline-flex; align-items:center; gap:6px; margin-right:12px; color:#333 }
.legend-item i { width:18px; height:12px; display:inline-block; border-radius:3px; border:1px solid rgba(0,0,0,0.06) }

/* APLICADO: tamaño del título igual a 28px */
.sf-page-title {
  font-size: 28px !important;
  font-weight: 700 !important;
}
</style>