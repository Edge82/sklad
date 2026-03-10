import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OrderShipment } from '@/types'
import { useUserStore } from '@/stores/user'

export const useShipmentsStore = defineStore('shipments', () => {
  const userStore = useUserStore()
  const shipments = ref<OrderShipment[]>([
    {
      id: '1',
      shipmentNumber: 'SHIP-2024-001',
      orderId: '1',
      orderNumber: 'ORD-2024-001',
      createdAt: new Date(),
      createdBy: 'Администратор',
      status: 'completed',
      items: [],
      qrCodes: ['QR-001', 'QR-002'],
      destination: 'Склад №2',
      driverName: 'Иванов И.И.',
      vehicleInfo: 'ГАЗель А123БВ'
    }
  ])

  const getAllShipments = computed(() => {
    if (userStore.isWorker) {
      // Для рабочего фильтруем по ID пользователя или имени (в демо-данных используется имя)
      return shipments.value.filter(s => s.createdBy === userStore.user?.name || s.createdBy === userStore.user?.id)
    }
    return shipments.value
  })

  function addShipment(shipment: Omit<OrderShipment, 'id' | 'createdAt' | 'shipmentNumber'>) {
    const id = Math.random().toString(36).substring(2, 9)
    const shipmentNumber = `SHIP-${new Date().getFullYear()}-${String(shipments.value.length + 1).padStart(3, '0')}`
    
    const newShipment: OrderShipment = {
      ...shipment,
      id,
      shipmentNumber,
      createdAt: new Date()
    }
    
    shipments.value.unshift(newShipment)
    return newShipment
  }

  function updateShipment(id: string, updates: Partial<OrderShipment>) {
    const index = shipments.value.findIndex(s => s.id === id)
    if (index !== -1) {
      shipments.value[index] = { ...shipments.value[index], ...updates } as OrderShipment
    }
  }

  function deleteShipment(id: string) {
    shipments.value = shipments.value.filter(s => s.id !== id)
  }

  return {
    shipments,
    getAllShipments,
    addShipment,
    updateShipment,
    deleteShipment
  }
})
