import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'
import { API_BASE_URL } from '@/config/api'

export interface UserSettings {
  theme: 'dark' | 'light'
  notifications: boolean
  language: string
  emailNotifications: boolean
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const settings = ref<UserSettings>({
    theme: 'dark',
    notifications: true,
    language: 'ru',
    emailNotifications: true
  })

  // Восстановление токена и пользователя из localStorage при загрузке
  const restoreSession = () => {
    if (typeof window !== 'undefined') {
      try {
        const savedToken = localStorage.getItem('auth_token')
        const savedUser = localStorage.getItem('user_data')

        // Проверяем что это не строка "undefined" и не null
        if (savedToken && savedToken !== 'undefined' && savedUser && savedUser !== 'undefined') {
          token.value = savedToken
          user.value = JSON.parse(savedUser)
        }
      } catch (err) {
        console.error('Failed to restore session:', err)
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    }
  }

  const isAuthenticated = computed(() => token.value !== null && user.value !== null)
  const isDirector = computed(() => user.value?.role === 'director')
  const isManager = computed(() => user.value?.role === 'manager')
  const isStorekeeper = computed(() => user.value?.role === 'storekeeper')
  const isWorker = computed(() => user.value?.role === 'worker')
  const isAdminOrManager = computed(() => ['admin', 'director', 'manager'].includes(user.value?.role || ''))
  const isWarehouseStaff = computed(() => ['director', 'manager', 'storekeeper'].includes(user.value?.role || ''))
  const canSeePrices = computed(() => {
    const role = user.value?.role || ''
    // Показываем цены для director и manager, скрываем для остальных
    return ['director', 'manager'].includes(role)
  })
  // Доступ к управлению сотрудниками для админа, директора и менеджера
  const canManageEmployees = computed(() => ['admin', 'director', 'manager'].includes(user.value?.role || ''))

  // Логин с API
  const login = async (login: string, password: string) => {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password })
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        token.value = null
        user.value = null
        error.value = data.error || 'Ошибка логина'
        return false
      }

      token.value = data.token
      user.value = data.user

      // Сохраняем в localStorage для восстановления сессии
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
      }

      return true
    } catch (err: any) {
      token.value = null
      user.value = null
      error.value = err?.message || 'Ошибка логина'
      return false
    } finally {
      loading.value = false
    }
  }

  // Логаут
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/logout`, { method: 'POST' })
    } catch (err) {
      console.error('Logout error:', err)
    } finally {
      token.value = null
      user.value = null
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user_data')
      }
    }
  }

  // Проверка аутентификации при загрузке приложения
  const checkAuth = () => {
    restoreSession()
  }

  // Быстрая смена роли для разработки (удалить в продакшене)
  const setUserForDev = (role: User['role']) => {
    const names: Record<User['role'], string> = {
      director: 'Александр',
      manager: 'Сергей',
      storekeeper: 'Дмитрий',
      worker: 'Андрей'
    }
    user.value = {
      id: 'dev-user',
      name: names[role],
      role,
      email: 'dev@test.com',
      isActive: true,
      permissions: [],
      createdAt: new Date()
    }
  }

  const initDemoUser = () => {
    if (!user.value) {
      user.value = {
        id: '1',
        email: 'admin@warehouse.com',
        name: 'Александр Иванов',
        role: 'director',
        department: 'Управление',
        isActive: true,
        permissions: ['all'],
        createdAt: new Date()
      }
    }
  }

  const setUser = (userData: User) => {
    user.value = userData
  }

  const updateProfile = (updates: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates }
    }
  }

  return {
    user,
    token,
    loading,
    error,
    settings,
    isAuthenticated,
    isDirector,
    isManager,
    isStorekeeper,
    isWorker,
    isAdminOrManager,
    isWarehouseStaff,
    canSeePrices,
    canManageEmployees,
    restoreSession,
    login,
    logout,
    checkAuth,
    setUserForDev,
    initDemoUser,
    setUser,
    updateProfile
  }
})
