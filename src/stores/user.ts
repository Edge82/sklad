import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { User } from '@/types'

export interface UserSettings {
  theme: 'dark' | 'light'
  notifications: boolean
  language: string
  emailNotifications: boolean
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>({
    id: '1',
    email: 'admin@warehouse.com',
    name: 'Александр Иванов',
    role: 'director',
    department: 'Управление',
    isActive: true,
    permissions: ['all'],
    phone: '+7 (900) 123-45-67',
    avatar: '',
    createdAt: new Date()
  })
  
  const settings = ref<UserSettings>({
    theme: 'dark',
    notifications: true,
    language: 'ru',
    emailNotifications: true
  })

  const isAuthenticated = computed(() => user.value !== null)
  const isDirector = computed(() => user.value?.role === 'director')
  const isManager = computed(() => user.value?.role === 'manager')
  const isStorekeeper = computed(() => user.value?.role === 'storekeeper')
  const isWorker = computed(() => user.value?.role === 'worker')

  const setUser = (userData: User) => {
    user.value = userData
  }

  const logout = () => {
    user.value = null
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

  const updateProfile = (updates: Partial<User>) => {
    if (user.value) {
      user.value = { ...user.value, ...updates }
    }
  }

  return {
    user,
    settings,
    isAuthenticated,
    isDirector,
    isManager,
    isStorekeeper,
    isWorker,
    setUser,
    logout,
    initDemoUser,
    updateProfile
  }
})
