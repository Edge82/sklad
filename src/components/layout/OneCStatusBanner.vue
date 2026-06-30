<template>
  <div
    v-if="showBanner"
    :class="[
      'w-full px-6 py-3 flex items-center justify-between gap-4',
      'text-white font-medium transition-colors',
      connectionStatus === 'connected' ? 'bg-green-600' : 'bg-red-600'
    ]"
  >
    <div class="flex items-center gap-3">
      <n-icon :size="20" class="animate-pulse">
        <AlertCircleOutline v-if="connectionStatus !== 'connected'" />
        <CheckmarkCircleOutline v-else />
      </n-icon>
      <div>
        <div v-if="connectionStatus === 'connected'" class="font-semibold">
          ✓ Соединение с 1C восстановлено
        </div>
        <div v-else-if="connectionStatus === 'unavailable'" class="font-semibold">
          ❌ 1C НЕДОСТУПНА - Синхронизация невозможна
        </div>
        <div v-else-if="connectionStatus === 'failed'" class="font-semibold">
          ⚠️ ОШИБКА СИНХРОНИЗАЦИИ - {{ error }}
        </div>
        <div v-else class="font-semibold">
          📡 Синхронизация с 1C...
        </div>
        <div class="text-xs opacity-90 mt-1">
          Последняя синхронизация: {{ lastSyncTime || 'Никогда' }}
          <span v-if="integrationStore.isSyncing" class="ml-2 font-semibold">
            • Синхронизация...
          </span>
        </div>
      </div>
    </div>
    <n-button
      text
      type="primary"
      class="text-white hover:opacity-80"
      @click="showDetails = true"
    >
      Подробно →
    </n-button>
  </div>

  <!-- Модальное окно с деталями -->
  <n-modal v-model:show="showDetails" title="Статус синхронизации 1C" preset="card" style="width: 600px">
    <n-space vertical>
      <n-statistic label="Статус соединения">
        <template #prefix>
          <n-icon v-if="connectionStatus === 'connected'" class="text-green-600">
            <CheckmarkCircleOutline />
          </n-icon>
          <n-icon v-else class="text-red-600">
            <AlertCircleOutline />
          </n-icon>
        </template>
        {{ connectionStatusText }}
      </n-statistic>

      <n-divider />

      <n-alert type="info" title="Последняя полная синхронизация">
        <div class="space-y-2">
          <p><strong>Время:</strong> {{ lastSyncTime }}</p>
          <p><strong>Статус:</strong> {{ syncStatus }}</p>
          <p v-if="error"><strong>Ошибка:</strong> {{ error }}</p>
        </div>
      </n-alert>

      <n-divider />

      <n-alert type="info" title="Время синхронизации справочников">
        <n-list size="small">
          <n-list-item>
            <template #prefix>📋</template>
            <div class="w-full flex justify-between items-center">
              <span>Заказы</span>
              <span class="text-xs text-gray-600">{{ getTimeSinceSyncByType('orders') }}</span>
            </div>
          </n-list-item>
          <n-list-item>
            <template #prefix>📦</template>
            <div class="w-full flex justify-between items-center">
              <span>Материалы</span>
              <span class="text-xs text-gray-600">{{ getTimeSinceSyncByType('stocks') }}</span>
            </div>
          </n-list-item>
          <n-list-item>
            <template #prefix>📏</template>
            <div class="w-full flex justify-between items-center">
              <span>Единицы измерения</span>
              <span class="text-xs text-gray-600">{{ getTimeSinceSyncByType('units') }}</span>
            </div>
          </n-list-item>
          <n-list-item>
            <template #prefix>📍</template>
            <div class="w-full flex justify-between items-center">
              <span>Склады</span>
              <span class="text-xs text-gray-600">{{ getTimeSinceSyncByType('warehouses') }}</span>
            </div>
          </n-list-item>
        </n-list>
      </n-alert>

      <n-divider />

      <n-statistic label="Кэш (загруженные данные)">
        <n-list>
          <n-list-item>
            <template #prefix>📦</template>
            Материалы (stocks): {{ cacheStatus.stocks }}
          </n-list-item>
          <n-list-item>
            <template #prefix>📋</template>
            Заказы (orders): {{ cacheStatus.orders }}
          </n-list-item>
          <n-list-item>
            <template #prefix>📍</template>
            Склады (warehouses): {{ cacheStatus.warehouses }}
          </n-list-item>
          <n-list-item>
            <template #prefix>📏</template>
            Единицы (units): {{ cacheStatus.units }}
          </n-list-item>
        </n-list>
      </n-statistic>

      <n-divider />

      <n-button type="primary" block :loading="isRefreshing" @click="refreshStatus">
        {{ isRefreshing ? 'Проверка...' : 'Проверить соединение с 1С' }}
      </n-button>

      <div v-if="integrationStore.syncMessage" class="text-sm text-center py-2">
        <n-progress type="line" :percentage="integrationStore.isSyncing ? 66 : 100" :show-indicator="false" color="#2080f0" />
        {{ integrationStore.syncMessage }}
      </div>

      <n-button type="warning" block :loading="isSyncing" @click="fullSync">
        {{ isSyncing ? 'Синхронизация...' : 'Полная синхронизация с 1С' }}
      </n-button>

      <n-button text tag="p" class="text-xs text-gray-600 text-center">
        URL: {{ baseUrl }}
      </n-button>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import {
  NIcon,
  NButton,
  NModal,
  NStatistic,
  NList,
  NListItem,
  NAlert,
  NDivider,
  NSpace,
  NProgress
} from 'naive-ui'
import { AlertCircleOutline, CheckmarkCircleOutline } from '@vicons/ionicons5'
import { syncEvents } from '../../utils/syncEvents'
import { useIntegrationStore } from '../../stores/integration'

interface OneCStatus {
  baseUrl: string
  username: string
  configured: boolean
  connectionStatus: 'connected' | 'unavailable' | 'failed' | 'unknown'
  lastSync: string
  syncStatus: string
  error: string | null
  lastSyncByType: {
    units: string | null
    warehouses: string | null
    stocks: string | null
    orders: string | null
  }
  cacheStatus: {
    units: number
    warehouses: number
    stocks: number
    orders: number
  }
}

const integrationStore = useIntegrationStore()
const showBanner = ref(true)
const showDetails = ref(false)
const status = ref<OneCStatus | null>(null)
const isRefreshing = ref(false)
const isSyncing = ref(false)

const connectionStatus = computed(() => status.value?.connectionStatus || 'unknown')
const lastSyncTime = computed(() => {
  if (!status.value?.lastSync) return 'Никогда'
  const date = new Date(status.value.lastSync)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Сейчас'
  if (minutes < 60) return `${minutes} минут назад`
  if (hours < 24) return `${hours} часов назад`
  return `${days} дней назад`
})

const syncStatus = computed(() => status.value?.syncStatus || 'unknown')
const error = computed(() => status.value?.error)
const baseUrl = computed(() => status.value?.baseUrl || '')
const cacheStatus = computed(() => status.value?.cacheStatus || { units: 0, warehouses: 0, stocks: 0, orders: 0 })

const connectionStatusText = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return '✓ Подключено и синхронизировано'
    case 'unavailable':
      return '❌ Сервер 1C недоступен'
    case 'failed':
      return '⚠️ Ошибка синхронизации'
    default:
      return '❓ Неизвестно'
  }
})

// Счётчик обновлений для реактивного обновления времени
const updateCounter = ref(0)

let timerInterval: ReturnType<typeof setInterval> | null = null

const timeSinceSyncByType = computed(() => {
  // Используем updateCounter для реактивности
  updateCounter.value
  
  const result: Record<string, string> = {}
  
  const types: ('units' | 'warehouses' | 'stocks' | 'orders')[] = ['units', 'warehouses', 'stocks', 'orders']
  
  for (const type of types) {
    const syncTime = status.value?.lastSyncByType?.[type]
    if (!syncTime) {
      result[type] = 'Не синхронизировано'
    } else {
      const date = new Date(syncTime)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)
      const hours = Math.floor(diff / 3600000)
      const days = Math.floor(diff / 86400000)

      if (minutes < 1) result[type] = 'Сейчас'
      else if (minutes < 60) result[type] = `${minutes} ${getPlural(minutes, 'минуту', 'минуты', 'минут')} назад`
      else if (hours < 24) result[type] = `${hours} ${getPlural(hours, 'час', 'часа', 'часов')} назад`
      else result[type] = `${days} ${getPlural(days, 'день', 'дня', 'дней')} назад`
    }
  }
  
  return result
})

function getPlural(count: number, one: string, two: string, five: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  
  if (mod100 >= 11 && mod100 <= 19) return five
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return two
  return five
}

function getTimeSinceSyncByType(type: 'units' | 'warehouses' | 'stocks' | 'orders'): string {
  return timeSinceSyncByType.value[type] || '-'
}

async function fetchStatus() {
  try {
    const response = await fetch('/sklad/api/1c/status')
    if (response.ok) {
      status.value = await response.json()
    } else {
      console.error('Failed to fetch 1C status: HTTP', response.status)
    }
  } catch (err) {
    console.error('Failed to fetch 1C status:', err)
  }
}

async function refreshStatus() {
   isRefreshing.value = true
   try {
     await fetchStatus()
   } catch (err) {
     console.error('Error refreshing status:', err)
   } finally {
     isRefreshing.value = false
   }
 }

async function fullSync() {
    isSyncing.value = true
    try {
      const response = await fetch('/sklad/api/sync/1c', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      // Сервер вернул 202 — синк идёт в фоне
      // SSE из integrationStore уведомит об окончании
    } catch (err) {
      console.error('Error during full sync:', err)
    } finally {
      // Не сбрасываем isSyncing — он будет сброшен через SSE
      setTimeout(() => { isSyncing.value = false }, 100)
    }
  }

let interval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  // Загружаем статус при первой загрузке
  fetchStatus()

  // Обновляем каждый час
  interval = setInterval(fetchStatus, 60000)
  
  // Обновляем время в реальном времени каждую секунду
  timerInterval = setInterval(() => {
    updateCounter.value++
  }, 1000)

  // Слушаем события синхронизации
  syncEvents.on('sync-completed', () => {
    fetchStatus()
  })
})

onUnmounted(() => {
  if (interval) {
    clearInterval(interval)
  }
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  // Удаляем все слушатели
  syncEvents.off('sync-completed', fetchStatus)
})
</script>

<style scoped>
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
