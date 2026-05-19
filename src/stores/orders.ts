import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Order, OrderStatus, OrderShipment, QRCode } from '@/types'
import { API_BASE_URL } from '@/config/api'
import { useQRCodesStore } from './qrCodes'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const totalOrders = computed(() => orders.value.length)
  const pendingOrders = computed(() => orders.value.filter(o => o.status === 'new' || o.status === 'in_progress').length)
  const readyOrders = computed(() => orders.value.filter(o => o.status === 'ready').length)

  const getOrderProgress = (orderId: string, qrCodes: QRCode[]) => {
    const orderItems = qrCodes.filter(q => q.orderId === orderId)
    const totalGenerated = orderItems.length
    if (totalGenerated === 0) return 0

    const scannedCount = orderItems.filter(q =>
      q.status === 'scanned' || q.status === 'shipped'
    ).length

    return Math.min(Math.round((scannedCount / totalGenerated) * 100), 100)
  }

  const getOrderItemProgress = (orderId: string, productId: string, qrCodes: QRCode[]) => {
    const itemCodes = qrCodes.filter(q => q.orderId === orderId && q.productId === productId)
    const totalGenerated = itemCodes.length
    if (totalGenerated === 0) return 0

    const scannedCount = itemCodes.filter(q =>
      q.status === 'scanned' || q.status === 'shipped'
    ).length

    return Math.min(Math.round((scannedCount / totalGenerated) * 100), 100)
  }

  function getOrderById(id: string) {
    return orders.value.find(o => o.id === id)
  }

  function updateOrderStatus(orderId: string, status: OrderStatus) {
    const order = getOrderById(orderId)
    if (order) {
      order.status = status
    }
  }

  function addShipment(orderId: string, shipment: OrderShipment) {
    const order = getOrderById(orderId)
    if (order) {
      order.shipments.push(shipment)
      // Update actual shipped quantities if needed
    }
  }

  function addOrder(orderData: Partial<Order>) {
    const newOrder: Order = {
      id: Math.random().toString(36).substr(2, 9),
      orderNumber: `ORD-${new Date().getFullYear()}-${(orders.value.length + 1).toString().padStart(3, '0')}`,
      createdAt: new Date(),
      orderDate: new Date(),
      shipments: [],
      items: [],
      plannedQuantity: 0,
      actualQuantity: 0,
      remainingQuantity: 0,
      partialShipmentAllowed: true,
      status: 'new',
      ...orderData
    } as Order
    orders.value.unshift(newOrder)
    return newOrder
  }

  function updateOrder(id: string, updates: Partial<Order>) {
    const index = orders.value.findIndex(o => o.id === id)
    if (index !== -1) {
      orders.value[index] = {
        ...orders.value[index],
        ...updates,
        lastUpdated: new Date()
      } as Order
    }
  }

  function deleteOrder(id: string) {
    const index = orders.value.findIndex(o => o.id === id)
    if (index !== -1) {
      orders.value.splice(index, 1)
    }
  }

  // Загрузка заказов с API
  async function loadOrdersFromApi() {
    loading.value = true
    error.value = null
    try {
      const data = await fetch(`${API_BASE_URL}/onec/orders`).then(r => r.json())
      // Бэкэнд возвращает { value: [...] }
      const ordersData = data.value || (Array.isArray(data) ? data : [])
      if (ordersData && Array.isArray(ordersData)) {
        orders.value = ordersData.map((order: any) => {
          const orderDate = order.date ? new Date(order.date) : new Date()
          const orderId = order.ref_key || order.id || String(Math.random())  // Prefer ref_key (UUID)
          return {
            id: orderId,  // Use UUID for API calls
            orderNumber: order.order_number || order.Number || 'N/A',
            customerName: order.customer || order.Контрагент____Presentation || 'Unknown Customer',
            customerPhone: order.customerPhone || '',
            customerEmail: order.customerEmail || '',
            customerId: order.customerId || order.ref_key || '',
            orderDate: orderDate,
            deadline: order.deadline ? new Date(order.deadline) : undefined,
            createdAt: orderDate,
            createdBy: order.createdBy || 'System',
            lastUpdated: order.lastUpdated ? new Date(order.lastUpdated) : orderDate,
            status: mapOrderStatus(order.status || order.СостояниеЗаказа____Presentation || 'pending'),
            priority: order.priority || 'medium',
            items: order.items || [],
            notes: order.notes || '',
            totalAmount: Number(order.amount || order.СуммаДокумента || 0),
            plannedQuantity: order.items_count || 0,
            actualQuantity: 0,
            remainingQuantity: order.items_count || 0,
            shipments: [],
            partialShipmentAllowed: true,
            plannedDate: order.plannedDate ? new Date(order.plannedDate) : undefined,
            completedAt: undefined,
            odata_id: order.id || order.ref_key || '',
            qrCodeCount: 0  // Will be loaded separately
          }
        })

        // Load QR codes only for active orders (в работе, на складе, отгружен)
        try {
          const qrStore = useQRCodesStore()
          const activeStatuses = ['in_progress', 'ready', 'shipped']
          const activeOrderIds = orders.value
            .filter(o => activeStatuses.includes(o.status))
            .map(o => o.id)
          if (activeOrderIds.length > 0) {
            await qrStore.loadQRCodesForOrders(activeOrderIds)

            // Update qrCodeCount for each order based on loaded codes
            orders.value.forEach(order => {
              if (activeStatuses.includes(order.status)) {
                order.qrCodeCount = qrStore.qrCodes.filter(code => code.orderId === order.id).length
              } else {
                order.qrCodeCount = 0
              }
            })
          }
        } catch (qrErr) {
          console.error('Failed to load QR codes:', qrErr)
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem('orders_data', JSON.stringify(orders.value))
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Ошибка загрузки заказов'
      console.error('Failed to load orders:', err)
    } finally {
      loading.value = false
    }
  }

  // Вспомогательная функция для маппинга статусов заказов
  function mapOrderStatus(status: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      'new': 'new',
      'создан': 'new',
      'Создан': 'new',
      'in_progress': 'in_progress',
      'в работе': 'in_progress',
      'В работе': 'in_progress',
      'processing': 'processing',
      'в обработке': 'processing',
      'В обработке': 'processing',
      'on_hold': 'new',
      'ready': 'ready',
      'готов': 'ready',
      'Готов': 'ready',
      'готова': 'ready',
      'Готова': 'ready',
      'завершен': 'completed',
      'Завершен': 'completed',
      'completed': 'completed',
      'на выполнении': 'in_progress',
      'На выполнении': 'in_progress',
      'pending': 'new',
      'cancelled': 'cancelled'
    }
    return statusMap[status] || 'new'
  }

  // Восстановление из localStorage
  function restoreFromLocalStorage() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orders_data')
      if (saved) {
        try {
          orders.value = JSON.parse(saved)
        } catch (err) {
          console.error('Failed to restore orders from localStorage:', err)
        }
      }
    }
  }

  // Update painting (окраска) field for an order
  async function updateOrderPainting(orderId: string, painting: string) {
    loading.value = true
    error.value = null

    try {
      const response = await fetch(`${API_BASE_URL}/onec/orders/painting`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: orderId,
          painting: painting
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update painting')
      }

      // Update local order
      const order = getOrderById(orderId)
      if (order) {
        order.notes = painting
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error updating painting:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // Log operation on the backend
  async function logOperation(type: string, data: any) {
    try {
      await fetch(`${API_BASE_URL}/operation-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operationType: type,
          ...data
        })
      })
    } catch (err) {
      console.error('Error logging operation:', err)
      // Don't throw - logging failure shouldn't break the main operation
    }
  }

  return {
    orders,
    loading,
    error,
    totalOrders,
    pendingOrders,
    readyOrders,
    getOrderById,
    updateOrderStatus,
    addShipment,
    addOrder,
    updateOrder,
    deleteOrder,
    getOrderProgress,
    getOrderItemProgress,
    loadOrdersFromApi,
    restoreFromLocalStorage,
    updateOrderPainting,
    logOperation
  }
})
