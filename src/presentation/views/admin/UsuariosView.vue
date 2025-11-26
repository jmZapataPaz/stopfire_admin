<template>
  <div class="usuarios">
    <h2>Ciudadanos</h2>

    <div class="toolbar" style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:8px;">
      <p v-if="error" class="error" style="margin:0">{{ error }}</p>

      <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
        <label>Año:</label>
        <select v-model="selectedYear" @change="currentPage = 1">
          <option :value="'all'">Todos</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>

        <label>Mes:</label>
        <select v-model="selectedMonth" @change="currentPage = 1">
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

    <table class="table" v-if="paginatedUsuarios.length">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>CI</th>
          <th>Correo</th>
          <th>Celular</th>
          <th>Último ingreso</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in paginatedUsuarios" :key="u.id">
          <td>{{ u.nombre }} {{ u.apellido }}</td>
          <td>{{ u.ci }}</td>
          <td>{{ u.correo }}</td>
          <td>{{ u.celular }}</td>
          <td>{{ formatUltimoIngreso(u.ultimoIngreso) }}</td>
        </tr>
        <tr v-if="paginatedUsuarios.length === 0">
          <td colspan="5">No hay usuarios para los filtros seleccionados.</td>
        </tr>
      </tbody>
    </table>

    <div v-else>Cargando...</div>

    <div class="pagination" style="margin-top:8px;display:flex;gap:12px;justify-content:flex-end;align-items:center;">
      <button class="sf-btn" :disabled="currentPage <= 1" @click="currentPage = Math.max(1, currentPage - 1)">Anterior</button>
      <span>Página {{ currentPage }} de {{ totalPages }}</span>
      <button class="sf-btn" :disabled="currentPage >= totalPages" @click="currentPage = Math.min(totalPages, currentPage + 1)">Siguiente</button>
    </div>

    <div v-if="noDataByFilters" style="margin-top:16px;color:gray;">
      No hay datos disponibles para los filtros seleccionados.
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import type { User } from '../../../domain/user'
import { getUsuarios } from '../../../infraestructure/usuarioService'

const usuarios = ref<User[]>([])
const error = ref('')

// Filtros y paginación
const selectedYear = ref<number | 'all'>('all')
const selectedMonth = ref<number | 'all'>('all')
const currentPage = ref(1)
const pageSize = 10

function parseDate(v: any): Date | null {
  if (!v) return null
  try {
    const d = new Date(typeof v === 'string' ? v : v?.toString())
    return Number.isFinite(d.getTime()) ? d : null
  } catch { return null }
}

const years = computed(() => {
  const set = new Set<number>()
  for (const u of usuarios.value) {
    const d = parseDate((u as any).ultimoIngreso)
    if (d) set.add(d.getFullYear())
  }
  return Array.from(set).sort((a, b) => b - a)
})

const filteredUsuarios = computed(() => {
  const base = usuarios.value.filter(u => Number(u.rolId) === 3) // ciudadanos
  return base.filter(u => {
    const d = parseDate((u as any).ultimoIngreso)
    if (!d) return selectedYear.value === 'all' && selectedMonth.value === 'all'
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    if (selectedYear.value !== 'all' && y !== selectedYear.value) return false
    if (selectedMonth.value !== 'all' && m !== selectedMonth.value) return false
    return true
  })
})

// NUEVO: bandera para mostrar mensaje cuando no hay datos por filtros
const noDataByFilters = computed(() => filteredUsuarios.value.length === 0)

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredUsuarios.value.length / pageSize))
)

const paginatedUsuarios = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredUsuarios.value.slice(start, start + pageSize)
})

function formatUltimoIngreso(v: any): string {
  const d = parseDate(v)
  if (!d) return '-'
  return d.toLocaleDateString() // solo fecha
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift()!
  return null
}
const token = getCookie('csrftoken') || ''

async function cargar() {
  error.value = ''
  const list = await getUsuarios(token).catch(e => {
    error.value = e.message || 'Error al obtener usuarios'
    return []
  })
  usuarios.value = list
  currentPage.value = 1
}

onMounted(cargar)
</script>

<style>
/* MISMO DISEÑO QUE BOMBEROS */
.table { 
  width:100%; border-collapse: collapse; margin-top: 1rem; 
  background:#fff; border-radius:12px; overflow:hidden;
}
.table th, .table td { padding:0.75rem 0.9rem; border-bottom:1px solid #e5e7eb; text-align:left; color:#0f172a; }
.table thead th { background:#f1f5f9; color:#334155; font-weight:600; }

.pagination { margin-top:8px; display:flex; gap:12px; justify-content:flex-end; align-items:center; }
.sf-btn { background:#2563eb; color:#fff; border:none; padding:6px 10px; border-radius:4px; }
.sf-btn:disabled { background:#93c5fd; color:#fff; cursor:not-allowed; }

/* Tipografía consistente para filtros y tabla */
.toolbar label, .toolbar select,
.table th, .table td {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
}
</style>