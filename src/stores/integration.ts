import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useInventoryStore } from './inventory'
import { useOrdersStore } from './orders'
import { API_BASE_URL } from '@/config/api'
import type { OrderItem } from '@/types'

export const useIntegrationStore = defineStore('integration', () => {
  const inventoryStore = useInventoryStore()
  const ordersStore = useOrdersStore()
  
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastSyncTime = ref<string | null>(typeof window !== 'undefined' ? localStorage.getItem('1c_last_sync') : null)
  const syncProgress = ref(0)
  const settings = ref({
    importOrders: true,
    importNomenclature: true,
    importEmployees: true,
    exportShipments: true,
    exportProduction: true
  })
  const syncLogs = ref<any[]>([])

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
      // Вызываем backend endpoint для синхронизации только заказов
      const response = await fetch(`${API_BASE_URL}/sync/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) throw new Error('Failed to sync orders')
      
      // После синхронизации перезагружаем данные в store
      await ordersStore.loadOrdersFromApi()
    } catch (err: any) {
      error.value = err.message || 'Ошибка загрузки заказов'
      console.error('Orders sync error:', err)
      throw err
    }
  }

  async function syncStocks() {
    try {
      // Вызываем backend endpoint для синхронизации только материалов
      const response = await fetch(`${API_BASE_URL}/sync/stocks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) throw new Error('Failed to sync stocks')
      
      // После синхронизации перезагружаем данные в store
      await inventoryStore.loadStocksFromApi()
    } catch (err: any) {
      error.value = err.message || 'Ошибка загрузки материалов'
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
      const rawItems = data.value || []
      
      // Трансформируем полученные позиции в формат OrderItem
      const items = rawItems.map((item: any) => ({
        id: item.id || `${orderId}-${Math.random()}`,
        orderId: orderId,
        productId: item.productId || '',
        productName: item.productName || 'Неизвестный товар',
        itemName: item.productName || 'Неизвестный товар',
        productArticle: item.article || '',
        quantity: item.quantity || 0,
        unitPrice: item.price || 0,
        totalPrice: item.amount || 0,
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
      console.log('\n🚀 ===== SENDING TO BACKEND =====')
      console.log('📦 Request Data:')
      console.log(JSON.stringify(data, null, 2))
      
      const response = await fetch(`${API_BASE_URL}/1c/material-transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''}`
        },
        body: JSON.stringify(data)
      })
      
      console.log(`📡 Response Status: ${response.status}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Backend Error:', errorData)
        throw new Error('Ошибка создания документа')
      }
      
      const result = await response.json()
      console.log('✅ Success Response:')
      console.log(JSON.stringify(result, null, 2))
      console.log('🚀 ===== END SENDING =====\n')
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

  // Полная синхронизация всех данных
  async function syncAll() {
    loading.value = true
    error.value = null
    
    try {
      await syncWith1C()
      await syncOrders()
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
    settings,
    syncLogs,
    syncWith1C,
    syncOrders,
    syncStocks,
    syncOrderDetails,
    createMaterialTransferDocument,
    createNomenclature,
    syncAll
  }
})



