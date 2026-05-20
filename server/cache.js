/**
 * Общий кэш для данных, полученных от 1C
 */
export const cache = {
  units: [],
  categories: [],
  warehouses: [],
  stocks: [],
  orders: []
}

// Кэш для единиц измерения (GUID -> Строка)
export let unitsCache = new Map()

export function setUnitsCache(newCache) {
  unitsCache = newCache
}

// Переменные для отслеживания синхронизации
export let lastSyncTime = {
  value: null,
  status: 'pending',
  error: null,
  connectionStatus: 'unknown',
  lastSyncByType: {
    units: null,
    warehouses: null,
    stocks: null,
    orders: null
  }
}

export function updateLastSyncTime(updates) {
  lastSyncTime = { ...lastSyncTime, ...updates }
}