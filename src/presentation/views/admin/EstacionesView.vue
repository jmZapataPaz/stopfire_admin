<template>
  <div class="estaciones">
    <div class="map-wrap">
      <div id="map" ref="mapEl"></div>
    </div>
    <div class="panel">
      <div class="form-card">
        <div class="toolbar">
          <button @click="toggleCreate">{{ showForm ? 'Cerrar' : 'Crear Estación' }}</button>
        </div>
        <h3 v-if="showForm || editId">{{ editId ? 'Editar estación' : 'Crear estación' }}</h3>
        <form v-if="showForm || editId" @submit.prevent="onSubmit" class="form-grid">
          <input class="full" v-model="form.nombre" type="text" placeholder="Nombre" required />
          <input v-model="form.descripcionDireccion" type="text" placeholder="Descripción dirección" required />
          <select v-model="form.idUsuario" required>
            <option value="" disabled>Selecciona propietario</option>
            <option v-for="b in bomberosDisponibles" :key="b.id" :value="b.id">{{ b.nombre }} {{ b.apellido }}</option>
          </select>
          <input v-model="form.celular" type="tel" inputmode="numeric" pattern="[0-9]*" placeholder="Celular" required @input="onlyDigits" />
          <label>
            <input v-model="form.estado" type="checkbox" />
            Activa
          </label>
          <input v-model="form.latitud" type="hidden" />
          <input v-model="form.longitud" type="hidden" />
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
            <th>Nombre</th>
            <th>Celular</th>
            <th>Propietario</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in estaciones" :key="e.id">
            <td>{{ e.nombre }}</td>
            <td>{{ e.celular }}</td>
            <td>{{ propietarioNombre(e.idUsuario) }}</td>
            <td>{{ e.estado ? 'Activa' : 'Inactiva' }}</td>
            <td class="row-actions">
              <button @click="centrar(e)">Ver</button>
              <button @click="editar(e)">Editar</button>
              <!-- Reemplazo: Dar de baja / Activar -->
              <button v-if="e.estado" @click="darDeBaja(e)">Dar de baja</button>
              <button v-else @click="activar(e)">Activar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts" setup>
import '../../../assets/EstacionesView.css'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw/dist/leaflet.draw.css'
import * as L from 'leaflet'
import 'leaflet-draw'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { ref, onMounted, computed } from 'vue'
import { getEstaciones, crearEstacion, updateEstacion, deleteEstacion } from '../../../infraestructure/estacionService'
import { cambiarEstadoEstacion } from '../../../infraestructure/estacionService'
import { getBomberos, type Bombero } from '../../../infraestructure/bomberoService'
import type { Estacion } from '../../../domain/estacion'

const mapEl = ref<HTMLDivElement | null>(null)
const map = ref<L.Map | null>(null)
const marker = ref<L.Marker | null>(null)
const polygonLayer = ref<L.Layer | null>(null)
const estacionesLayer = ref<L.LayerGroup | null>(null)
const editingLayer = ref<L.LayerGroup | null>(null)
const drawnItems = ref<L.FeatureGroup | null>(null)
const stationLayers = ref<Map<number, L.LayerGroup>>(new Map())
const hiddenEditedLayer = ref<L.LayerGroup | null>(null)
const isDrawing = ref(false)
const drawControlRef = ref<any>(null)

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift()!
  return null
}
const token = getCookie('csrftoken') || ''

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const pinIcon = L.divIcon({ className: 'station-marker', html: '<span class="m">📍</span>', iconSize: [24, 24], iconAnchor: [12, 24] })

const estaciones = ref<Estacion[]>([])
const bomberos = ref<Bombero[]>([])
const bomberosCompleto = ref<Bombero[]>([])
const error = ref('')
const showForm = ref(false)
const editId = ref<number | null>(null)
const form = ref({
  nombre: '',
  latitud: '',
  longitud: '',
  descripcionDireccion: '',
  celular: '',
  estado: true,
  idUsuario: '' as number | ''
})
const coberturaGeoJson = ref<any | null>(null)
const bomberosDisponibles = computed(() => {
  return bomberosCompleto.value.filter((b: Bombero) => {
    if (!b.estado) return false
    if (editId.value && form.value.idUsuario === b.id) return true
    return !b.tieneEstacionAsignada
  })
})

const polygonStyle: L.PathOptions = { color: '#1d4ed8', weight: 2, fillColor: '#60a5fa', fillOpacity: 0.25 }
function colorForOwner(id: any) {
  const n = Number(id || 0)
  const h = (n * 47) % 360
  return `hsl(${h} 70% 45%)`
}

function normalizeGeometry(input: any): any {
  if (!input) return null
  let val: any = input
  if (typeof val === 'string') {
    try { val = JSON.parse(val) } catch { return null }
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try { val = JSON.parse(val) } catch { return null }
    }
  }
  if (val && val.type === 'Feature') return val.geometry || null
  if (val && (val.type === 'Polygon' || val.type === 'MultiPolygon')) return val
  return null
}

function geojsonPolygonToLatLngs(geom: any): L.LatLngExpression[] | L.LatLngExpression[][] {
  if (!geom || geom.type !== 'Polygon') return []
  return geom.coordinates.map((ring: number[][]) => ring.map(([lng, lat]) => [lat, lng]))
}

function setPolygonFromGeoJson(geom: any) {
  if (!drawnItems.value || !geom) return
  drawnItems.value.clearLayers()
  const latlngs = geojsonPolygonToLatLngs(geom)
  const poly = L.polygon(latlngs as any, polygonStyle)
  poly.addTo(drawnItems.value as any)
  polygonLayer.value = poly
  coberturaGeoJson.value = geom
}

async function cargar() {
  error.value = ''
  const list = await getEstaciones(token).catch(e => {
    error.value = e.message || 'Error al obtener estaciones'
    return []
  })
  estaciones.value = list
  dibujarEstaciones()
}

async function cargarBomberos() {
  const list = await getBomberos(token).catch(() => [])
  bomberosCompleto.value = Array.isArray(list) ? list : []
  bomberos.value = bomberosCompleto.value.filter((b:any) => b.estado !== false)
}

function initMap() {
  if (!mapEl.value) return
  map.value = L.map(mapEl.value).setView([-17.7833, -63.1821], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap' }).addTo(map.value as any)
  estacionesLayer.value = L.layerGroup().addTo(map.value as any)
  editingLayer.value = L.layerGroup().addTo(map.value as any)
  drawnItems.value = new L.FeatureGroup()
  drawnItems.value.addTo(map.value as any)

  drawControlRef.value = new (L as any).Control.Draw({
    draw: { polygon: true, polyline: false, rectangle: false, circle: false, marker: false, circlemarker: false },
    edit: { featureGroup: drawnItems.value }
  })
  map.value.addControl(drawControlRef.value as any)

  map.value.on('draw:drawstart', () => { isDrawing.value = true })
  map.value.on('draw:drawstop', () => { isDrawing.value = false })
  map.value.on('draw:editstart', () => { isDrawing.value = true })
  map.value.on('draw:editstop', () => { isDrawing.value = false })
  map.value.on('draw:deletestart', () => { isDrawing.value = true })
  map.value.on('draw:deletestop', () => { isDrawing.value = false })
  map.value.on('draw:deleted', () => {
    coberturaGeoJson.value = null
    drawnItems.value?.clearLayers()
    polygonLayer.value = null
    isDrawing.value = false
    const tb = (drawControlRef.value as any)?._toolbars
    tb?.edit?.disable?.()
    tb?.draw?.enable?.()
  })

  map.value.on('draw:created', (e: any) => {
    drawnItems.value?.clearLayers()
    polygonLayer.value = e.layer
    e.layer.setStyle?.(polygonStyle)
    ;(drawnItems.value as any).addLayer(e.layer as any)
    const feature = e.layer.toGeoJSON()
    coberturaGeoJson.value = feature && feature.geometry ? feature.geometry : null
    isDrawing.value = false
  })

  map.value.on('draw:edited', () => {
    let geom: any = null
    ;(drawnItems.value as any).eachLayer((l: any) => {
      const f = l.toGeoJSON()
      geom = f && f.geometry ? f.geometry : null
      l.setStyle?.(polygonStyle)
    })
    coberturaGeoJson.value = geom
  })

  map.value.on('click', (ev: any) => {
    if (isDrawing.value) return
    const lat = ev.latlng.lat
    const lng = ev.latlng.lng
    if (!marker.value) {
      marker.value = L.marker([lat, lng], { draggable: true, icon: pinIcon }).addTo(editingLayer.value as any)
      marker.value.on('dragend', syncFromMarker)
    } else {
      marker.value.setLatLng([lat, lng])
    }
    form.value.latitud = String(lat)
    form.value.longitud = String(lng)
  })
}

function syncFromMarker() {
  if (!marker.value) return
  const ll = marker.value.getLatLng()
  form.value.latitud = String(ll.lat)
  form.value.longitud = String(ll.lng)
}

function resetForm() {
  editId.value = null
  form.value = { nombre: '', latitud: '', longitud: '', descripcionDireccion: '', celular: '', estado: true, idUsuario: '' }
  coberturaGeoJson.value = null
  editingLayer.value?.clearLayers()
  marker.value = null
  drawnItems.value?.clearLayers()
  polygonLayer.value = null
}

function centrar(e: Estacion) {
  const lat = Number(e.latitud)
  const lng = Number(e.longitud)
  if (map.value && !Number.isNaN(lat) && !Number.isNaN(lng)) map.value.setView([lat, lng], 15)
}

function editar(e: Estacion) {
  resetForm()
  editId.value = e.id
  showForm.value = true
  if (hiddenEditedLayer.value && estacionesLayer.value) {
    hiddenEditedLayer.value.addTo(estacionesLayer.value as any)
    hiddenEditedLayer.value = null
  }
  const group = stationLayers.value.get(e.id as any)
  if (group && estacionesLayer.value) {
    ;(estacionesLayer.value as any).removeLayer(group as any)
    hiddenEditedLayer.value = group
  }
  form.value.nombre = e.nombre || ''
  form.value.latitud = e.latitud || ''
  form.value.longitud = e.longitud || ''
  form.value.descripcionDireccion = e.descripcionDireccion || ''
  form.value.celular = e.celular || ''
  form.value.estado = !!e.estado
  ;(form.value as any).idUsuario = (e as any).idUsuario ?? ''
  if (form.value.latitud && form.value.longitud && map.value) {
    marker.value = L.marker([Number(form.value.latitud), Number(form.value.longitud)], { draggable: true, icon: pinIcon }).addTo(editingLayer.value as any)
    marker.value.on('dragend', syncFromMarker)
  }
  const cov = normalizeGeometry((e as any).cobertura ?? (e as any).coberturaGeoJson)
  drawnItems.value?.clearLayers()
  polygonLayer.value = null
  if (cov && map.value) {
    setPolygonFromGeoJson(cov)
    const bounds = (polygonLayer.value as any)?.getBounds?.()
    if (bounds) map.value.fitBounds(bounds)
  }
}

async function eliminar(e: Estacion) {
  if (!confirm('¿Eliminar estación?')) return
  await deleteEstacion(e.id, token).then(async () => {
    if (editId.value === e.id) { resetForm(); showForm.value = false }
    hiddenEditedLayer.value = null
    await cargar()
    dibujarEstaciones()
  }).catch(err => {
    error.value = err.message || 'Error al eliminar estación'
  })
}

async function darDeBaja(e: Estacion) {
  error.value = ''
  try {
    await cambiarEstadoEstacion(e.id, false, token)
    await cargar()
    dibujarEstaciones()
  } catch (err: any) {
    error.value = err.message || 'Error al dar de baja estación'
  }
}

async function activar(e: Estacion) {
  error.value = ''
  try {
    await cambiarEstadoEstacion(e.id, true, token)
    await cargar()
    dibujarEstaciones()
  } catch (err: any) {
    error.value = err.message || 'Error al activar estación'
  }
}

async function onSubmit() {
  error.value = ''
  if (!form.value.nombre || !form.value.descripcionDireccion || !form.value.celular) {
    error.value = 'Completa los campos requeridos'
    return
  }
  if (!form.value.latitud || !form.value.longitud) {
    error.value = 'Selecciona la ubicación en el mapa'
    return
  }
  if (!coberturaGeoJson.value) {
    error.value = 'Dibuja una cobertura válida'
    return
  }
  if (!form.value.idUsuario) {
    error.value = 'Selecciona un propietario'
    return
  }

  const coberturaObj = typeof coberturaGeoJson.value === 'string'
    ? JSON.parse(coberturaGeoJson.value)
    : coberturaGeoJson.value

  if (!editId.value) {
    const body: any = {
      nombre: form.value.nombre,
      latitud: form.value.latitud,
      longitud: form.value.longitud,
      descripcionDireccion: form.value.descripcionDireccion,
      celular: form.value.celular,
      estado: form.value.estado,
      coberturaGeoJson: coberturaObj,
      idUsuario: Number(form.value.idUsuario)
    }
    await crearEstacion(body, token).then(async () => {
      await cargar()
      await cargarBomberos() 
      resetForm()
      showForm.value = false
      dibujarEstaciones()
    }).catch(e => error.value = e.message || 'Error al crear estación')
  } else {
    const body: any = {
      nombre: form.value.nombre,
      latitud: form.value.latitud,
      longitud: form.value.longitud,
      descripcionDireccion: form.value.descripcionDireccion,
      celular: form.value.celular,
      estado: form.value.estado,
      idUsuario: Number(form.value.idUsuario)
    }
    if (coberturaObj) body.coberturaGeoJson = coberturaObj
    await updateEstacion(editId.value, body, token).then(async () => {
      await cargar()
      await cargarBomberos()
      if (hiddenEditedLayer.value && estacionesLayer.value) {
        hiddenEditedLayer.value.addTo(estacionesLayer.value as any)
        hiddenEditedLayer.value = null
      }
      resetForm()
      showForm.value = false
      dibujarEstaciones()
    }).catch(e => error.value = e.message || 'Error al actualizar estación')
  }
}

function cancelar() {
  if (hiddenEditedLayer.value && estacionesLayer.value) {
    hiddenEditedLayer.value.addTo(estacionesLayer.value as any)
    hiddenEditedLayer.value = null
  }
  resetForm()
  showForm.value = false
  dibujarEstaciones()
}

function dibujarEstaciones() {
  if (!map.value || !estacionesLayer.value) return
  ;(estacionesLayer.value as any).clearLayers()
  stationLayers.value.clear()
  estaciones.value.forEach((e: any) => {
    if (!e.estado) return 
    const group = L.layerGroup()
    const lat = Number(e.latitud)
    const lng = Number(e.longitud)
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      L.marker([lat, lng], { icon: pinIcon }).addTo(group as any)
    }
    const geom = normalizeGeometry(e.cobertura ?? e.coberturaGeoJson)
    if (geom) {
      const c = colorForOwner(e.idUsuario)
      ;(L.geoJSON(geom as any, { style: { ...polygonStyle, color: c, fillColor: c } }) as any).addTo(group as any)
    }
    group.addTo(estacionesLayer.value as any)
    stationLayers.value.set(e.id, group)
  })
}

function toggleCreate() {
  if (showForm.value) {
    cancelar()
  } else {
    resetForm()
    showForm.value = true
  }
}

function onlyDigits(e: Event) {
  const el = e.target as HTMLInputElement
  el.value = el.value.replace(/\D/g, '')
  form.value.celular = el.value
}

function propietarioNombre(id: any): string {
  const n = Number(id)
  const b = bomberosCompleto.value.find(x => x.id === n)
  return b ? `${b.nombre} ${b.apellido}`.trim() : '—'
}

onMounted(() => {
  initMap()
  cargar()
  cargarBomberos()
})
</script>