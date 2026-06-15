<template>
  <div class="min-h-screen bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
    <div class="login-card" :style="{ opacity: showPasswordChangeModal ? 0.5 : 1 }">
      <!-- Заголовок -->
      <div class="login-header">
        <h1 class="text-3xl font-bold text-gray-900 mb-2">Управление складом и материалами</h1>
      </div>

      <!-- Форма логина -->
      <form @submit.prevent="handleLogin" class="login-form">
        <!-- Ошибка -->
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {{ error }}
        </div>

        <!-- Поле для логина -->
        <div class="form-field">
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
        <div class="form-field">
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
        <div class="form-field form-field-submit login-btn-wrapper">
          <button
            type="submit"
            :disabled="isLoading || showPasswordChangeModal"
            class="login-btn"
          >
            {{ isLoading ? 'Загрузка...' : 'Войти' }}
          </button>
        </div>
      </form>

      <!-- Тестовые учетные данные -->

    </div>

    <!-- Модаль обязательной смены пароля при первом входе -->
    <transition name="modal-fade">
      <div v-if="showPasswordChangeModal" class="modal-overlay" @click.self="null">
        <div class="modal-content">
          <h2 class="modal-title">Смена пароля при первом входе</h2>
          <p class="modal-description">
            Вы входите в систему впервые. Пожалуйста, установите новый пароль для вашего аккаунта.
          </p>

          <form @submit.prevent="handlePasswordChange" class="modal-form">
            <!-- Ошибка -->
            <div v-if="passwordChangeError" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {{ passwordChangeError }}
            </div>

            <!-- Текущий пароль (временный) -->
            <div class="form-field">
              <label for="current-password" class="form-label">
                Текущий пароль
              </label>
              <input
                id="current-password"
                v-model="passwordChangeForm.currentPassword"
                type="password"
                placeholder="Введите текущий пароль"
                class="form-input"
              />
            </div>

            <!-- Новый пароль -->
            <div class="form-field">
              <label for="new-password" class="form-label">
                Новый пароль
              </label>
              <input
                id="new-password"
                v-model="passwordChangeForm.newPassword"
                type="password"
                placeholder="Введите новый пароль"
                class="form-input"
                required
              />
            </div>

            <!-- Подтверждение пароля -->
            <div class="form-field">
              <label for="confirm-password" class="form-label">
                Подтверждение пароля
              </label>
              <input
                id="confirm-password"
                v-model="passwordChangeForm.confirmPassword"
                type="password"
                placeholder="Подтвердите пароль"
                class="form-input"
                required
              />
            </div>

            <!-- Кнопка подтверждения -->
            <div class="form-field form-field-submit">
              <button
                type="submit"
                :disabled="isChangingPassword"
                class="submit-btn"
              >
                {{ isChangingPassword ? 'Сохранение...' : 'Изменить пароль' }}
              </button>
            </div>
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
    const response = await fetch('/sklad/api/auth/change-password', {
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

.login-card {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  padding: 48px;
  width: 100%;
  max-width: 32rem;
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.login-form .form-field input {
  padding: 0.75rem 1rem;
  font-size: 1.0625rem;
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  color: #111827;
  background-color: white;
  box-sizing: border-box;
}

.login-form .form-field input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.login-form .form-field input::placeholder {
  color: #9ca3af;
}

.login-form .form-field input:disabled {
  background-color: #f3f4f6;
  cursor: not-allowed;
}

.form-field {
  margin-bottom: 24px;
}

.form-field-submit {
  margin-bottom: 0;
}

.login-btn-wrapper {
  display: flex;
  justify-content: center;
}

.login-btn {
  min-width: 200px;
  background-color: #2563eb;
  color: white;
  font-weight: bold;
  padding: 0.875rem 2.5rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
  font-size: 1.125rem;
}

.login-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.login-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
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
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 2.5rem;
  width: 100%;
  max-width: 32rem;
  z-index: 1001;
  pointer-events: all;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: bold;
  color: #111827;
  margin-bottom: 1rem;
}

.modal-description {
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.modal-form {
  display: flex;
  flex-direction: column;
}

.form-field {
  margin-bottom: 20px;
}

.form-field-submit {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
}

.form-input {
  width: 100%;
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 1rem;
  color: #111827;
  background-color: white;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.form-input::placeholder {
  color: #9ca3af;
}

.submit-btn {
  width: 100%;
  background-color: #2563eb;
  color: white;
  font-weight: bold;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s;
  border: none;
  cursor: pointer;
}

.submit-btn:hover:not(:disabled) {
  background-color: #1d4ed8;
}

.submit-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
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
