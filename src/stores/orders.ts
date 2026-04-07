import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Order, OrderStatus, OrderShipment, QRCode } from '@/types'

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([])

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

  return {
    orders,
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
    getOrderItemProgress
  }
})
