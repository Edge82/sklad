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
    id: 'user-4',
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
  const isAdminOrManager = computed(() => ['director', 'manager'].includes(user.value?.role || ''))
  const isWarehouseStaff = computed(() => ['director', 'manager', 'storekeeper'].includes(user.value?.role || ''))

  const login = async (email: string, role: User['role']) => {
    // В будущем тут будет API запрос
    let userName = 'Пользователь'
    if (role === 'director') userName = 'Александр Иванов'
    else if (role === 'manager') userName = 'Сергей Петров'
    else if (role === 'storekeeper') userName = 'Дмитрий Сидоров'
    else if (role === 'worker') userName = 'Андрей Кузнецов'

    user.value = {
      id: role === 'director' ? 'user-4' : (role === 'worker' ? 'user-3' : Math.random().toString(36).substring(2, 9)),
      email,
      name: userName,
      role,
      department: role === 'director' ? 'Управление' : (role === 'storekeeper' ? 'Склад' : 'Производство'),
      isActive: true,
      permissions: role === 'director' ? ['all'] : [],
      phone: '+7 (900) 000-00-00',
      avatar: '',
      createdAt: new Date()
    }
    localStorage.setItem('user', JSON.stringify(user.value))
  }

  const logout = () => {
    user.value = null
    localStorage.removeItem('user')
  }

  const checkAuth = () => {
    const savedUser = localStorage.getItem('user')
    if (savedUser) {
      user.value = JSON.parse(savedUser)
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
    settings,
    isAuthenticated,
    isDirector,
    isManager,
    isStorekeeper,
    isWorker,
    isAdminOrManager,
    isWarehouseStaff,
    setUser,
    logout,
    initDemoUser,
    updateProfile,
    login,
    checkAuth
  }
})
