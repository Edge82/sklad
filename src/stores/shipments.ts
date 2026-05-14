import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { OrderShipment, MaterialInvoice } from '@/types'
import { useUserStore } from '@/stores/user'

const API_BASE = '/sklad/api'

export const useShipmentsStore = defineStore('shipments', () => {
  const userStore = useUserStore()
  const shipments = ref<OrderShipment[]>([])
  const materialInvoices = ref<MaterialInvoice[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

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

  // Material Invoices functions
  async function loadInvoicesFromApi() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE}/material-invoices`)
      if (!response.ok) throw new Error('Failed to load invoices')
      const data = await response.json()
      materialInvoices.value = data.invoices || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading invoices:', err)
    } finally {
      loading.value = false
    }
  }

  async function loadEmployeeInvoices(employeeId: string) {
    try {
      const response = await fetch(`${API_BASE}/employees/${employeeId}/material-invoices`)
      if (!response.ok) throw new Error('Failed to load employee invoices')
      const data = await response.json()
      return data.invoices || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading employee invoices:', err)
      throw err
    }
  }

  async function createInvoice(invoiceData: Omit<MaterialInvoice, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const invoice = {
        ...invoiceData
      }

      const response = await fetch(`${API_BASE}/material-invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      })

      if (!response.ok) throw new Error('Failed to create invoice')
      const data = await response.json()
      if (data.invoice) {
        materialInvoices.value.unshift(data.invoice)
      }
      return data.invoice
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error creating invoice:', err)
      throw err
    }
  }

  function getInvoiceById(id: string) {
    return materialInvoices.value.find(inv => inv.id === id)
  }

  function getInvoicesByDestination(destination: string) {
    return materialInvoices.value.filter(inv => inv.destination === destination)
  }

  const totalInvoices = computed(() => materialInvoices.value.length)
  const invoicesByDestination = computed(() => {
    return {
      production: materialInvoices.value.filter(inv => inv.destination === 'Производство').length,
      client: materialInvoices.value.filter(inv => inv.destination === 'Клиент').length
    }
  })

  return {
    shipments,
    materialInvoices,
    loading,
    error,
    getAllShipments,
    totalInvoices,
    invoicesByDestination,
    addShipment,
    updateShipment,
    deleteShipment,
    loadInvoicesFromApi,
    loadEmployeeInvoices,
    createInvoice,
    getInvoiceById,
    getInvoicesByDestination
  }
})
