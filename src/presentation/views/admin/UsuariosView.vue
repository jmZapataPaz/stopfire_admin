<template>
  <div class="usuarios">
    <h2>Usuarios</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <table class="table" v-if="usuarios.length">
      <thead>
        <tr>
          <th>Nombre</th>
          <th>CI</th>
          <th>Correo</th>
          <th>Celular</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in usuarios" :key="u.id">
          <td>{{ u.nombre }} {{ u.apellido }}</td>
          <td>{{ u.ci }}</td>
          <td>{{ u.correo }}</td>
          <td>{{ u.celular }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else>Cargando...</p>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import type { User } from '../../../domain/user'
import { getUsuarios } from '../../../infraestructure/usuarioService'

const usuarios = ref<User[]>([])
const error = ref('')

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
  usuarios.value = list.filter(u => Number(u.rolId) === 3)
}

onMounted(cargar)
</script>