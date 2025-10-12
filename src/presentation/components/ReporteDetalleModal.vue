<template>
  <div class="sf-modal-backdrop" @click.self="onClose">
    <div class="sf-modal">
      <header class="sf-modal__header">
        <h3>Incidente aceptado</h3>
        <button class="sf-modal__close" @click="onClose">✕</button>
      </header>
      <section class="sf-modal__body">
        <div class="sf-modal__row">
          <span class="sf-label">Descripción:</span>
          <span>{{ reporte.descripcion || '(sin descripción)' }}</span>
        </div>
        <div v-if="reporte.fechaCreacion" class="sf-modal__row">
          <span class="sf-label">Fecha:</span>
          <span>{{ formatFecha(reporte.fechaCreacion) }}</span>
        </div>
        <div v-if="reporte.fotoUrl" class="sf-modal__img">
          <img :src="reporte.fotoUrl" alt="Evidencia" class="rdm-thumb"/>
        </div>
        <p v-if="error" class="sf-error">{{ error }}</p>
      </section>
      <footer class="sf-modal__footer">
        <button class="sf-btn sf-btn--ghost" @click="onClose" :disabled="loading">Cerrar</button>
        <button class="sf-btn sf-btn--primary" @click="onMitigar" :disabled="loading">
          <span v-if="loading" class="sf-spinner"></span>
          Mitigar
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Reporte } from '../../domain/reporte';
import { mitigarReporte } from '../../infraestructure/reporteService';

const props = defineProps<{
  token: string;
  reporte: Reporte;
}>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'mitigado', id: number): void;
}>();

const loading = ref(false);
const error = ref('');

function onClose() { if (!loading.value) emit('close'); }

async function onMitigar() {
  if (loading.value) return;
  loading.value = true;
  error.value = '';
  try {
    const r = await mitigarReporte(props.token, props.reporte.id);
    window.dispatchEvent(new CustomEvent('reporte-mitigado', { detail: { id: r.id } }));
    emit('mitigado', r.id);
  } catch (e: any) {
    error.value = e?.message || 'No se pudo mitigar';
  } finally {
    loading.value = false;
  }
}

function formatFecha(input: string | Date): string {
  if (!input) return ''
  const dt = new Date(input)
  if (isNaN(dt.getTime())) return String(input)
  const fecha = dt.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = dt.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${fecha} ${hora}`
}
</script>