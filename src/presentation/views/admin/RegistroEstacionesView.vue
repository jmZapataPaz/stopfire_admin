<template>
  <div class="reg-estaciones">
    <h2>Registro de estaciones</h2>

    <div class="toolbar">
      <span v-if="error" class="error">{{ error }}</span>

      <div class="filters">
        <label>Estación:</label>
        <select v-model="selectedEstacionId" @change="onFilterChange">
          <option :value="''">Todas</option>
          <option v-for="e in estacionesOpts" :key="e.id" :value="e.id">{{ e.nombre }}</option>
        </select>

        <label>Responsable:</label>
        <select v-model="selectedRespId" @change="onFilterChange">
          <option :value="''">Todos</option>
          <option v-for="b in bomberosOpts" :key="b.id" :value="b.id">{{ b.nombre }} {{ b.apellido }}</option>
        </select>

        <label>Año:</label>
        <select v-model="selectedYear" @change="onFilterChange">
          <option :value="'all'">Todos</option>
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>

        <label>Mes:</label>
        <select v-model="selectedMonth" @change="onFilterChange">
          <option :value="'all'">Todos</option>
          <option v-for="m in 12" :key="m" :value="m">{{ monthName(m) }}</option>
        </select>
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Estación</th>
          <th>Responsable</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in paginated" :key="r.id">
          <td>{{ formatDate(r.fecha) }}</td>
          <td>{{ r.estacionNombre }}</td>
          <td>{{ r.responsableNombre }}</td>
        </tr>
        <tr v-if="!loading && paginated.length === 0">
          <td colspan="3" class="empty">No hay registros para los filtros seleccionados.</td>
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
import { ref, computed, onMounted } from 'vue'
import { getRegistrosEstaciones, type RegistroEstacion } from '../../../infraestructure/registroEstacion'
import { getEstaciones } from '../../../infraestructure/estacionService'
import { getBomberos } from '../../../infraestructure/bomberoService'

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift()!
  return null
}
const token = getCookie('csrftoken') || ''

const registros = ref<RegistroEstacion[]>([])
const loading = ref(false)
const error = ref('')

const estacionesOpts = ref<{id:number; nombre:string}[]>([])
const bomberosOpts = ref<{id:number; nombre:string; apellido:string}[]>([])

const selectedEstacionId = ref<number | ''>('')
const selectedRespId = ref<number | ''>('')
const selectedYear = ref<number | 'all'>('all')
const selectedMonth = ref<number | 'all'>('all')

const pageSize = 10
const currentPage = ref(1)

function formatDate(v: string) {
  const d = new Date(v)
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString() : '-'
}
function monthName(m: number) {
  return ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][m-1]
}

const years = computed(() => {
  const set = new Set<number>()
  for (const r of registros.value) {
    const d = new Date(r.fecha)
    if (Number.isFinite(d.getTime())) set.add(d.getFullYear())
  }
  return Array.from(set).sort((a,b)=>b-a)
})

const filtered = computed(()=> {
  return registros.value.filter(r => {
    const d = new Date(r.fecha)
    if (!Number.isFinite(d.getTime())) return false
    const y = d.getFullYear()
    const m = d.getMonth()+1

    if (selectedYear.value !== 'all' && y !== selectedYear.value) return false
    if (selectedMonth.value !== 'all' && m !== selectedMonth.value) return false
    if (selectedEstacionId.value !== '' && r.estacionId !== selectedEstacionId.value) return false
    if (selectedRespId.value !== '' && r.responsableId !== selectedRespId.value) return false
    return true
  })
})

const totalPages = computed(()=> Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paginated = computed(()=> {
  const start = (currentPage.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

async function cargarRegistros() {
  loading.value = true; error.value = ''
  try {
    registros.value = await getRegistrosEstaciones({
      token,
      estacionId: selectedEstacionId.value === '' ? undefined : Number(selectedEstacionId.value),
      responsableId: selectedRespId.value === '' ? undefined : Number(selectedRespId.value),
      year: selectedYear.value === 'all' ? undefined : Number(selectedYear.value),
      month: selectedMonth.value === 'all' ? undefined : Number(selectedMonth.value),
    })
    currentPage.value = 1
  } catch (e:any) {
    error.value = e.message || 'Error al cargar registros'
  } finally { loading.value = false }
}

async function cargarCatalogos() {
  try {
    const [est, bom] = await Promise.all([
      getEstaciones(token).catch(()=>[]),
      getBomberos(token).catch(()=>[])
    ])
    estacionesOpts.value = est.map((e:any)=>({ id: e.id, nombre: e.nombre }))
    bomberosOpts.value = bom.map((b:any)=>({ id: b.id, nombre: b.nombre, apellido: b.apellido }))
  } catch {}
}

function onFilterChange() {
  currentPage.value = 1
  cargarRegistros()
}

onMounted(async ()=> {
  await cargarCatalogos()
  await cargarRegistros()
})
</script>

<style>
.reg-estaciones .toolbar { display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-bottom:8px; }
.reg-estaciones .filters { margin-left:auto; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

/* MISMO DISEÑO QUE BOMBEROS */
.table { 
  width:100%; border-collapse: collapse; margin-top: 1rem; 
  background:#fff; border-radius:12px; overflow:hidden;
}
.table th, .table td { padding:0.75rem 0.9rem; border-bottom:1px solid #e5e7eb; text-align:left; color:#0f172a; }
.table thead th { background:#f1f5f9; color:#334155; font-weight:600; }

.pagination { margin-top:8px; display:flex; gap:12px; justify-content:flex-end; align-items:center; }
.error { color:#dc2626; }
.empty { text-align:center; color:#6b7280; font-style:italic; }
.sf-btn { background:#2563eb; color:#fff; border:none; padding:6px 10px; border-radius:4px; }
.sf-btn:disabled { background:#93c5fd; color:#fff; cursor:not-allowed; }

.reg-estaciones .filters label,
.reg-estaciones .filters select,
.table th, .table td {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
}
</style>
