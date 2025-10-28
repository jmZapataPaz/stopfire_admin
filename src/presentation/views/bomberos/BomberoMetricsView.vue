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

    <!-- MANTENER siempre el contenedor del mapa -->
    <div class="map-wrapper" style="min-height:600px;">
      <!-- el div del mapa siempre existe (ref) -->
      <div ref="mapEl" style="height:600px; border-radius:8px;"></div>

      <!-- mensaje encima del mapa cuando no hay puntos -->
      <div v-if="!loading && points.length === 0" class="sf-empty map-empty">
        No hay datos para mostrar en el mapa.
      </div>
    </div>

    <!-- Contenedor separado, siempre ubicado debajo del mapa -->
    <div class="response-container">
      <h2 class="sf-page-title">Tiempo de Respuesta</h2>

      <!-- NUEVO: si no hay puntos, ocultar gráfica y mostrar mensaje -->
      <div v-if="!loading && points.length === 0" class="sf-empty">
        No hay datos para mostrar.
      </div>
      <div v-else-if="responseData" class="response-time-card" style="padding:12px; background:#fff; border-radius:8px;">
        <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
          <div style="flex:1 1 600px; max-width:800px; height:320px;">
            <canvas ref="gaugeCanvas" style="width:100%; height:100%; display:block; background:transparent; border-radius:8px; overflow:visible;"></canvas>
          </div>
          <div style="min-width:220px;">
            <div style="font-size:18px; font-weight:700; margin-bottom:8px;">Promedio: {{ responseData.averageMinutes }} min</div>
            <div style="margin-bottom:6px;"><strong>Leyenda</strong></div>
            <ul style="margin:6px 0 0 18px; padding:0; list-style:none;">
              <li><span style="display:inline-block;width:14px;height:14px;background:#4caf50;margin-right:8px;border-radius:3px;"></span> Verde &lt; 1 min : {{ responseData.distribution.green }}</li>
              <li><span style="display:inline-block;width:14px;height:14px;background:#ffeb3b;margin-right:8px;border-radius:3px;"></span> Amarillo 1 - &lt;10 min : {{ responseData.distribution.yellow }}</li>
              <li><span style="display:inline-block;width:14px;height:14px;background:#ff9800;margin-right:8px;border-radius:3px;"></span> Naranja 10 - &lt;21 min : {{ responseData.distribution.orange }}</li>
              <li><span style="display:inline-block;width:14px;height:14px;background:#d32f2f;margin-right:8px;border-radius:3px;"></span> Rojo &ge; 21 min : {{ responseData.distribution.red }}</li>
            </ul>
          </div>
        </div>
      </div>

      <div v-else class="sf-empty" style="padding:12px; background:#fff7; border-radius:8px;">
        No hay datos de tiempo de respuesta para el periodo seleccionado.
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Chart, registerables } from 'chart.js'
Chart.register(...registerables)

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

const responseData = ref<any | null>(null)
const gaugeCanvas = ref<HTMLCanvasElement | null>(null)
let gaugeChart: Chart | null = null

function drawGauge(data: any) {
  const canvas = gaugeCanvas.value
  if (!canvas) return
  
  // destruir chart anterior si existe
  if (gaugeChart) {
    gaugeChart.destroy()
    gaugeChart = null
  }

  const avg = Number(data?.averageMinutes ?? 0)
  
  // IMPORTANTE: los 4 segmentos tienen el MISMO tamaño visual (25% cada uno)
  gaugeChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Verde < 1 min', 'Amarillo 1-10 min', 'Naranja 10-21 min', 'Rojo ≥ 21 min'],
      datasets: [{
        data: [25, 25, 25, 25], // TODOS IGUALES: 25% cada uno
        backgroundColor: ['#4caf50', '#ffeb3b', '#ff9800', '#d32f2f'],
        borderWidth: 0,
        circumference: 180,
        rotation: 270,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false },
        title: {
          display: true,
          text: `${avg.toFixed(2)} min`,
          position: 'bottom',
          font: { size: 18, weight: 'bold' }
        }
      }
    },
    plugins: [{
      id: 'needlePlugin',
      afterDatasetDraw(chart) {
        const { ctx, chartArea: { width, height } } = chart
        const cx = width / 2
        const cy = height
        
        // UMBRALES REALES:
        const thresholds = [
          { min: 0, max: 1 },      // segmento 0 (verde)
          { min: 1, max: 10 },     // segmento 1 (amarillo)
          { min: 10, max: 21 },    // segmento 2 (naranja)
          { min: 21, max: 60 }     // segmento 3 (rojo)
        ]
        
        let segmentIndex = 0
        let frac = 0
        
        for (let i = 0; i < thresholds.length; i++) {
          const { min, max } = thresholds[i]
          const isInSegment = (i === thresholds.length - 1) 
            ? (avg >= min && avg <= max)
            : (avg >= min && avg < max)
          
          if (isInSegment) {
            segmentIndex = i
            frac = (avg - min) / (max - min)
            break
          }
        }
        
        if (avg > 60) {
          segmentIndex = 3
          frac = 1
        }
        
        // Cada segmento ocupa 25% del semicírculo (180° / 4 = 45°)
        const segmentAngleDeg = 180 / 4
        
        // CORRECCIÓN: Chart.js rota el gráfico 270° (rotation: 270)
        // Necesitamos COMPENSAR esa rotación en la aguja
        // El semicírculo visual va de izquierda (-90°) a derecha (90°)
        // Pero Chart.js lo ha rotado 270°, entonces:
        // - El verde visual (izquierda) está a 270° - 90° = 180°
        // - El rojo visual (derecha) está a 270° + 90° = 360° = 0°
        
        // Calcular ángulo SIN compensación (como antes)
        const segmentStartAngle = -90 + segmentIndex * segmentAngleDeg
        const needleAngleDeg = segmentStartAngle + frac * segmentAngleDeg
        
        // APLICAR compensación por la rotación del chart (270°)
        const compensatedAngleDeg = needleAngleDeg + 270
        const angleRad = (compensatedAngleDeg * Math.PI) / 180
        
        const needleLen = Math.min(width, height) * 0.35
        
        // dibujar aguja
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(angleRad)
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(needleLen, 0)
        ctx.lineWidth = 4
        ctx.strokeStyle = '#111'
        ctx.lineCap = 'round'
        ctx.stroke()
        ctx.restore()
        
        // punto central
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#111'
        ctx.fill()
      }
    }]
  })
}

async function loadResponseTime(idEstacion: number) {
  try {
    responseData.value = null
    const token = getCookie('csrftoken')
    if (!token) return
    const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5190'
    const baseUrl = String(base).replace(/\/+$/, '')
    const url = `${baseUrl}/api/Bombero/estaciones/${idEstacion}/metricas/response-time?month=${selectedMonth.value}&year=${selectedYear.value}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
    if (!res.ok) { console.error('response-time failed', res.status); return }
    const data = await res.json()
    responseData.value = data
    await nextTick()
    drawGauge(data)
  } catch (e) {
    console.error('[RESPONSE-TIME][ERR]', e)
  }
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

    // cargar tiempo de respuesta para la misma estación/periodo
    await loadResponseTime(idEst)
  } catch (e: any) {
    console.error('[METRICS][ERR]', e)
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadMetrics()
  // redibujar al cambiar tamaño de ventana
  window.addEventListener('resize', onResizeWindow)
})

onBeforeUnmount(() => {
  if (mapInstance) {
    try { mapInstance.remove() } catch (_) {}
    mapInstance = null
  }
  if (gaugeChart) {
    gaugeChart.destroy()
    gaugeChart = null
  }
  window.removeEventListener('resize', onResizeWindow)
})

function onResizeWindow() {
  try { 
    if (gaugeChart && responseData.value) {
      drawGauge(responseData.value)
    }
  } catch (_) {}
}

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

/* nuevos estilos para separar mapa y tarjeta */
.map-wrapper { position: relative; }
.map-empty { position: absolute; top: 16px; left: 16px; z-index: 4000; max-width: calc(100% - 32px); }

.response-container { margin-top: 16px; }

.response-time-card {
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
  overflow: visible !important;
}
.response-time-card canvas {
  display: block;
  overflow: visible !important;
  /* garantizar que el canvas use todo el alto del contenedor */
  width: 100% !important;
  height: 100% !important;
}
</style>