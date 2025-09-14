<template>
  <div class="login-container">
    <form @submit.prevent="onSubmit">
      <h2>Iniciar Sesión</h2>
      <input v-model="correo" type="email" placeholder="Correo" required />
      <input v-model="contrasena" type="password" placeholder="Contraseña" required />
      <button type="submit">Entrar</button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script lang="ts" setup>
import '../../assets/LoginForm.css'; 
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { loginUser } from '../../application/loginUseCase';

const correo = ref('');
const contrasena = ref('');
const error = ref('');
const router = useRouter();

async function onSubmit() {
  error.value = '';
  try {
    const { token } = await loginUser(correo.value, contrasena.value);
    const isHttps = window.location.protocol === 'https:';
    document.cookie = `csrftoken=${token}; Path=/; ${isHttps ? 'SameSite=Strict; Secure' : 'SameSite=Lax'}`;
    router.push({ name: 'admin-bomberos' }); 
  } catch (e: any) {
    error.value = e.message;
  }
}
</script>