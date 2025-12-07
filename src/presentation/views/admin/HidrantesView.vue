<template>
  <div class="hidrantes">
    <h2>Hidrantes</h2>

    <div class="toolbar" style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
      <button @click="toggleForm">{{ showForm ? 'Cerrar' : 'Registrar hidrante' }}</button>
    </div>

    <div v-if="showForm || editId" class="form-card">
      <h3>{{ editId ? 'Editar hidrante' : 'Registrar hidrante' }}</h3>

      <div class="map-wrap">
        <div id="map-h" ref="mapEl"></div>
      </div>

      <form class="form-grid" @submit.prevent="onSubmit">
        <input class="full" v-model="form.descripcion" placeholder="Descripción" />
        <div class="row">
          <input readonly :value="form.latitud" placeholder="Latitud" />
          <input readonly :value="form.longitud" placeholder="Longitud" />
          <button type="button" @click="buscarDireccion">Obtener dirección</button>
        </div>
        <label><input type="checkbox" v-model="form.estado" /> Activo</label>
        <div class="actions full">
          <button type="button" @click="cancelar">Cancelar</button>
          <button type="submit">{{ editId ? 'Actualizar' : 'Guardar' }}</button>
        </div>
      </form>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Latitud</th>
          <th>Longitud</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="h in paginados" :key="h.id">
          <td>{{ h.descripcion || '-' }}</td>
          <td>{{ Number(h.latitud).toFixed(6) }}</td>
          <td>{{ Number(h.longitud).toFixed(6) }}</td>
          <td>{{ h.estado ? 'Activo' : 'Inactivo' }}</td>
          <td class="row-actions">
            <button @click="editar(h)">Editar</button>
            <button v-if="h.estado" class="danger" @click="darDeBaja(h)">Dar de baja</button>
            <button v-else @click="activar(h)">Activar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button class="sf-btn" :disabled="currentPage<=1" @click="currentPage=Math.max(1,currentPage-1)">Anterior</button>
      <span>Página {{ currentPage }} de {{ totalPages }}</span>
      <button class="sf-btn" :disabled="currentPage>=totalPages" @click="currentPage=Math.min(totalPages,currentPage+1)">Siguiente</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { ref, onMounted, computed, watch } from 'vue'
import { getHidrantesAdmin, crearHidranteAdmin, updateHidranteAdmin, cambiarEstadoHidranteAdmin, type HidranteAdmin } from '../../../infraestructure/hidrantesAdminService'

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const hidranteIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift()!
  return null
}
const token = getCookie('csrftoken') || ''

const hidrantes = ref<HidranteAdmin[]>([])
const error = ref('')
const showForm = ref(false)
const editId = ref<number|null>(null)

const form = ref({ descripcion: '', latitud: '' as any, longitud: '' as any, estado: true })

const mapEl = ref<HTMLDivElement|null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

async function cargar() {
  error.value = ''
  hidrantes.value = await getHidrantesAdmin(token).catch(e => { error.value = e.message || 'Error al cargar'; return [] })
  currentPage.value = 1
}

function ensureMap() {
  if (map || !mapEl.value) return
  map = L.map(mapEl.value).setView([-17.7833, -63.1821], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map as any)
  map.on('click', (ev: L.LeafletMouseEvent) => setMarker(ev.latlng.lat, ev.latlng.lng, true))
}

function destroyMap() {
  if (map) { map.remove(); map = null; marker = null }
}

function setMarker(lat: number, lng: number, reverse = false) {
  if (!map) return
  if (!marker) {
    marker = L.marker([lat, lng], { 
      draggable: true,
      icon: hidranteIcon 
    }).addTo(map)
    marker.on('dragend', () => {
      const ll = marker!.getLatLng()
      form.value.latitud = +ll.lat.toFixed(6)
      form.value.longitud = +ll.lng.toFixed(6)
      buscarDireccion()
    })
  } else {
    marker.setLatLng([lat, lng])
  }
  form.value.latitud = +lat.toFixed(6)
  form.value.longitud = +lng.toFixed(6)
  map.setView([lat, lng], Math.max(15, map.getZoom()))
  if (reverse) buscarDireccion()
}

async function buscarDireccion() {
  try {
    const lat = form.value.latitud, lon = form.value.longitud
    if (lat === '' || lon === '' || lat == null || lon == null) return
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=es`
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
    if (!res.ok) return
    const j = await res.json()
    const a = j.address || {}
    const via = a.road || a.pedestrian || a.cycleway || a.footway || a.path || a.neighbourhood
    const localidad = a.suburb || a.village || a.town || a.city
    const texto = [via, localidad].filter(Boolean).join(', ')
    if (texto) form.value.descripcion = texto
  } catch {}
}

function toggleForm() {
  if (showForm.value) {
    cancelar()
  } else {
    showForm.value = true
    form.value = { descripcion: '', latitud: '', longitud: '', estado: true }
    setTimeout(ensureMap, 0)
  }
}

function editar(h: HidranteAdmin) {
  showForm.value = true
  editId.value = h.id
  form.value.descripcion = h.descripcion || ''
  form.value.estado = !!h.estado
  setTimeout(() => {
    ensureMap()
    setMarker(Number(h.latitud), Number(h.longitud), true)
  }, 0)
}

async function onSubmit() {
  error.value = ''
  const lat = Number(form.value.latitud)
  const lon = Number(form.value.longitud)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    error.value = 'Selecciona una ubicación en el mapa'
    return
  }
  if (!editId.value) {
    await crearHidranteAdmin({ latitud: lat, longitud: lon, descripcion: form.value.descripcion, estado: form.value.estado }, token)
      .then(async () => { await cargar(); cancelar() })
      .catch(e => error.value = e.message || 'Error al crear hidrante')
  } else {
    await updateHidranteAdmin(editId.value, { latitud: lat, longitud: lon, descripcion: form.value.descripcion }, token)
      .then(async () => { await cargar(); cancelar() })
      .catch(e => error.value = e.message || 'Error al actualizar hidrante')
  }
}

async function darDeBaja(h: HidranteAdmin) {
  await cambiarEstadoHidranteAdmin(h.id, false, token).then(cargar).catch(e => error.value = e.message || 'Error al dar de baja')
}
async function activar(h: HidranteAdmin) {
  await cambiarEstadoHidranteAdmin(h.id, true, token).then(cargar).catch(e => error.value = e.message || 'Error al activar')
}

function cancelar() {
  showForm.value = false
  editId.value = null
  form.value = { descripcion: '', latitud: '', longitud: '', estado: true }
  destroyMap()
}

const pageSize = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(hidrantes.value.length / pageSize)))
const paginados = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return hidrantes.value.slice(start, start + pageSize)
})
watch(hidrantes, () => { currentPage.value = 1 })

onMounted(cargar)
</script>

<style>
.map-wrap { height: 280px; margin: .5rem 0; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
#map-h { width: 100%; height: 100%; }

/* tabla estilo Bomberos */
.table { width:100%; border-collapse: collapse; margin-top: 1rem; background:#fff; border-radius:12px; overflow:hidden; }
.table th,.table td { padding:0.75rem 0.9rem; border-bottom:1px solid #e5e7eb; text-align:left; color:#0f172a; }
.table thead th { background:#f1f5f9; color:#334155; font-weight:600; }

.form-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:1rem; margin:.5rem 0 1rem; }
.form-grid { display:flex; flex-direction:column; gap:.5rem; }
.form-grid .row { display:flex; gap:.5rem; }
.row-actions { display:flex; gap:.5rem; }
.error { background:#ef4444; color:#fff; padding:.5rem .75rem; border-radius:8px; margin-top:.5rem; }
.pagination { margin-top:8px; display:flex; gap:12px; justify-content:flex-end; align-items:center; }
.sf-btn { background:#2563eb; color:#fff; border:none; padding:6px 10px; border-radius:4px; }
.sf-btn:disabled { background:#93c5fd; color:#fff; cursor:not-allowed; }
button.danger { background:#ef4444; color:#fff; }
</style>