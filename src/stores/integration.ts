import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useIntegrationStore = defineStore('integration', () => {
  const status = ref<'connected' | 'disconnected'>('connected')
  const lastSync = ref<Date>(new Date())
  
  const settings = ref({
    url: 'http://1c-server/wms-sync',
    importOrders: true,
    importNomenclature: true,
    importEmployees: true,
    exportShipments: true,
    exportProduction: true,
    exportToolMovement: true,
    syncInterval: 30
  })

  const syncLogs = ref([
    {
      id: 1,
      date: new Date(),
      type: 'import',
      status: 'success',
      details: 'Импортировано 5 новых заказов'
    }
  ])

  function syncNow() {
    // Mock sync logic
    lastSync.value = new Date()
    syncLogs.value.unshift({
      id: Date.now(),
      date: new Date(),
      type: 'manual',
      status: 'success',
      details: 'Ручная синхронизация завершена успешно'
    })
  }

  return {
    status,
    lastSync,
    settings,
    syncLogs,
    syncNow
  }
})
