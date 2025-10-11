<template>
  <div class="sf-modal-backdrop" @click.self="$emit('close')">
    <div class="sf-modal sf-modal--image">
      <header class="sf-modal__header">
        <h3>Fotografía</h3>
        <button class="sf-modal__close" @click="$emit('close')">✕</button>
      </header>
      <section class="sf-modal__body">
        <img v-if="displaySrc" :src="displaySrc" class="bh-img" alt="Foto incidente" />
        <div v-else style="color:#777">Imagen no disponible</div>
      </section>
      <footer class="sf-modal__footer">
        <button class="sf-btn sf-btn--ghost" @click="$emit('close')">Cerrar</button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ src?: string | null }>();

function toRelativeReportes(u?: string | null): string | null {
  if (!u) return null;
  if (u.startsWith('/reportes/')) return `${u}?v=${Date.now()}`;
  try {
    const url = new URL(u);
    if (url.pathname.startsWith('/reportes/')) return `${url.pathname}?v=${Date.now()}`;
  } catch { /* continua */ }
  const i = u.indexOf('reportes/');
  if (i >= 0) {
    const path = '/' + u.slice(i);
    return `${path}?v=${Date.now()}`;
  }
  return null;
}

const displaySrc = computed(() => toRelativeReportes(props.src));
</script>