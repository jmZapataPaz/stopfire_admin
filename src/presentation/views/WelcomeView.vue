<template>
  <div class="welcome">
    <h1>Bienvenido, {{ nombre }}</h1>
  </div>
</template>

<script lang="ts" setup>
import { useRoute } from 'vue-router';
const route = useRoute();
const nombre = route.params.nombre as string;
</script>

<style scoped>
.welcome {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 80vh;
  font-size: 2rem;
}
</style>