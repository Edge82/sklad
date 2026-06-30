import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_BASE = '/sklad/api'

function notifyUserOpsRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refreshUserOperations'))
  }
}

interface HardwareItem {
  id: string
  name: string
  inventoryNumber: string
  type: string
  price: number
  status: string
  issuedTo: string | null
  issuedToName: string | null
  issuedAt: string | null
  location: string | null
  qrCode: string
  currentStock: number
  availableStock: number
  checkedOut: number
  onecQuantity: number
  hasDiscrepancy: boolean
  unit: string
  sku: string
  refKey: string
  category: string
  warehouse: string
  createdAt?: string
  updatedAt?: string
}

export const useHardwareStore = defineStore('hardware', () => {
  const items = ref<HardwareItem[]>([])
  const checkouts = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const hardware = computed(() => items.value)

  const inStockItems = computed(() =>
    items.value.filter(t => t.availableStock > 0)
  )

  const issuedItems = computed(() =>
    items.value.filter(t => t.checkedOut > 0)
  )

  const discrepancyItems = computed(() =>
    items.value.filter(t => t.hasDiscrepancy)
  )

  async function loadHardwareFromApi() {
    loading.value = true
    error.value = null
    try {
      const [stocksRes, checkoutsRes] = await Promise.all([
        fetch(`${API_BASE}/onec/stocks?category=${encodeURIComponent('Фурнитура (торг)')}`),
        fetch(`${API_BASE}/onec/stock-checkouts`)
      ])

      if (!stocksRes.ok) throw new Error('Failed to load hardware')
      const stocksData = await stocksRes.json()
      const rawStocks = stocksData.value || []

      let checkoutData: any[] = []
      if (checkoutsRes.ok) {
        const coData = await checkoutsRes.json()
        checkoutData = coData.checkouts || []
      }
      checkouts.value = checkoutData

      items.value = rawStocks.map((stock: any) => {
        const itemCheckouts = checkoutData.filter((c: any) => c.material_ref_key === stock.ref_key)
        const checkedOutQty = itemCheckouts.reduce((s: number, c: any) => s + Number(c.quantity || 0), 0)
        const onecQuantity = Number(stock.quantity || 0)
        const currentStock = Number(stock.currentStock || stock.quantity || 0)
        const availableStock = currentStock - checkedOutQty
        const hasDiscrepancy = onecQuantity < checkedOutQty

        let status = 'in_stock'
        if (currentStock <= 0) status = 'written_off'
        if (hasDiscrepancy) status = 'discrepancy'

        const issuedInfo = itemCheckouts.length > 0 ? itemCheckouts[0] : null

        return {
          id: stock.ref_key || stock.id,
          name: stock.name || stock.product || 'Без названия',
          inventoryNumber: stock.sku || stock.product || '',
          type: 'hardware',
          price: Number(stock.purchasePrice || 0),
          status,
          issuedTo: issuedInfo?.employee_id || null,
          issuedToName: issuedInfo?.employee_name || null,
          issuedAt: issuedInfo?.date || null,
          location: stock.storageBin || '',
          qrCode: stock.barcode || '',
          currentStock,
          availableStock,
          checkedOut: checkedOutQty,
          onecQuantity,
          hasDiscrepancy,
          unit: stock.unit || 'шт',
          sku: stock.sku || '',
          refKey: stock.ref_key || stock.id,
          category: stock.category || '',
          warehouse: stock.warehouse || '',
          createdAt: stock.synced_at || undefined,
          updatedAt: stock.synced_at || undefined
        }
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading hardware:', err)
    } finally {
      loading.value = false
    }
  }

  async function issueHardware(refKey: string, employeeId: string, employeeName: string, quantity: number = 1, orderNumber: string = '') {
    try {
      const response = await fetch(`${API_BASE}/onec/stocks/${refKey}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, employeeName, quantity, operationType: 'hardware_issued', orderNumber })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to issue hardware')
      }

      const data = await response.json()
      await loadHardwareFromApi()
      notifyUserOpsRefresh()
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error issuing hardware:', err)
      throw err
    }
  }

  async function returnHardware(id: string, quantity: number = 0) {
    try {
      const checkout = checkouts.value.find((c: any) => c.id === id)
      const refKey = checkout?.material_ref_key || id
      const employeeId = checkout?.employee_id || ''
      const qty = quantity || (checkout?.quantity || 1)

      const response = await fetch(`${API_BASE}/onec/stocks/${refKey}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, quantity: qty, operationType: 'hardware_returned' })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to return hardware')
      }

      const data = await response.json()
      await loadHardwareFromApi()
      notifyUserOpsRefresh()
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error returning hardware:', err)
      throw err
    }
  }

  function getHardwareById(id: string) {
    return items.value.find(t => t.id === id)
  }

  function getHardwareIssuedToEmployee(employeeId: string) {
    const hardwareRefKeys = new Set(items.value.map((i: any) => i.refKey))
    const empCheckouts = checkouts.value.filter((c: any) => c.employee_id === employeeId && hardwareRefKeys.has(c.material_ref_key))
    return empCheckouts.map((c: any) => ({
      id: c.id,
      name: c.material_name,
      inventoryNumber: c.sku || '',
      type: 'hardware',
      price: 0,
      status: 'issued',
      issuedTo: c.employee_id,
      issuedToName: c.employee_name,
      issuedAt: c.date,
      location: null,
      qrCode: '',
      currentStock: 0,
      availableStock: 0,
      checkedOut: Number(c.quantity || 0),
      unit: 'шт',
      sku: c.sku || '',
      refKey: c.material_ref_key,
      category: ''
    }))
  }

  return {
    hardware,
    items,
    checkouts,
    loading,
    error,
    inStockItems,
    issuedItems,
    discrepancyItems,
    loadHardwareFromApi,
    issueHardware,
    returnHardware,
    getHardwareById,
    getHardwareIssuedToEmployee
  }
})
