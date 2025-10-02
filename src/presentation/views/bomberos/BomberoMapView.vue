<template>
  <div class="bombero-map">
    <div id="bombero-map"></div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, ref, onBeforeUnmount } from 'vue'
import type { Estacion } from '../../../domain/estacion'
import { getEstacionesBombero } from '../../../infraestructure/estacionBomberoService'
import '../../../assets/BomberoMapView.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

const defaultIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41]
})

const mapRef = ref<L.Map | null>(null)
const estacionesLayer = ref<L.FeatureGroup | null>(null)
const estaciones = ref<Estacion[]>([])
const error = ref('')

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift()!
  return null
}
const token = getCookie('csrftoken') || ''

function normalizeGeometry(input: any): any {
  if (!input) return null
  let v: any = input
  if (typeof v === 'string') { try { v = JSON.parse(v) } catch { return null } }
  if (v?.type === 'Feature') return v.geometry || null
  if (v?.type === 'Polygon' || v?.type === 'MultiPolygon') return v
  return null
}

function colorForOwner(id: any) {
  const n = Number(id || 0)
  const h = (n * 47) % 360
  return `hsl(${h} 70% 45%)`
}

async function cargar() {
  try {
    estaciones.value = await getEstacionesBombero(token)
    dibujar()
  } catch (e: any) {
    error.value = (e.message || 'Error').slice(0, 160)
  }
}

function dibujar() {
  if (!mapRef.value || !estacionesLayer.value) return
  estacionesLayer.value.clearLayers()
  const boundsPts: L.LatLngExpression[] = []

  for (const e of estaciones.value) {
    const lat = Number(e.latitud)
    const lng = Number(e.longitud)
    if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
      const mk = L.marker([lat, lng], {
        icon: defaultIcon,
        keyboard: false,
        interactive: false
      })
      estacionesLayer.value.addLayer(mk)
      boundsPts.push([lat, lng])
    }
    const geom = normalizeGeometry((e as any).coberturaGeoJson ?? (e as any).cobertura)
    if (geom) {
      const c = colorForOwner((e as any).idUsuario)
      const gj = L.geoJSON(geom as any, {
        style: { color: c, weight: 2, fillColor: c, fillOpacity: 0.25 },
        interactive: false
      })
      estacionesLayer.value.addLayer(gj)
      try {
        const b = gj.getBounds()
        if (b.isValid()) boundsPts.push(b.getNorthWest(), b.getSouthEast())
      } catch {}
    }
  }

  if (boundsPts.length) {
    const b = L.latLngBounds(boundsPts as any)
    if (b.isValid()) mapRef.value.fitBounds(b, { padding: [30, 30] })
  }
}

function initMap() {
  const el = document.getElementById('bombero-map')
  if (!el) return
  mapRef.value = L.map(el, {
    zoomControl: true,
    attributionControl: true
  }).setView([-17.7833, -63.1821], 13)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(mapRef.value)
  estacionesLayer.value = L.featureGroup().addTo(mapRef.value)
}

function centrarReporte(r: any) {
  if (!mapRef.value) return;
  const lat = Number(r.latitud), lng = Number(r.longitud);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    L.marker([lat, lng], { icon: defaultIcon }).addTo(mapRef.value);
    mapRef.value.setView([lat, lng], 16);
  }
}

function onReporteAceptado(ev: any) {
  centrarReporte(ev.detail);
}

onMounted(async () => {
  window.addEventListener('reporte-aceptado', onReporteAceptado);
  initMap();
  await cargar();
});

onBeforeUnmount(() => {
  window.removeEventListener('reporte-aceptado', onReporteAceptado);
});
</script>
