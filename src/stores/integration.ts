import { defineStore } from 'pinia'
import { ref, onUnmounted } from 'vue'
import { useInventoryStore } from './inventory'
import { useOrdersStore } from './orders'
import { API_BASE_URL } from '@/config/api'
import { syncEvents } from '@/utils/syncEvents'
import type { OrderItem } from '@/types'

export const useIntegrationStore = defineStore('integration', () => {
  const inventoryStore = useInventoryStore()
  const ordersStore = useOrdersStore()

  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastSyncTime = ref<string | null>(typeof window !== 'undefined' ? localStorage.getItem('1c_last_sync') : null)
  const syncProgress = ref(0)
  const isSyncing = ref(false)
  const syncMessage = ref('')
  const serverLastSyncStocks = ref<string | null>(null)
  let prevLastSync = typeof window !== 'undefined' ? localStorage.getItem('1c_last_sync') : null
  let prevLastSyncStocks: string | null = null
  const settings = ref({
    importOrders: true,
    importNomenclature: true,
    importEmployees: true,
    exportShipments: true,
    exportProduction: true
  })
  const syncLogs = ref<any[]>([])

  // Polling статуса синхронизации (вместо SSE)
  let syncPollInterval: ReturnType<typeof setInterval> | null = null

  async function initPrevLastSync() {
    if (prevLastSync) return
    try {
      const resp = await fetch(`${API_BASE_URL}/sync/status`)
      if (resp.ok) {
        const data = await resp.json()
        prevLastSync = data.lastSync || null
        prevLastSyncStocks = data.lastSyncByType?.stocks || null
      }
    } catch { /* ignore */ }
  }

  function startSyncPolling() {
    if (typeof window === 'undefined') return
    if (syncPollInterval) return

    initPrevLastSync()
    syncPollInterval = setInterval(async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/sync/status`)
        if (!resp.ok) return
        const data = await resp.json()

        if (data.isSyncing) {
          if (!isSyncing.value) {
            isSyncing.value = true
            syncMessage.value = 'Синхронизация...'
          }
        } else {
          if (isSyncing.value) {
            isSyncing.value = false
          }

          // Проверяем по lastSync (полный синк)
          const currentLastSync = data.lastSync || ''
          const currentLastSyncStocks = data.lastSyncByType?.stocks || ''
          let shouldReload = false

          if (currentLastSync && currentLastSync !== prevLastSync) {
            prevLastSync = currentLastSync
            shouldReload = true
          }

          if (currentLastSyncStocks && currentLastSyncStocks !== prevLastSyncStocks) {
            prevLastSyncStocks = currentLastSyncStocks
            shouldReload = true
          }

          if (shouldReload) {
            lastSyncTime.value = currentLastSync || currentLastSyncStocks
            if (typeof window !== 'undefined') {
              localStorage.setItem('1c_last_sync', lastSyncTime.value || '')
            }

            inventoryStore.loadStocksFromApi().catch(() => {})
            ordersStore.loadOrdersFromApi().catch(() => {})

            syncEvents.emit('sync-completed', { type: 'stocks' })
            syncMessage.value = 'Синхронизация завершена'
            setTimeout(() => { syncMessage.value = '' }, 5000)
          }
        }
      } catch {
        // игнорируем ошибки polling
      }
    }, 5000)
  }

  function stopSyncPolling() {
    if (syncPollInterval) {
      clearInterval(syncPollInterval)
      syncPollInterval = null
    }
  }

  // Подключаем polling при создании store
  if (typeof window !== 'undefined') {
    startSyncPolling()
    onUnmounted(() => {
      stopSyncPolling()
    })
  }

  async function syncWith1C() {
    loading.value = true
    error.value = null
    syncProgress.value = 0

    try {
      // Загружаем остатки
      syncProgress.value = 25
      await inventoryStore.loadStocksFromApi()

      // Загружаем заказы
      syncProgress.value = 50
      await ordersStore.loadOrdersFromApi()

      // Обновляем время синхронизации
      const now = new Date().toISOString()
      lastSyncTime.value = now
      if (typeof window !== 'undefined') {
        localStorage.setItem('1c_last_sync', now)
      }

      syncProgress.value = 100
    } catch (err: any) {
      error.value = err.message || 'Ошибка синхронизации с 1С'
      console.error('Sync error:', err)
    } finally {
      loading.value = false
      syncProgress.value = 0
    }
  }

  async function syncOrders() {
    try {
      const response = await fetch(`${API_BASE_URL}/sync/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Failed to start orders sync')
      // Сервер вернул 202 — синк идёт в фоне, SSE уведомит об окончании
      // Данные обновятся автоматически через SSE
    } catch (err: any) {
      error.value = err.message || 'Ошибка запуска синхронизации заказов'
      console.error('Orders sync error:', err)
      throw err
    }
  }

  async function syncStocks() {
    try {
      const response = await fetch(`${API_BASE_URL}/sync/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Failed to start stocks sync')
      // Сервер вернул 202 — синк идёт в фоне, SSE уведомит об окончании
    } catch (err: any) {
      error.value = err.message || 'Ошибка запуска синхронизации материалов'
      console.error('Stocks sync error:', err)
      throw err
    }
  }

  async function syncOrderDetails(orderId: string) {
    try {
      // Загружаем позиции конкретного заказа из API
      const response = await fetch(`${API_BASE_URL}/onec/order-items?orderId=${orderId}`)
      if (!response.ok) throw new Error('Failed to fetch order items')

      const data = await response.json()
      const rawItems = data.items || data.value || []

      // Трансформируем полученные позиции в формат OrderItem
      const items = rawItems.map((item: any) => ({
        id: item.id || `${orderId}-${Math.random()}`,
        orderId: orderId,
        productId: item.productId || '',
        productName: item.productName || 'Неизвестный товар',
        itemName: item.productName || 'Неизвестный товар',
        productArticle: item.article || '',
        quantity: item.quantity || 0,
        unitPrice: Number(item.unitPrice || item.price || 0),
        totalPrice: Number(item.totalPrice || item.amount || 0),
        materialUsed: '',
        paintUsed: '',
        plannedQuantity: item.quantity || 0,
        actualQuantity: 0,
        remainingQuantity: item.quantity || 0,
        unit: item.unit || 'шт'
      }))

      // Обновляем заказ в store с полученными позициями
      const order = ordersStore.orders.find(o => o.id === orderId)
      if (order) {
        order.items = items as OrderItem[]
        order.plannedQuantity = items.reduce((sum: number, item: any) => sum + (item.plannedQuantity || 0), 0)
        order.remainingQuantity = order.plannedQuantity
      }
    } catch (err: any) {
      // Если не удалось получить из API, пробуем перезагрузить все заказы
      try {
        await ordersStore.loadOrdersFromApi()
      } catch (innerErr) {
        error.value = err.message || 'Ошибка загрузки деталей заказа'
        console.error('Order details sync error:', err)
      }
    }
  }

  async function createMaterialTransferDocument(data: any) {
    try {
      const response = await fetch(`${API_BASE_URL}/1c/material-transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''}`
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Backend Error:', errorData)
        throw new Error('Ошибка создания документа')
      }

      const result = await response.json()
      return result
    } catch (err: any) {
      error.value = err.message || 'Ошибка создания документа переноса'
      console.error('Material transfer error:', err)
      throw err
    }
  }

  async function createNomenclature(data: {
    name: string
    sku: string
    unitId?: string
    categoryId?: string
    image?: string
    imageFileName?: string
  }) {
    try {
      // Отправляем только заполненные поля
      const payload: any = {
        name: data.name,
        sku: data.sku
      }

      if (data.unitId) {
        payload.unitId = data.unitId
      }
      if (data.categoryId) {
        payload.categoryId = data.categoryId
      }
      if (data.image) {
        payload.image = data.image
      }
      if (data.imageFileName) {
        payload.imageFileName = data.imageFileName
      }

      const response = await fetch(`${API_BASE_URL}/1c/nomenclature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''}`
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error('Ошибка создания номенклатуры')
      return await response.json()
    } catch (err: any) {
      error.value = err.message || 'Ошибка создания номенклатуры в 1С'
      console.error('Create nomenclature error:', err)
      throw err
    }
  }

  // Полная синхронизация всех данных (асинхронная)
  async function syncAll() {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/sync/1c`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Failed to start full sync')
    } catch (err: any) {
      error.value = err.message || 'Ошибка полной синхронизации'
      console.error('Full sync error:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    loading,
    error,
    lastSyncTime,
    syncProgress,
    isSyncing,
    syncMessage,
    settings,
    syncLogs,
    syncWith1C,
    syncOrders,
    syncStocks,
    syncOrderDetails,
    createMaterialTransferDocument,
    createNomenclature,
    syncAll,
    connectSSE: startSyncPolling,
    disconnectSSE: stopSyncPolling
  }
})



