import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const API_BASE = '/sklad/api'

function notifyUserOpsRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('refreshUserOperations'))
  }
}

interface MaterialItem {
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
  unit: string
  sku: string
  refKey: string
  category: string
  createdAt?: string
  updatedAt?: string
}

export const useToolsStore = defineStore('tools', () => {
  const items = ref<MaterialItem[]>([])
  const checkouts = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const tools = computed(() => items.value)

  const inStockTools = computed(() =>
    items.value.filter(t => t.availableStock > 0)
  )

  const issuedTools = computed(() =>
    items.value.filter(t => t.checkedOut > 0)
  )

  const repairTools = computed(() => [] as MaterialItem[])

  async function loadToolsFromApi() {
    loading.value = true
    error.value = null
    try {
      const [stocksRes, checkoutsRes] = await Promise.all([
        fetch(`${API_BASE}/onec/stocks?category=${encodeURIComponent('Инвентарь, МБП, хоз.принадлежности')}`),
        fetch(`${API_BASE}/onec/stock-checkouts`)
      ])

      if (!stocksRes.ok) throw new Error('Failed to load materials')
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
        const currentStock = Number(stock.currentStock || stock.quantity || 0)
        const availableStock = currentStock - checkedOutQty

        let status = 'in_stock'
        if (currentStock <= 0) status = 'written_off'

        const location = stock.location || stock.warehouse || ''
        const issuedInfo = itemCheckouts.length > 0 ? itemCheckouts[0] : null

        return {
          id: stock.ref_key || stock.id,
          name: stock.name || stock.product || 'Без названия',
          inventoryNumber: stock.sku || stock.product || '',
          type: 'hand_tool',
          price: Number(stock.purchasePrice || 0),
          status,
          issuedTo: issuedInfo?.employee_id || null,
          issuedToName: issuedInfo?.employee_name || null,
          issuedAt: issuedInfo?.date || null,
          location: location,
          qrCode: stock.barcode || '',
          currentStock,
          availableStock,
          checkedOut: checkedOutQty,
          unit: stock.unit || 'шт',
          sku: stock.sku || '',
          refKey: stock.ref_key || stock.id,
          category: stock.category || '',
          createdAt: stock.synced_at || undefined,
          updatedAt: stock.synced_at || undefined
        }
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading materials:', err)
    } finally {
      loading.value = false
    }
  }

  async function issueTool(refKey: string, employeeId: string, employeeName: string) {
    try {
      const response = await fetch(`${API_BASE}/onec/stocks/${refKey}/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, employeeName, quantity: 1 })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to issue material')
      }

      const data = await response.json()
      await loadToolsFromApi()
      notifyUserOpsRefresh()
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error issuing material:', err)
      throw err
    }
  }

  async function returnTool(id: string) {
    try {
      // If id is a checkout ID (from getToolsIssuedToEmployee), look up the checkout
      const checkout = checkouts.value.find((c: any) => c.id === id)
      const refKey = checkout?.material_ref_key || id
      const employeeId = checkout?.employee_id || ''

      const response = await fetch(`${API_BASE}/onec/stocks/${refKey}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, quantity: 1 })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to return material')
      }

      const data = await response.json()
      await loadToolsFromApi()
      notifyUserOpsRefresh()
      return data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error returning material:', err)
      throw err
    }
  }

  function getToolById(id: string) {
    return items.value.find(t => t.id === id)
  }

  function getToolsIssuedToEmployee(employeeId: string) {
    const empCheckouts = checkouts.value.filter((c: any) => c.employee_id === employeeId)
    return empCheckouts.map((c: any) => ({
      id: c.id,
      name: c.material_name,
      inventoryNumber: c.sku || '',
      type: 'hand_tool',
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

  async function addTool() {
  }

  async function updateTool() {
  }

  async function deleteTool() {
  }

  async function reportBreakdown() {
  }

  async function loadBreakdowns() {
    return []
  }

  return {
    tools,
    items,
    checkouts,
    loading,
    error,
    inStockTools,
    issuedTools,
    repairTools,
    loadToolsFromApi,
    issueTool,
    returnTool,
    reportBreakdown,
    getToolById,
    getToolsIssuedToEmployee,
    addTool,
    updateTool,
    deleteTool,
    loadBreakdowns
  }
})
