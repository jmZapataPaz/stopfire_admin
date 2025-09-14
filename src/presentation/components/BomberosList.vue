<template>
  <div class="bomberos">
    <h2>Lista de Bomberos</h2>

    <button @click="mostrarFormulario = !mostrarFormulario">
      {{ mostrarFormulario ? 'Cerrar' : 'Crear Bombero' }}
    </button>

    <form v-if="mostrarFormulario" @submit.prevent="crear">
      <input v-model="nuevo.nombre" placeholder="Nombre" required />
      <input v-model="nuevo.apellido" placeholder="Apellido" required />
      <input v-model="nuevo.ci" placeholder="CI" required />
      <input v-model="nuevo.correo" placeholder="Correo" type="email" required />
      <input v-model="nuevo.celular" placeholder="Celular" required />
      <input v-model="nuevo.contrasena" placeholder="Contraseña" type="password" required />
      <button type="submit">Guardar</button>
    </form>

    <table class="table">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Apellido</th>
          <th>CI</th>
          <th>Correo</th>
          <th>Celular</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in bomberos" :key="b.id">
          <td>{{ b.nombre }}</td>
          <td>{{ b.apellido }}</td>
          <td>{{ b.ci }}</td>
          <td>{{ b.correo }}</td>
          <td>{{ b.celular }}</td>
          <td class="row-actions">
            <button @click="abrirEdicion(b)">Editar</button>
            <button class="danger" @click="eliminar(b.id)">Eliminar</button>
          </td>
        </tr>
      </tbody>
    </table>

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
import { ref, onMounted } from 'vue'
import { getBomberos, crearBombero, updateBombero, deleteBombero, type Bombero, type CrearBombero } from '../../infraestructure/bomberoService'

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

async function cargarBomberos() {
  error.value = ''
  bomberos.value = await getBomberos(token).catch((e) => {
    error.value = e.message || 'Error al obtener bomberos'
    return []
  })
}

async function crear() {
  error.value = ''
  await crearBombero(nuevo.value, token).then(async () => {
    mostrarFormulario.value = false
    await cargarBomberos()
    nuevo.value = { nombre: '', apellido: '', ci: '', correo: '', celular: '', contrasena: '' }
  }).catch((e) => error.value = e.message || 'Error al crear bombero')
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

async function eliminar(id: number) {
  error.value = ''
  const ok = window.confirm('¿Eliminar este bombero?')
  if (!ok) return
  await deleteBombero(id, token).then(async () => {
    await cargarBomberos()
  }).catch((e) => error.value = e.message || 'Error al eliminar bombero')
}

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
.row-actions {
  display: flex;
  gap: 0.5rem;
}
.edit-card {
  margin-top: 1rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}
.error {
  color: #ef4444;
  margin-top: 1rem;
}
form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 1rem 0;
}
button {
  border-radius: 10px;
}
button.danger {
  background: #ef4444;
  color: #fff;
}
</style>