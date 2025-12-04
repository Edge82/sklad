<template>
  <div class="login-container">
    <n-card class="login-card">
      <template #header>
        <n-h2 class="text-center">Вход в систему</n-h2>
        <n-text depth="3" class="text-center block">Склад мебельного производства</n-text>
      </template>

      <n-form>
        <n-form-item label="Email">
          <n-input placeholder="Введите ваш email" />
        </n-form-item>
        <n-form-item label="Пароль">
          <n-input type="password" placeholder="Введите пароль" />
        </n-form-item>
        <n-button type="primary" block @click="handleLogin">
          Войти
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { NH2, NText, NCard, NForm, NFormItem, NInput, NButton } from 'naive-ui'

const router = useRouter()
const userStore = useUserStore()

const handleLogin = () => {
  // Для демо просто создаем пользователя
  userStore.initDemoUser()

  // Переход на страницу заказов
  router.push('/orders')
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 400px;
}
</style>
