<template>
  <div class="min-h-screen bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md" :style="{ opacity: showPasswordChangeModal ? 0.5 : 1 }">
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
            :disabled="isLoading || showPasswordChangeModal"
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
            :disabled="isLoading || showPasswordChangeModal"
            required
          />
        </div>

        <!-- Кнопка логина -->
        <button
          type="submit"
          :disabled="isLoading || showPasswordChangeModal"
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

    <!-- Модаль обязательной смены пароля при первом входе -->
    <transition name="modal-fade">
      <div v-if="showPasswordChangeModal" class="modal-overlay" @click.self="null">
        <div class="modal-content">
          <h2 class="text-2xl font-bold text-gray-900 mb-4">Смена пароля при первом входе</h2>
          <p class="text-gray-600 mb-6">
            Вы входите в систему впервые. Пожалуйста, установите новый пароль для вашего аккаунта.
          </p>

          <form @submit.prevent="handlePasswordChange" class="space-y-4">
            <!-- Ошибка -->
            <div v-if="passwordChangeError" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {{ passwordChangeError }}
            </div>

            <!-- Текущий пароль (временный) -->
            <div>
              <label for="current-password" class="block text-sm font-medium text-gray-700 mb-1">
                Текущий пароль (временный: 12345678)
              </label>
              <input
                id="current-password"
                v-model="passwordChangeForm.currentPassword"
                type="password"
                placeholder="12345678"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
              />
            </div>

            <!-- Новый пароль -->
            <div>
              <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">
                Новый пароль
              </label>
              <input
                id="new-password"
                v-model="passwordChangeForm.newPassword"
                type="password"
                placeholder="Введите новый пароль"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                required
              />
            </div>

            <!-- Подтверждение пароля -->
            <div>
              <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">
                Подтверждение пароля
              </label>
              <input
                id="confirm-password"
                v-model="passwordChangeForm.confirmPassword"
                type="password"
                placeholder="Подтвердите пароль"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white placeholder-gray-500"
                required
              />
            </div>

            <!-- Кнопка подтверждения -->
            <button
              type="submit"
              :disabled="isChangingPassword"
              class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition duration-200"
            >
              {{ isChangingPassword ? 'Сохранение...' : 'Изменить пароль' }}
            </button>
          </form>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const isLoading = ref(false)
const error = ref<string | null>(null)
const showPasswordChangeModal = ref(false)
const isChangingPassword = ref(false)
const passwordChangeError = ref<string | null>(null)

const form = reactive({
  login: '',
  password: ''
})

const passwordChangeForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// При загрузке страницы проверяем если уже авторизован и не нужна смена пароля
onMounted(() => {
  // Восстанавливаем сессию из localStorage
  userStore.restoreSession()
  
  // Если уже авторизован и нужна смена пароля - показываем модаль
  if (userStore.isAuthenticated && userStore.user?.needsPasswordChange) {
    console.log('[OnMounted] User needs password change, showing modal')
    showPasswordChangeModal.value = true
    // Заполняем поле с временным паролем по умолчанию
    passwordChangeForm.currentPassword = '12345678'
    console.log('[OnMounted] passwordChangeForm.currentPassword:', passwordChangeForm.currentPassword)
    return
  }
  
  // Если уже авторизован и не нужна смена пароля - редирект
  if (userStore.isAuthenticated && !userStore.user?.needsPasswordChange) {
    console.log('[OnMounted] User already authenticated, redirecting to inventory')
    router.push('/inventory')
  }
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
    console.log('[Login] Success:', success)
    console.log('[Login] User:', userStore.user)
    console.log('[Login] needsPasswordChange:', userStore.user?.needsPasswordChange)

    if (success) {
      // Если нужна смена пароля, показываем модаль
      if (userStore.user?.needsPasswordChange) {
        console.log('[Login] Showing password change modal')
        console.log('[Login] showPasswordChangeModal before:', showPasswordChangeModal.value)
        console.log('[Login] form.password:', form.password)
        showPasswordChangeModal.value = true
        passwordChangeForm.currentPassword = form.password
        console.log('[Login] passwordChangeForm.currentPassword after:', passwordChangeForm.currentPassword)
        console.log('[Login] showPasswordChangeModal after:', showPasswordChangeModal.value)
        console.log('[DOM Check] Element exists:', document.querySelector('.modal-overlay'))
        return
      }

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

/**
 * Обработчик смены пароля
 */
async function handlePasswordChange() {
  passwordChangeError.value = null
  console.log('[PasswordChange] Starting password change')

  // Валидация
  if (!passwordChangeForm.currentPassword) {
    passwordChangeError.value = 'Введите текущий пароль'
    console.error('[PasswordChange] No current password')
    return
  }

  if (!passwordChangeForm.newPassword) {
    passwordChangeError.value = 'Введите новый пароль'
    return
  }

  if (passwordChangeForm.newPassword.length < 6) {
    passwordChangeError.value = 'Пароль должен содержать минимум 6 символов'
    return
  }

  if (passwordChangeForm.newPassword !== passwordChangeForm.confirmPassword) {
    passwordChangeError.value = 'Пароли не совпадают'
    return
  }

  isChangingPassword.value = true
  console.log('[PasswordChange] Submitting change request')
  console.log('[PasswordChange] User ID:', userStore.user?.id)
  console.log('[PasswordChange] Old password:', passwordChangeForm.currentPassword)
  console.log('[PasswordChange] New password length:', passwordChangeForm.newPassword.length)

  try {
    const response = await fetch('http://localhost:8000/sklad/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userStore.user?.id,
        oldPassword: passwordChangeForm.currentPassword,
        newPassword: passwordChangeForm.newPassword
      })
    }).then(r => r.json())

    console.log('[PasswordChange] Response:', response)

    if (response.success) {
      console.log('[PasswordChange] Success! Password changed')
      // Успешно изменили пароль
      showPasswordChangeModal.value = false
      
      // Очищаем форму
      form.login = ''
      form.password = ''
      passwordChangeForm.currentPassword = ''
      passwordChangeForm.newPassword = ''
      passwordChangeForm.confirmPassword = ''
      
      // Обновляем флаг в userStore
      if (userStore.user) {
        userStore.user.needsPasswordChange = false
      }

      // Редирект на главную
      await new Promise(resolve => setTimeout(resolve, 100))
      await router.push('/inventory')
    } else {
      passwordChangeError.value = response.error || 'Ошибка при смене пароля'
    }
  } catch (err: any) {
    console.error('Password change error:', err)
    passwordChangeError.value = 'Ошибка при смене пароля. Попробуйте позже.'
  } finally {
    isChangingPassword.value = false
  }
}
</script>

<style scoped>
:deep(body) {
  overflow: hidden;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  pointer-events: all;
}

.modal-content {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 2rem;
  width: 100%;
  max-width: 28rem;
  z-index: 1001;
  pointer-events: all;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
