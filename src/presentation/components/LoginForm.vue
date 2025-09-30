<template>
  <div class="login-container">
    <form @submit.prevent="onSubmit">
      <h2>Iniciar Sesión</h2>
      <input v-model="correo" type="email" placeholder="Correo" required />
      <input v-model="contrasena" type="password" placeholder="Contraseña" required />
      <button @click="onSubmit" type="submit">Ingresar</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script lang="ts" setup>
import '../../assets/LoginForm.css'; 
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login, getRoleFromToken, decodeJwt } from '../../infraestructure/authService';

const correo = ref('');
const contrasena = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

function clearToken() {
  document.cookie = 'csrftoken=; Max-Age=0; Path=/';
}

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    const resp = await login(correo.value.trim(), contrasena.value);
    const token = resp.token;
    if (!token) throw new Error('Token no recibido');
    const role = getRoleFromToken(token);
    if (role === 1) {
      router.push({ name: 'admin-estaciones' });
    } else if (role === 2) {
      router.push({ name: 'bombero-mapa' });
    } else {
      clearToken();
      error.value = 'Rol no autorizado';
    }
  } catch (e: any) {
    error.value = (e?.message || 'Error').slice(0, 250);
  } finally {
    loading.value = false;
  }
}
</script>