<template>
  <div class="bomberos">
    <h2>Lista de Bomberos</h2>

    <div class="toolbar" style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
      <button @click="mostrarFormulario = !mostrarFormulario">
        {{ mostrarFormulario ? 'Cerrar' : 'Crear Bombero' }}
      </button>
      <!-- NUEVO: filtro por estado -->
      <label style="margin-left:auto;">Estado:</label>
      <select v-model="filtroEstado">
        <option value="todos">Todos</option>
        <option value="activos">Activos</option>
        <option value="inactivos">Inactivos</option>
      </select>
    </div>

    <form v-if="mostrarFormulario" @submit.prevent="crear" novalidate>
      <input v-model="nuevo.nombre" placeholder="Nombre" required />
      <input v-model="nuevo.apellido" placeholder="Apellido" required />
      <input v-model="nuevo.ci" placeholder="CI" required />

      <input
        v-model.trim="nuevo.correo"
        placeholder="Correo"
        type="email"
        required
      />

      <input
        v-model="nuevo.celular"
        placeholder="Celular"
        inputmode="numeric"
        pattern="^[0-9]{8,}$"
        minlength="8"
        required
        @input="onCelularInput"
      />
      <div style="display:flex; gap:.5rem; align-items:center;">
        <input
          :type="mostrarContrasena ? 'text' : 'password'"
          v-model="nuevo.contrasena"
          placeholder="Contraseña"
          required
        />
        <button type="button" @click="mostrarContrasena = !mostrarContrasena">
          {{ mostrarContrasena ? 'Ocultar' : 'Mostrar' }}
        </button>
      </div>
      <button type="submit" class="submit-btn">Guardar</button>
      <div v-if="crearErrores.length" class="error form-error">
        <div v-for="(m,i) in crearErrores" :key="i">{{ m }}</div>
      </div>
    </form>

    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Apellido</th>
          <th>CI</th>
          <th>Correo</th>
          <th>Celular</th>
          <th>Estado</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <!-- CAMBIO: usar 'paginados' -->
        <tr v-for="b in paginados" :key="b.id">
          <td>{{ b.nombre }}</td>
          <td>{{ b.apellido }}</td>
          <td>{{ b.ci }}</td>
          <td>{{ b.correo }}</td>
          <td>{{ b.celular }}</td>
          <td>{{ b.estado ? 'Activo' : 'Inactivo' }}</td>
          <td class="row-actions">
            <button @click="abrirEdicion(b)">Editar</button>
            <button v-if="b.estado" class="danger" @click="darDeBaja(b.id)">Dar de baja</button>
            <button v-else @click="activar(b.id)">Activar</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- NUEVO: paginación -->
    <div class="pagination">
      <button class="sf-btn" :disabled="currentPage<=1" @click="currentPage=Math.max(1,currentPage-1)">Anterior</button>
      <span>Página {{ currentPage }} de {{ totalPages }}</span>
      <button class="sf-btn" :disabled="currentPage>=totalPages" @click="currentPage=Math.min(totalPages,currentPage+1)">Siguiente</button>
    </div>

    <div v-if="editando" class="edit-card">
      <h3>Editar Bombero</h3>
      <form @submit.prevent="actualizar">
        <input v-model="editarForm.nombre" placeholder="Nombre" required />
        <input v-model="editarForm.apellido" placeholder="Apellido" required />
        <input v-model="editarForm.celular" placeholder="Celular" required />
        <input v-model="editarForm.nuevaContrasena" placeholder="Nueva contraseña" type="password" />
        <div class="actions">
          <button type="button" @click="cancelarEdicion">Cancelar</button>
          <button type="submit">Actualizar</button>
        </div>
      </form>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script lang="ts" setup>
import '../../assets/BomberosList.css'
import { ref, onMounted, computed, watch } from 'vue'
import { getBomberos, crearBombero, updateBombero, /* deleteBombero, */ type Bombero, type CrearBombero, cambiarEstadoBombero } from '../../infraestructure/bomberoService'

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()!.split(';').shift()!
  return null
}
const token = getCookie('csrftoken') || ''
const bomberos = ref<Bombero[]>([])
const error = ref('')
const mostrarFormulario = ref(false)
const crearErrores = ref<string[]>([])
const mostrarContrasena = ref(false)

const nuevo = ref<CrearBombero>({
  nombre: '',
  apellido: '',
  ci: '',
  correo: '',
  celular: '',
  contrasena: '',
})

const editando = ref(false)
const editarId = ref<number | null>(null)
const editarForm = ref({
  nombre: '',
  apellido: '',
  celular: '',
  nuevaContrasena: '',
})

const filtroEstado = ref<'todos'|'activos'|'inactivos'>('todos')
const listaFiltrada = computed(() => {
  return bomberos.value.filter(b => {
    if (filtroEstado.value === 'activos') return b.estado === true
    if (filtroEstado.value === 'inactivos') return b.estado === false
    return true
  })
})

// NUEVO: paginación (cliente)
const pageSize = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(listaFiltrada.value.length / pageSize)))
const paginados = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return listaFiltrada.value.slice(start, start + pageSize)
})
watch([listaFiltrada], () => { currentPage.value = 1 })

async function cargarBomberos() {
  error.value = ''
  bomberos.value = await getBomberos(token).catch((e) => {
    error.value = e.message || 'Error al obtener bomberos'
    return []
  })
  // NUEVO: resetear página después de cargar
  currentPage.value = 1
}
function onCelularInput(e: Event) {
  const t = e.target as HTMLInputElement
  const clean = (t.value || '').replace(/\D/g, '')
  t.value = clean
  nuevo.value.celular = clean
}
function isEmail(val: string) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i
  return re.test(val)
}
function isExampleDomain(email: string) {
  const m = email.toLowerCase().match(/@([^@]+)$/)
  if (!m) return false
  const d = m[1]
  return d === 'example.com' || d === 'example.net' || d === 'example.org'
}
function isPasswordValid(val: string) {
  return val.length >= 8 && /[A-Z]/.test(val) && /\d/.test(val)
}
function isCelularOk(val: string) {
  return /^\d{8,}$/.test(val)
}

async function crear() {
  crearErrores.value = []
  error.value = ''
  if (!isEmail(nuevo.value.correo)) {
    crearErrores.value.push('Ingresa un correo válido.')
  } else if (isExampleDomain(nuevo.value.correo)) {
    crearErrores.value.push('No se aceptan correos de ejemplo (@example.com, @example.net, @example.org).')
  }
  if (!isCelularOk(nuevo.value.celular)) {
    crearErrores.value.push('El celular debe tener mínimo 8 dígitos.')
  }
  if (!isPasswordValid(nuevo.value.contrasena)) {
    crearErrores.value.push('La contraseña debe tener mínimo 8 caracteres, al menos 1 mayúscula y 1 número.')
  }

  if (crearErrores.value.length) return

  await crearBombero(nuevo.value, token).then(async () => {
    mostrarFormulario.value = false
    await cargarBomberos()
    nuevo.value = { nombre: '', apellido: '', ci: '', correo: '', celular: '', contrasena: '' }
    crearErrores.value = []
    mostrarContrasena.value = false
  }).catch((e) => {
    crearErrores.value = [e?.message || 'Error al crear bombero']
  })
}

function abrirEdicion(b: Bombero) {
  editarId.value = b.id
  editarForm.value = { nombre: b.nombre, apellido: b.apellido, celular: b.celular, nuevaContrasena: '' }
  editando.value = true
}

function cancelarEdicion() {
  editando.value = false
  editarId.value = null
  editarForm.value = { nombre: '', apellido: '', celular: '', nuevaContrasena: '' }
}

async function actualizar() {
  if (editarId.value == null) return
  error.value = ''
  const payload: any = {
    nombre: editarForm.value.nombre,
    apellido: editarForm.value.apellido,
    celular: editarForm.value.celular,
    rolId: 2,
  }
  if (editarForm.value.nuevaContrasena) payload.nuevaContrasena = editarForm.value.nuevaContrasena

  await updateBombero(editarId.value, payload, token).then(async () => {
    await cargarBomberos()
    cancelarEdicion()
  }).catch((e) => error.value = e.message || 'Error al actualizar bombero')
}

async function darDeBaja(id: number) { // NUEVO
  error.value = ''
  try { await cambiarEstadoBombero(id, false, token); await cargarBomberos() } 
  catch (e:any) { error.value = e.message || 'Error al dar de baja' }
}
async function activar(id: number) { // NUEVO
  error.value = ''
  try { await cambiarEstadoBombero(id, true, token); await cargarBomberos() } 
  catch (e:any) { error.value = e.message || 'Error al activar' }
}

// eliminar() -> quitar del UI; backend puede quedar, pero no se muestra
onMounted(cargarBomberos)
</script>

<style scoped>
.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
}
.table th, .table td {
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  color: #0f172a;
}
.table thead th {
  background: #f1f5f9;
  color: #334155;
  font-weight: 600;
}
.row-actions { display: flex; gap: 0.5rem; }
.edit-card { margin-top: 1rem; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; }
.actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 0.5rem; }
.error { background: #ef4444; color: #fff; padding: 0.5rem 0.75rem; border-radius: 8px; margin-top: 1rem; }
.submit-btn { order: 1; }
.form-error { order: 2; position: static !important; display: block; width: 100%; margin-top: .5rem; }
form { display: flex; flex-direction: column; gap: 0.5rem; margin: 1rem 0; }
button { border-radius: 10px; }
button.danger { background: #ef4444; color: #fff; }

/* NUEVO: paginación */
.pagination { margin-top: 8px; display: flex; gap: 12px; justify-content: flex-end; align-items: center; }
.sf-btn { background:#2563eb; color:#fff; border:none; padding:6px 10px; border-radius:4px; }
.sf-btn:disabled { background:#93c5fd; color:#fff; cursor:not-allowed; }
</style>