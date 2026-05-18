import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tool, ToolBreakdown } from '@/types'

const API_BASE = '/sklad/api'

export const useToolsStore = defineStore('tools', () => {
  const tools = ref<Tool[]>([])
  const breakdowns = ref<ToolBreakdown[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const inStockTools = computed(() => tools.value.filter(t => t.status === 'in_stock'))
  const issuedTools = computed(() => tools.value.filter(t => t.status === 'issued'))
  const repairTools = computed(() => tools.value.filter(t => t.status === 'repair'))

  // Load all tools from API
  async function loadToolsFromApi() {
    loading.value = true
    error.value = null
    try {
      const response = await fetch(`${API_BASE}/tools`)
      if (!response.ok) throw new Error('Failed to load tools')
      const data = await response.json()
      tools.value = data.tools || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading tools:', err)
    } finally {
      loading.value = false
    }
  }

  // Add new tool
  async function addTool(toolData: Omit<Tool, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const tool: any = {
        id: Math.random().toString(36).substr(2, 9),
        ...toolData
      }

      const response = await fetch(`${API_BASE}/tools`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tool)
      })

      if (!response.ok) throw new Error('Failed to create tool')
      const data = await response.json()
      if (data.tool) {
        tools.value.unshift(data.tool as Tool)
      }
      return data.tool
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error creating tool:', err)
      throw err
    }
  }

  // Update tool
  async function updateTool(id: string, updates: Partial<Tool>) {
    try {
      const response = await fetch(`${API_BASE}/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Failed to update tool')

      // Update local state
      const index = tools.value.findIndex(t => t.id === id)
      if (index !== -1) {
        // Handle auto-clearing of employee info when status changes to repair/written_off
        if (updates.status && (updates.status === 'repair' || updates.status === 'written_off')) {
          tools.value[index] = {
            ...tools.value[index],
            ...updates,
            issuedTo: null,
            issuedToName: null,
            issuedAt: null,
            location: null
          } as Tool
        } else {
          tools.value[index] = { ...tools.value[index], ...updates } as Tool
        }
      }

      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error updating tool:', err)
      throw err
    }
  }

  // Delete tool
  async function deleteTool(id: string) {
    try {
      const response = await fetch(`${API_BASE}/tools/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete tool')

      const index = tools.value.findIndex(t => t.id === id)
      if (index !== -1) {
        tools.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error deleting tool:', err)
      throw err
    }
  }

  // Issue tool to employee
  async function issueTool(toolId: string, employeeId: string, employeeName: string) {
    return updateTool(toolId, {
      status: 'issued',
      issuedTo: employeeId,
      issuedToName: employeeName,
      issuedAt: new Date()
    })
  }

  // Return tool from employee
  async function returnTool(toolId: string) {
    const tool = tools.value.find(t => t.id === toolId)
    return updateTool(toolId, {
      status: 'in_stock',
      issuedTo: null,
      issuedToName: null,
      issuedAt: null,
      location: tool?.location || null
    })
  }

  // Report breakdown
  async function reportBreakdown(toolId: string, description: string) {
    try {
      const response = await fetch(`${API_BASE}/tools/${toolId}/breakdowns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          reportedBy: 'System'
        })
      })

      if (!response.ok) throw new Error('Failed to report breakdown')
      const data = await response.json()

      // Update local tool status to repair - replace entire object for proper reactivity
      const index = tools.value.findIndex(t => t.id === toolId)
      if (index !== -1) {
        tools.value[index] = {
          ...tools.value[index],
          status: 'repair',
          issuedTo: null,
          issuedToName: null,
          issuedAt: null,
          breakdownDescription: description
        } as Tool
      }

      return data.breakdown
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error reporting breakdown:', err)
      throw err
    }
  }

  // Get tool by ID
  function getToolById(id: string) {
    return tools.value.find(t => t.id === id)
  }

  // Load breakdowns for a tool
  async function loadBreakdowns(toolId: string) {
    try {
      const response = await fetch(`${API_BASE}/tools/${toolId}/breakdowns`)
      if (!response.ok) throw new Error('Failed to load breakdowns')
      const data = await response.json()
      breakdowns.value = data.breakdowns || []
      return breakdowns.value
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error'
      console.error('Error loading breakdowns:', err)
      throw err
    }
  }

  // Get tools issued to a specific employee
  function getToolsIssuedToEmployee(employeeId: string) {
    return tools.value.filter(t => t.issuedTo === employeeId && t.status === 'issued')
  }

  return {
    tools,
    breakdowns,
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
