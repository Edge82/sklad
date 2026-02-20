import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Tool, ToolBreakdown } from '@/types'

export const useToolsStore = defineStore('tools', () => {
  const tools = ref<Tool[]>([
    {
      id: '1',
      name: 'Шуруповерт Bosch',
      type: 'power_tool',
      inventoryNumber: 'TOOL-001',
      qrCode: 'QR-TOOL-001',
      status: 'in_stock',
      location: 'Стеллаж 1, полка 2'
    }
  ])
  
  const breakdowns = ref<ToolBreakdown[]>([])

  const inStockTools = computed(() => tools.value.filter(t => t.status === 'in_stock'))
  const issuedTools = computed(() => tools.value.filter(t => t.status === 'issued'))
  const repairTools = computed(() => tools.value.filter(t => t.status === 'repair'))

  function issueTool(toolId: string, employeeId: string, employeeName: string) {
    const tool = tools.value.find(t => t.id === toolId)
    if (tool) {
      tool.status = 'issued'
      tool.issuedTo = employeeId
      tool.issuedToName = employeeName
      tool.issuedAt = new Date()
    }
  }

  function returnTool(toolId: string) {
    const tool = tools.value.find(t => t.id === toolId)
    if (tool) {
      tool.status = 'in_stock'
      tool.issuedTo = undefined
      tool.issuedToName = undefined
      tool.issuedAt = undefined
    }
  }

  function reportBreakdown(breakdown: Omit<ToolBreakdown, 'id' | 'status' | 'repairs'>) {
    const newBreakdown: ToolBreakdown = {
      ...breakdown,
      id: Math.random().toString(36).substr(2, 9),
      status: 'reported',
      repairs: []
    }
    breakdowns.value.push(newBreakdown)
    
    const tool = tools.value.find(t => t.id === breakdown.toolId)
    if (tool) {
      tool.status = 'repair'
    }
  }

  function getToolById(id: string) {
    return tools.value.find(t => t.id === id)
  }

  function addTool(toolData: any) {
    const newTool: Tool = {
      ...toolData,
      id: Math.random().toString(36).substr(2, 9)
    }
    tools.value.unshift(newTool)
    return newTool
  }

  function updateTool(id: string, updates: Partial<Tool>) {
    const index = tools.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tools.value[index] = { ...tools.value[index], ...updates } as Tool
    }
  }

  function deleteTool(id: string) {
    const index = tools.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tools.value.splice(index, 1)
    }
  }

  return {
    tools,
    breakdowns,
    inStockTools,
    issuedTools,
    repairTools,
    issueTool,
    returnTool,
    reportBreakdown,
    getToolById,
    addTool,
    updateTool,
    deleteTool
  }
})
