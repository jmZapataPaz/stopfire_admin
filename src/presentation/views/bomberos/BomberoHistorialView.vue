<template>
  <div class="bh-container">
    <h2 class="sf-page-title">Historial de reportes mitigados</h2>

    <div class="bh-toolbar">
      <div class="bh-toolbar-left">
        <label>Estación:</label>
        <strong>{{ tituloEstacion }}</strong>

        <button class="sf-btn" @click="reload" :disabled="loading">Recargar</button>
        <span v-if="loading" class="sf-badge">Cargando…</span>
        <span v-if="error" class="bh-badge">{{ error }}</span>

        <!-- NUEVO: exportar PDF -->
        <button
          class="sf-btn sf-btn-secondary"
          @click="exportPdf"
          :disabled="items.length === 0"
        >
          Exportar PDF
        </button>
      </div>

      <!-- Filtros -->
      <div class="bh-filters">
        <label for="year-select">Año:</label>
        <select
          id="year-select"
          v-model="selectedYear"
          @change="currentPage = 1"
        >
          <option :value="'all'">Todos</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>

        <label for="month-select">Mes:</label>
        <select
          id="month-select"
          v-model="selectedMonth"
          @change="currentPage = 1"
        >
          <option :value="'all'">Todos</option>
          <option :value="1">Enero</option>
          <option :value="2">Febrero</option>
          <option :value="3">Marzo</option>
          <option :value="4">Abril</option>
          <option :value="5">Mayo</option>
          <option :value="6">Junio</option>
          <option :value="7">Julio</option>
          <option :value="8">Agosto</option>
          <option :value="9">Septiembre</option>
          <option :value="10">Octubre</option>
          <option :value="11">Noviembre</option>
          <option :value="12">Diciembre</option>
        </select>
      </div>
    </div>

    <table class="bh-table">
      <thead>
        <tr>
          <th>Ciudadano</th><th>CI</th><th>Celular</th>
          <th>Descripción</th><th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in paginatedItems"
          :key="r.idAsignacion"
          class="bh-row"
          @click="openImg(r.fotoUrl)"
        >
          <td>{{ r.nombreCompleto || '-' }}</td>
          <td>{{ r.ci || '-' }}</td>
          <td>{{ r.celular || '-' }}</td>
          <td>
            <span v-if="r.descripcion && r.descripcion.trim() !== ''">{{ r.descripcion }}</span>
            <span v-else class="bh-desc-empty">no descripción</span>
          </td>
          <td>{{ formatFecha(r.fechaCreacion) }}</td>
        </tr>
        <tr v-if="!loading && paginatedItems.length === 0">
          <td colspan="5" class="bh-empty">No hay reportes para los filtros seleccionados.</td>
        </tr>
      </tbody>
    </table>

    <!-- Paginación -->
    <div class="bh-pagination">
      <button
        class="sf-btn"
        :disabled="currentPage <= 1"
        @click="currentPage = Math.max(1, currentPage - 1)"
      >
        Anterior
      </button>

      <span>Página {{ currentPage }} de {{ totalPages }}</span>

      <button
        class="sf-btn"
        :disabled="currentPage >= totalPages"
        @click="currentPage = Math.min(totalPages, currentPage + 1)"
      >
        Siguiente
      </button>
    </div>

    <div class="bh-footer">Click en una fila para ver la fotografía.</div>
    <ImagenModal v-if="imgOpen" :src="imgSrc" @close="imgOpen=false"/>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { BomberoHistorialItem } from '../../../domain/bomberoHistorial'
import { getHistorialAceptadosPorEstacion } from '../../../infraestructure/bomberoService'
import { getClaim } from '../../../utils/jwt'
import { getMiEstacion } from '../../../infraestructure/estacionBomberoService'
import '../../../assets/BomberoHistorialView.css'
import '../../../assets/ReporteDetalleModal.css'
import ImagenModal from '../../components/ImagenModal.vue'

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : ''
}
const token = getCookie('csrftoken')

const estacionId = ref<number | null>(null)
const estacionNombre = ref<string>('') 
const tituloEstacion = computed(() => estacionNombre.value || '-')

const items = ref<BomberoHistorialItem[]>([])
const loading = ref(false)
const error = ref('')

const imgOpen = ref(false)
const imgSrc = ref<string | null>(null)

function openImg(src?: string | null) { imgSrc.value = src || null; imgOpen.value = true }
function formatFecha(f?: string | null) { if (!f) return '-'; try { return new Date(f).toLocaleString() } catch { return f } }

// --- Filtros y paginación ---
const selectedYear = ref<number | 'all'>('all')
const selectedMonth = ref<number | 'all'>('all')
const currentPage = ref(1)
const pageSize = 10

const years = computed(() => {
  const set = new Set<number>()
  for (const r of items.value) {
    if (!r.fechaCreacion) continue
    const d = new Date(r.fechaCreacion)
    if (!Number.isFinite(d.getTime())) continue
    set.add(d.getFullYear())
  }
  return Array.from(set).sort((a, b) => b - a)
})

const filteredItems = computed(() => {
  return items.value.filter(r => {
    if (!r.fechaCreacion) return false
    const d = new Date(r.fechaCreacion)
    if (!Number.isFinite(d.getTime())) return false
    const y = d.getFullYear()
    const m = d.getMonth() + 1

    if (selectedYear.value !== 'all' && y !== selectedYear.value) return false
    if (selectedMonth.value !== 'all' && m !== selectedMonth.value) return false
    return true
  })
})

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredItems.value.length / pageSize))
)

const paginatedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredItems.value.slice(start, start + pageSize)
})

async function reload() {
  if (!estacionId.value) return
  loading.value = true; error.value = ''
  try {
    items.value = await getHistorialAceptadosPorEstacion(token, estacionId.value)
    currentPage.value = 1
  } catch (e: any) {
    error.value = e?.message || 'Error al cargar historial'
  } finally { loading.value = false }
}

function exportPdf() {
  if (!items.value.length) return

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  })

  const titulo = `Historial de reportes mitigados`
  const subtitulo = estacionNombre.value
    ? `Estación: ${estacionNombre.value}`
    : 'Estación: -'

  doc.setFontSize(16)
  doc.text(titulo, 40, 40)
  doc.setFontSize(11)
  doc.text(subtitulo, 40, 60)
  doc.setFontSize(9)
  doc.text(`Generado: ${new Date().toLocaleString()}`, 40, 76)

  const body = items.value.map(r => {
    const fecha = formatFecha(r.fechaCreacion)
    return [
      r.nombreCompleto || '-',
      r.ci || '-',
      r.celular || '-',
      (r.descripcion && r.descripcion.trim() !== '') ? r.descripcion : 'no descripción',
      fecha
    ]
  })

  autoTable(doc, {
    startY: 90,
    head: [[ 'Ciudadano', 'CI', 'Celular', 'Descripción', 'Fecha' ]],
    body,
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [220, 53, 69],
      textColor: 255,
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 70 },
      2: { cellWidth: 80 },
      3: { cellWidth: 230 },
      4: { cellWidth: 90 }
    }
  })

  const fileName = `historial_reportes_${new Date().toISOString().slice(0,10)}.pdf`
  doc.save(fileName)
}

onMounted(async () => {
  const eid = Number(getClaim(token, 'estacion_id', 'estacionId'))
  if (!Number.isFinite(eid) || eid <= 0) {
    error.value = 'Token sin estacion_id. Vuelva a iniciar sesión.'
    return
  }
  estacionId.value = eid

  try {
    const mi = await getMiEstacion(token)
    if (mi?.nombre) estacionNombre.value = mi.nombre
  } catch (e: any) {
    console.warn('getMiEstacion error:', e?.message || e)
  }

  await reload()
})
</script>

<style>
.bh-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.bh-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bh-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bh-filters select {
  padding: 2px 4px;
  font-size: 0.85rem;
}

.bh-pagination {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}

.sf-btn.sf-btn-secondary {
  background: #e5e7eb;
  color: #111827;
}

.bh-empty {
  text-align: center;
  padding: 12px 0;
  color: #6b7280;
  font-style: italic;
}
</style>