<template>
  <div class="bh-container">
    <div class="bh-toolbar">
      <h3 style="margin:0;">Mi estación</h3>
      <!-- Botón Recargar eliminado -->
      <span v-if="loading" class="sf-badge">Cargando…</span>
      <span v-if="error" class="bh-badge">{{ error }}</span>
      <span v-if="okMsg" class="bh-badge" style="background:#e6ffe6;color:#1b5e20;">{{ okMsg }}</span>
      <span v-if="saving" class="sf-badge">Guardando…</span>
    </div>

    <div v-if="estacion" class="be-form">
      <!-- Nombre -->
      <div class="be-row">
        <label>Nombre</label>
        <template v-if="!editMode">
          <div>{{ estacion.nombre || '-' }}</div>
        </template>
        <template v-else>
          <input v-model="form.nombre" type="text" />
        </template>
      </div>

      <!-- Descripción dirección -->
      <div class="be-row">
        <label>Descripción dirección</label>
        <template v-if="!editMode">
          <div>{{ estacion.descripcionDireccion || '-' }}</div>
        </template>
        <template v-else>
          <textarea v-model="form.descripcionDireccion" rows="3"></textarea>
        </template>
      </div>

      <!-- Celular -->
      <div class="be-row">
        <label>Celular</label>
        <template v-if="!editMode">
          <div>{{ estacion.celular || '-' }}</div>
        </template>
        <template v-else>
          <input v-model="form.celular" type="text" />
        </template>
      </div>



      <div class="be-actions" style="margin-top:10px;">
        <button v-if="!editMode" class="sf-btn" @click="activarEdicion">Actualizar</button>
        <button v-else class="sf-btn" @click="desactivarEdicion">Terminar</button>
      </div>
    </div>

    <p v-else-if="!loading && !error">No tiene estación asignada.</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { EstacionDetalle, UpdateEstacionBombero } from '../../../infraestructure/bomberoService'
import { getMiEstacionBombero, actualizarEstacionBombero } from '../../../infraestructure/bomberoService'
import '../../../assets/BomberoHistorialView.css'
import './BomberoEstacionView.css'

function getCookie(name: string) {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : ''
}
const token = getCookie('csrftoken')

const estacion = ref<EstacionDetalle | null>(null)
const loading = ref(false)
const error = ref('')
const okMsg = ref('')
const saving = ref(false)

const editMode = ref(false)
const suppressAutoSave = ref(false)

const form = reactive<UpdateEstacionBombero>({ nombre: '', descripcionDireccion: '', celular: '' })
const lastSaved = ref<UpdateEstacionBombero>({ nombre: '', descripcionDireccion: '', celular: '' })

async function reload() {
  if (!token) { error.value = 'Sin token'; return }
  loading.value = true; error.value = ''; okMsg.value = ''
  try {
    const e = await getMiEstacionBombero(token)
    estacion.value = e

    suppressAutoSave.value = true
    form.nombre = e.nombre ?? ''
    form.descripcionDireccion = e.descripcionDireccion ?? ''
    form.celular = e.celular ?? ''
    lastSaved.value = { ...form }
    suppressAutoSave.value = false
  } catch (e: any) {
    error.value = e?.message || 'Error al cargar estación'
  } finally { loading.value = false }
}

function activarEdicion() { editMode.value = true }
function desactivarEdicion() { editMode.value = false }

let t: any = null
function scheduleSave() {
  clearTimeout(t)
  t = setTimeout(() => saveChanges().catch(()=>{}), 700)
}

async function saveChanges() {
  if (!editMode.value || !estacion.value) return
  const cambios: UpdateEstacionBombero = {}
  if (form.nombre !== lastSaved.value.nombre) cambios.nombre = form.nombre
  if (form.descripcionDireccion !== lastSaved.value.descripcionDireccion) cambios.descripcionDireccion = form.descripcionDireccion
  if (form.celular !== lastSaved.value.celular) cambios.celular = form.celular

  if (Object.keys(cambios).length === 0) return

  saving.value = true; error.value = ''; okMsg.value = ''
  try {
    const r = await actualizarEstacionBombero(estacion.value.id, cambios, token)
    estacion.value = { ...estacion.value, ...r }
    lastSaved.value = { ...form }
    okMsg.value = 'Guardado'
    setTimeout(() => { okMsg.value = '' }, 1200)
  } catch (e: any) {
    error.value = e?.message || 'No se pudo actualizar'
  } finally {
    saving.value = false
  }
}

watch(
  () => [form.nombre, form.descripcionDireccion, form.celular],
  () => { if (!suppressAutoSave.value && editMode.value) scheduleSave() }
)

// Recarga automática: al montar y al volver visible la pestaña (si no está editando)
function onVis() {
  if (document.visibilityState === 'visible' && !loading.value && !editMode.value) {
    reload()
  }
}
onMounted(() => {
  reload()
  document.addEventListener('visibilitychange', onVis)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVis)
})
</script>