<template>
  <transition name="fade">
    <div v-if="store.state.visible && store.state.actual" class="reporte-overlay">
      <div class="reporte-modal" :class="{ aceptado: store.state.aceptado }">
        <header class="modal-header">
          <h3>Nuevo Reporte</h3>
          <span v-if="store.state.aceptado" class="badge">ACEPTADO</span>
        </header>

        <div v-if="showTimer" class="timer">
          <div class="fill" :style="{ width: percent + '%' }"></div>
          <div class="count">{{ timeLeft }}s</div>
        </div>

        <div class="contenido">
          <div class="imagen-wrapper" v-if="store.state.actual.imagenUrl">
            <img :src="store.state.actual.imagenUrl" alt="Imagen reporte" />
          </div>

          <ul class="datos">
            <li><label>Descripción</label><p>{{ store.state.actual.descripcion || '(sin descripción)' }}</p></li>
            <li v-if="store.state.actual.creadoEn">
              <label>Creado</label>
              <p>{{ formatFecha(store.state.actual.creadoEn) }}</p>
            </li>
          </ul>

          <ul class="datos persona" v-if="personaNombre || personaCelular || personaEmail">
            <li class="titulo"><label>Persona</label></li>
            <li v-if="personaNombre"><label>Nombre</label><p>{{ personaNombre }}</p></li>
            <li v-if="personaCelular"><label>Celular</label><p>{{ personaCelular }}</p></li>
          </ul>

          <pre class="raw" v-if="debug">{{ store.state.actual }}</pre>
        </div>

        <footer class="acciones" v-if="!store.state.aceptado">
          <button @click="onClickAceptar">Aceptar</button>
          <button @click="onClickRechazar">Rechazar</button>
        </footer>

        <footer class="acciones persistente" v-else>
          <button @click="onClickCerrar">Cerrar</button>
        </footer>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue'
import { incomingReportesStore as store } from '../../application/reportes/reportesStore';
import '../../assets/ReporteNotification.css';

const debug = ref(false);

const TOTAL = 60;
const timeLeft = ref<number>(TOTAL);
const ticking = ref<number | null>(null);
const showTimer = computed(() => store.state.visible && !store.state.aceptado);
const percent = computed(() => Math.max(0, Math.min(100, ((TOTAL - timeLeft.value) / TOTAL) * 100)));

function startTimer() {
  stopTimer();
  timeLeft.value = TOTAL;
  if (!showTimer.value) return;
  ticking.value = window.setInterval(() => {
    timeLeft.value = Math.max(0, timeLeft.value - 1);
    if (timeLeft.value === 0) {
      if (store.state.visible && !store.state.aceptado) {
        rechazar();
      }
      stopTimer();
    }
  }, 1000);
}

function stopTimer() {
  if (ticking.value != null) {
    clearInterval(ticking.value);
    ticking.value = null;
  }
}
const personaNombre = computed<string | null>(() => {
  const r: any = store.state.actual || {};
  return (
    r.usuarioNombre ||
    r.nombreUsuario ||
    (r.usuario && (r.usuario.nombre || [r.usuario.nombres, r.usuario.apellidos].filter(Boolean).join(' '))) ||
    r.reporterNombre ||
    r.nombre ||
    null
  );
});
const personaCelular = computed<string | null>(() => {
  const r: any = store.state.actual || {};
  return (
    r.usuarioCelular ||
    (r.usuario && (r.usuario.celular || r.usuario.telefono)) ||
    r.reporterCelular ||
    r.telefono ||
    r.celular ||
    null
  );
});
const personaEmail = computed<string | null>(() => {
  const r: any = store.state.actual || {};
  return (
    r.usuarioEmail ||
    (r.usuario && r.usuario.email) ||
    r.reporterEmail ||
    r.email ||
    null
  );
});
onMounted(() => {
  if (showTimer.value) startTimer();
});

onBeforeUnmount(() => {
  stopTimer();
});

watch(
  () => [store.state.visible, store.state.aceptado, store.state.actual?.id],
  () => {
    if (showTimer.value) startTimer();
    else stopTimer();
  }
);

function aceptar() {
  const r = store.state.actual;
  if (r?.latitud && r?.longitud) {
    window.dispatchEvent(new CustomEvent('reporte-aceptado', { detail: r }));
  }
  stopTimer(); // NUEVO
  store.aceptarActual();
}

function rechazar() {
  const r = store.state.actual;
  if (r?.id) {
    window.dispatchEvent(new CustomEvent('reporte-rechazado', { detail: r }));
  }
  stopTimer(); // NUEVO
  store.rechazarActual();
}

function cerrar() {
  stopTimer(); // NUEVO
  store.cerrarActual();
}

function onClickAceptar() { aceptar(); }
function onClickRechazar() { rechazar(); }
function onClickCerrar() { cerrar(); }

function formatFecha(d: string) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}
</script>
