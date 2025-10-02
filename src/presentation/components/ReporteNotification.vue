<template>
  <transition name="fade">
    <div v-if="store.state.visible && store.state.actual" class="reporte-overlay">
      <div class="reporte-modal" :class="{ aceptado: store.state.aceptado }">
        <header class="modal-header">
          <h3>Nuevo Reporte</h3>
          <span v-if="store.state.aceptado" class="badge">ACEPTADO</span>
        </header>

        <div class="contenido">
          <div class="imagen-wrapper" v-if="store.state.actual.imagenUrl">
            <img :src="store.state.actual.imagenUrl" alt="Imagen reporte" />
          </div>

          <ul class="datos">
            <li><label>Descripción</label><p>{{ store.state.actual.descripcion }}</p></li>
            <li v-if="store.state.actual.latitud">
              <label>Ubicación</label>
              <p>{{ store.state.actual.latitud }}, {{ store.state.actual.longitud }}</p>
            </li>
            <li v-if="store.state.actual.creadoEn">
              <label>Creado</label>
              <p>{{ formatFecha(store.state.actual.creadoEn) }}</p>
            </li>
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
import { ref } from 'vue';
import { incomingReportesStore as store } from '../../application/reportes/reportesStore';
import '../../assets/ReporteNotification.css';

const debug = ref(false);

function aceptar() {
  const r = store.state.actual;
  if (r?.latitud && r?.longitud) {
    window.dispatchEvent(new CustomEvent('reporte-aceptado', { detail: r }));
  }
  store.aceptarActual();
}

function rechazar() {
  const r = store.state.actual;
  if (r?.id) {
    window.dispatchEvent(new CustomEvent('reporte-rechazado', { detail: r }));
  }
  store.rechazarActual();
}

function cerrar() {
  store.cerrarActual();
}

function onClickAceptar() { aceptar(); }
function onClickRechazar() { rechazar(); }
function onClickCerrar() { cerrar(); }

function formatFecha(d: string) {
  try { return new Date(d).toLocaleString(); } catch { return d; }
}
</script>
