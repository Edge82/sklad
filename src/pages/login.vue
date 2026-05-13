<template>
  <div class="min-h-screen bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
      <!-- Заголовок -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Warehouse System</h1>
        <p class="text-gray-600">Управление складом и материалами</p>
      </div>

      <!-- Форма логина -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <!-- Ошибка -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {{ error }}
        </div>

        <!-- Поле для логина -->
        <div>
          <label for="login" class="block text-sm font-medium text-gray-700 mb-1">
            Логин
          </label>
          <input
            id="login"
            v-model="form.login"
            type="text"
            placeholder="admin"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :disabled="isLoading"
            required
          />
        </div>

        <!-- Поле для пароля -->
        <div>
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
            Пароль
          </label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            placeholder="••••••••"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            :disabled="isLoading"
            required
          />
        </div>

        <!-- Кнопка логина -->
        <button
          type="submit"
          :disabled="isLoading"
          class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
        >
          {{ isLoading ? 'Загрузка...' : 'Войти' }}
        </button>
      </form>

      <!-- Тестовые учетные данные -->
      <div class="mt-6 pt-6 border-t border-gray-200 text-sm text-gray-600 text-center">
        <p class="mb-2"><strong>Тестовые данные:</strong></p>
        <p>Логин: <code class="bg-gray-100 px-2 py-1 rounded">admin</code></p>
        <p>Пароль: <code class="bg-gray-100 px-2 py-1 rounded">admin</code></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const isLoading = ref(false)
const error = ref<string | null>(null)

const form = reactive({
  login: '',
  password: ''
})

/**
 * Обработчик логина
 */
async function handleLogin() {
  error.value = null
  isLoading.value = true

  try {
    // Используем метод login из store
    const success = await userStore.login(form.login, form.password)

    if (success) {
      // Редирект на главную через роутер с задержкой
      await new Promise(resolve => setTimeout(resolve, 100))
      await router.push('/inventory')
    } else {
      error.value = userStore.error || 'Ошибка при логине'
    }

  } catch (err: any) {
    // Обработка ошибок
    if (err.status === 401) {
      error.value = 'Неверный логин или пароль'
    } else if (err.message) {
      error.value = err.message
    } else {
      error.value = 'Ошибка при логине. Попробуйте позже.'
    }
    console.error('[Login Error]:', err)

  } finally {
    isLoading.value = false
  }
}

// Если пользователь уже авторизован - редирект на главную
if (userStore.isAuthenticated) {
  router.push('/inventory')
}
</script>
