import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'manager' | 'worker'
  avatar?: string
  department: string
  phone: string
  lastLogin: Date
  createdAt: Date
}

export interface UserSettings {
  theme: 'dark' | 'light'
  notifications: boolean
  language: string
  emailNotifications: boolean
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const settings = ref<UserSettings>({
    theme: 'dark',
    notifications: true,
    language: 'ru',
    emailNotifications: true
  })

  const isAuthenticated = computed(() => user.value !== null)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isManager = computed(() => user.value?.role === 'manager')

  const setUser = (userData: User) => {
    user.value = userData
  }

  const updateProfile = (profileData: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...profileData }
    }
  }

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    settings.value = { ...settings.value, ...newSettings }
  }

  const logout = () => {
    user.value = null
    // В реальном приложении здесь был бы вызов API
  }

  // Инициализация демо-пользователя
  const initDemoUser = () => {
    setUser({
      id: 1,
      name: 'Иван Петров',
      email: 'ivan.petrov@furniture.com',
      role: 'manager',
      department: 'Производство',
      phone: '+7 (999) 123-45-67',
      lastLogin: new Date(),
      createdAt: new Date('2023-01-15')
    })
  }

  return {
    user,
    settings,
    isAuthenticated,
    isAdmin,
    isManager,
    setUser,
    updateProfile,
    updateSettings,
    logout,
    initDemoUser
  }
})
