<template>
  <div class="login-container">
    <form @submit.prevent="onSubmit">
      <h2>Iniciar Sesión</h2>
      <input v-model="correo" type="email" placeholder="Correo" required />
      <input v-model="contrasena" type="password" placeholder="Contraseña" required />
      <button :disabled="loading" type="submit">
        {{ loading ? 'Ingresando...' : 'Ingresar' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<script lang="ts" setup>
import '../../assets/LoginForm.css';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { getRoleFromToken } from '../../infraestructure/authService';
import { loginUser } from '../../application/loginUseCase';

const correo = ref('');
const contrasena = ref('');
const loading = ref(false);
const error = ref('');
const router = useRouter();

function clearToken() {
  document.cookie = 'csrftoken=; Max-Age=0; Path=/';
}

async function onSubmit() {
  if (loading.value) return;
  error.value = '';
  loading.value = true;
  try {
    console.log('[Login] Iniciando...');
    const { token, user } = await loginUser(correo.value.trim(), contrasena.value);
    if (!token) throw new Error('Token no recibido');
    const rolTexto = (user as any)?.rol || (user as any)?.Rol || '';
    console.log('[Login] Rol texto:', rolTexto);
    const roleNum = getRoleFromToken(token);
    console.log('[Login] roleNum=', roleNum);

    if (roleNum === 1 || rolTexto.toUpperCase() === 'ADMIN') {
      router.push({ name: 'admin-estaciones' });
    } else if (roleNum === 2 || ['BOMBERO','RESPONSABLE'].includes(rolTexto.toUpperCase())) {
      router.push({ name: 'bombero-mapa' });
    } else {
      clearToken();
      error.value = 'Rol no autorizado';
    }
  } catch (e: any) {
    console.error('[Login] Error', e);
    const serverMsg =
      e?.response?.data?.mensaje ||
      (() => {
        const msg = e?.message ?? '';
        if (typeof msg === 'string') {
          try {
            const parsed = JSON.parse(msg);
            if (parsed && typeof parsed === 'object' && 'mensaje' in parsed) {
              return String(parsed.mensaje);
            }
          } catch {
          }
        }
        return msg;
      })();

    const clean = typeof serverMsg === 'string' ? serverMsg : 'Error';
    error.value = clean.slice(0, 250);
  } finally {
    loading.value = false;
  }
}
</script>