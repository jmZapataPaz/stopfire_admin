<template>
  <div class="bombero-map">
    <div id="bombero-map"></div>
    <p v-if="error" class="error">{{ error }}</p>
    <ReporteDetalleModal
      v-if="detalleVisible && detalleActual"
      :token="token"
      :reporte="detalleActual"
      @close="cerrarDetalle"
      @mitigado="onMitigado"
    />
  </div>
</template>

<script lang="ts" setup>
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { onMounted, ref, onBeforeUnmount } from 'vue'
import type { Estacion } from '../../../domain/estacion'
import type { Reporte } from '../../../domain/reporte'
import { getEstacionesBombero } from '../../../infraestructure/estacionBomberoService'
import { getReportes } from '../../../infraestructure/reporteService'
import '../../../assets/BomberoMapView.css'
import '../../../assets/ReporteDetalleModal.css'
import ReporteDetalleModal from '../../components/ReporteDetalleModal.vue'

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
const reportesLayer = ref<L.FeatureGroup | null>(null)
const estaciones = ref<Estacion[]>([])
const reportesAceptados = ref<Reporte[]>([])
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
async function cargarReportesAceptados() {
  try {
    const todos = await getReportes(token)
    reportesAceptados.value = todos.filter(r =>
      (r.estado ?? '').toUpperCase() === 'ACEPTADO' &&
      Number.isFinite(r.latitud) && Number.isFinite(r.longitud)
    )
    dibujarReportes()
  } catch (e: any) {
    console.warn('[Reportes] carga falló:', e?.message || e)
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
function dibujarReportes() {
  if (!mapRef.value || !reportesLayer.value) return
  reportesLayer.value.clearLayers()

  const icon = L.divIcon({
    className: 'sf-warning-marker',
    html: '⚠️',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })

  for (const r of reportesAceptados.value) {
    const lat = Number(r.latitud), lng = Number(r.longitud)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const m = L.marker([lat, lng], { icon, interactive: true })
      m.on('click', () => abrirDetalle(r))
      m.addTo(reportesLayer.value)
    }
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
  reportesLayer.value = L.featureGroup().addTo(mapRef.value)
}

function centrarReporte(r: any) {
  if (!mapRef.value) return;
  const lat = Number(r.latitud), lng = Number(r.longitud);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    mapRef.value.setView([lat, lng], Math.max(mapRef.value.getZoom(), 16));
  }
}

function upsertReporteAceptado(nuevo: Reporte) {
  const idx = reportesAceptados.value.findIndex(x => x.id === nuevo.id);
  if (idx >= 0) reportesAceptados.value[idx] = nuevo;
  else reportesAceptados.value.push(nuevo);
  dibujarReportes();
}

async function cargarReporteAceptadoPorId(id: number): Promise<Reporte | null> {
  try {
    const todos = await getReportes(token);
    const r = todos.find(x => x.id === id && (String(x.estado || '').toUpperCase() === 'ACEPTADO'));
    return r ?? null;
  } catch {
    return null;
  }
}

function buildReporteFromPayload(p: any): Reporte | null {
  if (!p) return null;
  const id = Number((p.id ?? p.Id ?? p.reporteId ?? p.ReporteId));
  const lat = Number(p.latitud ?? p.Latitud);
  const lng = Number(p.longitud ?? p.Longitud);
  if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id,
    descripcion: p.descripcion ?? p.Descripcion ?? '',
    fotoUrl: p.fotoUrl ?? p.FotoUrl ?? '',
    latitud: lat,
    longitud: lng,
    estado: (p.estado ?? p.Estado) || 'ACEPTADO',
    fechaCreacion: p.fechaCreacion ?? p.FechaCreacion ?? ''
  };
}

function getStationIdFromJwt(t: string): number | null {
  try {
    const parts = t.split('.');
    if (parts.length !== 3) return null;
    const json = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    const v = json.estacion_id ?? json.estacionId ?? json.station_id ?? json.stationId;
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}
function getAuthToken(): string {
  return token || localStorage.getItem('token') || '';
}
const myStationId = getStationIdFromJwt(getAuthToken());

async function onReporteAceptado(ev: any) {
  const d = ev?.detail ?? {};
  const p = d.payload ?? d;
  const id = Number(d.id ?? p?.id ?? p?.Id ?? p?.reporteId ?? p?.ReporteId);
  if (!Number.isFinite(id)) return;
  let rep = buildReporteFromPayload(p);
  if (!rep) {
    rep = await cargarReporteAceptadoPorId(id);
  }
  if (rep) {
    upsertReporteAceptado(rep);
    const cand =
      Number(p?.estacionId ?? p?.EstacionId ?? p?.primeraCandidata ?? p?.PrimeraCandidata ?? p?.candidata ?? p?.Candidata);
    const repEst = Number((rep as any)?.idEstacion ?? (rep as any)?.estacionId);

    const isMine =
      (Number.isFinite(cand) && myStationId != null && cand === myStationId) ||
      (!Number.isFinite(cand) && Number.isFinite(repEst) && myStationId != null && repEst === myStationId);

    if (isMine) {
      centrarReporte(rep); 
    }
  }
}

const detalleVisible = ref(false)
const detalleActual = ref<Reporte | null>(null)

function abrirDetalle(r: Reporte) {
  detalleActual.value = r
  detalleVisible.value = true
}
function cerrarDetalle() {
  detalleVisible.value = false
  detalleActual.value = null
}
function onMitigado(id: number) {
  reportesAceptados.value = reportesAceptados.value.filter(r => r.id !== id)
  dibujarReportes()
  cerrarDetalle()
}

onMounted(async () => {
  window.addEventListener('reporte-aceptado', onReporteAceptado);
  window.addEventListener('reporte-mitigado', onReporteMitigado);
  initMap();
  await cargar();
  await cargarReportesAceptados();
});

onBeforeUnmount(() => {
  window.removeEventListener('reporte-aceptado', onReporteAceptado);
  window.removeEventListener('reporte-mitigado', onReporteMitigado);
});

function onReporteMitigado(ev: any) {
  const id = Number(ev?.detail?.id ?? ev?.detail?.Id);
  if (!id) return;
  reportesAceptados.value = reportesAceptados.value.filter(r => r.id !== id);
  dibujarReportes();
}
</script>
