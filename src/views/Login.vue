<template>
  <div class="login-container">
    <n-card class="login-card">
      <template #header>
        <n-h2 class="text-center">Вход в систему</n-h2>
        <n-text depth="3" class="text-center block">Склад мебельного производства</n-text>
      </template>

      <n-form :model="formModel">
        <n-form-item label="Email" path="email">
          <n-input v-model:value="formModel.email" placeholder="Введите ваш email" />
        </n-form-item>
        <n-form-item label="Роль (для демо)" path="role">
          <n-select 
            v-model:value="formModel.role" 
            :options="roleOptions" 
            placeholder="Выберите роль для теста" 
          />
        </n-form-item>
        <n-button 
          type="primary" 
          block 
          :loading="loading"
          @click="handleLogin"
        >
          Войти
        </n-button>
      </n-form>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { NH2, NText, NCard, NForm, NFormItem, NInput, NButton, NSelect } from 'naive-ui'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const formModel = ref({
  email: 'admin@warehouse.com',
  role: 'director' as 'director' | 'manager' | 'storekeeper' | 'worker'
})

const roleOptions = [
  { label: 'Директор', value: 'director' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Кладовщик', value: 'storekeeper' },
  { label: 'Рабочий', value: 'worker' }
]

const handleLogin = async () => {
  loading.value = true
  try {
    // Имитируем задержку сети
    await new Promise(resolve => setTimeout(resolve, 800))
    
    await userStore.login(formModel.value.email, formModel.value.role)
    
    // Переход на главную
    router.push('/')
  } finally {
    loading.value = false
  }
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
