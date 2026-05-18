import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface OrderReportEntry {
  orderNumber: string
  items: any[]
  employees: string[]
  totalAmount: number
}

interface MovementHistoryItem {
  id: string
  date: string
  type: string
  tagType: 'success' | 'warning' | 'info' | 'error' | 'primary' | 'default'
  employeeName: string
  orderNumber: string
  itemCount: number
  totalAmount?: number
}

interface TopEmployee {
  id: string
  name: string
  position: string
  avatar?: string
  operations: number
}

const API_BASE = '/sklad/api'

export const useReportsStore = defineStore('reports', () => {
  const ordersReport = ref<OrderReportEntry[]>([])
  const writeOffReport = ref<any[]>([])
  const movementHistory = ref<MovementHistoryItem[]>([])
  const topEmployees = ref<TopEmployee[]>([])
  const criticalItems = ref<any[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Load orders summary report
  async function loadOrdersReport() {
    try {
      const response = await fetch(`${API_BASE}/reports/orders-summary`)
      if (!response.ok) throw new Error('Failed to load orders report')
      const data = await response.json()
      ordersReport.value = data.reports || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading orders report:', err)
      throw err
    }
  }

  // Load write-off report
  async function loadWriteOffReport() {
    try {
      const response = await fetch(`${API_BASE}/reports/write-off`)
      if (!response.ok) throw new Error('Failed to load write-off report')
      const data = await response.json()
      writeOffReport.value = data.writeoffs || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading write-off report:', err)
      throw err
    }
  }

  // Load movement history
  async function loadMovementHistory() {
    try {
      const response = await fetch(`${API_BASE}/reports/movement-history`)
      if (!response.ok) throw new Error('Failed to load movement history')
      const data = await response.json()
      movementHistory.value = data.movements || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading movement history:', err)
      throw err
    }
  }

  // Load top employees
  async function loadTopEmployees() {
    try {
      const response = await fetch(`${API_BASE}/reports/top-employees`)
      if (!response.ok) throw new Error('Failed to load top employees')
      const data = await response.json()
      topEmployees.value = data.employees || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading top employees:', err)
      throw err
    }
  }

  // Load critical items
  async function loadCriticalItems() {
    try {
      const response = await fetch(`${API_BASE}/reports/critical-items`)
      if (!response.ok) throw new Error('Failed to load critical items')
      const data = await response.json()
      criticalItems.value = data.items || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading critical items:', err)
      throw err
    }
  }

  // Load all reports
  async function loadAllReports() {
    loading.value = true
    error.value = null
    try {
      await Promise.all([
        loadOrdersReport(),
        loadWriteOffReport(),
        loadMovementHistory(),
        loadTopEmployees(),
        loadCriticalItems()
      ])
    } catch (err) {
      console.error('Error loading reports:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    ordersReport,
    writeOffReport,
    movementHistory,
    topEmployees,
    criticalItems,
    loading,
    error,
    loadOrdersReport,
    loadWriteOffReport,
    loadMovementHistory,
    loadTopEmployees,
    loadCriticalItems,
    loadAllReports
  }
})
